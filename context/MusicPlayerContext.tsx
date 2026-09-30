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
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

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

  // Lance le titre n° i. Appelé directement depuis un clic (obligatoire sur iPhone).
  const load = useCallback((i: number) => {
    const audio = audioRef.current
    const track = queueRef.current[i]
    if (!audio || !track) return
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
      toggle,
      next,
      prev,
      seek,
    }),
    [album, queue, index, current, playing, time, duration, collapsed, playAlbum, toggle, next, prev, seek]
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setDuration(d)
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
