import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

export type NavChild = { id: number; slug: string; name: string };
export type NavUniverse = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  story: string | null;
  children: NavChild[];
};

export type MegaColumn = { heading: string; items: { slug: string; name: string; href: string }[] };
export type MegaGroup = {
  id: string;
  label: string;
  href: string;
  description: string;
  image: string | null;
  columns: MegaColumn[];
  callout?: { href: string; label: string };
};

export const getNavigationData = cache(async () => {
  const universes = await db.query.categories.findMany({
    where: eq(categories.isUniverse, true),
    orderBy: asc(categories.sortOrder),
    with: { children: { orderBy: asc(categories.sortOrder) } },
  });

  const bySlug: Record<string, NavUniverse> = {};
  for (const u of universes) {
    bySlug[u.slug] = {
      id: u.id,
      slug: u.slug,
      name: u.name,
      description: u.description,
      image: u.image,
      story: u.story,
      children: u.children.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
    };
  }

  // Reorganize the 7 universes into 4 curated mega groups that match the
  // brief's information architecture.  Solaire is included under Beauté
  // (premium placement still warranted), but could be promoted if data supports it.
  const group = (label: string, universeSlugs: string[], opts?: { extraColumns?: MegaColumn[]; href?: string }): MegaGroup => {
    const first = bySlug[universeSlugs[0]];
    const columns: MegaColumn[] = universeSlugs.map((slug) => {
      const u = bySlug[slug];
      if (!u) return { heading: "", items: [] };
      return {
        heading: u.name,
        items: u.children.map((c) => ({ slug: c.slug, name: c.name, href: `/categorie/${c.slug}` })),
      };
    });
    if (opts?.extraColumns) columns.push(...opts.extraColumns);
    return {
      id: label.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      label,
      href: opts?.href ?? (first ? `/univers/${first.slug}` : "/boutique"),
      description: first?.description ?? "",
      image: first?.image ?? null,
      columns,
      callout: first ? { href: `/univers/${first.slug}`, label: `Tout l'univers ${label}` } : undefined,
    };
  };

  // Map universes to brief's IA.
  // visage → BEAUTÉ (skincare lead)
  // corps → BEAUTÉ
  // solaire → BEAUTÉ (Tunisian sun = essential part of beauty routine)
  // cheveux → SOINS
  // hygiene → SOINS
  // complements → BIEN-ÊTRE
  // bebe-maman → BÉBÉ & MAMAN
  const groups: MegaGroup[] = [
    group("Beauté", ["visage", "corps", "solaire"], {
      href: "/univers/visage",
      extraColumns: [{
        heading: "Par besoin",
        items: [
          { slug: "peau-sensible", name: "Peau sensible", href: "/besoin/peau-sensible" },
          { slug: "hydratation", name: "Hydratation", href: "/besoin/hydratation" },
          { slug: "anti-age", name: "Anti-âge", href: "/besoin/anti-age" },
          { slug: "protection-solaire", name: "Protection solaire", href: "/besoin/protection-solaire" },
        ],
      }],
    }),
    group("Soins", ["cheveux", "hygiene"], {
      href: "/univers/cheveux",
      extraColumns: [{
        heading: "Marques emblématiques",
        items: [
          { slug: "la-roche-posay", name: "La Roche-Posay", href: "/marque/la-roche-posay" },
          { slug: "vichy", name: "Vichy", href: "/marque/vichy" },
          { slug: "ducray", name: "Ducray", href: "/marque/ducray" },
          { slug: "klorane", name: "Klorane", href: "/marque/klorane" },
        ],
      }],
    }),
    group("Bien-être", ["complements"], {
      href: "/univers/complements",
      extraColumns: [{
        heading: "Conseils",
        items: [
          { slug: "routine", name: "Trouver ma routine", href: "/boutique" },
          { slug: "sommeil", name: "Sommeil & stress", href: "/besoin/sommeil" },
          { slug: "immunite", name: "Immunité & vitalité", href: "/besoin/immunite" },
          { slug: "journal", name: "Le Journal", href: "/journal" },
        ],
      }],
    }),
    (() => {
      const bb = bySlug["bebe-maman"];
      return {
        id: "bebe-maman",
        label: "Bébé & Maman",
        href: bb ? `/univers/${bb.slug}` : "/boutique",
        description: bb?.description ?? "Soins pour bébé et future maman.",
        image: bb?.image ?? null,
        columns: bb
          ? [{
              heading: "Bébé & Maman",
              items: bb.children.map((c) => ({ slug: c.slug, name: c.name, href: `/categorie/${c.slug}` })),
            }, {
              heading: "Marques de confiance",
              items: [
                { slug: "mustela", name: "Mustela", href: "/marque/mustela" },
                { slug: "bioderma", name: "Bioderma ABCDerm", href: "/marque/bioderma" },
                { slug: "avene", name: "Avène", href: "/marque/avene" },
                { slug: "isdin", name: "ISDIN Pediatrics", href: "/marque/isdin" },
              ],
            }]
          : [],
        callout: bb ? { href: `/univers/${bb.slug}`, label: "Tout l'univers Bébé & Maman" } : undefined,
      } satisfies MegaGroup;
    })(),
  ];

  return { universes: Object.values(bySlug), groups };
});
