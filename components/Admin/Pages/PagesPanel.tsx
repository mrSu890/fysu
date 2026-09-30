"use client"

import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react"
import { AdminButton, Badge, EmptyState, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { Field, Modal, Toggle, inputClass } from "@/components/Admin/ui/controls"
import { adminFetch, api, errorMessage, notify, slugify } from "@/lib/adminApi"

type PageItem = {
  id: string
  title: string
  slug: string
  hero_image: string | null
  visible: boolean
}

export default function PagesPanel({ onOpenRows }: { onOpenRows: (pageId: string) => void }) {
  const [pages, setPages] = useState<PageItem[]>([])
  const [rowCount, setRowCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<PageItem | "new" | null>(null)
  const [title, setTitle] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [list, sections] = await Promise.all([
        api.get<PageItem[]>("/api/admin/pages"),
        api.get<any[]>("/api/admin/sections").catch(() => []),
      ])

      const counts: Record<string, number> = {}
      for (const s of Array.isArray(sections) ? sections : []) {
        for (const sp of s.section_pages ?? []) {
          const id = sp?.pages?.id
          if (id) counts[id] = (counts[id] ?? 0) + 1
        }
      }

      setPages(Array.isArray(list) ? list : [])
      setRowCount(counts)
      setError(null)
    } catch (e) {
      setError(errorMessage(e, "Impossible de charger les pages"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openEditor(item: PageItem | "new") {
    setTitle(item === "new" ? "" : item.title)
    setEditing(item)
  }

  async function save() {
    const clean = title.trim()
    if (!clean) return notify.error("Le titre est obligatoire")

    setSaving(true)
    try {
      if (editing === "new") {
        const slug = slugify(clean)
        if (!slug) throw new Error("Titre invalide")
        await api.post("/api/admin/pages", { title: clean, slug })
        notify.success("Page créée. Ajoute son image dans « Images de garde ».")
      } else if (editing) {
        await adminFetch(`/api/admin/pages/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: clean }),
        })
        notify.success("Titre modifié")
      }
      setEditing(null)
      load()
    } catch (e) {
      notify.error(errorMessage(e, "Impossible d'enregistrer"))
    } finally {
      setSaving(false)
    }
  }

  async function setVisible(item: PageItem, visible: boolean) {
    setPages((cur) => cur.map((p) => (p.id === item.id ? { ...p, visible } : p)))
    try {
      await adminFetch(`/api/admin/pages/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ visible }),
      })
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de changer la visibilité"))
      load()
    }
  }

  async function remove(item: PageItem) {
    if (
      !confirm(
        `Supprimer la page « ${item.title} » ? Ses rangées ne sont pas supprimées, mais la page disparaît du site.`
      )
    )
      return
    try {
      await api.del(`/api/admin/pages/${item.id}`)
      notify.success("Page supprimée")
      load()
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de supprimer la page"))
    }
  }

  return (
    <>
      <Panel
        title="Pages"
        description="For her, For him… chaque page contient des rangées de produits (onglet « Rangées »)."
        action={
          <AdminButton variant="primary" icon={Plus} onClick={() => openEditor("new")}>
            Nouvelle page
          </AdminButton>
        }
      >
        {error && (
          <div className="mb-4 rounded-2xl border border-[#f3c9c9] bg-[#fdeeee] px-4 py-3 text-sm text-[#7a1f1f]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : pages.length === 0 ? (
          <EmptyState title="Aucune page" description="Crée ta première page avec le bouton ci-dessus." />
        ) : (
          <ul className="space-y-3">
            {pages.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e9e5df] bg-white p-3 sm:p-4"
              >
                {p.hero_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.hero_image} alt="" className="h-14 w-24 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-14 w-24 items-center justify-center rounded-xl bg-[#f0ece5] text-[10px] text-[#9a948a]">
                    Sans image
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    {!p.visible && <Badge tone="orange">Masquée</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#9a948a]">
                    /{p.slug} · {rowCount[p.id] ?? 0} rangée{(rowCount[p.id] ?? 0) > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Toggle checked={p.visible} onChange={(v) => setVisible(p, v)} label="Visible" />
                  <AdminButton variant="secondary" onClick={() => onOpenRows(p.id)}>
                    Rangées
                  </AdminButton>
                  <AdminButton variant="ghost" icon={Pencil} onClick={() => openEditor(p)}>
                    Titre
                  </AdminButton>
                  <a
                    href={`/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Voir la page"
                    style={{ color: "#3d3a35" }}
                    className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#171717]/[0.06]"
                  >
                    <ExternalLink size={15} />
                  </a>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    aria-label="Supprimer"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#9b1c1c] hover:bg-[#fdeeee]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal
        open={editing !== null}
        title={editing === "new" ? "Nouvelle page" : "Modifier le titre"}
        onClose={() => setEditing(null)}
        footer={
          <>
            <AdminButton onClick={() => setEditing(null)}>Annuler</AdminButton>
            <AdminButton variant="primary" disabled={saving} onClick={save}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </AdminButton>
          </>
        }
      >
        <Field
          label="Titre de la page"
          hint={
            editing === "new"
              ? title.trim()
                ? `Adresse : /${slugify(title)}`
                : "L'adresse de la page est créée à partir du titre."
              : "L'adresse (lien) de la page ne change pas."
          }
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. For her"
            className={inputClass}
            autoFocus
          />
        </Field>
      </Modal>
    </>
  )
}
