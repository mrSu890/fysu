"use client"

import { useEffect, useState } from "react"
import { Mail, Save } from "lucide-react"
import { AdminButton, PageHeader, Panel } from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"
import { ProductPicker, uploadImage } from "@/components/Admin/Newsletter/shared"
import type { OrderCopy, OrderExtras } from "@/lib/orderEmail"

const field = "w-full rounded-xl bg-white px-3 py-2.5 text-[15px] ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]"
const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#6b6760]"
type Copy = Record<"fr" | "en", OrderCopy>

export default function OrderEmailsAdmin() {
  const [copy, setCopy] = useState<Copy | null>(null)
  const [defaults, setDefaults] = useState<Copy | null>(null)
  const [extras, setExtras] = useState<OrderExtras>({ heroUrl: "", heroAlt: "", discoverMode: "auto", discoverItems: [] })
  const [configured, setConfigured] = useState(false)
  const [lang, setLang] = useState<"fr" | "en">("fr")
  const [html, setHtml] = useState("")
  const [to, setTo] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get<{ copy: Copy; extras: OrderExtras; defaults: Copy; configured: boolean }>("/api/admin/emails").then((r) => { setCopy(r.copy); setExtras(r.extras); setDefaults(r.defaults); setConfigured(r.configured) }).catch((e) => notify.error(errorMessage(e)))
  }, [])

  useEffect(() => {
    if (!copy) return
    const t = setTimeout(() => api.post<{ html: string }>("/api/admin/emails", { action: "preview", lang, copy: copy[lang], extras }).then((r) => setHtml(r.html)).catch(() => {}), 300)
    return () => clearTimeout(t)
  }, [copy, lang, extras])

  if (!copy) return <div className="p-6 text-sm">Chargement…</div>
  const c = copy[lang]
  const set = (k: keyof OrderCopy, v: string) => setCopy({ ...copy, [lang]: { ...c, [k]: v } })

  async function save() {
    setBusy(true)
    try { await api.put("/api/admin/emails", { copy, extras }); notify.success("Enregistré") } catch (e) { notify.error(errorMessage(e)) } finally { setBusy(false) }
  }
  async function test() {
    setBusy(true)
    try { await api.post("/api/admin/emails", { action: "test", lang, copy: c, to, extras }); notify.success("Test envoyé") } catch (e) { notify.error(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <div>
      <PageHeader title="Mails de commande" description="Le mail de confirmation et de remerciement, envoyé automatiquement juste après chaque paiement. Le récapitulatif (articles, total, adresse) est ajouté tout seul." />
      <div className="mb-4 flex gap-2">
        {(["fr", "en"] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLang(l)} className={`rounded-full px-4 py-2 text-sm ${lang === l ? "bg-[#171717] text-white" : "bg-white ring-1 ring-[#e0dbd3]"}`}>{l === "fr" ? "Français (Belgique, France…)" : "English (autres pays)"}</button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Panel title="Textes">
            <div className="space-y-3">
              <div><span className={label}>Objet</span><input className={field} value={c.subject} onChange={(e) => set("subject", e.target.value)} /></div>
              <div><span className={label}>Petite étiquette (suivie du numéro de commande)</span><input className={field} value={c.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} /></div>
              <div><span className={label}>Titre ({"{prenom}"} = prénom du client)</span><input className={field} value={c.title} onChange={(e) => set("title", e.target.value)} /></div>
              <div><span className={label}>Introduction</span><textarea className={field} rows={3} value={c.intro} onChange={(e) => set("intro", e.target.value)} /></div>
              <div><span className={label}>Après le récapitulatif</span><textarea className={field} rows={3} value={c.next} onChange={(e) => set("next", e.target.value)} /></div>
              <div><span className={label}>Signature</span><textarea className={field} rows={2} value={c.signoff} onChange={(e) => set("signoff", e.target.value)} /></div>
              {defaults && <button type="button" className="text-xs underline" onClick={() => setCopy({ ...copy, [lang]: defaults[lang] })}>Remettre les textes d'origine</button>}
            </div>
          </Panel>
          <Panel title="Image de garde et découverte" description="Communs aux deux langues.">
            <div className="space-y-3">
              <div>
                <span className={label}>Image en haut du mail (facultative)</span>
                <input type="file" accept="image/*" className="text-sm" onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  try { setExtras({ ...extras, heroUrl: await uploadImage(f) }) } catch (er) { notify.error(errorMessage(er)) }
                }} />
                {extras.heroUrl && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={extras.heroUrl} alt="" className="mt-2 max-h-32 rounded" />
                    <button type="button" className="mt-1 block text-xs underline" onClick={() => setExtras({ ...extras, heroUrl: "" })}>Retirer l'image</button>
                  </>
                )}
              </div>
              <div>
                <span className={label}>Section « À découvrir » (produits sous le récapitulatif)</span>
                <select className={field} value={extras.discoverMode} onChange={(e) => setExtras({ ...extras, discoverMode: e.target.value as OrderExtras["discoverMode"] })}>
                  <option value="auto">Automatique : les 2 derniers produits (hors ceux achetés)</option>
                  <option value="manual">Je choisis les produits</option>
                  <option value="off">Aucune</option>
                </select>
              </div>
              {extras.discoverMode === "manual" && <ProductPicker items={extras.discoverItems} onChange={(items) => setExtras({ ...extras, discoverItems: items })} />}
              <div><span className={label}>Titre de la section</span><input className={field} value={c.discoverTitle} onChange={(e) => set("discoverTitle", e.target.value)} /></div>
              <div><span className={label}>Texte du bouton</span><input className={field} value={c.discoverCta} onChange={(e) => set("discoverCta", e.target.value)} /></div>
            </div>
          </Panel>

          <Panel title="Enregistrer et tester">
            <div className="space-y-3">
              <AdminButton icon={Save} variant="primary" onClick={save} disabled={busy}>Enregistrer</AdminButton>
              {!configured && <p className="text-sm text-[#7a5200]">Resend n'est pas branché : les envois sont impossibles.</p>}
              <div><span className={label}>Envoyer un test à</span><input className={field} type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="ton@email.com" /></div>
              <AdminButton icon={Mail} onClick={test} disabled={busy || !configured}>Envoyer le test</AdminButton>
            </div>
          </Panel>
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Panel title="Aperçu (commande d'exemple)" padded={false}>
            <div className="flex justify-center bg-[#d9d7d1] p-3">
              <iframe title="Aperçu" srcDoc={html} className="h-[760px] bg-[#e8e7e3]" style={{ width: 390, maxWidth: "100%" }} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
