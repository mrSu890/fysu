"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { MusicAlbum, MusicTrack } from "@/lib/music"

/* ====================================================================
   LECTEUR DE MUSIQUE
   Il vit au niveau du site entier : la musique continue pendant qu'on
   change de page. Elle s'arrête seulement si on recharge ou ferme l'onglet.
   ==================================================================== */

export type PlayerAlbum = Pick<MusicAlbum, "id" | "slug" | "title" | "artist" | "cover_url" | "brand">

type PlayerContextType = {
  album: PlayerAlbum | null
  queue: MusicTrack[]
  index: number
  current: MusicTrack | null
  playing: boolean
  time: number
  duration: number
  collapsed: boolean
  setCollapsed: (value: boolean) => void
  playAlbum: (album: PlayerAlbum, tracks: MusicTrack[], startIndex?: number, shuffle?: boolean) => void
  // affiche la pastille (en pause) pour l'album d'une page, sans lancer la musique
  prime: (album: PlayerAlbum, tracks: MusicTrack[]) => void
  // retire la pastille si la musique n'a jamais été lancée
  unprime: () => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

const STORAGE_KEY = "fysu-music-player"

function shuffled<T>(list: T[]) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const queueRef = useRef<MusicTrack[]>([])
  const indexRef = useRef(0)

  const [album, setAlbum] = useState<PlayerAlbum | null>(null)
  const [queue, setQueue] = useState<MusicTrack[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const startedRef = useRef(false)
  const pendingSeekRef = useRef(0)
  const restoredRef = useRef(false)
  const lastSavedSecondRef = useRef(-1)

  // Au rechargement de la page : on retrouve l'album en cours (en pause) pour garder la pastille
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        const list: MusicTrack[] = Array.isArray(saved.queue) ? saved.queue : []
        const i = Math.min(Math.max(Number(saved.index) || 0, 0), Math.max(list.length - 1, 0))
        if (saved.album && list.length > 0 && list[i]) {
          queueRef.current = list
          indexRef.current = i
          setQueue(list)
          setAlbum(saved.album)
          setIndex(i)
          setCollapsed(Boolean(saved.collapsed))
          setTime(Number(saved.time) || 0)
          setDuration(Number(list[i].duration_seconds) || 0)
          startedRef.current = true
          pendingSeekRef.current = Number(saved.time) || 0
          const audio = audioRef.current
          if (audio) audio.src = list[i].audio_url
        }
      }
    } catch {
      /* rien à restaurer */
    }
    restoredRef.current = true
  }, [])

  // Sauvegarde (une fois par seconde au maximum)
  useEffect(() => {
    if (!restoredRef.current || !album || queue.length === 0) return
    const second = Math.floor(time)
    if (second === lastSavedSecondRef.current && !collapsed) return
    lastSavedSecondRef.current = second
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ album, queue, index, time, collapsed })
      )
    } catch {
      /* stockage indisponible */
    }
  }, [album, queue, index, time, collapsed])

  // Lance le titre n° i. Appelé directement depuis un clic (obligatoire sur iPhone).
  const load = useCallback((i: number) => {
    const audio = audioRef.current
    const track = queueRef.current[i]
    if (!audio || !track) return
    pendingSeekRef.current = 0
    startedRef.current = true
    indexRef.current = i
    setIndex(i)
    setTime(0)
    setDuration(Number(track.duration_seconds) || 0)
    audio.src = track.audio_url
    const started = audio.play()
    if (started) started.catch(() => setPlaying(false))
  }, [])

  const playAlbum = useCallback<PlayerContextType["playAlbum"]>(
    (nextAlbum, tracks, startIndex = 0, shuffle = false) => {
      if (!tracks.length) return
      const list = shuffle ? shuffled(tracks) : tracks
      queueRef.current = list
      setQueue(list)
      setAlbum(nextAlbum)
      setCollapsed(false)
      load(shuffle ? 0 : Math.min(Math.max(startIndex, 0), list.length - 1))
    },
    [load]
  )

  const prime = useCallback<PlayerContextType["prime"]>((nextAlbum, tracks) => {
    if (!tracks.length) return
    // quelque chose est déjà lancé : on ne touche à rien
    if (startedRef.current && queueRef.current.length > 0) return
    const audio = audioRef.current
    queueRef.current = tracks
    indexRef.current = 0
    setQueue(tracks)
    setAlbum(nextAlbum)
    setIndex(0)
    setTime(0)
    setDuration(Number(tracks[0].duration_seconds) || 0)
    setCollapsed(false)
    if (audio) audio.src = tracks[0].audio_url
  }, [])

  const unprime = useCallback(() => {
    if (startedRef.current) return
    if (queueRef.current.length === 0) return
    queueRef.current = []
    indexRef.current = 0
    setQueue([])
    setAlbum(null)
    setIndex(0)
    setTime(0)
    setDuration(0)
    const audio = audioRef.current
    if (audio) {
      audio.removeAttribute("src")
      audio.load()
    }
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !audio.src) return
    if (audio.paused) {
      const started = audio.play()
      if (started) started.catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [])

  const next = useCallback(() => {
    const total = queueRef.current.length
    if (!total) return
    load((indexRef.current + 1) % total)
  }, [load])

  const prev = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !queueRef.current.length) return
    // après 3 secondes d'écoute, « précédent » recommence le titre
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    load(Math.max(indexRef.current - 1, 0))
  }, [load])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (audio && Number.isFinite(seconds)) audio.currentTime = Math.max(0, seconds)
  }, [])

  const current = queue[index] ?? null

  // Commandes de l'écran verrouillé et des écouteurs
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return
    const session = navigator.mediaSession

    if (current && album) {
      const cover = current.audio_url && album.cover_url ? album.cover_url : null
      session.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist || album.artist || "",
        album: album.title,
        artwork: cover ? [{ src: cover }] : [],
      })
    }
    session.playbackState = playing ? "playing" : "paused"

    session.setActionHandler("play", toggle)
    session.setActionHandler("pause", toggle)
    session.setActionHandler("previoustrack", prev)
    session.setActionHandler("nexttrack", next)
    try {
      session.setActionHandler("seekto", (d) => {
        if (typeof d.seekTime === "number") seek(d.seekTime)
      })
    } catch {
      /* non supporté */
    }
  }, [current, album, playing, toggle, prev, next, seek])

  const value = useMemo<PlayerContextType>(
    () => ({
      album,
      queue,
      index,
      current,
      playing,
      time,
      duration,
      collapsed,
      setCollapsed,
      playAlbum,
      prime,
      unprime,
      toggle,
      next,
      prev,
      seek,
    }),
    [album, queue, index, current, playing, time, duration, collapsed, playAlbum, prime, unprime, toggle, next, prev, seek]
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        playsInline
        onPlay={() => {
          startedRef.current = true
          setPlaying(true)
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setDuration(d)
          if (pendingSeekRef.current > 0) {
            e.currentTarget.currentTime = pendingSeekRef.current
            pendingSeekRef.current = 0
          }
        }}
        onEnded={() => {
          if (indexRef.current < queueRef.current.length - 1) load(indexRef.current + 1)
          else setPlaying(false)
        }}
      />
    </PlayerContext.Provider>
  )
}

export function useMusicPlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error("useMusicPlayer doit être utilisé dans MusicPlayerProvider")
  return ctx
}
