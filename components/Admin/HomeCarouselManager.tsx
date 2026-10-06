"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react"
import { AdminButton, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { Field, inputClass } from "@/components/Admin/ui/controls"
import { api, errorMessage, notify } from "@/lib/adminApi"
import { EVENTS } from "@/lib/events"
import { resizeImage } from "@/lib/imageTools"
import { supabaseClient } from "@/lib/supabaseClient"

/* ====================================================================
   CARROUSEL DE L'ACCUEIL : ajouter, modifier, supprimer, ordonner les slides
   et choisir vers quelle page chacune mène. (Enregistré dans « site_settings », clé home_carousel.)
   ==================================================================== */

type Slide = { id: string; label: string; kind: string; href: string; image: string }

const DEFAULTS: Slide[] = [
  { id: "bloom", label: "When the flowers bloom", kind: "Collection", href: "/collections/when-the-flowers-bloom", image: "/images/home-feature.jpeg" },
  { id: "fygrances", label: "FY'grances", kind: "Fragrance", href: "/fygrances", image: "/images/Fygrances-hero.JPG" },
]

const FIXED_LINKS: { label: string; href: string }[] = [
  { label: "Accueil", href: "/" },
  { label: "FY'grances", href: "/fygrances" },
  { label: "Music", href: "/music" },
  { label: "Games", href: "/games" },
  { label: "À propos", href: "/about" },
  ...EVENTS.map((e) => ({ label: "Évent : " + e.title, href: "/" + e.slug })),
]

const CUSTOM = "__custom__"

const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)

