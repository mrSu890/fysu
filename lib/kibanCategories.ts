/* ====================================================================
   KIBAN COLLECTOR : catégories de la page (en / fr / nl / ja ; les autres langues : anglais)
   Chaque catégorie regroupe des types de produits (voir lib/productTypes.ts).
   Pour changer l'ordre, les titres ou les textes : modifie ce fichier.
   ==================================================================== */

export type KibanCategoryId = "kiban" | "collector" | "clothing" | "accessories" | "more"

export type KibanCategory = {
  id: KibanCategoryId
  types: string[] // types de produits rangés dans cette catégorie
  title: string
  body: string
}

type L4 = { title: string; body: string }

const CATEGORIES: { id: KibanCategoryId; types: string[]; copy: Record<string, L4> }[] = [
  {
    id: "kiban",
    types: ["kiban"],
    copy: {
      en: { title: "Kibans", body: "The heart of the collection." },
      fr: { title: "Kibans", body: "Le cœur de la collection." },
      nl: { title: "Kibans", body: "Het hart van de collectie." },
      ja: { title: "Kiban", body: "コレクションの中心。" },
    },
  },
  {
    id: "clothing",
    types: ["clothing", "shoes"],
    copy: {
      en: { title: "Clothing", body: "Pieces to wear, with the same care as the objects." },
      fr: { title: "Vêtements", body: "Des pièces à porter, avec le même soin que les objets." },
      nl: { title: "Kleding", body: "Stukken om te dragen, met dezelfde zorg als de objecten." },
      ja: { title: "ウェア", body: "オブジェと同じ想いで作られた、身にまとうピース。" },
    },
  },
  {
    id: "collector",
    types: ["collector"],
    copy: {
      en: { title: "Design objects", body: "Pieces to keep, to display, to pass on." },
      fr: { title: "Objets de design", body: "Des pièces à garder, à exposer, à transmettre." },
      nl: { title: "Designobjecten", body: "Stukken om te bewaren, tentoon te stellen en door te geven." },
      ja: { title: "デザインオブジェ", body: "大切に持ち、飾り、受け継ぐためのピース。" },
    },
  },
  {
    id: "accessories",
    types: ["accessory"],
    copy: {
      en: { title: "Accessories", body: "The details that complete everything else." },
      fr: { title: "Accessoires", body: "Les détails qui complètent le reste." },
      nl: { title: "Accessoires", body: "De details die al het andere afmaken." },
      ja: { title: "アクセサリー", body: "すべてを完成させるディテール。" },
    },
  },
  {
    id: "more",
    types: ["fragrance", "skincare", "home", "other"],
    copy: {
      en: { title: "And more", body: "The rest of the collection." },
      fr: { title: "Et aussi", body: "Le reste de la collection." },
      nl: { title: "En meer", body: "De rest van de collectie." },
      ja: { title: "その他", body: "コレクションのその他のアイテム。" },
    },
  },
]

export function getKibanCategories(locale: string): KibanCategory[] {
  return CATEGORIES.map((c) => {
    const l = c.copy[locale] ?? c.copy.en
    return { id: c.id, types: c.types, title: l.title, body: l.body }
  })
}
