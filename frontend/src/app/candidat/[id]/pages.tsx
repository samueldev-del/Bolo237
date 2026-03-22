import Link from 'next/link';

export default function ProfilPublic({ params }: { params: { id: string } }) {
  const candidatId = params.id;

  // Fausse donnée pour simuler le profil complet d'un candidat
  const profil = {
    nom: "Alain T.",
    titre: "Développeur Web Fullstack (React / Node.js)",
    localisation: "Douala, Akwa",
    experience_totale: "3 ans",
    disponibilite: "Immédiate",
    salaire_souhaite: "À discuter",
    bio: "Passionné par le code et les nouvelles technologies, je crée des applications web rapides, sécurisées et modernes. J'ai travaillé sur plusieurs projets e-commerce locaux et je cherche aujourd'hui à rejoindre une équipe dynamique pour relever de nouveaux défis.",
    competences: ["JavaScript", "React.js", "Next.js", "Node.js", "Tailwind CSS", "PostgreSQL", "Git"],
    langues: ["Français (Courant)", "Anglais (Technique)"],
    experiences: [
      {
        poste: "Développeur Frontend",
        entreprise: "TechCamer Solutions",
        date: "Janvier 2022 - Présent",
        description: "Développement d'interfaces utilisateur pour des applications de gestion. Collaboration avec l'équipe backend pour l'intégration des API REST."
      },
      {
        poste: "Stagiaire Développeur Web",
        entreprise: "Digital Start",
        date: "Juin 2021 - Décembre 2021",
        description: "Création de sites vitrines pour des PME locales avec WordPress et intégration HTML/CSS personnalisée."
      }
    ],
    formations: [
      {
        diplome: "Licence en Informatique de Gestion",
        ecole: "Université de Douala",
        date: "2018 - 2021"
      }
    ],
    // Si c'était un artisan, on aurait ça :
    estArtisan: false, 
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      
      {/* Navigation retour */}
      <nav className="p-4 bg-slate-900 shadow-sm flex items-center border-b border-slate-800">
        <Link href="/cvtheque" className="text-gray-400 hover:text-white font-bold transition text-sm">
          ← Retour à la CVthèque
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto mt-8 px-4 flex flex-col md:flex-row gap-6">
        
        {/* Colonne Principale : Le CV en ligne */}
        <section className="w-full md:w-2/3 flex flex-col gap-6">
          
          {/* En-tête du profil */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
            
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
              <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-700 font-extrabold text-4xl flex items-center justify-center shrink-0 shadow-sm border-4 border-white">
                {profil.nom.charAt(0)}
              </div>
              
              <div className="flex-1">
                <h1 className="text-3xl font-extrabold text-gray-900">{profil.nom} <span className="text-green-500 text-xl ml-2" title="Profil vérifié">✓</span></h1>
                <h2 className="text-xl text-blue-700 font-bold mt-1">{profil.titre}</h2>
                <p className="text-gray-500 font-medium mt-2 flex flex-wrap gap-x-4 gap-y-2 justify-center sm:justify-start">
                  <span>📍 {profil.localisation}</span>
                  <span>⏱️ Expérience : {profil.experience_totale}</span>
                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold uppercase">{profil.disponibilite}</span>
                </p>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100 text-gray-700 leading-relaxed italic">
              &quot;{profil.bio}&quot;
            </div>
          </div>

          {/* Expériences Professionnelles */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-blue-600">💼</span> Expériences Professionnelles
            </h3>
            
            <div className="space-y-6">
              {profil.experiences.map((exp, idx) => (
                <div key={idx} className="relative pl-6 border-l-2 border-gray-200">
                  <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-1.75 top-1.5 ring-4 ring-white"></div>
                  <h4 className="font-bold text-lg text-gray-900">{exp.poste}</h4>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="text-blue-700">{exp.entreprise}</span>
                    <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded">{exp.date}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Formations */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-blue-600">🎓</span> Formations & Diplômes
            </h3>
            
            <div className="space-y-6">
              {profil.formations.map((form, idx) => (
                <div key={idx} className="relative pl-6 border-l-2 border-gray-200">
                  <div className="absolute w-3 h-3 bg-gray-400 rounded-full -left-1.75 top-1.5 ring-4 ring-white"></div>
                  <h4 className="font-bold text-lg text-gray-900">{form.diplome}</h4>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="text-gray-700">{form.ecole}</span>
                    <span className="text-gray-500">{form.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* Colonne Latérale : Actions & Compétences */}
        <aside className="w-full md:w-1/3 flex flex-col gap-6">
          
          {/* Actions Recruteur */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-24">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Intéressé par ce profil ?</h3>
            
            <button className="w-full bg-blue-700 text-white font-bold text-lg py-3 rounded-lg hover:bg-blue-800 transition shadow-md mb-3 flex items-center justify-center gap-2">
              <span>✉️</span> Contacter le candidat
            </button>
            
            <button className="w-full bg-white text-blue-700 font-bold text-lg py-3 rounded-lg border border-blue-200 hover:bg-blue-50 transition mb-4 flex items-center justify-center gap-2">
              <span>📄</span> Télécharger le CV (PDF)
            </button>

            <div className="text-xs text-center text-gray-500 border-t border-gray-100 pt-4">
              Contacter ce candidat (ID: {candidatId}) consommera <span className="font-bold text-gray-900">1 crédit CV</span> de votre abonnement.
            </div>
          </div>

          {/* Compétences */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Compétences</h3>
            <div className="flex flex-wrap gap-2">
              {profil.competences.map((comp, idx) => (
                <span key={idx} className="bg-gray-100 text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-semibold">
                  {comp}
                </span>
              ))}
            </div>
          </div>

          {/* Langues */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Langues</h3>
            <ul className="space-y-2">
              {profil.langues.map((langue, idx) => (
                <li key={idx} className="text-gray-700 text-sm font-medium flex items-center gap-2">
                  <span className="text-blue-500">🗣️</span> {langue}
                </li>
              ))}
            </ul>
          </div>

        </aside>

      </main>
    </div>
  );
}