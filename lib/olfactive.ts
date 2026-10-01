/* ====================================================================
   FAMILLES OLFACTIVES
   Rangées des plus fraîches aux plus profondes : c'est l'ordre d'affichage
   sur la page FY'grances et dans les pastilles.
   Pour changer un nom ou une phrase : modifie-le ici, dans la bonne langue.
   ==================================================================== */

export type FamilyId =
  | "frais"
  | "vert"
  | "floral"
  | "musque"
  | "boise"
  | "epice"
  | "fume"
  | "cuire"

export const FAMILY_ORDER: FamilyId[] = [
  "frais",
  "vert",
  "floral",
  "musque",
  "boise",
  "epice",
  "fume",
  "cuire",
]

type L4 = { en: string; fr: string; nl: string; ja: string }

const FAMILIES: Record<FamilyId, { name: L4; line: L4 }> = {
  frais: {
    name: { en: "Fresh", fr: "Frais", nl: "Fris", ja: "フレッシュ" },
    line: {
      en: "Air, water, clarity. Bright accords that lighten and wake.",
      fr: "Air, eau, clarté. Des accords vifs qui allègent et réveillent.",
      nl: "Lucht, water, helderheid. Heldere accoorden die verlichten en wakker maken.",
      ja: "空気、水、透明感。軽やかに目覚めさせる爽やかなアコード。",
    },
  },
  vert: {
    name: { en: "Green", fr: "Vert", nl: "Groen", ja: "グリーン" },
    line: {
      en: "Crushed leaves, stems, cut grass. Plants in their raw state.",
      fr: "Feuilles froissées, tiges, herbe coupée. Le végétal à l'état brut.",
      nl: "Gekneusde bladeren, stengels, gemaaid gras. Planten in hun ruwe staat.",
      ja: "もんだ葉、茎、刈りたての草。素のままの植物。",
    },
  },
  floral: {
    name: { en: "Floral", fr: "Floral", nl: "Bloemig", ja: "フローラル" },
    line: {
      en: "Petals, pollen, white or wild flowers. A softness that stays discreet.",
      fr: "Pétales, pollen, fleurs blanches ou sauvages. Une douceur qui reste discrète.",
      nl: "Bloemblaadjes, stuifmeel, witte of wilde bloemen. Een zachtheid die discreet blijft.",
      ja: "花びら、花粉、白い花や野の花。控えめに寄り添うやわらかさ。",
    },
  },
  musque: {
    name: { en: "Musky", fr: "Musqué", nl: "Muskusachtig", ja: "ムスク" },
    line: {
      en: "Skin, cotton, clean warmth. A soft, almost silent presence.",
      fr: "Peau, coton, chaleur propre. Une présence douce, presque silencieuse.",
      nl: "Huid, katoen, schone warmte. Een zachte, bijna stille aanwezigheid.",
      ja: "肌、コットン、清潔なぬくもり。静かでやわらかな存在感。",
    },
  },
  boise: {
    name: { en: "Woody", fr: "Boisé", nl: "Houtachtig", ja: "ウッディ" },
    line: {
      en: "Dry wood, roots, resins. A calm base that grounds.",
      fr: "Bois sec, racines, résines. Un fond calme qui ancre.",
      nl: "Droog hout, wortels, harsen. Een rustige basis die aardt.",
      ja: "乾いた木、根、樹脂。心を落ち着かせる静かなベース。",
    },
  },
  epice: {
    name: { en: "Spicy", fr: "Épicé", nl: "Kruidig", ja: "スパイシー" },
    line: {
      en: "Pepper, cardamom, ginger. A clear warmth, a slight tension.",
      fr: "Poivre, cardamome, gingembre. Une chaleur nette, une légère tension.",
      nl: "Peper, kardemom, gember. Een heldere warmte, een lichte spanning.",
      ja: "胡椒、カルダモン、ジンジャー。くっきりした温かさと、かすかな緊張感。",
    },
  },
  fume: {
    name: { en: "Smoky", fr: "Fumé", nl: "Rokerig", ja: "スモーキー" },
    line: {
      en: "Incense, embers, burnt wood. A slow trace that lingers.",
      fr: "Encens, braises, bois brûlé. Une trace lente qui s'attarde.",
      nl: "Wierook, gloed, verbrand hout. Een trage sporen die blijft hangen.",
      ja: "お香、燠火、焦げた木。ゆっくりと残る余韻。",
    },
  },
  cuire: {
    name: { en: "Leathery", fr: "Cuiré", nl: "Leerachtig", ja: "レザー" },
    line: {
      en: "Leather, suede, tobacco. Dark, shaped, deep materials.",
      fr: "Cuir, daim, tabac. Des matières sombres, dessinées, profondes.",
      nl: "Leer, suède, tabak. Donkere, vormvaste, diepe materialen.",
      ja: "革、スエード、タバコ。暗く、輪郭のある深い素材。",
    },
  },
}

const LOCALES = ["en", "fr", "nl", "ja"] as const
const pick = (l4: L4, locale: string) =>
  l4[((LOCALES as readonly string[]).includes(locale) ? locale : "en") as keyof L4]

export function isFamilyId(value: unknown): value is FamilyId {
  return typeof value === "string" && value in FAMILIES
}

export function getFamilyCopy(id: FamilyId, locale: string) {
  const f = FAMILIES[id]
  return { id, name: pick(f.name, locale), line: pick(f.line, locale) }
}

// Pour la liste déroulante de l'admin (en français)
export const FAMILY_ADMIN_LIST = FAMILY_ORDER.map((id) => ({ id, label: FAMILIES[id].name.fr }))
