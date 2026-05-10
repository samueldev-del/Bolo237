# Backlog QA Priorise P0 P1 P2

## P0

### Corriges dans ce lot

1. Validation mot de passe backend alignee sur le frontend
Statut: corrige
Impact: l'API `/api/users` refusait un mot de passe trop court seulement cote UI. Le backend impose maintenant un minimum de 6 caracteres.

2. Notifications et emails de candidature recables sur la route active
Statut: corrige
Impact: la route active `/api/jobs/:id/apply` cree maintenant les notifications candidat et recruteur, puis relance les emails transactionnels correspondants.

3. Notification auteur lors de la moderation d'une offre
Statut: corrige
Impact: la route `/api/admin/jobs/:id/status` notifie desormais l'auteur de l'offre en in-app et par email lors d'un changement de statut.

4. Notification utilisateur lors d'un rejet KYC
Statut: corrige
Impact: la route `/api/admin/verifications/:id/status` notifie desormais le rejet, envoie un email de suivi et remet `isVerified` a `false` pour garder l'etat coherent.

### A surveiller en regression immediate

1. Ajouter un test automatise backend ou integration sur l'inscription avec mot de passe trop court.
2. Ajouter un test automatise sur la candidature interne verifiant notification candidat et recruteur.
3. Ajouter un test automatise sur la moderation admin d'une offre avec notification auteur.
4. Ajouter un test automatise sur le rejet KYC avec verification de notification et etat utilisateur.

## P1

1. Ajouter un message WhatsApp pre-rempli sur la fiche artisan pour contextualiser la prise de contact.
2. Ajouter des actions de contact direct candidat dans le dashboard entreprise (`mailto:` ou deep link WhatsApp si disponible).
3. Ameliorer le wording des erreurs CV cote backend pour expliquer clairement les formats acceptes et l'action attendue.
4. Activer une couverture Playwright mobile minimale sur les parcours candidat, artisan et entreprise.
5. Ajouter une vue d'alertes admin plus unifiee entre signalements, feedbacks et inbox.

## P2

1. Remplacer la suppression dure des offres admin par une cloture ou un archivage motive.
2. Ajouter un historique de moderation plus detaille sur les changements de statut des offres et verifications.
3. Ajouter des motifs standardises de rejet KYC et de rejet d'offre pour homogeniser les communications.
4. Mettre en place des tableaux de bord QA avec suivi des regressions produit par persona.

## Resume execution

1. P0 code: traite dans ce lot.
2. P1 produit/UX: recommande pour l'iteration suivante.
3. P2 gouvernance/exploitation: recommande apres stabilisation des parcours critiques.
