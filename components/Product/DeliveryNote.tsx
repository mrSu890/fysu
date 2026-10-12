"use client"

import { useEffect, useState } from "react"
import { useLocale } from "next-intl"
import { deliveryDays } from "@/lib/shipping"
import { getStoredCountry } from "@/lib/regions"

/* Deux lignes discrètes sous le bouton d'achat : date de livraison estimée selon le pays choisi,
   retours gratuits, livraison offerte. Les règles viennent de lib/shipping.ts et des pages légales. */

function addBusinessDays(from: Date, n: number) {
  const d = new Date(from)
  let left = n
  while (left > 0) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) left--
  }
  return d
}

export default function DeliveryNote({ preorder = false }: { preorder?: boolean }) {
  const locale = useLocale()
  const fr = locale.startsWith("fr")
  const [country, setCountry] = useState<string | null>(null)

  useEffect(() => {
    const read = () => setCountry(getStoredCountry())
    read()
    window.addEventListener("region-done", read)
    return () => window.removeEventListener("region-done", read)
  }, [])

  const days = !preorder ? deliveryDays(country) : null
  let line1: string | null = null
  if (days) {
    const now = new Date()
    const fmt = (d: Date) => d.toLocaleDateString(fr ? "fr-BE" : "en-GB", { day: "numeric", month: "short" })
    const a = fmt(addBusinessDays(now, days.min))
    const b = fmt(addBusinessDays(now, days.max))
    line1 = fr ? `Livraison estimée du ${a} au ${b}` : `Estimated delivery ${a} – ${b}`
  }
  const line2 = fr
    ? "Retours gratuits sous 14 jours · Livraison offerte dès 150 €"
    : "Free returns within 14 days · Free delivery from €150"

  return (
    <div className="font-info space-y-1 text-center text-[11px] font-light leading-relaxed tracking-[0.02em] opacity-60">
      {line1 && <p>{line1}</p>}
      <p>{line2}</p>
    </div>
  )
}
