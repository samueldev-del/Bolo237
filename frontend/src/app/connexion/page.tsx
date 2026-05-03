'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';
// Ces imports fonctionneront une fois que tu auras créé les fichiers à l'Étape 2
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
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


export default function ConnexionPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(authReducer, {
    mode: 'login',
    email: '',
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-sm">
        
        {state.mode === 'login' && (
          <LoginForm 
            onForgot={() => dispatch({ type: 'SET_MODE', payload: 'forgot' })}
            onSignup={() => dispatch({ type: 'SET_MODE', payload: 'signup' })}
            onRequireOtp={(email) => dispatch({ type: 'GO_TO_OTP', email })}
          />
        )}

        {state.mode === 'signup' && (
          <SignupForm 
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
  );
}
