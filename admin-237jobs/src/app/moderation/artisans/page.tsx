import AdminShell from "@/components/admin/admin-shell";

export default function ModerationArtisansPage() {
  return (
    <AdminShell
      title="Verification Artisans"
      description="Controle KYC et validation CNI des artisans."
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-600">
          Espace pret pour la file de verification des profils artisans.
        </p>
      </div>
    </AdminShell>
  );
}
