-- Phase A : ajout d'une colonne `priceAmount` Decimal(12,2) en parallèle du
-- texte libre `price`. Aucune valeur existante n'est touchée. Un script de
-- backfill séparé pourra extraire les montants numériques des chaînes
-- structurées ("5000 FCFA", "10 000 / heure", etc.) sans perdre l'original.

ALTER TABLE "ArtisanService" ADD COLUMN "priceAmount" DECIMAL(12, 2);
