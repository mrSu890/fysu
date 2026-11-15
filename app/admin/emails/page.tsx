"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bug, Clock, Heart, Layers, Lock, PackageCheck, PackageX, RotateCcw, Save, Send, Shirt, ShoppingCart, Sparkles, Star, Truck, Wrench, X, Mail, ShoppingBag, type LucideIcon } from "lucide-react"
import { AdminButton, IconTile, PageHeader, Panel, type TileTone } from "@/components/Admin/ui/kit"
import { api, errorMessage, formatDate, notify } from "@/lib/adminApi"

type Copy = { subject: string; eyebrow: string; title: string; body: string; cta: string; url: string }
type Sc = { id: string; kind: "auto" | "situation" | "campaign" | "soon"; label: string; when: string; enabled: boolean; fr: Copy; en: Copy; defaults: { fr: Copy; en: Copy } }
type Order = { id: string; customerName: string | null; email: string | null; createdAt: string; status: string }
type Aud = "orders" | "subscribers" | "segment" | "email"

const ICON: Record<string, [LucideIcon, TileTone]> = {
  welcome: [Sparkles, "green"], shipped: [Truck, "green"],
  delay: [Clock, "orange"], apology: [Heart, "orange"], stockout: [PackageX, "orange"], refund: [RotateCcw, "orange"], bug: [Bug, "orange"], maintenance: [Wrench, "orange"], review: [Star, "orange"],
  collection: [Layers, "purple"], private: [Lock, "purple"], product: [Shirt, "purple"],
  cart: [ShoppingCart, "gray"], restock: [PackageCheck, "gray"],
}
const SEGMENTS: [string, string][] = [["vip", "VIP"], ["loyal", "Fidèles"], ["new", "Nouveaux"], ["risk", "À relancer"], ["prospect", "Sans achat"]]

const field = "w-full rounded-xl bg-white px-3 py-2.5 text-[15px] ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]"
const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#6b6760]"

function Switch({ on, onChange, label: l }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={l} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[#34c759]" : "bg-[#d4cfc6]"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  )
}

function Seg<T extends string>({ value, opts, onChange }: { value: T; opts: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={`rounded-full px-3 py-1.5 text-sm ring-1 ${value === v ? "bg-[#171717] text-white ring-[#171717]" : "bg-white ring-[#e0dbd3]"}`}>{l}</button>
      ))}
    </div>
  )
}

