"use client";

import { 
  LayoutDashboard, Users, Briefcase, AlertTriangle, 
  ShieldCheck, CheckCircle, XCircle, Search, Bell 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Fausse donnée pour le graphique de démonstration
const data = [
  { name: 'Lun', inscrits: 40 }, { name: 'Mar', inscrits: 30 },
  { name: 'Mer', inscrits: 20 }, { name: 'Jeu', inscrits: 27 },
  { name: 'Ven', inscrits: 18 }, { name: 'Sam', inscrits: 23 },
  { name: 'Dim', inscrits: 34 },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* ⬛ SIDEBAR (Menu Latéral Sombre) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full">
        <div className="h-20 flex items-center px-8 border-b border-slate-800">
          <h1 className="text-white text-xl font-bold tracking-wider">237<span className="text-green-500">JOBS</span> <span className="text-xs font-normal text-slate-500">ADMIN</span></h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-green-500/10 text-green-400 rounded-lg transition-colors">
            <LayoutDashboard size={20} /> <span className="font-medium">Tableau de bord</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 rounded-lg transition-colors">
            <Briefcase size={20} /> <span>Annonces (Jobs)</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 rounded-lg transition-colors">
            <ShieldCheck size={20} /> <span>Vérification Artisans</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 rounded-lg transition-colors">
            <Users size={20} /> <span>Utilisateurs</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 rounded-lg transition-colors mt-8">
            <AlertTriangle size={20} className="text-red-400" /> <span className="text-red-400">Signalements</span>
          </a>
        </nav>
      </aside>

      {/* ⬜ CONTENU PRINCIPAL */}
      <main className="flex-1 ml-64 flex flex-col h-screen">
        
        {/* Header Haut */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Chercher un utilisateur, un ID..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600">
              <Bell size={24} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold">
              AD
            </div>
          </div>
        </header>

        {/* Zone de contenu défilable */}
        <div className="p-8 overflow-y-auto flex-1">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Vue d'ensemble</h2>

          {/* Cartes de Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard title="Jobs en attente" value="12" icon={<Briefcase size={24} />} color="text-orange-500" bg="bg-orange-100" />
            <ArtisanCard title="Artisans à vérifier" value="5" icon={<ShieldCheck size={24} />} />
            <StatCard title="Signalements ouverts" value="3" icon={<AlertTriangle size={24} />} color="text-red-500" bg="bg-red-100" />
            <StatCard title="Nouveaux Inscrits" value="+124" icon={<Users size={24} />} color="text-green-500" bg="bg-green-100" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Graphique de Croissance */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Inscriptions cette semaine</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dx={-10} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="inscrits" stroke="#22C55E" fill="#22C55E" fillOpacity={0.1} strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Liste d'actions rapides (Modération) */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">À modérer en urgence</h3>
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <p className="font-medium text-gray-800">Maçon Qualifié</p>
                      <p className="text-sm text-gray-500">BTP Sarl • Yaoundé</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors" title="Approuver">
                        <CheckCircle size={20} />
                      </button>
                      <button className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Rejeter">
                        <XCircle size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Composants réutilisables pour les petites cartes
function StatCard({ title, value, icon, color, bg }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function ArtisanCard({ title, value, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-100 text-blue-500">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}