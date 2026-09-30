"use client"

import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react"
import { AdminButton, Badge, EmptyState, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { Field, Modal, Toggle, inputClass } from "@/components/Admin/ui/controls"
import ProductPicker, { type PickerProduct } from "@/components/Admin/Pages/ProductPicker"
import { adminFetch, api, errorMessage, notify, slugify } from "@/lib/adminApi"

type CollectionItem = {
  id: string
  title: string
  slug: string
  hero_image: string | null
  visible: boolean
  products: number[]
}

// Collections qui ont leur propre page dans le site (ne pas les supprimer)
const SITE_PAGES = ["thewave", "kiban-collector"]

const publicPath = (slug: string) => (SITE_PAGES.includes(slug) ? `/${slug}` : `/collections/${slug}`)

export default function CollectionsPanel() {
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [products, setProducts] = useState<PickerProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [titleEditor, setTitleEditor] = useState<CollectionItem | "new" | null>(null)
  const [title, setTitle] = useState("")
  const [productEditor, setProductEditor] = useState<CollectionItem | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [list, prods] = await Promise.all([
        api.get<CollectionItem[]>("/api/admin/collectionPages"),
        api.get<PickerProduct[]>("/api/fetchProducts"),
      ])
      setCollections(Array.isArray(list) ? list : [])
      setProducts(Array.isArray(prods) ? prods : [])
      setError(null)
    } catch (e) {
      setError(errorMessage(e, "Impossible de charger les collections"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openTitle(item: CollectionItem | "new") {
    setTitle(item === "new" ? "" : item.title)
    setTitleEditor(item)
  }

  async function saveTitle() {
    const clean = title.trim()
    if (!clean) return notify.error("Le titre est obligatoire")

    setSaving(true)
    try {
      if (titleEditor === "new") {
        const slug = slugify(clean)
        if (!slug) throw new Error("Titre invalide")
        await api.post("/api/admin/collectionPages", { title: clean, slug })
        notify.success("Collection créée. Ajoute ses produits et son image.")
      } else if (titleEditor) {
        await adminFetch(`/api/admin/collectionPages/${titleEditor.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: clean }),
        })
        notify.success("Titre modifié")
      }
      setTitleEditor(null)
      load()
    } catch (e) {
      notify.error(errorMessage(e, "Impossible d'enregistrer"))
    } finally {
      setSaving(false)
    }
  }

  function openProducts(item: CollectionItem) {
    setSelected(item.products ?? [])
    setProductEditor(item)
  }

  async function saveProducts() {
    if (!productEditor) return
    setSaving(true)
    try {
      await api.post(`/api/admin/collectionPages/${productEditor.id}/products`, {
        productIds: selected,
      })
      notify.success("Produits enregistrés")
      setProductEditor(null)
      load()
    } catch (e) {
      notify.error(errorMessage(e, "Impossible d'enregistrer les produits"))
    } finally {
      setSaving(false)
    }
  }

  async function setVisible(item: CollectionItem, visible: boolean) {
    setCollections((cur) => cur.map((c) => (c.id === item.id ? { ...c, visible } : c)))
    try {
      await adminFetch(`/api/admin/collectionPages/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ visible }),
      })
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de changer la visibilité"))
      load()
    }
  }

  async function remove(item: CollectionItem) {
    if (!confirm(`Supprimer la collection « ${item.title} » ? Les produits ne sont pas supprimés.`)) return
    try {
      await api.del(`/api/admin/collectionPages/${item.id}`)
      notify.success("Collection supprimée")
      load()
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de supprimer la collection"))
    }
  }

  return (
    <>
      <Panel
        title="Collections"
        description="The Wave, Kiban Collector et les autres collections. L'image du haut se change dans « Images de garde »."
        action={
          <AdminButton variant="primary" icon={Plus} onClick={() => openTitle("new")}>
            Nouvelle collection
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
        ) : collections.length === 0 ? (
          <EmptyState
            title="Aucune collection"
            description="Crée ta première collection avec le bouton ci-dessus."
          />
        ) : (
          <ul className="space-y-3">
            {collections.map((c) => {
              const special = SITE_PAGES.includes(c.slug)
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e9e5df] bg-white p-3 sm:p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      {!c.visible && <Badge tone="orange">Masquée</Badge>}
                      {special && <Badge tone="blue">Page du site</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[#9a948a]">
                      {publicPath(c.slug)} · {c.products.length} produit{c.products.length > 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Toggle checked={c.visible} onChange={(v) => setVisible(c, v)} label="Visible" />
                    <AdminButton variant="secondary" icon={ShoppingBag} onClick={() => openProducts(c)}>
                      Produits
                    </AdminButton>
                    <AdminButton variant="ghost" icon={Pencil} onClick={() => openTitle(c)}>
                      Titre
                    </AdminButton>
                    <a
                      href={publicPath(c.slug)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Voir la page"
                      style={{ color: "#3d3a35" }}
                      className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#171717]/[0.06]"
                    >
                      <ExternalLink size={15} />
                    </a>
                    {!special && (
                      <button
                        type="button"
                        onClick={() => remove(c)}
                        aria-label="Supprimer"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#9b1c1c] hover:bg-[#fdeeee]"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Modal
        open={titleEditor !== null}
        title={titleEditor === "new" ? "Nouvelle collection" : "Modifier le titre"}
        onClose={() => setTitleEditor(null)}
        footer={
          <>
            <AdminButton onClick={() => setTitleEditor(null)}>Annuler</AdminButton>
            <AdminButton variant="primary" disabled={saving} onClick={saveTitle}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </AdminButton>
          </>
        }
      >
        <Field
          label="Titre de la collection"
          hint={
            titleEditor === "new"
              ? title.trim()
                ? `Adresse : /collections/${slugify(title)}`
                : "L'adresse est créée à partir du titre."
              : "L'adresse (lien) ne change pas."
          }
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Summer drop"
            className={inputClass}
            autoFocus
          />
        </Field>
      </Modal>

      <Modal
        open={productEditor !== null}
        wide
        title={productEditor ? `Produits de « ${productEditor.title} »` : ""}
        onClose={() => setProductEditor(null)}
        footer={
          <>
            <AdminButton onClick={() => setProductEditor(null)}>Annuler</AdminButton>
            <AdminButton variant="primary" disabled={saving} onClick={saveProducts}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </AdminButton>
          </>
        }
      >
        <ProductPicker products={products} value={selected} onChange={setSelected} />
      </Modal>
    </>
  )
}
