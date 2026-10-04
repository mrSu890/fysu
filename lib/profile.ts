/* ====================================================================
   PROFIL CLIENT : types et petites règles partagées
   ==================================================================== */

export type ProfileData = {
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  accent: string | null
  is_public?: boolean
  created_at: string | null
}

// Couleurs d'accent proposées au client (modifiables ici)
export const ACCENTS = [
  { id: "ink", hex: "#171717", label: "Encre" },
  { id: "sand", hex: "#b08d57", label: "Sable" },
  { id: "sea", hex: "#2f6f8f", label: "Océan" },
  { id: "moss", hex: "#4f7a4a", label: "Mousse" },
  { id: "rose", hex: "#c0607a", label: "Rose" },
  { id: "plum", hex: "#6b4a8a", label: "Prune" },
  { id: "fire", hex: "#d2542a", label: "Braise" },
] as const

export const DEFAULT_ACCENT = ACCENTS[0].hex

export const isAccent = (v: unknown): v is string => ACCENTS.some((a) => a.hex === v)

export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/

export function cleanUsername(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
}

export const BIO_MAX = 160
export const NAME_MAX = 40

export const AVATAR_BUCKET = "avatars"
