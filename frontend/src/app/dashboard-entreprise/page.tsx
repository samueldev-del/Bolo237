"use client";

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { canPublishUnlimited, containsBlockedKeyword, getModerationStatusForFirstPublications, getOtpDemoCode } from '@/lib/trustShield';

export default function DashboardEntreprise() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [niu, setNiu] = useState('');
  const [rccm, setRccm] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [publishMessage, setPublishMessage] = useState('');
  const [jobsPublishedCount, setJobsPublishedCount] = useState(0);

  const isRecruiterVerified = niu.trim().length > 4 || rccm.trim().length > 4;

  const sendOtp = () => {
    if (!phone.trim()) {
      setPublishMessage(isEn ? 'Enter a valid phone number before sending OTP.' : 'Saisissez un numero de telephone valide avant l envoi OTP.');
      return;
    }
    const code = getOtpDemoCode();
    setOtpCode(code);
    setOtpSent(true);
    setOtpVerified(false);
    setPublishMessage('');
  };

  const verifyOtp = () => {
    if (otpInput.trim() === otpCode) {
      setOtpVerified(true);
      setPublishMessage(isEn ? 'Phone verified successfully.' : 'Numero de telephone verifie avec succes.');
      return;
    }
    setOtpVerified(false);
    setPublishMessage(isEn ? 'Invalid OTP code.' : 'Code OTP invalide.');
  };

  const publishJob = () => {
    const blocked = containsBlockedKeyword(`${jobTitle} ${jobDescription}`);
    if (!otpVerified) {
      setPublishMessage(isEn ? 'OTP phone verification is mandatory for publication.' : 'La verification OTP du numero est obligatoire pour publier.');
      return;
    }
    if (!jobTitle.trim() || !jobDescription.trim()) {
      setPublishMessage(isEn ? 'Fill in title and description first.' : 'Renseignez d abord le titre et la description.');
      return;
    }
    if (blocked) {
      setPublishMessage(`${isEn ? 'Blocked by anti-fraud filter keyword:' : 'Bloque par le filtre anti-fraude, mot-cle:'} "${blocked}"`);
      return;
    }
    if (jobsPublishedCount >= 3 && !canPublishUnlimited(isRecruiterVerified)) {
      setPublishMessage(
        isEn
          ? 'Unlimited publications are locked. Add NIU or RCCM to get the Verified Recruiter badge.'
          : 'La publication illimitee est bloquee. Ajoutez le NIU ou le RCCM pour obtenir le badge Recruteur Verifie.'
      );
      return;
    }

    const nextCount = jobsPublishedCount + 1;
    const moderationStatus = getModerationStatusForFirstPublications(jobsPublishedCount);
    setJobsPublishedCount(nextCount);
    setPublishMessage(
      moderationStatus === 'en-attente'
        ? isEn
          ? `Published in moderation queue (${nextCount}/3). Status: Pending review by admin.`
          : `Publication placee en quarantaine (${nextCount}/3). Statut: En attente de validation admin.`
        : isEn
          ? 'Publication accepted and online.'
          : 'Publication acceptee et mise en ligne.'
    );
    setJobTitle('');
    setJobDescription('');
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans text-black flex flex-col">
      
      {/* 1. HEADER SPÉCIFIQUE ENTREPRISE */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 h-16 flex items-center px-4 md:px-8">
        <div className="w-full max-w-[1400px] mx-auto flex justify-between items-center">
          
          <Link href={localizePath('/')} className="text-xl font-extrabold text-black tracking-tight flex items-center gap-1.5">
            <div className="w-6 h-6 bg-green-600 rounded-sm"></div>
            237jobs <span className="text-sm font-medium text-gray-400 ml-2 hidden md:inline">| {isEn ? 'Recruiter Space' : 'Espace Recruteur'}</span>
          </Link>
          
          <div className="flex items-center gap-6 font-bold text-[14px] text-gray-700 hidden md:flex">
            
            {/* Menu: Mes Offres */}
            <div className="relative h-16 flex items-center" onMouseEnter={() => setActiveMenu('offres')} onMouseLeave={() => setActiveMenu(null)}>
              <button className={`hover:text-green-600 transition ${activeMenu === 'offres' ? 'text-green-600' : ''}`}>{isEn ? 'My Jobs' : 'Mes Offres'}</button>
              {activeMenu === 'offres' && (
                <div className="absolute top-[50px] left-1/2 -translate-x-1/2 w-56 bg-white border border-gray-200 shadow-xl rounded-xl py-2 z-50 flex flex-col">
                  {/* On change le lien par un bouton qui active le formulaire */}
                  <button 
                    onClick={() => { setShowForm(true); setActiveMenu(null); }}
                    className="px-5 py-2 hover:bg-green-50 hover:text-green-700 transition font-medium text-[14px] text-left"
                  >
                    {isEn ? 'Post a job' : 'Publier une offre'}
                  </button>
                  <button 
                    onClick={() => { setShowForm(false); setActiveMenu(null); }}
                    className="px-5 py-2 hover:bg-green-50 hover:text-green-700 transition font-medium text-[14px] text-left"
                  >
                    {isEn ? 'Manage my listings' : 'Gérer mes annonces'}
                  </button>
                  <Link href="#" className="px-5 py-2 hover:bg-green-50 hover:text-green-700 transition font-medium text-[14px]">{isEn ? 'Archive' : 'Archives'}</Link>
                </div>
              )}
            </div>

            {/* Menu: Candidatures */}
            <div className="relative h-16 flex items-center" onMouseEnter={() => setActiveMenu('candidats')} onMouseLeave={() => setActiveMenu(null)}>
              <button className={`hover:text-green-600 transition ${activeMenu === 'candidats' ? 'text-green-600' : ''}`}>{isEn ? 'Applications' : 'Candidatures'}</button>
              {activeMenu === 'candidats' && (
                <div className="absolute top-[50px] left-1/2 -translate-x-1/2 w-56 bg-white border border-gray-200 shadow-xl rounded-xl py-2 z-50 flex flex-col">
                  <Link href="#" className="px-5 py-2 hover:bg-green-50 hover:text-green-700 transition font-medium text-[14px]">{isEn ? 'New profiles' : 'Nouveaux profils'}</Link>
                  <Link href="#" className="px-5 py-2 hover:bg-green-50 hover:text-green-700 transition font-medium text-[14px]">{isEn ? 'Planned interviews' : 'Entretiens prévus'}</Link>
                  <Link href="#" className="px-5 py-2 hover:bg-green-50 hover:text-green-700 transition font-medium text-[14px]">CVthèque</Link>
                </div>
              )}
            </div>

            {/* Menu: Mon compte */}
            <div className="relative h-16 flex items-center" onMouseEnter={() => setActiveMenu('compte')} onMouseLeave={() => setActiveMenu(null)}>
              <button className={`flex items-center gap-2 transition ${activeMenu === 'compte' ? 'text-green-600' : 'hover:text-green-600'}`}>
                <span className={`w-8 h-8 rounded flex items-center justify-center font-extrabold text-xs transition ${activeMenu === 'compte' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>HQ</span>
                {isEn ? 'My account' : 'Mon compte'}
              </button>
              {activeMenu === 'compte' && (
                <div className="absolute top-[50px] right-0 w-56 bg-white border border-gray-200 shadow-xl rounded-xl py-2 z-50 flex flex-col">
                  <Link href="#" className="px-5 py-2 hover:bg-green-50 hover:text-green-700 transition font-medium text-[14px]">{isEn ? 'Company profile' : 'Profil Entreprise'}</Link>
                  <Link href="#" className="px-5 py-2 hover:bg-green-50 hover:text-green-700 transition font-medium text-[14px]">{isEn ? 'Billing & Credits' : 'Facturation & Crédits'}</Link>
                  <Link href={localizePath('/')} className="px-5 py-2 hover:bg-red-50 hover:text-red-600 transition font-medium text-[14px] mt-2 border-t border-gray-100 pt-3">{isEn ? 'Logout' : 'Déconnexion'}</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 2. CORPS DU DASHBOARD */}
      <main className="max-w-[1200px] mx-auto w-full mt-10 px-4 flex flex-col md:flex-row gap-8 mb-16 flex-grow">
        {/* COLONNE GAUCHE (Infos Entreprise - Version Gratuite Lancement) */}
        <aside className="w-full md:w-[320px] shrink-0 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-center">
            <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-gray-400">LOGO</div>
            <h2 className="text-xl font-extrabold text-black">MTN Cameroun</h2>
            <p className="text-sm text-gray-500 font-medium mb-4">Télécommunications</p>
            <div className={`inline-flex items-center gap-2 text-[11px] font-bold px-3 py-1 rounded-full border uppercase ${isRecruiterVerified ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {isRecruiterVerified ? '✓ Recruteur Verifie' : '⚠ Recruteur Non Verifie'}
            </div>
            
            {/* MESSAGE DE GRATUITÉ (Offre de lancement) */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-left">
              <div className="bg-green-600 text-white p-4 rounded-xl shadow-sm">
                <p className="text-[12px] font-bold uppercase tracking-wider mb-1">{isEn ? 'Launch offer' : 'Offre de lancement'}</p>
                <p className="text-[14px] font-medium leading-snug">
                  {isEn
                    ? <>Enjoy the platform <span className="font-extrabold">100% free</span> during this launch phase.</>
                    : <>Profitez de la plateforme <span className="font-extrabold">100% gratuitement</span> pendant cette phase de lancement.</>}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 text-left space-y-3">
              <h3 className="text-xs uppercase tracking-wide text-gray-500 font-extrabold">Bouclier identite</h3>
              <p className="text-xs text-gray-600 font-medium">
                {isEn
                  ? 'OTP phone verification is mandatory for all accounts. NIU or RCCM unlocks unlimited job posting.'
                  : 'Verification OTP obligatoire pour tous les comptes. NIU ou RCCM debloque la publication illimitee.'}
              </p>
              <input
                type="text"
                value={niu}
                onChange={(e) => setNiu(e.target.value)}
                placeholder="NIU"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                value={rccm}
                onChange={(e) => setRccm(e.target.value)}
                placeholder="RCCM"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </aside>

        {/* COLONNE DROITE (Statistiques et Annonces / Formulaire) */}
        <section className="flex-1 space-y-6">

          {/* AFFICHAGE CONDITIONNEL : SOIT LES STATS + LISTE, SOIT LE FORMULAIRE */}
          {!showForm ? (
            <>
              {/* Cartes Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Offres actives</p>
                  <p className="text-2xl font-extrabold text-black">{String(jobsPublishedCount).padStart(2, '0')}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Candidats à trier</p>
                  <p className="text-2xl font-extrabold text-green-600">28</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Vues totales</p>
                  <p className="text-2xl font-extrabold text-black">1.2k</p>
                </div>
              </div>

              {/* Liste des annonces */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-black">Vos annonces récentes</h3>
                  <button className="text-green-600 font-bold text-sm hover:underline">Voir tout</button>
                </div>
                
                <div className="divide-y divide-gray-100">
                  <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-gray-50 transition">
                    <div className="flex-1">
                      <h4 className="font-bold text-black text-[16px]">Comptable Senior (H/F)</h4>
                      <p className="text-xs text-gray-500 font-medium mt-1">Publiée le 15 Mars 2026 • Yaoundé</p>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-lg font-extrabold text-black">14</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Candidats</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-white transition shadow-sm">Gérer</button>
                        <button className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-bold border border-green-100 hover:bg-green-100 transition">Voir les CV</button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-gray-50 transition">
                    <div className="flex-1">
                      <h4 className="font-bold text-black text-[16px]">Agent de Sécurité</h4>
                      <p className="text-xs text-red-400 font-bold mt-1 uppercase tracking-tighter">● Expire dans 2 jours</p>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-lg font-extrabold text-black">09</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Candidats</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-white transition shadow-sm">Gérer</button>
                        <button className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-bold border border-green-100 hover:bg-green-100 transition">Voir les CV</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* FORMULAIRE DE PUBLICATION INTÉGRÉ */
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl animate-fade-in">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-extrabold">Nouvelle offre d'emploi</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-red-500 font-bold text-sm">{isEn ? 'Cancel x' : 'Annuler x'}</button>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-xs font-bold text-amber-800">
                    {isEn ? 'Step 1 (required): verify phone number by OTP before publishing.' : 'Etape 1 (obligatoire): verifier le numero par OTP avant publication.'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+237 6XX XX XX XX"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                    <button onClick={sendOtp} className="px-5 py-3 rounded-lg bg-black text-white font-bold text-sm">{isEn ? 'Send OTP' : 'Envoyer OTP'}</button>
                  </div>
                  {otpSent && (
                    <>
                      <p className="text-[11px] font-bold text-gray-600">
                        {isEn ? 'Demo code:' : 'Code demo:'} {otpCode}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                        <input
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          placeholder="123456"
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                        <button onClick={verifyOtp} className="px-5 py-3 rounded-lg bg-green-600 text-white font-bold text-sm">{isEn ? 'Verify OTP' : 'Verifier OTP'}</button>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Intitulé du poste</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="ex: Comptable Senior"
                      className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-600 bg-gray-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Type de contrat</label>
                    <select className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-600 bg-gray-50/50 cursor-pointer">
                      <option>CDI</option>
                      <option>CDD</option>
                      <option>Stage</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">Description des missions</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Décrivez les responsabilités du poste..."
                    className="w-full h-48 p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-600 bg-gray-50/50 resize-none"
                  ></textarea>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700 font-medium">
                  <p className="font-bold mb-1">Filtre auto anti-fraude</p>
                  <p>Le systeme bloque automatiquement les offres contenant: frais de dossier, frais d inscription, transfert mobile money, investissement.</p>
                  <p className="mt-2">Quarantaine: les 3 premieres annonces passent en statut En attente pour moderation admin.</p>
                </div>

                <button onClick={publishJob} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-black transition shadow-md">
                  {isEn ? 'Post this job for free' : 'Publier l annonce gratuitement'}
                </button>

                {publishMessage && <p className="text-sm font-bold text-gray-700">{publishMessage}</p>}
              </div>
            </div>
          )}

        </section>
      </main>

      <Footer />
    </div>
  );
}
