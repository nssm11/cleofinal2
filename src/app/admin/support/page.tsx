import Link from "next/link";
import { desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { returnRequests, supportTickets } from "@/db/schema";
import { formatDateTime } from "@/lib/utils";
import { AdminPage, Panel } from "@/components/admin/ui";
import { TicketReply } from "@/components/admin/inline-actions";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  product_question: "Question produit",
  return_request: "Retour",
  exchange: "Échange",
  order: "Commande",
  delivery: "Livraison",
  damaged_product: "Produit endommagé",
  complaint: "Réclamation",
  pharmacist_advice: "Conseil pharmacien",
  other: "Autre",
};

const RETURN_STATUS_LABELS: Record<string, string> = {
  pending: "Nouvelle",
  in_review: "En cours",
  awaiting_customer: "En attente client",
  approved: "Approuvée",
  rejected: "Refusée",
  completed: "Terminée",
};

export default async function AdminSupport() {
  const [tickets, returns, openCount] = await Promise.all([
    db.select().from(supportTickets).where(ne(supportTickets.status, "closed")).orderBy(desc(supportTickets.createdAt)),
    db.query.returnRequests.findMany({
      where: ne(returnRequests.status, "completed"),
      orderBy: desc(returnRequests.createdAt),
      with: { order: true, orderItem: true },
      limit: 20,
    }),
    db.select({ n: sql<number>`count(*)::int` }).from(supportTickets).where(eq(supportTickets.status, "open")),
  ]);
  const openN = openCount[0]?.n ?? 0;

  return (
    <AdminPage
      title="Support client"
      sub={`${openN} nouveau(x) · ${tickets.length} ticket(s) ouverts · ${returns.length} retour(s) en cours`}
    >
      {returns.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-admin-gold">Retours en attente</h2>
          <div className="space-y-3">
            {returns.map((r) => (
              <Panel key={r.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm">
                      <span className="font-mono text-admin-gold">{r.number}</span>{" "}
                      <span className="text-admin-muted">—</span>{" "}
                      {r.orderItem?.name ?? "Article"}
                    </p>
                    <p className="mt-1 text-xs text-admin-muted">
                      Commande{" "}
                      {r.order && (
                        <Link href={`/admin/commandes/${r.order.id}`} className="text-admin-text underline">
                          {r.order.number}
                        </Link>
                      )}{" "}
                      · Motif : {r.reason} · {formatDateTime(r.createdAt)}
                    </p>
                    {r.message && <p className="mt-2 whitespace-pre-line text-xs text-admin-muted italic">{r.message}</p>}
                  </div>
                  <span className="shrink-0 border border-admin-gold/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-admin-gold">
                    {RETURN_STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </div>
              </Panel>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-admin-muted">Tickets</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-admin-muted">Boîte vide.</p>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => (
              <Panel key={t.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <p className="text-sm">{t.subject}</p>
                    <span className="border border-admin-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-admin-muted">
                      {TYPE_LABELS[t.type] ?? t.type}
                    </span>
                    {t.status === "open" && !t.readAt && (
                      <span className="bg-admin-gold px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-noir">Nouveau</span>
                    )}
                  </div>
                  <span className="text-xs uppercase tracking-[0.12em] text-admin-muted">{t.status}</span>
                </div>
                <p className="mt-1 text-xs text-admin-muted">
                  {t.name} · {t.email} {t.orderNumber && `· ${t.orderNumber}`} · {formatDateTime(t.createdAt)}
                </p>
                <p className="mt-3 whitespace-pre-line text-sm">{t.message}</p>
                {t.reply && (
                  <p className="mt-3 border-l-2 border-admin-gold pl-3 text-sm text-admin-muted">{t.reply}</p>
                )}
                <div className="mt-4"><TicketReply id={t.id} /></div>
              </Panel>
            ))}
          </div>
        )}
      </section>
    </AdminPage>
  );
}
