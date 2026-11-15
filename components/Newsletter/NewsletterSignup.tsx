"use client"

import { useState } from "react"
import { useLocale } from "next-intl"

const TX = {
  fr: { title: "Newsletter", ph: "Ton e-mail", name: "Ton prénom (facultatif)", btn: "S'inscrire", consent: "J'accepte de recevoir les e-mails de FYSU (désinscription possible à tout moment).", ok: "Merci, tu es inscrit.", bad: "Adresse invalide ou erreur, réessaie." },
  en: { title: "Newsletter", ph: "Your email", name: "Your first name (optional)", btn: "Subscribe", consent: "I agree to receive emails from FYSU (unsubscribe anytime).", ok: "Thank you, you're subscribed.", bad: "Invalid address or error, try again." },
}

export default function NewsletterSignup({ style }: { style?: React.CSSProperties }) {
  const locale = useLocale()
  const t = (locale === "fr" ? TX.fr : TX.en)
  const [email, setEmail] = useState("")
  const [first, setFirst] = useState("")
  const [consent, setConsent] = useState(false)
  const [trap, setTrap] = useState("")
  const [state, setState] = useState<"idle" | "busy" | "ok" | "bad">("idle")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === "busy") return
    setState("busy")
    try {
      const r = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, firstName: first, locale, consent, website: trap }) })
      setState(r.ok ? "ok" : "bad")
      if (r.ok) setEmail("")
    } catch {
      setState("bad")
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md" style={style}>
      <h2 className="font-info mb-4 text-[11px] font-light uppercase tracking-[0.06em]">{t.title}</h2>
      {state === "ok" ? (
        <p className="text-sm font-light">{t.ok}</p>
      ) : (
        <>
          <input
            type="text"
            autoComplete="given-name"
            maxLength={40}
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder={t.name}
            aria-label={t.name}
            className="mb-3 w-full border-b border-current/40 bg-transparent py-1.5 text-sm font-light outline-none placeholder:opacity-50"
          />
          <div className="flex items-center gap-2 border-b border-current pb-1">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.ph}
              aria-label={t.ph}
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm font-light outline-none placeholder:opacity-50"
            />
            <input type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} className="hidden" aria-hidden="true" />
            <button type="submit" disabled={!consent || state === "busy"} className="font-info cursor-pointer text-[11px] font-light uppercase tracking-[0.12em] disabled:opacity-40">
              {t.btn}
            </button>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] font-light leading-snug opacity-70">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span>{t.consent}</span>
          </label>
          {state === "bad" && <p className="mt-2 text-[11px] font-light">{t.bad}</p>}
        </>
      )}
    </form>
  )
}
