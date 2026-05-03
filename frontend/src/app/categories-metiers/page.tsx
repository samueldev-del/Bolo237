import FooterResourcePage from "@/components/FooterResourcePage";

export default function CategoriesMetiersPage() {
  return (
    <FooterResourcePage
      path="/categories-metiers"
      breadcrumbLabel={{ fr: "Categories de metiers", en: "Trade categories" }}
      eyebrow={{ fr: "Univers artisans", en: "Artisan universe" }}
      title={{
        fr: "Explorer les grandes categories de metiers et services sur Bolo237",
        en: "Explore the main trade and service categories on Bolo237",
      }}
      intro={{
        fr: "Cette page aide a mieux classer les prestations artisanales, clarifier les attentes des clients et mieux positionner votre savoir-faire.",
        en: "This page helps classify artisan services, clarify client expectations, and position your expertise more clearly.",
      }}
      highlight={{
        fr: "Une categorie bien choisie rend votre profil plus facile a trouver, plus credible et plus simple a comparer.",
        en: "The right category makes your profile easier to find, more credible, and easier to compare.",
      }}
      cards={[
        {
          title: { fr: "Batiment et finitions", en: "Construction and finishing" },
          description: {
            fr: "Maconnerie, plomberie, electricite, peinture, carrelage, aluminium et autres interventions de chantier ou de renovation.",
            en: "Masonry, plumbing, electrical work, painting, tiling, aluminum, and other construction or renovation jobs.",
          },
        },
        {
          title: { fr: "Maintenance et depannage", en: "Maintenance and repair" },
          description: {
            fr: "Reparations rapides, entretien d equipements, installation domestique et interventions techniques urgentes.",
            en: "Quick repairs, equipment maintenance, home installation, and urgent technical interventions.",
          },
        },
        {
          title: { fr: "Services de maison", en: "Home services" },
          description: {
            fr: "Nettoyage, jardinage, amenagement, couture, coiffure a domicile et autres besoins de service de proximite.",
            en: "Cleaning, gardening, home setup, tailoring, home beauty services, and other nearby service needs.",
          },
        },
        {
          title: { fr: "Savoir-faire specialises", en: "Specialized expertise" },
          description: {
            fr: "Froid, menuiserie technique, fabrication, soudure, audiovisuel ou prestations avec outillage et experience specifique.",
            en: "Cooling systems, advanced carpentry, fabrication, welding, audiovisual work, or services requiring specific tools and experience.",
          },
        },
      ]}
      quickLinks={[
        {
          href: "/petits-boulots",
          label: { fr: "Voir les besoins clients", en: "See client requests" },
          note: {
            fr: "Reperez les demandes publiees et les categories les plus actives.",
            en: "Review published requests and the most active categories.",
          },
        },
        {
          href: "/dashboard-artisan",
          label: { fr: "Ouvrir mon espace artisan", en: "Open artisan dashboard" },
          note: {
            fr: "Ajustez vos annonces et votre positionnement selon votre categorie principale.",
            en: "Adjust your listings and positioning around your main category.",
          },
        },
        {
          href: "/connexion",
          label: { fr: "Devenir artisan sur Bolo237", en: "Join Bolo237 as an artisan" },
          note: {
            fr: "Creez votre compte pour publier votre savoir-faire et vos disponibilites.",
            en: "Create your account to publish your expertise and availability.",
          },
        },
      ]}
      primaryCta={{ href: "/petits-boulots", label: { fr: "Explorer les missions artisanales", en: "Explore artisan gigs" } }}
      secondaryCta={{ href: "/connexion", label: { fr: "Creer mon compte artisan", en: "Create artisan account" } }}
    />
  );
}