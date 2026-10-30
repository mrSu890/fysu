/* ====================================================================
   JEUX D'ARCADE FYSU
   Pour changer le score à atteindre ou le pourcentage de réduction :
   modifie les deux chiffres ci-dessous (REWARD_SCORE / REWARD_PERCENT).
   ==================================================================== */

export const REWARD_SCORE = 100 // score à atteindre dans FYSU Bird pour gagner la réduction
export const REWARD_PERCENT = 10 // pourcentage de réduction
export const REWARD_DAYS = 30 // durée de validité du code

export const GAMES = [
  { slug: "fysu-bird", name: "FYSU Bird", image: "/games-bird-icon.png", cover: "/games-bird-fond.jpg", reward: true },
  { slug: "fysu-pool", name: "FYSU Pool", image: "", cover: "", reward: false },
  { slug: "fysu-hoops", name: "FYSU Hoops", image: "", cover: "", reward: false },
  { slug: "fysu-crossing", name: "FYSU Crossing", image: "", cover: "", reward: false },
  { slug: "fysu-slice", name: "FYSU Slice", image: "", cover: "", reward: false },
] as const

/* clé de stockage du meilleur score (sur l'appareil) */
export const bestKey = (slug: string) => (slug === "fysu-bird" ? "fysu-bird-best" : `${slug}-best`)

/* Descriptions et consignes des jeux sans récompense (fr / en ; autres : anglais) */
type GameText = { tag: string; hint: [string, string] }
const GAME_TEXT: Record<string, Record<string, GameText>> = {
  "fysu-pool": {
    en: { tag: "Pocket a ball with every shot. Miss once and it's over.", hint: ["Drag back from anywhere", "and release to shoot"] },
    fr: { tag: "Rentre une bille à chaque coup. Un seul raté et c'est fini.", hint: ["Tire en arrière n'importe où", "et relâche pour tirer"] },
  },
  "fysu-hoops": {
    en: { tag: "Score as many baskets in a row as you can. A clean swish is worth 2. Miss once and it's over.", hint: ["Swipe up from anywhere", "and release to shoot"] },
    fr: { tag: "Enchaîne les paniers. Un swish (sans toucher l'anneau) vaut 2 points. Un seul raté et c'est fini.", hint: ["Glisse vers le haut", "et relâche pour tirer"] },
  },
  "fysu-crossing": {
    en: { tag: "Cross the highways. The cars don't brake.", hint: ["Tap to go forward", "swipe to go sideways"] },
    fr: { tag: "Traverse les autoroutes. Les voitures ne freinent pas.", hint: ["Touche pour avancer", "glisse pour aller sur le côté"] },
  },
  "fysu-slice": {
    en: { tag: "Slice the flowers with your finger. Avoid the bombs.", hint: ["Swipe through the flowers", "never touch a bomb"] },
    fr: { tag: "Coupe les fleurs avec ton doigt. Évite les bombes.", hint: ["Glisse ton doigt sur les fleurs", "ne touche jamais une bombe"] },
  },
}
export function gameTextFor(slug: string, locale: string): GameText {
  const t = GAME_TEXT[slug]
  return t ? t[locale] ?? t.en : { tag: "", hint: ["", ""] }
}

export type GameSlug = (typeof GAMES)[number]["slug"]

/* Textes (fr / en ; les autres langues : anglais) */
export type GamesCopy = {
  title: string
  intro: string
  play: string
  back: string
  openGames: string
  reward: string
  goal: string
  tapToFly: string
  tapToFly2: string
  lost: string
  score: string
  record: string
  replay: string
  loginToWin: string
  loginCta: string
  yourCode: string
  copy: string
  copied: string
  codeHint: string
  alreadyWon: string
  offlineHint: string
  insertCoin: string
  pressStart: string
  highScore: string
  rewardLabel: string
  goalLabel: string
  offlineLabel: string
  offlineValue: string
  comingSoon: string
  player2: string
}

export const GAMES_COPY: Record<string, GamesCopy> = {
  en: {
    title: "Arcade games",
    intro: "Small games you can play offline. Beat the goal and win a discount.",
    play: "Play",
    back: "Games",
    openGames: "Arcade games",
    reward: `Score ${REWARD_SCORE} → −${REWARD_PERCENT}% on your order`,
    goal: "Goal",
    tapToFly: "Tap the screen or press Space",
    tapToFly2: "to flap your wings",
    lost: "LOST",
    score: "Score",
    record: "Best",
    replay: "Tap to play again",
    loginToWin: `You reached ${REWARD_SCORE}! Sign in to get your −${REWARD_PERCENT}% code.`,
    loginCta: "Sign in",
    yourCode: `Your −${REWARD_PERCENT}% code`,
    copy: "Copy",
    copied: "Copied",
    codeHint: "Enter it at checkout, in the “Add promotion code” field. Single use.",
    alreadyWon: "You already won your code:",
    offlineHint: "Works offline after your first visit.",
    insertCoin: "INSERT COIN TO START",
    pressStart: "PRESS START",
    highScore: "HIGH SCORE",
    rewardLabel: "REWARD",
    goalLabel: "GOAL",
    offlineLabel: "OFFLINE",
    offlineValue: "YES",
    comingSoon: "COMING SOON",
    player2: "PLAYER 2",
  },
  fr: {
    title: "Jeux d'arcade",
    intro: "De petits jeux jouables hors-ligne. Atteins l'objectif et gagne une réduction.",
    play: "Jouer",
    back: "Jeux",
    openGames: "Jeux d'arcade",
    reward: `Score ${REWARD_SCORE} → −${REWARD_PERCENT} % sur ta commande`,
    goal: "Objectif",
    tapToFly: "Touche l'écran ou Espace",
    tapToFly2: "pour battre des ailes",
    lost: "PERDU",
    score: "Score",
    record: "Record",
    replay: "Touche pour rejouer",
    loginToWin: `Tu as atteint ${REWARD_SCORE} ! Connecte-toi pour recevoir ton code −${REWARD_PERCENT} %.`,
    loginCta: "Se connecter",
    yourCode: `Ton code −${REWARD_PERCENT} %`,
    copy: "Copier",
    copied: "Copié",
    codeHint: "À saisir au paiement, dans « Ajouter un code promo ». Utilisable une seule fois.",
    alreadyWon: "Tu as déjà gagné ton code :",
    offlineHint: "Fonctionne hors-ligne après ta première visite.",
    insertCoin: "INSÈRE UNE PIÈCE POUR JOUER",
    pressStart: "APPUIE SUR START",
    highScore: "MEILLEUR SCORE",
    rewardLabel: "RÉCOMPENSE",
    goalLabel: "OBJECTIF",
    offlineLabel: "HORS-LIGNE",
    offlineValue: "OUI",
    comingSoon: "BIENTÔT",
    player2: "JOUEUR 2",
  },
}

export function gamesCopyFor(locale: string): GamesCopy {
  return GAMES_COPY[locale] ?? GAMES_COPY.en
}
