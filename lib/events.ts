/* ====================================================================
   PAGES « ÉVENT » (documenter une soirée, une expo, un moment)
   Pas des pages commerciales : des pages qui racontent.
   Pour ajouter un évent : ajoute un objet dans EVENTS ci-dessous,
   mets ses images dans public/images, et la page existe sur /<slug>.
   Les blocs s'affichent dans l'ordre où ils sont écrits.
   ==================================================================== */

export type Lang = { fr: string; en: string }
export type EventImage = { src: string; alt: Lang; w: number; h: number }

export type EventBlock =
  | { type: "text"; label?: Lang; paragraphs: Lang[] }
  | { type: "image"; image: EventImage; narrow?: boolean }
  | { type: "pair"; a: EventImage; b: EventImage }
  | { type: "carousel"; images: EventImage[] } // petit carrousel (les looks)
  | { type: "link"; label: Lang; href: string }
  | {
      // le menu des cocktails : schéma en deux cercles dans une ellipse (exactement 2 cocktails)
      type: "menu"
      label: Lang
      title: Lang
      intro: Lang
      heading: string
      items: { name: string; tag: string; ingredients: string[] }[]
    }

export type EventData = {
  slug: string
  title: string
  eyebrow: Lang
  intro: Lang
  facts: { label: Lang; value: Lang }[]
  hero: EventImage
  heroPosition?: string
  blocks: EventBlock[]
}

const img = (n: string, w: number, h: number, fr: string, en: string): EventImage => ({
  src: `/images/oken-${n}.jpg`,
  w,
  h,
  alt: { fr, en },
})

export const EVENTS: EventData[] = [
  {
    slug: "fysu-at-oken",
    title: "FYSU at Ökēn",
    eyebrow: { fr: "Évent · Bruxelles", en: "Event · Brussels" },
    intro: {
      fr: "Une soirée, un lieu, une collection. When the flowers bloom a pris place à Ökēn, le bar caché sous TheMerode.",
      en: "One evening, one place, one collection. When the flowers bloom took over Ökēn, the bar hidden beneath TheMerode.",
    },
    facts: [
      { label: { fr: "Lieu", en: "Place" }, value: { fr: "Ökēn, sous TheMerode, place Poelaert 6, Bruxelles", en: "Ökēn, beneath TheMerode, Place Poelaert 6, Brussels" } },
      { label: { fr: "Collection", en: "Collection" }, value: { fr: "When the flowers bloom", en: "When the flowers bloom" } },
      { label: { fr: "Collab", en: "Collab" }, value: { fr: "Labarik, cocktails", en: "Labarik, cocktails" } },
      { label: { fr: "Musique", en: "Music" }, value: { fr: "Curation FYSU", en: "FYSU curation" } },
    ],
    hero: img("01", 2000, 1333, "Une silhouette FYSU sous un kiban, dans la pénombre d'Ökēn", "A FYSU look under a kiban, in the half-light of Ökēn"),
    heroPosition: "72% 50%",
    blocks: [
      {
        type: "text",
        label: { fr: "Le lieu", en: "The place" },
        paragraphs: [
          {
            fr: "Ökēn s'est installé dans l'ancien parking sous l'hôtel particulier de TheMerode. Les architectes d'Erased Studio y ont dressé des monolithes de bar et des parois lumineuses.",
            en: "Ökēn sits in the former car park beneath the TheMerode mansion. The architects of Erased Studio filled it with sculptural bar monoliths and glowing walls.",
          },
          {
            fr: "Une pénombre chaude, où les pièces sortent de l'ombre une à une.",
            en: "A warm half-light, where the pieces step out of the dark one by one.",
          },
        ],
      },
      {
        type: "text",
        label: { fr: "La collection", en: "The collection" },
        paragraphs: [
          {
            fr: "Chaque silhouette a eu son piédestal et son kiban. La lumière a fait le reste.",
            en: "Each look had its plinth and its kiban. The light did the rest.",
          },
        ],
      },
      {
        type: "carousel",
        images: [
          img("02", 1202, 1700, "Un trench sous un kiban noir", "A trench coat under a black kiban"),
          img("06", 1202, 1700, "Veste en denim brodée de fleurs de cerisier", "Denim jacket embroidered with cherry blossoms"),
          img("07", 1202, 1700, "Veste rouge et chemise blanche", "Red jacket and white shirt"),
          img("11", 1202, 1700, "Chemise bleue et pantalon noir", "Blue shirt and black trousers"),
        ],
      },
      { type: "image", image: img("05", 847, 1500, "Aëro et Bira devant une paroi lumineuse", "Aëro and Bira in front of a glowing wall"), narrow: true },
      {
        type: "menu",
        label: { fr: "Le menu", en: "The menu" },
        title: { fr: "Deux cocktails", en: "Two cocktails" },
        intro: {
          fr: "Avec Labarik, deux cocktails, Aëro et Bira, ont été pensés comme des prolongements de l'atmosphère de la collection.",
          en: "With Labarik, two cocktails, Aëro and Bira, were developed as extensions of the collection's atmosphere.",
        },
        heading: "[COCKTAILS]",
        items: [
          { name: "Aëro", tag: "Alcoholic", ingredients: ["Gin roku sakura", "Choya", "Alizes winds tea", "Citrus fruits cordial", "Alizes winds tea foam"] },
          { name: "Bira", tag: "Non-alcoholic", ingredients: ["Hibiscus, Mint & Ginger", "Purple shiso leaves", "Yuzu", "CO²"] },
        ],
      },
      {
        type: "text",
        label: { fr: "La musique", en: "The music" },
        paragraphs: [
          {
            fr: "Une curation musicale a accompagné la soirée. Elle est à retrouver sur le site.",
            en: "A music curation accompanied the evening. You can find it on the site.",
          },
        ],
      },
      { type: "image", image: img("08", 1900, 1266, "Un DJ en silhouette devant une paroi lumineuse", "A DJ in silhouette against a glowing wall") },
      { type: "link", label: { fr: "Écouter la sélection", en: "Listen to the selection" }, href: "/music" },
    ],
  },
]

export const getEvent = (slug: string | undefined) => EVENTS.find((e) => e.slug === slug)
