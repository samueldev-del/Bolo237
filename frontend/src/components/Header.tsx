"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '@/components/LocaleProvider';

const USER_KEY = 'bolo237-user';
const ROLE_KEY = 'bolo237-account-role';

type UserData = { id: number; name?: string; role?: string; email?: string } | null;

function getUserFromStorage(): UserData {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getDashboard(role: string | undefined, localizePath: (p: string) => string) {
  if (role === 'entreprise') return localizePath('/dashboard-entreprise');
  if (role === 'artisan') return localizePath('/dashboard-artisan');
  return localizePath('/dashboard');
}

function getRoleLabel(role: string | null | undefined, isEn: boolean): string {
  switch (role) {
    case 'entreprise': return isEn ? 'Company' : 'Entreprise';
    case 'artisan': return isEn ? 'Artisan' : 'Artisan';
    case 'chercheur': return isEn ? 'Candidate' : 'Candidat';
    default: return isEn ? 'Candidate' : 'Candidat';
  }
}

function getRoleColor(role: string | null | undefined): string {
  switch (role) {
    case 'entreprise': return 'from-blue-600 to-blue-700';
    case 'artisan': return 'from-orange-500 to-orange-600';
    default: return 'from-[#DA7756] to-[#C4623F]';
  }
}

function getRoleBadgeColor(role: string | null | undefined): string {
  switch (role) {
    case 'entreprise': return 'bg-blue-600 hover:bg-blue-700';
    case 'artisan': return 'bg-orange-500 hover:bg-orange-600';
    default: return 'bg-[#DA7756] hover:bg-[#C4623F]';
  }
}

function getRoleIcon(role: string | null | undefined): string {
  switch (role) {
    case 'entreprise': return '🏢';
    case 'artisan': return '🔧';
    default: return '👤';
  }
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { locale, setLocale, t, localizePath } = useLocale();
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<UserData>(null);

  const isEn = locale === 'en';

  useEffect(() => {
    setUser(getUserFromStorage());
  }, []);

  // Fermer le menu en cliquant dehors
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMenuOpen]);

  const localRole = typeof window !== 'undefined' ? window.localStorage.getItem(ROLE_KEY) : null;

  const handleLogout = () => {
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(ROLE_KEY);
    window.localStorage.removeItem('bolo237-phone-verified');
    setUser(null);
    setIsMenuOpen(false);
    window.location.href = localizePath('/');
  };

  return (
    <header className="bg-white border-b border-gray-100 h-16 md:h-20 flex items-center px-4 md:px-12 sticky top-0 z-50 font-sans">
      <div className="w-full max-w-[1400px] mx-auto flex justify-between items-center">

        {/* LOGO */}
        <Link href={localizePath('/')} className="flex items-center">
          <Image src="/logo.svg" alt="Bolo237" width={140} height={36} priority className="h-8 md:h-9 w-auto" />
        </Link>

        {/* Navigation links are in the burger menu */}
        <div className="hidden lg:block" />

        {/* BLOC DROIT */}
        <div className="flex items-center gap-3">
          {/* Lang switch (desktop) */}
          <div className="hidden md:flex items-center text-xs font-bold gap-1 text-gray-400">
            <button onClick={() => setLocale('fr')} className={`px-2 py-1 rounded ${locale === 'fr' ? 'text-[#C4623F] bg-[#FFF5EF]' : 'hover:text-black'}`}>FR</button>
            <button onClick={() => setLocale('en')} className={`px-2 py-1 rounded ${locale === 'en' ? 'text-[#C4623F] bg-[#FFF5EF]' : 'hover:text-black'}`}>EN</button>
          </div>

          {/* Connexion / Mon compte */}
          {user ? (
            <Link
              href={getDashboard(localRole || undefined, localizePath)}
              className={`hidden sm:flex items-center gap-2 ${getRoleBadgeColor(localRole)} text-white px-5 py-2.5 rounded-full font-bold text-[13px] transition shadow-sm`}
            >
              <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[11px]">
                {getRoleIcon(localRole)}
              </span>
              <span className="max-w-[120px] truncate">{(user.name || '').split(' ')[0] || (isEn ? 'Dashboard' : 'Mon espace')}</span>
            </Link>
          ) : (
            <Link
              href={localizePath('/connexion')}
              className="hidden sm:block border-2 border-[#DA7756] text-[#C4623F] px-5 py-2 rounded-full font-bold text-[13px] hover:bg-[#FFF5EF] transition"
            >
              {t.header.login}
            </Link>
          )}

          {/* BOUTON MENU BURGER */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 p-2.5 hover:bg-gray-50 rounded-xl transition group border border-gray-100"
            aria-label="Menu"
          >
            {isMenuOpen ? (
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <div className="space-y-1.5">
                <div className="w-5 h-0.5 bg-gray-700 transition group-hover:bg-[#DA7756]"></div>
                <div className="w-5 h-0.5 bg-gray-700 transition group-hover:bg-[#DA7756]"></div>
                <div className="w-3.5 h-0.5 bg-gray-700 transition group-hover:bg-[#DA7756]"></div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* OVERLAY */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 top-16 md:top-20" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* PANNEAU DU MENU */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="absolute top-16 md:top-20 right-0 md:right-8 w-full md:w-96 bg-white md:border md:border-gray-200 md:shadow-2xl md:rounded-2xl z-50 overflow-hidden"
        >
          <div className="max-h-[calc(100vh-5rem)] overflow-y-auto">

            {/* En-tête utilisateur connecté */}
            {user && (
              <div className={`bg-gradient-to-r ${getRoleColor(localRole)} px-6 py-5 text-white`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">
                    {getRoleIcon(localRole)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{user.name || (isEn ? 'My account' : 'Mon compte')}</p>
                    <p className="text-white/70 text-xs">{getRoleLabel(localRole, isEn)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Lang switch mobile */}
            <div className="md:hidden px-6 pt-4 pb-2">
              <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-0.5 text-xs font-extrabold">
                <button onClick={() => setLocale('fr')} className={`px-4 py-1.5 rounded-full transition ${locale === 'fr' ? 'bg-[#DA7756] text-white shadow-sm' : 'text-gray-500'}`}>FR</button>
                <button onClick={() => setLocale('en')} className={`px-4 py-1.5 rounded-full transition ${locale === 'en' ? 'bg-[#DA7756] text-white shadow-sm' : 'text-gray-500'}`}>EN</button>
              </div>
            </div>

            <div
              className="flex flex-col py-2"
              onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setIsMenuOpen(false); }}
            >
              {/* Section: Navigation */}
              <p className="px-6 pt-3 pb-1.5 text-[10px] uppercase tracking-widest text-gray-400 font-extrabold">
                {isEn ? 'Navigate' : 'Explorer'}
              </p>
              <MenuLink href={localizePath('/emplois')} icon="💼" label={isEn ? 'Job offers' : 'Offres d\'emploi'} desc={isEn ? 'Browse all available jobs' : 'Parcourir les offres disponibles'} />
              <MenuLink href={localizePath('/petits-boulots')} icon="🛠️" label={isEn ? 'Artisans & Services' : 'Artisans & Services'} desc={isEn ? 'Find skilled professionals near you' : 'Trouvez des pros près de chez vous'} />
              <MenuLink href={localizePath('/cvtheque')} icon="📄" label={isEn ? 'CV Library' : 'CVthèque'} desc={isEn ? 'Browse candidate profiles' : 'Parcourir les profils candidats'} />

              <div className="h-px bg-gray-100 my-2 mx-6"></div>

              {/* Section: Mon espace (si connecté) */}
              {user && (
                <>
                  <p className="px-6 pt-3 pb-1.5 text-[10px] uppercase tracking-widest text-gray-400 font-extrabold">
                    {isEn ? 'My space' : 'Mon espace'}
                  </p>
                  <MenuLink href={getDashboard(localRole || undefined, localizePath)} icon="📊" label={isEn ? 'Dashboard' : 'Tableau de bord'} desc={isEn ? 'Manage your activity' : 'Gérer votre activité'} />

                  {/* Candidat links */}
                  {(localRole === 'chercheur' || !localRole) && (
                    <>
                      <MenuLink href={localizePath('/profil')} icon="✏️" label={isEn ? 'My CV / Profile' : 'Mon CV / Profil'} desc={isEn ? 'Build and update your CV' : 'Créer et mettre à jour votre CV'} />
                      <MenuLink href={localizePath('/emplois')} icon="🔎" label={isEn ? 'Find a job' : 'Trouver un emploi'} desc={isEn ? 'Browse available offers' : 'Parcourir les offres disponibles'} />
                    </>
                  )}

                  {/* Entreprise links */}
                  {localRole === 'entreprise' && (
                    <>
                      <MenuLink href={localizePath('/publier')} icon="📝" label={isEn ? 'Post a job' : 'Publier une offre'} desc={isEn ? 'Reach thousands of candidates' : 'Touchez des milliers de candidats'} />
                      <MenuLink href={localizePath('/cvtheque')} icon="👥" label={isEn ? 'CV Library' : 'CVthèque'} desc={isEn ? 'Find the ideal candidate' : 'Trouver le candidat idéal'} />
                    </>
                  )}

                  {/* Artisan links */}
                  {localRole === 'artisan' && (
                    <>
                      <MenuLink href={localizePath('/profil')} icon="🛠️" label={isEn ? 'My profile' : 'Mon profil'} desc={isEn ? 'Manage your artisan profile' : 'Gérer votre profil artisan'} />
                      <MenuLink href={localizePath('/petits-boulots')} icon="📋" label={isEn ? 'Service requests' : 'Demandes de services'} desc={isEn ? 'Find clients near you' : 'Trouver des clients près de vous'} />
                    </>
                  )}

                  <div className="h-px bg-gray-100 my-2 mx-6"></div>
                </>
              )}

              {/* Section: Actions rapides */}
              {!user && (
                <>
                  <p className="px-6 pt-3 pb-1.5 text-[10px] uppercase tracking-widest text-gray-400 font-extrabold">
                    {isEn ? 'Get started' : 'Commencer'}
                  </p>
                  <MenuLink href={localizePath('/connexion')} icon="🔑" label={isEn ? 'Sign in' : 'Se connecter'} desc={isEn ? 'Access your dashboard' : 'Accéder à votre espace'} />
                  <MenuLink href={localizePath('/publier')} icon="📝" label={isEn ? 'Post a job' : 'Publier une offre'} desc={isEn ? 'Recruit the best talent' : 'Recrutez les meilleurs talents'} />
                  <div className="h-px bg-gray-100 my-2 mx-6"></div>
                </>
              )}

              {/* Section: Infos */}
              <p className="px-6 pt-3 pb-1.5 text-[10px] uppercase tracking-widest text-gray-400 font-extrabold">
                {isEn ? 'Information' : 'Informations'}
              </p>
              <MenuLink href={localizePath('/recherche')} icon="🔍" label={isEn ? 'Advanced search' : 'Recherche avancée'} desc={isEn ? 'Find with precise filters' : 'Chercher avec des filtres précis'} />
              <MenuLink href={localizePath('/a-propos')} icon="ℹ️" label={isEn ? 'About Bolo237' : 'À propos de Bolo237'} desc={isEn ? 'The Cameroon job platform' : 'La plateforme emploi du Cameroun'} />

              {/* Déconnexion */}
              {user && (
                <>
                  <div className="h-px bg-gray-100 my-2 mx-6"></div>
                  <button
                    onClick={handleLogout}
                    className="mx-6 my-3 flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition text-sm font-semibold"
                  >
                    <span>🚪</span>
                    {isEn ? 'Sign out' : 'Se déconnecter'}
                  </button>
                </>
              )}
            </div>

            {/* Footer du menu */}
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
              <p className="text-[11px] text-gray-400 text-center font-medium">
                Bolo237 — {isEn ? 'Jobs & Services in Cameroon' : 'Emplois & Services au Cameroun'}
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuLink({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} className="flex items-start gap-3.5 px-6 py-3 hover:bg-[#FFF5EF] transition group">
      <span className="text-lg mt-0.5 group-hover:scale-110 transition-transform">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 group-hover:text-[#C4623F] transition">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}
