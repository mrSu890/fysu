/* ====================================================================
   TYPES DE PRODUITS (vêtement, chaussure, accessoire, parfum, soin…)
   Un seul endroit pour régler : les tailles proposées, les libellés
   des textes de la fiche et ce qui est affiché ou caché.
   ==================================================================== */

export type ProductTypeId =
  | "clothing"
  | "shoes"
  | "accessory"
  | "collector"
  | "kiban"
  | "fragrance"
  | "skincare"
  | "home"
  | "other"

type L4 = { en: string; fr: string; nl: string; ja: string }

export type ProductTypeConfig = {
  id: ProductTypeId
  label: string // nom affiché dans l'admin
  emoji: string
  // tailles proposées automatiquement à la création
  presets: string[]
  // mot utilisé pour les tailles dans l'admin (onglet) et sur le site (titre du sélecteur)
  sizeNoun: L4 | null // null = mot par défaut du site (« Taille »)
  sizeNounAdmin: string
  // affiche le lien « guide des tailles »
  sizeGuide: boolean
  // affiche le champ Genre
  showGender: boolean
  // libellés des 3 textes (undefined = libellé par défaut, false = champ caché)
  details?: L4
  size_fit?: L4 | false
  care?: L4 | false
}

export const PRODUCT_TYPES: Record<ProductTypeId, ProductTypeConfig> = {
  clothing: {
    id: "clothing",
    label: "Vêtement",
    emoji: "👕",
    presets: ["XS", "S", "M", "L", "XL"],
    sizeNoun: null,
    sizeNounAdmin: "Tailles",
    sizeGuide: true,
    showGender: true,
  },
  shoes: {
    id: "shoes",
    label: "Chaussure",
    emoji: "👟",
    presets: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"],
    sizeNoun: { en: "Shoe size", fr: "Pointure", nl: "Schoenmaat", ja: "靴のサイズ" },
    sizeNounAdmin: "Pointures",
    sizeGuide: true,
    showGender: true,
    size_fit: { en: "Fit", fr: "Chaussant", nl: "Pasvorm", ja: "フィット" },
  },
  accessory: {
    id: "accessory",
    label: "Accessoire",
    emoji: "👜",
    presets: ["One size"],
    sizeNoun: null,
    sizeNounAdmin: "Tailles",
    sizeGuide: false,
    showGender: true,
    size_fit: { en: "Dimensions", fr: "Dimensions", nl: "Afmetingen", ja: "サイズ詳細" },
  },
  collector: {
    id: "collector",
    label: "Objet de design",
    emoji: "🏆",
    presets: ["One size"],
    sizeNoun: null,
    sizeNounAdmin: "Variantes",
    sizeGuide: false,
    showGender: false,
    size_fit: { en: "Dimensions", fr: "Dimensions", nl: "Afmetingen", ja: "サイズ詳細" },
    care: { en: "Care", fr: "Entretien", nl: "Onderhoud", ja: "お手入れ" },
  },
  kiban: {
    id: "kiban",
    label: "Kiban",
    emoji: "☂️",
    presets: ["One size"],
    sizeNoun: null,
    sizeNounAdmin: "Variantes",
    sizeGuide: false,
    showGender: false,
    size_fit: { en: "Dimensions", fr: "Dimensions", nl: "Afmetingen", ja: "サイズ詳細" },
    care: { en: "Care", fr: "Entretien", nl: "Onderhoud", ja: "お手入れ" },
  },
  fragrance: {
    id: "fragrance",
    label: "Parfum",
    emoji: "🧴",
    presets: ["30 ml", "50 ml", "100 ml"],
    sizeNoun: { en: "Volume", fr: "Contenance", nl: "Inhoud", ja: "容量" },
    sizeNounAdmin: "Contenances",
    sizeGuide: false,
    showGender: true,
    details: { en: "Olfactive notes", fr: "Notes olfactives", nl: "Geurnoten", ja: "香りのノート" },
    size_fit: { en: "Ingredients", fr: "Ingrédients", nl: "Ingrediënten", ja: "成分" },
    care: { en: "Usage", fr: "Conseils d'utilisation", nl: "Gebruik", ja: "使用方法" },
  },
  skincare: {
    id: "skincare",
    label: "Soin / crème",
    emoji: "🧼",
    presets: ["50 ml", "100 ml", "200 ml"],
    sizeNoun: { en: "Volume", fr: "Contenance", nl: "Inhoud", ja: "容量" },
    sizeNounAdmin: "Contenances",
    sizeGuide: false,
    showGender: false,
    size_fit: { en: "Ingredients", fr: "Ingrédients", nl: "Ingrediënten", ja: "成分" },
    care: { en: "How to use", fr: "Mode d'emploi", nl: "Gebruiksaanwijzing", ja: "使い方" },
  },
  home: {
    id: "home",
    label: "Maison / diffusion",
    emoji: "🕯️",
    presets: ["One size"],
    sizeNoun: null,
    sizeNounAdmin: "Variantes",
    sizeGuide: false,
    showGender: false,
    size_fit: { en: "Dimensions", fr: "Dimensions", nl: "Afmetingen", ja: "サイズ詳細" },
    care: { en: "Usage", fr: "Conseils d'utilisation", nl: "Gebruik", ja: "使用方法" },
  },
  other: {
    id: "other",
    label: "Autre",
    emoji: "📦",
    presets: ["One size"],
    sizeNoun: null,
    sizeNounAdmin: "Variantes",
    sizeGuide: false,
    showGender: false,
    size_fit: false,
    care: false,
  },
}

export const PRODUCT_TYPE_LIST = Object.values(PRODUCT_TYPES)

export function isProductType(value: unknown): value is ProductTypeId {
  return typeof value === "string" && value in PRODUCT_TYPES
}

export function getProductType(value: string | null | undefined): ProductTypeConfig {
  return isProductType(value) ? PRODUCT_TYPES[value] : PRODUCT_TYPES.clothing
}

const LOCALES = ["en", "fr", "nl", "ja"] as const
function pick(l4: L4, locale: string) {
  const key = (LOCALES as readonly string[]).includes(locale) ? (locale as keyof L4) : "en"
  return l4[key]
}

/** Libellés pour le site public (null = utiliser la traduction par défaut, false = ne pas afficher) */
export function getTypeCopy(type: string | null | undefined, locale: string) {
  const cfg = getProductType(type)
  return {
    sizeTitle: cfg.sizeNoun ? pick(cfg.sizeNoun, locale) : null,
    details: cfg.details ? pick(cfg.details, locale) : null,
    sizeFit: cfg.size_fit === false ? (false as const) : cfg.size_fit ? pick(cfg.size_fit, locale) : null,
    care: cfg.care === false ? (false as const) : cfg.care ? pick(cfg.care, locale) : null,
    sizeGuide: cfg.sizeGuide,
  }
}

/** Libellés pour l'admin (en français) */
export function getAdminLabels(type: string | null | undefined) {
  const cfg = getProductType(type)
  return {
    details: cfg.details ? cfg.details.fr : "Détails",
    sizeFit: cfg.size_fit === false ? null : cfg.size_fit ? cfg.size_fit.fr : "Coupe et taille (size fit)",
    care: cfg.care === false ? null : cfg.care ? cfg.care.fr : "Entretien (care instructions)",
  }
}
