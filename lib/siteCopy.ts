import { useLocale } from "next-intl"

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
      "Scents inspired by, and made to accompany, our emotional and psychic states. Each FY'grance is a quiet companion for the mood of the moment.",
    bloomTitle: "When the flowers bloom",
    bloomText:
      "A recurring timeless spring collection built around an expressive, young and curious style. The collection appears every year during spring then vanishes until when the flowers bloom again.",
    heroTitle: "SPRING SPIRIT",
    heroSubtitle: "When Sakuras Meet Denim",
    kibanText:
      "Kiban Collector is FYSU's craft program: an experimental lab where artisans and engineers work side by side. Together, they create objects of exceptional craftsmanship, made to leave a mark on culture.",
    waveText:
      "TheWave is a relaxed brand of colorful knitwear and summer accessories. It keeps you company through the simple moments: just before summer begins, all summer long, and just after it ends. It is also a music production and curation platform.",
  },
  fr: {
    learnMore: "En savoir plus",
    discover: "Découvrir",
    fygrancesText:
      "Des parfums inspirés de nos états émotionnels et psychiques, conçus pour les accompagner. Chaque FY'grance est un compagnon discret de l'humeur du moment.",
    bloomTitle: "Quand les fleurs éclosent",
    bloomText:
      "Une collection de printemps intemporelle et récurrente, construite autour d'un style expressif, jeune et curieux. Elle revient chaque année au printemps, puis disparaît jusqu'à ce que les fleurs éclosent à nouveau.",
    heroTitle: "ESPRIT DE PRINTEMPS",
    heroSubtitle: "Quand les sakuras rencontrent le denim",
    kibanText:
      "Kiban Collector est le programme artisanal de FYSU : un laboratoire d'expérimentation où artisans et ingénieurs travaillent côte à côte. Ensemble, ils créent des objets d'un savoir-faire d'exception, faits pour marquer la culture.",
    waveText:
      "TheWave est une marque décontractée de knitwear coloré et d'accessoires d'été. Elle accompagne les moments simples : juste avant que l'été commence, tout l'été, et juste après. C'est aussi une plateforme de production et de curation musicale.",
  },
  nl: {
    learnMore: "Meer info",
    discover: "Ontdekken",
    fygrancesText:
      "Geuren geïnspireerd door onze emotionele en psychische toestanden, gemaakt om ze te begeleiden. Elke FY'grance is een stille metgezel voor de stemming van het moment.",
    bloomTitle: "Wanneer de bloemen bloeien",
    bloomText:
      "Een terugkerende, tijdloze lentecollectie rond een expressieve, jonge en nieuwsgierige stijl. De collectie verschijnt elk jaar in de lente en verdwijnt daarna tot de bloemen weer bloeien.",
    heroTitle: "LENTEGEEST",
    heroSubtitle: "Wanneer sakura's denim ontmoeten",
    kibanText:
      "Kiban Collector is het ambachtelijke programma van FYSU: een experimenteel lab waar ambachtslieden en ingenieurs zij aan zij werken. Samen creëren ze objecten van uitzonderlijk vakmanschap, gemaakt om een stempel op de cultuur te drukken.",
    waveText:
      "TheWave is een ontspannen merk van kleurrijke knitwear en zomeraccessoires. Het begeleidt de simpele momenten: net voordat de zomer begint, de hele zomer lang en net nadat hij voorbij is. Het is ook een platform voor muziekproductie en -curatie.",
  },
  ja: {
    learnMore: "詳しく見る",
    discover: "見てみる",
    fygrancesText:
      "私たちの感情や心の状態からインスピレーションを得て、それに寄り添うために生まれた香り。それぞれのFY'granceは、その時々の気分にそっと寄り添う静かな相棒です。",
    bloomTitle: "花が咲くとき",
    bloomText:
      "表現力豊かで若々しく、好奇心あふれるスタイルを軸にした、毎年春に登場する不朽のコレクション。春の間だけ現れ、花が再び咲くときまで姿を消します。",
    heroTitle: "スプリング・スピリット",
    heroSubtitle: "桜がデニムと出会うとき",
    kibanText:
      "Kiban Collector は FYSU のクラフトプログラム。職人とエンジニアが並んで取り組む実験的なラボです。彼らは共に、文化に足跡を残すために生まれた、卓越した技術の作品を生み出します。",
    waveText:
      "TheWave は、カラフルなニットウェアと夏のアクセサリーを手がけるリラックスしたブランド。夏が始まる直前、夏のあいだ、そして夏が終わった直後のさりげない時間に寄り添います。音楽の制作とキュレーションのプラットフォームでもあります。",
  },
}

// À utiliser dans les composants clients : const copy = useSiteCopy()
export function useSiteCopy(): SiteCopy {
  const locale = useLocale()
  return COPY[locale] ?? COPY.en
}
