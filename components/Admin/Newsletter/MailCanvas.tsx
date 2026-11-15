"use client"

import { useMemo, useState } from "react"
import { Crop, AlignLeft, ArrowDown, ArrowUp, Captions, Copy, Heading, Image as ImageIcon, LayoutGrid, Menu as MenuIcon, Minus, MousePointerClick, Plus, Quote, Palette, Shirt, Stamp, Trash2, X, type LucideIcon } from "lucide-react"
import { AdminButton } from "@/components/Admin/ui/kit"
import { errorMessage, notify } from "@/lib/adminApi"
import { ProductPicker, uploadImage } from "@/components/Admin/Newsletter/shared"
import CropModal from "@/components/Admin/Newsletter/CropModal"
import LinkPicker from "@/components/Admin/Newsletter/LinkPicker"
import { BLOCK_LABEL, isDark, renderBlock, type Block } from "@/lib/emailBlocks"

export const field = "w-full rounded-xl bg-white px-3 py-2.5 text-[15px] ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]"
export const SITE = "https://f-y-s-u.com"

export type Kind = Exclude<Block["type"], "raw">

export const NEW_BLOCK: Record<Kind, Block> = {
  background: { type: "background", color: "#151515" },
  logo: { type: "logo", size: "m", align: "center", color: "dark" },
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

export const PICK: [Kind, string, LucideIcon][] = [
  ["logo", "Logo", Stamp],
  ["background", "Fond du mail", Palette],
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


export function isEmpty(b: Block): boolean {
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

export function BlockView({ b, page }: { b: Block; page?: string }) {
  const html = useMemo(() => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${renderBlock(b, page)}</table>`, [b, page])
  return <div style={{ pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: html }} />
}

function Upload({ url, onUrl }: { url: string; onUrl: (u: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [crop, setCrop] = useState<File | string | null>(null)

  async function done(f: File) {
    setCrop(null)
    setBusy(true)
    try { onUrl(await uploadImage(f)) } catch (er) { notify.error(errorMessage(er)) } finally { setBusy(false) }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#f0ece5] text-[#9a948a]"><ImageIcon size={22} /></div>}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#171717] px-4 py-2.5 text-sm font-medium text-white">
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setCrop(f) }} />
        {busy ? "Envoi…" : url ? "Changer" : "Choisir une photo"}
      </label>
      {url && !busy && (
        <button type="button" onClick={() => setCrop(url)} className="inline-flex items-center gap-2 rounded-full bg-[#f0ece5] px-4 py-2.5 text-sm font-medium"><Crop size={15} />Recadrer</button>
      )}
      {crop && <CropModal src={crop} onCancel={() => setCrop(null)} onDone={done} />}
    </div>
  )
}

const SIZES: ["s" | "m" | "l", string][] = [["s", "Petit"], ["m", "Moyen"], ["l", "Grand"]]

export function Seg<T extends string>({ value, opts, onChange }: { value: T; opts: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={`rounded-full px-3 py-1.5 text-sm ring-1 ${value === v ? "bg-[#171717] text-white ring-[#171717]" : "bg-white ring-[#e0dbd3]"}`}>{l}</button>
      ))}
    </div>
  )
}

const SWATCHES: [string, string][] = [["#e8e7e3", "Gris FYSU"], ["#ffffff", "Blanc"], ["#d9d3c7", "Sable"], ["#c9d1c0", "Sauge"], ["#151515", "Noir"]]
export function ColorPick({ value, onChange, none }: { value?: string; onChange: (c: string) => void; none?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {none && <button type="button" onClick={() => onChange("")} className={`rounded-full px-3 py-1.5 text-sm ring-1 ${!value ? "bg-[#171717] text-white ring-[#171717]" : "bg-white ring-[#e0dbd3]"}`}>{none}</button>}
      {SWATCHES.map(([c, l]) => (
        <button key={c} type="button" aria-label={l} onClick={() => onChange(c)} className={`h-9 w-9 rounded-full ring-2 ${value?.toLowerCase() === c ? "ring-[#0a84ff]" : "ring-[#d9d3c7]"}`} style={{ background: c }} />
      ))}
      <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full ring-2 ring-[#d9d3c7]" aria-label="Autre couleur" style={{ background: "conic-gradient(#e33,#fb3,#3c6,#39f,#93f,#e33)" }}>
        <input type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#e8e7e3"} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  )
}

export function BlockForm({ b, set, chips }: { b: Block; set: (b: Block) => void; chips?: [string, string][] }) {
  switch (b.type) {
    case "background":
      return (
        <div className="space-y-3">
          <ColorPick value={b.color} onChange={(c) => set({ ...b, color: c })} />
          <p className="text-xs text-[#7a756d]">Couleur de tout le mail. Le texte passe en clair tout seul sur un fond foncé. Chaque bloc peut aussi avoir sa propre couleur.</p>
        </div>
      )
    case "logo":
      return (
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#6b6760]">Taille</p>
            <Seg value={b.size ?? "m"} opts={[["none", "Aucun"], ["s", "S"], ["m", "M"], ["l", "L"]]} onChange={(v) => set({ ...b, size: v })} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#6b6760]">Place</p>
            <Seg value={b.align ?? "center"} opts={[["left", "Gauche"], ["center", "Centre"], ["right", "Droite"]]} onChange={(v) => set({ ...b, align: v })} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#6b6760]">Couleur</p>
            <Seg value={b.color ?? "dark"} opts={[["dark", "Noir"], ["light", "Blanc"]]} onChange={(v) => set({ ...b, color: v })} />
          </div>
          <p className="text-xs text-[#7a756d]">Monte / descends le bloc pour le placer où tu veux. Pour le mettre sur une photo, choisis « Logo sur la photo » dans le bloc photo.</p>
        </div>
      )
    case "nav":
      return (
        <div className="space-y-3">
          {b.links.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
              <input className={field} placeholder="Nom (ex. Best-sellers)" value={l.label} onChange={(e) => set({ ...b, links: b.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <LinkPicker value={l.url} onChange={(u) => set({ ...b, links: b.links.map((x, j) => (j === i ? { ...x, url: u } : x)) })} />
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
          <Seg value={b.size ?? "m"} opts={SIZES} onChange={(v) => set({ ...b, size: v })} />
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#6b6760]">Cadre</p>
            <Seg value={b.height ?? "l"} opts={[["s", "Bandeau"], ["m", "Paysage"], ["l", "Portrait"]]} onChange={(v) => set({ ...b, height: v })} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#6b6760]">Partie de la photo</p>
            <Seg value={b.focus ?? "top"} opts={[["top", "Haut"], ["center", "Milieu"], ["bottom", "Bas"]]} onChange={(v) => set({ ...b, focus: v })} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#6b6760]">Logo sur la photo</p>
            <Seg value={b.logo ?? "none"} opts={[["none", "Aucun"], ["top", "En haut"], ["center", "Au centre"]]} onChange={(v) => set({ ...b, logo: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={field} placeholder="Texte du bouton (vide = pas de bouton)" value={b.buttonLabel ?? ""} onChange={(e) => set({ ...b, buttonLabel: e.target.value })} />
            <LinkPicker optional value={b.buttonUrl ?? ""} onChange={(u) => set({ ...b, buttonUrl: u })} />
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
              <LinkPicker optional value={im.href ?? ""} onChange={(u) => set({ ...b, images: b.images.map((x, j) => (j === i ? { ...x, href: u } : x)) })} />
            </div>
          ))}
          {b.images.length < 3 && <AdminButton icon={Plus} onClick={() => set({ ...b, images: [...b.images, { imageUrl: "" }] })}>Ajouter une photo</AdminButton>}
        </div>
      )
    case "hero":
      return (
        <div className="space-y-3">
          <Upload url={b.imageUrl} onUrl={(u) => set({ ...b, imageUrl: u })} />
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#6b6760]">Cadre</p>
            <Seg value={b.frame ?? "landscape"} opts={[["wide", "Bandeau"], ["landscape", "Paysage"], ["square", "Carré"], ["full", "Entière"]]} onChange={(v) => set({ ...b, frame: v })} />
          </div>
          {(b.frame ?? "landscape") !== "full" && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#6b6760]">Partie de la photo</p>
              <Seg value={b.focus ?? "center"} opts={[["top", "Haut"], ["center", "Milieu"], ["bottom", "Bas"]]} onChange={(v) => set({ ...b, focus: v })} />
            </div>
          )}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#6b6760]">Logo sur la photo</p>
            <Seg value={b.logo ?? "none"} opts={[["none", "Aucun"], ["top", "En haut"], ["center", "Au centre"]]} onChange={(v) => set({ ...b, logo: v })} />
          </div>
          <LinkPicker optional value={b.href ?? ""} onChange={(u) => set({ ...b, href: u })} />
        </div>
      )
    case "title":
      return (
        <div className="space-y-3">
          <input className={field} placeholder="Petite étiquette au-dessus (ex. SS27)" value={b.eyebrow ?? ""} onChange={(e) => set({ ...b, eyebrow: e.target.value })} />
          <input className={field} placeholder="Titre" value={b.title} onChange={(e) => set({ ...b, title: e.target.value })} />
          <Chips chips={chips} onPick={(t) => set({ ...b, title: b.title + t })} />
          <Seg value={b.size ?? "m"} opts={SIZES} onChange={(v) => set({ ...b, size: v })} />
          <Seg value={b.style ?? "bold"} opts={[["bold", "Gras"], ["light", "Fin, en capitales"]]} onChange={(v) => set({ ...b, style: v })} />
          <Seg value={b.align ?? "left"} opts={[["left", "À gauche"], ["center", "Centré"]]} onChange={(v) => set({ ...b, align: v })} />
        </div>
      )
    case "text":
      return (
        <div className="space-y-3">
          <textarea className={field} rows={6} placeholder="Ton texte…" value={b.text} onChange={(e) => set({ ...b, text: e.target.value })} />
          <Chips chips={chips} onPick={(t) => set({ ...b, text: b.text + t })} />
          <Seg value={b.size ?? "m"} opts={SIZES} onChange={(v) => set({ ...b, size: v })} />
          <Seg value={b.align ?? "left"} opts={[["left", "À gauche"], ["center", "Centré"]]} onChange={(v) => set({ ...b, align: v })} />
        </div>
      )
    case "button":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className={field} placeholder="Texte du bouton" value={b.label} onChange={(e) => set({ ...b, label: e.target.value })} />
            <LinkPicker value={b.url} onChange={(u) => set({ ...b, url: u })} />
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

export function Sheet({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-x-0 bottom-0 z-40 max-h-[62vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.18)] ring-1 ring-[#e9e5df] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:max-h-[80vh] lg:w-[400px] lg:rounded-3xl">{children}</div>
}
export const IconBtn = ({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) => (
  <button type="button" aria-label={label} onClick={onClick} className={`rounded-full p-2.5 ${danger ? "hover:bg-[#fdeeee]" : "hover:bg-[#171717]/[0.06]"}`}>{children}</button>
)


function Chips({ chips, onPick }: { chips?: [string, string][]; onPick: (t: string) => void }) {
  if (!chips?.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(([l, t]) => <button key={t} type="button" onClick={() => onPick(t)} className="rounded-full bg-[#f0ece5] px-2.5 py-1 text-xs">+ {l}</button>)}
    </div>
  )
}

/* La toile : le mail tel qu'il sera reçu. On touche un bloc pour le modifier, « + » pour en ajouter. */
export function MailCanvas({ blocks, onChange, wide, hideSheet, onTouch, chips }: { blocks: Block[]; onChange: (b: Block[]) => void; wide?: boolean; hideSheet?: boolean; onTouch?: () => void; chips?: [string, string][] }) {
  const [sel, setSel] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [at, setAt] = useState(0)

  const setBlock = (i: number, b: Block) => onChange(blocks.map((x, j) => (j === i ? b : x)))
  const insert = (k: Kind) => { onChange([...blocks.slice(0, at), JSON.parse(JSON.stringify(NEW_BLOCK[k])), ...blocks.slice(at)]); setSel(at); setAdding(false) }
  const move = (d: number) => {
    if (sel === null) return
    const j = sel + d
    if (j < 0 || j >= blocks.length) return
    const a = [...blocks]; [a[sel], a[j]] = [a[j], a[sel]]
    onChange(a); setSel(j)
  }
  const dup = () => { if (sel === null) return; onChange([...blocks.slice(0, sel + 1), JSON.parse(JSON.stringify(blocks[sel])), ...blocks.slice(sel + 1)]); setSel(sel + 1) }
  const del = () => { if (sel === null) return; onChange(blocks.filter((_, j) => j !== sel)); setSel(null) }
  const touch = (i: number | null) => { setSel(i); setAdding(false); if (i !== null) onTouch?.() }

  const plus = (i: number) => (
    <div className="flex h-7 items-center justify-center">
      <button type="button" aria-label="Ajouter un bloc ici" onClick={(e) => { e.stopPropagation(); setAt(i); setAdding(true); setSel(null); onTouch?.() }} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-[#171717] shadow-sm ring-1 ring-[#cfcdc7] hover:bg-[#171717] hover:text-white"><Plus size={14} /></button>
    </div>
  )
  const block = sel !== null ? blocks[sel] : null
  const bgb = blocks.find((x) => x.type === "background")
  const page = bgb && bgb.type === "background" ? bgb.color : "#e8e7e3"
  const dark = isDark(page)
  const open = !hideSheet && (adding || block !== null)

  return (
    <>
      <div className="mx-auto" style={{ maxWidth: wide ? 600 : 390 }}>
        <div className="overflow-hidden rounded-2xl ring-1 ring-[#d9d7d1]" style={{ background: page }} onClick={() => touch(null)}>
          {!blocks.some((x) => x.type === "logo") && <div className="flex justify-center px-7 pb-7 pt-9">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={dark ? "/images/fysu-light.png" : "/images/fysu-dark.png"} alt="FYSU" width={104} style={{ width: 104, height: "auto" }} /></div>}
          {plus(0)}
          {blocks.map((b, i) => (
            <div key={i}>
              <div
                role="button" tabIndex={0}
                onClick={(e) => { e.stopPropagation(); touch(i) }}
                onKeyDown={(e) => e.key === "Enter" && touch(i)}
                className={`relative cursor-pointer ${sel === i ? "outline outline-2 outline-offset-[-2px] outline-[#0a84ff]" : "hover:outline hover:outline-1 hover:outline-offset-[-1px] hover:outline-[#0a84ff]/50"}`}
              >
                {b.type === "background" ? (
                  <div className="mx-7 mb-3 flex items-center gap-2 rounded-full bg-black/5 px-3 py-2 text-xs" style={{ color: dark ? "#ddd" : "#5c5a55" }}><Palette size={14} />Fond du mail<span className="ml-auto h-4 w-4 rounded-full ring-1 ring-black/20" style={{ background: b.color }} /></div>
                ) : isEmpty(b) ? (
                  <div className="mx-7 mb-5 flex h-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#a9a59c] text-[#7a756d]">
                    {(() => { const I = ICON_OF[b.type] ?? ImageIcon; return <I size={20} /> })()}
                    <span className="text-xs">Touche pour ajouter {WORD[b.type] ?? ""}</span>
                  </div>
                ) : <BlockView b={b} page={page} />}
              </div>
              {plus(i + 1)}
            </div>
          ))}
          {blocks.length === 0 && <p className="px-6 py-10 text-center text-sm text-[#7a756d]">Touche +</p>}
          <p className="px-7 pb-8 pt-4 text-center text-[11px]" style={{ color: dark ? "#b5b2aa" : "#9a948a" }}>FYSU · adresse · Se désinscrire</p>
        </div>
      </div>
      <div className={open ? "h-[58vh] lg:h-0" : "h-24"} />

      {!hideSheet && block && sel !== null && (
        <Sheet>
          <div className="mb-3 flex items-center gap-1">
            <span className="mr-auto text-sm font-medium">{BLOCK_LABEL[block.type]}</span>
            <IconBtn label="Monter" onClick={() => move(-1)}><ArrowUp size={16} /></IconBtn>
            <IconBtn label="Descendre" onClick={() => move(1)}><ArrowDown size={16} /></IconBtn>
            <IconBtn label="Dupliquer" onClick={dup}><Copy size={16} /></IconBtn>
            <IconBtn label="Supprimer" onClick={del} danger><Trash2 size={16} /></IconBtn>
            <IconBtn label="Fermer" onClick={() => setSel(null)}><X size={16} /></IconBtn>
          </div>
          <BlockForm b={block} set={(nb) => setBlock(sel, nb)} chips={chips} />
          {block.type !== "background" && (
            <div className="mt-4 border-t border-[#ebe6de] pt-3">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#6b6760]">Fond de cette section</p>
              <ColorPick none="Comme le mail" value={block.bg} onChange={(c) => setBlock(sel, { ...block, bg: c || undefined })} />
            </div>
          )}
        </Sheet>
      )}

      {!hideSheet && adding && (
        <Sheet>
          <div className="mb-3 flex items-center"><span className="mr-auto text-sm font-medium">Ajouter</span><IconBtn label="Fermer" onClick={() => setAdding(false)}><X size={16} /></IconBtn></div>
          <div className="grid grid-cols-3 gap-2">
            {PICK.map(([k, l, I]) => (
              <button key={k} type="button" onClick={() => insert(k)} className="flex flex-col items-center gap-2 rounded-2xl bg-[#faf8f5] px-2 py-4 text-xs ring-1 ring-[#ebe6de] hover:ring-[#171717]"><I size={20} />{l}</button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  )
}
