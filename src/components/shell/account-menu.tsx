"use client";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoutIcon, UserIcon } from "@/components/icons";
import { logoutAction } from "@/actions/auth";
import type { SafeUser } from "@/lib/auth";
import { EASE_LUXE, tweenExit } from "@/lib/motion";

type NavLink = { href: string; label: string; role?: "staff" | "admin" };

const CUSTOMER_LINKS: NavLink[] = [
  { href: "/compte", label: "Mon espace" },
  { href: "/compte/commandes", label: "Mes commandes" },
  { href: "/compte/favoris", label: "Mes favoris" },
  { href: "/compte/retours", label: "Mes retours" },
  { href: "/compte/profil", label: "Profil & adresses" },
];

const STAFF_LINKS: NavLink[] = [
  { href: "/admin", label: "Tableau de bord", role: "staff" },
  { href: "/admin/commandes", label: "Commandes", role: "staff" },
  { href: "/admin/clients", label: "Clients", role: "staff" },
  { href: "/admin/produits", label: "Produits", role: "staff" },
  { href: "/admin/support", label: "Support", role: "staff" },
  { href: "/admin/stock", label: "Stock", role: "staff" },
];

export function AccountMenu({ user, wishlistCount }: { user: SafeUser | null; wishlistCount: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const pathname = usePathname();

  // Close on route change
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  // Outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isStaff = user && (user.role === "admin" || user.role === "support");
  const links = isStaff ? STAFF_LINKS : CUSTOMER_LINKS;

  return (
    <div ref={ref} className="relative">
      {user ? (
        <button
          ref={buttonRef as React.RefObject<HTMLButtonElement>}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Mon compte — ${user.firstName} ${user.lastName}`}
          className="flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-champagne-2 focus-visible:text-champagne-2"
        >
          <UserIcon />
        </button>
      ) : (
        <Link
          ref={buttonRef as React.RefObject<HTMLAnchorElement>}
          href="/connexion"
          aria-label="Se connecter"
          className="flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-champagne-2 focus-visible:text-champagne-2"
        >
          <UserIcon />
        </Link>
      )}

      <AnimatePresence>
        {open && user && (
          <motion.div
            role="menu"
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: EASE_LUXE } }}
            exit={{ opacity: 0, y: 6, scale: 0.98, transition: tweenExit }}
            className="absolute right-0 top-full z-[60] mt-2 w-64 border border-stone bg-cream shadow-float"
          >
            <div className="border-b border-stone px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Bonjour</p>
              <p className="mt-0.5 font-display text-lg italic leading-tight text-ink">
                {user.firstName} {user.lastName}
              </p>
              {isStaff && (
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-champagne-2">
                  {user.role === "admin" ? "Administrateur" : "Support"}
                </p>
              )}
            </div>
            <nav className="py-1" aria-label="Menu compte">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  role="menuitem"
                  className="flex items-center justify-between px-4 py-2.5 text-sm text-charcoal transition-colors hover:bg-paper hover:text-ink"
                >
                  {l.label}
                </Link>
              ))}
              {!isStaff && wishlistCount > 0 && (
                <span className="pointer-events-none absolute right-4 top-[94px] flex h-4 min-w-4 items-center justify-center bg-champagne px-1 text-[9px] font-bold tabular-nums text-ink" />
              )}
            </nav>
            {isStaff && (
              <Link
                href="/compte"
                className="block border-t border-stone px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:bg-paper hover:text-charcoal"
              >
                Espace client
              </Link>
            )}
            <form action={logoutAction} className="border-t border-stone">
              <button
                role="menuitem"
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-muted transition-colors hover:bg-paper hover:text-error"
              >
                <LogoutIcon size={14} />
                Déconnexion
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
