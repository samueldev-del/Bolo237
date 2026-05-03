'use client';

import { useReducer, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import LoginForm from './components/LoginForm';
import SignupForm, { type SignupRole } from './components/SignupForm';
import OtpForm from './components/OtpForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import ResetPasswordForm from './components/ResetPasswordForm';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'otp';

interface AuthState {
  mode: AuthMode;
  email: string;
}

type AuthAction =
  | { type: 'SET_MODE'; payload: AuthMode }
  | { type: 'GO_TO_OTP'; email: string };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'GO_TO_OTP':
      return { ...state, mode: 'otp', email: action.email };
    default:
      return state;
  }
}

type VisualKey = 'chercheur' | 'artisan' | 'entreprise' | 'default';

const VISUALS: Record<VisualKey, { src: string; alt: string; tagline: string; eyebrow: string }> = {
  chercheur: {
    src: '/jobsearch.jpg',
    alt: 'Candidat à la recherche d\'un emploi',
    eyebrow: 'Candidat',
    tagline: 'Trouvez le contrat qui vous correspond.',
  },
  artisan: {
    src: '/artisant.jpg',
    alt: 'Artisan au travail',
    eyebrow: 'Artisan',
    tagline: 'Proposez vos services en toute sécurité.',
  },
  entreprise: {
    src: '/talent.jpg',
    alt: 'Entreprise recrutant un talent',
    eyebrow: 'Entreprise',
    tagline: 'Recrutez les meilleurs talents.',
  },
  default: {
    src: '/jobsearch.jpg',
    alt: 'Plateforme Bolo237',
    eyebrow: 'Bolo237',
    tagline: 'Votre passerelle vers l\'emploi au Cameroun.',
  },
};

const VISUAL_KEYS: VisualKey[] = ['chercheur', 'artisan', 'entreprise', 'default'];

export default function ConnexionPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(authReducer, { mode: 'login', email: '' });
  const [signupRole, setSignupRole] = useState<SignupRole>('chercheur');

  const visualKey: VisualKey = useMemo(() => {
    if (state.mode === 'signup') return signupRole;
    return 'default';
  }, [state.mode, signupRole]);

  const visual = VISUALS[visualKey];

  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      {/* Visual side — banner on mobile, fixed half-screen on desktop */}
      <aside
        className="relative order-first h-56 w-full overflow-hidden sm:h-64 lg:order-last lg:h-screen lg:w-1/2 lg:sticky lg:top-0"
        aria-hidden="true"
      >
        {VISUAL_KEYS.map((key) => {
          const v = VISUALS[key];
          const active = key === visualKey;
          return (
            <Image
              key={key}
              src={v.src}
              alt={v.alt}
              fill
              priority={key === 'default'}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={`object-cover transition-opacity duration-700 ease-out ${
                active ? 'opacity-100' : 'opacity-0'
              }`}
            />
          );
        })}

        {/* Overlay — darker on desktop where text floats over image; gradient-to-bottom on mobile to blend with form */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60 lg:bg-gradient-to-tr lg:from-[#4A2218]/70 lg:via-[#8B4332]/40 lg:to-black/30" />

        {/* Tagline */}
        <div className="absolute inset-0 flex items-end p-6 sm:p-10 lg:items-center lg:justify-start lg:p-16">
          <div className="max-w-md text-white">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#FEEBD6]/90 transition-all duration-500">
              {visual.eyebrow}
            </p>
            <p
              key={visual.tagline}
              className="text-2xl font-extrabold leading-tight drop-shadow-lg sm:text-3xl lg:text-4xl animate-in fade-in slide-in-from-bottom-2 duration-500"
            >
              {visual.tagline}
            </p>
          </div>
        </div>
      </aside>

      {/* Form side */}
      <main className="relative flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-md">
          {/* Brand header */}
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#8B4332] transition hover:text-[#DA7756]">
              <span className="text-lg">←</span> Bolo237
            </Link>
            {state.mode !== 'login' && state.mode !== 'signup' && (
              <button
                onClick={() => dispatch({ type: 'SET_MODE', payload: 'login' })}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                Retour
              </button>
            )}
          </div>

          <div className="rounded-2xl bg-white">
            {state.mode === 'login' && (
              <LoginForm
                onForgot={() => dispatch({ type: 'SET_MODE', payload: 'forgot' })}
                onSignup={() => dispatch({ type: 'SET_MODE', payload: 'signup' })}
                onRequireOtp={(email) => dispatch({ type: 'GO_TO_OTP', email })}
              />
            )}

            {state.mode === 'signup' && (
              <SignupForm
                role={signupRole}
                onRoleChange={setSignupRole}
                onBack={() => dispatch({ type: 'SET_MODE', payload: 'login' })}
                onSuccess={(email) => dispatch({ type: 'GO_TO_OTP', email })}
              />
            )}

            {state.mode === 'otp' && (
              <OtpForm
                email={state.email}
                onBack={() => dispatch({ type: 'SET_MODE', payload: 'login' })}
                onSuccess={() => router.push('/dashboard')}
              />
            )}

            {state.mode === 'forgot' && (
              <ForgotPasswordForm
                onBack={() => dispatch({ type: 'SET_MODE', payload: 'login' })}
                onSuccess={() => dispatch({ type: 'SET_MODE', payload: 'reset' })}
              />
            )}

            {state.mode === 'reset' && (
              <ResetPasswordForm
                onSuccess={() => dispatch({ type: 'SET_MODE', payload: 'login' })}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
