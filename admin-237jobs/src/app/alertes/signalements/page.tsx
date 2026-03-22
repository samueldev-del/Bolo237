import AdminShell from "@/components/admin/admin-shell";

export default function AlertesSignalementsPage() {
  return (
    <AdminShell
      title="Signalements"
      description="Suivi en temps reel des alertes fraude et abus."
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-600">
          Espace pret pour traiter les signalements critiques.
        </p>
      </div>
    </AdminShell>
  );
}
