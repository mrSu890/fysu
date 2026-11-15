"use client"

import { useEffect, useRef, useState } from "react"
import { Mail, Monitor, Send, Smartphone, X, LayoutTemplate } from "lucide-react"
import { AdminButton } from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"
import { MailCanvas, NEW_BLOCK, SITE, Sheet, IconBtn, field, isEmpty } from "@/components/Admin/Newsletter/MailCanvas"
import { AUDIENCES, type Audience } from "@/lib/audience"
import type { Block } from "@/lib/emailBlocks"
import type { Campaign } from "@/lib/newsletter"

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

export default function NewsletterAdmin() {
  const [info, setInfo] = useState<{ active: number; counts: Record<Audience, number>; configured: boolean } | null>(null)
  const [aud, setAud] = useState<Audience>("all")
  const [c, setC] = useState<Campaign>({ subject: "", preheader: "", blocks: [] })
  const [loaded, setLoaded] = useState(false)
  const [panel, setPanel] = useState<null | "templates" | "send">(null)
  const [wide, setWide] = useState(false)
  const [testTo, setTestTo] = useState("")
  const [busy, setBusy] = useState<"" | "test" | "send">("")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get<{ active: number; counts: Record<Audience, number>; configured: boolean; draft: Campaign | null }>("/api/admin/newsletter")
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

  async function test() {
    setBusy("test")
    try { await api.post("/api/admin/newsletter", { action: "test", to: testTo, campaign: c }); notify.success("Test envoyé") } catch (e) { notify.error(errorMessage(e)) } finally { setBusy("") }
  }
  async function send() {
    if (!window.confirm(`Envoyer « ${c.subject} » à ${n} personne(s) (${AUDIENCES.find((a) => a.id === aud)?.label}) ? Impossible d'annuler.`)) return
    setBusy("send")
    try { const r = await api.post<{ sent: number }>("/api/admin/newsletter", { action: "send", campaign: c, segment: aud }); notify.success(`Envoyé à ${r.sent} inscrit(s)`); setPanel(null) } catch (e) { notify.error(errorMessage(e)) } finally { setBusy("") }
  }
  const n = info?.counts?.[aud] ?? 0
  const canSend = !busy && !!info?.configured && !!c.subject.trim() && c.blocks.length > 0

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-2 border-b border-[#e9e5df] bg-[#f6f4f0]/95 px-4 py-2.5 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <AdminButton icon={LayoutTemplate} onClick={() => setPanel("templates")}>Modèles</AdminButton>
        <div className="ml-auto hidden gap-1 rounded-full bg-white p-1 ring-1 ring-[#e0dbd3] sm:flex">
          <button type="button" aria-label="Téléphone" onClick={() => setWide(false)} className={`rounded-full p-2 ${!wide ? "bg-[#171717] text-white" : ""}`}><Smartphone size={15} /></button>
          <button type="button" aria-label="Ordinateur" onClick={() => setWide(true)} className={`rounded-full p-2 ${wide ? "bg-[#171717] text-white" : ""}`}><Monitor size={15} /></button>
        </div>
        <div className="ml-auto sm:ml-0"><AdminButton icon={Send} variant="primary" onClick={() => setPanel("send")}>Envoyer</AdminButton></div>
      </div>

      <div className="mx-auto" style={{ maxWidth: wide ? 600 : 390 }}>
        <input value={c.subject} onChange={(e) => setC({ ...c, subject: e.target.value })} placeholder="Objet du mail" className="mb-2 w-full rounded-2xl bg-white px-4 py-3 text-[15px] font-medium ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]" />
        <input value={c.preheader ?? ""} onChange={(e) => setC({ ...c, preheader: e.target.value })} placeholder="Phrase grise sous l'objet (facultatif)" className="mb-4 w-full rounded-2xl bg-white px-4 py-2.5 text-sm ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]" />
      </div>

      <MailCanvas blocks={c.blocks} onChange={(blocks) => setC((p) => ({ ...p, blocks }))} wide={wide} hideSheet={panel !== null} onTouch={() => setPanel(null)} chips={[["Prénom", "{prenom}"]]} />

      {panel === "templates" && (
        <Sheet>
          <div className="mb-3 flex items-center"><span className="mr-auto text-sm font-medium">Modèles</span>{c.blocks.length > 0 && <IconBtn label="Fermer" onClick={() => setPanel(null)}><X size={16} /></IconBtn>}</div>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button key={t.name} type="button" onClick={() => { if (c.blocks.some((b) => !isEmpty(b)) && !window.confirm(`Remplacer le mail par « ${t.name} » ?`)) return; const n = t.make(); setC((p) => ({ ...n, subject: p.subject, preheader: p.preheader })); setPanel(null) }} className="rounded-2xl bg-[#faf8f5] p-4 text-left text-sm font-medium ring-1 ring-[#ebe6de] hover:ring-[#171717]">{t.name}</button>
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
          <p className="mb-1.5 mt-4 text-xs font-medium uppercase tracking-wider text-[#6b6760]">À qui</p>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <button key={a.id} type="button" onClick={() => setAud(a.id)} className={`rounded-full px-3 py-1.5 text-sm ring-1 ${aud === a.id ? "bg-[#171717] text-white ring-[#171717]" : "bg-white ring-[#e0dbd3]"}`}>{a.label} · {info?.counts?.[a.id] ?? 0}</button>
            ))}
          </div>
          <div className="mt-3"><AdminButton icon={Send} variant="primary" onClick={send} disabled={!canSend || n === 0}>{busy === "send" ? "Envoi…" : `Envoyer à ${n} personne(s)`}</AdminButton></div>
        </Sheet>
      )}
    </div>
  )
}