function Editor({ s, subscribers, configured, onClose, onSaved }: { s: Sc; subscribers: number; configured: boolean; onClose: () => void; onSaved: (id: string, fr: Copy, en: Copy) => void }) {
  const [lang, setLang] = useState<"fr" | "en">("fr")
  const [c, setC] = useState<{ fr: Copy; en: Copy }>({ fr: s.fr, en: s.en })
  const [html, setHtml] = useState("")
  const [to, setTo] = useState("")
  const [busy, setBusy] = useState("")
  const [aud, setAud] = useState<Aud>("orders")
  const [orders, setOrders] = useState<Order[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [segment, setSegment] = useState("risk")
  const [one, setOne] = useState("")
  const situation = s.kind === "situation"

  useEffect(() => {
    if (!situation) return
    api.get<{ orders: Order[] }>("/api/admin/orders?status=all").then((r) => setOrders(r.orders.filter((o) => o.email))).catch(() => {})
  }, [situation])

  useEffect(() => {
    const t = setTimeout(() => {
      api.post<{ html: string }>("/api/admin/emails/scenarios", { action: "preview", id: s.id, lang, fr: c.fr, en: c.en }).then((r) => setHtml(r.html)).catch(() => {})
    }, 400)
    return () => clearTimeout(t)
  }, [c, lang, s.id])

  const set = (k: keyof Copy, v: string) => setC((p) => ({ ...p, [lang]: { ...p[lang], [k]: v } }))
  const cur = c[lang]

  async function save() {
    setBusy("save")
    try { await api.put("/api/admin/emails/scenarios", { id: s.id, fr: c.fr, en: c.en }); onSaved(s.id, c.fr, c.en); notify.success("Enregistré") } catch (e) { notify.error(errorMessage(e)) } finally { setBusy("") }
  }
  async function test() {
    setBusy("test")
    try { await api.post("/api/admin/emails/scenarios", { action: "test", id: s.id, lang, to, fr: c.fr, en: c.en }); notify.success("Test envoyé") } catch (e) { notify.error(errorMessage(e)) } finally { setBusy("") }
  }
  async function send() {
    const audience = aud === "orders" ? { type: "orders", ids: picked } : aud === "subscribers" ? { type: "subscribers" } : aud === "segment" ? { type: "segment", segment } : { type: "email", email: one }
    const who = aud === "orders" ? `${picked.length} commande(s)` : aud === "subscribers" ? `${subscribers} inscrit(s)` : aud === "segment" ? `le groupe « ${SEGMENTS.find(([k]) => k === segment)?.[1]} »` : one
    if (!window.confirm(`Envoyer « ${cur.subject} » à ${who} ? Impossible d'annuler.`)) return
    setBusy("send")
    try {
      await api.put("/api/admin/emails/scenarios", { id: s.id, fr: c.fr, en: c.en })
      const r = await api.post<{ sent: number }>("/api/admin/emails/scenarios", { action: "send", id: s.id, fr: c.fr, en: c.en, audience })
      notify.success(`Envoyé à ${r.sent} personne(s)`)
    } catch (e) { notify.error(errorMessage(e)) } finally { setBusy("") }
  }

  const [Icon, tone] = ICON[s.id] ?? [Mail, "gray" as TileTone]
  const canSend = configured && !busy && !!cur.subject.trim() && (aud !== "orders" || picked.length > 0) && (aud !== "email" || one.includes("@"))

  return (
    <div className="mt-6 rounded-3xl border border-[#e9e5df] bg-[#faf8f5] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <IconTile icon={Icon} tone={tone} size={34} />
        <div className="flex-1"><p className="font-medium">{s.label}</p><p className="text-xs text-[#7a756d]">{s.when}</p></div>
        <button type="button" aria-label="Fermer" onClick={onClose} className="rounded-full p-2 hover:bg-[#171717]/[0.06]"><X size={18} /></button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <Seg value={lang} opts={[["fr", "Français"], ["en", "English"]]} onChange={setLang} />
          <div><span className={label}>Objet</span><input className={field} value={cur.subject} onChange={(e) => set("subject", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>Étiquette</span><input className={field} value={cur.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} /></div>
            <div><span className={label}>Titre</span><input className={field} value={cur.title} onChange={(e) => set("title", e.target.value)} /></div>
          </div>
          <div><span className={label}>Texte</span><textarea className={field} rows={7} value={cur.body} onChange={(e) => set("body", e.target.value)} />
            <p className="mt-1 text-xs text-[#9a948a]">{`{prenom}`}, {`{commande}`} et {`{suivi}`} sont remplacés pour chaque client.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>Bouton</span><input className={field} value={cur.cta} onChange={(e) => set("cta", e.target.value)} placeholder="Vide = pas de bouton" /></div>
            <div><span className={label}>Lien du bouton</span><input className={field} value={cur.url} onChange={(e) => set("url", e.target.value)} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminButton icon={Save} variant={situation ? "secondary" : "primary"} onClick={save} disabled={!!busy}>Enregistrer</AdminButton>
            <button type="button" className="text-sm underline" onClick={() => setC({ fr: s.defaults.fr, en: s.defaults.en })}>Remettre le texte d'origine</button>
          </div>

          <div className="border-t border-[#e9e5df] pt-3">
            <span className={label}>Envoyer un test à</span>
            <div className="flex gap-2"><input className={field} type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="ton@email.com" /><AdminButton icon={Mail} onClick={test} disabled={!configured || !!busy || !to}>Test</AdminButton></div>
          </div>

          {situation && (
            <div className="space-y-3 border-t border-[#e9e5df] pt-3">
              <span className={label}>Envoyer à qui ?</span>
              <Seg value={aud} opts={[["orders", "Des commandes"], ["subscribers", `Inscrits (${subscribers})`], ["segment", "Un groupe"], ["email", "Une adresse"]]} onChange={setAud} />
              {aud === "orders" && (
                <div className="max-h-56 overflow-y-auto rounded-xl bg-white ring-1 ring-[#e0dbd3]">
                  {orders.length === 0 && <p className="p-3 text-sm text-[#9a948a]">Aucune commande.</p>}
                  {orders.map((o) => (
                    <label key={o.id} className="flex cursor-pointer items-center gap-3 border-b border-[#f0ece5] px-3 py-2 text-sm last:border-0">
                      <input type="checkbox" checked={picked.includes(o.id)} onChange={() => setPicked((p) => (p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id]))} />
                      <span className="min-w-0 flex-1 truncate">{o.customerName ?? o.email}</span>
                      <span className="text-xs text-[#9a948a]">{formatDate(o.createdAt)}</span>
                    </label>
                  ))}
                </div>
              )}
              {aud === "segment" && <Seg value={segment} opts={SEGMENTS as [string, string][]} onChange={setSegment} />}
              {aud === "email" && <input className={field} type="email" value={one} onChange={(e) => setOne(e.target.value)} placeholder="client@email.com" />}
              <AdminButton icon={Send} variant="primary" onClick={send} disabled={!canSend}>{busy === "send" ? "Envoi…" : "Envoyer"}</AdminButton>
            </div>
          )}
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="flex justify-center rounded-2xl bg-[#d9d7d1] p-3"><iframe title="Aperçu" srcDoc={html} className="h-[640px] w-full max-w-[390px] bg-[#e8e7e3]" /></div>
        </div>
      </div>
    </div>
  )
}

function Card({ s, children, onClick, href }: { s: { id: string; label: string; when: string; kind?: string }; children?: React.ReactNode; onClick?: () => void; href?: string }) {
  const [Icon, tone] = ICON[s.id] ?? [Mail, "gray" as TileTone]
  const body = (
    <>
      <IconTile icon={Icon} tone={tone} size={34} />
      <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{s.label}</span><span className="block text-xs text-[#7a756d]">{s.when}</span></span>
      {children}
    </>
  )
  const cls = "flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-[#e9e5df] transition hover:ring-[#171717]/40"
  if (href) return <Link href={href} style={{ color: "inherit" }} className={cls}>{body}</Link>
  return onClick ? <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === "Enter" && onClick()} className={`${cls} cursor-pointer`}>{body}</div> : <div className={`${cls} opacity-50`}>{body}</div>
}

export default function EmailsHub() {
  const [data, setData] = useState<{ configured: boolean; subscribers: number; scenarios: Sc[] } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [err, setErr] = useState("")

  useEffect(() => { api.get<typeof data>("/api/admin/emails/scenarios").then(setData).catch((e) => setErr(errorMessage(e))) }, [])
  const by = (k: Sc["kind"]) => useMemo(() => (data?.scenarios ?? []).filter((s) => s.kind === k), [data, k]) // eslint-disable-line react-hooks/rules-of-hooks
  const autos = by("auto"), sits = by("situation"), camps = by("campaign"), soon = by("soon")
  const cur = data?.scenarios.find((s) => s.id === open)

  async function toggle(s: Sc, enabled: boolean) {
    setData((d) => d && { ...d, scenarios: d.scenarios.map((x) => (x.id === s.id ? { ...x, enabled } : x)) })
    try { await api.put("/api/admin/emails/scenarios", { id: s.id, enabled }) } catch (e) { notify.error(errorMessage(e)); setData((d) => d && { ...d, scenarios: d.scenarios.map((x) => (x.id === s.id ? { ...x, enabled: !enabled } : x)) }) }
  }

  return (
    <>
      <PageHeader title="Mails" description="Tous les e-mails de FYSU au même endroit : ce qui part tout seul, ce que tu envoies quand ça se passe mal, et les campagnes." />
      {err && <p className="mb-4 rounded-xl bg-[#fdeeee] p-3 text-sm text-[#9b1c1c]">{err}</p>}
      {data && !data.configured && <p className="mb-4 rounded-xl bg-[#fff6e5] p-3 text-sm text-[#7a5200]">Resend n'est pas branché : aucun envoi possible pour l'instant.</p>}

      <Panel title="Automatiques" description="Partent tout seuls. Coupe l'interrupteur pour arrêter.">
        <div className="grid gap-2 sm:grid-cols-2">
          <Card s={{ id: "order", label: "Confirmation de commande", when: "Juste après chaque paiement" }} href="/admin/emails/commande" />
          {autos.map((s) => (
            <Card key={s.id} s={s} onClick={() => setOpen(s.id)}>
              <span onClick={(e) => e.stopPropagation()}><Switch on={s.enabled} onChange={(v) => toggle(s, v)} label={`Activer ${s.label}`} /></span>
            </Card>
          ))}
          {soon.map((s) => <Card key={s.id} s={{ ...s, when: `${s.when} · bientôt` }} />)}
        </div>
      </Panel>

      <Panel title="Quand ça se passe mal" description="Tu choisis qui reçoit : des commandes précises, les inscrits, un groupe de clients." className="mt-4">
        <div className="grid gap-2 sm:grid-cols-2">{sits.map((s) => <Card key={s.id} s={s} onClick={() => setOpen(s.id)} />)}</div>
      </Panel>

      <Panel title="Campagnes" description="Se préparent dans l'éditeur de newsletter, avec images et produits." className="mt-4">
        <div className="grid gap-2 sm:grid-cols-2">{camps.map((s) => <Card key={s.id} s={s} href="/admin/newsletter" />)}</div>
      </Panel>

      <p className="mt-4 text-xs text-[#9a948a]"><ShoppingBag size={12} className="mr-1 inline" />Les mails d'expédition partent quand tu passes une commande en « expédiée ».</p>

      {cur && data && <Editor key={cur.id} s={cur} subscribers={data.subscribers} configured={data.configured} onClose={() => setOpen(null)} onSaved={(id, fr, en) => setData((d) => d && { ...d, scenarios: d.scenarios.map((x) => (x.id === id ? { ...x, fr, en } : x)) })} />}
    </>
  )
}
