"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Check, ImagePlus, Pencil, Plus, Search, ShoppingBag, Trash2 } from "lucide-react"
import { AdminButton, Badge, EmptyState, PageHeader, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { Field, Modal, Toggle, inputClass } from "@/components/Admin/ui/controls"
import { adminFetch, api, errorMessage, notify } from "@/lib/adminApi"
import { uploadStoryFile } from "@/lib/storyUpload"
import { GAMES } from "@/lib/games"

/* ====================================================================
   ADMIN > STORIES
   - la liste dans l'ordre d'affichage (monter / descendre : enregistré tout de suite)
   - une fenêtre pour créer / modifier : titre, couverture, diapos (photo ou vidéo, durée),
     produits « Shop now » par diapo, pages où la story s'affiche
   ==================================================================== */

type Item = { key: string; type: "image" | "video"; media_url: string; duration: number; product_ids: number[] }
type Target = { type: "page" | "collection"; id: string | number }
type Draft = { id?: string; title: string; cover_url: string; is_active: boolean; link_url: string; items: Item[]; targets: Target[] }
type StoryRow = {
  id: string
  title: string
  cover_url: string
  is_active: boolean
  link_url?: string | null
  story_items: any[]
  story_page_links: any[]
}
type Option = { type: "page" | "collection"; id: string | number; label: string }
type Prod = { id: number; name: string; price: number; thumbnail: string | null; is_hidden?: boolean }

const newKey = () => "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const isVideoUrl = (u: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)
const emptyDraft = (): Draft => ({ title: "", cover_url: "", is_active: true, link_url: "", items: [], targets: [] })

function draftFrom(s: StoryRow): Draft {
  return {
    id: s.id,
    title: s.title ?? "",
    cover_url: s.cover_url ?? "",
    is_active: !!s.is_active,
    link_url: s.link_url ?? "",
    items: (s.story_items ?? []).map((it) => ({
      key: newKey(),
      type: it.type === "video" || isVideoUrl(it.media_url ?? "") ? "video" : "image",
      media_url: it.media_url ?? "",
      duration: Number(it.duration) > 0 ? Number(it.duration) : it.type === "video" ? 8 : 5,
      product_ids: Array.isArray(it.product_ids) ? it.product_ids.map(Number).filter(Number.isFinite) : [],
    })),
    targets: (s.story_page_links ?? [])
      .map((l) => (l.page_id ? { type: "page", id: l.page_id } : l.collection_page_id ? { type: "collection", id: l.collection_page_id } : null))
      .filter(Boolean) as Target[],
  }
}

export default function StoriesAdmin() {
  const [stories, setStories] = useState<StoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [options, setOptions] = useState<Option[]>([])
  const [products, setProducts] = useState<Prod[] | null>(null)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null) // message d'envoi en cours
  const [pickFor, setPickFor] = useState<string | null>(null) // clé de la diapo dont on choisit les produits
  const [search, setSearch] = useState("")

  const coverInput = useRef<HTMLInputElement>(null)
  const slideInput = useRef<HTMLInputElement>(null)
  const slideTarget = useRef<string | null>(null) // clé de la diapo à remplacer (null = nouvelle diapo)

  /* ---------- chargement ---------- */
  const load = useCallback(async () => {
    try {
      const data = await api.get<StoryRow[]>("/api/admin/stories")
      setStories(Array.isArray(data) ? data : [])
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de charger les stories"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    ;(async () => {
      try {
        const d = await api.get<{ pages: any[]; collections: any[] }>("/api/admin/stories/targets")
        setOptions([
          ...(d.pages ?? []).map((p) => ({ type: "page" as const, id: p.id, label: p.label })),
          ...(d.collections ?? []).map((c) => ({ type: "collection" as const, id: c.id, label: c.label })),
        ])
      } catch {
        /* la liste restera vide, un message apparaîtra à l'ouverture */
      }
    })()
  }, [load])

  async function loadProducts() {
    if (products) return
    try {
      const d = await api.get<{ products: Prod[] }>("/api/admin/products")
      setProducts(d.products ?? [])
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de charger les produits"))
      setProducts([])
    }
  }

  const productById = useMemo(() => new Map((products ?? []).map((p) => [Number(p.id), p])), [products])
  const optionLabel = (t: Target) => options.find((o) => o.type === t.type && String(o.id) === String(t.id))?.label

  /* ---------- liste : ordre, activer, supprimer ---------- */
  async function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= stories.length) return
    const before = stories
    const copy = [...stories]
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
    setStories(copy)
    try {
      await adminFetch("/api/admin/stories", { method: "PATCH", body: JSON.stringify({ order: copy.map((s) => s.id) }) })
      notify.success("Ordre enregistré")
    } catch (e) {
      setStories(before)
      notify.error(errorMessage(e, "Ordre non enregistré"))
    }
  }

  async function toggleActive(s: StoryRow, value: boolean) {
    setStories((cur) => cur.map((x) => (x.id === s.id ? { ...x, is_active: value } : x)))
    try {
      await adminFetch("/api/admin/stories", { method: "PATCH", body: JSON.stringify({ id: s.id, is_active: value }) })
    } catch (e) {
      setStories((cur) => cur.map((x) => (x.id === s.id ? { ...x, is_active: !value } : x)))
      notify.error(errorMessage(e, "Changement impossible"))
    }
  }

  async function remove(s: StoryRow) {
    if (!confirm(`Supprimer la story « ${s.title} » ?`)) return
    try {
      await api.del(`/api/admin/stories?id=${s.id}`)
      setStories((cur) => cur.filter((x) => x.id !== s.id))
      notify.success("Story supprimée")
    } catch (e) {
      notify.error(errorMessage(e, "Suppression impossible"))
    }
  }

  /* ---------- fenêtre de modification ---------- */
  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d))
  const patchItem = (key: string, p: Partial<Item>) =>
    setDraft((d) => (d ? { ...d, items: d.items.map((it) => (it.key === key ? { ...it, ...p } : it)) } : d))

  function moveItem(i: number, dir: -1 | 1) {
    setDraft((d) => {
      if (!d) return d
      const j = i + dir
      if (j < 0 || j >= d.items.length) return d
      const items = [...d.items]
      ;[items[i], items[j]] = [items[j], items[i]]
      return { ...d, items }
    })
  }

  function toggleTarget(o: Option) {
    setDraft((d) => {
      if (!d) return d
      const has = d.targets.some((t) => t.type === o.type && String(t.id) === String(o.id))
      return {
        ...d,
        targets: has
          ? d.targets.filter((t) => !(t.type === o.type && String(t.id) === String(o.id)))
          : [...d.targets, { type: o.type, id: o.id }],
      }
    })
  }

  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    try {
      const url = await uploadStoryFile(file, "story-covers", setBusy)
      patch({ cover_url: url })
    } catch (err) {
      notify.error("Envoi impossible : " + errorMessage(err, "erreur"))
    } finally {
      setBusy(null)
    }
  }

  async function onSlideFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files: File[] = Array.from(e.target.files ?? []) as File[]
    e.target.value = ""
    const key = slideTarget.current
    if (files.length === 0) return
    try {
      // une diapo à remplacer = 1 fichier ; sinon chaque fichier choisi devient une diapo
      const list: File[] = key ? files.slice(0, 1) : files
      for (const file of list) {
        const url = await uploadStoryFile(file, "story-media", setBusy)
        const video = file.type.startsWith("video/") || isVideoUrl(url)
        if (key) patchItem(key, { media_url: url, type: video ? "video" : "image", duration: video ? 8 : 5 })
        else
          setDraft((d) =>
            d
              ? {
                  ...d,
                  items: [...d.items, { key: newKey(), type: video ? "video" : "image", media_url: url, duration: video ? 8 : 5, product_ids: [] }],
                }
              : d
          )
      }
    } catch (err) {
      notify.error("Envoi impossible : " + errorMessage(err, "erreur"))
    } finally {
      setBusy(null)
    }
  }

  function pickSlideFile(key: string | null) {
    slideTarget.current = key
    slideInput.current?.click()
  }

  async function save() {
    if (!draft) return
    if (!draft.title.trim()) return notify.error("Donne un titre à la story")
    if (!draft.cover_url) return notify.error("Ajoute une couverture (la pastille ronde)")
    if (!draft.link_url.trim() && draft.items.length === 0) return notify.error("Ajoute au moins une photo ou une vidéo (ou choisis « Ouvrir directement »)")
    setSaving(true)
    try {
      const body = {
        id: draft.id,
        title: draft.title.trim(),
        cover_url: draft.cover_url,
        is_active: draft.is_active,
        link_url: draft.link_url.trim() || null,
        items: draft.items.map(({ type, media_url, duration, product_ids }) => ({ type, media_url, duration, product_ids })),
        targets: draft.targets,
      }
      if (draft.id) await api.put("/api/admin/stories", body)
      else await api.post("/api/admin/stories", body)
      notify.success(draft.id ? "Story enregistrée" : "Story créée")
      setDraft(null)
      await load()
    } catch (e) {
      notify.error(errorMessage(e, "Enregistrement impossible"))
    } finally {
      setSaving(false)
    }
  }

  /* ---------- sélecteur de produits ---------- */
  const pickItem = draft?.items.find((i) => i.key === pickFor) ?? null
  const shownProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (products ?? []).filter((p) => !p.is_hidden && (!q || p.name.toLowerCase().includes(q)))
  }, [products, search])

  function toggleProduct(id: number) {
    if (!pickItem) return
    const has = pickItem.product_ids.includes(id)
    patchItem(pickItem.key, { product_ids: has ? pickItem.product_ids.filter((x) => x !== id) : [...pickItem.product_ids, id] })
  }

  /* ---------- affichage ---------- */
  return (
    <>
      <PageHeader
        eyebrow="Contenu du site"
        title="Stories"
        description="Les pastilles rondes en haut des pages. Ordonne-les, choisis où elles apparaissent, et ajoute des produits « Shop now » à chaque diapo."
        actions={
          <AdminButton
            variant="primary"
            icon={Plus}
            onClick={() => {
              setDraft(emptyDraft())
              loadProducts()
            }}
          >
            Nouvelle story
          </AdminButton>
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : stories.length === 0 ? (
        <EmptyState title="Aucune story" description="Crée ta première story avec le bouton « Nouvelle story »." />
      ) : (
        <div className="space-y-3">
          {stories.map((s, i) => {
            const slides = s.story_items?.length ?? 0
            const prodCount = (s.story_items ?? []).reduce((n: number, it: any) => n + (Array.isArray(it.product_ids) ? it.product_ids.length : 0), 0)
            const pagesCount = s.story_page_links?.length ?? 0
            return (
              <Panel key={s.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div
                      className="h-16 w-16 shrink-0 rounded-full bg-[#f0ece5] bg-cover bg-center ring-1 ring-[#e0dbd3]"
                      style={{ backgroundImage: s.cover_url ? `url(${s.cover_url})` : undefined }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.title}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {s.link_url ? <Badge tone="blue">Ouvre {s.link_url}</Badge> : <Badge>{slides} diapo{slides > 1 ? "s" : ""}</Badge>}
                        <Badge tone={pagesCount ? "blue" : "orange"}>{pagesCount ? `${pagesCount} page${pagesCount > 1 ? "s" : ""}` : "Aucune page"}</Badge>
                        {prodCount > 0 && <Badge tone="green">{prodCount} produit{prodCount > 1 ? "s" : ""} shop now</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 flex items-center gap-2 text-xs text-[#7a756d]">
                      <Toggle checked={!!s.is_active} onChange={(v) => toggleActive(s, v)} label="Visible" />
                      {s.is_active ? "Visible" : "Masquée"}
                    </span>
                    <AdminButton icon={ArrowUp} disabled={i === 0} onClick={() => move(i, -1)}>
                      Monter
                    </AdminButton>
                    <AdminButton icon={ArrowDown} disabled={i === stories.length - 1} onClick={() => move(i, 1)}>
                      Descendre
                    </AdminButton>
                    <AdminButton
                      icon={Pencil}
                      onClick={() => {
                        setDraft(draftFrom(s))
                        loadProducts()
                      }}
                    >
                      Modifier
                    </AdminButton>
                    <AdminButton variant="danger" icon={Trash2} onClick={() => remove(s)}>
                      Supprimer
                    </AdminButton>
                  </div>
                </div>
              </Panel>
            )
          })}
        </div>
      )}

      <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={onCover} />
      <input ref={slideInput} type="file" accept="image/*,video/*" multiple className="hidden" onChange={onSlideFile} />

      {/* ================= CRÉER / MODIFIER ================= */}
      <Modal
        open={!!draft}
        wide
        title={draft?.id ? "Modifier la story" : "Nouvelle story"}
        onClose={() => !saving && setDraft(null)}
        footer={
          <>
            {busy && <span className="mr-auto self-center text-xs text-[#7a756d]">{busy}</span>}
            <AdminButton onClick={() => setDraft(null)} disabled={saving}>
              Annuler
            </AdminButton>
            <AdminButton variant="primary" onClick={save} disabled={saving || !!busy}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </AdminButton>
          </>
        }
      >
        {draft && (
          <div className="space-y-7">
            {/* identité */}
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                className="relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full bg-[#f0ece5] bg-cover bg-center ring-1 ring-[#e0dbd3]"
                style={{ backgroundImage: draft.cover_url ? `url(${draft.cover_url})` : undefined }}
                aria-label="Changer la couverture"
              >
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-[10px] text-white">
                  <ImagePlus size={11} /> {draft.cover_url ? "Changer" : "Couverture"}
                </span>
              </button>
              <div className="min-w-0 flex-1 space-y-3">
                <Field label="Titre (sous la pastille)">
                  <input className={inputClass} value={draft.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Ex : Nouveautés" />
                </Field>
                <div className="flex items-center gap-3 text-sm">
                  <Toggle checked={draft.is_active} onChange={(v) => patch({ is_active: v })} label="Visible" />
                  {draft.is_active ? "Visible sur le site" : "Masquée"}
                </div>
              </div>
            </div>

            {/* ouverture directe (jeux…) */}
            <div className="rounded-2xl bg-[#faf8f5] p-4">
              <p className="mb-1 text-sm font-semibold">Ouvrir directement</p>
              <p className="mb-3 text-xs text-[#7a756d]">
                Au lieu d'un diaporama, toucher la pastille ouvre tout de suite une page (par exemple un jeu d'arcade). Les diapos ci-dessous ne sont alors pas utilisées.
              </p>
              <div className="flex flex-wrap gap-2">
                {[{ label: "Non (diaporama)", href: "" }, ...GAMES.map((g) => ({ label: "Jeu · " + g.name, href: "/games/" + g.slug })), { label: "Arcade (tous les jeux)", href: "/games" }].map((o) => {
                  const on = draft.link_url === o.href
                  return (
                    <button
                      key={o.href || "none"}
                      type="button"
                      onClick={() => patch({ link_url: o.href })}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-xs transition ${
                        on ? "bg-[#171717] text-white" : "bg-white text-[#171717] ring-1 ring-[#e0dbd3]"
                      }`}
                    >
                      {on && <Check size={12} />}
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* diapos */}
            <div>
              <p className="mb-1 text-sm font-semibold">Diapos</p>
              <p className="mb-3 text-xs text-[#7a756d]">
                Photos ou vidéos, dans l'ordre. Ajoute des produits « Shop now » : le visiteur glisse vers le haut pour les voir.
              </p>

              <div className="space-y-3">
                {draft.items.map((it, i) => (
                  <div key={it.key} className="grid gap-3 rounded-2xl border border-[#e9e5df] p-3 sm:grid-cols-[96px_1fr]">
                    <button
                      type="button"
                      onClick={() => pickSlideFile(it.key)}
                      className="relative aspect-[9/16] w-24 overflow-hidden rounded-xl bg-[#f0ece5]"
                    >
                      {it.type === "video" ? (
                        <video src={it.media_url} className="absolute inset-0 h-full w-full object-cover" muted playsInline preload="metadata" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.media_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[10px] text-white">Changer</span>
                    </button>

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-[#3d3a35]">Diapo {i + 1}</span>
                        <Badge>{it.type === "video" ? "Vidéo" : "Photo"}</Badge>
                      </div>

                      <Field label="Durée (secondes)" hint={it.type === "video" ? "Pour une vidéo, la vraie durée est utilisée." : undefined}>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          className={inputClass + " max-w-[120px]"}
                          value={it.duration}
                          onChange={(e) => patchItem(it.key, { duration: Math.max(1, Number(e.target.value) || 5) })}
                        />
                      </Field>

                      <div>
                        <span className="mb-1.5 block text-xs font-medium text-[#3d3a35]">Produits « Shop now »</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {it.product_ids.map((id) => {
                            const p = productById.get(id)
                            return (
                              <span key={id} className="inline-flex items-center gap-2 rounded-full bg-[#171717]/[0.06] py-1 pl-1 pr-3 text-xs">
                                <span
                                  className="h-6 w-6 rounded-full bg-[#e0dbd3] bg-cover bg-center"
                                  style={{ backgroundImage: p?.thumbnail ? `url(${p.thumbnail})` : undefined }}
                                />
                                {p?.name ?? `Produit ${id}`}
                              </span>
                            )
                          })}
                          <AdminButton
                            icon={ShoppingBag}
                            onClick={() => {
                              setSearch("")
                              setPickFor(it.key)
                            }}
                          >
                            {it.product_ids.length ? "Modifier" : "Ajouter des produits"}
                          </AdminButton>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <AdminButton icon={ArrowUp} disabled={i === 0} onClick={() => moveItem(i, -1)}>
                          Monter
                        </AdminButton>
                        <AdminButton icon={ArrowDown} disabled={i === draft.items.length - 1} onClick={() => moveItem(i, 1)}>
                          Descendre
                        </AdminButton>
                        <AdminButton variant="danger" icon={Trash2} onClick={() => patch({ items: draft.items.filter((x) => x.key !== it.key) })}>
                          Retirer
                        </AdminButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <AdminButton icon={Plus} onClick={() => pickSlideFile(null)} disabled={!!busy}>
                  Ajouter des photos ou vidéos
                </AdminButton>
              </div>
            </div>

            {/* pages */}
            <div>
              <p className="mb-1 text-sm font-semibold">Afficher sur</p>
              <p className="mb-3 text-xs text-[#7a756d]">Touche les pages où la story doit apparaître.</p>
              {options.length === 0 ? (
                <p className="text-xs text-[#9a948a]">Aucune page trouvée.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {options.map((o) => {
                    const on = draft.targets.some((t) => t.type === o.type && String(t.id) === String(o.id))
                    return (
                      <button
                        key={o.type + o.id}
                        type="button"
                        onClick={() => toggleTarget(o)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-xs transition ${
                          on ? "bg-[#171717] text-white" : "bg-white text-[#171717] ring-1 ring-[#e0dbd3]"
                        }`}
                      >
                        {on && <Check size={12} />}
                        {o.type === "collection" ? "Collection · " : "Page · "}
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              )}
              {draft.targets.some((t) => !optionLabel(t)) && (
                <p className="mt-2 text-xs text-[#9a948a]">Certaines pages choisies n'existent plus : elles seront retirées à l'enregistrement si tu les décoches.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ================= CHOIX DES PRODUITS ================= */}
      <Modal
        open={!!pickItem}
        title="Produits « Shop now »"
        onClose={() => setPickFor(null)}
        footer={
          <AdminButton variant="primary" onClick={() => setPickFor(null)}>
            Terminé ({pickItem?.product_ids.length ?? 0})
          </AdminButton>
        }
      >
        <div className="relative mb-4">
          <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a948a]" />
          <input className={inputClass + " pl-10"} placeholder="Chercher un produit…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {!products ? (
          <Skeleton className="h-32 w-full" />
        ) : shownProducts.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#9a948a]">Aucun produit.</p>
        ) : (
          <div className="space-y-1">
            {shownProducts.map((p) => {
              const on = !!pickItem?.product_ids.includes(Number(p.id))
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProduct(Number(p.id))}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2 text-left transition ${on ? "bg-[#171717]/[0.06]" : "hover:bg-[#faf8f5]"}`}
                >
                  <span
                    className="h-12 w-12 shrink-0 rounded-xl bg-[#f0ece5] bg-cover bg-center"
                    style={{ backgroundImage: p.thumbnail ? `url(${p.thumbnail})` : undefined }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-[#7a756d]">{p.price} EUR</span>
                  </span>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${on ? "bg-[#171717] text-white" : "ring-1 ring-[#d9d3c9]"}`}>
                    {on && <Check size={13} />}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </Modal>
    </>
  )
}
