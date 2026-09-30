import { useLocale } from "next-intl"

/* ====================================================================
   TEXTES DE LA MUSIQUE (en / fr / nl / ja ; les autres langues : anglais)
   Pour modifier un texte : change-le ici, dans la bonne langue.
   ==================================================================== */

export type MusicCopy = {
  promptTitle: string
  promptTitleMany: string
  yes: string
  no: string
  close: string
  play: string
  pause: string
  shuffle: string
  next: string
  previous: string
  collapse: string
  expand: string
  backTo: string
  allAlbums: string
  musicTitle: string
  projects: string
  loading: string
  notFound: string
  tracks: (count: number, minutes: number) => string
}

const COPY: Record<string, MusicCopy> = {
  en: {
    promptTitle: "Listen to the music of this collection?",
    promptTitleMany: "Listen to the music of this collection",
    yes: "Yes, listen",
    no: "No thanks",
    close: "Close",
    play: "Play",
    pause: "Pause",
    shuffle: "Shuffle",
    next: "Next track",
    previous: "Previous track",
    collapse: "Shrink the player",
    expand: "Open the player",
    backTo: "Back to",
    allAlbums: "All albums",
    musicTitle: "Music",
    projects: "Projects",
    loading: "Loading",
    notFound: "Album not found.",
    tracks: (n, m) => `${n} ${n > 1 ? "tracks" : "track"} · ${m} min`,
  },
  fr: {
    promptTitle: "Écouter la musique de cette collection ?",
    promptTitleMany: "Écouter la musique de cette collection",
    yes: "Oui, écouter",
    no: "Non merci",
    close: "Fermer",
    play: "Lecture",
    pause: "Pause",
    shuffle: "Aléatoire",
    next: "Titre suivant",
    previous: "Titre précédent",
    collapse: "Réduire le lecteur",
    expand: "Ouvrir le lecteur",
    backTo: "Retour à",
    allAlbums: "Tous les albums",
    musicTitle: "Musique",
    projects: "Projets",
    loading: "Chargement",
    notFound: "Album introuvable.",
    tracks: (n, m) => `${n} ${n > 1 ? "titres" : "titre"} · ${m} min`,
  },
  nl: {
    promptTitle: "Wil je de muziek van deze collectie beluisteren?",
    promptTitleMany: "Beluister de muziek van deze collectie",
    yes: "Ja, luisteren",
    no: "Nee, bedankt",
    close: "Sluiten",
    play: "Afspelen",
    pause: "Pauze",
    shuffle: "Willekeurig",
    next: "Volgend nummer",
    previous: "Vorig nummer",
    collapse: "Speler verkleinen",
    expand: "Speler openen",
    backTo: "Terug naar",
    allAlbums: "Alle albums",
    musicTitle: "Muziek",
    projects: "Projecten",
    loading: "Laden",
    notFound: "Album niet gevonden.",
    tracks: (n, m) => `${n} ${n > 1 ? "nummers" : "nummer"} · ${m} min`,
  },
  ja: {
    promptTitle: "このコレクションの音楽を聴きますか？",
    promptTitleMany: "このコレクションの音楽を聴く",
    yes: "聴く",
    no: "いいえ",
    close: "閉じる",
    play: "再生",
    pause: "一時停止",
    shuffle: "シャッフル",
    next: "次の曲",
    previous: "前の曲",
    collapse: "プレーヤーを小さくする",
    expand: "プレーヤーを開く",
    backTo: "戻る：",
    allAlbums: "すべてのアルバム",
    musicTitle: "ミュージック",
    projects: "プロジェクト",
    loading: "読み込み中",
    notFound: "アルバムが見つかりません。",
    tracks: (n, m) => `${n}曲 · ${m}分`,
  },
}

export function useMusicCopy(): MusicCopy {
  const locale = useLocale()
  return COPY[locale] ?? COPY.en
}
