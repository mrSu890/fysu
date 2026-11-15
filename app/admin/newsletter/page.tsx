"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlignLeft, ArrowDown, ArrowUp, Captions, Copy, Heading, Image as ImageIcon, LayoutGrid, Mail, Menu as MenuIcon, Minus, MousePointerClick, Monitor, Plus, Quote, Send, Shirt, Smartphone, Trash2, X, LayoutTemplate, type LucideIcon } from "lucide-react"
import { AdminButton } from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"
import { ProductPicker, uploadImage } from "@/components/Admin/Newsletter/shared"
import { BLOCK_LABEL, renderBlock, type Block } from "@/lib/emailBlocks"
import type { Campaign } from "@/lib/newsletter"

const field = "w-full rounded-xl bg-white px-3 py-2.5 text-[15px] ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]"
const SITE = "https://f-y-s-u.com"

type Kind = Exclude<Block["type"], "raw">

const NEW_BLOCK: Record<Kind, Block> = {
  hero: { type: "hero", imageUrl: "", alt: "" },
  heroTitle: { type: "heroTitle", imageUrl: "", alt: "", title: "", buttonLabel: "Découvrir", buttonUrl: SITE },
  title: { type: "title", eyebrow: "", title: "" },
  text: { type: "text", text: "" },
  mosaic: { type: "mosaic", images: [{ imageUrl: "" }, { imageUrl: "" }] },
  products: { type: "products", heading: "", columns: 2, items: [] },
  button: { type: "button", label: "Découvrir", url: SITE, style: "solid" },
  nav: { type: "nav", links: [{ label: "Nouveautés", url: SITE }, { label: "Tout voir", url: SITE }] },
  quote: { type: "quote", text: "", by: "" },
  divider: { type: "divider" },
}

const PICK: [Kind, string, LucideIcon][] = [
  ["hero", "Photo", ImageIcon],
  ["heroTitle", "Photo + titre", Captions],
  ["title", "Titre", Heading],
  ["text", "Texte", AlignLeft],
  ["mosaic", "Mosaïque", LayoutGrid],
  ["products", "Produits", Shirt],
  ["button", "Bouton", MousePointerClick],
  ["nav", "Menu", MenuIcon],
  ["quote", "Citation", Quote],
  ["divider", "Séparateur", Minus],
]
const ICON_OF = Object.fromEntries(PICK.map(([k, , i]) => [k, i])) as Record<string, LucideIcon>
const WORD: Record<string, string> = { hero: "une photo", heroTitle: "une photo", title: "un titre", text: "un texte", mosaic: "des photos", products: "des produits", button: "un bouton", nav: "un menu", quote: "une citation" }

const T = (blocks: Block[]) => () => ({ subject: "", preheader: "", blocks: JSON.parse(JSON.stringify(blocks)) as Block[] })
const TEMPLATES: { name: string; make: () => Campaign }[] = [
  { name: "Éditorial", make: T([{ type: "nav", links: [{ label: "Nouveautés", url: SITE }, { label: "Best-sellers", url: SITE }, { label: "Tout voir", url: SITE }] }, { ...NEW_BLOCK.heroTitle }, { type: "text", text: "", align: "center" }, { type: "mosaic", images: [{ imageUrl: "" }, { imageUrl: "" }, { imageUrl: "" }] }]) },
  { name: "Nouvelle collection", make: T([NEW_BLOCK.hero, { type: "title", eyebrow: "Nouvelle collection", title: "" }, NEW_BLOCK.text, { type: "button", label: "Découvrir la collection", url: SITE, style: "solid" }, { type: "products", heading: "La sélection", columns: 2, items: [] }]) },
  { name: "Vente privée", make: T([{ type: "title", eyebrow: "Vente privée", title: "", style: "light", align: "center" }, { type: "text", text: "", align: "center" }, { type: "button", label: "Accéder à la vente", url: SITE, style: "solid" }, { type: "products", heading: "La sélection", columns: 2, items: [] }]) },
  { name: "Produit à l'honneur", make: T([{ type: "title", eyebrow: "À découvrir", title: "" }, { type: "products", heading: "", columns: 1, items: [] }, NEW_BLOCK.text, { type: "button", label: "Voir la pièce", url: SITE, style: "solid" }]) },
  { name: "Lookbook", make: T([{ ...NEW_BLOCK.heroTitle }, { type: "mosaic", images: [{ imageUrl: "" }, { imageUrl: "" }, { imageUrl: "" }] }, { type: "mosaic", images: [{ imageUrl: "" }, { imageUrl: "" }] }, { type: "button", label: "Voir la collection", url: SITE, style: "outline" }]) },
  { name: "Annonce / événement", make: T([NEW_BLOCK.hero, { type: "title", eyebrow: "Événement", title: "" }, { type: "text", text: "Date :\nLieu :\n" }, { type: "button", label: "En savoir plus", url: SITE, style: "outline" }]) },
  { name: "Remerciement", make: T([{ type: "title", eyebrow: "Merci", title: "", align: "center" }, { type: "text", text: "", align: "center" }, { type: "button", label: "Découvrir", url: SITE, style: "solid" }]) },
  { name: "Message simple", make: T([NEW_BLOCK.title, NEW_BLOCK.text]) },
]

