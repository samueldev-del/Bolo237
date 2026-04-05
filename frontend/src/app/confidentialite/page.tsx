"use client";

import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PrivacyRightsPanel from '@/components/PrivacyRightsPanel';
import { useLocale } from '@/components/LocaleProvider';

export default function ConfidentialitePage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const sections = [
    {
      num: 1,
      title: isEn ? 'Introduction' : 'Introduction',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Bolo237 is a digital platform operated by Samuel DJOMMOU THENGHO, a sole proprietor registered in Germany. This Privacy Policy describes how Bolo237 collects, uses, stores, and protects your personal data when you use our platform.'
              : 'Bolo237 est une plateforme num\u00e9rique exploit\u00e9e par Samuel DJOMMOU THENGHO, entrepreneur individuel enregistr\u00e9 en Allemagne. La pr\u00e9sente Politique de Confidentialit\u00e9 d\u00e9crit comment Bolo237 collecte, utilise, conserve et prot\u00e8ge vos donn\u00e9es personnelles lorsque vous utilisez notre plateforme.'}
          </p>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Samuel DJOMMOU THENGHO acts as the data controller for all personal data processed through the Bolo237 platform.'
              : 'Samuel DJOMMOU THENGHO agit en qualit\u00e9 de responsable du traitement pour l\u2019ensemble des donn\u00e9es personnelles trait\u00e9es via la plateforme Bolo237.'}
          </p>
          <p className="text-gray-700 leading-relaxed">
            {isEn
              ? 'This policy is established in accordance with Cameroonian Law No. 2024/017 of December 23, 2024 on the protection of personal data, as well as the European General Data Protection Regulation (GDPR) applicable to the operating entity.'
              : 'Cette politique est \u00e9tablie conform\u00e9ment \u00e0 la Loi camerounaise n\u00b02024/017 du 23 d\u00e9cembre 2024 relative \u00e0 la protection des donn\u00e9es \u00e0 caract\u00e8re personnel, ainsi qu\u2019au R\u00e8glement G\u00e9n\u00e9ral europ\u00e9en sur la Protection des Donn\u00e9es (RGPD) applicable \u00e0 l\u2019entit\u00e9 exploitante.'}
          </p>
        </>
      ),
    },
    {
      num: 2,
      title: isEn ? 'Data Collected' : 'Donn\u00e9es Collect\u00e9es',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3 font-semibold">
            {isEn ? 'Registration data:' : 'Donn\u00e9es d\u2019inscription :'}
          </p>
          <ul className="space-y-2 mb-4">
            {[
              isEn ? 'Last name, first name, phone number, city' : 'Nom, pr\u00e9nom, num\u00e9ro de t\u00e9l\u00e9phone, ville',
              isEn ? 'Account type (Candidate, Employer, or Artisan)' : 'Type de compte (Candidat, Entreprise ou Artisan)',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-gray-700 leading-relaxed mb-3 font-semibold">
            {isEn ? 'Profile data:' : 'Donn\u00e9es de profil :'}
          </p>
          <ul className="space-y-2 mb-4">
            {[
              isEn ? 'CV, photo, skills, professional experience' : 'CV, photo, comp\u00e9tences, exp\u00e9rience professionnelle',
              isEn ? 'Description of services offered (for artisans)' : 'Description des services propos\u00e9s (pour les artisans)',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-gray-700 leading-relaxed mb-3 font-semibold">
            {isEn ? 'KYC data (Identity Shield):' : 'Donn\u00e9es KYC (Identity Shield) :'}
          </p>
          <ul className="space-y-2 mb-4">
            {[
              isEn
                ? 'Identity document (national ID card or passport) submitted for identity verification'
                : 'Pi\u00e8ce d\u2019identit\u00e9 (carte nationale d\u2019identit\u00e9 ou passeport) soumise pour la v\u00e9rification d\u2019identit\u00e9',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-gray-700 leading-relaxed mb-3 font-semibold">
            {isEn ? 'Browsing data:' : 'Donn\u00e9es de navigation :'}
          </p>
          <ul className="space-y-2 mb-4">
            {[
              isEn ? 'IP address, browser type, pages visited' : 'Adresse IP, type de navigateur, pages visit\u00e9es',
              isEn ? 'Cookies and similar tracking technologies' : 'Cookies et technologies de suivi similaires',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-gray-700 leading-relaxed mb-3 font-semibold">
            {isEn ? 'Geolocation data:' : 'Donn\u00e9es de g\u00e9olocalisation :'}
          </p>
          <ul className="space-y-2">
            {[
              isEn
                ? 'City and neighborhood (entered manually by the user, no automatic GPS tracking)'
                : 'Ville et quartier (saisis manuellement par l\u2019utilisateur, pas de g\u00e9olocalisation GPS automatique)',
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
      num: 3,
      title: isEn ? 'Purpose of Processing' : 'Finalit\u00e9s du Traitement',
      content: (
        <ul className="space-y-3">
          {[
            isEn
              ? 'Matching candidates, employers, and artisans on the platform'
              : 'Mise en relation entre candidats, employeurs et artisans',
            isEn
              ? 'Managing user accounts and profiles'
              : 'Gestion des comptes utilisateurs et des profils',
            isEn
              ? 'Identity verification (KYC / Identity Shield)'
              : 'V\u00e9rification d\u2019identit\u00e9 (KYC / Identity Shield)',
            isEn
              ? 'Platform improvement and anonymized statistics'
              : 'Am\u00e9lioration de la plateforme et statistiques anonymis\u00e9es',
            isEn
              ? 'Communication with users (notifications, support)'
              : 'Communication avec les utilisateurs (notifications, support)',
            isEn
              ? 'Fraud prevention and platform security'
              : 'Pr\u00e9vention de la fraude et s\u00e9curit\u00e9 de la plateforme',
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-700">
              <span className="text-[#DA7756] mt-1">&#10003;</span>
              {text}
            </li>
          ))}
        </ul>
      ),
    },
    {
      num: 4,
      title: isEn ? 'Legal Basis' : 'Base Juridique',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'The processing of your personal data is based on the following legal grounds, in accordance with Article 6 of Law No. 2024/017:'
              : 'Le traitement de vos donn\u00e9es personnelles repose sur les bases juridiques suivantes, conform\u00e9ment \u00e0 l\u2019article 6 de la Loi n\u00b02024/017 :'}
          </p>
          <ul className="space-y-3">
            {[
              {
                term: isEn ? 'User consent' : 'Consentement de l\u2019utilisateur',
                def: isEn
                  ? 'You consent to the processing of your data when you create an account and accept this policy (Art. 6, Law 2024/017).'
                  : 'Vous consentez au traitement de vos donn\u00e9es en cr\u00e9ant un compte et en acceptant cette politique (Art. 6, Loi 2024/017).',
              },
              {
                term: isEn ? 'Contract performance' : 'Ex\u00e9cution du contrat',
                def: isEn
                  ? 'Processing is necessary for the performance of our Terms of Use (CGU) to which you are a party.'
                  : 'Le traitement est n\u00e9cessaire \u00e0 l\u2019ex\u00e9cution des Conditions G\u00e9n\u00e9rales d\u2019Utilisation (CGU) auxquelles vous \u00eates partie.',
              },
              {
                term: isEn ? 'Legitimate interest' : 'Int\u00e9r\u00eat l\u00e9gitime',
                def: isEn
                  ? 'Ensuring platform security and preventing fraud.'
                  : 'Assurer la s\u00e9curit\u00e9 de la plateforme et pr\u00e9venir la fraude.',
              },
              {
                term: isEn ? 'Legal obligation' : 'Obligation l\u00e9gale',
                def: isEn
                  ? 'Certain data is retained to comply with applicable legal requirements.'
                  : 'Certaines donn\u00e9es sont conserv\u00e9es pour se conformer aux exigences l\u00e9gales applicables.',
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
        </>
      ),
    },
    {
      num: 5,
      title: isEn ? 'Data Retention' : 'Dur\u00e9e de Conservation',
      content: (
        <ul className="space-y-3">
          {[
            {
              term: isEn ? 'Account data' : 'Donn\u00e9es de compte',
              def: isEn
                ? 'Retained for the duration of the active account + 1 year after deletion.'
                : 'Conserv\u00e9es pendant la dur\u00e9e d\u2019activit\u00e9 du compte + 1 an apr\u00e8s suppression.',
            },
            {
              term: isEn ? 'KYC data' : 'Donn\u00e9es KYC',
              def: isEn
                ? 'Retained for 5 years in compliance with legal obligations.'
                : 'Conserv\u00e9es 5 ans conform\u00e9ment aux obligations l\u00e9gales.',
            },
            {
              term: isEn ? 'Browsing data / Cookies' : 'Donn\u00e9es de navigation / Cookies',
              def: isEn
                ? 'Maximum 13 months.'
                : '13 mois maximum.',
            },
            {
              term: isEn ? 'Report data' : 'Donn\u00e9es de signalement',
              def: isEn
                ? 'Retained for 3 years.'
                : 'Conserv\u00e9es 3 ans.',
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
      num: 6,
      title: isEn ? 'User Rights' : 'Droits des Utilisateurs',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'In accordance with Law No. 2024/017 on personal data protection, you have the following rights regarding your personal data:'
              : 'Conform\u00e9ment \u00e0 la Loi n\u00b02024/017 relative \u00e0 la protection des donn\u00e9es personnelles, vous disposez des droits suivants concernant vos donn\u00e9es personnelles :'}
          </p>
          <ul className="space-y-3 mb-4">
            {[
              {
                term: isEn ? 'Right of access' : 'Droit d\u2019acc\u00e8s',
                def: isEn
                  ? 'You may request a copy of all personal data we hold about you.'
                  : 'Vous pouvez demander une copie de toutes les donn\u00e9es personnelles que nous d\u00e9tenons \u00e0 votre sujet.',
              },
              {
                term: isEn ? 'Right of rectification' : 'Droit de rectification',
                def: isEn
                  ? 'You may request correction of inaccurate or incomplete data.'
                  : 'Vous pouvez demander la correction de donn\u00e9es inexactes ou incompl\u00e8tes.',
              },
              {
                term: isEn ? 'Right of deletion' : 'Droit de suppression',
                def: isEn
                  ? 'You may request the deletion of your personal data, subject to legal retention obligations.'
                  : 'Vous pouvez demander la suppression de vos donn\u00e9es personnelles, sous r\u00e9serve des obligations l\u00e9gales de conservation.',
              },
              {
                term: isEn ? 'Right to object' : 'Droit d\u2019opposition',
                def: isEn
                  ? 'You may object to the processing of your data for legitimate reasons.'
                  : 'Vous pouvez vous opposer au traitement de vos donn\u00e9es pour des motifs l\u00e9gitimes.',
              },
              {
                term: isEn ? 'Right to data portability' : 'Droit \u00e0 la portabilit\u00e9',
                def: isEn
                  ? 'You may request your data in a structured, machine-readable format.'
                  : 'Vous pouvez demander vos donn\u00e9es dans un format structur\u00e9 et lisible par machine.',
              },
              {
                term: isEn ? 'Right to withdraw consent' : 'Droit de retirer son consentement',
                def: isEn
                  ? 'You may withdraw your consent at any time, without affecting the lawfulness of processing carried out before withdrawal.'
                  : 'Vous pouvez retirer votre consentement \u00e0 tout moment, sans que cela n\u2019affecte la lic\u00e9it\u00e9 du traitement effectu\u00e9 avant le retrait.',
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
          <p className="text-gray-700 leading-relaxed">
            {isEn
              ? 'To exercise any of these rights, please contact us by email at: '
              : 'Pour exercer l\u2019un de ces droits, veuillez nous contacter par e-mail \u00e0 : '}
            <a href="mailto:contact@bolo237.com" className="text-[#C4623F] font-bold hover:underline">
              contact@bolo237.com
            </a>
          </p>
        </>
      ),
    },
    {
      num: 7,
      title: isEn ? 'Data Sharing' : 'Partage des Donn\u00e9es',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Bolo237 does not sell your personal data to third parties. However, your data may be shared in the following circumstances:'
              : 'Bolo237 ne vend pas vos donn\u00e9es personnelles \u00e0 des tiers. Toutefois, vos donn\u00e9es peuvent \u00eatre partag\u00e9es dans les cas suivants :'}
          </p>
          <ul className="space-y-3">
            {[
              {
                term: isEn ? 'Public profiles' : 'Profils publics',
                def: isEn
                  ? 'Profile information you publish is visible to other users of the platform according to their role (employer, candidate, artisan).'
                  : 'Les informations de profil que vous publiez sont visibles par les autres utilisateurs de la plateforme selon leur r\u00f4le (employeur, candidat, artisan).',
              },
              {
                term: isEn ? 'Technical subcontractors' : 'Sous-traitants techniques',
                def: isEn
                  ? 'Vercel (hosting), SMS sending services (OTP verification). These providers process data solely on our behalf and under our instructions.'
                  : 'Vercel (h\u00e9bergement), services d\u2019envoi de SMS (v\u00e9rification OTP). Ces prestataires traitent les donn\u00e9es uniquement pour notre compte et selon nos instructions.',
              },
              {
                term: isEn ? 'Transfers outside Cameroon' : 'Transfert hors Cameroun',
                def: isEn
                  ? 'Data is hosted on Vercel servers (USA/Europe). Adequate protection guarantees are in place in compliance with applicable regulations.'
                  : 'Les donn\u00e9es sont h\u00e9berg\u00e9es sur des serveurs Vercel (USA/Europe). Des garanties de protection ad\u00e9quates sont mises en place conform\u00e9ment aux r\u00e9glementations applicables.',
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
        </>
      ),
    },
    {
      num: 8,
      title: isEn ? 'Data Security' : 'S\u00e9curit\u00e9 des Donn\u00e9es',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Bolo237 implements appropriate technical and organizational measures to protect your personal data against unauthorized access, loss, alteration, or disclosure:'
              : 'Bolo237 met en \u0153uvre des mesures techniques et organisationnelles appropri\u00e9es pour prot\u00e9ger vos donn\u00e9es personnelles contre tout acc\u00e8s non autoris\u00e9, perte, alt\u00e9ration ou divulgation :'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'HTTPS/TLS encryption for all data transmitted between your device and our servers'
                : 'Chiffrement HTTPS/TLS pour toutes les donn\u00e9es transmises entre votre appareil et nos serveurs',
              isEn
                ? 'OTP authentication for secure account access'
                : 'Authentification OTP pour un acc\u00e8s s\u00e9curis\u00e9 au compte',
              isEn
                ? 'Restricted access to personal data (limited to authorized personnel only)'
                : 'Acc\u00e8s restreint aux donn\u00e9es personnelles (limit\u00e9 au personnel autoris\u00e9 uniquement)',
              isEn
                ? 'Regular backups to prevent data loss'
                : 'Sauvegardes r\u00e9guli\u00e8res pour pr\u00e9venir la perte de donn\u00e9es',
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
      title: 'Cookies',
      content: (
        <p className="text-gray-700 leading-relaxed">
          {isEn
            ? 'Bolo237 uses cookies and similar technologies to ensure the proper functioning of the platform, analyze usage, and improve your experience. For detailed information about the cookies we use and how to manage your preferences, please refer to our '
            : 'Bolo237 utilise des cookies et des technologies similaires pour assurer le bon fonctionnement de la plateforme, analyser l\u2019utilisation et am\u00e9liorer votre exp\u00e9rience. Pour des informations d\u00e9taill\u00e9es sur les cookies que nous utilisons et la gestion de vos pr\u00e9f\u00e9rences, veuillez consulter notre '}
          <a href="/cookies" className="text-[#C4623F] font-bold hover:underline">
            {isEn ? 'Cookie Policy' : 'Politique de Cookies'}
          </a>
          .
        </p>
      ),
    },
    {
      num: 10,
      title: isEn ? 'Policy Changes' : 'Modifications de la Politique',
      content: (
        <p className="text-gray-700 leading-relaxed">
          {isEn
            ? 'Bolo237 reserves the right to modify this Privacy Policy at any time to reflect changes in the law, platform features, or data processing practices. Users will be notified of significant changes via the platform or by email. The updated policy will indicate the new effective date. Continued use of the platform after the publication of the modified policy constitutes acceptance of those changes.'
            : 'Bolo237 se r\u00e9serve le droit de modifier la pr\u00e9sente Politique de Confidentialit\u00e9 \u00e0 tout moment pour refl\u00e9ter les \u00e9volutions l\u00e9gislatives, les fonctionnalit\u00e9s de la plateforme ou les pratiques de traitement des donn\u00e9es. Les utilisateurs seront inform\u00e9s des modifications significatives via la plateforme ou par e-mail. La politique mise \u00e0 jour indiquera la nouvelle date d\u2019entr\u00e9e en vigueur. L\u2019utilisation continue de la plateforme apr\u00e8s la publication de la politique modifi\u00e9e vaut acceptation de ces modifications.'}
        </p>
      ),
    },
    {
      num: 11,
      title: isEn ? 'Contact / Supervisory Authority' : 'Contact / Autorit\u00e9 de Contr\u00f4le',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'For any questions or requests regarding this Privacy Policy or the processing of your personal data, you may contact us at: '
              : 'Pour toute question ou demande relative \u00e0 la pr\u00e9sente Politique de Confidentialit\u00e9 ou au traitement de vos donn\u00e9es personnelles, vous pouvez nous contacter \u00e0 : '}
            <a href="mailto:contact@bolo237.com" className="text-[#C4623F] font-bold hover:underline">
              contact@bolo237.com
            </a>
          </p>
          <p className="text-gray-700 leading-relaxed">
            {isEn
              ? 'If your complaint is not resolved satisfactorily, you have the right to lodge a complaint with the national data protection authority of Cameroon (Autorit\u00e9 nationale de protection des donn\u00e9es personnelles du Cameroun).'
              : 'Si votre r\u00e9clamation n\u2019est pas r\u00e9solue de mani\u00e8re satisfaisante, vous avez le droit de saisir l\u2019autorit\u00e9 nationale de protection des donn\u00e9es personnelles du Cameroun.'}
          </p>
        </>
      ),
    },
    {
      num: 12,
      title: isEn ? 'Effective Date' : 'Date d\u2019Entr\u00e9e en Vigueur',
      content: (
        <p className="text-gray-700 leading-relaxed">
          {isEn
            ? 'This Privacy Policy takes effect on April 4, 2026.'
            : 'La pr\u00e9sente Politique de Confidentialit\u00e9 entre en vigueur le 4 avril 2026.'}
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: { fr: 'Accueil', en: 'Home' }, path: '/' },
          { name: { fr: 'Confidentialit\u00e9', en: 'Privacy' }, path: '/confidentialite' },
        ]}
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-gray-800 to-gray-900 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
              {isEn ? 'Privacy Policy' : 'Politique de Confidentialit\u00e9'}
            </h1>
            <p className="text-gray-300 text-lg">
              {isEn ? 'Effective date: April 4, 2026' : 'Date d\u2019entr\u00e9e en vigueur : 4 avril 2026'}
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

          <PrivacyRightsPanel />

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
                <a href="https://wa.me/4915124862693" className="text-[#C4623F] font-bold hover:underline">
                  +49 151 24862693
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
