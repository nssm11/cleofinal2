import type { ReactNode } from "react";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { stores, wishlistItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getFeatured } from "@/lib/catalog";
import { getNavigationData } from "@/lib/navigation";
import { Header } from "@/components/shell/header";
import { Footer } from "@/components/shell/footer";
import { CartDrawer } from "@/components/shell/cart-drawer";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [{ groups, universes }, user, storeRows, upsells] = await Promise.all([
    getNavigationData(),
    getCurrentUser(),
    db.select().from(stores).where(eq(stores.isActive, true)),
    getFeatured(6),
  ]);
  const wishlistCount = user
    ? ((await db.select({ n: sql<number>`count(*)::int` }).from(wishlistItems).where(eq(wishlistItems.userId, user.id)))[0]?.n ?? 0)
    : 0;

  const mobileGroups = universes.map((u) => ({
    id: u.id,
    slug: u.slug,
    name: u.name,
    href: `/univers/${u.slug}`,
    description: u.description,
    children: u.children,
  }));

  return (
    <div className="flex min-h-dvh flex-col">
      <Header groups={groups} mobileGroups={mobileGroups} user={user} wishlistCount={wishlistCount} />
      <main id="contenu" className="flex-1">{children}</main>
      <Footer universes={universes.map((u) => ({ slug: u.slug, name: u.name }))} stores={storeRows} />
      <CartDrawer upsells={upsells} />
    </div>
  );
}
