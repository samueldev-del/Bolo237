# Cas UAT Manuels Par Persona

## Candidat

### UAT-CAN-01 Inscription avec mot de passe trop court

Preconditions: utilisateur non connecte.

Etapes:

- Ouvrir la page de connexion/inscription.
- Remplir un numero ou email valide.
- Saisir un mot de passe de 1 a 5 caracteres.
- Soumettre l'inscription.

Resultat attendu:

- L'inscription est refusee.
- Un message indique qu'il faut au moins 6 caracteres.
- Aucun compte valide n'est cree.

### UAT-CAN-02 Candidature interne avec CV principal

Preconditions: compte candidat connecte, profil complet, CV principal disponible, offre interne active.

Etapes:

- Ouvrir une offre sans `externalApplyUrl`.
- Cliquer sur postuler.
- Garder le CV principal coche.
- Ajouter un message de motivation.
- Confirmer l'envoi.

Resultat attendu:

- La candidature est creee.
- Un message de succes s'affiche.
- Le candidat recoit une notification in-app de candidature envoyee.
- Un email de confirmation est emis si l'adresse est delivrable.

### UAT-CAN-03 Candidature interne avec nouveau CV

Preconditions: compte candidat connecte, profil complet, offre interne active.

Etapes:

- Ouvrir une offre interne.
- Cliquer sur postuler.
- Decocher le CV principal si present.
- Televerser un fichier PDF ou DOCX inferieur a 5 Mo.
- Confirmer l'envoi.

Resultat attendu:

- Le fichier est accepte.
- La candidature est envoyee.
- Le CV associe est telechargeable cote recruteur.

### UAT-CAN-04 Erreur CV invalide

Preconditions: compte candidat connecte, offre interne active.

Etapes:

- Ouvrir le formulaire de candidature.
- Televerser un fichier invalide ou corrompu.
- Soumettre.

Resultat attendu:

- L'envoi est bloque.
- Un message d'erreur comprehensible s'affiche.
- Aucun doublon de candidature n'est cree.

### UAT-CAN-05 Offre externe

Preconditions: offre avec `externalApplyUrl` active.

Etapes:

- Ouvrir la fiche offre.
- Cliquer sur postuler.

Resultat attendu:

- Un nouvel onglet externe s'ouvre.
- Le formulaire interne Bolo237 ne s'affiche pas.

### UAT-CAN-06 Mise a jour de statut par recruteur

Preconditions: candidature existante, recruteur rattache a l'offre.

Etapes:

- Demander au recruteur de passer la candidature a `REVIEWING`, puis `INTERVIEW`, puis `REJECTED` ou `HIRED`.
- Revenir sur le compte candidat.

Resultat attendu:

- Le statut change dans l'espace candidat.
- Une notification in-app est visible.
- Un email de mise a jour est emis si l'adresse est delivrable.

## Artisan

### UAT-ART-01 Publication d'annonce puis moderation admin

Preconditions: compte artisan verifie, annonce en attente ou a publier.

Etapes:

- Publier une annonce depuis le dashboard artisan.
- Faire moderer l'annonce par un admin en `APPROVED`, `REJECTED`, puis `CLOSED` sur un environnement de test.

Resultat attendu:

- L'artisan recoit une notification a chaque changement de statut.
- Un email de suivi est emis si l'adresse est delivrable.
- Le statut visible dans le dashboard artisan correspond a l'action admin.

### UAT-ART-02 Rejet KYC avec motif

Preconditions: compte artisan avec demande KYC soumise.

Etapes:

- En admin, rejeter la verification avec une note.
- Revenir sur le compte artisan.

Resultat attendu:

- L'utilisateur recoit une notification de rejet.
- Un email de rejet est emis si l'adresse est delivrable.
- Le badge de verification n'est plus actif.
- Le motif de rejet est exploitable pour corriger le dossier.

### UAT-ART-03 Approvisionnement WhatsApp fiche artisan

Preconditions: fiche artisan publique avec numero WhatsApp.

Etapes:

- Ouvrir la fiche publique.
- Cliquer sur le bouton WhatsApp.

Resultat attendu:

- WhatsApp s'ouvre correctement.
- Aucun crash ni URL invalide.

Note: aujourd'hui le message n'est pas pre-rempli, c'est un point P1 a traiter.

## Entreprise

### UAT-ENT-01 Reception d'une nouvelle candidature

Preconditions: offre interne publiee, candidat a postule.

Etapes:

- Ouvrir le dashboard entreprise.
- Aller dans la section candidatures de l'offre.

Resultat attendu:

- La candidature apparait dans la liste.
- L'entreprise recoit une notification in-app de nouvelle candidature.
- Un email de nouvelle candidature est emis si l'adresse entreprise est delivrable.

### UAT-ENT-02 Changement de statut candidat

Preconditions: candidature existante.

Etapes:

- Passer la candidature en `REVIEWING`.
- Passer la candidature en `INTERVIEW`.
- Passer la candidature en `HIRED` ou `REJECTED`.

Resultat attendu:

- Chaque action reussit sans rechargement destructif.
- Le badge de statut se met a jour dans l'UI.
- Le candidat est notifie.

### UAT-ENT-03 Moderation d'une offre entreprise

Preconditions: compte entreprise avec une offre en attente ou existante.

Etapes:

- Faire changer le statut de l'offre par un admin.
- Revenir au dashboard entreprise.

Resultat attendu:

- L'entreprise voit le nouveau statut.
- Une notification in-app est visible.
- Un email de suivi est emis si l'adresse est delivrable.

## Admin

### UAT-ADM-01 Moderation d'une offre

Preconditions: admin connecte, offre existante.

Etapes:

- Ouvrir la moderation des offres.
- Passer une offre en `APPROVED`, `REJECTED`, `PENDING`, puis `CLOSED` sur des donnees de test.

Resultat attendu:

- L'action reussit sans erreur 500.
- Le statut est persiste en base.
- L'auteur recoit notification et email si delivrable.

### UAT-ADM-02 Rejet KYC

Preconditions: admin connecte, demande KYC existante.

Etapes:

- Ouvrir la file de verification.
- Rejeter une demande avec une note.
- Verifier le compte utilisateur lie.

Resultat attendu:

- Le statut de la soumission passe a `rejected`.
- L'utilisateur recoit notification et email si delivrable.
- `isVerified` vaut `false` sur le compte cible.

### UAT-ADM-03 Validation KYC

Preconditions: admin connecte, demande KYC existante.

Etapes:

- Approuver une demande.
- Verifier le compte utilisateur lie.

Resultat attendu:

- L'utilisateur recoit la notification de compte certifie.
- L'email de verification est emis si delivrable.
- `isVerified` vaut `true`.

### UAT-ADM-04 Signalements et feedbacks

Preconditions: au moins un feedback app et un signalement existants.

Etapes:

- Ouvrir la page Signalements.
- Ouvrir la page Feedbacks App.
- Ouvrir l'Inbox admin.

Resultat attendu:

- Les signalements sont visibles dans leur file dediee.
- Les feedbacks sont visibles dans leur file dediee.
- L'Inbox continue de ne montrer que les emails synchronises.

Note: l'unification de ces files reste un chantier P1/P2, pas une regression.

## Criteres de sortie UAT

- Aucun parcours P0 ne doit produire d'erreur bloquante.
- Chaque changement de statut critique doit etre visible dans l'interface cible.
- Chaque notification critique doit exister au moins en in-app, avec email si l'adresse est delivrable.
- Les differences entre flux internes et flux externes doivent rester explicites pour l'utilisateur.
