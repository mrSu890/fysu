"use client"

import { useEffect, useMemo, useState } from "react"
import { Mail, Send } from "lucide-react"
import { AdminButton, PageHeader, Panel } from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"
import { resizeImage } from "@/lib/imageTools"
import { renderEmail, type Campaign } from "@/lib/newsletter"

const field = "w-full rounded-xl bg-white px-3 py-2.5 text-[15px] ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]"
const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#6b6760]"

export default function NewsletterAdmin() {
  const [info, setInfo] = useState<{ active: number; configured: boolean } | null>(null)
  const [err, setErr] = useState("")
  const [c, setC] = useState<Campaign>({ subject: "", preheader: "", title: "", body: "", imageUrl: "", ctaLabel: "Découvrir", ctaUrl: "https://f-y-s-u.com" })
  const [testTo, setTestTo] = useState("")
  const [busy, setBusy] = useState<"" | "test" | "send" | "img">("")

  useEffect(() => {
    api.get("/api/admin/newsletter").then(setInfo).catch((e) => setErr(errorMessage(e)))
  }, [])

  const set = (k: keyof Campaign, v: string) => setC((p) => ({ ...p, [k]: v }))
  const preview = useMemo(() => renderEmail(c, "#").html, [c])

  async function upload(file: File) {
    setBusy("img")
    try {
      const small = await resizeImage(file)
      const form = new FormData()
      form.append("file", small)
      form.append("bucket", "story-media")
      const r = await api.upload<{ url: string }>("/api/admin/stories/upload", form)
      set("imageUrl", r.url)
    } catch (e) {
      notify.error(errorMessage(e))
    } finally {
      setBusy("")
    }
  }

  async function test() {
    setBusy("test")
    try {
      await api.post("/api/admin/newsletter", { action: "test", to: testTo, campaign: c })
      notify.success("Test envoyé")
    } catch (e) {
      notify.error(errorMessage(e))
    } finally {
      setBusy("")
    }
  }

  async function send() {
    if (!window.confirm(`Envoyer « ${c.subject} » à ${info?.active ?? 0} inscrit(s) ? Impossible d'annuler.`)) return
    setBusy("send")
    try {
      const r = await api.post<{ sent: number }>("/api/admin/newsletter", { action: "send", campaign: c })
      notify.success(`Envoyé à ${r.sent} inscrit(s)`)
    } catch (e) {
      notify.error(errorMessage(e))
    } finally {
      setBusy("")
    }
  }

  return (
    <div>
      <PageHeader title="Newsletter" description="Un seul modèle à la DA de FYSU : tu changes seulement le contenu à chaque campagne." />
      {err && <p className="mb-4 rounded-xl bg-[#fdeeee] p-3 text-sm text-[#9b1c1c]">{err}</p>}
      {info && !info.configured && (
        <p className="mb-4 rounded-xl bg-[#fff6e5] p-3 text-sm text-[#7a5200]">Resend n'est pas encore branché : les envois sont impossibles pour l'instant.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Contenu" description={info ? `${info.active} inscrit(s) actif(s)` : ""}>
          <div className="space-y-4">
            <div><span className={label}>Objet de l'e-mail</span><input className={field} value={c.subject} onChange={(e) => set("subject", e.target.value)} placeholder="SS27 est là" /></div>
            <div><span className={label}>Aperçu (court texte sous l'objet)</span><input className={field} value={c.preheader} onChange={(e) => set("preheader", e.target.value)} /></div>
            <div><span className={label}>Titre</span><input className={field} value={c.title} onChange={(e) => set("title", e.target.value)} /></div>
            <div><span className={label}>Texte (une ligne vide = nouveau paragraphe)</span><textarea className={field} rows={7} value={c.body} onChange={(e) => set("body", e.target.value)} /></div>
            <div>
              <span className={label}>Image</span>
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="text-sm" />
              {busy === "img" && <p className="mt-1 text-xs text-[#6b6760]">Envoi de l'image…</p>}
              {c.imageUrl && <button type="button" className="mt-1 block text-xs underline" onClick={() => set("imageUrl", "")}>Retirer l'image</button>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className={label}>Bouton</span><input className={field} value={c.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} /></div>
              <div><span className={label}>Lien du bouton</span><input className={field} value={c.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} /></div>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-[#e0dbd3] pt-5">
            <div><span className={label}>Envoyer un test à</span><input className={field} type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="ton@email.com" /></div>
            <div className="flex flex-wrap gap-2">
              <AdminButton icon={Mail} onClick={test} disabled={busy !== "" || !info?.configured}>Envoyer le test</AdminButton>
              <AdminButton icon={Send} variant="primary" onClick={send} disabled={busy !== "" || !info?.configured || !(info?.active > 0)}>
                {busy === "send" ? "Envoi…" : `Envoyer à tous (${info?.active ?? 0})`}
              </AdminButton>
            </div>
          </div>
        </Panel>

        <Panel title="Aperçu" padded={false}>
          <iframe title="Aperçu" srcDoc={preview} className="h-[720px] w-full rounded-b-2xl bg-[#efeeea]" />
        </Panel>
      </div>
    </div>
  )
}
