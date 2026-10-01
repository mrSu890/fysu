"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, Crop, ExternalLink, ImagePlus, Plus, RefreshCw, Trash2, Upload } from "lucide-react"
import { AdminButton, PageHeader, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"
import { resizeImage } from "@/lib/imageTools"
import ImageEditorModal from "@/components/Admin/Catalog/ImageEditorModal"
import { PRODUCT_TYPE_LIST, getAdminLabels, getProductType } from "@/lib/productTypes"
import { AVAILABILITY_LIST, getEffectiveAvailability, isAvailabilityId } from "@/lib/availability"
import { BRAND_LIST, getBrandId } from "@/lib/brands"
import { FAMILY_ADMIN_LIST } from "@/lib/olfactive"

/* ====================================================================
   FICHE PRODUIT EN PLEINE PAGE
   Onglets : Général · Couleurs & stock · Infos · Recommandations
   Chaque couleur a son nom, ses images et son stock par taille.
   ==================================================================== */

type Category = { id: number; name: string }
type ListProduct = { id: number; name: string; thumbnail: string | null }

type SizeState = { id?: string; size: string; stock: number; is_active: boolean }
type ColorState = {
  id?: string
  name: string
  hex: string
  images: string[]
  sizes: SizeState[]
}
type InfoBlockState = {
  image_url: string | null
  title: string
  subtitle: string
  content: string
}

type FormState = {
  name: string
  description: string
  details: string
  size_fit: string
  care_instructions: string
  shipping: string
  price: string
  category_id: number | null
  gender: string
  product_type: string
  availability: string
  release_date: string
  brand: string
  olfactive_family: string
  evocation: string
}

const TABS = [
  { id: "general", label: "Général" },
  { id: "colors", label: "Couleurs & stock" },
  { id: "info", label: "Infos produit" },
  { id: "related", label: "Recommandations" },
] as const
type TabId = (typeof TABS)[number]["id"]

const INPUT =
  "w-full rounded-2xl border border-[#e0dbd3] bg-white px-4 py-2.5 text-sm text-[#171717] outline-none placeholder:text-[#b3ada3] focus:ring-2 focus:ring-[#171717]/10"

const HEX_RE = /^#[0-9a-f]{6}$/i
const PALETTE = ["#000000", "#ffffff", "#8a8a8a", "#1f3f73", "#7a1f1f", "#2c4a26", "#c9b79c", "#e10813"]

const normalizeColor = (c: string) => c.trim().toLowerCase() || "#000000"
const pickerValue = (c: string) => (HEX_RE.test(c.trim()) ? c.trim() : "#000000")

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[#3d3a35]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#9a948a]">{hint}</span>}
    </label>
  )
}

function FileButton({
  children,
  multiple,
  onFiles,
  disabled,
}: {
  children: React.ReactNode
  multiple?: boolean
  onFiles: (files: File[]) => void
  disabled?: boolean
}) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium ring-1 ring-[#e0dbd3] hover:bg-[#faf8f5] ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <Upload size={15} />
      {children}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from((e.target.files ?? []) as FileList)
          e.target.value = ""
          if (files.length) onFiles(files)
        }}
      />
    </label>
  )
}

