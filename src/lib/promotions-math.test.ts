import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluatePromoCore, type PromoCore, type PromoLine } from "./promotions-math";

const promo = (over: Partial<PromoCore> = {}): PromoCore => ({
  type: "percent",
  value: 10,
  minSubtotalMillimes: 0,
  maxDiscountMillimes: null,
  universeId: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  usageCount: 0,
  label: "Promo",
  ...over,
});

const line = (lineTotal: number, universeId: number | null = null, productId = 1): PromoLine => ({
  productId,
  universeId,
  lineTotal,
});

test("percent discount applies to the eligible total", () => {
  const r = evaluatePromoCore(promo(), [line(100000)]);
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.discount, 10000);
});

test("fixed discount clamps to the eligible total", () => {
  const r = evaluatePromoCore(promo({ type: "fixed", value: 5000 }), [line(100000)]);
  assert.equal(r.ok && r.discount, 5000);
  const small = evaluatePromoCore(promo({ type: "fixed", value: 5000 }), [line(3000)]);
  assert.equal(small.ok && small.discount, 3000);
});

test("maxDiscount caps the discount", () => {
  const r = evaluatePromoCore(promo({ value: 50, maxDiscountMillimes: 20000 }), [line(100000)]);
  assert.equal(r.ok && r.discount, 20000);
});

test("minimum subtotal gates the code", () => {
  const r = evaluatePromoCore(promo({ minSubtotalMillimes: 50000 }), [line(40000)]);
  assert.equal(r.ok, false);
});

test("universe-scoped promo only counts matching lines", () => {
  const r = evaluatePromoCore(promo({ universeId: 5, value: 10 }), [line(100000, 5), line(50000, 7)]);
  assert.equal(r.ok && r.discount, 10000, "10% of the 100000 universe-5 line only");
});

test("free shipping yields no monetary discount", () => {
  const r = evaluatePromoCore(promo({ type: "free_shipping" }), [line(100000)]);
  assert.equal(r.ok && r.discount, 0);
  assert.equal(r.ok && r.freeShipping, true);
});

test("expired and exhausted codes are rejected", () => {
  assert.equal(evaluatePromoCore(promo({ endsAt: new Date(Date.now() - 1000) }), [line(100000)]).ok, false);
  assert.equal(evaluatePromoCore(promo({ usageLimit: 3, usageCount: 3 }), [line(100000)]).ok, false);
});

test("discount can never exceed the order subtotal", () => {
  const r = evaluatePromoCore(promo({ type: "fixed", value: 999999 }), [line(5000)]);
  assert.equal(r.ok && r.discount, 5000);
});
