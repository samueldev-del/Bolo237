import FooterResourcePage from "@/components/FooterResourcePage";

export default function InfosSalairesPage() {
  return (
    <FooterResourcePage
      path="/infos-salaires"
      breadcrumbLabel={{ fr: "Informations salariales", en: "Salary insights" }}
      eyebrow={{ fr: "Guide candidats", en: "Candidate guide" }}
      title={{
        fr: "Mieux comprendre les salaires avant d accepter une offre",
        en: "Understand salary expectations before accepting an offer",
      }}
      intro={{
        fr: "Cette page vous aide a comparer une proposition selon le metier, la ville, les avantages inclus et le niveau d experience demande.",
        en: "This page helps you compare an offer by role, city, included benefits, and expected level of experience.",
      }}
      highlight={{
        fr: "Regardez toujours le package complet: salaire de base, transport, logement, commissions et rythme de paiement.",
        en: "Always review the full package: base salary, transport, housing, commissions, and payment rhythm.",
      }}
      cards={[
        {
          title: { fr: "Comparer le net reel", en: "Compare the real take-home" },
          description: {
            fr: "Deux offres au meme montant peuvent etre tres differentes si l une prend en charge les repas, les trajets ou les primes de terrain.",
            en: "Two offers with the same amount can feel very different when one includes meals, transport, or field bonuses.",
          },
        },
        {
          title: { fr: "Verifier la ville et le secteur", en: "Check the city and sector" },
          description: {
            fr: "Le niveau de salaire d un commercial a Douala n est pas celui d un technicien a Bafoussam ou d un agent terrain a Yaounde.",
            en: "A sales salary in Douala does not equal a technician salary in Bafoussam or a field role in Yaounde.",
          },
        },
        {
          title: { fr: "Poser les bonnes questions", en: "Ask the right questions" },
          description: {
            fr: "Demandez si la periode d essai, les objectifs, les horaires et les modalites de paiement sont fixes par ecrit avant votre accord final.",
            en: "Ask whether probation, targets, schedules, and payment terms are fixed in writing before you give a final yes.",
          },
        },
        {
          title: { fr: "Garder une trace ecrite", en: "Keep written proof" },
          description: {
            fr: "Conservez les captures ou messages qui confirment le salaire annonce afin d eviter les ecarts au moment de la prise de poste.",
            en: "Keep screenshots or messages confirming the promised salary to avoid surprises when you start.",
          },
        },
      ]}
      quickLinks={[
        {
          href: "/emplois",
          label: { fr: "Parcourir les offres actives", en: "Browse active job listings" },
          note: {
            fr: "Comparez les niveaux de remuneration actuellement visibles sur la plateforme.",
            en: "Compare compensation levels currently visible on the platform.",
          },
        },
        {
          href: "/recherche",
          label: { fr: "Utiliser la recherche avancee", en: "Use advanced search" },
          note: {
            fr: "Filtrez par mot-cle, ville ou type d opportunite pour mieux situer une offre.",
            en: "Filter by keyword, city, or opportunity type to benchmark an offer faster.",
          },
        },
        {
          href: "/questions-frequentes",
          label: { fr: "Lire la FAQ Bolo237", en: "Read the Bolo237 FAQ" },
          note: {
            fr: "Retrouvez les bonnes pratiques de confiance et d utilisation de la plateforme.",
            en: "Review platform trust and usage guidance before moving forward.",
          },
        },
      ]}
      primaryCta={{ href: "/recherche", label: { fr: "Analyser les offres actuelles", en: "Review current listings" } }}
      secondaryCta={{ href: "/comment-decrocher-premier-contrat", label: { fr: "Voir le guide premier contrat", en: "See the first-contract guide" } }}
    />
  );
}