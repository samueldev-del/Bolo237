import AdminShell from "@/components/admin/admin-shell";

export default function UtilisateursBannissementsPage() {
  return (
    <AdminShell
      title="Bannissements"
      description="Liste noire des fraudeurs et comptes bloques."
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-600">
          Espace pret pour auditer et gerer les bannissements.
        </p>
      </div>
    </AdminShell>
  );
}