function isEmpty(b: Block): boolean {
  switch (b.type) {
    case "hero": case "heroTitle": return !b.imageUrl
    case "title": return !b.title.trim()
    case "text": return !b.text.trim()
    case "mosaic": return !b.images.some((i) => i.imageUrl)
    case "products": return b.items.length === 0
    case "button": return !b.label.trim()
    case "nav": return !b.links.some((l) => l.label.trim())
    case "quote": return !b.text.trim()
    default: return false
  }
}

function BlockView({ b }: { b: Block }) {
  const html = useMemo(() => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${renderBlock(b)}</table>`, [b])
  return <div style={{ pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: html }} />
}

function Upload({ url, onUrl }: { url: string; onUrl: (u: string) => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex items-center gap-3">
      {url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#f0ece5] text-[#9a948a]"><ImageIcon size={22} /></div>}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#171717] px-4 py-2.5 text-sm font-medium text-white">
        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          setBusy(true)
          try { onUrl(await uploadImage(f)) } catch (er) { notify.error(errorMessage(er)) } finally { setBusy(false) }
        }} />
        {busy ? "Envoi…" : url ? "Changer la photo" : "Choisir une photo"}
      </label>
    </div>
  )
}

function Seg<T extends string>({ value, opts, onChange }: { value: T; opts: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-2">
      {opts.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={`rounded-full px-3 py-1.5 text-sm ring-1 ${value === v ? "bg-[#171717] text-white ring-[#171717]" : "bg-white ring-[#e0dbd3]"}`}>{l}</button>
      ))}
    </div>
  )
}

function BlockForm({ b, set }: { b: Block; set: (b: Block) => void }) {
  switch (b.type) {
    case "nav":
      return (
        <div className="space-y-3">
          {b.links.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
              <input className={field} placeholder="Nom (ex. Best-sellers)" value={l.label} onChange={(e) => set({ ...b, links: b.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <input className={field} placeholder="Lien (https://…)" value={l.url} onChange={(e) => set({ ...b, links: b.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
              <button type="button" aria-label="Retirer" onClick={() => set({ ...b, links: b.links.filter((_, j) => j !== i) })} className="rounded-full p-2 hover:bg-[#fdeeee]"><Trash2 size={16} /></button>
            </div>
          ))}
          {b.links.length < 4 && <AdminButton icon={Plus} onClick={() => set({ ...b, links: [...b.links, { label: "", url: "https://f-y-s-u.com" }] })}>Ajouter un lien</AdminButton>}
        </div>
      )
    case "heroTitle":
      return (
        <div className="space-y-3">
          <Upload url={b.imageUrl} onUrl={(u) => set({ ...b, imageUrl: u })} />
          <input className={field} placeholder="Titre écrit sur la photo (ex. Nouvelle collection)" value={b.title} onChange={(e) => set({ ...b, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className={field} placeholder="Texte du bouton (vide = pas de bouton)" value={b.buttonLabel ?? ""} onChange={(e) => set({ ...b, buttonLabel: e.target.value })} />
            <input className={field} placeholder="Lien du bouton" value={b.buttonUrl ?? ""} onChange={(e) => set({ ...b, buttonUrl: e.target.value })} />
          </div>
        </div>
      )
    case "mosaic":
      return (
        <div className="space-y-4">
          {b.images.map((im, i) => (
            <div key={i} className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-[#e0dbd3]">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-[#6b6760]">
                <span>{i < 2 ? `Photo ${i + 1}` : "Photo large (en dessous)"}</span>
                {b.images.length > 1 && <button type="button" aria-label="Retirer" onClick={() => set({ ...b, images: b.images.filter((_, j) => j !== i) })} className="rounded-full p-1.5 hover:bg-[#fdeeee]"><Trash2 size={14} /></button>}
              </div>
              <Upload url={im.imageUrl} onUrl={(u) => set({ ...b, images: b.images.map((x, j) => (j === i ? { ...x, imageUrl: u } : x)) })} />
              <input className={field} placeholder="Lien au clic (facultatif)" value={im.href ?? ""} onChange={(e) => set({ ...b, images: b.images.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)) })} />
            </div>
          ))}
          {b.images.length < 3 && <AdminButton icon={Plus} onClick={() => set({ ...b, images: [...b.images, { imageUrl: "" }] })}>Ajouter une photo</AdminButton>}
        </div>
      )
    case "hero":
      return (
        <div className="space-y-3">
          <Upload url={b.imageUrl} onUrl={(u) => set({ ...b, imageUrl: u })} />
          <input className={field} placeholder="Lien au clic (facultatif)" value={b.href ?? ""} onChange={(e) => set({ ...b, href: e.target.value })} />
        </div>
      )
    case "title":
      return (
        <div className="space-y-3">
          <input className={field} placeholder="Petite étiquette au-dessus (ex. SS27)" value={b.eyebrow ?? ""} onChange={(e) => set({ ...b, eyebrow: e.target.value })} />
          <input className={field} placeholder="Titre" value={b.title} onChange={(e) => set({ ...b, title: e.target.value })} />
          <Seg value={b.style ?? "bold"} opts={[["bold", "Gras"], ["light", "Fin, en capitales"]]} onChange={(v) => set({ ...b, style: v })} />
          <Seg value={b.align ?? "left"} opts={[["left", "À gauche"], ["center", "Centré"]]} onChange={(v) => set({ ...b, align: v })} />
        </div>
      )
    case "text":
      return (
        <div className="space-y-3">
          <textarea className={field} rows={6} placeholder="Ton texte…" value={b.text} onChange={(e) => set({ ...b, text: e.target.value })} />
          <Seg value={b.align ?? "left"} opts={[["left", "À gauche"], ["center", "Centré"]]} onChange={(v) => set({ ...b, align: v })} />
        </div>
      )
    case "button":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className={field} placeholder="Texte du bouton" value={b.label} onChange={(e) => set({ ...b, label: e.target.value })} />
            <input className={field} placeholder="Lien" value={b.url} onChange={(e) => set({ ...b, url: e.target.value })} />
          </div>
          <select className={field} value={b.style ?? "solid"} onChange={(e) => set({ ...b, style: e.target.value as "solid" | "outline" })}>
            <option value="solid">Plein (noir)</option>
            <option value="outline">Contour</option>
          </select>
        </div>
      )
    case "quote":
      return (
        <div className="space-y-3">
          <textarea className={field} rows={3} placeholder="Citation" value={b.text} onChange={(e) => set({ ...b, text: e.target.value })} />
          <input className={field} placeholder="Auteur (facultatif)" value={b.by ?? ""} onChange={(e) => set({ ...b, by: e.target.value })} />
        </div>
      )
    case "products":
      return (
        <div className="space-y-3">
          <input className={field} placeholder="Titre de la grille (facultatif)" value={b.heading ?? ""} onChange={(e) => set({ ...b, heading: e.target.value })} />
          <select className={field} value={b.columns ?? 2} onChange={(e) => set({ ...b, columns: Number(e.target.value) === 1 ? 1 : 2 })}>
            <option value={2}>2 colonnes</option>
            <option value={1}>1 grand produit par ligne</option>
          </select>
          <ProductPicker items={b.items} onChange={(items) => set({ ...b, items })} />
        </div>
      )
    default:
      return null
  }
}


function Sheet({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-x-0 bottom-0 z-40 max-h-[62vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.18)] ring-1 ring-[#e9e5df] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:max-h-[80vh] lg:w-[400px] lg:rounded-3xl">{children}</div>
}
const IconBtn = ({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) => (
  <button type="button" aria-label={label} onClick={onClick} className={`rounded-full p-2.5 ${danger ? "hover:bg-[#fdeeee]" : "hover:bg-[#171717]/[0.06]"}`}>{children}</button>
)

export default function NewsletterAdmin() {
  const [info, setInfo] = useState<{ active: number; configured: boolean } | null>(null)
  const [c, setC] = useState<Campaign>({ subject: "", preheader: "", blocks: [] })
  const [loaded, setLoaded] = useState(false)
  const [sel, setSel] = useState<number | null>(null)
  const [panel, setPanel] = useState<null | "templates" | "add" | "send">(null)
  const [at, setAt] = useState(0)
  const [wide, setWide] = useState(false)
  const [testTo, setTestTo] = useState("")
  const [busy, setBusy] = useState<"" | "test" | "send">("")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get<{ active: number; configured: boolean; draft: Campaign | null }>("/api/admin/newsletter")
      .then((r) => {
        setInfo(r)
        if (r.draft && Array.isArray(r.draft.blocks) && r.draft.blocks.length) setC(r.draft)
        else setPanel("templates")
      })
      .catch((e) => { notify.error(errorMessage(e)); setPanel("templates") })
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { api.put("/api/admin/newsletter", { campaign: c }).catch(() => {}) }, 1200)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [c, loaded])

  const setBlock = (i: number, b: Block) => setC((p) => ({ ...p, blocks: p.blocks.map((x, j) => (j === i ? b : x)) }))
  const insert = (k: Kind) => {
    setC((p) => ({ ...p, blocks: [...p.blocks.slice(0, at), JSON.parse(JSON.stringify(NEW_BLOCK[k])), ...p.blocks.slice(at)] }))
    setSel(at); setPanel(null)
  }
  const move = (d: number) => {
    if (sel === null) return
    const j = sel + d
    if (j < 0 || j >= c.blocks.length) return
    setC((p) => { const a = [...p.blocks]; [a[sel], a[j]] = [a[j], a[sel]]; return { ...p, blocks: a } })
    setSel(j)
  }
  const dup = () => { if (sel === null) return; setC((p) => ({ ...p, blocks: [...p.blocks.slice(0, sel + 1), JSON.parse(JSON.stringify(p.blocks[sel])), ...p.blocks.slice(sel + 1)] })); setSel(sel + 1) }
  const del = () => { if (sel === null) return; setC((p) => ({ ...p, blocks: p.blocks.filter((_, j) => j !== sel) })); setSel(null) }

  async function test() {
    setBusy("test")
    try { await api.post("/api/admin/newsletter", { action: "test", to: testTo, campaign: c }); notify.success("Test envoyé") } catch (e) { notify.error(errorMessage(e)) } finally { setBusy("") }
  }
  async function send() {
    if (!window.confirm(`Envoyer « ${c.subject} » à ${info?.active ?? 0} inscrit(s) ? Impossible d'annuler.`)) return
    setBusy("send")
    try { const r = await api.post<{ sent: number }>("/api/admin/newsletter", { action: "send", campaign: c }); notify.success(`Envoyé à ${r.sent} inscrit(s)`); setPanel(null) } catch (e) { notify.error(errorMessage(e)) } finally { setBusy("") }
  }

  const block = sel !== null ? c.blocks[sel] : null
  const canSend = !busy && !!info?.configured && !!c.subject.trim() && c.blocks.length > 0
  const Plus1 = ({ i }: { i: number }) => (
    <div className="flex h-7 items-center justify-center">
      <button type="button" aria-label="Ajouter un bloc ici" onClick={() => { setAt(i); setPanel("add"); setSel(null) }} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-[#171717] shadow-sm ring-1 ring-[#cfcdc7] hover:bg-[#171717] hover:text-white"><Plus size={14} /></button>
    </div>
  )

  return (
    <div className={sel !== null || panel ? "pb-[58vh] lg:pb-0" : "pb-24"}>
      {/* barre d'outils */}
      <div className="sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-2 border-b border-[#e9e5df] bg-[#f6f4f0]/95 px-4 py-2.5 backdrop-blur sm:-mx-0 sm:rounded-2xl sm:border">
        <AdminButton icon={LayoutTemplate} onClick={() => setPanel("templates")}>Modèles</AdminButton>
        <div className="ml-auto hidden gap-1 rounded-full bg-white p-1 ring-1 ring-[#e0dbd3] sm:flex">
          <button type="button" aria-label="Téléphone" onClick={() => setWide(false)} className={`rounded-full p-2 ${!wide ? "bg-[#171717] text-white" : ""}`}><Smartphone size={15} /></button>
          <button type="button" aria-label="Ordinateur" onClick={() => setWide(true)} className={`rounded-full p-2 ${wide ? "bg-[#171717] text-white" : ""}`}><Monitor size={15} /></button>
        </div>
        <div className="ml-auto flex gap-2 sm:ml-0"><AdminButton icon={Send} variant="primary" onClick={() => { setPanel("send"); setSel(null) }}>Envoyer</AdminButton></div>
      </div>

      <div className="mx-auto" style={{ maxWidth: wide ? 600 : 390 }}>
        <input value={c.subject} onChange={(e) => setC({ ...c, subject: e.target.value })} placeholder="Objet du mail" className="mb-2 w-full rounded-2xl bg-white px-4 py-3 text-[15px] font-medium ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]" />
        <input value={c.preheader ?? ""} onChange={(e) => setC({ ...c, preheader: e.target.value })} placeholder="Phrase grise sous l'objet (facultatif)" className="mb-4 w-full rounded-2xl bg-white px-4 py-2.5 text-sm ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]" />

        {/* la toile : le mail tel qu'il sera reçu */}
        <div className="overflow-hidden rounded-2xl ring-1 ring-[#d9d7d1]" style={{ background: "#e8e7e3" }} onClick={() => setSel(null)}>
          <div className="flex justify-center px-7 pb-7 pt-9">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/images/fysu-dark.png" alt="FYSU" width={104} style={{ width: 104, height: "auto" }} /></div>
          <Plus1 i={0} />
          {c.blocks.map((b, i) => (
            <div key={i}>
              <div
                role="button" tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setSel(i); setPanel(null) }}
                onKeyDown={(e) => e.key === "Enter" && (setSel(i), setPanel(null))}
                className={`relative cursor-pointer ${sel === i ? "outline outline-2 outline-offset-[-2px] outline-[#0a84ff]" : "hover:outline hover:outline-1 hover:outline-offset-[-1px] hover:outline-[#0a84ff]/50"}`}
              >
                {isEmpty(b) ? (
                  <div className="mx-7 mb-5 flex h-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#a9a59c] text-[#7a756d]">
                    {(() => { const I = ICON_OF[b.type] ?? ImageIcon; return <I size={20} /> })()}
                    <span className="text-xs">Touche pour ajouter {WORD[b.type] ?? ""}</span>
                  </div>
                ) : <BlockView b={b} />}
              </div>
              <Plus1 i={i + 1} />
            </div>
          ))}
          {c.blocks.length === 0 && <p className="px-6 py-10 text-center text-sm text-[#7a756d]">Choisis un modèle ou touche +</p>}
          <p className="px-7 pb-8 pt-4 text-center text-[11px] text-[#9a948a]">FYSU · adresse · Se désinscrire</p>
        </div>
      </div>

      {/* édition du bloc touché */}
      {block && sel !== null && panel === null && (
        <Sheet>
          <div className="mb-3 flex items-center gap-1">
            <span className="mr-auto text-sm font-medium">{BLOCK_LABEL[block.type]}</span>
            <IconBtn label="Monter" onClick={() => move(-1)}><ArrowUp size={16} /></IconBtn>
            <IconBtn label="Descendre" onClick={() => move(1)}><ArrowDown size={16} /></IconBtn>
            <IconBtn label="Dupliquer" onClick={dup}><Copy size={16} /></IconBtn>
            <IconBtn label="Supprimer" onClick={del} danger><Trash2 size={16} /></IconBtn>
            <IconBtn label="Fermer" onClick={() => setSel(null)}><X size={16} /></IconBtn>
          </div>
          <BlockForm b={block} set={(nb) => setBlock(sel, nb)} />
        </Sheet>
      )}

      {panel === "add" && (
        <Sheet>
          <div className="mb-3 flex items-center"><span className="mr-auto text-sm font-medium">Ajouter</span><IconBtn label="Fermer" onClick={() => setPanel(null)}><X size={16} /></IconBtn></div>
          <div className="grid grid-cols-3 gap-2">
            {PICK.map(([k, l, I]) => (
              <button key={k} type="button" onClick={() => insert(k)} className="flex flex-col items-center gap-2 rounded-2xl bg-[#faf8f5] px-2 py-4 text-xs ring-1 ring-[#ebe6de] hover:ring-[#171717]"><I size={20} />{l}</button>
            ))}
          </div>
        </Sheet>
      )}

      {panel === "templates" && (
        <Sheet>
          <div className="mb-3 flex items-center"><span className="mr-auto text-sm font-medium">Modèles</span>{c.blocks.length > 0 && <IconBtn label="Fermer" onClick={() => setPanel(null)}><X size={16} /></IconBtn>}</div>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button key={t.name} type="button" onClick={() => { if (c.blocks.some((b) => !isEmpty(b)) && !window.confirm(`Remplacer le mail par « ${t.name} » ?`)) return; const n = t.make(); setC((p) => ({ ...n, subject: p.subject, preheader: p.preheader })); setSel(null); setPanel(null) }} className="rounded-2xl bg-[#faf8f5] p-4 text-left text-sm font-medium ring-1 ring-[#ebe6de] hover:ring-[#171717]">{t.name}</button>
            ))}
          </div>
        </Sheet>
      )}

      {panel === "send" && (
        <Sheet>
          <div className="mb-3 flex items-center"><span className="mr-auto text-sm font-medium">Envoyer</span><IconBtn label="Fermer" onClick={() => setPanel(null)}><X size={16} /></IconBtn></div>
          {info && !info.configured && <p className="mb-3 rounded-xl bg-[#fff6e5] p-3 text-sm text-[#7a5200]">Resend n'est pas branché.</p>}
          {!c.subject.trim() && <p className="mb-3 text-sm text-[#9b1c1c]">Ajoute un objet en haut du mail.</p>}
          <div className="flex gap-2"><input className={field} type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="ton@email.com" /><AdminButton icon={Mail} onClick={test} disabled={!canSend || !testTo}>Test</AdminButton></div>
          <div className="mt-3"><AdminButton icon={Send} variant="primary" onClick={send} disabled={!canSend || !((info?.active ?? 0) > 0)}>{busy === "send" ? "Envoi…" : `Envoyer à ${info?.active ?? 0} inscrit(s)`}</AdminButton></div>
        </Sheet>
      )}
    </div>
  )
}
