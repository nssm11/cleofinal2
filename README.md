# Cléopâtre — Espace Santé Beauté

Site e-commerce pour la parapharmacie Cléopâtre (Ezzahra / Hammam-Lif, Tunisie).

**Stack** : Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Drizzle ORM + PostgreSQL · Zod · Server Actions.

## Démarrage

```bash
cp .env.example .env          # ajuster DATABASE_URL et SESSION_SECRET
npm install
npm run db:push               # crée le schéma dans PostgreSQL
npm run db:seed               # charge les données de démo (produits, marques, comptes)
npm run dev                   # http://localhost:3000
```

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
- `src/db/schema.ts` — schéma Drizzle (23 tables, index, relations).
- `src/components` — UI, shell (header, nav, mega-menus, footer), account, cart, product.

## Configuration

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL. |
| `SESSION_SECRET` | Secret des sessions (≥ 32 caractères). Obligatoire en production. |
| `NEXT_PUBLIC_SITE_URL` | URL publique du site (défaut `http://localhost:3000`). |
| `TRUST_PROXY` | Passer à `true` derrière un reverse proxy (CDN, Nginx) afin de prendre en compte `x-forwarded-for` pour le rate limiting. |
| `PAYMENT_METHODS_ENABLED` | Liste des moyens de paiement autorisés, ex. `cod,bank_transfer,gift_card`. |

En production, `npm run db:seed` exige la variable `ALLOW_DESTRUCTIVE_SEED=1` (le script TRUNCATE toutes les tables) et les mots de passe des comptes de démo doivent être fournis par `SEED_ADMIN_PASSWORD`, etc.

## Notes sur l'implémentation

- Tous les montants sont stockés en **millimes** (entiers) pour éviter les erreurs d'arrondi (1 DT = 1 000 millimes).
- Les numéros de commande (`CL-YYMMDD-XXXX`) ne sont pas des identifiants d'accès. La page de confirmation demande soit une session propriétaire, soit une clé d'accès unique générée à la commande ; la page `/suivi` demande numéro + e-mail.
- Animations : transform/opacity uniquement, `prefers-reduced-motion` respecté.
- Palette : tons chauds (ivoire, pierre, sable, encre) avec accent champagne.
- Copy en français ; structure prête pour une version arabe (RTL).

## Commandes utiles

```bash
npm run dev         # serveur de développement
npm run build       # build production
npm run start       # serveur production (après build)
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run db:push     # applique le schéma Drizzle
npm run db:seed     # (re)charge les données de démo
```
