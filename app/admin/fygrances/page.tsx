"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ImagePlus, Save, Trash2 } from "lucide-react"
import { AdminButton, PageHeader, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"
import { resizeImage } from "@/lib/imageTools"
import { getFygrancesCopy } from "@/lib/fygrancesCopy"

/* ====================================================================
   FY'GRANCES : les chapitres de la page (Parfums, Soins, Maison)
   Chaque chapitre a une image, un titre et un texte.
   Si le titre ou le texte est laissé vide, le texte d'origine du site s'affiche.
   ==================================================================== */

type Chapter = {
  id: "parfums" | "soins" | "maison"
  title: string
  body: string
  image_url: string | null
}

const INPUT =
  "w-full rounded-xl border border-[#e2ded7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#171717]"

export default function AdminFygrancesPage() {
  const defaults = getFygrancesCopy("fr").chapters
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const target = useRef<Chapter["id"] | null>(null)

  const load = useCallback(async () => {
    try {
      setChapters(await api.get<Chapter[]>("/api/admin/fygrances"))
    } catch (err) {
      notify.error(errorMessage(err, "Impossible de charger les chapitres"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function patch(id: Chapter["id"], change: Partial<Chapter>) {
    setChapters((cur) => cur.map((c) => (c.id === id ? { ...c, ...change } : c)))
  }

  async function save(chapter: Chapter) {
    setBusyId(chapter.id)
    try {
      await api.post("/api/admin/fygrances", chapter)
      notify.success(`Chapitre « ${chapter.title || defaults[chapter.id].title} » enregistré`)
    } catch (err) {
      notify.error(errorMessage(err, "Impossible d'enregistrer"))
    } finally {
      setBusyId(null)
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const id = target.current
    e.target.value = ""
    if (!file || !id) return

    setBusyId(id)
    try {
      const small = await resizeImage(file)
      const form = new FormData()
      form.append("file", small)
      const { url } = await api.upload<{ url: string }>("/api/admin/uploadHero", form)
      const chapter = chapters.find((c) => c.id === id)
      if (!chapter) return
      const next = { ...chapter, image_url: url }
      patch(id, { image_url: url })
      await api.post("/api/admin/fygrances", next)
      notify.success("Image mise à jour")
    } catch (err) {
      notify.error(errorMessage(err, "Impossible d'envoyer l'image"))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Contenu du site"
        title="FY'grances"
        description="Les chapitres de la page FY'grances : une image, un titre et un texte pour chaque catégorie. Les parfums se classent par famille olfactive dans la fiche de chaque produit."
        actions={<AdminButton href="/fygrances">Voir la page</AdminButton>}
      />

      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="space-y-5">
          {chapters.map((c) => {
            const busy = busyId === c.id
            return (
              <Panel key={c.id} title={defaults[c.id].title}>
                <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
                  <div>
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#f0ece5]">
                      {c.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-[#9a948a]">
                          Pas d'image
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AdminButton
                        variant="primary"
                        icon={ImagePlus}
                        disabled={busy}
                        onClick={() => {
                          target.current = c.id
                          fileInput.current?.click()
                        }}
                      >
                        {c.image_url ? "Changer" : "Ajouter"}
                      </AdminButton>
                      {c.image_url && (
                        <AdminButton
                          variant="ghost"
                          icon={Trash2}
                          disabled={busy}
                          onClick={async () => {
                            patch(c.id, { image_url: null })
                            await save({ ...c, image_url: null })
                          }}
                        >
                          Retirer
                        </AdminButton>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs text-[#7a756d]">Titre</span>
                      <input
                        className={INPUT}
                        value={c.title}
                        placeholder={defaults[c.id].title}
                        onChange={(e) => patch(c.id, { title: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-[#7a756d]">Texte</span>
                      <textarea
                        rows={6}
                        className={INPUT}
                        value={c.body}
                        placeholder={defaults[c.id].body}
                        onChange={(e) => patch(c.id, { body: e.target.value })}
                      />
                    </label>
                    <AdminButton variant="primary" icon={Save} disabled={busy} onClick={() => save(c)}>
                      {busy ? "Enregistrement…" : "Enregistrer"}
                    </AdminButton>
                  </div>
                </div>
              </Panel>
            )
          })}
        </div>
      )}
    </div>
  )
}
