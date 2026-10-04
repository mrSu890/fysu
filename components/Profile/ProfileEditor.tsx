"use client"

import { useRef, useState } from "react"
import { X, Upload, Check } from "lucide-react"
import { ACCENTS, BIO_MAX, DEFAULT_ACCENT, NAME_MAX, type ProfileData } from "@/lib/profile"
import type { PCopy } from "./profileCopy"
import Avatar from "./Avatar"

export type GalleryAvatar = { id: string; url: string; label: string | null }

/* Réduit la photo en carré 320 × 320 (JPEG) avant l'envoi : rapide et léger */
async function squareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = 320
  canvas.height = 320
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 320, 320)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/jpeg", 0.86)
  )
}

export default function ProfileEditor({
  profile,
  avatars,
  copy,
  welcome,
  fallbackName,
  onClose,
  onSaved,
}: {
  profile: ProfileData
  avatars: GalleryAvatar[]
  copy: PCopy
  welcome: boolean
  fallbackName: string
  onClose: () => void
  onSaved: () => void
}) {
  const [username, setUsername] = useState(profile.username ?? "")
  const [displayName, setDisplayName] = useState(profile.display_name ?? "")
  const [bio, setBio] = useState(profile.bio ?? "")
  const [accent, setAccent] = useState(profile.accent ?? DEFAULT_ACCENT)
  const [isPublic, setIsPublic] = useState(profile.is_public !== false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [avatarId, setAvatarId] = useState<string | null | undefined>(undefined) // undefined = inchangé
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function pickFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const blob = await squareJpeg(file)
      const form = new FormData()
      form.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }))
      const res = await fetch("/api/profile", { method: "POST", body: form })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? copy.error)
      setAvatarUrl(json.url)
      setAvatarId(undefined)
    } catch (e: any) {
      setError(e?.message ?? copy.error)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, any> = {
        username,
        display_name: displayName,
        bio,
        accent,
        is_public: isPublic,
      }
      if (avatarId !== undefined) body.avatar_id = avatarId
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? copy.error)
      onSaved()
    } catch (e: any) {
      setError(e?.message ?? copy.error)
      setSaving(false)
    }
  }

  const field =
    "w-full rounded-xl border border-foreground/20 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground/60"

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-background p-5 text-foreground shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-dior text-2xl">{welcome ? copy.welcomeTitle : copy.editTitle}</h2>
            {welcome && <p className="mt-1 text-sm text-foreground/60">{copy.welcomeText}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={copy.close} className="rounded-full p-2 hover:bg-foreground/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* AVATAR */}
        <div className="mb-6 flex flex-col items-center gap-4">
          <Avatar url={avatarUrl} name={displayName || username || fallbackName} accent={accent} size={104} />
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/30 px-4 py-2 text-sm disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> {uploading ? "…" : copy.uploadPhoto}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => {
                  setAvatarUrl(null)
                  setAvatarId(null)
                }}
                className="rounded-full px-4 py-2 text-sm text-foreground/60 underline underline-offset-2"
              >
                {copy.removeAvatar}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
          </div>

          {avatars.length > 0 && (
            <div className="w-full">
              <p className="mb-2 text-center text-xs uppercase tracking-wider text-foreground/50">{copy.chooseAvatar}</p>
              <div className="grid grid-cols-5 gap-3 sm:grid-cols-6">
                {avatars.map((a) => {
                  const active = avatarUrl === a.url
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setAvatarUrl(a.url)
                        setAvatarId(a.id)
                      }}
                      className="relative aspect-square overflow-hidden rounded-full"
                      style={{ boxShadow: active ? `0 0 0 3px ${accent}` : "0 0 0 1px rgba(128,128,128,.3)" }}
                      aria-label={a.label ?? "avatar"}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt="" className="h-full w-full object-cover" />
                      {active && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                          <Check className="h-5 w-5" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* CHAMPS */}
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm">{copy.username}</span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20))}
                className={field + " pl-9"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <span className="mt-1 block text-xs text-foreground/50">{copy.usernameHint}</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm">{copy.displayName}</span>
            <input value={displayName} maxLength={NAME_MAX} onChange={(e) => setDisplayName(e.target.value)} className={field} />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm">{copy.bio}</span>
            <textarea
              value={bio}
              maxLength={BIO_MAX}
              rows={3}
              onChange={(e) => setBio(e.target.value)}
              className={field + " resize-none"}
            />
            <span className="mt-1 block text-xs text-foreground/50">
              {copy.bioHint} · {bio.length}/{BIO_MAX}
            </span>
          </label>

          <div>
            <span className="mb-2 block text-sm">{copy.color}</span>
            <div className="flex flex-wrap gap-3">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-label={a.label}
                  onClick={() => setAccent(a.hex)}
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    background: a.hex,
                    boxShadow: accent === a.hex ? `0 0 0 3px var(--background, #fff), 0 0 0 5px ${a.hex}` : "none",
                  }}
                >
                  {accent === a.hex && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-foreground/15 p-4">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
          />
          <span>
            <span className="block text-sm font-medium">{copy.publicProfile}</span>
            <span className="block text-xs text-foreground/55">{copy.publicHint}</span>
          </span>
        </label>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || uploading}
            className="flex-1 rounded-full py-3 text-base font-medium text-white disabled:opacity-50"
            style={{ background: accent }}
          >
            {saving ? copy.saving : copy.save}
          </button>
          {welcome && (
            <button type="button" onClick={onClose} className="rounded-full border border-foreground/30 px-5 py-3 text-base">
              {copy.later}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
