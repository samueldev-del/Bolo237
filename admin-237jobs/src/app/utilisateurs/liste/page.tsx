import AdminShell from "@/components/admin/admin-shell";

export default function UtilisateursListePage() {
  return (
    <AdminShell
      title="Liste complete"
      description="Vue globale des candidats, entreprises et artisans."
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-600">
          Espace pret pour la gestion complete des utilisateurs.
        </p>
      </div>
    </AdminShell>
  );
}