export default function ProductEditor({ id }: { id: string }) {
  const router = useRouter()
  const productId = Number(id)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState<TabId>("general")

  const [slug, setSlug] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [allProducts, setAllProducts] = useState<ListProduct[]>([])

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    details: "",
    size_fit: "",
    care_instructions: "",
    shipping: "",
    price: "",
    category_id: null,
    gender: "",
    product_type: "clothing",
    availability: "available",
    release_date: "",
    brand: "fysu",
    olfactive_family: "",
    evocation: "",
  })
  const [colors, setColors] = useState<ColorState[]>([])
  const [infoBlocks, setInfoBlocks] = useState<InfoBlockState[]>([])
  const [sizeGuide, setSizeGuide] = useState<string | null>(null)
  const [related, setRelated] = useState<number[]>([])
  const [relatedQuery, setRelatedQuery] = useState("")
  // image en cours de recadrage
  const [editingImage, setEditingImage] = useState<{ ci: number; ii: number } | null>(null)

  // Instantané des données enregistrées : sert à savoir s'il y a des modifications
  const [saved, setSaved] = useState("")
  const snapshot = useMemo(
    () => JSON.stringify({ form, colors, infoBlocks, sizeGuide, related }),
    [form, colors, infoBlocks, sizeGuide, related]
  )
  const dirty = !loading && saved !== "" && snapshot !== saved

  const load = useCallback(async () => {
    try {
      const [p, cats, list] = await Promise.all([
        api.get<any>(`/api/admin/products/${id}`),
        api.get<Category[]>("/api/admin/categories"),
        api.get<{ products: ListProduct[] }>("/api/admin/products"),
      ])

      const nextForm: FormState = {
        name: p.name ?? "",
        description: p.description ?? "",
        details: p.details ?? "",
        size_fit: p.size_fit ?? "",
        care_instructions: p.care_instructions ?? "",
        shipping: p.shipping ?? "",
        price: p.price != null ? String(p.price) : "",
        category_id: p.category_id ?? null,
        gender: p.gender ?? "",
        product_type: p.product_type ?? "clothing",
        availability: isAvailabilityId(p.availability) ? p.availability : "available",
        release_date: p.release_date ? String(p.release_date).slice(0, 10) : "",
        brand: getBrandId(p.brand),
        olfactive_family: p.olfactive_family ?? "",
        evocation: p.evocation ?? "",
      }

      const imageRows = (p.product_images ?? []) as { url: string; color: string | null }[]
      const sizeRows = ((p.product_sizes ?? []) as any[])
        .slice()
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      const colorRows = (p.product_colors ?? []) as { id: string; name: string; hex: string }[]

      const toSize = (s: any): SizeState => ({
        id: s.id,
        size: s.size ?? "",
        stock: Number(s.stock ?? 0),
        is_active: !!s.is_active,
      })

      let nextColors: ColorState[]

      if (colorRows.length > 0) {
        nextColors = colorRows.map((c, i) => {
          const hex = (c.hex || "#000000").toLowerCase()
          return {
            id: c.id,
            name: c.name,
            hex,
            // les images sans couleur reconnue vont sur la première couleur
            images: imageRows
              .filter((img) => {
                const imgHex = (img.color || "#000000").toLowerCase()
                const known = colorRows.some((cc) => (cc.hex || "").toLowerCase() === imgHex)
                return imgHex === hex || (i === 0 && !known)
              })
              .map((img) => img.url),
            // les tailles sans couleur vont aussi sur la première
            sizes: sizeRows
              .filter((s) => s.color_id === c.id || (i === 0 && !s.color_id))
              .map(toSize),
          }
        })
      } else {
        // produit sans couleur enregistrée : on part d'une couleur "Unique"
        nextColors = [
          {
            name: "Unique",
            hex: "#000000",
            images: imageRows.map((img) => img.url),
            sizes: sizeRows.map(toSize),
          },
        ]
      }

      const nextInfo: InfoBlockState[] = ((p.product_info_blocks ?? []) as any[]).map((b) => ({
        image_url: b.image_url ?? null,
        title: b.title ?? "",
        subtitle: b.subtitle ?? "",
        content: b.content ?? "",
      }))

      const nextRelated: number[] = ((p.product_suggestions ?? []) as any[])
        .filter(Boolean)
        .map((s) => s.id)

      setSlug(p.slug ?? "")
      setForm(nextForm)
      setColors(nextColors)
      setInfoBlocks(nextInfo)
      setSizeGuide(p.size_guide_image_url ?? null)
      setRelated(nextRelated)
      setCategories(cats)
      setAllProducts(list.products)
      setSaved(
        JSON.stringify({
          form: nextForm,
          colors: nextColors,
          infoBlocks: nextInfo,
          sizeGuide: p.size_guide_image_url ?? null,
          related: nextRelated,
        })
      )
      setLoadError(null)
    } catch (e) {
      setLoadError(errorMessage(e, "Produit introuvable"))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Prévient si on quitte la page avec des modifications non enregistrées
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  /* ---------- Envois d'images ---------- */

  async function uploadProductImages(ci: number, files: File[]) {
    const color = normalizeColor(colors[ci]?.hex ?? "#000000")
    setUploading(true)
    try {
      // un par un : le nom du fichier contient l'heure, pas de risque de collision
      for (const original of files) {
        const file = await resizeImage(original)
        const fd = new FormData()
        fd.append("file", file)
        fd.append("productId", String(productId))
        fd.append("color", color)
        const data = await api.upload<{ url: string }>("/api/admin/products/upload-product-image", fd)
        setColors((cur) =>
          cur.map((c, i) => (i === ci ? { ...c, images: [...c.images, data.url] } : c))
        )
      }
    } catch (e) {
      notify.error(errorMessage(e, "Erreur d'envoi de l'image"))
    } finally {
      setUploading(false)
    }
  }

  // Remplace une image par une autre, au même endroit (même couleur, même position)
  async function replaceImage(ci: number, ii: number, file: File) {
    const color = normalizeColor(colors[ci]?.hex ?? "#000000")
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", await resizeImage(file))
      fd.append("productId", String(productId))
      fd.append("color", color)
      const data = await api.upload<{ url: string }>("/api/admin/products/upload-product-image", fd)
      setColors((cur) =>
        cur.map((c, i) =>
          i === ci ? { ...c, images: c.images.map((u, j) => (j === ii ? data.url : u)) } : c
        )
      )
    } catch (e) {
      notify.error(errorMessage(e, "Erreur d'envoi de l'image"))
    } finally {
      setUploading(false)
    }
  }

  async function uploadSizeGuide(files: File[]) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", await resizeImage(files[0]))
      fd.append("productId", String(productId))
      const data = await api.upload<{ url: string }>("/api/admin/products/upload-size-guide", fd)
      setSizeGuide(data.url)
    } catch (e) {
      notify.error(errorMessage(e, "Erreur d'envoi de l'image"))
    } finally {
      setUploading(false)
    }
  }

  async function uploadInfoBlockImage(index: number, files: File[]) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", await resizeImage(files[0]))
      fd.append("productId", String(productId))
      const data = await api.upload<{ url: string }>("/api/admin/products/upload-info-block", fd)
      setInfoBlocks((cur) => cur.map((b, i) => (i === index ? { ...b, image_url: data.url } : b)))
    } catch (e) {
      notify.error(errorMessage(e, "Erreur d'envoi de l'image"))
    } finally {
      setUploading(false)
    }
  }

  /* ---------- Modifications des couleurs ---------- */

  const updateColor = (ci: number, patch: Partial<ColorState>) =>
    setColors((cur) => cur.map((c, i) => (i === ci ? { ...c, ...patch } : c)))

  const addColor = () =>
    setColors((cur) => {
      const used = new Set(cur.map((c) => c.hex.toLowerCase()))
      const hex = PALETTE.find((h) => !used.has(h)) ?? "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")
      return [
        ...cur,
        {
          name: `Couleur ${cur.length + 1}`,
          hex,
          images: [],
          // mêmes tailles que la première couleur, stock à 0 (à remplir)
          sizes: (cur[0]?.sizes ?? []).map((s) => ({ size: s.size, stock: 0, is_active: s.is_active })),
        },
      ]
    })

  const removeColor = (ci: number) => {
    if (colors.length <= 1) return
    if (!confirm(`Supprimer la couleur « ${colors[ci].name} », ses images et son stock ?`)) return
    setColors((cur) => cur.filter((_, i) => i !== ci))
  }

  const removeImage = (ci: number, imgIndex: number) =>
    setColors((cur) =>
      cur.map((c, i) => (i === ci ? { ...c, images: c.images.filter((_, j) => j !== imgIndex) } : c))
    )

  const moveImage = (ci: number, imgIndex: number, to: number) => {
    if (ci === to) return
    setColors((cur) => {
      const img = cur[ci]?.images[imgIndex]
      if (!img) return cur
      return cur.map((c, i) => {
        if (i === ci) return { ...c, images: c.images.filter((_, j) => j !== imgIndex) }
        if (i === to) return { ...c, images: [...c.images, img] }
        return c
      })
    })
  }

  // Met une image en première position (c'est elle qui sert de vignette)
  const makeMain = (ci: number, imgIndex: number) =>
    setColors((cur) =>
      cur.map((c, i) => {
        if (i !== ci) return c
        const img = c.images[imgIndex]
        return { ...c, images: [img, ...c.images.filter((_, j) => j !== imgIndex)] }
      })
    )

  /* ---------- Modifications des tailles (par couleur) ---------- */

  const updateSize = (ci: number, si: number, patch: Partial<SizeState>) =>
    setColors((cur) =>
      cur.map((c, i) =>
        i === ci ? { ...c, sizes: c.sizes.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : c
      )
    )

  const moveSize = (ci: number, si: number, dir: -1 | 1) =>
    setColors((cur) =>
      cur.map((c, i) => {
        if (i !== ci) return c
        const j = si + dir
        if (j < 0 || j >= c.sizes.length) return c
        const next = [...c.sizes]
        ;[next[si], next[j]] = [next[j], next[si]]
        return { ...c, sizes: next }
      })
    )

  const addSize = (ci: number) =>
    setColors((cur) =>
      cur.map((c, i) =>
        i === ci ? { ...c, sizes: [...c.sizes, { size: "", stock: 0, is_active: true }] } : c
      )
    )

  const removeSize = (ci: number, si: number) =>
    setColors((cur) =>
      cur.map((c, i) => (i === ci ? { ...c, sizes: c.sizes.filter((_, j) => j !== si) } : c))
    )

  const applyPreset = (ci: number, presets: string[]) =>
    updateColor(ci, { sizes: presets.map((size) => ({ size, stock: 0, is_active: true })) })

  // Copie les noms de tailles de cette couleur vers les autres (ajoute seulement celles qui manquent, stock 0)
  const copySizesToOthers = (ci: number) => {
    setColors((cur) => {
      const source = cur[ci]?.sizes ?? []
      return cur.map((c, i) => {
        if (i === ci) return c
        const have = new Set(c.sizes.map((s) => s.size.trim().toLowerCase()))
        const missing = source
          .filter((s) => !have.has(s.size.trim().toLowerCase()))
          .map((s) => ({ size: s.size, stock: 0, is_active: s.is_active }))
        return { ...c, sizes: [...c.sizes, ...missing] }
      })
    })
    notify.success("Tailles ajoutées aux autres couleurs (stock à 0)")
  }

  const updateBlock = (index: number, patch: Partial<InfoBlockState>) =>
    setInfoBlocks((cur) => cur.map((b, i) => (i === index ? { ...b, ...patch } : b)))

  /* ---------- Enregistrer / dupliquer / supprimer ---------- */

  async function save() {
    const price = Number(form.price.replace(",", "."))
    if (!form.name.trim()) {
      setTab("general")
      return notify.error("Le nom est obligatoire")
    }
    if (form.price.trim() === "" || Number.isNaN(price) || price < 0) {
      setTab("general")
      return notify.error("Prix invalide")
    }

    const hexes = new Set<string>()
    for (const c of colors) {
      if (!c.name.trim()) {
        setTab("colors")
        return notify.error("Une couleur n'a pas de nom")
      }
      if (!HEX_RE.test(c.hex.trim())) {
        setTab("colors")
        return notify.error(`Code couleur invalide pour « ${c.name} » (exemple : #1a1a1a)`)
      }
      const hex = c.hex.trim().toLowerCase()
      if (hexes.has(hex)) {
        setTab("colors")
        return notify.error("Deux couleurs ont le même code couleur")
      }
      hexes.add(hex)

      const names = c.sizes.map((s) => s.size.trim())
      if (names.some((n) => !n)) {
        setTab("colors")
        return notify.error(`Une taille n'a pas de nom (couleur « ${c.name} »)`)
      }
      if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
        setTab("colors")
        return notify.error(`Deux tailles portent le même nom (couleur « ${c.name} »)`)
      }
    }

    setSaving(true)
    try {
      await api.post("/api/admin/products/update", {
        id: productId,
        name: form.name.trim(),
        description: form.description,
        details: form.details,
        size_fit: form.size_fit,
        care_instructions: form.care_instructions,
        shipping: form.shipping,
        price,
        category_id: form.category_id,
        gender: form.gender,
        product_type: form.product_type,
        availability: form.availability,
        release_date:
          form.availability === "coming_soon" || form.availability === "preorder"
            ? form.release_date || null
            : null,
        brand: form.brand,
        olfactive_family: form.product_type === "fragrance" ? form.olfactive_family || null : null,
        evocation: form.evocation,
        size_guide_image_url: sizeGuide,
        colors: colors.map((c) => ({
          id: c.id,
          name: c.name.trim(),
          hex: normalizeColor(c.hex),
          images: c.images,
          sizes: c.sizes.map((s) => ({
            id: s.id,
            size: s.size.trim(),
            stock: Math.max(0, Number(s.stock) || 0),
            is_active: s.is_active,
          })),
        })),
        info_blocks: infoBlocks,
        suggested_product_ids: related,
      })
      notify.success("Produit enregistré")
      await load()
    } catch (e) {
      notify.error(errorMessage(e, "Erreur lors de l'enregistrement"))
    } finally {
      setSaving(false)
    }
  }

  async function duplicate() {
    if (dirty && !confirm("Des modifications ne sont pas enregistrées (la copie ne les contiendra pas). Continuer ?"))
      return
    try {
      await api.post(`/api/admin/products/${productId}/duplicate`)
      notify.success("Produit dupliqué, retrouve la copie dans la liste")
      router.push("/admin/catalog")
    } catch (e) {
      notify.error(errorMessage(e, "Erreur lors de la duplication"))
    }
  }

  async function remove() {
    if (!confirm(`Supprimer « ${form.name} » ? Cette action est définitive.`)) return
    try {
      await api.post("/api/admin/products/delete", { id: productId })
      notify.success("Produit supprimé")
      router.push("/admin/catalog")
    } catch (e) {
      notify.error(errorMessage(e, "Erreur lors de la suppression"))
    }
  }

  function leave() {
    if (dirty && !confirm("Quitter sans enregistrer les modifications ?")) return
    router.push("/admin/catalog")
  }

  /* ---------- Rendu ---------- */

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#f3c9c9] bg-[#fdeeee] px-4 py-3 text-sm text-[#7a1f1f]">
          {loadError}
        </div>
        <AdminButton href="/admin/catalog" icon={ArrowLeft}>
          Retour au catalogue
        </AdminButton>
      </div>
    )
  }

  const relatedCandidates = allProducts.filter(
    (p) =>
      p.id !== productId &&
      !related.includes(p.id) &&
      p.name.toLowerCase().includes(relatedQuery.trim().toLowerCase())
  )
  const relatedSelected = related
    .map((rid) => allProducts.find((p) => p.id === rid))
    .filter(Boolean) as ListProduct[]

  const typeCfg = getProductType(form.product_type)
  const labels = getAdminLabels(form.product_type)
  const availabilityCfg = AVAILABILITY_LIST.find((a) => a.id === form.availability) ?? AVAILABILITY_LIST[0]
  const effectiveMode = getEffectiveAvailability({
    availability: form.availability,
    product_sizes: colors.flatMap((c) => c.sizes),
  })

  return (
    <div className="pb-28">
      <button
        type="button"
        onClick={leave}
        className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-sm text-[#7a756d] hover:text-[#171717]"
      >
        <ArrowLeft size={15} /> Produits
      </button>

      <PageHeader
        eyebrow="Fiche produit"
        title={form.name || "Sans nom"}
        description={`/${slug}`}
        actions={
          <>
            <a
              href={`/product/${slug}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#171717" }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium ring-1 ring-[#e0dbd3] hover:bg-[#faf8f5]"
            >
              <ExternalLink size={15} /> Voir sur le site
            </a>
            <AdminButton icon={Copy} onClick={duplicate}>
              Dupliquer
            </AdminButton>
          </>
        }
      />

      {/* Onglets */}
      <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-full bg-[#171717]/[0.05] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                tab === t.id
                  ? "bg-white font-medium text-[#171717] shadow-sm"
                  : "text-[#7a756d] hover:text-[#171717]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== GÉNÉRAL ===== */}
      {tab === "general" && (
        <div className="space-y-4">
          <Panel title="Informations principales">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Type de produit"
                  hint="Change les tailles proposées et les champs de texte de la fiche."
                >
                  <select
                    className={INPUT}
                    value={form.product_type}
                    onChange={(e) => setField("product_type", e.target.value)}
                  >
                    {PRODUCT_TYPE_LIST.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.emoji} {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Marque (style de la fiche)"
                  hint="The Wave = fond rouge et vague. Kiban Collector = fond sombre. fysu = fiche classique."
                >
                  <select
                    className={INPUT}
                    value={form.brand}
                    onChange={(e) => setField("brand", e.target.value)}
                  >
                    {BRAND_LIST.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Nom">
                  <input
                    className={INPUT}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </Field>
              </div>
              {form.product_type === "fragrance" && (
                <>
                  <div className="sm:col-span-2">
                    <Field
                      label="Famille olfactive"
                      hint="Classe le parfum sur la page FY'grances (des plus fraîches aux plus profondes)."
                    >
                      <select
                        className={INPUT}
                        value={form.olfactive_family}
                        onChange={(e) => setField("olfactive_family", e.target.value)}
                      >
                        <option value="">Aucune</option>
                        {FAMILY_ADMIN_LIST.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Phrase d'évocation"
                      hint="Une courte phrase sous le nom, par exemple « pour les soirs où le corps ralentit »."
                    >
                      <input
                        className={INPUT}
                        value={form.evocation}
                        onChange={(e) => setField("evocation", e.target.value)}
                      />
                    </Field>
                  </div>
                </>
              )}
              <Field label="Prix (€)">
                <input
                  className={INPUT}
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                />
              </Field>
              {typeCfg.showGender && (
                <Field label="Genre">
                  <select
                    className={INPUT}
                    value={form.gender}
                    onChange={(e) => setField("gender", e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="him">Homme</option>
                    <option value="her">Femme</option>
                    <option value="unisex">Unisexe</option>
                  </select>
                </Field>
              )}
              <div className="sm:col-span-2">
                <Field label="Catégorie">
                  <select
                    className={INPUT}
                    value={form.category_id ?? ""}
                    onChange={(e) =>
                      setField("category_id", e.target.value === "" ? null : Number(e.target.value))
                    }
                  >
                    <option value="">Sans catégorie</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </Panel>

          <Panel
            title="Disponibilité"
            description="Comment le client peut obtenir ce produit."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Mode">
                  <select
                    className={INPUT}
                    value={form.availability}
                    onChange={(e) => setField("availability", e.target.value)}
                  >
                    {AVAILABILITY_LIST.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.emoji} {a.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="mt-2 text-xs text-[#7a756d]">{availabilityCfg.description}</p>
                {effectiveMode === "sold_out" && form.availability !== "sold_out" && (
                  <p className="mt-2 rounded-xl bg-[#fbe6c8] px-3 py-2 text-xs text-[#7a4a0a]">
                    Aucun stock actif dans l'onglet « Couleurs & stock » : ce produit
                    s'affichera « Épuisé » sur le site.
                  </p>
                )}
              </div>
              {(form.availability === "coming_soon" || form.availability === "preorder") && (
                <Field
                  label={
                    form.availability === "coming_soon"
                      ? "Date de sortie (facultatif)"
                      : "Expédition prévue à partir du (facultatif)"
                  }
                >
                  <input
                    type="date"
                    className={INPUT}
                    value={form.release_date}
                    onChange={(e) => setField("release_date", e.target.value)}
                  />
                </Field>
              )}
            </div>
          </Panel>

          <Panel title="Textes de la fiche">
            <div className="space-y-4">
              <Field label="Description">
                <textarea
                  rows={3}
                  className={INPUT}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </Field>
              <Field label={labels.details}>
                <textarea
                  rows={3}
                  className={INPUT}
                  value={form.details}
                  onChange={(e) => setField("details", e.target.value)}
                />
              </Field>
              {labels.sizeFit && (
                <Field label={labels.sizeFit}>
                  <textarea
                    rows={3}
                    className={INPUT}
                    value={form.size_fit}
                    onChange={(e) => setField("size_fit", e.target.value)}
                  />
                </Field>
              )}
              {labels.care && (
                <Field label={labels.care}>
                  <textarea
                    rows={4}
                    className={INPUT}
                    value={form.care_instructions}
                    onChange={(e) => setField("care_instructions", e.target.value)}
                  />
                </Field>
              )}
              <Field label="Livraison (shipping)">
                <textarea
                  rows={4}
                  className={INPUT}
                  value={form.shipping}
                  onChange={(e) => setField("shipping", e.target.value)}
                />
              </Field>
            </div>
          </Panel>

          {typeCfg.sizeGuide && (
          <Panel title="Guide des tailles" description="Image affichée dans la fiche produit du site.">
            <div className="flex flex-wrap items-end gap-4">
              {sizeGuide && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sizeGuide} alt="Guide des tailles" className="w-40 rounded-xl border border-[#e9e5df]" />
              )}
              <div className="flex gap-2">
                <FileButton disabled={uploading} onFiles={uploadSizeGuide}>
                  {sizeGuide ? "Remplacer l'image" : "Ajouter une image"}
                </FileButton>
                {sizeGuide && (
                  <AdminButton variant="danger" icon={Trash2} onClick={() => setSizeGuide(null)}>
                    Retirer
                  </AdminButton>
                )}
              </div>
            </div>
          </Panel>
          )}

          <Panel title="Zone dangereuse">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#7a756d]">
                Supprimer ce produit le retire définitivement du site.
              </p>
              <AdminButton variant="danger" icon={Trash2} onClick={remove}>
                Supprimer le produit
              </AdminButton>
            </div>
          </Panel>
        </div>
      )}

      {/* ===== COULEURS & STOCK ===== */}
      {tab === "colors" && (
        <div className="space-y-4">
          <p className="text-sm text-[#7a756d]">
            Chaque couleur a ses images et son propre stock par {typeCfg.sizeNounAdmin.toLowerCase().replace(/s$/, "")}.
            Si le produit n'a qu'une couleur, le client ne voit pas de choix de couleur.
          </p>

          {colors.map((c, ci) => {
            const totalStock = c.sizes
              .filter((s) => s.is_active)
              .reduce((sum, s) => sum + Math.max(0, Number(s.stock) || 0), 0)

            return (
              <Panel key={c.id ?? `new-${ci}`}>
                {/* En-tête de la couleur */}
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    value={pickerValue(c.hex)}
                    onChange={(e) => updateColor(ci, { hex: e.target.value })}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-[#e0dbd3] bg-white"
                    aria-label="Choisir la couleur"
                  />
                  <input
                    className={`${INPUT} !w-28`}
                    value={c.hex}
                    onChange={(e) => updateColor(ci, { hex: e.target.value })}
                    aria-label="Code couleur"
                  />
                  <input
                    className={`${INPUT} min-w-[9rem] flex-1`}
                    placeholder="Nom (ex : Noir, Écru…)"
                    value={c.name}
                    onChange={(e) => updateColor(ci, { name: e.target.value })}
                    aria-label="Nom de la couleur"
                  />
                  <span className="text-xs text-[#9a948a]">
                    Stock : {totalStock}
                  </span>
                  <AdminButton
                    variant="danger"
                    icon={Trash2}
                    disabled={colors.length <= 1}
                    onClick={() => removeColor(ci)}
                  >
                    Couleur
                  </AdminButton>
                </div>

                {/* Images de la couleur */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[#3d3a35]">
                    Images ({c.images.length})
                  </p>
                  <FileButton
                    multiple
                    disabled={uploading}
                    onFiles={(files) => uploadProductImages(ci, files)}
                  >
                    Ajouter des images
                  </FileButton>
                </div>

                {c.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {c.images.map((url, ii) => (
                      <div key={`${url}-${ii}`} className="rounded-2xl bg-[#faf8f5] p-2 ring-1 ring-[#eee9e1]">
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-40 w-full rounded-xl object-cover" />
                          {ii === 0 && (
                            <span className="absolute left-2 top-2 rounded-full bg-[#171717] px-2 py-0.5 text-[10px] text-white">
                              Principale
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingImage({ ci, ii })}
                            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 text-xs ring-1 ring-[#e0dbd3] hover:bg-[#faf8f5]"
                          >
                            <Crop size={13} /> Cadrer
                          </button>
                          <label
                            className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 text-xs ring-1 ring-[#e0dbd3] hover:bg-[#faf8f5] ${
                              uploading ? "pointer-events-none opacity-50" : ""
                            }`}
                          >
                            <RefreshCw size={13} /> Remplacer
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                e.target.value = ""
                                if (file) replaceImage(ci, ii, file)
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeImage(ci, ii)}
                            aria-label="Supprimer l'image"
                            className="ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#9b1c1c] hover:bg-[#fdeeee]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {colors.length > 1 && (
                            <select
                              aria-label="Déplacer vers une autre couleur"
                              value={ci}
                              onChange={(e) => moveImage(ci, ii, Number(e.target.value))}
                              className="h-8 min-w-0 flex-1 rounded-full border border-[#e0dbd3] bg-white px-2 text-xs"
                            >
                              {colors.map((cs, k) => (
                                <option key={k} value={k}>
                                  {k === ci ? `Couleur ${cs.name}` : `→ ${cs.name}`}
                                </option>
                              ))}
                            </select>
                          )}
                          {ii > 0 && (
                            <button
                              type="button"
                              onClick={() => makeMain(ci, ii)}
                              className="h-8 cursor-pointer rounded-full bg-white px-3 text-xs ring-1 ring-[#e0dbd3] hover:bg-[#faf8f5]"
                            >
                              1ère
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tailles et stock de la couleur */}
                <p className="mb-2 mt-6 text-xs font-medium text-[#3d3a35]">
                  {typeCfg.sizeNounAdmin} et stock de cette couleur
                </p>

                <div className="space-y-2">
                  {c.sizes.length === 0 && (
                    <p className="text-sm text-[#7a756d]">
                      Aucune ligne. Ajoute-en une pour pouvoir vendre cette couleur.
                    </p>
                  )}
                  {c.sizes.map((s, si) => (
                    <div
                      key={s.id ?? `new-${si}`}
                      className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#faf8f5] p-3 ring-1 ring-[#eee9e1]"
                    >
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveSize(ci, si, -1)}
                          disabled={si === 0}
                          aria-label="Monter"
                          className="cursor-pointer px-1 text-xs leading-none text-[#7a756d] disabled:opacity-25"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSize(ci, si, 1)}
                          disabled={si === c.sizes.length - 1}
                          aria-label="Descendre"
                          className="cursor-pointer px-1 text-xs leading-none text-[#7a756d] disabled:opacity-25"
                        >
                          ▼
                        </button>
                      </div>
                      <input
                        className={`${INPUT} !w-24`}
                        placeholder={typeCfg.presets[0] ?? "Taille"}
                        value={s.size}
                        onChange={(e) => updateSize(ci, si, { size: e.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#7a756d]">Stock</span>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          className={`${INPUT} !w-24`}
                          value={s.stock}
                          onChange={(e) => updateSize(ci, si, { stock: Number(e.target.value) })}
                        />
                      </div>
                      <label className="ml-1 inline-flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={s.is_active}
                          onChange={(e) => updateSize(ci, si, { is_active: e.target.checked })}
                          className="h-4 w-4"
                        />
                        Active
                      </label>
                      <button
                        type="button"
                        onClick={() => removeSize(ci, si)}
                        aria-label="Supprimer la taille"
                        className="ml-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#9b1c1c] hover:bg-[#fdeeee]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <AdminButton icon={Plus} onClick={() => addSize(ci)}>
                    Ajouter une taille
                  </AdminButton>
                  {c.sizes.length === 0 && (
                    <AdminButton onClick={() => applyPreset(ci, typeCfg.presets)}>
                      Modèle {typeCfg.label.toLowerCase()} : {typeCfg.presets.slice(0, 3).join(", ")}
                      {typeCfg.presets.length > 3 ? "…" : ""}
                    </AdminButton>
                  )}
                  {colors.length > 1 && c.sizes.length > 0 && (
                    <AdminButton icon={Copy} onClick={() => copySizesToOthers(ci)}>
                      Copier ces tailles vers les autres couleurs
                    </AdminButton>
                  )}
                </div>
              </Panel>
            )
          })}

          <AdminButton icon={Plus} onClick={addColor}>
            Ajouter une couleur
          </AdminButton>
        </div>
      )}

      {/* ===== INFOS PRODUIT ===== */}
      {tab === "info" && (
        <div className="space-y-4">
          {infoBlocks.length === 0 && (
            <Panel>
              <p className="text-sm text-[#7a756d]">
                Les blocs d&apos;information sont des sections image + texte affichées sous le produit.
              </p>
            </Panel>
          )}
          {infoBlocks.map((b, i) => (
            <Panel
              key={i}
              title={`Bloc ${i + 1}`}
              action={
                <AdminButton
                  variant="danger"
                  icon={Trash2}
                  onClick={() => setInfoBlocks((cur) => cur.filter((_, k) => k !== i))}
                >
                  Supprimer
                </AdminButton>
              }
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Titre">
                    <input
                      className={INPUT}
                      value={b.title}
                      onChange={(e) => updateBlock(i, { title: e.target.value })}
                    />
                  </Field>
                  <Field label="Sous-titre">
                    <input
                      className={INPUT}
                      value={b.subtitle}
                      onChange={(e) => updateBlock(i, { subtitle: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Texte">
                  <textarea
                    rows={4}
                    className={INPUT}
                    value={b.content}
                    onChange={(e) => updateBlock(i, { content: e.target.value })}
                  />
                </Field>
                <div className="flex flex-wrap items-end gap-4">
                  {b.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image_url} alt="" className="w-40 rounded-xl border border-[#e9e5df]" />
                  )}
                  <div className="flex gap-2">
                    <FileButton disabled={uploading} onFiles={(files) => uploadInfoBlockImage(i, files)}>
                      {b.image_url ? "Remplacer l'image" : "Ajouter une image"}
                    </FileButton>
                    {b.image_url && (
                      <AdminButton variant="danger" icon={Trash2} onClick={() => updateBlock(i, { image_url: null })}>
                        Retirer
                      </AdminButton>
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          ))}
          <AdminButton
            icon={Plus}
            onClick={() =>
              setInfoBlocks((cur) => [...cur, { image_url: null, title: "", subtitle: "", content: "" }])
            }
          >
            Ajouter un bloc
          </AdminButton>
        </div>
      )}

      {/* ===== RECOMMANDATIONS ===== */}
      {tab === "related" && (
        <Panel
          title="Produits recommandés"
          description="Affichés sous ce produit sur le site, dans cet ordre."
        >
          <div className="space-y-2">
            {relatedSelected.length === 0 && (
              <p className="text-sm text-[#7a756d]">Aucun produit recommandé.</p>
            )}
            {relatedSelected.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-[#faf8f5] p-2 pr-3 ring-1 ring-[#eee9e1]">
                {p.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnail} alt="" className="h-12 w-9 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-9 rounded-lg bg-[#f0ece5]" />
                )}
                <p className="min-w-0 flex-1 truncate text-sm">{p.name}</p>
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() =>
                    setRelated((cur) => {
                      const n = [...cur]
                      ;[n[i - 1], n[i]] = [n[i], n[i - 1]]
                      return n
                    })
                  }
                  className="cursor-pointer px-1 text-xs text-[#7a756d] disabled:opacity-25"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={i === relatedSelected.length - 1}
                  onClick={() =>
                    setRelated((cur) => {
                      const n = [...cur]
                      ;[n[i + 1], n[i]] = [n[i], n[i + 1]]
                      return n
                    })
                  }
                  className="cursor-pointer px-1 text-xs text-[#7a756d] disabled:opacity-25"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => setRelated((cur) => cur.filter((x) => x !== p.id))}
                  aria-label="Retirer"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#9b1c1c] hover:bg-[#fdeeee]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-[#3d3a35]">
              <ImagePlus size={14} /> Ajouter un produit
            </p>
            <input
              className={INPUT}
              placeholder="Rechercher…"
              value={relatedQuery}
              onChange={(e) => setRelatedQuery(e.target.value)}
            />
            <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
              {relatedCandidates.slice(0, 30).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setRelated((cur) => [...cur, p.id])}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2 text-left hover:bg-[#faf8f5]"
                >
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail} alt="" className="h-12 w-9 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-9 rounded-lg bg-[#f0ece5]" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <Plus size={15} className="text-[#7a756d]" />
                </button>
              ))}
              {relatedCandidates.length === 0 && (
                <p className="px-2 py-3 text-sm text-[#9a948a]">Aucun résultat.</p>
              )}
            </div>
          </div>
        </Panel>
      )}

      {editingImage && colors[editingImage.ci]?.images[editingImage.ii] && (
        <ImageEditorModal
          url={colors[editingImage.ci].images[editingImage.ii]}
          onCancel={() => setEditingImage(null)}
          onSave={async (file) => {
            const { ci, ii } = editingImage
            await replaceImage(ci, ii, file)
            setEditingImage(null)
          }}
        />
      )}

      {/* Barre d'enregistrement */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e9e5df] bg-[#f6f4f0]/85 backdrop-blur-xl lg:left-64">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
          <p className="min-w-0 flex-1 truncate text-sm">
            {uploading ? (
              <span className="text-[#7a756d]">Envoi de l&apos;image…</span>
            ) : dirty ? (
              <span className="inline-flex items-center gap-2 text-[#7a4a0a]">
                <span className="h-2 w-2 rounded-full bg-[#e08a1e]" />
                Modifications non enregistrées
              </span>
            ) : (
              <span className="text-[#9a948a]">Tout est enregistré</span>
            )}
          </p>
          {dirty && (
            <AdminButton variant="ghost" onClick={load} disabled={saving}>
              Annuler
            </AdminButton>
          )}
          <AdminButton variant="primary" onClick={save} disabled={saving || uploading || !dirty}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
