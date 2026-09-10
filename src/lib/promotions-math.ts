// Pure promotion eligibility + discount maths. Kept free of server-only imports
// so it can be unit-tested in isolation — the brief requires regression tests for
// discount logic. Used by both the read-only preview and the transactional
// checkout path in src/lib/promotions.ts so the two can never drift.
export type PromoLine = { productId: number; universeId: number | null; lineTotal: number };

export type PromoCoreResult =
  | { ok: true; discount: number; freeShipping: boolean; label: string }
  | { ok: false; reason: string };

export type PromoCore = {
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  minSubtotalMillimes: number;
  maxDiscountMillimes: number | null;
  universeId: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
  label: string;
};

export function evaluatePromoCore(promo: PromoCore, lines: PromoLine[]): PromoCoreResult {
  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) return { ok: false, reason: "Ce code n'est pas encore actif." };
  if (promo.endsAt && promo.endsAt < now) return { ok: false, reason: "Ce code a expiré." };
  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
    return { ok: false, reason: "Ce code a atteint sa limite d'utilisation." };
  }

  const eligible = promo.universeId ? lines.filter((l) => l.universeId === promo.universeId) : lines;
  const eligibleTotal = eligible.reduce((s, l) => s + l.lineTotal, 0);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  if (subtotal < promo.minSubtotalMillimes) {
    return { ok: false, reason: `Minimum d'achat : ${(promo.minSubtotalMillimes / 1000).toFixed(0)} DT.` };
  }
  if (promo.universeId && eligibleTotal === 0) return { ok: false, reason: "Aucun article éligible à ce code." };

  let discount = 0;
  let freeShipping = false;
  if (promo.type === "percent") discount = Math.floor((eligibleTotal * promo.value) / 100);
  else if (promo.type === "fixed") discount = Math.min(promo.value, eligibleTotal);
  else freeShipping = true;
  if (promo.maxDiscountMillimes) discount = Math.min(discount, promo.maxDiscountMillimes);
  // Never refund more than the order is worth.
  discount = Math.max(0, Math.min(discount, subtotal));
  return { ok: true, discount, freeShipping, label: promo.label };
}
