"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import type { ProductType } from "@/types/product"
import {
  formatReleaseDate,
  getAvailabilityCopy,
  type AvailabilityId,
  type RequestKind,
} from "@/lib/availability"

/* ====================================================================
   BLOC AFFICHÉ À LA PLACE DU BOUTON D'ACHAT quand le produit
   n'est pas achetable : me prévenir, devis, à venir, épuisé.
   ==================================================================== */

const FIELD =
  "w-full rounded-md border border-foreground/25 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-foreground"

const BUTTON_DARK =
  "w-full bg-foreground py-3 text-sm font-medium tracking-wide text-background transition duration-300 hover:opacity-85 cursor-pointer"

export default function AvailabilityBlock({
  product,
  mode,
}: {
  product: ProductType
  mode: AvailabilityId
}) {
  const locale = useLocale()
  const copy = getAvailabilityCopy(locale)

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [website, setWebsite] = useState("") // piège anti-robots : doit rester vide
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isQuote = mode === "quote"
  const kind: RequestKind = isQuote ? "quote" : "notify"
  const showStatus = mode === "coming_soon" || mode === "sold_out"
  const primaryAction = mode === "notify" || mode === "quote"

  const actionLabel = isQuote
    ? copy.quoteCta
    : mode === "sold_out"
      ? copy.notifyBackCta
      : copy.notifyCta

  const releaseText =
    mode === "coming_soon" && product.release_date
      ? copy.availableOn.replace("{date}", formatReleaseDate(product.release_date, locale))
      : ""

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(copy.invalidEmail)
      return
    }
    if (isQuote && message.trim().length < 3) {
      setError(copy.messageRequired)
      return
    }

    setSending(true)
    try {
      const res = await fetch("/api/product-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          kind,
          email: email.trim(),
          name: name.trim(),
          message: message.trim(),
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

  return (
    <div className="w-full space-y-3">
      {/* État : bientôt disponible / épuisé */}
      {showStatus && (
        <>
          <div
            aria-disabled="true"
            className="w-full cursor-not-allowed border border-foreground/25 py-3 text-center text-sm font-medium tracking-wide text-foreground/50"
          >
            {mode === "sold_out" ? copy.soldOut : copy.comingSoon}
          </div>
          {releaseText && <p className="text-center text-xs text-foreground/60">{releaseText}</p>}
        </>
      )}

      {/* Message de remerciement */}
      {done && (
        <p className="rounded-md border border-foreground/25 px-4 py-3 text-sm">
          {isQuote ? copy.thanksQuote : copy.thanksNotify}
        </p>
      )}

      {/* Bouton d'action (ouvre le formulaire) */}
      {!done && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            primaryAction
              ? BUTTON_DARK
              : "w-full cursor-pointer py-1 text-center text-sm underline text-foreground hover:text-foreground/60"
          }
        >
          {actionLabel}
        </button>
      )}

      {/* Formulaire */}
      {!done && open && (
        <form onSubmit={submit} className="space-y-3">
          {/* champ piège pour les robots */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          {isQuote && (
            <input
              className={FIELD}
              placeholder={copy.nameLabel}
              aria-label={copy.nameLabel}
              autoComplete="name"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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

          {isQuote && (
            <textarea
              className={FIELD}
              rows={4}
              placeholder={copy.messagePlaceholder}
              aria-label={copy.messageLabel}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={sending}
              className={`${BUTTON_DARK} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {sending ? copy.sending : copy.send}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
              className="cursor-pointer whitespace-nowrap border border-foreground/25 px-4 text-sm hover:border-foreground"
            >
              {copy.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
