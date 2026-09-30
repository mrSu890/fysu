"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { AdminButton, Badge, EmptyState, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { Field, Modal, Toggle, inputClass } from "@/components/Admin/ui/controls"
import ProductPicker, { type PickerProduct } from "@/components/Admin/Pages/ProductPicker"
import { api, errorMessage, notify, slugify } from "@/lib/adminApi"
import {
  ROW_TYPES,
  cleanTitle,
  detectRowKind,
  getRowKind,
  getRowLabel,
  sortRows,
} from "@/lib/rowTypes"

type PageLite = { id: string; title: string; slug: string }

type RowItem = {
  id: string
  title: string
  slug: string | null
  row_type: string | null
  is_active: boolean
  section_products: { display_order: number; product: { id: number; name: string } | null }[]
  section_pages: { pages: PageLite | null }[]
}

type Draft = {
  id: string | null
  title: string
  slug: string | null
  rowType: string // "auto" ou un type
  isActive: boolean
  pageIds: string[]
  productIds: number[]
}

const emptyDraft = (pageIds: string[]): Draft => ({
  id: null,
  title: "",
  slug: null,
  rowType: "auto",
  isActive: true,
  pageIds,
  productIds: [],
})

export default function RowsPanel({ initialPageId }: { initialPageId: string }) {
  const [rows, setRows] = useState<RowItem[]>([])
  const [pages, setPages] = useState<PageLite[]>([])
  const [products, setProducts] = useState<PickerProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>(initialPageId || "all")

  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFilter(initialPageId || "all")
  }, [initialPageId])

  const load = useCallback(async () => {
    try {
      const [r, p, prods] = await Promise.all([
        api.get<RowItem[]>("/api/admin/sections"),
        api.get<PageLite[]>("/api/admin/pages"),
        api.get<PickerProduct[]>("/api/fetchProducts"),
      ])
      setRows(Array.isArray(r) ? r : [])
      setPages(Array.isArray(p) ? p : [])
      setProducts(Array.isArray(prods) ? prods : [])
      setError(null)
    } catch (e) {
      setError(errorMessage(e, "Impossible de charger les rangées"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const thumbs = useMemo(() => new Map(products.map((p) => [p.id, p.thumbnail_url ?? null])), [products])

  const visibleRows = useMemo(() => {
    const list =
      filter === "all"
        ? rows
        : rows.filter((r) => r.section_pages?.some((sp) => sp.pages?.id === filter))
    return sortRows(list)
  }, [rows, filter])

  const productIdsOf = (row: RowItem) =>
    [...(row.section_products ?? [])]
      .sort((a, b) => a.display_order - b.display_order)
      .map((sp) => sp.product?.id)
      .filter((id): id is number => typeof id === "number")

  function openEditor(row: RowItem | null) {
    if (!row) {
      setDraft(emptyDraft(filter !== "all" ? [filter] : []))
      return
    }
    setDraft({
      id: row.id,
      title: row.title,
      slug: row.slug,
      rowType: row.row_type ?? "auto",
      isActive: row.is_active,
      pageIds: (row.section_pages ?? []).map((sp) => sp.pages?.id).filter(Boolean) as string[],
      productIds: productIdsOf(row),
    })
  }

  async function save() {
    if (!draft) return
    const title = draft.title.trim()
    if (!title) return notify.error("Le titre est obligatoire")

    setSaving(true)
    try {
      const payload = {
        title,
        row_type: draft.rowType === "auto" ? null : draft.rowType,
        is_active: draft.isActive,
        product_ids: draft.productIds,
        page_ids: draft.pageIds,
      }

      if (draft.id) {
        await api.put("/api/admin/sections", { id: draft.id, ...payload })
        notify.success("Rangée modifiée")
      } else {
        const suffix = Math.random().toString(36).slice(2, 6)
        await api.post("/api/admin/sections", {
          ...payload,
          slug: `${slugify(cleanTitle(title)) || "rangee"}-${suffix}`,
        })
        notify.success("Rangée créée")
      }
      setDraft(null)
      load()
    } catch (e) {
      notify.error(errorMessage(e, "Impossible d'enregistrer la rangée"))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row: RowItem, value: boolean) {
    setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, is_active: value } : r)))
    try {
      // on renvoie aussi les liens pour ne rien perdre lors de la mise à jour
      await api.put("/api/admin/sections", {
        id: row.id,
        title: row.title,
        is_active: value,
        product_ids: productIdsOf(row),
        page_ids: (row.section_pages ?? []).map((sp) => sp.pages?.id).filter(Boolean),
      })
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de modifier la rangée"))
      load()
    }
  }

  async function remove(row: RowItem) {
    if (!confirm(`Supprimer la rangée « ${cleanTitle(row.title)} » ? Les produits ne sont pas supprimés.`)) return
    try {
      await api.del("/api/admin/sections", { id: row.id })
      notify.success("Rangée supprimée")
      load()
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de supprimer la rangée"))
    }
  }

  const detected = draft ? getRowLabel(detectRowKind(draft.title)) : ""

  return (
    <>
      <Panel
        title="Rangées de produits"
        description="Sur chaque page, les rangées s'affichent toujours dans cet ordre : vestes et manteaux, hauts, pantalons et jupes, robes, accessoires, chaussures."
        action={
          <AdminButton variant="primary" icon={Plus} onClick={() => openEditor(null)}>
            Nouvelle rangée
          </AdminButton>
        }
      >
        <div className="mb-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={inputClass + " sm:max-w-xs"}
          >
            <option value="all">Toutes les pages</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-[#f3c9c9] bg-[#fdeeee] px-4 py-3 text-sm text-[#7a1f1f]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : visibleRows.length === 0 ? (
          <EmptyState
            title="Aucune rangée ici"
            description="Crée une rangée (par exemple « Hauts ») et choisis les pages où elle apparaît."
          />
        ) : (
          <ul className="space-y-3">
            {visibleRows.map((row) => {
              const ids = productIdsOf(row)
              return (
                <li key={row.id} className="rounded-2xl border border-[#e9e5df] bg-white p-3 sm:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{cleanTitle(row.title)}</p>
                    <Badge tone="blue">
                      {getRowLabel(getRowKind(row))}
                      {row.row_type ? "" : " · auto"}
                    </Badge>
                    {!row.is_active && <Badge tone="orange">Masquée</Badge>}
                  </div>

                  <p className="mt-1 text-xs text-[#9a948a]">
                    {(row.section_pages ?? [])
                      .map((sp) => sp.pages?.title)
                      .filter(Boolean)
                      .join(", ") || "Aucune page"}
                    {" · "}
                    {ids.length} produit{ids.length > 1 ? "s" : ""}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5">
                    {ids.slice(0, 6).map((id) =>
                      thumbs.get(id) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={id}
                          src={thumbs.get(id) as string}
                          alt=""
                          className="h-14 w-11 rounded-lg object-cover"
                        />
                      ) : (
                        <div key={id} className="h-14 w-11 rounded-lg bg-[#f0ece5]" />
                      )
                    )}
                    {ids.length > 6 && (
                      <span className="pl-1 text-xs text-[#7a756d]">+{ids.length - 6}</span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#f0ece5] pt-3">
                    <Toggle
                      checked={row.is_active}
                      onChange={(v) => toggleActive(row, v)}
                      label="Visible"
                    />
                    <span className="text-xs text-[#7a756d]">{row.is_active ? "Visible" : "Masquée"}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <AdminButton variant="secondary" icon={Pencil} onClick={() => openEditor(row)}>
                        Modifier
                      </AdminButton>
                      <button
                        type="button"
                        onClick={() => remove(row)}
                        aria-label="Supprimer"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#9b1c1c] hover:bg-[#fdeeee]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Modal
        open={draft !== null}
        wide
        title={draft?.id ? "Modifier la rangée" : "Nouvelle rangée"}
        onClose={() => setDraft(null)}
        footer={
          <>
            <AdminButton onClick={() => setDraft(null)}>Annuler</AdminButton>
            <AdminButton variant="primary" disabled={saving} onClick={save}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </AdminButton>
          </>
        }
      >
        {draft && (
          <div className="space-y-5">
            <Field label="Titre de la rangée (affiché sur la page)">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Ex. Tops"
                className={inputClass}
              />
            </Field>

            <Field
              label="Type de rangée (décide de sa place sur la page)"
              hint="Automatique : le type est deviné d'après le titre."
            >
              <select
                value={draft.rowType}
                onChange={(e) => setDraft({ ...draft, rowType: e.target.value })}
                className={inputClass}
              >
                <option value="auto">Automatique (détecté : {detected})</option>
                {ROW_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>

            <div>
              <p className="mb-1.5 text-xs font-medium text-[#3d3a35]">Pages où la rangée apparaît</p>
              <div className="flex flex-wrap gap-2">
                {pages.map((p) => {
                  const on = draft.pageIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          pageIds: on
                            ? draft.pageIds.filter((id) => id !== p.id)
                            : [...draft.pageIds, p.id],
                        })
                      }
                      className={`cursor-pointer rounded-full px-4 py-2 text-sm transition ${
                        on
                          ? "bg-[#171717] text-white"
                          : "bg-white text-[#3d3a35] ring-1 ring-[#e0dbd3] hover:bg-[#faf8f5]"
                      }`}
                    >
                      {p.title}
                    </button>
                  )
                })}
                {pages.length === 0 && (
                  <p className="text-xs text-[#9a948a]">Crée d&apos;abord une page dans l&apos;onglet Pages.</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Toggle
                checked={draft.isActive}
                onChange={(v) => setDraft({ ...draft, isActive: v })}
                label="Visible"
              />
              <span className="text-sm text-[#3d3a35]">Rangée visible sur le site</span>
            </div>

            <ProductPicker
              products={products}
              value={draft.productIds}
              onChange={(ids) => setDraft({ ...draft, productIds: ids })}
            />
          </div>
        )}
      </Modal>
    </>
  )
}
