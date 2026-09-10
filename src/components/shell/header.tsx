"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CartIcon, HeartIcon, LogoMark, MenuIcon, SearchIcon } from "@/components/icons";
import { useCart } from "@/components/cart/cart-provider";
import type { SafeUser } from "@/lib/auth";
import { SearchOverlay } from "./search-overlay";
import { AnnouncementBar } from "./announcement-bar";
import { AccountMenu } from "./account-menu";
import { MobileDrawer, type NavGroup } from "./mobile-drawer";
import { DesktopNavigation, type MegaGroup } from "./desktop-nav";

function Badge({ n }: { n: number }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {n > 0 && (
        <motion.span
          key={n}
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          className="absolute -right-1 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center bg-champagne px-1 text-[9px] font-bold tabular-nums text-ink"
        >
          {n}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function Header({ groups, mobileGroups, user, wishlistCount }: {
  groups: MegaGroup[];
  mobileGroups: NavGroup[];
  user: SafeUser | null;
  wishlistCount: number;
}) {
  const { count, open } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <AnnouncementBar />

      <header
        className={`sticky top-0 z-40 border-b transition-all duration-500 ${
          scrolled ? "border-stone bg-paper/95 shadow-whisper backdrop-blur-xl" : "border-transparent bg-paper"
        }`}
      >
        {/* Brand + actions row */}
        <div className="container-lux grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4 lg:gap-8">
          {/* Hamburger (mobile only) */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={menuOpen}
              className="flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-champagne-2"
            >
              <MenuIcon />
            </button>
          </div>

          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-3 text-ink"
            aria-label="Cléopâtre — Espace Santé Beauté, accueil"
          >
            <LogoMark size={30} className="text-champagne-2 transition-colors group-hover:text-ink" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-[22px] font-medium tracking-[0.02em] lg:text-[26px]">
                Cléopâtre
              </span>
              <span className="mt-1 hidden text-[8px] font-bold uppercase tracking-[0.34em] text-muted sm:block">
                Espace Santé Beauté
              </span>
            </span>
          </Link>

          {/* Desktop search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="mx-auto hidden h-11 w-full max-w-md items-center gap-3 border border-stone bg-cream/60 px-4 text-left text-[13px] text-muted transition-colors hover:border-champagne-2 focus:border-champagne-2 lg:flex"
            aria-label="Rechercher un produit, une marque"
          >
            <SearchIcon size={16} /> Rechercher un produit, une marque…
          </button>

          {/* Action icons */}
          <div className="flex items-center justify-end gap-0.5">
            <AccountMenu user={user} wishlistCount={wishlistCount} />
            <Link
              href={user ? "/compte/favoris" : "/connexion?next=/compte/favoris"}
              aria-label="Favoris"
              className="relative flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-champagne-2"
            >
              <HeartIcon />
              <Badge n={wishlistCount} />
            </Link>
            <button
              onClick={open}
              aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}
              className="relative flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-champagne-2"
            >
              <CartIcon />
              <Badge n={count} />
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="border-t border-stone/60 px-4 pb-2.5 pt-2 lg:hidden">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-10 w-full items-center gap-3 border border-stone bg-cream/60 px-4 text-left text-[13px] text-muted transition-colors hover:border-champagne-2"
            aria-label="Rechercher un produit, une marque"
          >
            <SearchIcon size={15} /> Rechercher un produit, une marque…
          </button>
        </div>

        <DesktopNavigation groups={groups} />
      </header>

      <MobileDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSearch={() => setSearchOpen(true)}
        groups={mobileGroups}
        user={user}
      />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
