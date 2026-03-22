import Link from 'next/link';

// Dans Next.js, on récupère l'ID de l'URL via les "params"
export default function DetailAnnonce({ params }: { params: { id: string } }) {
  const annonceId = params.id;
  
  // Fausse donnée pour le prototype. Plus tard, on cherchera l'annonce avec params.id dans la Base de Données.
  const annonce = {
    titre: "Développeur Web React.js / Next.js",
    entreprise: "TechCamer S.A",
    lieu: "Douala, Akwa",
    type: "Formel", // Change en "Informel" pour voir la différence de couleur
    contrat: "CDI",
    salaire: "300 000 - 450 000 FCFA / mois",
    date: "Publié il y a 2 heures",
    description: `Nous sommes une entreprise technologique en pleine croissance basée à Douala et nous recherchons un Développeur Frontend passionné pour rejoindre notre équipe.

    Vos missions :
    - Développer des interfaces utilisateur modernes et réactives.
    - Collaborer avec l'équipe backend pour intégrer les API.
    - Optimiser les performances de nos applications web.
    
    Profil recherché :
    - Au moins 2 ans d'expérience avec React.js.
    - Bonne maîtrise de Tailwind CSS et du responsive design.
    - Esprit d'équipe et rigueur.`,
  };

  const isFormel = annonce.type === 'Formel';

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      
      {/* Barre de navigation */}
      <nav className="p-4 bg-white shadow-sm flex justify-between items-center border-b border-gray-200">
        <Link href="/" className="text-2xl font-extrabold text-blue-700">237jobs</Link>
        <Link href="/recherche" className="text-gray-600 hover:text-blue-700 font-semibold transition">
          ← Retour aux recherches
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto mt-8 px-4 flex flex-col md:flex-row gap-6">
        
        {/* Colonne Principale : Détails de l'annonce */}
        <section className="w-full md:w-2/3 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          
          {/* En-tête de l'annonce */}
          <div className="border-b border-gray-100 pb-6 mb-6">
            <div className="flex gap-2 items-center mb-4">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${isFormel ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                {isFormel ? '🏢 Emploi Formel' : '🛠️ Petit Boulot'}
              </span>
              <span className="text-sm text-gray-500 font-medium">{annonce.date}</span>
            </div>
            
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{annonce.titre}</h1>
            <p className="text-lg text-gray-600 font-medium mb-4">
              {annonce.entreprise} • <span className="text-gray-500">{annonce.lieu}</span>
            </p>

            <div className="flex flex-wrap gap-3">
              <span className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold">{annonce.contrat}</span>
              <span className="bg-green-50 text-green-700 px-4 py-2 rounded-lg font-bold">{annonce.salaire}</span>
            </div>
          </div>

          {/* Corps de la description */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Description de l&apos;offre</h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {annonce.description}
            </div>
          </div>
        </section>

        {/* Colonne Latérale : Actions (Postuler) */}
        <aside className="w-full md:w-1/3">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Intéressé(e) par cette offre ?</h3>
            <p className="text-sm text-gray-500 mb-6">Ne tardez pas, cette annonce est très consultée.</p>
            
            {isFormel ? (
              <button className="w-full bg-blue-700 text-white font-bold text-lg py-3.5 rounded-lg hover:bg-blue-800 transition shadow-md mb-3">
                Postuler maintenant
              </button>
            ) : (
              <button className="w-full bg-green-600 text-white font-bold text-lg py-3.5 rounded-lg hover:bg-green-700 transition shadow-md mb-3">
                Contacter sur WhatsApp
              </button>
            )}

            <button className="w-full bg-white text-blue-700 font-bold text-lg py-3.5 rounded-lg border-2 border-blue-100 hover:bg-blue-50 transition">
              Sauvegarder l&apos;annonce
            </button>

            <p className="mt-4 text-xs text-gray-400 text-center">Ref annonce: {annonceId}</p>

            {/* Infos supplémentaires de sécurité */}
            <div className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-400 text-center">
              Signaler cette annonce si elle vous semble frauduleuse. 237jobs ne demandera jamais de paiement pour un entretien.
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}