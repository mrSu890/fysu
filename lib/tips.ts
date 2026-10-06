/* ====================================================================
   ASTUCES GUIDÉES (comme un tutoriel de jeu)
   La première fois qu'une personne arrive à un endroit où il y a une fonction
   à découvrir, le fond s'assombrit et une bulle avec une flèche explique quoi faire.
   Chaque astuce ne s'affiche qu'une seule fois (mémorisé sur l'appareil).
   « Passer » arrête toutes les astuces. Elles se rejouent depuis le bouton d'accessibilité.

   POUR AJOUTER UNE ASTUCE :
   1. mets  data-tip="mon-repere"  sur l'élément à montrer (bouton, pastille…)
   2. ajoute un bloc ci-dessous : quand l'afficher (when), quels éléments montrer (steps) et les textes
   ==================================================================== */

export type TipText = { fr: string; en: string }

export type TipStep = {
  target: string // valeur de data-tip de l'élément à éclairer
  text: TipText
  round?: boolean // éclairage tout rond (boutons ronds) au lieu de coins arrondis
}

export type Tip = {
  id: string
  // l'astuce se déclenche quand cet élément est là
  trigger: string // sélecteur CSS
  delay?: number // attente minimale après l'arrivée sur le site (ms)
  steps: TipStep[]
}

export const TIPS: Tip[] = [
  {
    // la première fois qu'on écoute de la musique
    id: "music",
    trigger: '[data-tip="music-vinyl"][data-playing="1"]',
    delay: 4000,
    steps: [
      {
        target: "music-vinyl",
        round: true,
        text: {
          fr: "Touche le disque pour l'ouvrir en grand et voir le vinyle tourner.",
          en: "Tap the record to open it full screen and watch the vinyl spin.",
        },
      },
      {
        target: "music-collapse",
        round: true,
        text: {
          fr: "Cette flèche réduit le lecteur en petite bulle. Tu peux ensuite la glisser où tu veux sur l'écran.",
          en: "This arrow shrinks the player into a small bubble. You can then drag it anywhere on the screen.",
        },
      },
    ],
  },
  {
    // la première fois qu'on ouvre le vinyle
    id: "vinyl",
    trigger: '[data-tip="vinyl-disc"]',
    delay: 1200,
    steps: [
      {
        target: "vinyl-disc",
        round: true,
        text: {
          fr: "Tourne le disque avec le doigt : vers la droite pour avancer, vers la gauche pour rembobiner. Un simple toucher met en pause.",
          en: "Turn the record with your finger: clockwise to go forward, counter-clockwise to rewind. A simple tap pauses.",
        },
      },
    ],
  },
  {
    id: "a11y",
    trigger: '[data-tip="a11y"]',
    delay: 22000,
    steps: [
      {
        target: "a11y",
        round: true,
        text: {
          fr: "Ce bouton adapte le site à toi : taille du texte, contraste, moins d'animations. Tu peux aussi le déplacer.",
          en: "This button adapts the site to you: text size, contrast, fewer animations. You can also move it.",
        },
      },
    ],
  },
  {
    id: "theme",
    trigger: '[data-tip="theme"]',
    delay: 9000,
    steps: [
      {
        target: "theme",
        round: true,
        text: {
          fr: "Passe du mode clair au mode sombre ici.",
          en: "Switch between light and dark mode here.",
        },
      },
    ],
  },
  {
    id: "heart",
    trigger: '[data-tip="heart"]',
    delay: 12000,
    steps: [
      {
        target: "heart",
        round: true,
        text: {
          fr: "Touche le cœur pour garder cette pièce dans tes favoris. Tu les retrouves dans My FYSU.",
          en: "Tap the heart to save this piece to your favourites. You will find them in My FYSU.",
        },
      },
    ],
  },
  {
    // quand le menu est ouvert
    id: "myfysu",
    trigger: '[data-tip="myfysu"]',
    delay: 2500,
    steps: [
      {
        target: "myfysu",
        text: {
          fr: "Ton espace My FYSU : ton profil, tes amis, ta garde-robe et tes badges.",
          en: "Your My FYSU space: your profile, your friends, your wardrobe and your badges.",
        },
      },
    ],
  },
]

export const TEXT = {
  fr: { skip: "Passer", next: "Suivant", ok: "Compris" },
  en: { skip: "Skip", next: "Next", ok: "Got it" },
}

const SEEN_KEY = "fysu-tips-seen"
const OFF_KEY = "fysu-tips-off"

export function tipsSeen(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

export function markTipSeen(id: string) {
  try {
    const list = tipsSeen()
    if (!list.includes(id)) localStorage.setItem(SEEN_KEY, JSON.stringify([...list, id]))
  } catch {
    /* ignore */
  }
}

export const tipsOff = () => {
  try {
    return localStorage.getItem(OFF_KEY) === "1"
  } catch {
    return false
  }
}

export function turnTipsOff() {
  try {
    localStorage.setItem(OFF_KEY, "1")
  } catch {
    /* ignore */
  }
}

// « Revoir les astuces » : tout est remis à zéro
export function resetTips() {
  try {
    localStorage.removeItem(SEEN_KEY)
    localStorage.removeItem(OFF_KEY)
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("fysu-tips-reset"))
}
