/* ====================================================================
   TITRES FIXES DU SITE (écrits dans l'admin) QUI DOIVENT ÊTRE TRADUITS
   Une page ou une section qui a un « slug » garde son titre tel quel (c'est le cas d'un nom propre comme
   un album ou une collection). Les titres génériques ci-dessous font exception : ils sont toujours traduits.
   - en / fr / nl / ja : traduction écrite ici (exacte, sans DeepL)
   - autres langues : DeepL, comme le reste du contenu
   Pour ajouter un titre : une ligne, la clé est le titre d'origine en minuscules.
   ==================================================================== */

type Tr = { fr: string; nl: string; ja: string }

const FIXED: Record<string, Tr> = {
  "new in": { fr: "Nouveautés", nl: "Nieuw binnen", ja: "新着" },
  "new": { fr: "Nouveau", nl: "Nieuw", ja: "新着" },
  "new arrivals": { fr: "Nouveautés", nl: "Nieuw binnen", ja: "新着" },
  "new selection": { fr: "Nouvelle sélection", nl: "Nieuwe selectie", ja: "新しいセレクション" },
  "for her": { fr: "Pour elle", nl: "Voor haar", ja: "女性向け" },
  "for him": { fr: "Pour lui", nl: "Voor hem", ja: "男性向け" },
  "for everyone": { fr: "Pour tous", nl: "Voor iedereen", ja: "すべての人に" },
  "best sellers": { fr: "Meilleures ventes", nl: "Bestsellers", ja: "ベストセラー" },
  "bestsellers": { fr: "Meilleures ventes", nl: "Bestsellers", ja: "ベストセラー" },
  "accessories": { fr: "Accessoires", nl: "Accessoires", ja: "アクセサリー" },
  "clothing": { fr: "Vêtements", nl: "Kleding", ja: "ウェア" },
  "essentials": { fr: "Essentiels", nl: "Essentials", ja: "エッセンシャル" },
  "shop all": { fr: "Tout voir", nl: "Alles bekijken", ja: "すべて見る" },
  "all products": { fr: "Tous les produits", nl: "Alle producten", ja: "すべての商品" },
  "sale": { fr: "Soldes", nl: "Sale", ja: "セール" },
  "gifts": { fr: "Cadeaux", nl: "Cadeaus", ja: "ギフト" },
  "gift ideas": { fr: "Idées cadeaux", nl: "Cadeau-ideeën", ja: "ギフトアイデア" },
  "solos": { fr: "Solos", nl: "Solo's", ja: "ソロ" },
  "duos": { fr: "Duos", nl: "Duo's", ja: "デュオ" },
  "collections": { fr: "Collections", nl: "Collecties", ja: "コレクション" },
  "featured": { fr: "À la une", nl: "Uitgelicht", ja: "注目" },
  "recently viewed": { fr: "Vus récemment", nl: "Recent bekeken", ja: "最近見た商品" },
  "you may also like": { fr: "Vous aimerez aussi", nl: "Misschien vind je dit ook leuk", ja: "こちらもおすすめ" },
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ")

export const isFixedTitle = (text: string) => norm(text) in FIXED

/** Traduction écrite ici (fr, nl, ja) ; en : le texte d'origine ; autre langue : undefined (DeepL s'en charge). */
export function fixedTitle(text: string, locale: string): string | undefined {
  const t = FIXED[norm(text)]
  if (!t) return undefined
  if (locale === "en") return text
  return (t as Record<string, string>)[locale]
}
