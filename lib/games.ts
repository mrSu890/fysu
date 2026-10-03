/* ====================================================================
   JEUX D'ARCADE FYSU
   Pour changer le score à atteindre ou le pourcentage de réduction :
   modifie les deux chiffres ci-dessous (REWARD_SCORE / REWARD_PERCENT).
   ==================================================================== */

export const REWARD_SCORE = 25 // score à atteindre dans FYSU Bird pour gagner la réduction
export const REWARD_PERCENT = 10 // pourcentage de réduction
export const REWARD_DAYS = 30 // durée de validité du code

export const GAMES = [
  { slug: "fysu-bird", name: "FYSU Bird", image: "/games-bird-pie-haut.png", cover: "/games-bird-fond.jpg" },
] as const

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
  },
}

export function gamesCopyFor(locale: string): GamesCopy {
  return GAMES_COPY[locale] ?? GAMES_COPY.en
}
