"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { AdminButton, PageHeader, Panel } from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"
import { PRODUCT_TYPE_LIST, getProductType, type ProductTypeId } from "@/lib/productTypes"

type Category = { id: number; name: string }

const INPUT =
  "w-full rounded-2xl border border-[#e0dbd3] bg-white px-4 py-2.5 text-sm text-[#171717] outline-none placeholder:text-[#b3ada3] focus:ring-2 focus:ring-[#171717]/10"

// Création rapide : on choisit le type, le nom et le prix, puis on complète la fiche
export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [type, setType] = useState<ProductTypeId>("clothing")
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [gender, setGender] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get<Category[]>("/api/admin/categories")
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  const cfg = getProductType(type)

  async function create() {
    const value = Number(price.replace(",", "."))
    if (!name.trim()) return notify.error("Le nom est obligatoire")
    if (price.trim() === "" || Number.isNaN(value) || value < 0) return notify.error("Prix invalide")

    setSaving(true)
    try {
      const res = await api.post<{ id: number }>("/api/admin/products/create", {
        name: name.trim(),
        price: value,
        product_type: type,
        category_id: categoryId === "" ? null : Number(categoryId),
        gender: cfg.showGender ? gender : "",
      })
      notify.success("Produit créé, complète maintenant la fiche")
      router.push(`/admin/catalog/${res.id}`)
    } catch (e) {
      notify.error(errorMessage(e, "Erreur lors de la création"))
      setSaving(false)
    }
  }

  return (
    <>
      <div className="mb-4">
        <AdminButton href="/admin/catalog" variant="ghost" icon={ArrowLeft}>
          Retour aux produits
        </AdminButton>
      </div>

      <PageHeader
        eyebrow="Boutique"
        title="Nouveau produit"
        description="Choisis le type de produit : les tailles et les champs s'adaptent automatiquement."
      />

      <div className="space-y-4">
        <Panel title="Type de produit">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PRODUCT_TYPE_LIST.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`flex cursor-pointer flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${
                  type === t.id
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-[#e9e5df] bg-[#faf8f5] text-[#171717] hover:bg-white"
                }`}
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="text-sm font-medium">{t.label}</span>
                <span className={`text-[11px] ${type === t.id ? "text-white/70" : "text-[#9a948a]"}`}>
                  {t.sizeNounAdmin} : {t.presets.slice(0, 3).join(", ")}
                  {t.presets.length > 3 ? "…" : ""}
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Informations de base">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-[#3d3a35]">Nom</span>
              <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#3d3a35]">Prix (€)</span>
              <input
                className={INPUT}
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#3d3a35]">Catégorie</span>
              <select className={INPUT} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sans catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {cfg.showGender && (
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-[#3d3a35]">Genre</span>
                <select className={INPUT} value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">—</option>
                  <option value="him">Homme</option>
                  <option value="her">Femme</option>
                  <option value="unisex">Unisexe</option>
                </select>
              </label>
            )}
          </div>
        </Panel>

        <div className="flex justify-end">
          <AdminButton variant="primary" onClick={create} disabled={saving}>
            {saving ? "Création…" : "Créer et compléter la fiche"}
          </AdminButton>
        </div>
      </div>
    </>
  )
}
