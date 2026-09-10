"use client";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRightIcon } from "@/components/icons";
import { EASE_LUXE, tweenExit } from "@/lib/motion";

export type MegaColumn = { heading: string; items: { slug: string; name: string; href: string }[] };
export type MegaGroup = {
  id: string;
  label: string;
  href: string;
  description?: string;
  image?: string | null;
  columns: MegaColumn[];
  callout?: { href: string; label: string };
};

export function DesktopNavigation({ groups }: { groups: MegaGroup[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) { setPrevPath(pathname); setActiveId(null); }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActiveId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const enter = (id: string) => { if (closeTimer.current) clearTimeout(closeTimer.current); setActiveId(id); };
  const leave = () => { closeTimer.current = setTimeout(() => setActiveId(null), 180); };
  const active = groups.find((g) => g.id === activeId);

  return (
    <nav
      className="relative hidden border-t border-stone/70 lg:block"
      aria-label="Navigation principale"
      onMouseLeave={leave}
    >
      <div className="container-lux flex items-center justify-center gap-8 xl:gap-10">
        <Link
          href="/boutique?sort=newest"
          onMouseEnter={() => setActiveId(null)}
          className="relative whitespace-nowrap py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal transition-colors hover:text-ink"
        >
          Nouveautés
        </Link>
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onMouseEnter={() => enter(g.id)}
            onFocus={() => enter(g.id)}
            onClick={() => { window.location.href = g.href; }}
            aria-expanded={activeId === g.id}
            aria-haspopup="true"
            className={`group relative whitespace-nowrap py-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
              activeId === g.id ? "text-champagne-2" : "text-charcoal hover:text-ink"
            }`}
          >
            {g.label}
            <span
              className={`absolute inset-x-0 -bottom-px h-px bg-champagne-2 transition-transform duration-300 ${
                activeId === g.id ? "scale-x-100" : "scale-x-0"
              }`}
            />
          </button>
        ))}
        <Link
          href="/promotions"
          onMouseEnter={() => setActiveId(null)}
          className="relative whitespace-nowrap py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-champagne-2 transition-colors hover:text-ink"
        >
          Offres
        </Link>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            key={active.id}
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_LUXE } }}
            exit={{ opacity: 0, transition: tweenExit }}
            onMouseEnter={() => enter(active.id)}
            className="absolute inset-x-0 top-full hidden border-b border-stone bg-paper/98 shadow-soft backdrop-blur-xl lg:block"
          >
            <div className="container-lux grid grid-cols-12 gap-10 py-10">
              <div className="col-span-8">
                <div className="grid grid-cols-3 gap-x-10 gap-y-1">
                  {active.columns.map((col) => (
                    <div key={col.heading} className="border-t border-stone/50 pt-4">
                      <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-muted">
                        {col.heading}
                      </p>
                      <ul className="space-y-0">
                        {col.items.map((it) => (
                          <li key={it.slug}>
                            <Link
                              href={it.href}
                              className="group flex items-center gap-2 py-2 text-[13px] text-charcoal transition-colors hover:text-champagne-2"
                            >
                              {it.name}
                              <ArrowRightIcon
                                size={11}
                                className="text-champagne-3 opacity-0 transition-opacity group-hover:opacity-100"
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {active.callout && (
                  <Link href={active.callout.href} className="btn-secondary mt-8">
                    {active.callout.label} <ArrowRightIcon size={13} />
                  </Link>
                )}
              </div>
              <div className="col-span-4 border-l border-stone pl-10">
                {active.image && (
                  <Link href={active.href} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={active.image}
                      alt=""
                      className="mb-5 aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                    />
                  </Link>
                )}
                <Link href={active.href} className="group">
                  <h3 className="font-display text-xl italic text-ink transition-colors group-hover:text-champagne-2">
                    {active.label}
                  </h3>
                </Link>
                {active.description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted">{active.description}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
