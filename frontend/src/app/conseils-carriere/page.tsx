"use client";

import FooterResourcePage from "@/components/FooterResourcePage";

export default function ConseilsCarrierePage() {
  return (
    <FooterResourcePage
      path="/conseils-carriere"
      breadcrumbLabel={{ fr: "Conseils de carriere", en: "Career advice" }}
      eyebrow={{ fr: "Progression professionnelle", en: "Career growth" }}
      title={{
        fr: "Des conseils concrets pour devenir plus visible et plus credible",
        en: "Practical advice to become more visible and more credible",
      }}
      intro={{
        fr: "Que vous cherchiez un emploi, un premier contrat ou plus de missions, la progression vient surtout d un profil clair, de reponses rapides et d un bon suivi.",
        en: "Whether you want a job, a first contract, or more assignments, progress comes from a clear profile, fast replies, and consistent follow-up.",
      }}
      highlight={{
        fr: "Sur Bolo237, la confiance se construit avec un profil propre, des documents clairs et une communication rapide.",
        en: "On Bolo237, trust grows from a clean profile, clear documents, and fast communication.",
      }}
      cards={[
        {
          title: { fr: "Soigner votre presentation", en: "Improve your presentation" },
          description: {
            fr: "Un titre professionnel precis, une photo correcte et une localisation claire augmentent immediatement la confiance et la memorisation.",
            en: "A precise professional title, a clean photo, and a clear location improve trust and recall immediately.",
          },
        },
        {
          title: { fr: "Repondre vite", en: "Reply quickly" },
          description: {
            fr: "Les recruteurs et clients avancent souvent avec les profils qui repondent dans les premieres heures, surtout sur WhatsApp.",
            en: "Recruiters and clients often move ahead with the profiles that answer within the first hours, especially on WhatsApp.",
          },
        },
        {
          title: { fr: "Montrer des preuves", en: "Show proof" },
          description: {
            fr: "Des exemples de missions, une verification d identite et des avis positifs rassurent beaucoup plus qu une longue description vague.",
            en: "Work samples, identity verification, and positive reviews reassure far more than a long vague description.",
          },
        },
        {
          title: { fr: "Suivre chaque opportunite", en: "Track every opportunity" },
          description: {
            fr: "Gardez une methode simple: candidature envoyee, relance faite, reponse recue, documents partages. La rigueur fait la difference.",
            en: "Keep a simple system: application sent, follow-up done, response received, documents shared. Consistency creates results.",
          },
        },
      ]}
      quickLinks={[
        {
          href: "/comment-decrocher-premier-contrat",
          label: { fr: "Guide premier contrat", en: "First-contract guide" },
          note: {
            fr: "Suivez une methode pas a pas pour decrocher vos premieres opportunites.",
            en: "Follow a step-by-step method to win your first opportunities.",
          },
        },
        {
          href: "/dashboard",
          label: { fr: "Acceder a mon espace", en: "Open my dashboard" },
          note: {
            fr: "Mettez a jour votre profil et vos informations candidates.",
            en: "Update your profile and candidate information.",
          },
        },
        {
          href: "/recherche",
          label: { fr: "Explorer les offres", en: "Explore job opportunities" },
          note: {
            fr: "Appliquez ensuite ces conseils sur des annonces adaptees a votre profil.",
            en: "Apply these ideas directly on listings that fit your profile.",
          },
        },
      ]}
      primaryCta={{ href: "/comment-decrocher-premier-contrat", label: { fr: "Lire le guide complet", en: "Read the full guide" } }}
      secondaryCta={{ href: "/recherche", label: { fr: "Chercher des opportunites", en: "Search opportunities" } }}
    />
  );
}