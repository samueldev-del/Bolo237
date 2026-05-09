'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';
import { loginUser, ApiError } from '@/lib/api';
import { markRecentAuthSuccess, storeAuthenticatedUser } from '@/lib/session';

type Role = 'chercheur' | 'entreprise' | 'artisan' | 'admin';

const BACKEND_ROLE_TO_LOCAL: Record<string, Role> = {
  CANDIDAT: 'chercheur',
  ENTREPRISE: 'entreprise',
  ARTISAN: 'artisan',
  ADMIN: 'admin',
  SUPER_ADMIN: 'admin',
};

function toLocalRole(role: string | null | undefined): Role {
  const normalizedRole = String(role || '').trim().toUpperCase();
  return BACKEND_ROLE_TO_LOCAL[normalizedRole] || 'chercheur';
}

interface LoginFormProps {
  onForgot: () => void;
  onSignup: () => void;
  onRequireOtp: (email: string) => void;
}

function isSafeRedirect(target: string | null): target is string {
  if (!target) return false;
  // Only accept same-origin paths (must start with "/" but not "//" or "/\\").
  return target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\');
}

export default function LoginForm({ onForgot, onSignup, onRequireOtp }: LoginFormProps) {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';
  const searchParams = useSearchParams();
  const redirectParam = searchParams?.get('redirect') ?? null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDashboardRoute = (role: Role) => {
    if (role === 'admin') return 'https://admin.bolo237.com';
    if (role === 'entreprise') return localizePath('/dashboard-entreprise');
    if (role === 'artisan') return localizePath('/dashboard-artisan');
    return localizePath('/dashboard');
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      setError(isEn ? 'Please enter your email or phone number.' : 'Veuillez saisir votre email ou numero de telephone.');
      return;
    }
    if (!password.trim()) {
      setError(isEn ? 'Please enter your password.' : 'Veuillez saisir votre mot de passe.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const user = await loginUser({ identifier: email.trim(), password });
      if (typeof window !== 'undefined') {
        const localRole = toLocalRole(user.role);
        storeAuthenticatedUser(user, { role: localRole });
        markRecentAuthSuccess();
        // Full page reload so the session cookie is properly sent on
        // the very first request the dashboard makes to /api/auth/me.
        const fallback = getDashboardRoute(localRole);
        window.location.href = isSafeRedirect(redirectParam) ? redirectParam : fallback;
        return;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isEn ? 'Login failed.' : 'Echec de la connexion.');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const textInputClass = 'w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] focus:border-[#DA7756] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 outline-none transition-all duration-200 text-[15px] hover:border-gray-400 focus:shadow-[0_0_0_4px_rgba(218,119,86,0.15)]';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">{isEn ? 'Sign in' : 'Connexion'}</h2>
        <p className="text-base text-gray-600">{isEn ? 'Access your dashboard.' : 'Accedez a votre espace candidat, entreprise ou artisan.'}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-bold text-gray-700 mb-1 block">{isEn ? 'Email or phone' : 'Email ou telephone'}</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            inputMode="email"
            placeholder={isEn ? 'name@example.com or +2376...' : 'nom@example.com ou +2376...'}
            className={textInputClass}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-bold text-gray-700">{isEn ? 'Password' : 'Mot de passe'}</label>
            <button
              type="button"
              onClick={onForgot}
              className="text-xs font-bold text-[#C4623F] hover:underline"
            >
              {isEn ? 'Forgot?' : 'Oublie ?'}
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`${textInputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogin}
        disabled={isSubmitting}
        className="w-full bg-[#DA7756] text-white font-bold py-3.5 rounded-xl hover:bg-[#C4623F] transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0 text-[15px]"
      >
        {isSubmitting ? (isEn ? 'Signing in...' : 'Connexion...') : (isEn ? 'Sign in' : 'Se connecter')}
      </button>

      {/* Social login divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-zinc-200" />
        <span className="text-xs text-zinc-400">{isEn ? 'or continue with' : 'ou continuer avec'}</span>
        <div className="flex-1 h-px bg-zinc-200" />
      </div>

      {/* Google Sign-In */}
      <button
        onClick={() => window.alert('Google Sign-In coming soon')}
        className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-all duration-200 hover:-translate-y-0.5"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {isEn ? 'Continue with Google' : 'Continuer avec Google'}
      </button>

      {/* Apple Sign-In */}
      <button
        onClick={() => window.alert('Apple Sign-In coming soon')}
        className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-black text-sm font-medium text-white hover:bg-zinc-800 transition-all duration-200 hover:-translate-y-0.5"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        {isEn ? 'Continue with Apple' : 'Continuer avec Apple'}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="text-red-500 text-sm mt-0.5">⚠️</span>
          <p className="text-sm font-bold text-red-700">{error}</p>
        </div>
      )}

      {/* Toggle bottom */}
      <div className="mt-6 pt-4 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-600 font-medium">
          {isEn ? 'No account yet? ' : 'Pas encore de compte ? '}
          <button
            onClick={onSignup}
            className="text-[#C4623F] font-bold hover:underline"
          >
            {isEn ? 'Sign up' : 'S\'inscrire'}
          </button>
        </p>
      </div>
    </div>
  );
}
