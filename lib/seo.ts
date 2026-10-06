import type { Metadata } from "next"

/* ====================================================================
   RÉFÉRENCEMENT (SEO) : tous les textes que Google voit sont ici, faciles à modifier.
   Les textes sont en anglais : c'est la langue que Google lit en premier, partout dans le monde.
   ==================================================================== */

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://f-y-s-u.com").replace(/\/$/, "")
export const SITE_NAME = "FYSU"

// Titre et description de la page d'accueil (c'est ce qui s'affiche dans Google)
export const HOME_TITLE = "FYSU — Clothing, fragrance & music"
export const HOME_DESCRIPTION =
  "FYSU is a quiet independent house of clothing, fragrance and music. Pieces made slowly, to be kept and lived in."

// Tes pages officielles (Instagram, TikTok, Pinterest, LinkedIn…) : colle ici les adresses complètes,
// entre guillemets, séparées par des virgules. Google s'en sert pour comprendre que ce sont les mêmes FYSU.
// Exemple : ["https://www.instagram.com/fysu", "https://www.tiktok.com/@fysu"]
export const SAME_AS: string[] = []

// Textes des pages fixes
export const PAGES = {
  thewave: {
    path: "/thewave",
    title: "TheWave — FYSU",
    description: "TheWave is the playful side of FYSU: clothing, objects and music with a light, young spirit.",
  },
  kibanCollector: {
    path: "/kiban-collector",
    title: "Kiban Collector — FYSU",
    description: "Kiban Collector is the FYSU collector line: refined pieces made slowly, in the spirit of a quiet gallery.",
  },
  fygrances: {
    path: "/fygrances",
    title: "FY'grances — FYSU fragrances",
    description: "FY'grances are the FYSU fragrances, organised by olfactive family.",
  },
  music: {
    path: "/music",
    title: "Music — FYSU",
    description: "Piano, ambient and curated albums to accompany the FYSU collections. Listen on the site.",
  },
  games: {
    path: "/games",
    title: "Arcade — FYSU",
    description: "Small games in an embroidery style, made by FYSU. Play right in your browser.",
  },
  about: {
    path: "/about",
    title: "About — FYSU",
    description: "The story of FYSU, an independent house of clothing, fragrance and music.",
  },
} as const

export function pageMeta(opts: {
  title: string
  description: string
  path: string
  image?: string | null
  type?: "website" | "article"
}): Metadata {
  const { title, description, path, image } = opts
  const url = `${SITE}${path}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: opts.type ?? "website",
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

// Données structurées : disent à Google « FYSU est une marque / un site »
export function organizationJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: SITE_NAME,
      alternateName: ["Fysu", "F.Y.S.U"],
      url: SITE,
      logo: `${SITE}/api/favicon`,
      description: HOME_DESCRIPTION,
      ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      name: SITE_NAME,
      alternateName: "FYSU — Clothing, fragrance & music",
      url: SITE,
      inLanguage: "en",
      publisher: { "@id": `${SITE}/#organization` },
    },
  ]
}
