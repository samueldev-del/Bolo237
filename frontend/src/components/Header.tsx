"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { locale, setLocale, t, localizePath } = useLocale();

  return (
    <header className="bg-white border-b border-gray-100 h-20 flex items-center px-6 md:px-12 sticky top-0 z-50 font-sans">
      <div className="w-full max-w-[1400px] mx-auto flex justify-between items-center">
        
        {/* LOGO GAUCHE */}
        <Link href={localizePath('/')} className="text-2xl font-extrabold text-black tracking-tighter flex items-center gap-2 group">
          <div className="w-7 h-7 bg-green-600 rounded-sm transition-transform"></div>
          237jobs
        </Link>

        {/* BLOC DROIT (Uniquement Connexion + Menu) */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center text-sm font-bold gap-2 text-gray-500">
            <button
              onClick={() => setLocale('fr')}
              className={`${locale === 'fr' ? 'text-green-700 font-extrabold' : 'hover:text-black'}`}
            >
              FR
            </button>
            <span>|</span>
            <button
              onClick={() => setLocale('en')}
              className={`${locale === 'en' ? 'text-green-700 font-extrabold' : 'hover:text-black'}`}
            >
              EN
            </button>
          </div>
          
          {/* BOUTON CONNEXION (Unique et épuré, style contouré) */}
          <Link 
            href={localizePath('/connexion')} 
            className="border-2 border-green-600 text-green-700 px-6 py-2.5 rounded-full font-bold text-[14px] hover:bg-green-50 transition shadow-sm whitespace-nowrap"
          >
            {t.header.login}
          </Link>

          {/* LE BOUTON MENU BURGER */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition group border border-gray-100"
          >
            <div className="space-y-1.5">
              <div className="w-6 h-0.5 bg-black transition group-hover:bg-green-600"></div>
              <div className="w-6 h-0.5 bg-black transition group-hover:bg-green-600"></div>
              <div className="w-4 h-0.5 bg-black transition group-hover:bg-green-600"></div>
            </div>
            <span className="hidden md:inline font-bold text-[14px] text-black group-hover:text-green-600 transition">{t.header.menu}</span>
          </button>
        </div>
      </div>

      {/* PANNEAU DU MENU DÉROULANT */}
      {isMenuOpen && (
        <div
          className="absolute top-20 right-6 md:right-12 w-80 bg-white border border-gray-200 shadow-2xl rounded-2xl py-4 z-50 animate-fade-in max-h-[80vh] overflow-y-auto"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('a')) {
              setIsMenuOpen(false);
            }
          }}
        >
          <div className="flex flex-col">

            <p className="px-6 pt-1 pb-2 text-[11px] uppercase tracking-wide text-gray-400 font-extrabold">{t.header.jobs}</p>
            <Link href={localizePath('/dashboard')} className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.myAccount}</Link>
            <Link href="#" className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.savedJobs}</Link>
            <Link href="#" className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.applications}</Link>

            <div className="h-[1px] bg-gray-100 my-2 mx-6"></div>

            <p className="px-6 pt-1 pb-2 text-[11px] uppercase tracking-wide text-gray-400 font-extrabold">{t.header.career}</p>
            <Link href={localizePath('/profil')} className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.createCv}</Link>
            <Link href="#" className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.topEmployers}</Link>
            <Link href="#" className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.topArtisans}</Link>
            <Link href="#" className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.interviewPrep}</Link>

            <div className="h-[1px] bg-gray-100 my-2 mx-6"></div>

            <p className="px-6 pt-1 pb-2 text-[11px] uppercase tracking-wide text-gray-400 font-extrabold">{t.header.auth}</p>
            <Link href={localizePath('/connexion')} className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.signIn}</Link>
            <Link href={localizePath('/connexion')} className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.signUp}</Link>

            <div className="h-[1px] bg-gray-100 my-2 mx-6"></div>

            <p className="px-6 pt-1 pb-2 text-[11px] uppercase tracking-wide text-gray-400 font-extrabold">{t.header.employers}</p>
            <Link href={localizePath('/connexion')} className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.signIn}</Link>
            <Link href={localizePath('/publier')} className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.postNow}</Link>

            <div className="h-[1px] bg-gray-100 my-2 mx-6"></div>

            <p className="px-6 pt-1 pb-2 text-[11px] uppercase tracking-wide text-gray-400 font-extrabold">{t.header.artisans}</p>
            <Link href={localizePath('/connexion')} className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.signIn}</Link>
            <Link href={localizePath('/connexion')} className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.signUp}</Link>

            <div className="h-[1px] bg-gray-100 my-2 mx-6"></div>

            <p className="px-6 pt-1 pb-2 text-[11px] uppercase tracking-wide text-gray-400 font-extrabold">{t.header.review}</p>
            <Link href="#" className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.current}</Link>
            <Link href="#" className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.salary}</Link>
            <Link href="#" className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.careerInsights}</Link>
            <Link href="#" className="px-6 py-2.5 hover:bg-green-50 hover:text-green-700 font-medium text-sm transition">{t.header.workLife}</Link>
          </div>
        </div>
      )}
    </header>
  );
}
