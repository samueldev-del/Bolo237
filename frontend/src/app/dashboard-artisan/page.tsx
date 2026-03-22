"use client";

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { getModerationStatusForFirstPublications } from '@/lib/trustShield';
import { sendOtp as apiSendOtp, verifyOtp as apiVerifyOtp } from '@/lib/api';

export default function DashboardArtisan() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'portfolio' | 'annonces'>('portfolio');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [idFrontUploaded, setIdFrontUploaded] = useState(false);
  const [idBackUploaded, setIdBackUploaded] = useState(false);
  const [selfieVideoUploaded, setSelfieVideoUploaded] = useState(false);
  const [servicesPostedCount, setServicesPostedCount] = useState(0);
  const [verificationMessage, setVerificationMessage] = useState('');

  const isArtisanVerified = otpVerified && idFrontUploaded && idBackUploaded && selfieVideoUploaded;

  const sendOtp = async () => {
    if (!phone.trim()) {
      setVerificationMessage(isEn ? 'Enter phone number first.' : 'Saisissez d abord le numero de telephone.');
      return;
    }
    setVerificationMessage('');
    try {
      const res = await apiSendOtp(phone);
      setOtpCode(res.demoCode || '');
      setOtpSent(true);
      setOtpVerified(false);
    } catch {
      const fallback = String(Math.floor(100000 + Math.random() * 900000));
      setOtpCode(fallback);
      setOtpSent(true);
      setOtpVerified(false);
    }
  };

  const verifyOtp = async () => {
    setVerificationMessage('');
    try {
      const res = await apiVerifyOtp(phone, otpInput.trim());
      if (res.verified) {
        setOtpVerified(true);
        setVerificationMessage(isEn ? 'Phone verified.' : 'Numero verifie.');
      } else {
        setOtpVerified(false);
        setVerificationMessage(res.error || (isEn ? 'Invalid OTP.' : 'OTP invalide.'));
      }
    } catch {
      if (otpInput.trim() === otpCode) {
        setOtpVerified(true);
        setVerificationMessage(isEn ? 'Phone verified.' : 'Numero verifie.');
      } else {
        setOtpVerified(false);
        setVerificationMessage(isEn ? 'Invalid OTP.' : 'OTP invalide.');
      }
    }
  };

  const publishServiceNeed = () => {
    const status = getModerationStatusForFirstPublications(servicesPostedCount);
    const next = servicesPostedCount + 1;
    setServicesPostedCount(next);
    setVerificationMessage(
      status === 'en-attente'
        ? isEn
          ? `Need published in moderation queue (${next}/3).`
          : `Besoin publie en file de moderation (${next}/3).`
        : isEn
          ? 'Need published online.'
          : 'Besoin publie en ligne.'
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans text-black flex flex-col">
      
      {/* 1. HEADER SPÉCIFIQUE ARTISAN */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 h-16 flex items-center px-4 md:px-8">
        <div className="w-full max-w-[1400px] mx-auto flex justify-between items-center">
          <Link href={localizePath('/')} className="text-xl font-extrabold text-black tracking-tight flex items-center gap-1.5">
            <div className="w-6 h-6 bg-green-600 rounded-sm"></div>
            237jobs <span className="text-sm font-medium text-gray-400 ml-2 hidden md:inline">| {isEn ? 'Artisan Space' : 'Espace Artisan'}</span>
          </Link>
          
          <div className="flex items-center gap-6 font-bold text-[14px] text-gray-700 hidden md:flex">
            <Link href="#" className="hover:text-green-600 transition">{isEn ? 'My Stats' : 'Mes Statistiques'}</Link>
            <Link href="#" className="hover:text-green-600 transition">{isEn ? 'My Portfolio' : 'Mon Portfolio'}</Link>
            
            {/* Menu: Mon compte */}
            <div className="relative h-16 flex items-center" onMouseEnter={() => setActiveMenu('compte')} onMouseLeave={() => setActiveMenu(null)}>
              <button className={`flex items-center gap-2 transition ${activeMenu === 'compte' ? 'text-green-600' : 'hover:text-green-600'}`}>
                <span className={`w-8 h-8 rounded flex items-center justify-center font-extrabold text-xs transition ${activeMenu === 'compte' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>PRO</span>
                {isEn ? 'My account' : 'Mon compte'}
              </button>
              {activeMenu === 'compte' && (
                <div className="absolute top-[50px] right-0 w-56 bg-white border border-gray-200 shadow-xl rounded-xl py-2 z-50 flex flex-col">
                  <Link href="#" className="px-5 py-2 hover:bg-green-50 hover:text-green-700 transition font-medium text-[14px]">{isEn ? 'Edit storefront' : 'Modifier la vitrine'}</Link>
                  <Link href="#" className="px-5 py-2 hover:bg-green-50 hover:text-green-700 transition font-medium text-[14px]">{isEn ? 'Premium plan' : 'Abonnement Premium'}</Link>
                  <Link href={localizePath('/')} className="px-5 py-2 hover:bg-red-50 hover:text-red-600 transition font-medium text-[14px] mt-2 border-t border-gray-100 pt-3">{isEn ? 'Logout' : 'Déconnexion'}</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 2. CORPS DU PROFIL ARTISAN */}
      <main className="max-w-[1200px] mx-auto w-full mt-10 px-4 flex flex-col md:flex-row gap-8 mb-16 flex-grow">
        
        {/* COLONNE GAUCHE (Résumé Vitrine) */}
        <aside className="w-full md:w-[320px] shrink-0 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative text-center">
            <button className="absolute top-4 right-4 text-sm font-bold text-gray-400 hover:text-green-600 flex items-center gap-1">✎</button>
            <div className="w-24 h-24 bg-green-50 border-2 border-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🪚</span>
            </div>
            <h2 className="text-2xl font-extrabold text-black mb-1">{isEn ? 'Your Workshop' : 'Votre Atelier'}</h2>
            <p className="text-[15px] font-bold text-green-600 mb-4">{isEn ? 'Your Specialty' : 'Votre Specialite'}</p>
            <div className={`inline-flex items-center gap-2 text-[11px] font-bold px-3 py-1 rounded-full border uppercase ${isArtisanVerified ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {isArtisanVerified ? '✓ Profil Verifie' : 'Non Verifie'}
            </div>
            
            <div className="space-y-3 text-[14px] text-gray-700 font-medium text-left border-t border-gray-100 pt-4 mt-4">
              <p className="flex items-center gap-3"><span>📍</span> {isEn ? 'Your location' : 'Votre localisation'}</p>
              <p className="flex items-center gap-3"><span>⭐</span> {isEn ? 'No reviews yet' : 'Aucun avis pour le moment'}</p>
              <p className="flex items-center gap-3 text-black font-bold"><span>📞</span> +237 6XX XX XX XX</p>
            </div>
            
            <div className="mt-6">
              <button className="w-full bg-[#25D366] text-white font-bold py-3 rounded-xl text-[14px] hover:bg-[#1DA851] transition shadow-sm flex items-center justify-center gap-2">
                <span>💬</span> Connecter mon WhatsApp
              </button>
            </div>
          </div>

          {/* Jauge de visibilité */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-black mb-2">Visibilité de la vitrine</h3>
            <p className="text-xs text-gray-500 font-medium mb-4">Complétez votre profil pour attirer plus de clients.</p>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-green-500 w-[65%] rounded-full"></div>
            </div>
            <p className="text-right text-xs font-bold text-green-600">65% complété</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="font-bold text-black">Bouclier identite artisan</h3>
            <p className="text-xs text-gray-600 font-medium">
              {isEn
                ? 'To get the Verified profile badge, add OTP phone validation, both ID sides, and a selfie video with your card.'
                : 'Pour obtenir le badge Profil verifie, ajoutez OTP telephone, CNI recto/verso, et selfie video avec la carte.'}
            </p>
            <div className="grid grid-cols-1 gap-2">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237 6XX XX XX XX" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={sendOtp} className="bg-black text-white rounded-lg py-2 text-sm font-bold">{isEn ? 'Send OTP' : 'Envoyer OTP'}</button>
                <button onClick={verifyOtp} className="bg-green-600 text-white rounded-lg py-2 text-sm font-bold">{isEn ? 'Verify OTP' : 'Verifier OTP'}</button>
              </div>
              {otpSent && <p className="text-[11px] font-bold text-gray-500">Code demo: {otpCode}</p>}
              {otpSent && <input value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="123456" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />}
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={idFrontUploaded} onChange={() => setIdFrontUploaded((v) => !v)} className="accent-green-600" /> CNI recto fourni</label>
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={idBackUploaded} onChange={() => setIdBackUploaded((v) => !v)} className="accent-green-600" /> CNI verso fourni</label>
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={selfieVideoUploaded} onChange={() => setSelfieVideoUploaded((v) => !v)} className="accent-green-600" /> Selfie video avec CNI fourni</label>
            </div>
            {verificationMessage && <p className="text-xs font-bold text-gray-700">{verificationMessage}</p>}
          </div>
        </aside>

        {/* COLONNE DROITE (Contenu interactif : Portfolio, Services) */}
        <section className="flex-1 space-y-6">
          
          {/* Bannière de motivation */}
          <div className="bg-green-50 p-8 rounded-2xl border border-green-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold text-black mb-2">{isEn ? 'Show your craftsmanship!' : 'Montrez votre savoir-faire !'}</h2>
              <p className="text-[14px] text-gray-800 font-medium leading-relaxed">
                {isEn
                  ? 'Clients trust what they can see. Add photos of your latest projects to win more jobs.'
                  : 'Les clients font confiance à ce qu ils voient. Ajoutez des photos de vos dernières réalisations pour décrocher plus de chantiers.'}
              </p>
            </div>
            <button className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-md hover:bg-gray-800 transition w-full md:w-auto text-[14px]">
              {isEn ? '+ Add photos' : '+ Ajouter des photos'}
            </button>
          </div>

          {/* ONGLETS INTERACTIFS */}
          <div className="flex gap-8 border-b border-gray-200 overflow-x-auto">
            <button onClick={() => setActiveTab('portfolio')} className={`pb-4 text-[15px] transition whitespace-nowrap ${activeTab === 'portfolio' ? 'border-b-2 border-black font-extrabold text-black' : 'text-gray-500 font-bold hover:text-black'}`}>
              🖼️ {isEn ? 'My Portfolio' : 'Mon Portfolio'}
            </button>
            <button onClick={() => setActiveTab('services')} className={`pb-4 text-[15px] transition whitespace-nowrap ${activeTab === 'services' ? 'border-b-2 border-black font-extrabold text-black' : 'text-gray-500 font-bold hover:text-black'}`}>
              🛠️ {isEn ? 'My Services & Pricing' : 'Mes Services & Tarifs'}
            </button>
            <button onClick={() => setActiveTab('annonces')} className={`pb-4 text-[15px] transition whitespace-nowrap ${activeTab === 'annonces' ? 'border-b-2 border-black font-extrabold text-black' : 'text-gray-500 font-bold hover:text-black'}`}>
              📢 {isEn ? 'Post a need' : 'Publier un besoin'}
            </button>
          </div>

          {/* CONTENU : PORTFOLIO (Galerie Photo) */}
          {activeTab === 'portfolio' && (
            <div className="animate-fade-in space-y-6">
              
              {/* Zone de Drop pour les images */}
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center text-center hover:border-green-600 transition bg-white cursor-pointer group">
                <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">📸</span>
                <h4 className="font-extrabold text-black mb-2 text-[15px]">{isEn ? 'Drop your photos here' : 'Glissez vos photos ici'}</h4>
                <p className="text-[13px] text-gray-500 mb-6 font-medium">{isEn ? 'Accepted formats: JPG, PNG. Max 5MB per photo.' : 'Formats acceptés : JPG, PNG. Max 5Mo par photo.'}</p>
                <button className="bg-gray-100 text-black px-6 py-2.5 rounded-full font-bold hover:bg-gray-200 transition text-[14px]">
                  {isEn ? 'Browse files' : 'Parcourir les fichiers'}
                </button>
              </div>

              {/* Grille de photos — vide en attendant les uploads */}
              <h3 className="font-bold text-black text-lg pt-4">{isEn ? 'Your projects (0)' : 'Vos realisations (0)'}</h3>
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 font-medium">
                  {isEn ? 'No photos yet. Upload your first project above!' : 'Aucune photo pour le moment. Ajoutez votre premier projet ci-dessus !'}
                </p>
              </div>
            </div>
          )}

          {/* CONTENU : MES SERVICES */}
          {activeTab === 'services' && (
            <div className="animate-fade-in space-y-4">
              <div className="text-center py-10">
                <p className="text-4xl mb-4">🛠️</p>
                <h4 className="font-bold text-black text-[15px] mb-2">{isEn ? 'No services listed yet' : 'Aucun service pour le moment'}</h4>
                <p className="text-sm text-gray-500 font-medium">
                  {isEn ? 'Add your first service to attract clients.' : 'Ajoutez votre premier service pour attirer des clients.'}
                </p>
              </div>

              <button className="w-full border-2 border-dashed border-gray-300 bg-gray-50/50 text-black font-bold py-4 rounded-2xl hover:border-green-600 hover:text-green-700 transition">
                + {isEn ? 'Add a new service' : 'Ajouter un nouveau service'}
              </button>
            </div>
          )}

                    {/* CONTENU : ANNONCES (L'artisan recrute un talent) */}
          {activeTab === 'annonces' && (
            <div className="animate-fade-in space-y-6">
              
              {/* Bannière de Recrutement */}
              <div className="bg-green-50 p-8 rounded-2xl border border-green-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-extrabold text-black mb-2">{isEn ? 'Hire talent or an apprentice' : 'Recrutez un talent ou un apprenti'}</h2>
                  <p className="text-[14px] text-gray-800 font-medium leading-relaxed">
                      {isEn
                        ? 'Business growing? Big project ahead? Post a job to quickly find extra hands, a motivated apprentice, or an expert to support you.'
                        : 'Votre activité grandit ? Un gros chantier en vue ? Publiez une offre d emploi pour trouver rapidement des bras supplémentaires, un apprenti motivé ou un expert pour vous accompagner.'}
                  </p>
                </div>
                  <Link href={localizePath('/publier')} className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-md hover:bg-gray-800 transition text-[14px] whitespace-nowrap text-center">
                    {isEn ? '+ Post a job ad' : '+ Publier une annonce'}
                </Link>
              </div>

              {/* Suivi des annonces actives */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-black text-[16px] mb-4 border-b border-gray-100 pb-3">Vos annonces actives</h3>
                
                {/* État vide (quand il n'a encore rien publié) */}
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📢</span>
                  </div>
                  <h4 className="font-bold text-black text-[15px] mb-2">Aucune annonce en cours</h4>
                  <p className="text-[14px] text-gray-500 font-medium">
                    Vous n'avez pas encore publié d'offre pour rechercher un talent.
                  </p>
                  <button onClick={publishServiceNeed} className="mt-4 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition">
                    {isEn ? 'Simulate publication with moderation' : 'Simuler une publication avec moderation'}
                  </button>
                  <p className="mt-2 text-xs text-gray-500 font-medium">
                    {isEn ? 'First 3 publications are set to Pending for admin review.' : 'Les 3 premieres publications passent en En attente pour validation admin.'}
                  </p>
                </div>
                
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
