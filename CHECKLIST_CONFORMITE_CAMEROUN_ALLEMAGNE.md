# Checklist de conformité Bolo237

Date de préparation : 5 avril 2026

Ce document sert de checklist opérationnelle avant relecture par un juriste au Cameroun et, si nécessaire, par un conseil en Allemagne ou en droit européen.

## 1. Identification de l'exploitant

- [x] Le nom de l'exploitant est affiché sur les mentions légales.
- [x] Le pays d'établissement de l'exploitant est indiqué.
- [ ] Vérifier avec juriste si une adresse postale complète doit apparaître publiquement.
- [ ] Vérifier si un numéro d'immatriculation allemand doit être affiché sur toutes les pages légales.
- [ ] Vérifier si un représentant local au Cameroun est juridiquement recommandé ou requis selon l'activité réelle.

## 2. Cohérence des documents contractuels

- [x] Les mentions légales, la politique de confidentialité, la politique cookies et les CGU sont alignées sur une exploitation depuis l'Allemagne avec usage au Cameroun.
- [x] Les CGU prévoient une tentative de résolution amiable avant contentieux.
- [x] Les textes évitent désormais la promesse d'une suppression instantanée du compte.
- [ ] Faire relire les clauses de droit applicable et de juridiction compétente pour confirmer qu'elles sont opposables en contexte B2C/B2B au Cameroun.
- [ ] Vérifier si certaines clauses doivent distinguer candidat, artisan et entreprise.

## 3. Protection des données personnelles

- [x] La politique de confidentialité mentionne la Loi camerounaise n°2024/017 et le RGPD comme cadre de référence.
- [x] Les droits d'accès, rectification, suppression, opposition, portabilité et retrait du consentement sont décrits.
- [x] Un export des données au format JSON est disponible côté frontend et backend.
- [x] Une demande de suppression de compte est disponible avec référence de suivi.
- [ ] Vérifier avec juriste les durées de conservation annoncées pour les données de compte, KYC, signalements et cookies.
- [ ] Vérifier si une notification ou déclaration formelle doit être faite auprès d'une autorité camerounaise de protection des données.
- [ ] Vérifier si un registre interne des traitements doit être formalisé séparément du site.

## 4. Cookies et preuve du consentement

- [x] Un bandeau cookies réel existe sur le frontend.
- [x] Le consentement est versionné et conservé avec durée maximale de 13 mois.
- [x] Les cookies non essentiels sont décrits comme optionnels et désactivés par défaut dans les textes.
- [ ] Vérifier avec juriste si des traceurs analytics ou marketing supplémentaires doivent être bloqués tant qu'aucun consentement explicite n'est donné.
- [ ] Vérifier si la preuve de consentement doit être exportable ou journalisée côté serveur en plus du navigateur.

## 5. Hébergement et transferts internationaux

- [x] Les pages légales mentionnent l'hébergement et les transferts hors Cameroun.
- [x] Les sous-traitants techniques principaux sont identifiés à haut niveau.
- [ ] Dresser une annexe interne complète des sous-traitants : hébergement, email, SMS, WhatsApp, stockage, analytics.
- [ ] Vérifier les mécanismes juridiques de transfert applicables entre Cameroun, UE et éventuels serveurs US.
- [ ] Préparer une version interne des clauses contractuelles ou garanties de transfert utilisées avec les prestataires.

## 6. Sécurité et antifraude

- [x] Des headers de sécurité frontend sont activés.
- [x] Le backend applique Helmet, cookies de session, CORS contrôlé et limitation de débit.
- [x] Les signalements publics sont reliés au backend avec validation, déduplication et seuil de revue.
- [x] Les demandes de suppression ne suppriment pas aveuglément les données soumises à conservation légale.
- [ ] Rédiger une procédure interne de réponse aux incidents de sécurité et de fuite de données.
- [ ] Vérifier avec juriste sous quels délais une violation de données doit être notifiée au Cameroun, en Allemagne ou à des utilisateurs européens.

## 7. Conformité produit et activité économique

- [ ] Vérifier si Bolo237 doit être qualifié juridiquement comme simple intermédiaire, place de marché, opérateur de petites annonces ou prestataire de mise en relation.
- [ ] Vérifier si certaines activités artisanales ou offres d'emploi exigent des mentions sectorielles spécifiques.
- [ ] Vérifier si une politique spécifique sur les contenus illicites, la modération et les contestations doit être publiée séparément.
- [ ] Vérifier si des obligations de droit du travail, de droit de la consommation ou de publicité s'appliquent selon le type d'offre publiée.

## 8. Preuves et gouvernance interne

- [ ] Conserver un historique interne des versions des CGU, de la politique de confidentialité et de la politique cookies.
- [ ] Conserver la date de mise en production de chaque version légale.
- [ ] Documenter en interne qui traite les demandes d'accès, suppression et contestation.
- [ ] Définir un délai cible de réponse aux demandes des utilisateurs.
- [ ] Préparer un modèle d'email de réponse pour export de données, refus partiel motivé et suppression exécutée.

## 9. Questions à poser au juriste camerounais

- [ ] La clause de juridiction Douala est-elle suffisante et valable dans notre cas d'usage précis ?
- [ ] La Loi n°2024/017 impose-t-elle une formalité préalable pour un service opéré depuis l'étranger mais visant le Cameroun ?
- [ ] Les durées de conservation retenues sont-elles adaptées pour une plateforme d'emploi / mise en relation ?
- [ ] Faut-il afficher des mentions supplémentaires sur l'identité de l'exploitant ou sur les recours des utilisateurs ?
- [ ] La politique de modération et d'antifraude doit-elle être séparée des CGU ?

## 10. Questions à poser au juriste Allemagne / UE

- [ ] Les pages légales couvrent-elles correctement les obligations minimales d'un exploitant individuel établi en Allemagne ?
- [ ] Faut-il ajouter des mentions fiscales ou commerciales allemandes supplémentaires ?
- [ ] Le fondement juridique retenu pour les traitements est-il suffisamment précis au regard du RGPD ?
- [ ] Le recours à Vercel, aux prestataires OTP et aux outils de communication nécessite-t-il une documentation contractuelle complémentaire publiée ou interne ?

## 11. Priorités de suivi

- [ ] Priorité haute : relecture juridique des clauses de droit applicable, juridiction et transferts internationaux.
- [ ] Priorité haute : valider les durées de conservation et la procédure de suppression.
- [ ] Priorité moyenne : formaliser la procédure interne d'incident et de traitement des demandes utilisateurs.
- [ ] Priorité moyenne : compléter l'inventaire des sous-traitants et pièces de conformité.