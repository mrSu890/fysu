"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Copy, Pencil, Plus, Search, Tags, Trash2, X } from "lucide-react"
import {
  AdminButton,
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  Skeleton,
} from "@/components/Admin/ui/kit"
import { api, errorMessage, formatDate, notify } from "@/lib/adminApi"

type Product = {
  id: number
  name: string
  slug: string
  price: number
  gender: string
  category_id: number | null
  createdAt: string | null
  thumbnail: string | null
  totalStock: number
  sizeCount: number
  stockState: "none" | "out" | "low" | "ok"
}

type Category = { id: number; name: string; slug: string }

const GENDERS: Record<string, string> = { him: "Homme", her: "Femme", unisex: "Unisexe" }

const SELECT_CLASS =
  "h-10 rounded-full border border-[#e0dbd3] bg-white px-4 text-sm text-[#171717] outline-none focus:ring-2 focus:ring-[#171717]/10"

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
  const [stockFilter, setStockFilter] = useState("all")
  const [sort, setSort] = useState("newest")

  const [showCategories, setShowCategories] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [busy, setBusy] = useState<number | null>(null)

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
  }, [products, query, categoryFilter, genderFilter, stockFilter, sort])

  const hasFilters =
    query !== "" || categoryFilter !== "all" || genderFilter !== "all" || stockFilter !== "all"

  function resetFilters() {
    setQuery("")
    setCategoryFilter("all")
    setGenderFilter("all")
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

        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="none">Sans catégorie</option>
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="all">Tous les genres</option>
            <option value="him">Homme</option>
            <option value="her">Femme</option>
            <option value="unisex">Unisexe</option>
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="all">Tout le stock</option>
            <option value="low">Stock bas / sans taille</option>
            <option value="out">Épuisés</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={`${SELECT_CLASS} sm:ml-auto`}
          >
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
          <ul className="divide-y divide-[#f0ece5]">
            {filtered.map((p) => (
              <li
                key={p.id}
                className={`flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 ${
                  busy === p.id ? "opacity-50" : ""
                }`}
              >
                <Link href={`/admin/catalog/${p.id}`} className="shrink-0">
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnail}
                      alt={p.name}
                      className="h-16 w-12 rounded-lg bg-[#f0ece5] object-cover"
                    />
                  ) : (
                    <div className="h-16 w-12 rounded-lg bg-[#f0ece5]" />
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/catalog/${p.id}`}
                    style={{ color: "#171717" }}
                    className="block truncate text-sm font-medium"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-[#9a948a]">
                    {p.category_id != null ? categoryName[p.category_id] ?? "—" : "Sans catégorie"}
                    {p.gender && ` · ${GENDERS[p.gender] ?? p.gender}`}
                    <span className="hidden sm:inline"> · {formatDate(p.createdAt)}</span>
                  </p>
                  <div className="mt-1.5 sm:hidden">
                    <StockBadge p={p} />
                  </div>
                </div>

                <div className="hidden sm:block">
                  <StockBadge p={p} />
                </div>

                <p className="w-20 text-right text-sm font-medium">{p.price.toFixed(2)} €</p>

                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/admin/catalog/${p.id}`}
                    title="Modifier"
                    style={{ color: "#3d3a35" }}
                    className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#171717]/[0.06]"
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    type="button"
                    title="Dupliquer"
                    onClick={() => handleDuplicate(p)}
                    className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#3d3a35] hover:bg-[#171717]/[0.06] sm:flex"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    type="button"
                    title="Supprimer"
                    onClick={() => handleDelete(p)}
                    className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#9b1c1c] hover:bg-[#fdeeee] sm:flex"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {!loading && filtered.length > 0 && (
        <p className="mt-3 text-center text-xs text-[#9a948a]">
          {filtered.length} produit(s) affiché(s)
          {hasFilters ? ` sur ${products.length}` : ""} · Dupliquer et supprimer sont dans la fiche
          produit sur téléphone.
        </p>
      )}
    </>
  )
}
