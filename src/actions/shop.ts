"use server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  newsletterSubscribers,
  orderItems,
  orders,
  products,
  returnRequests,
  reviews,
  searchEvents,
  supportTickets,
  wishlistItems,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, MESSAGES, ok, zodFieldErrors, type ActionResult } from "@/lib/api";
import { evaluatePromo } from "@/lib/promotions";
import { rateLimit } from "@/lib/rate-limit";
import { clientKey } from "@/lib/origin";
import { cartLineSchema, newsletterSchema, returnRequestSchema, reviewSchema, ticketSchema } from "@/lib/validation";
import { track } from "@/lib/orders";

function generateReturnNumber(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RET-${stamp}-${rand}`;
}

export async function toggleWishlistAction(productId: number): Promise<ActionResult<{ wished: boolean }>> {
  const me = await getCurrentUser();
  if (!me) return fail(MESSAGES.unauthorized);
  if (!Number.isInteger(productId) || productId <= 0) return fail(MESSAGES.invalid);
  const [p] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, productId), eq(products.status, "active"))).limit(1);
  if (!p) return fail(MESSAGES.notFound);
  const removed = await db.delete(wishlistItems).where(and(eq(wishlistItems.userId, me.id), eq(wishlistItems.productId, p.id))).returning({ productId: wishlistItems.productId });
  revalidatePath("/compte/favoris");
  if (removed.length) return ok({ wished: false }, "Retiré de vos favoris.");
  await db.insert(wishlistItems).values({ userId: me.id, productId: p.id }).onConflictDoNothing();
  await track("wishlist.add", { productId: p.id }, me.id);
  return ok({ wished: true }, "Ajouté à vos favoris.");
}

export async function submitReviewAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!(await rateLimit(`review:${await clientKey()}`, 5, 600_000))) return fail(MESSAGES.rateLimited);
  const me = await getCurrentUser();
  const parsed = reviewSchema.safeParse({ productId: Number(form.get("productId")), rating: Number(form.get("rating")), title: form.get("title"), body: form.get("body"), authorName: form.get("authorName") || (me ? `${me.firstName} ${me.lastName[0]}.` : "") });
  if (!parsed.success) return fail(MESSAGES.invalid, zodFieldErrors(parsed.error.issues));
  const [target] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, parsed.data.productId), eq(products.status, "active"))).limit(1);
  if (!target) return fail(MESSAGES.notFound);
  await db.insert(reviews).values({ ...parsed.data, title: parsed.data.title || null, userId: me?.id ?? null, status: "pending" });
  return ok(undefined, "Merci ! Votre avis sera publié après modération.");
}

export async function validatePromoAction(code: string, lines: { productId: number; quantity: number }[]): Promise<ActionResult<{ discount: number; freeShipping: boolean; label: string; code: string }>> {
  if (!(await rateLimit(`promo:${await clientKey()}`, 20, 60_000))) return fail(MESSAGES.rateLimited);
  const me = await getCurrentUser();
  if (!Array.isArray(lines) || !lines.length) return fail("Votre panier est vide.");
  if (lines.length > 100) return fail("Panier trop volumineux.");
  for (const l of lines) {
    if (!cartLineSchema.safeParse(l).success) return fail(MESSAGES.invalid);
  }
  const ids = lines.map((l) => l.productId);
  const rows = await db.select({ id: products.id, price: products.priceMillimes, universeId: products.universeId }).from(products).where(and(inArray(products.id, ids), eq(products.status, "active")));
  const promoLines = lines.map((l) => { const p = rows.find((r) => r.id === l.productId); return { productId: l.productId, universeId: p?.universeId ?? null, lineTotal: (p?.price ?? 0) * l.quantity }; });
  const res = await evaluatePromo(code, promoLines, me?.id);
  if (!res.ok) return fail(res.reason);
  return ok({ discount: res.discount, freeShipping: res.freeShipping, label: res.label, code: res.promo.code }, "Code appliqué.");
}

export async function subscribeNewsletterAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!(await rateLimit(`newsletter:${await clientKey()}`, 5, 3_600_000))) return fail(MESSAGES.rateLimited);
  const parsed = newsletterSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) return fail("Adresse e-mail invalide.");
  await db.insert(newsletterSubscribers).values({ email: parsed.data.email }).onConflictDoNothing();
  return ok(undefined, "Merci, vous êtes inscrit(e).");
}

export async function createTicketAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!(await rateLimit(`ticket:${await clientKey()}`, 6, 600_000))) return fail(MESSAGES.rateLimited);
  const me = await getCurrentUser();
  const parsed = ticketSchema.safeParse({
    ...Object.fromEntries(form),
    email: me?.email ?? form.get("email"),
    name: me ? `${me.firstName} ${me.lastName}` : form.get("name"),
    type: form.get("type") || "other",
    priority: form.get("priority") || "normal",
  });
  if (!parsed.success) return fail(MESSAGES.invalid, zodFieldErrors(parsed.error.issues));
  await db.insert(supportTickets).values({
    ...parsed.data,
    orderNumber: parsed.data.orderNumber || null,
    userId: me?.id ?? null,
    email: parsed.data.email.toLowerCase(),
  });
  return ok(undefined, "Message envoyé. Nous répondons sous 24 h ouvrées.");
}

export async function createReturnRequestAction(_prev: ActionResult<{ id: number; number: string } | null> | null, form: FormData): Promise<ActionResult<{ id: number; number: string }>> {
  const me = await getCurrentUser();
  if (!me) return fail(MESSAGES.unauthorized);
  if (!(await rateLimit(`return:${me.id}`, 5, 600_000))) return fail(MESSAGES.rateLimited);
  const parsed = returnRequestSchema.safeParse({
    orderId: Number(form.get("orderId")),
    orderItemId: Number(form.get("orderItemId")),
    reason: form.get("reason"),
    message: form.get("message"),
  });
  if (!parsed.success) return fail(MESSAGES.invalid, zodFieldErrors(parsed.error.issues));

  // Verify ownership — the order must belong to the authenticated user.
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, parsed.data.orderId), eq(orders.userId, me.id)),
    with: { items: true },
  });
  if (!order) return fail(MESSAGES.notFound);
  const item = order.items.find((i) => i.id === parsed.data.orderItemId);
  if (!item) return fail("Article introuvable dans cette commande.");

  // Delivered/confirmed only — can't return what wasn't received.
  if (order.status !== "delivered" && order.status !== "confirmed" && order.status !== "shipped") {
    return fail("Les retours sont disponibles une fois la commande expédiée ou livrée.");
  }

  const [existing] = await db.select({ id: returnRequests.id }).from(returnRequests).where(
    and(eq(returnRequests.orderItemId, parsed.data.orderItemId), eq(returnRequests.userId, me.id)),
  );
  if (existing) return fail("Une demande de retour existe déjà pour cet article.");

  const number = generateReturnNumber();

  // Create linked support ticket automatically so support sees it immediately.
  const [ticket] = await db.insert(supportTickets).values({
    userId: me.id,
    email: me.email,
    name: `${me.firstName} ${me.lastName}`,
    type: "return_request",
    priority: "normal",
    subject: `Demande de retour ${number} — Commande ${order.number}`,
    message: `Article: ${item.name}\nMotif: ${parsed.data.reason}\n\n${parsed.data.message || ""}`.trim(),
    orderNumber: order.number,
  }).returning({ id: supportTickets.id });

  const [created] = await db.insert(returnRequests).values({
    number,
    userId: me.id,
    orderId: parsed.data.orderId,
    orderItemId: parsed.data.orderItemId,
    reason: parsed.data.reason,
    message: parsed.data.message || null,
    ticketId: ticket.id,
  }).returning();

  await track("return.create", { returnId: created.id, orderId: parsed.data.orderId }, me.id);
  revalidatePath("/compte/commandes");
  revalidatePath("/compte/retours");
  return ok({ id: created.id, number }, "Demande de retour envoyée. Notre équipe vous répond sous 24 h.");
}

export async function logSearchAction(query: string, resultsCount: number) {
  const q = query.trim().slice(0, 200);
  if (q.length < 2) return;
  if (!(await rateLimit(`search:${await clientKey()}`, 30, 60_000))) return;
  const me = await getCurrentUser();
  try { await db.insert(searchEvents).values({ query: q.toLowerCase(), resultsCount, userId: me?.id ?? null }); } catch {}
}
