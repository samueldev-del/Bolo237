"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

export default function ProfilCV() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';
  const [methodeCV, setMethodeCV] = useState<'manuel' | 'upload'>('manuel');

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      
      {/* Navigation simplifiée */}
      <nav className="p-4 bg-white shadow-sm flex justify-between items-center border-b border-gray-200">
        <Link href={localizePath('/dashboard')} className="text-blue-700 font-bold hover:underline">{isEn ? '← Back to Dashboard' : '← Retour au Dashboard'}</Link>
        <div className="text-xl font-extrabold text-gray-900">{isEn ? 'My Profile' : 'Mon Profil'}</div>
      </nav>

      <main className="max-w-4xl mx-auto mt-8 px-4">
        
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{isEn ? 'Complete your profile' : 'Complétez votre Profil'}</h1>
          <p className="text-gray-600">{isEn ? 'A complete profile attracts 3x more attention from recruiters and clients.' : 'Un profil complet attire 3 fois plus l attention des recruteurs et des particuliers.'}</p>
        </header>

        {/* Choix de la méthode : Remplir ou Télécharger */}
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex gap-2 mb-8 mx-auto max-w-lg">
          <button 
            onClick={() => setMethodeCV('manuel')}
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition ${methodeCV === 'manuel' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            ✍️ {isEn ? 'Build my CV online' : 'Créer mon CV en ligne'}
          </button>
          <button 
            onClick={() => setMethodeCV('upload')}
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition ${methodeCV === 'upload' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            📄 {isEn ? 'Upload a PDF' : 'Télécharger un PDF'}
          </button>
        </div>

        {/* Option 1 : Téléchargement PDF */}
        {methodeCV === 'upload' && (
          <div className="bg-white p-10 rounded-xl shadow-sm border border-dashed border-gray-300 text-center">
            <div className="text-5xl mb-4">📤</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{isEn ? 'Import your existing CV' : 'Importez votre CV existant'}</h3>
            <p className="text-gray-500 mb-6">{isEn ? 'Accepted formats: PDF, DOCX (Max 5MB)' : 'Formats acceptés : PDF, DOCX (Max 5MB)'}</p>
            <button className="bg-blue-700 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-800 transition shadow-md">
              {isEn ? 'Browse my files' : 'Parcourir mes fichiers'}
            </button>
          </div>
        )}

        {/* Option 2 : Formulaire de création de CV manuel */}
        {methodeCV === 'manuel' && (
          <form className="space-y-6">
            
            {/* Infos Personnelles */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Informations Personnelles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Titre de votre profil</label>
                  <input type="text" placeholder="Ex: Plombier expérimenté OU Développeur Web" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ville de résidence</label>
                  <input type="text" placeholder="Ex: Douala" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">À propos de moi (Bio courte)</label>
                <textarea rows={3} placeholder="Présentez-vous en quelques phrases..." className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
              </div>
            </div>

            {/* Expériences */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-bold text-gray-800">Expériences Professionnelles</h2>
                <button type="button" className="text-blue-700 font-bold text-sm hover:underline">+ Ajouter</button>
              </div>
              
              {/* Une carte d'expérience (fausse donnée) */}
              <div className="border border-gray-200 p-4 rounded-lg mb-4 bg-gray-50">
                <div className="flex justify-between">
                  <h3 className="font-bold text-gray-900">Technicien Réseau</h3>
                  <span className="text-sm text-gray-500">2021 - Présent</span>
                </div>
                <p className="text-gray-600 text-sm">Camtel, Yaoundé</p>
              </div>
            </div>

            {/* Compétences */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Compétences</h2>
              <input type="text" placeholder="Ajouter une compétence (ex: Comptabilité, Menuiserie, Excel) et appuyez sur Entrée" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4" />
              
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                  JavaScript <button className="hover:text-red-500">×</button>
                </span>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                  Service Client <button className="hover:text-red-500">×</button>
                </span>
              </div>
            </div>

            {/* Bouton de sauvegarde */}
            <div className="text-right">
              <button type="button" className="bg-green-600 text-white px-8 py-3.5 rounded-lg font-bold text-lg hover:bg-green-700 transition shadow-lg">
                {isEn ? 'Save my profile' : 'Enregistrer mon Profil'}
              </button>
            </div>

          </form>
        )}
      </main>
    </div>
  );
}