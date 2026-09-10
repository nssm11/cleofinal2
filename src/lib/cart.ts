export const MAX_CART_QTY = 20;

export type CartLine = {
  productId: number;
  slug: string;
  name: string;
  brandName: string | null;
  image: string | null;
  priceMillimes: number;
  quantity: number;
  stock: number;
  volume: string | null;
};

export type CartState = {
  lines: CartLine[];
  giftWrap: boolean;
  note: string;
  promoCode: string;
};

/** Bound a requested quantity to [1, stock, MAX_CART_QTY]; never NaN/negative. */
export function clampQty(qty: number, stock: number): number {
  if (!Number.isFinite(qty)) return 1;
  const safeStock = Math.max(1, stock);
  return Math.max(1, Math.min(MAX_CART_QTY, Math.min(Math.round(qty), safeStock)));
}

export function addLine(lines: CartLine[], line: Omit<CartLine, "quantity">, qty = 1): CartLine[] {
  const max = clampQty(line.stock, line.stock);
  const existing = lines.find((l) => l.productId === line.productId);
  if (existing) {
    return lines.map((l) =>
      l.productId === line.productId
        ? { ...l, quantity: Math.min(max, l.quantity + qty), stock: line.stock, priceMillimes: line.priceMillimes, slug: line.slug, name: line.name, brandName: line.brandName, image: line.image, volume: line.volume }
        : l,
    );
  }
  return [...lines, { ...line, quantity: Math.min(max, qty) }];
}

export function setQtyLine(lines: CartLine[], productId: number, qty: number): CartLine[] {
  if (qty <= 0) return lines.filter((l) => l.productId !== productId);
  return lines.map((l) => (l.productId === productId ? { ...l, quantity: clampQty(qty, l.stock) } : l));
}

export function removeLine(lines: CartLine[], productId: number): CartLine[] {
  return lines.filter((l) => l.productId !== productId);
}

/**
 * Merge policy for a guest cart joining a signed-in account. The on-device
 * guest cart is preserved and reconciled against the account's server cart
 * when one exists. Duplicate products are combined, quantities are clamped
 * to available stock, and unavailable products (stock <= 0) are dropped
 * rather than shown as empty lines.
 */
export function mergeCarts(guest: CartLine[], account: CartLine[]): CartLine[] {
  const byId = new Map<number, CartLine>();
  for (const l of [...account, ...guest]) {
    if (l.stock <= 0) continue;
    const existing = byId.get(l.productId);
    if (existing) {
      byId.set(l.productId, {
        ...existing,
        quantity: clampQty(existing.quantity + l.quantity, l.stock),
        stock: l.stock,
        priceMillimes: l.priceMillimes,
        slug: l.slug,
        name: l.name,
        brandName: l.brandName,
        image: l.image,
        volume: l.volume,
      });
    } else {
      byId.set(l.productId, { ...l, quantity: clampQty(l.quantity, l.stock) });
    }
  }
  return [...byId.values()];
}
