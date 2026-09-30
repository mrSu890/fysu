"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ImagePlus, RotateCcw, Trash2 } from "lucide-react"
import {
  AdminButton,
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  Skeleton,
} from "@/components/Admin/ui/kit"
import { adminFetch, api, errorMessage, notify } from "@/lib/adminApi"
import { resizeImage } from "@/lib/imageTools"

/* ====================================================================
   IMAGES DE GARDE
   Une carte par page du site qui a une grande image en haut :
   - les pages (For her, For him, …)
   - les collections (The Wave, Kiban Collector, …)
   Change l'image en un geste, elle est mise en ligne tout de suite.
   ==================================================================== */

type Kind = "page" | "collection"

type HeroItem = {
  id: string
  kind: Kind
  title: string
  slug: string
  hero_image: string | null
  visible: boolean
}

// Pages du site qui ont une image d'origine dans le code (utilisée tant qu'aucune image n'est choisie)
const DEFAULT_IMAGES: Record<string, string> = {
  thewave: "/images/the-wave-hero.jpg",
  "kiban-collector": "/images/kiban-collector.jpg",
}

const pagePath = (item: HeroItem) => {
  if (item.kind === "page") return `/${item.slug}`
  if (item.slug === "thewave" || item.slug === "kiban-collector") return `/${item.slug}`
  return `/collections/${item.slug}`
}

export default function HeroesPage() {
  const [items, setItems] = useState<HeroItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const target = useRef<HeroItem | null>(null)

  const load = useCallback(async () => {
    try {
      const [pages, collections] = await Promise.all([
        api.get<any[]>("/api/admin/pages"),
        api.get<any[]>("/api/admin/collectionPages"),
      ])

      const list: HeroItem[] = [
        ...(Array.isArray(pages) ? pages : []).map((p) => ({
          id: String(p.id),
          kind: "page" as const,
          title: p.title ?? p.slug,
          slug: p.slug,
          hero_image: p.hero_image ?? null,
          visible: p.visible !== false,
        })),
        ...(Array.isArray(collections) ? collections : []).map((c) => ({
          id: String(c.id),
          kind: "collection" as const,
          title: c.title ?? c.slug,
          slug: c.slug,
          hero_image: c.hero_image ?? null,
          visible: c.visible !== false,
        })),
      ]

      setItems(list)
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

  async function save(item: HeroItem, hero_image: string | null) {
    const base = item.kind === "page" ? "/api/admin/pages" : "/api/admin/collectionPages"
    await adminFetch(`${base}/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ hero_image }),
    })
    setItems((cur) =>
      cur.map((it) => (it.id === item.id && it.kind === item.kind ? { ...it, hero_image } : it))
    )
  }

  function pick(item: HeroItem) {
    target.current = item
    fileInput.current?.click()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const item = target.current
    e.target.value = ""
    if (!file || !item) return

    setBusyId(`${item.kind}-${item.id}`)
    try {
      const small = await resizeImage(file)
      const form = new FormData()
      form.append("file", small)
      const { url } = await api.upload<{ url: string }>("/api/admin/uploadHero", form)
      await save(item, url)
      notify.success(`Image de « ${item.title} » mise à jour`)
    } catch (err) {
      notify.error(errorMessage(err, "Impossible d'envoyer l'image"))
    } finally {
      setBusyId(null)
    }
  }

  async function remove(item: HeroItem) {
    const hasDefault = Boolean(DEFAULT_IMAGES[item.slug])
    const message = hasDefault
      ? `Rétablir l'image d'origine de « ${item.title} » ?`
      : `Retirer l'image de « ${item.title} » ? La page s'affichera sans grande image en haut.`
    if (!confirm(message)) return

    setBusyId(`${item.kind}-${item.id}`)
    try {
      await save(item, null)
      notify.success(hasDefault ? "Image d'origine rétablie" : "Image retirée")
    } catch (err) {
      notify.error(errorMessage(err, "Impossible de retirer l'image"))
    } finally {
      setBusyId(null)
    }
  }

  const pages = items.filter((i) => i.kind === "page")
  const collections = items.filter((i) => i.kind === "collection")

  const renderCard = (item: HeroItem) => {
    const fallback = DEFAULT_IMAGES[item.slug]
    const shown = item.hero_image || fallback || null
    const busy = busyId === `${item.kind}-${item.id}`

    return (
      <div
        key={`${item.kind}-${item.id}`}
        className="overflow-hidden rounded-3xl border border-[#e9e5df] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
      >
        <div className="relative aspect-[8/5] w-full bg-[#f0ece5]">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-[#9a948a]">
              Pas d'image
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm">
              Envoi en cours…
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium">{item.title}</p>
            {!item.visible && <Badge tone="orange">Masquée</Badge>}
            {!item.hero_image && fallback && <Badge tone="blue">Image d'origine</Badge>}
          </div>
          <p className="mt-0.5 truncate text-xs text-[#9a948a]">{pagePath(item)}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <AdminButton variant="primary" icon={ImagePlus} disabled={busy} onClick={() => pick(item)}>
              {shown ? "Changer l'image" : "Ajouter une image"}
            </AdminButton>
            {item.hero_image && (
              <AdminButton
                variant="ghost"
                icon={fallback ? RotateCcw : Trash2}
                disabled={busy}
                onClick={() => remove(item)}
              >
                {fallback ? "Image d'origine" : "Retirer"}
              </AdminButton>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Contenu du site"
        title="Images de garde"
        description="La grande image en haut de chaque page. Choisis une photo depuis ton iPad ou ton iPhone : elle remplace l'ancienne tout de suite."
        actions={<AdminButton href="/admin/home-images">Images de l'accueil</AdminButton>}
      />

      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {error && (
        <div className="mb-4 rounded-2xl border border-[#f3c9c9] bg-[#fdeeee] px-4 py-3 text-sm text-[#7a1f1f]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune page pour l'instant"
          description="Crée une page dans « Collections & pages » : elle apparaîtra ici."
        />
      ) : (
        <div className="space-y-8">
          <Panel
            title="Pages"
            description="For her, For him et les autres pages avec des rangées de produits. Format conseillé : photo horizontale."
          >
            {pages.length === 0 ? (
              <p className="text-sm text-[#7a756d]">Aucune page.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{pages.map(renderCard)}</div>
            )}
          </Panel>

          <Panel
            title="Collections"
            description="The Wave, Kiban Collector et les autres collections."
          >
            {collections.length === 0 ? (
              <p className="text-sm text-[#7a756d]">Aucune collection.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{collections.map(renderCard)}</div>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}