const newId = () => "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export default function HomeCarouselManager() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [usingDefaults, setUsingDefaults] = useState(false)
  const [links, setLinks] = useState<{ label: string; href: string }[]>(FIXED_LINKS)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const targetId = useRef<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const d = await api.get<{ slides: Slide[] | null }>("/api/admin/site-settings?carousel=1")
        if (Array.isArray(d.slides) && d.slides.length > 0) setSlides(d.slides)
        else {
          setSlides(DEFAULTS)
          setUsingDefaults(true)
        }
      } catch {
        setSlides(DEFAULTS)
        setUsingDefaults(true)
      }
      setLoading(false)
    })()

    // pages et collections disponibles comme destination
    ;(async () => {
      const extra: { label: string; href: string }[] = []
      try {
        const cols = await api.get<any[]>("/api/collectionPages")
        if (Array.isArray(cols)) cols.forEach((c) => c?.slug && extra.push({ label: "Collection : " + (c.title || c.slug), href: "/collections/" + c.slug }))
      } catch {}
      try {
        const pages = await api.get<any[]>("/api/admin/pages")
        if (Array.isArray(pages)) pages.forEach((p) => p?.slug && extra.push({ label: "Page : " + (p.title || p.slug), href: "/" + p.slug }))
      } catch {}
      setLinks([...FIXED_LINKS, ...extra.filter((e, i, a) => a.findIndex((x) => x.href === e.href) === i && !FIXED_LINKS.some((f) => f.href === e.href))])
    })()
  }, [])

  const change = (id: string, patch: Partial<Slide>) => {
    setSlides((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    setDirty(true)
  }

  const move = (i: number, dir: -1 | 1) => {
    setSlides((list) => {
      const j = i + dir
      if (j < 0 || j >= list.length) return list
      const copy = [...list]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
    setDirty(true)
  }

  const remove = (id: string) => {
    if (!confirm("Supprimer cette slide du carrousel ?")) return
    setSlides((list) => list.filter((s) => s.id !== id))
    setDirty(true)
  }

  const add = () => {
    setSlides((list) => [...list, { id: newId(), label: "", kind: "", href: "/", image: "" }])
    setDirty(true)
  }

  const pickImage = (id: string) => {
    targetId.current = id
    fileInput.current?.click()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0]
    e.target.value = ""
    const id = targetId.current
    if (!original || !id) return
    setUploadingId(id)
    try {
      if (original.type.startsWith("video")) {
        // vidéo : envoi direct vers le stockage (pas de limite de taille du serveur), sinon par le serveur
        const ext = (original.name.split(".").pop() || "mp4").toLowerCase()
        const path = `hero/carousel-${Date.now()}.${ext}`
        const up = await supabaseClient.storage.from("hero-images").upload(path, original, { contentType: original.type })
        if (!up.error) {
          const { data } = supabaseClient.storage.from("hero-images").getPublicUrl(path)
          change(id, { image: data.publicUrl })
        } else {
          const form = new FormData()
          form.append("file", original)
          const res = await api.upload<{ url: string }>("/api/admin/uploadHero", form)
          change(id, { image: res.url })
        }
      } else {
        const file = await resizeImage(original)
        const form = new FormData()
        form.append("file", file)
        const res = await api.upload<{ url: string }>("/api/admin/uploadHero", form)
        change(id, { image: res.url })
      }
    } catch (err) {
      notify.error(errorMessage(err, "Envoi impossible. Pour une vidéo, essaie un fichier plus léger (moins de 4 Mo)."))
    } finally {
      setUploadingId(null)
    }
  }

  async function save() {
    if (slides.some((s) => !s.image)) {
      notify.error("Chaque slide a besoin d'une photo ou d'une vidéo")
      return
    }
    setSaving(true)
    try {
      await api.post("/api/admin/site-settings", { carousel: slides })
      notify.success("Carrousel enregistré")
      setDirty(false)
      setUsingDefaults(false)
    } catch (err) {
      notify.error(errorMessage(err, "Enregistrement impossible"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel
      title="Carrousel de l'accueil"
      description="Les grandes images qui défilent sous le hero. Choisis la photo ou la vidéo, le titre et la page vers laquelle chaque slide mène. Pense à enregistrer."
    >
      <input ref={fileInput} type="file" accept="image/*,video/*" className="hidden" onChange={onFile} />

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-4">
          {usingDefaults && (
            <p className="rounded-xl bg-[#faf8f5] px-4 py-3 text-xs text-[#7a756d]">
              Tu vois les deux slides actuelles. Modifie-les puis enregistre pour que le site utilise ta liste.
            </p>
          )}

          {slides.map((s, i) => {
            const known = links.some((l) => l.href === s.href)
            return (
              <div key={s.id} className="grid gap-4 rounded-2xl border border-[#e9e5df] bg-white p-3 sm:grid-cols-[140px_1fr]">
                <button
                  type="button"
                  onClick={() => pickImage(s.id)}
                  className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#f0ece5] sm:w-[140px]"
                >
                  {s.image && isVideo(s.image) ? (
                    <video src={s.image} className="absolute inset-0 h-full w-full object-cover" muted autoPlay loop playsInline />
                  ) : s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1.5 text-[11px] text-white">
                    <ImagePlus size={12} /> {uploadingId === s.id ? "Envoi…" : s.image ? "Changer" : "Photo ou vidéo"}
                  </span>
                </button>

                <div className="space-y-3">
                  <Field label="Titre (affiché au-dessus de l'image)">
                    <input className={inputClass} value={s.label} onChange={(e) => change(s.id, { label: e.target.value })} placeholder="Ex : FY'grances" />
                  </Field>

                  <Field label="Mène vers la page">
                    <select
                      className={inputClass}
                      value={known ? s.href : CUSTOM}
                      onChange={(e) => change(s.id, { href: e.target.value === CUSTOM ? "" : e.target.value })}
                    >
                      {links.map((l) => (
                        <option key={l.href} value={l.href}>
                          {l.label}
                        </option>
                      ))}
                      <option value={CUSTOM}>Autre lien…</option>
                    </select>
                  </Field>

                  {!known && (
                    <Field label="Lien personnalisé" hint="Ex : /product/mon-produit ou https://…">
                      <input className={inputClass} value={s.href} onChange={(e) => change(s.id, { href: e.target.value })} placeholder="/…" />
                    </Field>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <AdminButton icon={ArrowUp} disabled={i === 0} onClick={() => move(i, -1)}>
                      Monter
                    </AdminButton>
                    <AdminButton icon={ArrowDown} disabled={i === slides.length - 1} onClick={() => move(i, 1)}>
                      Descendre
                    </AdminButton>
                    <AdminButton variant="danger" icon={Trash2} onClick={() => remove(s.id)}>
                      Supprimer
                    </AdminButton>
                  </div>
                </div>
              </div>
            )
          })}

          <div className="flex flex-wrap gap-2">
            <AdminButton icon={Plus} onClick={add}>
              Ajouter une slide
            </AdminButton>
            <AdminButton variant="primary" disabled={saving || (!dirty && !usingDefaults)} onClick={save}>
              {saving ? "Enregistrement…" : "Enregistrer le carrousel"}
            </AdminButton>
          </div>
        </div>
      )}
    </Panel>
  )
}
