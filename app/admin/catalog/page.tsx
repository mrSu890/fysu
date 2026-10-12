"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Copy, MoreHorizontal, Pencil, Plus, Search, Tags, Trash2, X } from "lucide-react"
import {
  AdminButton,
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  Skeleton,
} from "@/components/Admin/ui/kit"
import { api, errorMessage, formatDate, notify } from "@/lib/adminApi"
import { PRODUCT_TYPE_LIST, getProductType } from "@/lib/productTypes"

type Product = {
  id: number
  name: string
  slug: string
  price: number
  gender: string
  product_type: string
  category_id: number | null
  createdAt: string | null
  thumbnail: string | null
  totalStock: number
  sizeCount: number
  stockState: "none" | "out" | "low" | "ok"
  is_hidden: boolean
}

type Category = { id: number; name: string; slug: string }

const GENDERS: Record<string, string> = { him: "Homme", her: "Femme", unisex: "Unisexe" }

const SELECT_CLASS =
  "h-10 rounded-full border border-[#e0dbd3] bg-white px-4 text-sm text-[#171717] outline-none focus:ring-2 focus:ring-[#171717]/10"

function Pills({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { id: string; label: string; count?: number }[]
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wide text-[#9a948a]">{label}</span>
      <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((o) => {
          const active = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={active}
              className={`h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 text-sm transition-colors ${
                active
                  ? "bg-[#171717] text-white"
                  : "bg-white text-[#3d3a35] ring-1 ring-[#e0dbd3] hover:bg-[#faf8f5]"
              }`}
            >
              {o.label}
              {o.count !== undefined && (
                <span className={`ml-1.5 text-xs ${active ? "text-white/60" : "text-[#9a948a]"}`}>{o.count}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StockBadge({ p }: { p: Product }) {
  if (p.stockState === "none") return <Badge tone="orange">Aucune taille</Badge>
  if (p.stockState === "out") return <Badge tone="red">Épuisé</Badge>
  if (p.stockState === "low") return <Badge tone="orange">Stock bas · {p.totalStock}</Badge>
  return <Badge tone="green">En stock · {p.totalStock}</Badge>
}

export default function AdminCatalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [genderFilter, setGenderFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [sort, setSort] = useState("newest")

  const [showCategories, setShowCategories] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [busy, setBusy] = useState<number | null>(null)
  const [menuId, setMenuId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api.get<{ products: Product[] }>("/api/admin/products"),
        api.get<Category[]>("/api/admin/categories"),
      ])
      setProducts(p.products)
      setCategories(c)
      setError(null)
    } catch (e) {
      setError(errorMessage(e, "Impossible de charger le catalogue"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const categoryName = useMemo(() => {
    const map: Record<number, string> = {}
    categories.forEach((c) => (map[c.id] = c.name))
    return map
  }, [categories])

  const countByCategory = useMemo(() => {
    const map: Record<number, number> = {}
    products.forEach((p) => {
      if (p.category_id != null) map[p.category_id] = (map[p.category_id] ?? 0) + 1
    })
    return map
  }, [products])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = products.filter((p) => {
      if (q && !`${p.name} ${p.slug}`.toLowerCase().includes(q)) return false
      if (categoryFilter === "none" && p.category_id != null) return false
      if (
        categoryFilter !== "all" &&
        categoryFilter !== "none" &&
        String(p.category_id) !== categoryFilter
      )
        return false
      if (genderFilter !== "all" && p.gender !== genderFilter) return false
      if (typeFilter !== "all" && p.product_type !== typeFilter) return false
      if (stockFilter === "low" && !(p.stockState === "low" || p.stockState === "none")) return false
      if (stockFilter === "out" && p.stockState !== "out") return false
      return true
    })

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return (a.createdAt ?? "").localeCompare(b.createdAt ?? "")
        case "name":
          return a.name.localeCompare(b.name)
        case "price-asc":
          return a.price - b.price
        case "price-desc":
          return b.price - a.price
        case "stock-asc":
          return a.totalStock - b.totalStock
        default:
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
      }
    })
    return list
  }, [products, query, categoryFilter, genderFilter, typeFilter, stockFilter, sort])

  const hasFilters =
    query !== "" ||
    categoryFilter !== "all" ||
    genderFilter !== "all" ||
    typeFilter !== "all" ||
    stockFilter !== "all"

  function resetFilters() {
    setQuery("")
    setCategoryFilter("all")
    setGenderFilter("all")
    setTypeFilter("all")
    setStockFilter("all")
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Supprimer « ${p.name} » ? Cette action est définitive.`)) return
    setBusy(p.id)
    try {
      await api.post("/api/admin/products/delete", { id: p.id })
      notify.success("Produit supprimé")
      await load()
    } catch (e) {
      notify.error(errorMessage(e, "Erreur lors de la suppression"))
    } finally {
      setBusy(null)
    }
  }

  async function toggleHidden(p: Product) {
    const next = !p.is_hidden
    // on change tout de suite à l'écran, puis on confirme avec le serveur
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, is_hidden: next } : x)))
    try {
      await api.post("/api/admin/products/visibility", { id: p.id, hidden: next })
      notify.success(next ? "Produit masqué sur le site" : "Produit de nouveau visible")
    } catch (e) {
      setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, is_hidden: !next } : x)))
      notify.error(errorMessage(e, "Impossible de changer la visibilité"))
    }
  }

  async function handleDuplicate(p: Product) {
    setBusy(p.id)
    try {
      await api.post(`/api/admin/products/${p.id}/duplicate`)
      notify.success("Produit dupliqué")
      await load()
    } catch (e) {
      notify.error(errorMessage(e, "Erreur lors de la duplication"))
    } finally {
      setBusy(null)
    }
  }

  async function createCategory() {
    const name = newCategory.trim()
    if (!name) return
    try {
      await api.post("/api/admin/categories/create", { name })
      notify.success("Catégorie créée")
      setNewCategory("")
      await load()
    } catch (e) {
      notify.error(errorMessage(e, "Erreur création catégorie"))
    }
  }

  async function deleteCategory(c: Category) {
    const count = countByCategory[c.id] ?? 0
    const message =
      count > 0
        ? `« ${c.name} » contient ${count} produit(s). Supprimer quand même la catégorie ?`
        : `Supprimer la catégorie « ${c.name} » ?`
    if (!confirm(message)) return
    try {
      await api.post("/api/admin/categories/delete", { id: c.id })
      notify.success("Catégorie supprimée")
      if (categoryFilter === String(c.id)) setCategoryFilter("all")
      await load()
    } catch (e) {
      notify.error(errorMessage(e, "Erreur suppression catégorie"))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Boutique"
        title="Produits"
        description={
          loading ? "Chargement…" : `${products.length} produit(s) dans le catalogue`
        }
        actions={
          <>
            <AdminButton icon={Tags} onClick={() => setShowCategories((v) => !v)}>
              Catégories
            </AdminButton>
            <AdminButton href="/admin/catalog/new" variant="primary" icon={Plus}>
              Nouveau produit
            </AdminButton>
          </>
        }
      />

      {error && (
        <div className="mb-6 rounded-2xl border border-[#f3c9c9] bg-[#fdeeee] px-4 py-3 text-sm text-[#7a1f1f]">
          {error}
        </div>
      )}

      {/* Catégories (repliable) */}
      {showCategories && (
        <Panel
          title="Catégories"
          description="Les catégories regroupent les produits dans le catalogue."
          className="mb-6"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCategory()}
              placeholder="Nom de la nouvelle catégorie"
              className="h-10 flex-1 rounded-full border border-[#e0dbd3] bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[#171717]/10"
            />
            <AdminButton variant="primary" icon={Plus} onClick={createCategory}>
              Créer
            </AdminButton>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.length === 0 && (
              <p className="text-sm text-[#7a756d]">Aucune catégorie pour l&apos;instant.</p>
            )}
            {categories.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-2 rounded-full bg-[#faf8f5] py-1.5 pl-4 pr-1.5 text-sm ring-1 ring-[#e9e5df]"
              >
                {c.name}
                <span className="text-xs text-[#9a948a]">{countByCategory[c.id] ?? 0}</span>
                <button
                  type="button"
                  onClick={() => deleteCategory(c)}
                  aria-label={`Supprimer ${c.name}`}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[#9a948a] hover:bg-[#f8d9d9] hover:text-[#7a1f1f]"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        </Panel>
      )}

      {/* Barre de recherche + filtres */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a948a]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit…"
            className="h-11 w-full rounded-full border border-[#e0dbd3] bg-white pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#171717]/10"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Pills
            label="Catégorie"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { id: "all", label: "Toutes", count: products.length },
              ...categories.map((c) => ({ id: String(c.id), label: c.name, count: countByCategory[c.id] ?? 0 })),
              { id: "none", label: "Sans catégorie", count: products.filter((p) => p.category_id == null).length },
            ]}
          />
          <Pills
            label="Type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[{ id: "all", label: "Tous" }, ...PRODUCT_TYPE_LIST.map((t) => ({ id: t.id, label: t.label }))]}
          />
          <Pills
            label="Genre"
            value={genderFilter}
            onChange={setGenderFilter}
            options={[
              { id: "all", label: "Tous" },
              { id: "him", label: "Homme" },
              { id: "her", label: "Femme" },
              { id: "unisex", label: "Unisexe" },
            ]}
          />
          <Pills
            label="Stock"
            value={stockFilter}
            onChange={setStockFilter}
            options={[
              { id: "all", label: "Tout" },
              { id: "low", label: "Stock bas / sans taille" },
              { id: "out", label: "Épuisés" },
            ]}
          />

          <div className="mt-1 flex items-center gap-2">
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={SELECT_CLASS}>
              <option value="newest">Plus récents</option>
              <option value="oldest">Plus anciens</option>
              <option value="name">Nom (A → Z)</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="stock-asc">Stock le plus bas</option>
            </select>
            {hasFilters && (
              <AdminButton variant="ghost" icon={X} onClick={resetFilters}>
                Effacer
              </AdminButton>
            )}
          </div>
        </div>
      </div>

      {/* Liste */}
      <Panel padded={false}>
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={hasFilters ? "Aucun produit ne correspond" : "Aucun produit pour l'instant"}
              description={
                hasFilters
                  ? "Essaie d'effacer les filtres."
                  : "Crée ton premier produit pour commencer."
              }
              action={
                hasFilters ? (
                  <AdminButton onClick={resetFilters}>Effacer les filtres</AdminButton>
                ) : (
                  <AdminButton href="/admin/catalog/new" variant="primary" icon={Plus}>
                    Nouveau produit
                  </AdminButton>
                )
              }
            />
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((p) => (
              <li
                key={p.id}
                className={`relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-[#ebe6de] ${
                  busy === p.id ? "opacity-50" : ""
                }`}
              >
                <Link href={`/admin/catalog/${p.id}`} className="relative block aspect-[3/4] w-full bg-[#f0ece5]">
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnail}
                      alt={p.name}
                      className={`h-full w-full object-cover ${p.is_hidden ? "opacity-40" : ""}`}
                    />
                  ) : null}
                  {p.is_hidden && (
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#6b665d]">
                      Masqué
                    </span>
                  )}
                </Link>

                <div className="flex flex-1 flex-col gap-1 px-3 pt-3">
                  <Link
                    href={`/admin/catalog/${p.id}`}
                    style={{ color: "#171717" }}
                    className="block truncate text-sm font-medium"
                  >
                    {p.name}
                  </Link>
                  <p className="truncate text-xs text-[#9a948a]">
                    {getProductType(p.product_type).label}
                    {" · "}
                    {p.category_id != null ? categoryName[p.category_id] ?? "—" : "Sans catégorie"}
                    {p.gender && ` · ${GENDERS[p.gender] ?? p.gender}`}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{p.price.toFixed(2)} €</p>
                    <StockBadge p={p} />
                  </div>
                </div>

                {/* Pied de carte : visibilité à gauche, autres actions dans « … » à droite (loin l'un de l'autre) */}
                <div className="mt-3 flex items-center justify-between border-t border-[#f0ece5] px-3 py-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!p.is_hidden}
                    aria-label={p.is_hidden ? "Afficher ce produit sur le site" : "Masquer ce produit du site"}
                    onClick={() => toggleHidden(p)}
                    className="flex h-10 cursor-pointer items-center gap-2 pr-3 text-xs text-[#6b665d]"
                  >
                    <span
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        p.is_hidden ? "bg-[#d4cfc6]" : "bg-[#171717]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          p.is_hidden ? "left-0.5" : "left-[22px]"
                        }`}
                      />
                    </span>
                    {p.is_hidden ? "Masqué" : "Visible"}
                  </button>
                  <button
                    type="button"
                    aria-label="Plus d'actions"
                    onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#3d3a35] hover:bg-[#171717]/[0.06]"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                {menuId === p.id && (
                  <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 rounded-t-2xl bg-white p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] ring-1 ring-[#ebe6de]">
                    <Link
                      href={`/admin/catalog/${p.id}`}
                      style={{ color: "#171717" }}
                      className="flex h-11 items-center gap-2 rounded-xl bg-[#faf8f5] px-3 text-sm"
                    >
                      <Pencil size={15} /> Modifier
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuId(null)
                        handleDuplicate(p)
                      }}
                      className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#faf8f5] px-3 text-sm text-[#171717]"
                    >
                      <Copy size={15} /> Dupliquer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuId(null)
                        handleDelete(p)
                      }}
                      className="mt-1 flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#fdeeee] px-3 text-sm text-[#9b1c1c]"
                    >
                      <Trash2 size={15} /> Supprimer
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenuId(null)}
                      className="h-9 cursor-pointer text-xs text-[#9a948a]"
                    >
                      Fermer
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {!loading && filtered.length > 0 && (
        <p className="mt-3 text-center text-xs text-[#9a948a]">
          {filtered.length} produit(s) affiché(s)
          {hasFilters ? ` sur ${products.length}` : ""} · L'interrupteur affiche ou masque le produit sur le site. Dupliquer et supprimer : bouton « … ».
        </p>
      )}
    </>
  )
}
