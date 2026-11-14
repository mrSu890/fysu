"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Copy, Mail, Plus, Send, Trash2 } from "lucide-react"
import { AdminButton, PageHeader, Panel } from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"
import { resizeImage } from "@/lib/imageTools"
import { BLOCK_LABEL, type Block, type ProductPick } from "@/lib/emailBlocks"
import { renderEmail, type Campaign } from "@/lib/newsletter"

const field = "w-full rounded-xl bg-white px-3 py-2.5 text-[15px] ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]"
const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#6b6760]"

const START: Campaign = {
  subject: "",
  preheader: "",
  blocks: [
    { type: "hero", imageUrl: "", alt: "" },
    { type: "title", eyebrow: "Nouvelle collection", title: "" },
    { type: "text", text: "" },
    { type: "button", label: "Découvrir", url: "https://f-y-s-u.com", style: "solid" },
  ],
}

const NEW_BLOCK: Record<Exclude<Block["type"], "raw">, Block> = {
  hero: { type: "hero", imageUrl: "", alt: "" },
  title: { type: "title", eyebrow: "", title: "" },
  text: { type: "text", text: "" },
  button: { type: "button", label: "Découvrir", url: "https://f-y-s-u.com", style: "solid" },
  products: { type: "products", heading: "La sélection", columns: 2, items: [] },
  quote: { type: "quote", text: "", by: "" },
  divider: { type: "divider" },
}

const TEMPLATES: { name: string; hint: string; make: () => Campaign }[] = [
  {
    name: "Nouvelle collection",
    hint: "Grande image, titre, texte, bouton, sélection de produits",
    make: () => ({
      subject: "", preheader: "",
      blocks: [
        { type: "hero", imageUrl: "", alt: "" },
        { type: "title", eyebrow: "Nouvelle collection", title: "" },
        { type: "text", text: "" },
        { type: "button", label: "Découvrir la collection", url: "https://f-y-s-u.com", style: "solid" },
        { type: "products", heading: "La sélection", columns: 2, items: [] },
      ],
    }),
  },
  {
    name: "Un produit à l'honneur",
    hint: "Un seul produit en grand, un mot, un bouton",
    make: () => ({
      subject: "", preheader: "",
      blocks: [
        { type: "title", eyebrow: "À découvrir", title: "" },
        { type: "products", heading: "", columns: 1, items: [] },
        { type: "text", text: "" },
        { type: "button", label: "Voir la pièce", url: "https://f-y-s-u.com", style: "solid" },
      ],
    }),
  },
  {
    name: "Annonce / événement",
    hint: "Image, titre, date et lieu, bouton",
    make: () => ({
      subject: "", preheader: "",
      blocks: [
        { type: "hero", imageUrl: "", alt: "" },
        { type: "title", eyebrow: "Événement", title: "" },
        { type: "text", text: "Date :\nLieu :\n\n" },
        { type: "button", label: "En savoir plus", url: "https://f-y-s-u.com", style: "outline" },
      ],
    }),
  },
  {
    name: "Message simple",
    hint: "Un titre et du texte, rien d'autre",
    make: () => ({ subject: "", preheader: "", blocks: [{ type: "title", eyebrow: "", title: "" }, { type: "text", text: "" }] }),
  },
]

async function uploadImage(file: File): Promise<string> {
  const small = await resizeImage(file)
  const form = new FormData()
  form.append("file", small)
  form.append("bucket", "story-media")
  const r = await api.upload<{ url: string }>("/api/admin/stories/upload", form)
  return r.url
}

