-- Seed manuel (Supabase SQL Editor) — équivalent à `npx prisma db seed`
-- Mots de passe : admin Admin123! — staff Staff123!
-- Hashes bcrypt générés avec bcryptjs (10 rounds), identiques au seed TypeScript.

-- Paramètres salon
INSERT INTO "Setting" ("key", "value")
VALUES ('business_hours', '{"open":"09:00","close":"19:00","slotMinutes":30}')
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";

-- Compte admin (admin@lartiste.tn / Admin123!)
INSERT INTO "User" ("id", "email", "passwordHash", "name", "phone", "role", "seatNumber", "preferences", "createdAt", "updatedAt")
VALUES (
  'clseedadmin0001lartiste01',
  'admin@lartiste.tn',
  '$2b$10$pmFMMrHKso7KYHQTvw0dNeUX4GRYEikiMnDjqLemYwtwV7FXHsYF6',
  'Ali Chakroun',
  '+21620392769',
  'ADMIN'::"Role",
  NULL,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "name" = EXCLUDED."name",
  "phone" = EXCLUDED."phone",
  "updatedAt" = NOW();

-- Staff (staff1@staff2@ / Staff123!)
INSERT INTO "User" ("id", "email", "passwordHash", "name", "phone", "role", "seatNumber", "preferences", "createdAt", "updatedAt")
VALUES
  (
    'clseedstaff1001lartiste01',
    'staff1@lartiste.tn',
    '$2b$10$WofdUfY.HFWdwtm2SuAasOeKsWsLtaaJoNPwU3jVg7swJjoumUCJO',
    'Coiffeur Siège 1',
    '+21620392769',
    'STAFF'::"Role",
    1,
    NULL,
    NOW(),
    NOW()
  ),
  (
    'clseedstaff2001lartiste01',
    'staff2@lartiste.tn',
    '$2b$10$WofdUfY.HFWdwtm2SuAasOeKsWsLtaaJoNPwU3jVg7swJjoumUCJO',
    'Coiffeur Siège 2',
    '+21620392769',
    'STAFF'::"Role",
    2,
    NULL,
    NOW(),
    NOW()
  )
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "name" = EXCLUDED."name",
  "seatNumber" = EXCLUDED."seatNumber",
  "role" = 'STAFF'::"Role",
  "updatedAt" = NOW();

-- Ancien service supprimé si présent
DELETE FROM "Service" WHERE "slug" = 'coupe-femme';

-- Services (upsert par slug)
INSERT INTO "Service" ("id", "name", "slug", "description", "priceCents", "durationMinutes", "category", "active", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('svcseed001lartiste01', 'Coupe homme', 'coupe-homme', 'Coupe tendance, finitions au rasoir.', 2500, 30, 'Homme', true, 1, NOW(), NOW()),
  ('svcseed002lartiste01', 'Forfait mariage', 'forfait-mariage', 'Pack premium grand jour : coupe, barbe, soin, mise en forme — le forfait le plus complet du salon.', 25000, 120, 'Homme', true, 2, NOW(), NOW()),
  ('svcseed003lartiste01', 'Brushing', 'brushing', 'Mise en forme et brillance.', 2000, 30, 'Homme', true, 3, NOW(), NOW()),
  ('svcseed004lartiste01', 'Coloration', 'coloration', 'Coloration complète ou mèches.', 12000, 90, 'Homme', true, 4, NOW(), NOW()),
  ('svcseed005lartiste01', 'Barbe & contours', 'barbe', 'Taille de barbe et contours nets.', 1500, 20, 'Homme', true, 5, NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "priceCents" = EXCLUDED."priceCents",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "category" = EXCLUDED."category",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

-- Avis (uniquement si la table est vide — comme prisma/seed.ts)
DO $$
BEGIN
  IF (SELECT COUNT(*)::int FROM "Review") = 0 THEN
    INSERT INTO "Review" ("id", "authorName", "text", "rating", "published", "createdAt") VALUES
      ('revseed001lartiste01', 'Karim M.', 'Service impeccable, ambiance au top.', 5, true, NOW()),
      ('revseed002lartiste01', 'Sonia B.', 'Équipe pro et à l''écoute.', 5, true, NOW()),
      ('revseed003lartiste01', 'Mehdi A.', 'La meilleure coupe depuis des années.', 5, true, NOW());
  END IF;
END $$;

-- Médias (évite doublons par url/kind/sortOrder)
INSERT INTO "MediaAsset" ("id", "url", "alt", "kind", "sortOrder", "createdAt")
SELECT 'medseed001', '/salon-facade.png', 'Façade du salon L''Artiste', 'HERO', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "MediaAsset" WHERE "url" = '/salon-facade.png' AND "kind" = 'HERO' AND "sortOrder" = 0);
INSERT INTO "MediaAsset" ("id", "url", "alt", "kind", "sortOrder", "createdAt")
SELECT 'medseed002', '/salon-lifestyle.png', 'Ali Chakroun — L''Artiste', 'HERO', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "MediaAsset" WHERE "url" = '/salon-lifestyle.png' AND "kind" = 'HERO' AND "sortOrder" = 1);
INSERT INTO "MediaAsset" ("id", "url", "alt", "kind", "sortOrder", "createdAt")
SELECT 'medseed003', '/salon-lifestyle.png', 'Ali Chakroun', 'EQUIPE', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "MediaAsset" WHERE "url" = '/salon-lifestyle.png' AND "kind" = 'EQUIPE' AND "sortOrder" = 0);
INSERT INTO "MediaAsset" ("id", "url", "alt", "kind", "sortOrder", "createdAt")
SELECT 'medseed004', '/salon-facade.png', 'Salon L''Artiste', 'EQUIPE', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "MediaAsset" WHERE "url" = '/salon-facade.png' AND "kind" = 'EQUIPE' AND "sortOrder" = 1);
