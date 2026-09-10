"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { addLine, removeLine, setQtyLine, type CartLine, type CartState } from "@/lib/cart";

type Ctx = CartState & {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  setGiftWrap: (v: boolean) => void;
  setNote: (v: string) => void;
  setPromoCode: (v: string) => void;
  count: number;
  subtotal: number;
  hydrated: boolean;
  recentlyViewed: number[];
  pushRecentlyViewed: (id: number) => void;
};

const KEY = "cleo.cart.v1";
const RV_KEY = "cleo.rv.v1";
const EMPTY: CartState = { lines: [], giftWrap: false, note: "", promoCode: "" };
// Stable server/first-render snapshot: empty AND not yet hydrated, so the client
// first render matches the server and never flashes "empty" before reading storage.
const FALLBACK = { ...EMPTY, hydrated: false };

type StoreValue = CartState & { hydrated: boolean };

// Single external source of truth, synced with localStorage and other tabs.
// `useSyncExternalStore` reads it, so the UI converges on one value.
let mounted = false;
const listeners = new Set<() => void>();
let cache: StoreValue = FALLBACK;

function read(): CartState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<CartState>) };
  } catch {
    /* corrupt entry — treat as empty rather than crash */
  }
  return EMPTY;
}

function commit(next: CartState) {
  const hydrated = cache.hydrated;
  cache = { ...next, hydrated };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full / disabled — keep in-memory state */
    }
  }
  for (const l of listeners) l();
}

function snapshot(): StoreValue {
  return mounted ? cache : FALLBACK;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      const next = read();
      cache = { ...next, hydrated: cache.hydrated };
      for (const l of listeners) l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function withCurrent(mut: (s: CartState) => CartState) {
  commit(mut(read()));
}

const CartCtx = createContext<Ctx | null>(null);
export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside provider");
  return c;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [recentlyViewed, setRV] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const rv = window.localStorage.getItem(RV_KEY);
      if (rv) return JSON.parse(rv) as number[];
    } catch {}
    return [];
  });

  const state = useSyncExternalStore(subscribe, snapshot, () => FALLBACK);

  useEffect(() => {
    mounted = true;
    cache = { ...read(), hydrated: true };
    for (const l of listeners) l();
    const onFocus = () => {
      cache = { ...read(), hydrated: cache.hydrated };
      for (const l of listeners) l();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (state.hydrated) {
      try {
        window.localStorage.setItem(RV_KEY, JSON.stringify(recentlyViewed));
      } catch {}
    }
  }, [recentlyViewed, state.hydrated]);

  const add = useCallback((line: Omit<CartLine, "quantity">, qty = 1) => withCurrent((s) => ({ ...s, lines: addLine(s.lines, line, qty) })), []);
  const setQty = useCallback((productId: number, qty: number) => withCurrent((s) => ({ ...s, lines: setQtyLine(s.lines, productId, qty) })), []);
  const remove = useCallback((productId: number) => withCurrent((s) => ({ ...s, lines: removeLine(s.lines, productId) })), []);
  const clear = useCallback(() => withCurrent(() => ({ lines: [], giftWrap: false, note: "", promoCode: "" })), []);
  const setGiftWrap = useCallback((giftWrap: boolean) => withCurrent((s) => ({ ...s, giftWrap })), []);
  const setNote = useCallback((note: string) => withCurrent((s) => ({ ...s, note })), []);
  const setPromoCode = useCallback((promoCode: string) => withCurrent((s) => ({ ...s, promoCode })), []);
  const pushRecentlyViewed = useCallback((id: number) => setRV((r) => [id, ...r.filter((x) => x !== id)].slice(0, 8)), []);

  // Until the store has mounted and read localStorage we must not present the
  // cart as empty — we simply don't know yet. The populated/empty decision is
  // therefore gated on `hydrated` everywhere it is shown.
  const count = state.hydrated ? state.lines.reduce((a, l) => a + l.quantity, 0) : 0;
  const subtotal = state.hydrated ? state.lines.reduce((a, l) => a + l.priceMillimes * l.quantity, 0) : 0;

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      add,
      setQty,
      remove,
      clear,
      setGiftWrap,
      setNote,
      setPromoCode,
      count,
      subtotal,
      hydrated: state.hydrated,
      recentlyViewed,
      pushRecentlyViewed,
    }),
    [state, isOpen, add, setQty, remove, clear, setGiftWrap, setNote, setPromoCode, count, subtotal, recentlyViewed, pushRecentlyViewed],
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
