import { useLocale, useMessages } from "next-intl"

/* ====================================================================
   TEXTES ÉCRITS DANS LE CODE (pas dans l'admin), dans les 4 langues.
   Pour modifier un texte : change-le ici, dans la bonne langue.
   Pour ajouter une langue : ajoute un bloc avec le même contenu.
   ==================================================================== */

export type SiteCopy = {
  learnMore: string
  discover: string
  fygrancesText: string
  bloomTitle: string
  bloomText: string
  heroTitle: string
  heroSubtitle: string
  kibanText: string
  waveText: string
}

const COPY: Record<string, SiteCopy> = {
  en: {
    learnMore: "Learn more",
    discover: "Discover",
    fygrancesText:
      "Scents inspired by, and made to accompany, our emotional and psychic states. Each FY'grance goes with the mood of the moment.",
    bloomTitle: "When the flowers bloom",
    bloomText:
      "A recurring spring collection. It appears every year during spring then vanishes until when the flowers bloom again.",
    heroTitle: "SPRING SPIRIT",
    heroSubtitle: "When Sakuras Meet Denim",
    kibanText:
      "Kiban Collector is FYSU's craft program: an experimental lab where artisans and engineers work side by side. Together, they create objects.",
    waveText:
      "TheWave is a FYSU line of knitwear and summer accessories, worn just before summer, all summer long and just after. It is also a music production platform.",
  },
  fr: {
    learnMore: "En savoir plus",
    discover: "Découvrir",
    fygrancesText:
      "Des parfums inspirés de nos états émotionnels et psychiques, conçus pour les accompagner. Chaque FY'grance accompagne l'humeur du moment.",
    bloomTitle: "Quand les fleurs éclosent",
    bloomText:
      "Une collection de printemps récurrente. Elle revient chaque année au printemps, puis disparaît jusqu'à ce que les fleurs éclosent à nouveau.",
    heroTitle: "ESPRIT DE PRINTEMPS",
    heroSubtitle: "Quand les sakuras rencontrent le denim",
    kibanText:
      "Kiban Collector est le programme artisanal de FYSU : un laboratoire d'expérimentation où artisans et ingénieurs travaillent côte à côte. Ensemble, ils créent des objets.",
    waveText:
      "TheWave est une ligne FYSU de knitwear et d'accessoires d'été, à porter juste avant l'été, tout l'été et juste après. C'est aussi une plateforme de production musicale.",
  },
  nl: {
    learnMore: "Meer info",
    discover: "Ontdekken",
    fygrancesText:
      "Geuren geïnspireerd door onze emotionele en psychische toestanden, gemaakt om ze te begeleiden. Elke FY'grance begeleidt de stemming van het moment.",
    bloomTitle: "Wanneer de bloemen bloeien",
    bloomText:
      "Een terugkerende lentecollectie. Ze verschijnt elk jaar in de lente en verdwijnt daarna tot de bloemen weer bloeien.",
    heroTitle: "LENTEGEEST",
    heroSubtitle: "Wanneer sakura's denim ontmoeten",
    kibanText:
      "Kiban Collector is het ambachtelijke programma van FYSU: een experimenteel lab waar ambachtslieden en ingenieurs zij aan zij werken. Samen maken ze objecten.",
    waveText:
      "TheWave is een FYSU-lijn van knitwear en zomeraccessoires, te dragen net voor de zomer, de hele zomer en net erna. Het is ook een platform voor muziekproductie.",
  },
  ja: {
    learnMore: "詳しく見る",
    discover: "見てみる",
    fygrancesText:
      "私たちの感情や心の状態からインスピレーションを得て、それに寄り添うために生まれた香り。それぞれのFY'granceは、その時々の気分に寄り添います。",
    bloomTitle: "花が咲くとき",
    bloomText:
      "毎年春に登場するコレクション。春の間だけ現れ、花が再び咲くときまで姿を消します。",
    heroTitle: "スプリング・スピリット",
    heroSubtitle: "桜がデニムと出会うとき",
    kibanText:
      "Kiban Collector は FYSU のクラフトプログラム。職人とエンジニアが並んで取り組む実験的なラボです。彼らは共に、オブジェを生み出します。",
    waveText:
      "TheWave は、ニットウェアと夏のアクセサリーを展開する FYSU のライン。夏の直前、夏のあいだ、夏の直後に着るためのものです。音楽制作のプラットフォームでもあります。",
  },
}

// À utiliser dans les composants clients : const copy = useSiteCopy()
export function useSiteCopy(): SiteCopy {
  const locale = useLocale()
  const messages = useMessages() as { SiteCopy?: Partial<SiteCopy> }
  if (COPY[locale]) return COPY[locale]
  return { ...COPY.en, ...(messages.SiteCopy ?? {}) }
}
