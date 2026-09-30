/* ====================================================================
   ORDRE FIXE DES RANGÉES SUR LES PAGES (For her, For him, etc.)
   1. Vestes et manteaux  2. Hauts  3. Pantalons et jupes
   4. Robes  5. Accessoires  6. Chaussures  (le reste à la fin)

   Chaque rangée (section) a un "type". Si aucun type n'est choisi dans l'admin,
   il est deviné d'après le titre (en français, anglais, néerlandais).
   Les préfixes "A. ", "B. " des anciens titres sont ignorés à l'affichage.
   ==================================================================== */

export type RowKind = "coats" | "tops" | "bottoms" | "dresses" | "accessories" | "shoes" | "other"

export const ROW_TYPES: { id: RowKind; label: string; rank: number }[] = [
  { id: "coats", label: "Vestes et manteaux", rank: 1 },
  { id: "tops", label: "Hauts", rank: 2 },
  { id: "bottoms", label: "Pantalons et jupes", rank: 3 },
  { id: "dresses", label: "Robes", rank: 4 },
  { id: "accessories", label: "Accessoires", rank: 5 },
  { id: "shoes", label: "Chaussures", rank: 6 },
  { id: "other", label: "Autre (en dernier)", rank: 99 },
]

const RANK: Record<RowKind, number> = Object.fromEntries(ROW_TYPES.map((t) => [t.id, t.rank])) as Record<
  RowKind,
  number
>

export const isRowKind = (value: unknown): value is RowKind =>
  typeof value === "string" && value in RANK

const KEYWORDS: Record<Exclude<RowKind, "other">, string[]> = {
  coats: [
    "coat", "coats", "jacket", "jackets", "veste", "vestes", "manteau", "manteaux", "blouson",
    "blousons", "parka", "parkas", "outerwear", "trench", "blazer", "blazers", "bomber", "bombers",
    "jas", "jassen", "jack", "jacks", "mantel", "mantels",
  ],
  tops: [
    "top", "tops", "shirt", "shirts", "tee", "tees", "tshirt", "tshirts", "haut", "hauts", "chemise",
    "chemises", "pull", "pulls", "sweater", "sweaters", "sweatshirt", "sweatshirts", "hoodie",
    "hoodies", "knit", "knits", "knitwear", "blouse", "blouses", "cardigan", "cardigans", "tank",
    "polo", "polos", "trui", "truien", "hemd", "hemden", "overhemd", "overhemden", "maille",
  ],
  bottoms: [
    "pant", "pants", "trouser", "trousers", "pantalon", "pantalons", "jean", "jeans", "skirt",
    "skirts", "jupe", "jupes", "short", "shorts", "bottom", "bottoms", "broek", "broeken", "rok",
    "rokken", "legging", "leggings", "denim",
  ],
  dresses: ["dress", "dresses", "robe", "robes", "jurk", "jurken"],
  accessories: [
    "accessory", "accessories", "accessoire", "accessoires", "accessoir", "bag", "bags", "sac", "sacs",
    "hat", "hats", "cap", "caps", "belt", "belts", "scarf", "scarves", "jewelry", "jewellery",
    "bijou", "bijoux", "tas", "tassen", "riem", "riemen", "sjaal", "sjaals", "muts", "casquette",
    "casquettes", "echarpe", "echarpes", "gants", "gloves",
  ],
  shoes: [
    "shoe", "shoes", "chaussure", "chaussures", "sneaker", "sneakers", "boot", "boots", "botte",
    "bottes", "schoen", "schoenen", "footwear", "sandal", "sandals", "sandale", "sandales",
    "basket", "baskets", "loafer", "loafers",
  ],
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

// Enlève un préfixe de tri comme "A. ", "B) ", "1 - " au début d'un titre
export const cleanTitle = (title: string | null | undefined) =>
  (title ?? "").replace(/^\s*(?:[A-Za-z]|\d{1,2})\s*[.)\-–:]\s+/, "").trim()

// Devine le type d'après le titre : le premier mot reconnu gagne
export function detectRowKind(title: string | null | undefined): RowKind {
  const tokens = normalize(cleanTitle(title)).split(/[^a-z]+/).filter(Boolean)

  for (const token of tokens) {
    for (const kind of Object.keys(KEYWORDS) as Exclude<RowKind, "other">[]) {
      if (KEYWORDS[kind].includes(token)) return kind
    }
  }
  return "other"
}

export const getRowKind = (row: { title?: string | null; row_type?: string | null }): RowKind =>
  isRowKind(row.row_type) ? row.row_type : detectRowKind(row.title)

export const getRowRank = (row: { title?: string | null; row_type?: string | null }) =>
  RANK[getRowKind(row)]

export const getRowLabel = (kind: RowKind) => ROW_TYPES.find((t) => t.id === kind)?.label ?? ""

// Tri commun : d'abord le type (ordre fixe), puis l'ordre manuel, puis le titre
export function sortRows<T extends { title?: string | null; row_type?: string | null; display_order?: number | null }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const byRank = getRowRank(a) - getRowRank(b)
    if (byRank !== 0) return byRank
    const byOrder = (a.display_order ?? 0) - (b.display_order ?? 0)
    if (byOrder !== 0) return byOrder
    return cleanTitle(a.title).localeCompare(cleanTitle(b.title))
  })
}
