import type { Metadata } from "next"

/* ====================================================================
   RÉFÉRENCEMENT (SEO) : tous les textes que Google voit sont ici, faciles à modifier.
   Les textes sont en anglais : c'est la langue que Google lit en premier, partout dans le monde.
   ==================================================================== */

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://f-y-s-u.com").replace(/\/$/, "")
export const SITE_NAME = "FYSU"

// Titre et description de la page d'accueil (c'est ce qui s'affiche dans Google).
// Format voulu : « Site officiel » + une ligne sur la dernière collection, rien d'autre.
// Quand une nouvelle collection sort, change seulement les lignes « collection » ci-dessous.
// Les langues absentes de cette liste utilisent l'anglais.
export const HOME_COPY: Record<string, { title: string; description: string }> = {
  en: {
    title: "FYSU — Official Site | Spring/Summer 2027 Collection",
    description: "Official FYSU site. Discover the Spring/Summer 2027 collection: clothing, fragrance and music.",
  },
  fr: {
    title: "FYSU — Site officiel | Collection Printemps/Été 2027",
    description: "Site officiel FYSU. Découvrez la collection Printemps/Été 2027 : vêtements, parfums et musique.",
  },
  nl: {
    title: "FYSU — Officiële website | Collectie lente/zomer 2027",
    description: "Officiële FYSU-website. Ontdek de collectie lente/zomer 2027: kleding, geuren en muziek.",
  },
  ja: {
    title: "FYSU — 公式サイト | 2027年春夏コレクション",
    description: "FYSU公式サイト。2027年春夏コレクションをご覧ください。服、香り、音楽。",
  },
  de: {
    title: "FYSU — Offizielle Website | Kollektion Frühjahr/Sommer 2027",
    description: "Offizielle FYSU-Website. Entdecke die Kollektion Frühjahr/Sommer 2027: Mode, Düfte und Musik.",
  },
  es: {
    title: "FYSU — Sitio oficial | Colección Primavera/Verano 2027",
    description: "Sitio oficial de FYSU. Descubre la colección Primavera/Verano 2027: ropa, fragancias y música.",
  },
  it: {
    title: "FYSU — Sito ufficiale | Collezione Primavera/Estate 2027",
    description: "Sito ufficiale FYSU. Scopri la collezione Primavera/Estate 2027: abiti, fragranze e musica.",
  },
  pt: {
    title: "FYSU — Site oficial | Coleção Primavera/Verão 2027",
    description: "Site oficial da FYSU. Descubra a coleção Primavera/Verão 2027: roupa, fragrâncias e música.",
  },
}

export function homeCopy(locale?: string) {
  return HOME_COPY[locale ?? "en"] ?? HOME_COPY.en
}

export const HOME_TITLE = HOME_COPY.en.title
export const HOME_DESCRIPTION = HOME_COPY.en.description

// Tes pages officielles (Instagram, TikTok, Pinterest, LinkedIn…) : colle ici les adresses complètes,
// entre guillemets, séparées par des virgules. Google s'en sert pour comprendre que ce sont les mêmes FYSU.
// Exemple : ["https://www.instagram.com/fysu", "https://www.tiktok.com/@fysu"]
export const SAME_AS: string[] = []

// Textes des pages fixes
export const PAGES = {
  thewave: {
    path: "/thewave",
    title: "TheWave — FYSU",
    description: "TheWave is a FYSU line of knitwear, summer accessories and music.",
  },
  kibanCollector: {
    path: "/kiban-collector",
    title: "Kiban Collector — FYSU",
    description: "Kiban Collector is the FYSU craft program: objects made by artisans and engineers.",
  },
  fygrances: {
    path: "/fygrances",
    title: "FY'grances — FYSU fragrances",
    description: "FY'grances are the FYSU fragrances, organised by olfactive family.",
  },
  music: {
    path: "/music",
    title: "Music — FYSU",
    description: "Piano, ambient and other albums to accompany the FYSU collections. Listen on the site.",
  },
  games: {
    path: "/games",
    title: "Arcade — FYSU",
    description: "Small games in an embroidery style, made by FYSU. Play right in your browser.",
  },
  about: {
    path: "/about",
    title: "About — FYSU",
    description: "About FYSU: clothing, fragrance and music.",
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
export function organizationJsonLd(locale?: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: SITE_NAME,
      alternateName: ["Fysu", "F.Y.S.U"],
      url: SITE,
      logo: `${SITE}/api/favicon`,
      description: homeCopy(locale).description,
      ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      name: SITE_NAME,
      alternateName: "FYSU Official Site",
      url: SITE,
      inLanguage: locale ?? "en",
      publisher: { "@id": `${SITE}/#organization` },
    },
  ]
}
