import AdminShell from "@/components/admin/admin-shell";

export default function DeconnexionPage() {
  return (
    <AdminShell
      title="Deconnexion"
      description="Sortie securisee du compte administrateur."
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-600">
          Espace pret pour brancher le workflow de deconnexion.
        </p>
      </div>
    </AdminShell>
  );
}
