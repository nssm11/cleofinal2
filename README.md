# Cléopâtre — Espace Santé Beauté

Site e-commerce pour la parapharmacie Cléopâtre (Ezzahra / Hammam-Lif, Tunisie).

**Stack** : Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Drizzle ORM + PostgreSQL (ou PGlite file-based pour le dev) · Zod · Server Actions.

## Démarrage rapide

### Windows (recommandé)

```powershell
# Un clic — le script gère tout : Node, .env, DB, seed, dev
.\start.ps1
```

Le script `start.ps1` est autonome :

- vérifie Node.js / npm
- crée `.env` depuis `.env.example` et génère `SESSION_SECRET` si besoin
- détecte PostgreSQL ; s’il n’est pas joignable, bascule automatiquement sur **PGlite** (Postgres file-based dans `.pglite/data`, aucun install)
- installe les dépendances
- pousse le schéma (`npm run db:push`)
- charge les données de démo (`npm run db:seed`)
- lance `npm run dev` sur http://localhost:3000

Options : `.\start.ps1 -SkipSeed` · `.\start.ps1 -SkipInstall` · `.\start.ps1 -Port 3001` · `.\start.ps1 -NoOpen`

### Unix / macOS / manuel

```bash
cp .env.example .env          # ajuster DATABASE_URL et SESSION_SECRET
npm install

# Avec un PostgreSQL local (127.0.0.1:5432)
npm run db:push               # crée le schéma
npm run db:seed               # charge les données de démo
npm run dev                   # http://localhost:3000

# — ou — sans Postgres installé : PGlite file-based (aucun service)
USE_PGLITE=1 npm run db:push
USE_PGLITE=1 npm run db:seed
USE_PGLITE=1 npm run dev
```

> **PGlite** est un Postgres compilé en WASM qui stocke ses données dans `.pglite/data`. Idéal pour Windows ou les environnements sans Postgres système. En production, utilisez toujours un vrai PostgreSQL et `DATABASE_URL`.

## Comptes de démonstration

| Rôle    | E-mail                | Mot de passe |
|---------|-----------------------|--------------|
| Admin   | admin@cleopatre.tn    | Admin123!    |
| Support | support@cleopatre.tn  | Support123!  |
| Client  | client@cleopatre.tn   | Client123!   |

Codes promo : `BIENVENUE10` (-10 % dès 50 DT), `SOLAIRE15` (-15 % sur le solaire), `LIVRAISON` (livraison offerte dès 40 DT), `CLEO20` (-20 DT dès 150 DT).

## Structure

- `src/app/(site)` — partie publique : accueil, boutique, univers, catégories, marques, recherche, fiche produit, journal, boutiques, aide, compte client, panier, commande, suivi.
- `src/app/admin` — back-office (rôles admin / support) : tableau de bord, commandes, produits, stock, clients, promotions, avis, tickets support, audit.
- `src/actions` — Server Actions (authentification, panier, commande, admin) avec validation Zod et contrôle d'origine.
- `src/lib` — logique métier : auth (scrypt + sessions httpOnly), argent en millimes, promotions, commandes, i18n.
- `src/db/schema.ts` — schéma Drizzle (23 tables, index, relations). `src/db/client.ts` gère le switch Postgres ↔ PGlite.
- `src/components` — UI, shell (header, nav, mega-menus, footer), account, cart, product. `components/motion` : Reveal, Parallax, PointerLight, ScrollAtmosphere.
- `src/db/push.ts` — push du schéma compatible Postgres et PGlite (lit `drizzle/0000_*.sql`).
- `start.ps1` — bootstrap Windows one-click. `.env.example` documente toutes les variables.

## Configuration

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL. Ignorée si `USE_PGLITE=1`. |
| `USE_PGLITE` | `1` pour utiliser PGlite file-based (dev sans Postgres). |
| `PGLITE_DIR` | Dossier de stockage PGlite (défaut `.pglite/data`). |
| `SESSION_SECRET` | Secret des sessions (≥ 32 caractères). Obligatoire en production. |
| `NEXT_PUBLIC_SITE_URL` | URL publique du site (défaut `http://localhost:3000`). |
| `TRUST_PROXY` | `true` derrière un reverse proxy (CDN, Nginx) pour `x-forwarded-for`. |
| `PAYMENT_METHODS_ENABLED` | Liste des moyens de paiement, ex. `cod,bank_transfer,gift_card`. |

En production, `npm run db:seed` exige `ALLOW_DESTRUCTIVE_SEED=1` (le script TRUNCATE toutes les tables) et les mots de passe via `SEED_ADMIN_PASSWORD`, etc.

## Notes sur l'implémentation

- Tous les montants sont stockés en **millimes** (entiers) pour éviter les erreurs d'arrondi (1 DT = 1 000 millimes).
- Les numéros de commande (`CL-YYMMDD-XXXX`) ne sont pas des identifiants d'accès. La page de confirmation demande soit une session propriétaire, soit une clé d'accès unique générée à la commande ; la page `/suivi` demande numéro + e-mail.
- Animations : transform/opacity uniquement, `prefers-reduced-motion` respecté. Parallax mesuré en pixels (8–24), pointer-light uniquement sur `(hover: hover) and (pointer: fine)`.
- Palette : tons chauds (ivoire, pierre, sable, encre) avec accent champagne. Par défaut sobre — l’or n’est jamais en gradient criard.
- Expérience : hero cinématographique avec profondeur (parallaxe restreinte), univers avec atmosphères distinctes ( VISAGE lumineux, CORPS architectural…), mais toujours Cléopâtre.
- Copy en français ; structure prête pour une version arabe (RTL).
- PostgreSQL : `unaccent` activé pour la recherche accent-insensible (`serum` trouve `Sérum`). PGlite charge l’extension `unaccent` automatiquement.

## Commandes utiles

```bash
npm run dev         # serveur de développement
npm run build       # build production (avec PGlite, externalisé via serverExternalPackages)
npm run start       # serveur production (après build)
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run db:push     # applique le schéma (Postgres ou PGlite selon env)
npm run db:seed     # (re)charge les données de démo
npm run db:setup    # push + seed
```

## Production

```bash
npm run build
npm run start       # ou `next start -p 3000`
```

Variables obligatoires en production : `DATABASE_URL`, `SESSION_SECRET` (32+ caractères, non placeholder), `NEXT_PUBLIC_SITE_URL`. Ne jamais committer `.env`.

## Dépannage

- `DATABASE_URL is required` → créer `.env` depuis `.env.example` ou lancer `.\start.ps1`.
- `Extension bundle not found` (PGlite) → mettre à jour `next.config.ts` (`serverExternalPackages`) — déjà configuré.
- Port 3000 occupé → `.\start.ps1 -Port 3001` ou `PORT=3001 npm run dev`.
- Reset complet PGlite → `rm -rf .pglite && npm run db:setup` (ou `Remove-Item -Recurse .pglite`).