function ProductPicker({ items, onChange }: { items: ProductPick[]; onChange: (v: ProductPick[]) => void }) {
  const [q, setQ] = useState("")
  const [all, setAll] = useState<ProductPick[]>([])
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => api.get<{ items: ProductPick[] }>(`/api/admin/newsletter/products?q=${encodeURIComponent(q)}`).then((r) => setAll(r.items)).catch(() => {}), 200)
    return () => clearTimeout(t)
  }, [q, open])
  const has = (id: number) => items.some((p) => p.id === id)
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <button key={p.id} type="button" onClick={() => onChange(items.filter((x) => x.id !== p.id))} className="flex items-center gap-2 rounded-full bg-[#f3f0ea] py-1 pl-1 pr-3 text-xs">
            {p.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.imageUrl} alt="" className="h-7 w-7 rounded-full object-cover" />}
            {p.name} ✕
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-4">
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-sm underline">{open ? "Fermer la liste" : "Ajouter des produits"}</button>
        <button type="button" className="text-sm underline" onClick={() => api.get<{ items: ProductPick[] }>("/api/admin/newsletter/products?q=").then((r) => onChange(r.items.slice(0, 4))).catch(() => {})}>Les 4 derniers produits</button>
        {items.length > 0 && <button type="button" className="text-sm underline" onClick={() => onChange([])}>Tout retirer</button>}
      </div>
      {open && (
        <div className="mt-2 rounded-xl bg-[#faf8f5] p-2 ring-1 ring-[#e0dbd3]">
          <input className={field} placeholder="Rechercher un produit" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {all.map((p) => (
              <button key={p.id} type="button" onClick={() => onChange(has(p.id) ? items.filter((x) => x.id !== p.id) : [...items, p])} className={`flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm ${has(p.id) ? "bg-[#171717] text-white" : "hover:bg-white"}`}>
                {p.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />}
                <span className="flex-1">{p.name}</span>
                <span className="text-xs opacity-70">{p.price} EUR</span>
              </button>
            ))}
            {all.length === 0 && <p className="p-2 text-xs text-[#6b6760]">Aucun produit.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function BlockForm({ b, set }: { b: Block; set: (b: Block) => void }) {
  const [busy, setBusy] = useState(false)
  switch (b.type) {
    case "hero":
      return (
        <div className="space-y-3">
          <input type="file" accept="image/*" className="text-sm" onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            setBusy(true)
            try { set({ ...b, imageUrl: await uploadImage(f) }) } catch (er) { notify.error(errorMessage(er)) } finally { setBusy(false) }
          }} />
          {busy && <p className="text-xs text-[#6b6760]">Envoi de l'image…</p>}
          {b.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={b.imageUrl} alt="" className="max-h-40 rounded" />}
          <input className={field} placeholder="Description de l'image (accessibilité)" value={b.alt ?? ""} onChange={(e) => set({ ...b, alt: e.target.value })} />
          <input className={field} placeholder="Lien au clic (facultatif)" value={b.href ?? ""} onChange={(e) => set({ ...b, href: e.target.value })} />
        </div>
      )
    case "title":
      return (
        <div className="space-y-3">
          <input className={field} placeholder="Petite étiquette au-dessus (ex. SS27)" value={b.eyebrow ?? ""} onChange={(e) => set({ ...b, eyebrow: e.target.value })} />
          <input className={field} placeholder="Titre" value={b.title} onChange={(e) => set({ ...b, title: e.target.value })} />
        </div>
      )
    case "text":
      return <textarea className={field} rows={6} placeholder="Texte. Une ligne vide = nouveau paragraphe. Lien : [texte](https://…)" value={b.text} onChange={(e) => set({ ...b, text: e.target.value })} />
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
      return <p className="text-sm text-[#6b6760]">Un simple filet fin pour aérer.</p>
  }
}

export default function NewsletterAdmin() {
  const [info, setInfo] = useState<{ active: number; configured: boolean } | null>(null)
  const [err, setErr] = useState("")
  const [c, setC] = useState<Campaign>(START)
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState("")
  const [testTo, setTestTo] = useState("")
  const [busy, setBusy] = useState<"" | "test" | "send">("")
  const [wide, setWide] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api
      .get<{ active: number; configured: boolean; draft: Campaign | null }>("/api/admin/newsletter")
      .then((r) => {
        setInfo(r)
        if (r.draft && Array.isArray(r.draft.blocks)) setC(r.draft)
      })
      .catch((e) => setErr(errorMessage(e)))
      .finally(() => setLoaded(true))
  }, [])

  // brouillon enregistré tout seul
  useEffect(() => {
    if (!loaded) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      api.put("/api/admin/newsletter", { campaign: c }).then(() => setSaved("Brouillon enregistré")).catch(() => setSaved(""))
    }, 1200)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [c, loaded])

  const preview = useMemo(() => renderEmail(c, "#").html.replace("<head>", '<head><base target="_blank">'), [c])
  const setBlock = (i: number, b: Block) => setC((p) => ({ ...p, blocks: p.blocks.map((x, j) => (j === i ? b : x)) }))
  const move = (i: number, d: number) => setC((p) => {
    const a = [...p.blocks]
    const j = i + d
    if (j < 0 || j >= a.length) return p
    ;[a[i], a[j]] = [a[j], a[i]]
    return { ...p, blocks: a }
  })

  async function test() {
    setBusy("test")
    try {
      await api.post("/api/admin/newsletter", { action: "test", to: testTo, campaign: c })
      notify.success("Test envoyé")
    } catch (e) { notify.error(errorMessage(e)) } finally { setBusy("") }
  }
  async function send() {
    if (!window.confirm(`Envoyer « ${c.subject} » à ${info?.active ?? 0} inscrit(s) ? Impossible d'annuler.`)) return
    setBusy("send")
    try {
      const r = await api.post<{ sent: number }>("/api/admin/newsletter", { action: "send", campaign: c })
      notify.success(`Envoyé à ${r.sent} inscrit(s)`)
    } catch (e) { notify.error(errorMessage(e)) } finally { setBusy("") }
  }

  const canSend = busy === "" && !!info?.configured

  return (
    <div>
      <PageHeader title="Newsletter" description="Un modèle à la DA de FYSU, construit en blocs : image, titre, texte, bouton, grille de produits, citation." />
      {err && <p className="mb-4 rounded-xl bg-[#fdeeee] p-3 text-sm text-[#9b1c1c]">{err}</p>}
      {info && !info.configured && <p className="mb-4 rounded-xl bg-[#fff6e5] p-3 text-sm text-[#7a5200]">Resend n'est pas encore branché : les envois sont impossibles pour l'instant.</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Panel title="Démarrer d'un modèle" description="Un modèle remplace le contenu actuel (le brouillon se sauvegarde, rien n'est envoyé).">
            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <button key={t.name} type="button" onClick={() => { if (!window.confirm(`Remplacer le contenu par le modèle « ${t.name} » ?`)) return; setC(t.make()) }} className="rounded-xl bg-white p-3 text-left ring-1 ring-[#e0dbd3] hover:ring-[#171717]">
                  <span className="block text-sm font-medium">{t.name}</span>
                  <span className="block text-xs text-[#6b6760]">{t.hint}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Objet" description={`${info?.active ?? 0} inscrit(s) actif(s) · ${saved}`}>
            <div className="space-y-3">
              <div><span className={label}>Objet de l'e-mail</span><input className={field} value={c.subject} onChange={(e) => setC({ ...c, subject: e.target.value })} placeholder="When The Flowers Bloom — les précommandes ouvrent" /></div>
              <div><span className={label}>Aperçu (la phrase grise sous l'objet)</span><input className={field} value={c.preheader ?? ""} onChange={(e) => setC({ ...c, preheader: e.target.value })} /></div>
            </div>
          </Panel>

          {c.blocks.map((b, i) => (
            <Panel key={i} title={`${i + 1}. ${BLOCK_LABEL[b.type]}`} action={
              <div className="flex gap-1">
                <button type="button" aria-label="Monter" onClick={() => move(i, -1)} className="rounded-full p-2 hover:bg-[#171717]/[0.06]"><ArrowUp size={16} /></button>
                <button type="button" aria-label="Descendre" onClick={() => move(i, 1)} className="rounded-full p-2 hover:bg-[#171717]/[0.06]"><ArrowDown size={16} /></button>
                <button type="button" aria-label="Dupliquer" onClick={() => setC((p) => ({ ...p, blocks: [...p.blocks.slice(0, i + 1), JSON.parse(JSON.stringify(b)), ...p.blocks.slice(i + 1)] }))} className="rounded-full p-2 hover:bg-[#171717]/[0.06]"><Copy size={16} /></button>
                <button type="button" aria-label="Supprimer" onClick={() => setC((p) => ({ ...p, blocks: p.blocks.filter((_, j) => j !== i) }))} className="rounded-full p-2 hover:bg-[#fdeeee]"><Trash2 size={16} /></button>
              </div>
            }>
              <BlockForm b={b} set={(nb) => setBlock(i, nb)} />
            </Panel>
          ))}

          <Panel title="Ajouter un bloc">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(NEW_BLOCK) as (keyof typeof NEW_BLOCK)[]).map((k) => (
                <AdminButton key={k} icon={Plus} onClick={() => setC((p) => ({ ...p, blocks: [...p.blocks, NEW_BLOCK[k]] }))}>{BLOCK_LABEL[k]}</AdminButton>
              ))}
            </div>
          </Panel>

          <Panel title="Envoi">
            <div className="space-y-3">
              <div><span className={label}>Envoyer un test à</span><input className={field} type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="ton@email.com" /></div>
              <div className="flex flex-wrap gap-2">
                <AdminButton icon={Mail} onClick={test} disabled={!canSend}>Envoyer le test</AdminButton>
                <AdminButton icon={Send} variant="primary" onClick={send} disabled={!canSend || !((info?.active ?? 0) > 0)}>{busy === "send" ? "Envoi…" : `Envoyer à tous (${info?.active ?? 0})`}</AdminButton>
              </div>
            </div>
          </Panel>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <Panel title="Aperçu" action={<button type="button" className="text-xs underline" onClick={() => setWide((w) => !w)}>{wide ? "Voir sur téléphone" : "Voir sur ordinateur"}</button>} padded={false}>
            <div className="flex justify-center bg-[#d9d7d1] p-3">
              <iframe title="Aperçu" srcDoc={preview} className="h-[760px] bg-[#e8e7e3]" style={{ width: wide ? 640 : 390, maxWidth: "100%" }} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
