import FooterResourcePage from "@/components/FooterResourcePage";

export default function ModeleCvPage() {
  return (
    <FooterResourcePage
      path="/modele-cv"
      breadcrumbLabel={{ fr: "Modèle de CV", en: "CV template" }}
      eyebrow={{ fr: "CV candidats", en: "Candidate CV" }}
      title={{
        fr: "Un modèle de CV simple, lisible et utile pour le marché camerounais",
        en: "A CV template that stays simple, readable, and useful for the Cameroon market",
      }}
      intro={{
        fr: "Un bon CV ne cherche pas à tout dire. Il doit surtout montrer rapidement votre rôle, vos compétences, vos résultats et vos contacts fiables.",
        en: "A strong CV does not try to say everything. It should quickly show your role, skills, results, and reliable contact details.",
      }}
      highlight={{
        fr: "Tenez en une à deux pages maximum, avec des expériences récentes, des verbes clairs et un numéro joignable.",
        en: "Keep it to one or two pages at most, with recent experience, clear action verbs, and a reachable phone number.",
      }}
      cards={[
        {
          title: { fr: "En-tête professionnel", en: "Professional header" },
          description: {
            fr: "Nom complet, titre de poste, ville, téléphone, email et lien WhatsApp si vous répondez vite via mobile.",
            en: "Full name, role title, city, phone, email, and WhatsApp link if you answer quickly on mobile.",
          },
        },
        {
          title: { fr: "Résumé en quelques lignes", en: "Short summary" },
          description: {
            fr: "Trois ou quatre lignes suffisent pour dire votre spécialité, vos années d’expérience et le type de poste recherché.",
            en: "Three or four lines are enough to explain your specialty, years of experience, and target position.",
          },
        },
        {
          title: { fr: "Expérience avec résultats", en: "Experience with results" },
          description: {
            fr: "Pour chaque expérience, indiquez ce que vous avez fait, ce que vous avez amélioré et sur quelle période.",
            en: "For each experience, show what you did, what you improved, and during which period.",
          },
        },
        {
          title: { fr: "Compétences lisibles", en: "Readable skills" },
          description: {
            fr: "Regroupez vos compétences par familles utiles : techniques, commerciales, bureautiques, langues et outils métiers.",
            en: "Group your skills into useful families: technical, commercial, office, languages, and role-specific tools.",
          },
        },
      ]}
      quickLinks={[
        {
          href: "/connexion",
          label: { fr: "Créer ou ouvrir son compte", en: "Create or open your account" },
          note: {
            fr: "Connectez-vous pour compléter votre profil et préparer votre CV Bolo237.",
            en: "Sign in to complete your profile and prepare your Bolo237 CV.",
          },
        },
        {
          href: "/dashboard",
          label: { fr: "Mettre à jour mon profil", en: "Update my profile" },
          note: {
            fr: "Ajoutez vos expériences, compétences et informations visibles pour les recruteurs.",
            en: "Add your experience, skills, and recruiter-facing information.",
          },
        },
        {
          href: "/comment-decrocher-premier-contrat",
          label: { fr: "Aller plus loin", en: "Go further" },
          note: {
            fr: "Reliez votre CV à une vraie stratégie de candidature et de relance.",
            en: "Connect your CV to a real strategy for applications and follow-up.",
          },
        },
      ]}
      primaryCta={{ href: "/connexion", label: { fr: "Commencer mon CV", en: "Start my CV" } }}
      secondaryCta={{ href: "/dashboard", label: { fr: "Ouvrir mon espace", en: "Open my dashboard" } }}
    />
  );
}