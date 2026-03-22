import AdminShell from "@/components/admin/admin-shell";

export default function ModerationJobsPage() {
  return (
    <AdminShell
      title="Annuaire des jobs"
      description="Validez ou refusez les annonces avant publication."
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-600">
          Espace pret pour la table de moderation des offres d&apos;emploi.
        </p>
      </div>
    </AdminShell>
  );
}
