"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"

const TX = {
  fr: { title: "Tes préférences", hint: "Choisis ce que tu veux recevoir de FYSU.", topics: { collections: "Nouvelles collections", private: "Ventes privées et accès anticipé", events: "Événements" }, save: "Enregistrer", saved: "C'est enregistré.", stop: "Me désinscrire de tout", bad: "Lien invalide." },
  en: { title: "Your preferences", hint: "Choose what you want to receive from FYSU.", topics: { collections: "New collections", private: "Private sales and early access", events: "Events" }, save: "Save", saved: "Saved.", stop: "Unsubscribe from everything", bad: "Invalid link." },
}

function Form() {
  const t = useLocale() === "fr" ? TX.fr : TX.en
  const tok = useSearchParams().get("t") ?? ""
  const [p, setP] = useState<Record<string, boolean> | null>(null)
  const [bad, setBad] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/preferences?t=${encodeURIComponent(tok)}`).then(async (r) => { if (!r.ok) throw new Error(); setP((await r.json()).prefs) }).catch(() => setBad(true))
  }, [tok])

  async function save() {
    const r = await fetch("/api/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: tok, prefs: p }) })
    setSaved(r.ok)
  }

  return (
    <main className="mx-auto w-11/12 max-w-md pb-24 pt-32 sm:pt-44">
      <h1 className="font-dior text-4xl font-bold tracking-tight">{t.title}</h1>
      {bad ? <p className="mt-8 text-sm font-light">{t.bad}</p> : !p ? null : (
        <>
          <p className="mt-4 text-sm font-light text-foreground/60">{t.hint}</p>
          <div className="mt-8 space-y-5">
            {(Object.keys(t.topics) as (keyof typeof t.topics)[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center gap-4 text-sm font-light">
                <input type="checkbox" checked={p[k] !== false} onChange={(e) => { setP({ ...p, [k]: e.target.checked }); setSaved(false) }} className="h-5 w-5" />
                {t.topics[k]}
              </label>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <button type="button" onClick={save} className="text-[11px] font-light uppercase tracking-[0.18em] underline underline-offset-4">{t.save}</button>
            <a href={`/api/newsletter/unsubscribe?t=${encodeURIComponent(tok)}`} className="text-[11px] font-light uppercase tracking-[0.18em] opacity-50">{t.stop}</a>
          </div>
          {saved && <p className="mt-4 text-sm font-light">{t.saved}</p>}
        </>
      )}
    </main>
  )
}

export default function PreferencesPage() {
  return <Suspense><Form /></Suspense>
}
