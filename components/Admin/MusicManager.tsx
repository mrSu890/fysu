"use client"

import WaveColorField from "@/components/Admin/WaveColorField"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ImagePlus,
  Music,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"
import { AdminButton, Badge, EmptyState, PageHeader, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { Field, Modal, Toggle, inputClass } from "@/components/Admin/ui/controls"
import { api, errorMessage, notify, slugify } from "@/lib/adminApi"
import { resizeImage } from "@/lib/imageTools"
import { supabaseClient } from "@/lib/supabaseClient"
import { formatTime, type MusicAlbumFull, type MusicTrack } from "@/lib/music"

/* ====================================================================
   ADMIN > MUSIQUE
   - un album = une fiche (pochette, marque, collections liées) + ses titres
   - les fichiers audio partent directement vers Supabase (pas de limite de 4,5 Mo)
   - l'album apparaît sur les collections cochées (pop-up « Écouter la musique ? »)
   ==================================================================== */

const API = "/api/admin/music"

type CollectionOption = { slug: string; label: string }

type AlbumForm = {
  id: number | null
  title: string
  slug: string
  artist: string
  description: string
  brand: "fysu" | "thewave" | "kiban"
  wave_bg: string
  collection_slugs: string[]
  visible: boolean
  cover_url: string | null
  cover_path: string | null
  coverFile: File | null
  coverPreview: string | null
}

const EMPTY_FORM: AlbumForm = {
  id: null,
  title: "",
  slug: "",
  artist: "",
  description: "",
  brand: "fysu",
  wave_bg: "",
  collection_slugs: [],
  visible: true,
  cover_url: null,
  cover_path: null,
  coverFile: null,
  coverPreview: null,
}

const BRAND_LABELS: Record<string, string> = {
  fysu: "fysu (classique)",
  thewave: "The Wave (fond rouge + vague)",
  kiban: "Kiban Collector (sombre)",
}

/* ====== Envoi d'un fichier vers le dossier « music » de Supabase ====== */

async function uploadToMusic(file: File, kind: "audio" | "cover") {
  const { path, token, publicUrl } = await api.post<{ path: string; token: string; publicUrl: string }>(
    API,
    { op: "upload-url", filename: file.name, kind }
  )
  const { error } = await supabaseClient.storage
    .from("music")
    .uploadToSignedUrl(path, token, file, { contentType: file.type || undefined })
  if (error) throw new Error(error.message)
  return { url: publicUrl, path }
}

function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = "metadata"
    audio.onloadedmetadata = () => {
      const d = audio.duration
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(d) ? Math.round(d) : null)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    audio.src = url
  })
}

// « 03 - Mon titre_final.mp3 » -> « Mon titre final »
function titleFromFilename(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/^\s*\d{1,2}\s*[-_.)]\s*/, "")
    .replace(/_/g, " ")
    .trim()
}

