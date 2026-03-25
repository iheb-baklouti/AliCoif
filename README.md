# L'Artiste by Ali Chakroun — site web

Application **Next.js 16** + **Tailwind CSS 4** + **Prisma** (**PostgreSQL**, ex. **Supabase**) + **Socket.IO** pour le temps réel (sièges / salon).

## Démarrage

Configurer `.env` avec `DATABASE_URL` et `DIRECT_URL` (voir `.env.example` et `DEPLOY_VERCEL_SUPABASE.md`), puis :

```bash
cd web
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Si `prisma db seed` echoue avec **P1001**, utilisez le pooler (6543) pour `DATABASE_URL` dans `.env`, ou executez `prisma/seed.sql` dans le **SQL Editor** Supabase (voir `DEPLOY_VERCEL_SUPABASE.md`).

Ouvrir [http://localhost:3000](http://localhost:3000).

Le serveur de développement utilise `node server.mjs` (Next + Socket.IO sur le même port).

## Compte administrateur (seed)

- **E-mail :** `admin@lartiste.tn`
- **Mot de passe :** `Admin123!`

**Tableau de bord (admin & équipe) :** `/dashboard` (la page `/admin` redirige vers le dashboard).

## Comptes équipe (seed)

- `staff1@lartiste.tn` / `Staff123!` — siège 1  
- `staff2@lartiste.tn` / `Staff123!` — siège 2  

## Variables d’environnement

Copier `.env.example` vers `.env` et ajuster :

- `DATABASE_URL` — connexion Prisma (pooler Supabase en prod, voir guide).
- `DIRECT_URL` — connexion directe Postgres pour les migrations (`prisma migrate deploy`).
- `JWT_SECRET` — chaîne longue et aléatoire.
- `NEXT_PUBLIC_SITE_URL` — URL publique du site (SEO, sitemap).
- **E-mail (SMTP)** : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- **Notifications admin** : `ADMIN_NOTIFY_EMAIL`, `ADMIN_WHATSAPP_E164`.
- **WhatsApp sortant (optionnel)** : Twilio (`TWILIO_*` dans `.env.example`).
- **Guide détaillé** : [`SMTP_ET_NOTIFICATIONS.md`](SMTP_ET_NOTIFICATIONS.md) (configuration, Vercel, tests).

## Fonctionnalités

- **Public :** accueil (photos, services, témoignages, sièges en direct — salon **hommes**), services, équipe, contact, réservation.
- **Client :** inscription / connexion (JWT, cookie httpOnly), compte, historique, file d’attente après **confirmation**, annulation des demandes en attente ou confirmées.
- **Réservations :** création en **PENDING** ; l’admin **accepte**, **refuse** ou **propose une autre date** ; e-mails (et WhatsApp si configuré) vers l’admin et le client.
- **Équipe (STAFF) :** dashboard par siège — file du jour, stats, démarrer / terminer un service.
- **Admin :** même dashboard avec sidebar, stats globales, **performances par membre**, réservations, clients, services/tarifs, avis, **horaires & créneaux**, **médias** (upload JPG/PNG/WebP/GIF → `public/uploads/`, rôles HERO / EQUIPE / GALLERY).
- **Photos statiques :** `public/salon-facade.png` et `public/salon-lifestyle.png` (utilisées par défaut si aucun média en base).
- **Temps réel :** événement `salon:update` sur la room Socket.IO `salon` (voir `server.mjs`, `lib/realtime.ts`).

## Build production

```bash
npm run build
npm run start
```

Sur Windows, `npm run start` utilise `cross-env` pour `NODE_ENV=production`.

## Déploiement

Hébergement type **VPS** recommandé (un seul process Node pour Next + Socket.IO). Les déploiements serverless purs (ex. certaines offres « serverless only ») ne conviennent pas tel quel à Socket.IO sans adaptation.

## Déploiement Vercel + Supabase

Le projet inclut maintenant un fallback HTTP (polling) pour le suivi en direct, ce qui permet le déploiement sur Vercel.

1. Créer une base **Supabase Postgres**.
2. Mettre à jour `DATABASE_URL` (pooler) et `DIRECT_URL` (connexion directe) sur Vercel.
3. Basculer Prisma sur Postgres avant migration (provider `postgresql`) puis exécuter `prisma migrate deploy`.
4. Ajouter les variables SMTP/Twilio et `ADMIN_NOTIFY_EMAIL`.
5. Déployer sur Vercel (framework Next.js, build command `npm run build`).

Guide détaillé : `DEPLOY_VERCEL_SUPABASE.md`.
