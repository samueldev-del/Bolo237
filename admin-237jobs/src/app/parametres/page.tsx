import AdminShell from "@/components/admin/admin-shell";

export default function ParametresPage() {
  return (
    <AdminShell
      title="Parametres"
      description="Configuration globale du back-office 237jobs."
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-600">
          Espace pret pour gerer vos regles et preferences admin.
        </p>
      </div>
    </AdminShell>
  );
}