export default function MusicManager() {
  const [albums, setAlbums] = useState<MusicAlbumFull[]>([])
  const [options, setOptions] = useState<CollectionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  const [form, setForm] = useState<AlbumForm | null>(null)
  const [saving, setSaving] = useState(false)
  const coverInput = useRef<HTMLInputElement>(null)

  const [trackEdit, setTrackEdit] = useState<MusicTrack | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const audioInput = useRef<HTMLInputElement>(null)
  const audioTarget = useRef<number | null>(null)

  const load = useCallback(async () => {
    try {
      const [list, pages, collections] = await Promise.all([
        api.get<MusicAlbumFull[]>(API),
        api.get<any[]>("/api/admin/pages").catch(() => []),
        api.get<any[]>("/api/admin/collectionPages").catch(() => []),
      ])
      setAlbums(Array.isArray(list) ? list : [])

      const map = new Map<string, string>()
      map.set("thewave", "The Wave")
      map.set("kiban-collector", "Kiban Collector")
      for (const c of Array.isArray(collections) ? collections : []) map.set(c.slug, c.title ?? c.slug)
      for (const p of Array.isArray(pages) ? pages : []) {
        if (!map.has(p.slug)) map.set(p.slug, `${p.title ?? p.slug} (page)`)
      }
      setOptions([...map.entries()].map(([slug, label]) => ({ slug, label })))
      setError(null)
    } catch (e) {
      setError(errorMessage(e, "Impossible de charger la musique"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* ====== Album : créer / modifier ====== */

  function openNew() {
    setForm({ ...EMPTY_FORM })
  }

  function openEdit(a: MusicAlbumFull) {
    setForm({
      id: a.id,
      title: a.title,
      slug: a.slug,
      artist: a.artist ?? "",
      description: a.description ?? "",
      brand: a.brand,
      wave_bg: a.wave_bg ?? "",
      collection_slugs: a.collection_slugs ?? [],
      visible: a.visible,
      cover_url: a.cover_url,
      cover_path: a.cover_path ?? null,
      coverFile: null,
      coverPreview: null,
    })
  }

  function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !form) return
    setForm({ ...form, coverFile: file, coverPreview: URL.createObjectURL(file) })
  }

  async function saveAlbum() {
    if (!form) return
    const title = form.title.trim()
    if (!title) return notify.error("Le titre est obligatoire")
    const slug = form.id ? form.slug : slugify(form.slug || title)
    if (!slug) return notify.error("Lien invalide")

    setSaving(true)
    try {
      let cover_url = form.cover_url
      let cover_path = form.cover_path
      if (form.coverFile) {
        const small = await resizeImage(form.coverFile)
        const up = await uploadToMusic(small, "cover")
        cover_url = up.url
        cover_path = up.path
      }

      const payload = {
        title,
        slug,
        artist: form.artist,
        description: form.description,
        brand: form.brand,
        wave_bg: form.wave_bg || null,
        collection_slugs: form.collection_slugs,
        visible: form.visible,
        cover_url,
        cover_path,
      }

      if (form.id) {
        await api.post(API, { op: "album-update", id: form.id, ...payload })
        notify.success("Album enregistré")
      } else {
        const created = await api.post<{ id: number }>(API, { op: "album-create", ...payload })
        setOpenId(created.id)
        notify.success("Album créé. Ajoute maintenant ses titres.")
      }
      setForm(null)
      load()
    } catch (e) {
      notify.error(errorMessage(e, "Impossible d'enregistrer l'album"))
    } finally {
      setSaving(false)
    }
  }

  async function removeAlbum(a: MusicAlbumFull) {
    if (!confirm(`Supprimer l'album « ${a.title} » et ses ${a.tracks.length} titre(s) ? Cette action est définitive.`)) return
    try {
      await api.post(API, { op: "album-delete", id: a.id })
      notify.success("Album supprimé")
      load()
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de supprimer"))
    }
  }

  async function setVisible(a: MusicAlbumFull, visible: boolean) {
    setAlbums((cur) => cur.map((x) => (x.id === a.id ? { ...x, visible } : x)))
    try {
      await api.post(API, { op: "album-update", id: a.id, visible })
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de changer la visibilité"))
      load()
    }
  }

  /* ====== Titres ====== */

  function pickAudio(albumId: number) {
    audioTarget.current = albumId
    audioInput.current?.click()
  }

  async function onAudioFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files: File[] = Array.from(e.target.files ?? [])
    e.target.value = ""
    const albumId = audioTarget.current
    if (!files.length || !albumId) return

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

    let done = 0
    for (const file of files) {
      setUploadStatus(`Envoi ${done + 1}/${files.length} : ${file.name}`)
      try {
        const [duration, up] = await Promise.all([readDuration(file), uploadToMusic(file, "audio")])
        await api.post(API, {
          op: "track-add",
          album_id: albumId,
          title: titleFromFilename(file.name) || file.name,
          audio_url: up.url,
          audio_path: up.path,
          duration_seconds: duration,
        })
        done++
      } catch (err) {
        notify.error(`${file.name} : ${errorMessage(err, "envoi impossible")}`)
      }
    }

    setUploadStatus(null)
    if (done) notify.success(done === 1 ? "1 titre ajouté" : `${done} titres ajoutés`)
    load()
  }

  async function saveTrack() {
    if (!trackEdit) return
    if (!trackEdit.title.trim()) return notify.error("Le titre est obligatoire")
    try {
      await api.post(API, {
        op: "track-update",
        id: trackEdit.id,
        title: trackEdit.title,
        artist: trackEdit.artist,
        info: trackEdit.info,
      })
      notify.success("Titre enregistré")
      setTrackEdit(null)
      load()
    } catch (e) {
      notify.error(errorMessage(e, "Impossible d'enregistrer"))
    }
  }

  async function removeTrack(t: MusicTrack) {
    if (!confirm(`Supprimer le titre « ${t.title} » ?`)) return
    try {
      await api.post(API, { op: "track-delete", id: t.id })
      load()
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de supprimer"))
    }
  }

  async function move(album: MusicAlbumFull, index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= album.tracks.length) return
    const tracks = [...album.tracks]
    ;[tracks[index], tracks[target]] = [tracks[target], tracks[index]]
    setAlbums((cur) => cur.map((a) => (a.id === album.id ? { ...a, tracks } : a)))
    try {
      await api.post(API, { op: "tracks-order", ids: tracks.map((t) => t.id) })
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de changer l'ordre"))
      load()
    }
  }

  function toggleCollection(slug: string) {
    if (!form) return
    const has = form.collection_slugs.includes(slug)
    setForm({
      ...form,
      collection_slugs: has
        ? form.collection_slugs.filter((s) => s !== slug)
        : [...form.collection_slugs, slug],
    })
  }

  /* ====== Affichage ====== */

  return (
    <div>
      <PageHeader
        eyebrow="Contenu du site"
        title="Musique"
        description="Crée tes albums, ajoute leurs titres, puis choisis sur quelles collections le pop-up « Écouter la musique ? » apparaît."
        actions={
          <AdminButton variant="primary" icon={Plus} onClick={openNew}>
            Nouvel album
          </AdminButton>
        }
      />

      {uploadStatus && (
        <div className="mb-4 rounded-2xl bg-[#dbe7f7] px-4 py-3 text-sm text-[#1f3f73]">
          {uploadStatus} — ne quitte pas la page.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl bg-[#f8d9d9] px-4 py-3 text-sm text-[#7a1f1f]">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : albums.length === 0 ? (
        <EmptyState
          title="Aucun album pour l'instant"
          description="Crée ton premier album, par exemple « The Wave — Vol. 1 »."
          action={
            <AdminButton variant="primary" icon={Plus} onClick={openNew}>
              Nouvel album
            </AdminButton>
          }
        />
      ) : (
        <div className="space-y-4">
          {albums.map((a) => {
            const open = openId === a.id
            return (
              <Panel key={a.id} padded={false}>
                <div className="flex items-center gap-4 p-4 sm:p-5">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#171717]/[0.06]">
                    {a.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#9a948a]">
                        <Music size={22} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    <p className="truncate text-xs text-[#7a756d]">
                      {a.artist || "—"} · {a.tracks.length} titre{a.tracks.length > 1 ? "s" : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge>{BRAND_LABELS[a.brand]?.split(" ")[0] ?? a.brand}</Badge>
                      {(a.collection_slugs ?? []).map((s) => (
                        <Badge key={s} tone="blue">
                          {options.find((o) => o.slug === s)?.label ?? s}
                        </Badge>
                      ))}
                      {!a.visible && <Badge tone="orange">Caché</Badge>}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Toggle checked={a.visible} onChange={(v) => setVisible(a, v)} label="Visible" />
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : a.id)}
                      aria-label="Voir les titres"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#171717]/[0.06]"
                    >
                      <ChevronDown size={16} className={open ? "rotate-180 transition" : "transition"} />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-[#eeeae3] p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap gap-2">
                      <AdminButton variant="primary" icon={Upload} onClick={() => pickAudio(a.id)}>
                        Ajouter des titres
                      </AdminButton>
                      <AdminButton icon={Pencil} onClick={() => openEdit(a)}>
                        Modifier l&apos;album
                      </AdminButton>
                      <AdminButton href={`/music/${a.slug}`} variant="ghost">
                        Voir la page
                      </AdminButton>
                      <AdminButton variant="danger" icon={Trash2} onClick={() => removeAlbum(a)}>
                        Supprimer
                      </AdminButton>
                    </div>

                    {a.tracks.length === 0 ? (
                      <EmptyState
                        title="Aucun titre"
                        description="Appuie sur « Ajouter des titres » et choisis tes fichiers mp3 (plusieurs à la fois possible)."
                      />
                    ) : (
                      <ol className="divide-y divide-[#eeeae3] rounded-2xl border border-[#eeeae3]">
                        {a.tracks.map((t, i) => (
                          <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                            <span className="w-5 shrink-0 text-center text-xs text-[#9a948a]">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm">{t.title}</p>
                              <p className="truncate text-xs text-[#9a948a]">
                                {t.artist || a.artist || "—"}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs tabular-nums text-[#7a756d]">
                              {formatTime(t.duration_seconds)}
                            </span>
                            <div className="flex shrink-0 items-center">
                              <button
                                type="button"
                                aria-label="Monter"
                                disabled={i === 0}
                                onClick={() => move(a, i, -1)}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full disabled:opacity-30"
                              >
                                <ArrowUp size={15} />
                              </button>
                              <button
                                type="button"
                                aria-label="Descendre"
                                disabled={i === a.tracks.length - 1}
                                onClick={() => move(a, i, 1)}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full disabled:opacity-30"
                              >
                                <ArrowDown size={15} />
                              </button>
                              <button
                                type="button"
                                aria-label="Modifier"
                                onClick={() => setTrackEdit(t)}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                aria-label="Supprimer"
                                onClick={() => removeTrack(t)}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#9b1c1c]"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      )}

      <input
        ref={audioInput}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.aac"
        multiple
        className="hidden"
        onChange={onAudioFiles}
      />
      <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={pickCover} />

      {/* ====== Fenêtre album ====== */}
      <Modal
        open={Boolean(form)}
        title={form?.id ? "Modifier l'album" : "Nouvel album"}
        onClose={() => !saving && setForm(null)}
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setForm(null)} disabled={saving}>
              Annuler
            </AdminButton>
            <AdminButton variant="primary" onClick={saveAlbum} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </AdminButton>
          </>
        }
      >
        {form && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#171717]/[0.06]">
                {form.coverPreview || form.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(form.coverPreview || form.cover_url) as string}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#9a948a]">
                    <Music size={26} />
                  </div>
                )}
              </div>
              <AdminButton icon={ImagePlus} onClick={() => coverInput.current?.click()}>
                {form.coverPreview || form.cover_url ? "Changer la pochette" : "Ajouter une pochette"}
              </AdminButton>
            </div>

            <Field label="Titre de l'album">
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="The Wave — Vol. 1"
              />
            </Field>

            {!form.id && (
              <Field label="Lien de la page" hint={`f-y-s-u.com/music/${slugify(form.slug || form.title) || "…"}`}>
                <input
                  className={inputClass}
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="(automatique depuis le titre)"
                />
              </Field>
            )}

            <Field label="Artiste (par défaut pour tous les titres)">
              <input
                className={inputClass}
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
                placeholder="The Wave"
              />
            </Field>

            <Field label="Description (facultatif)">
              <textarea
                className={`${inputClass} min-h-[84px]`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>

            <Field label="Ambiance de la page" hint="The Wave : fond rouge, vague rose et logo The Wave dans la barre de navigation.">
              <select
                className={inputClass}
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value as AlbumForm["brand"] })}
              >
                {Object.entries(BRAND_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            {form.brand === "thewave" && (
              <WaveColorField value={form.wave_bg} onChange={(v) => setForm({ ...form, wave_bg: v })} />
            )}

            <div>
              <p className="mb-1.5 text-xs font-medium text-[#3d3a35]">
                Collections où proposer cet album (pop-up « Écouter la musique ? »)
              </p>
              <div className="flex flex-wrap gap-2">
                {options.map((o) => {
                  const on = form.collection_slugs.includes(o.slug)
                  return (
                    <button
                      key={o.slug}
                      type="button"
                      onClick={() => toggleCollection(o.slug)}
                      className={`cursor-pointer rounded-full px-3.5 py-2 text-xs transition ${
                        on ? "bg-[#171717] text-white" : "bg-[#171717]/[0.06] text-[#3d3a35]"
                      }`}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-[#171717]/[0.04] px-4 py-3">
              <span className="text-sm">Album visible sur le site</span>
              <Toggle checked={form.visible} onChange={(v) => setForm({ ...form, visible: v })} label="Visible" />
            </div>
          </div>
        )}
      </Modal>

      {/* ====== Fenêtre titre ====== */}
      <Modal
        open={Boolean(trackEdit)}
        title="Modifier le titre"
        onClose={() => setTrackEdit(null)}
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setTrackEdit(null)}>
              Annuler
            </AdminButton>
            <AdminButton variant="primary" onClick={saveTrack}>
              Enregistrer
            </AdminButton>
          </>
        }
      >
        {trackEdit && (
          <div className="space-y-5">
            <Field label="Titre">
              <input
                className={inputClass}
                value={trackEdit.title}
                onChange={(e) => setTrackEdit({ ...trackEdit, title: e.target.value })}
              />
            </Field>
            <Field label="Artiste (vide = artiste de l'album)">
              <input
                className={inputClass}
                value={trackEdit.artist ?? ""}
                onChange={(e) => setTrackEdit({ ...trackEdit, artist: e.target.value })}
              />
            </Field>
            <Field label="Infos sur ce son (facultatif)" hint="Affichées quand on touche le titre sur la page de l'album.">
              <textarea
                className={`${inputClass} min-h-[96px]`}
                value={trackEdit.info ?? ""}
                onChange={(e) => setTrackEdit({ ...trackEdit, info: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  )
}
