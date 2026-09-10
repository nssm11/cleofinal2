import { test } from "node:test";
import assert from "node:assert/strict";
import { addLine, clampQty, mergeCarts, removeLine, setQtyLine, MAX_CART_QTY, type CartLine } from "./cart";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  productId: 1,
  slug: "produit",
  name: "Produit",
  brandName: null,
  image: null,
  priceMillimes: 1000,
  quantity: 1,
  stock: 10,
  volume: null,
  ...over,
});

test("add inserts a new line with the requested quantity", () => {
  const r = addLine([], line({ productId: 1, stock: 10 }), 2);
  assert.equal(r.length, 1);
  assert.equal(r[0].quantity, 2);
});

test("add increments an existing line and clamps to available stock", () => {
  let r = addLine([line({ productId: 1, stock: 3 })], line({ productId: 1, stock: 3 }), 2);
  assert.equal(r[0].quantity, 3, "1 + 2 must clamp to stock 3");
  r = addLine(r, line({ productId: 1, stock: 3 }), 5);
  assert.equal(r[0].quantity, 3, "stays clamped on further adds");
});

test("add never exceeds MAX_CART_QTY even when stock is huge", () => {
  const r = addLine([], line({ productId: 1, stock: 999 }), 999);
  assert.equal(r[0].quantity, MAX_CART_QTY);
});

test("setQty removes the line at zero and clamps above stock", () => {
  assert.equal(setQtyLine([line({ productId: 1, stock: 5 })], 1, 0).length, 0);
  assert.equal(setQtyLine([line({ productId: 1, stock: 5 })], 1, 99)[0].quantity, 5);
});

test("remove drops the matching line", () => {
  assert.equal(removeLine([line({ productId: 1 })], 1).length, 0);
});

test("mergeCarts combines duplicates, clamps to stock and drops unavailable items", () => {
  const guest = [
    line({ productId: 1, stock: 5, quantity: 3 }),
    line({ productId: 2, stock: 0, quantity: 2 }),
  ];
  const account = [line({ productId: 1, stock: 5, quantity: 2 })];
  const merged = mergeCarts(guest, account);
  const p1 = merged.find((l) => l.productId === 1);
  assert.ok(p1, "product 1 survives the merge");
  assert.equal(p1!.quantity, 5, "3 + 2 clamps to stock 5");
  assert.equal(merged.find((l) => l.productId === 2), undefined, "out-of-stock product 2 is dropped");
});

test("clampQty defends against invalid input", () => {
  assert.equal(clampQty(NaN, 5), 1);
  assert.equal(clampQty(-3, 5), 1);
  assert.equal(clampQty(99, 4), 4);
});
