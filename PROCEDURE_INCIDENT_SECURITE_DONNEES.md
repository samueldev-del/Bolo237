# Procedure interne incident securite et fuite de donnees

Date de preparation : 5 avril 2026

Ce document definit une procedure interne minimale pour Bolo237 en cas d'incident de securite, de suspicion de compromission, d'acces non autorise, de perte de donnees ou de fuite de donnees personnelles.

## 1. Objectif

- Detecter rapidement un incident.
- Limiter l'impact technique, juridique et reputionnel.
- Preserver les preuves utiles.
- Evaluer les obligations de notification au Cameroun, en Allemagne et, le cas echeant, vis-a-vis des personnes concernees.
- Assurer un retour d'experience apres resolution.

## 2. Types d'incidents couverts

- Compromission de compte admin ou utilisateur.
- Exposition publique de donnees personnelles.
- Fuite de base de donnees, fichiers uploades, documents KYC ou exports.
- Mauvaise configuration CORS, cookies, droits d'acces ou hebergement.
- Suppression accidentelle, alteration ou indisponibilite de donnees critiques.
- Malware, ransomware, credential stuffing, brute force ou prise de controle de session.

## 3. Roles minimum

- Responsable incident : Samuel DJOMMOU THENGHO.
- Support technique principal : personne qui intervient sur frontend, backend, base de donnees et hebergement.
- Conseil juridique externe : juriste Cameroun, puis juriste Allemagne/UE si des personnes ou traitements europeens sont touches.
- Communication externe : une seule personne valide les messages utilisateurs, partenaires et prestataires.

## 4. Canal de declenchement

- Toute alerte recue par email, logs, monitoring, utilisateur, admin ou prestataire doit etre enregistree immediatement.
- Ouvrir un ticket incident interne avec : date, heure, source, systeme impacte, resume, personne qui constate.
- Attribuer un niveau de severite provisoire dans les 30 minutes.

## 5. Niveaux de severite

- Sev 1 : fuite de donnees personnelles sensibles, acces admin compromis, indisponibilite majeure, compromission en cours.
- Sev 2 : exposition limitee, acces non autorise probable, incident de moderation ou session affectant plusieurs utilisateurs.
- Sev 3 : anomalie faible impact, incident circonscrit sans preuve actuelle de fuite.

## 6. Actions immediates dans la premiere heure

- Confirmer si l'incident est actif, termine ou seulement suspecte.
- Capturer les preuves disponibles sans les detruire : logs, captures, requetes, identifiants de sessions, horodatages, IP, IDs concernes.
- Contenir rapidement l'incident : rotation de secrets, invalidation de sessions, blocage d'IP, desactivation temporaire d'une route, retrait d'un fichier expose, suspension d'un compte compromis.
- Si l'origine semble etre un prestataire, ouvrir immediatement un ticket chez le prestataire concerne.
- Ne pas communiquer d'explication definitive avant verification minimale des faits.

## 7. Preservation des preuves

- Conserver une copie des logs applicatifs et reverse proxy lies a l'incident.
- Noter les horodatages en UTC si possible.
- Conserver les valeurs de configuration avant correction lorsqu'elles sont utiles a l'analyse.
- Conserver les copies de notifications recues ou envoyees.
- Eviter toute commande destructive qui empecherait l'analyse forensique, sauf si elle est necessaire pour arreter une fuite active.

## 8. Qualification de l'incident

Documenter rapidement les points suivants :

- Systeme ou service touche.
- Type de donnees potentiellement affectees.
- Nombre estime d'utilisateurs affectes.
- Pays ou juridictions potentiellement concernes.
- Incident confirme ou non confirme.
- Cause probable : erreur humaine, faille logique, credential leak, prestataire, configuration, code deploye.
- Mesures de confinement deja prises.

## 9. Evaluation specifique donnees personnelles

Verifier si les categories suivantes sont impliquees :

- Identite, telephone, email, ville.
- Profils utilisateurs, CV, candidatures.
- Fichiers KYC / verification.
- Donnees de moderation et signalement.
- Donnees de session, cookies, journaux techniques.

Evaluer ensuite :

- Confidentialite : une personne non autorisee a-t-elle eu acces aux donnees ?
- Integrite : les donnees ont-elles ete modifiees ?
- Disponibilite : les donnees sont-elles indisponibles ou detruites ?
- Risque pour les personnes : usurpation, fraude, harcelement, atteinte a la reputation, discrimination, vol d'identifiants.

## 10. Notifications et escalade juridique

- En cas de donnees personnelles affectees, consulter rapidement le juriste competent avant toute notification externe definitive.
- Verifier les obligations de notification applicables au Cameroun, a l'Allemagne et aux personnes concernees selon la nature des donnees et le risque.
- Si des prestataires sont impliques, demander leur rapport d'incident et leurs heures precises de detection et containment.
- Conserver un journal des decisions : qui a decide, quand, et sur quelle base.

## 11. Communication externe

- Toute communication doit etre factuelle, datee et coherente avec l'etat des verifications.
- Ne pas minimiser un incident non qualifie.
- Ne pas promettre une absence d'impact tant que la verification n'est pas terminee.
- Si des utilisateurs sont concernes, expliquer au minimum : ce qui s'est passe, les donnees potentiellement touchees, les mesures prises, les actions recommandees a l'utilisateur, et le point de contact.

## 12. Remediation technique

- Corriger la cause racine et pas seulement le symptome visible.
- Faire relire le correctif si l'incident touche auth, session, CORS, ACL, fichiers ou donnees personnelles.
- Regenerer les secrets et mots de passe exposes ou suspects.
- Verifier les journaux post-correctif pour confirmer l'arret de l'incident.
- Revoir les comptes, tokens, webhooks, buckets, variables d'environnement et acces prestataires concernes.

## 13. Reouverture du service

- Le service ne doit etre reouvert completement qu'apres verification des points suivants :
- Le vecteur principal est neutralise.
- Les acces sensibles ont ete revokes ou rotates.
- Les controles de surveillance sont actifs.
- Les parties internes utiles ont ete informees.
- La decision de reouverture est consignee avec date et heure.

## 14. Retour d'experience sous 72 heures

- Rediger un resume interne de l'incident.
- Decrire la cause racine verifiee ou la meilleure hypothese restante.
- Quantifier l'impact reel.
- Lister les actions correctives techniques et organisationnelles.
- Mettre a jour la checklist de conformite, les politiques internes, la documentation ou le code si necessaire.

## 15. Checklist d'action rapide

- [ ] Ouvrir ticket incident
- [ ] Attribuer severite provisoire
- [ ] Capturer logs et preuves
- [ ] Contenir l'incident
- [ ] Evaluer donnees personnelles potentiellement touchees
- [ ] Consulter juriste si risque donnees personnelles
- [ ] Decider si notification externe requise
- [ ] Corriger la cause racine
- [ ] Verifier stabilisation
- [ ] Rediger post-mortem interne