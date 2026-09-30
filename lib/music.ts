import type { BrandId } from "@/lib/brands"

/* ====================================================================
   MUSIQUE : types et petites fonctions communes
   ==================================================================== */

export type MusicTrack = {
  id: number
  album_id: number
  title: string
  artist: string | null
  info: string | null
  audio_url: string
  audio_path?: string | null
  duration_seconds: number | null
  display_order: number
}

export type MusicAlbum = {
  id: number
  slug: string
  title: string
  artist: string | null
  description: string | null
  cover_url: string | null
  cover_path?: string | null
  brand: BrandId
  collection_slugs: string[]
  visible: boolean
  display_order: number
}

export type MusicAlbumFull = MusicAlbum & { tracks: MusicTrack[] }

// 3:07
export function formatTime(seconds: number | null | undefined) {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export function totalMinutes(tracks: { duration_seconds: number | null }[]) {
  const sum = tracks.reduce((acc, t) => acc + (Number(t.duration_seconds) || 0), 0)
  return Math.max(1, Math.round(sum / 60))
}
