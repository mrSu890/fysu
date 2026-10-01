/* ====================================================================
   TEXTES DE LA PAGE FY'GRANCES (en / fr / nl / ja ; les autres langues : anglais)
   Pour changer un texte : modifie-le ici, dans la bonne langue.
   Les titres, textes et images des chapitres se changent dans Admin > FY'grances
   (les textes ci-dessous servent quand un chapitre est laissé vide).
   ==================================================================== */

export type FygrancesCopy = {
  eyebrow: string
  manifesto: string[]
  closing: string[]
  familiesTitle: string
  allFamilies: string
  otherFamily: string
  familyLabel: string
  moreTitle: string
  chapters: Record<"parfums" | "soins" | "maison", { title: string; body: string }>
}

const COPY: Record<string, FygrancesCopy> = {
  en: {
    eyebrow: "The fysu olfactive vision",
    manifesto: [
      "Our relationship with fragrance has changed deeply. Long tied to seduction and the image we project, it is becoming more intimate and personal: after a shower, before sleep, while working, reading, travelling.",
      "Fragrance accompanies silent, everyday, often invisible states of life. Nature, calm, ritual, sensory well-being: fysu is interested in what comes after.",
      "We explore how scents, accords, textures and sensory environments can accompany precise emotional and psychological states. A discreet presence that follows the inner rhythm rather than producing an outer image.",
    ],
    closing: ["Concentration.", "Rest.", "Nostalgia.", "Productivity."],
    familiesTitle: "Olfactive families",
    allFamilies: "All",
    otherFamily: "Other",
    familyLabel: "Olfactive family",
    moreTitle: "And also",
    chapters: {
      parfums: {
        title: "Fragrances",
        body: "Each fragrance carries the name of a state: Fatigue, Saudade… A scent designed as a personal environment, worn for yourself more than for others. Choose by olfactive family, from the freshest to the deepest.",
      },
      soins: {
        title: "Care",
        body: "Care extends the same gesture: a short ritual, a simple material, a scent that stays close to the skin. For the moments that belong only to you.",
      },
      maison: {
        title: "Home",
        body: "Home diffusion and everyday objects: the scent becomes an invisible setting that accompanies reading, work or rest.",
      },
    },
  },
  fr: {
    eyebrow: "La vision olfactive fysu",
    manifesto: [
      "Le rapport au parfum a profondément évolué. Longtemps associé à la séduction et à l'image projetée, il devient plus intime et personnel : après une douche, avant de dormir, en travaillant, en lisant, en voyageant.",
      "Le parfum accompagne des états de vie silencieux, quotidiens et souvent invisibles. Nature, calme, rituel, bien-être sensoriel : fysu s'intéresse à ce qui vient après.",
      "Nous explorons la manière dont les odeurs, les accords, les textures et les environnements sensoriels peuvent accompagner des états émotionnels et psychologiques précis. Une présence discrète qui suit le rythme intérieur plus qu'elle ne produit une image extérieure.",
    ],
    closing: ["Concentration.", "Repos.", "Nostalgie.", "Productivité."],
    familiesTitle: "Familles olfactives",
    allFamilies: "Toutes",
    otherFamily: "Autres",
    familyLabel: "Famille olfactive",
    moreTitle: "Et aussi",
    chapters: {
      parfums: {
        title: "Parfums",
        body: "Chaque parfum porte le nom d'un état : Fatigue, Saudade… Une odeur pensée comme un environnement personnel, à porter pour soi plus que pour les autres. Choisissez par famille olfactive, des plus fraîches aux plus profondes.",
      },
      soins: {
        title: "Soins",
        body: "Le soin prolonge le même geste : un rituel court, une matière simple, une odeur qui reste proche de la peau. Pour les moments qui n'appartiennent qu'à vous.",
      },
      maison: {
        title: "Maison",
        body: "Diffusion d'intérieur et objets du quotidien : l'odeur devient un décor invisible, qui accompagne la lecture, le travail ou le repos.",
      },
    },
  },
  nl: {
    eyebrow: "De olfactieve visie van fysu",
    manifesto: [
      "Onze relatie met parfum is diep veranderd. Lang verbonden met verleiding en het beeld dat we uitstralen, wordt het persoonlijker en intiemer: na het douchen, voor het slapen, tijdens het werken, lezen en reizen.",
      "Parfum begeleidt stille, alledaagse en vaak onzichtbare levenstoestanden. Natuur, rust, ritueel, zintuiglijk welzijn: fysu kijkt naar wat daarna komt.",
      "We onderzoeken hoe geuren, accoorden, texturen en zintuiglijke omgevingen precieze emotionele en psychologische toestanden kunnen begeleiden. Een discrete aanwezigheid die het innerlijke ritme volgt, niet een beeld naar buiten.",
    ],
    closing: ["Concentratie.", "Rust.", "Nostalgie.", "Productiviteit."],
    familiesTitle: "Geurfamilies",
    allFamilies: "Alle",
    otherFamily: "Overige",
    familyLabel: "Geurfamilie",
    moreTitle: "En ook",
    chapters: {
      parfums: {
        title: "Parfums",
        body: "Elk parfum draagt de naam van een toestand: Fatigue, Saudade… Een geur als persoonlijke omgeving, om voor jezelf te dragen. Kies per geurfamilie, van het frisst tot het diepst.",
      },
      soins: {
        title: "Verzorging",
        body: "Verzorging zet hetzelfde gebaar voort: een kort ritueel, een eenvoudig materiaal, een geur dicht bij de huid. Voor de momenten die alleen van jou zijn.",
      },
      maison: {
        title: "Huis",
        body: "Geurverspreiding voor thuis en alledaagse objecten: de geur wordt een onzichtbaar decor bij lezen, werken of rusten.",
      },
    },
  },
  ja: {
    eyebrow: "fysu の香りのビジョン",
    manifesto: [
      "香りとの関係は大きく変わりました。かつては魅力や見せたい姿と結びついていた香りは、よりプライベートで個人的なものになっています。シャワーの後、眠る前、仕事中、読書中、旅の途中。",
      "香りは、静かで日常的な、目に見えない生活の状態に寄り添います。自然、静けさ、儀式、感覚的なウェルビーイング。fysu が関心を持つのは、その先にあるものです。",
      "香り、アコード、質感、感覚的な環境が、特定の感情や心理の状態にどう寄り添えるかを探ります。外へ向けたイメージではなく、内側のリズムに寄り添うさりげない存在です。",
    ],
    closing: ["集中。", "休息。", "ノスタルジア。", "生産性。"],
    familiesTitle: "香りのファミリー",
    allFamilies: "すべて",
    otherFamily: "その他",
    familyLabel: "香りのファミリー",
    moreTitle: "その他",
    chapters: {
      parfums: {
        title: "パルファン",
        body: "それぞれの香りは、ひとつの状態の名前を持ちます。Fatigue、Saudade…。他人のためではなく自分のための、パーソナルな環境としての香り。ファミリーごとに、最も爽やかなものから深いものまで選べます。",
      },
      soins: {
        title: "ケア",
        body: "ケアは同じ仕草の延長です。短い儀式、シンプルな素材、肌のそばに留まる香り。あなただけの時間のために。",
      },
      maison: {
        title: "ホーム",
        body: "ルームディフュージョンと日用品。香りは、読書や仕事、休息に寄り添う見えない背景になります。",
      },
    },
  },
}

export function getFygrancesCopy(locale: string): FygrancesCopy {
  return COPY[locale] ?? COPY.en
}
