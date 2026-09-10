"use client";
import { useEffect, useRef, useState } from "react";

const MESSAGES_DESKTOP = [
  "LIVRAISON OFFERTE DÈS 99 DT",
  "CONSEIL PHARMACEUTIQUE · 71 450 210",
  "PAIEMENT À LA LIVRAISON",
  "PRODUITS 100 % AUTHENTIQUES",
];

export function AnnouncementBar() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative z-50 border-b border-stone/60 bg-cream">
      {/* Desktop: single elegant line */}
      <div className="hidden lg:block">
        <div className="container-lux flex min-h-8 items-center justify-center gap-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          <span>Livraison offerte dès 99&nbsp;DT</span>
          <span className="text-stone-2" aria-hidden="true">·</span>
          <span>Conseil pharmaceutique</span>
          <span className="text-stone-2" aria-hidden="true">·</span>
          <span>Paiement à la livraison</span>
          <span className="text-stone-2" aria-hidden="true">·</span>
          <span>Service client 71&nbsp;450&nbsp;210</span>
        </div>
      </div>
      {/* Mobile: horizontal scroll, never overflows */}
      <div className="lg:hidden">
        <div
          ref={scrollRef}
          className="no-scrollbar-x flex items-center gap-6 overflow-x-auto whitespace-nowrap px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted"
        >
          {MESSAGES_DESKTOP.map((m, i) => (
            <span key={m} className="flex shrink-0 items-center gap-6">
              {m}
              {i < MESSAGES_DESKTOP.length - 1 && <span className="text-stone-2" aria-hidden="true">·</span>}
            </span>
          ))}
          {canScroll && <span className="sr-only">Faites défiler pour voir plus de messages.</span>}
        </div>
      </div>
    </div>
  );
}
