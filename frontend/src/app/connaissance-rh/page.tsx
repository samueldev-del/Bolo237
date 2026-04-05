"use client";

import FooterResourcePage from "@/components/FooterResourcePage";

export default function ConnaissanceRhPage() {
  return (
    <FooterResourcePage
      path="/connaissance-rh"
      breadcrumbLabel={{ fr: "Connaissances RH", en: "HR knowledge" }}
      eyebrow={{ fr: "Ressources employeurs", en: "Employer resources" }}
      title={{
        fr: "Les bases RH utiles pour recruter plus vite et avec moins de friction",
        en: "The HR basics that help you recruit faster with less friction",
      }}
      intro={{
        fr: "Cette page rassemble les principes essentiels pour clarifier vos besoins, mieux filtrer les profils et structurer un parcours de recrutement plus simple.",
        en: "This page brings together the essentials to define your need, screen better, and keep your recruitment flow simpler.",
      }}
      highlight={{
        fr: "Une annonce claire, un tri rapide et une proposition precise battent presque toujours un processus long et flou.",
        en: "A clear listing, fast screening, and a precise offer almost always beat a slow and vague process.",
      }}
      cards={[
        {
          title: { fr: "Commencer par le vrai besoin", en: "Start from the real need" },
          description: {
            fr: "Definissez les trois competences indispensables, les horaires reels et le niveau d autonomie attendu avant de publier.",
            en: "Define the three must-have skills, the real schedule, and the expected autonomy level before posting.",
          },
        },
        {
          title: { fr: "Rendre l annonce concrete", en: "Make the listing concrete" },
          description: {
            fr: "Un bon descriptif mentionne les missions, l environnement, le lieu, le rythme, le salaire et les prochaines etapes.",
            en: "A strong description mentions duties, context, location, schedule, salary, and the next steps.",
          },
        },
        {
          title: { fr: "Reduire les delais", en: "Reduce delays" },
          description: {
            fr: "Fixez un delai court entre reception du profil, premier contact, entretien et decision finale pour ne pas perdre les bons candidats.",
            en: "Set a short delay between profile review, first contact, interview, and decision so you do not lose strong candidates.",
          },
        },
        {
          title: { fr: "Donner un retour exploitable", en: "Give usable feedback" },
          description: {
            fr: "Meme une reponse breve sur le niveau, l experience ou la disponibilite aide a garder une relation plus professionnelle.",
            en: "Even short feedback on level, experience, or availability keeps the relationship more professional.",
          },
        },
      ]}
      quickLinks={[
        {
          href: "/publier",
          label: { fr: "Publier une annonce", en: "Post a listing" },
          note: {
            fr: "Appliquez ces bases directement dans votre prochaine publication.",
            en: "Apply these basics directly in your next listing.",
          },
        },
        {
          href: "/dashboard-entreprise",
          label: { fr: "Ouvrir mon espace entreprise", en: "Open my employer dashboard" },
          note: {
            fr: "Suivez vos annonces, profils recus et actions de recrutement.",
            en: "Track your listings, incoming profiles, and hiring actions.",
          },
        },
        {
          href: "/cvtheque",
          label: { fr: "Consulter la CVtheque", en: "Browse the CV library" },
          note: {
            fr: "Cherchez des profils adaptes a vos besoins en cours.",
            en: "Look for profiles aligned with your current needs.",
          },
        },
      ]}
      primaryCta={{ href: "/publier", label: { fr: "Structurer ma prochaine annonce", en: "Prepare my next listing" } }}
      secondaryCta={{ href: "/dashboard-entreprise", label: { fr: "Acceder a mon espace entreprise", en: "Open employer dashboard" } }}
    />
  );
}