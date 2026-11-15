"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"
import { Star } from "lucide-react"

type Item = { id: number; name: string; image: string | null; done: boolean }

const TX = {
  fr: { title: "Ton avis", hint: "Note les pièces que tu as reçues. Un mot, même court, nous aide.", ph: "Ton avis (facultatif)", send: "Envoyer", thanks: "Merci, ton avis est envoyé.", done: "Déjà noté", bad: "Lien invalide ou expiré.", err: "Une erreur est survenue, réessaie." },
  en: { title: "Your review", hint: "Rate the pieces you received. A few words, even short, help us.", ph: "Your review (optional)", send: "Send", thanks: "Thank you, your review has been sent.", done: "Already rated", bad: "Invalid or expired link.", err: "Something went wrong, please try again." },
}

function Form() {
  const q = useSearchParams()
  const t = useLocale() === "fr" ? TX.fr : TX.en
  const o = q.get("o") ?? ""
  const tok = q.get("t") ?? ""
  const [items, setItems] = useState<Item[] | null>(null)
  const [bad, setBad] = useState(false)
  const [r, setR] = useState<Record<number, { rating: number; text: string }>>({})
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle")

  useEffect(() => {
    fetch(`/api/reviews?o=${encodeURIComponent(o)}&t=${encodeURIComponent(tok)}`).then(async (res) => { if (!res.ok) throw new Error(); setItems((await res.json()).items) }).catch(() => setBad(true))
  }, [o, tok])

  async function submit() {
    setState("busy")
    const reviews = Object.entries(r).filter(([, v]) => v.rating > 0).map(([id, v]) => ({ productId: Number(id), rating: v.rating, text: v.text }))
    try {
      const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: o, t: tok, reviews }) })
      setState(res.ok ? "ok" : "err")
    } catch { setState("err") }
  }

  return (
    <main className="mx-auto w-11/12 max-w-xl pb-24 pt-32 sm:pt-44">
      <h1 className="font-dior text-4xl font-bold tracking-tight">{t.title}</h1>
      {bad ? <p className="mt-8 text-sm font-light">{t.bad}</p> : state === "ok" ? <p className="mt-8 text-sm font-light">{t.thanks}</p> : !items ? null : (
        <>
          <p className="mt-4 text-sm font-light text-foreground/60">{t.hint}</p>
          <div className="mt-10 space-y-10">
            {items.map((it) => (
              <div key={it.id} className="flex gap-5">
                <div className="aspect-[3/4] w-20 shrink-0 bg-foreground/5">{it.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={it.image} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-light uppercase tracking-[0.18em]">{it.name}</p>
                  {it.done ? <p className="mt-3 text-sm font-light text-foreground/50">{t.done}</p> : (
                    <>
                      <div className="mt-3 flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" aria-label={`${n}`} onClick={() => setR((p) => ({ ...p, [it.id]: { rating: n, text: p[it.id]?.text ?? "" } }))} className="p-1">
                            <Star size={22} strokeWidth={1.3} className={(r[it.id]?.rating ?? 0) >= n ? "fill-current" : ""} />
                          </button>
                        ))}
                      </div>
                      <textarea rows={3} maxLength={800} placeholder={t.ph} value={r[it.id]?.text ?? ""} onChange={(e) => setR((p) => ({ ...p, [it.id]: { rating: p[it.id]?.rating ?? 0, text: e.target.value } }))} className="mt-3 w-full border-b border-foreground/30 bg-transparent py-2 text-sm font-light outline-none placeholder:opacity-50" />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button type="button" disabled={state === "busy" || !Object.values(r).some((v) => v.rating > 0)} onClick={submit} className="mt-10 text-[11px] font-light uppercase tracking-[0.18em] underline underline-offset-4 disabled:opacity-40">{t.send}</button>
          {state === "err" && <p className="mt-3 text-sm font-light">{t.err}</p>}
        </>
      )}
    </main>
  )
}

export default function ReviewPage() {
  return <Suspense><Form /></Suspense>
}
