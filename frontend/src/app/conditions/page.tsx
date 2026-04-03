"use client";

import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';

export default function ConditionsPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const sections = [
    {
      num: 1,
      title: isEn ? 'Preamble' : 'Pr\u00e9ambule',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Bolo237 is a digital platform operated by Samuel DJOMMOU THENGHO, a sole proprietor registered in Germany. Bolo237 provides a progressive web application (PWA) that connects job seekers, employers, and independent artisans across Cameroon.'
              : 'Bolo237 est une plateforme num\u00e9rique exploit\u00e9e par Samuel DJOMMOU THENGHO, entrepreneur individuel enregistr\u00e9 en Allemagne. Bolo237 fournit une application web progressive (PWA) qui met en relation les demandeurs d\u2019emploi, les employeurs et les artisans ind\u00e9pendants \u00e0 travers le Cameroun.'}
          </p>
          <p className="text-gray-700 leading-relaxed">
            {isEn
              ? 'By accessing or using the Bolo237 platform, whether by browsing, creating an account, or publishing content, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use in their entirety. If you do not accept these terms, you must immediately cease all use of the platform.'
              : 'En acc\u00e9dant ou en utilisant la plateforme Bolo237, que ce soit en naviguant, en cr\u00e9ant un compte ou en publiant du contenu, vous reconnaissez avoir lu, compris et accept\u00e9 d\u2019\u00eatre li\u00e9(e) par les pr\u00e9sentes Conditions G\u00e9n\u00e9rales d\u2019Utilisation dans leur int\u00e9gralit\u00e9. Si vous n\u2019acceptez pas ces conditions, vous devez cesser imm\u00e9diatement toute utilisation de la plateforme.'}
          </p>
        </>
      ),
    },
    {
      num: 2,
      title: isEn ? 'Definitions' : 'D\u00e9finitions',
      content: (
        <ul className="space-y-3">
          {[
            {
              term: isEn ? 'Platform' : 'Plateforme',
              def: isEn
                ? 'The Bolo237 website and progressive web application (PWA), accessible at bolo237.com and through mobile devices.'
                : 'Le site web et l\u2019application web progressive (PWA) Bolo237, accessibles \u00e0 l\u2019adresse bolo237.com et via les appareils mobiles.',
            },
            {
              term: isEn ? 'User' : 'Utilisateur',
              def: isEn
                ? 'Any natural person who accesses the platform, whether registered or not.'
                : 'Toute personne physique acc\u00e9dant \u00e0 la plateforme, qu\u2019elle soit inscrite ou non.',
            },
            {
              term: isEn ? 'Candidate' : 'Candidat',
              def: isEn
                ? 'A registered user seeking employment opportunities through the platform.'
                : 'Un utilisateur inscrit recherchant des opportunit\u00e9s d\u2019emploi via la plateforme.',
            },
            {
              term: isEn ? 'Employer' : 'Employeur',
              def: isEn
                ? 'A registered user or entity that publishes job offers on the platform.'
                : 'Un utilisateur inscrit ou une entit\u00e9 publiant des offres d\u2019emploi sur la plateforme.',
            },
            {
              term: isEn ? 'Artisan' : 'Artisan',
              def: isEn
                ? 'A registered user who offers independent professional services (e.g., plumbing, electrical work, tailoring, construction).'
                : 'Un utilisateur inscrit proposant des services professionnels ind\u00e9pendants (par ex. plomberie, \u00e9lectricit\u00e9, couture, construction).',
            },
            {
              term: isEn ? 'Account' : 'Compte',
              def: isEn
                ? 'The personal space created by a user upon registration, secured by OTP phone verification.'
                : 'L\u2019espace personnel cr\u00e9\u00e9 par un utilisateur lors de son inscription, s\u00e9curis\u00e9 par v\u00e9rification OTP par t\u00e9l\u00e9phone.',
            },
            {
              term: isEn ? 'Content' : 'Contenu',
              def: isEn
                ? 'Any information, text, image, document, or data uploaded or published on the platform by a user.'
                : 'Toute information, texte, image, document ou donn\u00e9e t\u00e9l\u00e9vers\u00e9(e) ou publi\u00e9(e) sur la plateforme par un utilisateur.',
            },
            {
              term: 'Identity Shield',
              def: isEn
                ? 'The identity verification (KYC) system of Bolo237 that allows users to obtain a verified badge after submitting and passing an identity document review.'
                : 'Le syst\u00e8me de v\u00e9rification d\u2019identit\u00e9 (KYC) de Bolo237 permettant aux utilisateurs d\u2019obtenir un badge v\u00e9rifi\u00e9 apr\u00e8s soumission et validation d\u2019un document d\u2019identit\u00e9.',
            },
            {
              term: 'Services',
              def: isEn
                ? 'All features and functionalities offered by the platform, including job matching, artisan discovery, profile management, and communication tools.'
                : 'L\u2019ensemble des fonctionnalit\u00e9s propos\u00e9es par la plateforme, y compris la mise en relation professionnelle, la recherche d\u2019artisans, la gestion de profil et les outils de communication.',
            },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-700">
              <span className="text-[#DA7756] mt-1 font-bold">&#10003;</span>
              <span>
                <strong className="text-gray-900">{item.term}</strong>{' \u2013 '}
                {item.def}
              </span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      num: 3,
      title: isEn ? 'Purpose' : 'Objet',
      content: (
        <p className="text-gray-700 leading-relaxed">
          {isEn
            ? 'These Terms of Use govern the conditions under which users may access and use the Bolo237 platform. The platform provides a digital matching service that connects job seekers with employers and enables independent artisans to showcase their skills and services to potential clients throughout Cameroon. The platform is provided entirely free of charge to all users.'
            : 'Les pr\u00e9sentes Conditions G\u00e9n\u00e9rales d\u2019Utilisation r\u00e9gissent les conditions d\u2019acc\u00e8s et d\u2019utilisation de la plateforme Bolo237. La plateforme offre un service de mise en relation num\u00e9rique connectant les demandeurs d\u2019emploi avec les employeurs et permettant aux artisans ind\u00e9pendants de pr\u00e9senter leurs comp\u00e9tences et services aux clients potentiels \u00e0 travers le Cameroun. La plateforme est fournie enti\u00e8rement gratuitement \u00e0 tous les utilisateurs.'}
        </p>
      ),
    },
    {
      num: 4,
      title: isEn ? 'Access and Registration' : 'Acc\u00e8s et Inscription',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Access to certain features of the platform requires the creation of a personal account. Registration and use of the platform are completely free of charge. By registering, you agree to the following conditions:'
              : 'L\u2019acc\u00e8s \u00e0 certaines fonctionnalit\u00e9s de la plateforme n\u00e9cessite la cr\u00e9ation d\u2019un compte personnel. L\u2019inscription et l\u2019utilisation de la plateforme sont enti\u00e8rement gratuites. En vous inscrivant, vous acceptez les conditions suivantes :'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'You must be at least 18 years of age to create an account and use the platform.'
                : 'Vous devez \u00eatre \u00e2g\u00e9(e) d\u2019au moins 18 ans pour cr\u00e9er un compte et utiliser la plateforme.',
              isEn
                ? 'Each individual may only create and maintain one single account. Duplicate accounts will be suspended.'
                : 'Chaque personne ne peut cr\u00e9er et maintenir qu\u2019un seul compte. Les comptes en double seront suspendus.',
              isEn
                ? 'Phone number verification via OTP (one-time password) is mandatory to activate your account.'
                : 'La v\u00e9rification du num\u00e9ro de t\u00e9l\u00e9phone par OTP (mot de passe \u00e0 usage unique) est obligatoire pour activer votre compte.',
              isEn
                ? 'You must provide accurate, truthful, and up-to-date information during registration and throughout your use of the platform.'
                : 'Vous devez fournir des informations exactes, v\u00e9ridiques et \u00e0 jour lors de l\u2019inscription et tout au long de votre utilisation de la plateforme.',
              isEn
                ? 'You are solely responsible for maintaining the confidentiality of your account credentials.'
                : 'Vous \u00eates seul(e) responsable de la confidentialit\u00e9 de vos identifiants de connexion.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      num: 5,
      title: isEn ? 'Role of the Platform' : 'R\u00f4le de la Plateforme',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Bolo237 acts exclusively as a digital intermediary. It is essential that all users understand the following:'
              : 'Bolo237 agit exclusivement en tant qu\u2019interm\u00e9diaire num\u00e9rique. Il est essentiel que tous les utilisateurs comprennent ce qui suit :'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'Bolo237 is NOT an employer. We do not hire, pay, or manage any candidate registered on the platform.'
                : 'Bolo237 n\u2019est PAS un employeur. Nous n\u2019embauchons, ne r\u00e9mun\u00e9rons et ne g\u00e9rons aucun candidat inscrit sur la plateforme.',
              isEn
                ? 'Bolo237 is NOT a service provider. We do not perform, supervise, or guarantee any artisan service listed on the platform.'
                : 'Bolo237 n\u2019est PAS un prestataire de services. Nous n\u2019ex\u00e9cutons, ne supervisons et ne garantissons aucun service artisanal r\u00e9f\u00e9renc\u00e9 sur la plateforme.',
              isEn
                ? 'Any contract, agreement, or arrangement is entered into directly between users. Bolo237 is not a party to such agreements.'
                : 'Tout contrat, accord ou arrangement est conclu directement entre les utilisateurs. Bolo237 n\u2019est pas partie \u00e0 de tels accords.',
              isEn
                ? 'Bolo237 facilitates communication between users, notably via WhatsApp integration, but does not control or monitor private conversations.'
                : 'Bolo237 facilite la communication entre utilisateurs, notamment via l\u2019int\u00e9gration WhatsApp, mais ne contr\u00f4le ni ne surveille les conversations priv\u00e9es.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      num: 6,
      title: isEn ? 'User Commitments' : 'Engagements de l\u2019Utilisateur',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'By using the Bolo237 platform, each user commits to respecting the following obligations:'
              : 'En utilisant la plateforme Bolo237, chaque utilisateur s\u2019engage \u00e0 respecter les obligations suivantes :'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'Provide accurate and truthful information in your profile, listings, and during identity verification.'
                : 'Fournir des informations exactes et v\u00e9ridiques dans votre profil, vos annonces et lors de la v\u00e9rification d\u2019identit\u00e9.',
              isEn
                ? 'Only publish content that is lawful, non-discriminatory, and does not infringe on the rights of third parties.'
                : 'Ne publier que du contenu l\u00e9gal, non discriminatoire et ne portant pas atteinte aux droits de tiers.',
              isEn
                ? 'Maintain professional and respectful conduct in all interactions with other users, whether on the platform or via WhatsApp.'
                : 'Maintenir une conduite professionnelle et respectueuse dans toutes les interactions avec les autres utilisateurs, que ce soit sur la plateforme ou via WhatsApp.',
              isEn
                ? 'Refrain from any fraudulent activity, including creating fake profiles, posting misleading listings, or impersonating another person.'
                : 'S\u2019abstenir de toute activit\u00e9 frauduleuse, y compris la cr\u00e9ation de faux profils, la publication d\u2019annonces trompeuses ou l\u2019usurpation d\u2019identit\u00e9.',
              isEn
                ? 'Do not send unsolicited bulk messages (spam) or use the platform for purposes unrelated to employment or artisan services.'
                : 'Ne pas envoyer de messages non sollicit\u00e9s en masse (spam) ni utiliser la plateforme \u00e0 des fins \u00e9trang\u00e8res \u00e0 l\u2019emploi ou aux services artisanaux.',
              isEn
                ? 'Respect the intellectual property rights of Bolo237 and other users at all times.'
                : 'Respecter en tout temps les droits de propri\u00e9t\u00e9 intellectuelle de Bolo237 et des autres utilisateurs.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      num: 7,
      title: isEn ? 'Identity Verification (Identity Shield)' : 'V\u00e9rification d\u2019Identit\u00e9 (Identity Shield)',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Bolo237 offers an optional identity verification program called Identity Shield, designed to build trust among users. The verification process works as follows:'
              : 'Bolo237 propose un programme optionnel de v\u00e9rification d\u2019identit\u00e9 appel\u00e9 Identity Shield, con\u00e7u pour renforcer la confiance entre utilisateurs. Le processus de v\u00e9rification fonctionne comme suit :'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'Users submit a valid identity document (Cameroonian National ID Card \u2013 CNI, or passport) along with a selfie for facial comparison.'
                : 'Les utilisateurs soumettent un document d\u2019identit\u00e9 valide (Carte Nationale d\u2019Identit\u00e9 camerounaise \u2013 CNI, ou passeport) accompagn\u00e9 d\u2019un selfie pour comparaison faciale.',
              isEn
                ? 'Each submission is reviewed manually by our administration team to ensure authenticity and accuracy.'
                : 'Chaque soumission est examin\u00e9e manuellement par notre \u00e9quipe d\u2019administration pour en assurer l\u2019authenticit\u00e9 et l\u2019exactitude.',
              isEn
                ? 'Upon successful verification, the user receives a "Verified" badge displayed on their profile, signaling to other users that their identity has been confirmed.'
                : 'Apr\u00e8s v\u00e9rification r\u00e9ussie, l\u2019utilisateur re\u00e7oit un badge \u00ab V\u00e9rifi\u00e9 \u00bb affich\u00e9 sur son profil, signalant aux autres utilisateurs que son identit\u00e9 a \u00e9t\u00e9 confirm\u00e9e.',
              isEn
                ? 'The verified badge confirms identity only. It does not constitute an endorsement of the user\u2019s skills, reliability, or the quality of their services.'
                : 'Le badge v\u00e9rifi\u00e9 confirme l\u2019identit\u00e9 uniquement. Il ne constitue pas une approbation des comp\u00e9tences, de la fiabilit\u00e9 ou de la qualit\u00e9 des services de l\u2019utilisateur.',
              isEn
                ? 'Bolo237 reserves the right to refuse or revoke verification at any time, without obligation to justify the decision, in cases of suspected fraud or document forgery.'
                : 'Bolo237 se r\u00e9serve le droit de refuser ou de r\u00e9voquer la v\u00e9rification \u00e0 tout moment, sans obligation de justification, en cas de suspicion de fraude ou de falsification de documents.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      num: 8,
      title: isEn ? 'Job Listings' : 'Publication d\u2019Annonces',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Employers may publish job offers on the platform subject to the following rules:'
              : 'Les employeurs peuvent publier des offres d\u2019emploi sur la plateforme sous r\u00e9serve des r\u00e8gles suivantes :'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'All listings must describe lawful employment opportunities that comply with Cameroonian labor law.'
                : 'Toutes les annonces doivent d\u00e9crire des opportunit\u00e9s d\u2019emploi l\u00e9gales conformes au droit du travail camerounais.',
              isEn
                ? 'Listings must not contain discriminatory content based on gender, ethnicity, religion, disability, political opinion, or any other protected characteristic.'
                : 'Les annonces ne doivent contenir aucun contenu discriminatoire fond\u00e9 sur le genre, l\u2019ethnie, la religion, le handicap, l\u2019opinion politique ou toute autre caract\u00e9ristique prot\u00e9g\u00e9e.',
              isEn
                ? 'All listings are subject to moderation by the Bolo237 administration team before publication or at any time thereafter.'
                : 'Toutes les annonces sont soumises \u00e0 la mod\u00e9ration par l\u2019\u00e9quipe d\u2019administration de Bolo237 avant publication ou \u00e0 tout moment ult\u00e9rieur.',
              isEn
                ? 'Bolo237 reserves the right to refuse, modify, or remove any listing that violates these terms or is deemed inappropriate, without prior notice.'
                : 'Bolo237 se r\u00e9serve le droit de refuser, modifier ou supprimer toute annonce enfreignant les pr\u00e9sentes conditions ou jug\u00e9e inappropri\u00e9e, sans pr\u00e9avis.',
              isEn
                ? 'Employers are solely responsible for the accuracy and legality of the information contained in their listings.'
                : 'Les employeurs sont seuls responsables de l\u2019exactitude et de la l\u00e9galit\u00e9 des informations contenues dans leurs annonces.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      num: 9,
      title: isEn ? 'Applications and Matching' : 'Candidatures et Mise en Relation',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'The Bolo237 platform facilitates the connection between candidates, employers, and artisans through the following mechanisms:'
              : 'La plateforme Bolo237 facilite la mise en relation entre candidats, employeurs et artisans via les m\u00e9canismes suivants :'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'Candidates can browse and apply to published job offers directly through the platform.'
                : 'Les candidats peuvent consulter et postuler aux offres d\u2019emploi publi\u00e9es directement via la plateforme.',
              isEn
                ? 'Employers can search the candidate database (CV library) to find suitable profiles for their needs.'
                : 'Les employeurs peuvent parcourir la base de donn\u00e9es de candidats (CVth\u00e8que) pour trouver les profils adapt\u00e9s \u00e0 leurs besoins.',
              isEn
                ? 'Direct communication between users is facilitated via WhatsApp integration. Users initiate contact by clicking the WhatsApp button on a profile or listing.'
                : 'La communication directe entre utilisateurs est facilit\u00e9e via l\u2019int\u00e9gration WhatsApp. Les utilisateurs initient le contact en cliquant sur le bouton WhatsApp d\u2019un profil ou d\u2019une annonce.',
              isEn
                ? 'All negotiations, agreements, terms of employment, pricing, and conditions of service are the sole responsibility of the users involved.'
                : 'Toutes les n\u00e9gociations, accords, termes d\u2019emploi, tarifications et conditions de service rel\u00e8vent de la seule responsabilit\u00e9 des utilisateurs concern\u00e9s.',
              isEn
                ? 'Bolo237 does not intervene in, mediate, or arbitrate any discussions or disputes between users.'
                : 'Bolo237 n\u2019intervient pas dans les discussions ou litiges entre utilisateurs et ne joue aucun r\u00f4le de m\u00e9diation ou d\u2019arbitrage.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      num: 10,
      title: isEn ? 'Moderation and Reports' : 'Mod\u00e9ration et Signalements',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Bolo237 is committed to maintaining a safe and trustworthy environment for all users:'
              : 'Bolo237 s\u2019engage \u00e0 maintenir un environnement s\u00fbr et digne de confiance pour tous les utilisateurs :'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'All content published on the platform is subject to review by our moderation team, both proactively and in response to user reports.'
                : 'Tout contenu publi\u00e9 sur la plateforme est soumis \u00e0 l\u2019examen de notre \u00e9quipe de mod\u00e9ration, de mani\u00e8re proactive et en r\u00e9ponse aux signalements des utilisateurs.',
              isEn
                ? 'Users can report suspicious profiles, fraudulent listings, or inappropriate behavior directly through the platform\u2019s reporting feature.'
                : 'Les utilisateurs peuvent signaler les profils suspects, les annonces frauduleuses ou les comportements inappropri\u00e9s directement via la fonctionnalit\u00e9 de signalement de la plateforme.',
              isEn
                ? 'Bolo237 employs automated fraud detection mechanisms to identify and flag potentially fraudulent activity.'
                : 'Bolo237 utilise des m\u00e9canismes automatis\u00e9s de d\u00e9tection de fraude pour identifier et signaler les activit\u00e9s potentiellement frauduleuses.',
              isEn
                ? 'Bolo237 reserves the right to suspend, restrict, or permanently delete any account or content that violates these terms, without prior notice or compensation.'
                : 'Bolo237 se r\u00e9serve le droit de suspendre, restreindre ou supprimer d\u00e9finitivement tout compte ou contenu enfreignant les pr\u00e9sentes conditions, sans pr\u00e9avis ni indemnisation.',
              isEn
                ? 'Decisions made by the moderation team are final and are not subject to appeal unless otherwise specified.'
                : 'Les d\u00e9cisions prises par l\u2019\u00e9quipe de mod\u00e9ration sont d\u00e9finitives et ne sont pas susceptibles de recours sauf disposition contraire.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      num: 11,
      title: isEn ? 'Intellectual Property' : 'Propri\u00e9t\u00e9 Intellectuelle',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'The Bolo237 brand name, logo, graphic design, source code, database structure, and all associated visual elements are the exclusive intellectual property of Samuel DJOMMOU THENGHO and are protected by applicable intellectual property laws. Any reproduction, distribution, or use without prior written authorization is strictly prohibited.'
              : 'Le nom de marque Bolo237, le logo, le design graphique, le code source, la structure de la base de donn\u00e9es et tous les \u00e9l\u00e9ments visuels associ\u00e9s sont la propri\u00e9t\u00e9 intellectuelle exclusive de Samuel DJOMMOU THENGHO et sont prot\u00e9g\u00e9s par les lois applicables en mati\u00e8re de propri\u00e9t\u00e9 intellectuelle. Toute reproduction, distribution ou utilisation sans autorisation \u00e9crite pr\u00e9alable est strictement interdite.'}
          </p>
          <p className="text-gray-700 leading-relaxed">
            {isEn
              ? 'Users retain full ownership of the content they publish on the platform (CVs, photos, descriptions, etc.). However, by publishing content on Bolo237, users grant the platform a non-exclusive, worldwide, royalty-free license to display, reproduce, and distribute said content solely for the purpose of operating the platform and its services.'
              : 'Les utilisateurs conservent l\u2019enti\u00e8re propri\u00e9t\u00e9 du contenu qu\u2019ils publient sur la plateforme (CV, photos, descriptions, etc.). Toutefois, en publiant du contenu sur Bolo237, les utilisateurs accordent \u00e0 la plateforme une licence non exclusive, mondiale et gratuite pour afficher, reproduire et distribuer ledit contenu uniquement aux fins d\u2019exploitation de la plateforme et de ses services.'}
          </p>
        </>
      ),
    },
    {
      num: 12,
      title: isEn ? 'Personal Data Protection' : 'Protection des Donn\u00e9es Personnelles',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'As the operating entity is registered in Germany, Bolo237 is subject to the European General Data Protection Regulation (GDPR). We take the protection of your personal data very seriously.'
              : 'L\u2019entit\u00e9 exploitante \u00e9tant enregistr\u00e9e en Allemagne, Bolo237 est soumise au R\u00e8glement G\u00e9n\u00e9ral europ\u00e9en sur la Protection des Donn\u00e9es (RGPD). Nous prenons la protection de vos donn\u00e9es personnelles tr\u00e8s au s\u00e9rieux.'}
          </p>
          <p className="text-gray-700 leading-relaxed mb-3 font-semibold">
            {isEn ? 'Data we collect:' : 'Donn\u00e9es que nous collectons :'}
          </p>
          <ul className="space-y-2 mb-4">
            {[
              isEn ? 'Full name, phone number, and email address' : 'Nom complet, num\u00e9ro de t\u00e9l\u00e9phone et adresse e-mail',
              isEn ? 'Profile information (profession, skills, location, photo)' : 'Informations de profil (profession, comp\u00e9tences, localisation, photo)',
              isEn ? 'Identity documents (for Identity Shield verification only)' : 'Documents d\u2019identit\u00e9 (uniquement pour la v\u00e9rification Identity Shield)',
              isEn ? 'Usage data and interaction logs for platform improvement' : 'Donn\u00e9es d\u2019utilisation et journaux d\u2019interaction pour l\u2019am\u00e9lioration de la plateforme',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-gray-700 leading-relaxed mb-3 font-semibold">
            {isEn ? 'Your rights:' : 'Vos droits :'}
          </p>
          <ul className="space-y-2 mb-4">
            {[
              isEn ? 'Right of access: you may request a copy of all personal data we hold about you.' : 'Droit d\u2019acc\u00e8s : vous pouvez demander une copie de toutes les donn\u00e9es personnelles que nous d\u00e9tenons \u00e0 votre sujet.',
              isEn ? 'Right of rectification: you may request correction of inaccurate or incomplete data.' : 'Droit de rectification : vous pouvez demander la correction de donn\u00e9es inexactes ou incompl\u00e8tes.',
              isEn ? 'Right of deletion: you may request the deletion of your personal data, subject to legal retention obligations.' : 'Droit de suppression : vous pouvez demander la suppression de vos donn\u00e9es personnelles, sous r\u00e9serve des obligations l\u00e9gales de conservation.',
              isEn ? 'Right to data portability: you may request your data in a structured, machine-readable format.' : 'Droit \u00e0 la portabilit\u00e9 : vous pouvez demander vos donn\u00e9es dans un format structur\u00e9 et lisible par machine.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-gray-700 leading-relaxed">
            {isEn
              ? 'Bolo237 will never sell, rent, or share your personal data with third parties for commercial purposes. Data is processed solely for the operation and improvement of the platform.'
              : 'Bolo237 ne vendra, ne louera et ne partagera jamais vos donn\u00e9es personnelles avec des tiers \u00e0 des fins commerciales. Les donn\u00e9es sont trait\u00e9es uniquement pour le fonctionnement et l\u2019am\u00e9lioration de la plateforme.'}
          </p>
        </>
      ),
    },
    {
      num: 13,
      title: isEn ? 'Limitation of Liability' : 'Limitation de Responsabilit\u00e9',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'While Bolo237 strives to provide a reliable and secure platform, the following limitations of liability apply:'
              : 'Bien que Bolo237 s\u2019efforce de fournir une plateforme fiable et s\u00e9curis\u00e9e, les limitations de responsabilit\u00e9 suivantes s\u2019appliquent :'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'Bolo237 is not responsible for the quality, safety, legality, or outcome of any service, employment, or transaction arranged between users.'
                : 'Bolo237 n\u2019est pas responsable de la qualit\u00e9, de la s\u00e9curit\u00e9, de la l\u00e9galit\u00e9 ou du r\u00e9sultat de tout service, emploi ou transaction convenu entre les utilisateurs.',
              isEn
                ? 'Bolo237 is not liable for any dispute, disagreement, or conflict arising between users, whether related to employment terms, service quality, or payment.'
                : 'Bolo237 n\u2019est pas responsable des litiges, d\u00e9saccords ou conflits survenant entre utilisateurs, qu\u2019ils soient li\u00e9s aux conditions d\u2019emploi, \u00e0 la qualit\u00e9 des services ou au paiement.',
              isEn
                ? 'Bolo237 is not responsible for missed opportunities, including applications that were not viewed, responses that were not received, or listings that expired.'
                : 'Bolo237 n\u2019est pas responsable des opportunit\u00e9s manqu\u00e9es, y compris les candidatures non consult\u00e9es, les r\u00e9ponses non re\u00e7ues ou les annonces expir\u00e9es.',
              isEn
                ? 'Bolo237 is not responsible for any issues related to WhatsApp communication, including message delivery failures, blocked numbers, or unavailable contacts.'
                : 'Bolo237 n\u2019est pas responsable des probl\u00e8mes li\u00e9s \u00e0 la communication WhatsApp, y compris les \u00e9checs de livraison de messages, les num\u00e9ros bloqu\u00e9s ou les contacts indisponibles.',
              isEn
                ? 'Bolo237 is not responsible for temporary or permanent service interruptions caused by network issues, server maintenance, or force majeure events.'
                : 'Bolo237 n\u2019est pas responsable des interruptions de service temporaires ou permanentes caus\u00e9es par des probl\u00e8mes r\u00e9seau, la maintenance des serveurs ou des \u00e9v\u00e9nements de force majeure.',
              isEn
                ? 'Users use the platform and engage with other users entirely at their own risk and discretion.'
                : 'Les utilisateurs utilisent la plateforme et interagissent avec d\u2019autres utilisateurs enti\u00e8rement \u00e0 leurs propres risques et discr\u00e9tion.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      num: 14,
      title: isEn ? 'Suspension and Termination' : 'Suspension et R\u00e9siliation',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Bolo237 reserves the right to manage user accounts as follows:'
              : 'Bolo237 se r\u00e9serve le droit de g\u00e9rer les comptes utilisateurs comme suit :'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'Bolo237 may suspend or permanently terminate any user account that violates these Terms of Use, without prior notice or compensation.'
                : 'Bolo237 peut suspendre ou r\u00e9silier d\u00e9finitivement tout compte utilisateur qui enfreint les pr\u00e9sentes Conditions G\u00e9n\u00e9rales d\u2019Utilisation, sans pr\u00e9avis ni indemnisation.',
              isEn
                ? 'Grounds for suspension include, but are not limited to: fraud, identity theft, harassment, posting illegal content, creating multiple accounts, or any behavior deemed harmful to the platform community.'
                : 'Les motifs de suspension incluent, sans s\u2019y limiter : la fraude, l\u2019usurpation d\u2019identit\u00e9, le harc\u00e8lement, la publication de contenu ill\u00e9gal, la cr\u00e9ation de comptes multiples ou tout comportement jug\u00e9 nuisible \u00e0 la communaut\u00e9 de la plateforme.',
              isEn
                ? 'Users may delete their own account at any time through the platform settings. Account deletion is permanent and irreversible.'
                : 'Les utilisateurs peuvent supprimer leur propre compte \u00e0 tout moment via les param\u00e8tres de la plateforme. La suppression du compte est d\u00e9finitive et irr\u00e9versible.',
              isEn
                ? 'Upon account deletion or termination, Bolo237 may retain certain data for a reasonable period as required by law or for legitimate business purposes (e.g., fraud prevention), after which it will be permanently deleted.'
                : 'Apr\u00e8s la suppression ou la r\u00e9siliation du compte, Bolo237 peut conserver certaines donn\u00e9es pendant une p\u00e9riode raisonnable conform\u00e9ment \u00e0 la loi ou pour des raisons commerciales l\u00e9gitimes (par ex. pr\u00e9vention de la fraude), apr\u00e8s quoi elles seront d\u00e9finitivement supprim\u00e9es.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      num: 15,
      title: isEn ? 'Modifications to the Terms' : 'Modifications des CGU',
      content: (
        <p className="text-gray-700 leading-relaxed">
          {isEn
            ? 'Bolo237 reserves the right to modify these Terms of Use at any time to reflect changes in the law, platform features, or business practices. Users will be notified of significant changes via the platform or by email. The updated terms will indicate the new effective date. Continued use of the platform after the publication of modified terms constitutes acceptance of those changes. Users who do not agree with the updated terms must cease using the platform and delete their account.'
            : 'Bolo237 se r\u00e9serve le droit de modifier les pr\u00e9sentes Conditions G\u00e9n\u00e9rales d\u2019Utilisation \u00e0 tout moment pour refl\u00e9ter les \u00e9volutions l\u00e9gislatives, les fonctionnalit\u00e9s de la plateforme ou les pratiques commerciales. Les utilisateurs seront inform\u00e9s des modifications significatives via la plateforme ou par e-mail. Les conditions mises \u00e0 jour indiqueront la nouvelle date d\u2019entr\u00e9e en vigueur. L\u2019utilisation continue de la plateforme apr\u00e8s la publication des conditions modifi\u00e9es vaut acceptation de ces modifications. Les utilisateurs qui n\u2019acceptent pas les conditions mises \u00e0 jour doivent cesser d\u2019utiliser la plateforme et supprimer leur compte.'}
        </p>
      ),
    },
    {
      num: 16,
      title: isEn ? 'Applicable Law and Disputes' : 'Droit Applicable et Litiges',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'These Terms of Use are governed by and construed in accordance with the laws of the Federal Republic of Germany, where the operating entity is registered.'
              : 'Les pr\u00e9sentes Conditions G\u00e9n\u00e9rales d\u2019Utilisation sont r\u00e9gies et interpr\u00e9t\u00e9es conform\u00e9ment aux lois de la R\u00e9publique f\u00e9d\u00e9rale d\u2019Allemagne, o\u00f9 l\u2019entit\u00e9 exploitante est enregistr\u00e9e.'}
          </p>
          <p className="text-gray-700 leading-relaxed">
            {isEn
              ? 'In the event of a dispute arising from or in connection with the use of the platform, the parties agree to first attempt to resolve the matter amicably through direct communication. If no amicable resolution is reached within thirty (30) days, the dispute shall be submitted to the competent courts of Germany.'
              : 'En cas de litige d\u00e9coulant de ou li\u00e9 \u00e0 l\u2019utilisation de la plateforme, les parties conviennent de tenter d\u2019abord de r\u00e9soudre le diff\u00e9rend \u00e0 l\u2019amiable par communication directe. Si aucune r\u00e9solution amiable n\u2019est atteinte dans un d\u00e9lai de trente (30) jours, le litige sera soumis aux tribunaux comp\u00e9tents d\u2019Allemagne.'}
          </p>
        </>
      ),
    },
    {
      num: 17,
      title: 'Contact',
      content: (
        <p className="text-gray-700 leading-relaxed">
          {isEn
            ? 'For any questions, concerns, or requests related to these Terms of Use, you may contact us through the following channels:'
            : 'Pour toute question, pr\u00e9occupation ou demande relative aux pr\u00e9sentes Conditions G\u00e9n\u00e9rales d\u2019Utilisation, vous pouvez nous contacter via les canaux suivants :'}
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: { fr: 'Accueil', en: 'Home' }, path: '/' },
          { name: { fr: 'Conditions', en: 'Terms' }, path: '/conditions' },
        ]}
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-gray-800 to-gray-900 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
              {isEn ? 'Terms of Use' : 'Conditions G\u00e9n\u00e9rales d\u2019Utilisation (CGU)'}
            </h1>
            <p className="text-gray-300 text-lg">
              {isEn ? 'Last updated: March 2026' : 'Derni\u00e8re mise \u00e0 jour : Mars 2026'}
            </p>
          </div>
        </section>

        {/* Sections */}
        <section className="max-w-3xl mx-auto px-4 py-12 space-y-10">
          {sections.map((s) => (
            <div key={s.num}>
              <h2 className="text-xl font-extrabold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-[#FEEBD6] text-[#C4623F] rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {s.num}
                </span>
                {s.title}
              </h2>
              {s.content}
            </div>
          ))}

          {/* Contact Box */}
          <div className="bg-[#FFF5EF] border border-[#E8C4B0] rounded-xl p-8 text-center space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              {isEn ? 'Get in Touch' : 'Nous Contacter'}
            </h3>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-semibold">Email : </span>
                <a href="mailto:contact@bolo237.com" className="text-[#C4623F] font-bold hover:underline">
                  contact@bolo237.com
                </a>
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">WhatsApp : </span>
                <a href="https://wa.me/4915510217788" className="text-[#C4623F] font-bold hover:underline">
                  +49 155 1021 7788
                </a>
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              {isEn
                ? 'Bolo237 \u2014 Operated by Samuel DJOMMOU THENGHO \u2014 Germany'
                : 'Bolo237 \u2014 Exploit\u00e9 par Samuel DJOMMOU THENGHO \u2014 Allemagne'}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
