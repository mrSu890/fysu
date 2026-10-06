/* ====================================================================
   ASTUCES GUIDÉES (comme un tutoriel de jeu)
   La première fois qu'une personne arrive à un endroit où il y a une fonction
   à découvrir, le fond s'assombrit et une bulle avec une flèche explique quoi faire.
   Chaque astuce ne s'affiche qu'une seule fois par personne : mémorisé sur l'appareil ET sur le compte
   (connecté, on ne les revoit jamais sur un autre téléphone, iPad ou ordinateur).
   « Passer » arrête toutes les astuces. Elles se rejouent depuis le bouton d'accessibilité.

   POUR AJOUTER UNE ASTUCE :
   1. mets  data-tip="mon-repere"  sur l'élément à montrer (bouton, pastille…)
   2. ajoute un bloc ci-dessous : quand l'afficher (when), quels éléments montrer (steps) et les textes
   ==================================================================== */

import { supabaseClient } from "@/lib/supabaseClient"

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
]

export const TEXT = {
  fr: { skip: "Passer", next: "Suivant", ok: "Compris" },
  en: { skip: "Skip", next: "Next", ok: "Got it" },
}

const SEEN_KEY = "fysu-tips-seen"
const OFF_KEY = "fysu-tips-off"
const META_SEEN = "fysu_tips"
const META_OFF = "fysu_tips_off"

export function tipsSeen(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

export const tipsOff = () => {
  try {
    return localStorage.getItem(OFF_KEY) === "1"
  } catch {
    return false
  }
}

function writeLocal(seen: string[], off: boolean) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
    if (off) localStorage.setItem(OFF_KEY, "1")
    else localStorage.removeItem(OFF_KEY)
  } catch {
    /* ignore */
  }
}

// envoie l'état au compte (si la personne est connectée)
async function pushToAccount(seen: string[], off: boolean) {
  try {
    const { data } = await supabaseClient.auth.getSession()
    if (!data.session) return
    await supabaseClient.auth.updateUser({ data: { [META_SEEN]: seen, [META_OFF]: off } })
  } catch {
    /* ignore */
  }
}

// fusionne l'appareil et le compte (dans les deux sens) : une astuce vue quelque part n'est plus jamais montrée
export async function syncTipsWithAccount(): Promise<void> {
  try {
    const { data } = await supabaseClient.auth.getSession()
    const user = data.session?.user
    if (!user) return
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    const remoteSeen = Array.isArray(meta[META_SEEN]) ? (meta[META_SEEN] as unknown[]).filter((x): x is string => typeof x === "string") : []
    const remoteOff = meta[META_OFF] === true
    const localSeen = tipsSeen()
    const localOff = tipsOff()
    const seen = Array.from(new Set([...remoteSeen, ...localSeen]))
    const off = remoteOff || localOff
    writeLocal(seen, off)
    const changed = seen.length !== remoteSeen.length || off !== remoteOff
    if (changed) await pushToAccount(seen, off)
  } catch {
    /* ignore */
  }
}

export function markTipSeen(id: string) {
  const list = tipsSeen()
  if (list.includes(id)) return
  const next = [...list, id]
  writeLocal(next, tipsOff())
  void pushToAccount(next, tipsOff())
}

export function turnTipsOff() {
  const seen = tipsSeen()
  writeLocal(seen, true)
  void pushToAccount(seen, true)
}

// « Revoir les astuces » : tout est remis à zéro (appareil + compte)
export async function resetTips() {
  writeLocal([], false)
  await pushToAccount([], false)
  if (typeof window !== "undefined") window.dispatchEvent(new Event("fysu-tips-reset"))
}
