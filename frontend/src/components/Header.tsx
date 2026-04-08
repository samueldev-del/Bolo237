"use client";

import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';
import { clearStoredSession, getSessionStorageValue, subscribeToSessionStorage } from '@/lib/session';
import { logoutUser } from '@/lib/api';
import { PRIMARY_NAV_ITEMS } from '@/lib/seo';

const USER_KEY = 'bolo237-user';
const ROLE_KEY = 'bolo237-account-role';

type UserData = {
  id: number;
  name?: string | null;
  role?: string;
  email?: string | null;
  isVerified?: boolean;
  photoUrl?: string | null;
  logoUrl?: string | null;
} | null;

function normalizeRole(role: string | null | undefined): string {
  return String(role || '').toLowerCase();
}

function parseUserFromStorage(raw: string | null): UserData {
  if (!raw) return null;
  try {
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getDashboard(role: string | undefined, localizePath: (p: string) => string) {
  const normalized = normalizeRole(role);
  if (normalized === 'entreprise') return localizePath('/dashboard-entreprise');
  if (normalized === 'artisan') return localizePath('/dashboard-artisan');
  return localizePath('/dashboard');
}

function getProfileLink(role: string | undefined, localizePath: (p: string) => string) {
  const normalized = normalizeRole(role);
  if (normalized === 'entreprise') return localizePath('/dashboard-entreprise?section=profile');
  if (normalized === 'artisan') return localizePath('/dashboard-artisan');
  return localizePath('/profil');
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

function getRoleIcon(role: string | null | undefined): string {
  switch (role) {
    case 'entreprise': return '🏢';
    case 'artisan': return '🔧';
    default: return '👤';
  }
}

function getUserDisplayName(name: string | null | undefined, role: string | null | undefined, isEn: boolean): string {
  const normalizedName = String(name || '')
    .replace(/\s*\(@[^)]*\)\s*$/u, '')
    .trim();

  if (!normalizedName) {
    return isEn ? 'My account' : 'Mon compte';
  }

  if (normalizeRole(role) === 'entreprise') {
    const companyName = normalizedName.split('—')[0]?.trim();
    return companyName || normalizedName;
  }

  return normalizedName;
}

function getUserVisualUrl(user: UserData, role: string | null | undefined): string {
  if (!user) return '';
  if (normalizeRole(role) === 'entreprise') {
    return String(user.logoUrl || user.photoUrl || '');
  }

  return String(user.photoUrl || user.logoUrl || '');
}

function getUserInitials(name: string, role: string | null | undefined): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length > 0) {
    return parts.map((part) => part[0]).join('').toUpperCase();
  }

  return getRoleIcon(role);
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { locale, setLocale, t, localizePath } = useLocale();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const userRaw = useSyncExternalStore(
    subscribeToSessionStorage,
    () => getSessionStorageValue(USER_KEY),
    () => null,
  );
  const storedRole = useSyncExternalStore(
    subscribeToSessionStorage,
    () => getSessionStorageValue(ROLE_KEY),
    () => null,
  );
  const user = useMemo(() => parseUserFromStorage(userRaw), [userRaw]);

  const isEn = locale === 'en';
  const desktopNavItems = useMemo(
    () => PRIMARY_NAV_ITEMS.map((item) => ({
      href: localizePath(item.path),
      label: item.navLabel[locale],
      path: item.path,
    })),
    [locale, localizePath]
  );

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

  const localRole = storedRole || user?.role || null;
  const localRoleNormalized = normalizeRole(localRole);
  const displayName = getUserDisplayName(user?.name, localRoleNormalized, isEn);
  const userVisualUrl = getUserVisualUrl(user, localRoleNormalized);
  const userInitials = getUserInitials(displayName, localRoleNormalized);
  const privacyRightsLink = localizePath('/confidentialite#account-rights');

  const handleLogout = async () => {
    await logoutUser().catch(() => undefined);
    clearStoredSession();
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

        <nav aria-label={isEn ? 'Primary navigation' : 'Navigation principale'} className="hidden lg:flex items-center gap-1">
          {desktopNavItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.path}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-[#FFF5EF] text-[#C4623F]'
                    : 'text-gray-600 hover:bg-[#FFF5EF] hover:text-[#C4623F]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

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
              className="hidden sm:flex items-center gap-3 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm transition hover:border-gray-300 hover:shadow-md"
            >
              <AccountAvatar
                imageUrl={userVisualUrl}
                initials={userInitials}
                alt={displayName}
                role={localRoleNormalized}
                size="sm"
              />
              <span className="min-w-0 text-left leading-tight">
                <span className="block max-w-[140px] truncate text-[13px] font-bold text-gray-900">{displayName}</span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  {getRoleLabel(localRoleNormalized, isEn)}
                </span>
              </span>
              {user.isVerified && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-50 px-1.5 text-[10px] font-black text-emerald-600">
                  ✓
                </span>
              )}
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
            className="flex items-center gap-2 rounded-xl border border-gray-100 p-2.5 transition group hover:bg-gray-50"
            aria-label="Menu"
          >
            {user && (
              <div className="sm:hidden flex items-center gap-2 min-w-0">
                <AccountAvatar
                  imageUrl={userVisualUrl}
                  initials={userInitials}
                  alt={displayName}
                  role={localRoleNormalized}
                  size="xs"
                />
                <span className="max-w-[92px] truncate text-[12px] font-bold text-gray-800">{displayName}</span>
              </div>
            )}
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
              <div className={`bg-gradient-to-r ${getRoleColor(localRoleNormalized)} px-6 py-5 text-white`}>
                <div className="flex items-center gap-3">
                  <AccountAvatar
                    imageUrl={userVisualUrl}
                    initials={userInitials}
                    alt={displayName}
                    role={localRoleNormalized}
                    size="lg"
                    bordered
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{displayName}</p>
                    <p className="text-white/70 text-xs flex items-center gap-1.5">
                      <span>{getRoleLabel(localRoleNormalized, isEn)}</span>
                      {user.isVerified && <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-extrabold">✓ {isEn ? 'Certified' : 'Certifie'}</span>}
                    </p>
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
                  {(localRoleNormalized === 'chercheur' || !localRoleNormalized) && (
                    <>
                      <MenuLink href={getProfileLink(localRole || undefined, localizePath)} icon="✏️" label={isEn ? 'My CV / Profile' : 'Mon CV / Profil'} desc={isEn ? 'Build and update your CV' : 'Créer et mettre à jour votre CV'} />
                      <MenuLink href={localizePath('/emplois')} icon="🔎" label={isEn ? 'Find a job' : 'Trouver un emploi'} desc={isEn ? 'Browse available offers' : 'Parcourir les offres disponibles'} />
                    </>
                  )}

                  {/* Entreprise links */}
                  {localRoleNormalized === 'entreprise' && (
                    <>
                      <MenuLink href={getProfileLink(localRole || undefined, localizePath)} icon="🏢" label={isEn ? 'Company profile' : 'Profil entreprise'} desc={isEn ? 'Manage your company trust profile' : 'Gérer votre profil entreprise'} />
                      <MenuLink href={localizePath('/publier')} icon="📝" label={isEn ? 'Post a job' : 'Publier une offre'} desc={isEn ? 'Reach thousands of candidates' : 'Touchez des milliers de candidats'} />
                      <MenuLink href={localizePath('/cvtheque')} icon="👥" label={isEn ? 'CV Library' : 'CVthèque'} desc={isEn ? 'Find the ideal candidate' : 'Trouver le candidat idéal'} />
                    </>
                  )}

                  {/* Artisan links */}
                  {localRoleNormalized === 'artisan' && (
                    <>
                      <MenuLink href={getProfileLink(localRole || undefined, localizePath)} icon="🛠️" label={isEn ? 'My profile' : 'Mon profil'} desc={isEn ? 'Manage your artisan profile' : 'Gérer votre profil artisan'} />
                      <MenuLink href={localizePath('/petits-boulots')} icon="📋" label={isEn ? 'Service requests' : 'Demandes de services'} desc={isEn ? 'Find clients near you' : 'Trouver des clients près de vous'} />
                    </>
                  )}

                  <MenuLink
                    href={privacyRightsLink}
                    icon="🔐"
                    label={isEn ? 'Privacy & account rights' : 'Confidentialite & droits du compte'}
                    desc={isEn ? 'Export your data or manage account requests' : 'Exporter vos donnees ou gerer vos demandes de compte'}
                  />

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

function AccountAvatar({
  imageUrl,
  initials,
  alt,
  role,
  size,
  bordered = false,
}: {
  imageUrl: string;
  initials: string;
  alt: string;
  role: string | null | undefined;
  size: 'xs' | 'sm' | 'lg';
  bordered?: boolean;
}) {
  const sizeClass = size === 'lg' ? 'h-12 w-12 text-sm' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-8 w-8 text-[11px]';
  const borderClass = bordered ? 'ring-2 ring-white/25' : 'border border-gray-200';
  const gradientClass = normalizeRole(role) === 'entreprise'
    ? 'from-blue-100 to-blue-50 text-blue-700'
    : normalizeRole(role) === 'artisan'
      ? 'from-orange-100 to-orange-50 text-orange-700'
      : 'from-[#FEEBD6] to-[#FFF5EF] text-[#C4623F]';

  return (
    <span className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${sizeClass} ${borderClass} bg-gradient-to-br ${gradientClass}`}>
      {imageUrl ? (
        <span
          role="img"
          aria-label={alt}
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-black">{initials}</span>
      )}
    </span>
  );
}
