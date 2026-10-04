"use client"

import { useEffect, useState } from "react"
import { useLocale } from "next-intl"
import type { ProductType } from "@/types/product"
import { getAvailabilityCopy } from "@/lib/availability"

/* ====================================================================
   « ME PRÉVENIR SI DE RETOUR » pour une taille (ou une couleur) épuisée
   d'un produit qui reste en vente. La demande arrive dans l'admin > Demandes,
   avec la taille et la couleur demandées.
   ==================================================================== */

const FIELD =
  "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-black"

export default function SizeNotify({
  product,
  sizes,
  colorName,
}: {
  product: ProductType
  sizes: string[] // tailles épuisées parmi lesquelles choisir (vide = pas de choix de taille)
  colorName?: string | null
}) {
  const locale = useLocale()
  const copy = getAvailabilityCopy(locale)

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [size, setSize] = useState(sizes[0] ?? "")
  const [website, setWebsite] = useState("") // piège anti-robots : doit rester vide
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // si la couleur change, la liste des tailles change : on garde un choix valide
  useEffect(() => {
    if (!sizes.includes(size)) setSize(sizes[0] ?? "")
  }, [sizes, size])

  // e-mail pré-rempli pour un client connecté
  useEffect(() => {
    if (!open || email) return
    fetch("/api/auth/callback?me=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.email) setEmail((cur) => cur || d.user.email)
      })
      .catch(() => {})
  }, [open, email])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(copy.invalidEmail)
      return
    }

    // le message est lu par toi dans l'admin (en français)
    const parts = [size ? `Taille : ${size}` : "", colorName ? `Couleur : ${colorName}` : ""].filter(Boolean)

    setSending(true)
    try {
      const res = await fetch("/api/product-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          kind: "notify",
          email: email.trim(),
          message: parts.join(" · "),
          locale,
          website,
        }),
      })
      if (!res.ok) throw new Error("request failed")
      setDone(true)
    } catch {
      setError(copy.error)
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return <p className="rounded-md border border-neutral-300 px-4 py-3 text-sm">{copy.thanksNotify}</p>
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full cursor-pointer py-1 text-center text-sm text-foreground underline hover:text-foreground/60"
      >
        {copy.notifyBackCta}
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {sizes.length > 1 && (
        <select className={FIELD} value={size} onChange={(e) => setSize(e.target.value)} aria-label="Size">
          {sizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      <input
        className={FIELD}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={copy.emailLabel}
        aria-label={copy.emailLabel}
        maxLength={254}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={sending}
          className="w-full cursor-pointer bg-black py-3 text-sm font-medium tracking-wide text-white transition-colors duration-300 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? copy.sending : copy.send}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          className="cursor-pointer whitespace-nowrap border border-neutral-300 px-4 text-sm hover:border-black"
        >
          {copy.cancel}
        </button>
      </div>
    </form>
  )
}
