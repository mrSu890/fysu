/* ====================================================================
   REÇU DE COMMANDE : données, textes et petites fonctions partagées
   (utilisé par l'animation du reçu et par le PDF)
   Textes : anglais et français ; les autres langues du site affichent l'anglais.
   ==================================================================== */

export type ReceiptLine = { d: string; q: number; a: number } // description, quantité, montant en centimes

export type ReceiptData = {
  number: string
  created: number // millisecondes
  currency: string
  lines: ReceiptLine[]
  shipping: number | null // centimes ; null = pas de ligne livraison
  other: number // centimes non détaillés (ex. livraison d'un paiement Apple Pay)
  discount: number
  tax: number
  total: number
  method: string | null // ex. "VISA *4242"
  name: string | null
}

export type ReceiptLang = "en" | "fr"

export const COPY: Record<ReceiptLang, Record<string, string>> = {
  en: {
    title: "Order receipt",
    receipt: "Receipt",
    date: "Date",
    customer: "Customer",
    shipping: "Shipping",
    free: "FREE",
    other: "Shipping & other",
    discount: "Discount",
    vat: "Incl. VAT",
    total: "Total",
    paidBy: "Paid by",
    paid: "Paid",
    approved: "Approved",
    thanks: "Thank you for choosing FYSU.",
    printing: "Printing your receipt…",
    ready: "Your receipt is ready",
    download: "Download PDF",
    stampTop: "THANK YOU · PAYMENT RECEIVED · ",
  },
  fr: {
    title: "Reçu de commande",
    receipt: "Reçu",
    date: "Date",
    customer: "Client",
    shipping: "Livraison",
    free: "OFFERTE",
    other: "Livraison et autres",
    discount: "Réduction",
    vat: "TVA incluse",
    total: "Total",
    paidBy: "Payé par",
    paid: "Payé",
    approved: "Accepté",
    thanks: "Merci d'avoir choisi FYSU.",
    printing: "Impression de votre reçu…",
    ready: "Votre reçu est prêt",
    download: "Télécharger en PDF",
    stampTop: "MERCI · PAIEMENT REÇU · ",
  },
}

export const receiptLang = (locale: string): ReceiptLang => (locale === "fr" ? "fr" : "en")

const SYMBOLS: Record<string, string> = { eur: "€", usd: "$", gbp: "£" }

export function money(cents: number, currency: string) {
  const sym = SYMBOLS[currency.toLowerCase()] ?? `${currency.toUpperCase()} `
  return `${sym}${(cents / 100).toFixed(2)}`
}

export function dateText(ms: number, locale: string) {
  const d = new Date(ms)
  const loc = locale === "fr" ? "fr-FR" : "en-GB"
  const day = d
    .toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" })
    .replace(/\./g, "")
    .toUpperCase()
  const time = d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })
  return `${day} · ${time}`
}

// numéro lisible : FY-YYMMDD-XXXX
export function makeNumber(ms: number, id: string) {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, "0")
  const tail = (id || "0000").replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase().padStart(4, "0")
  return `FY-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${tail}`
}

// largeurs alternées barre / espace du code-barres décoratif (toujours le même pour un même numéro)
export function barcodeBars(seed: string): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let x = h >>> 0
  const out: number[] = []
  for (let i = 0; i < 49; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0
    out.push(1 + ((x >>> 24) % 3))
  }
  return out
}

// reconstruit un reçu depuis la réponse du serveur (secours si le serveur n'a pas envoyé de reçu)
export function buildReceipt(session: any): ReceiptData {
  const created = typeof session?.created === "number" ? session.created * 1000 : Date.now()
  const lines: ReceiptLine[] = (session?.line_items?.data ?? []).map((i: any) => ({
    d: String(i.description ?? ""),
    q: Number(i.quantity ?? 1),
    a: Number(i.amount_subtotal ?? i.amount_total ?? 0),
  }))
  const total = Number(session?.amount_total ?? 0)
  const sum = lines.reduce((s, l) => s + l.a, 0)
  return {
    number: makeNumber(created, String(session?.id ?? "")),
    created,
    currency: String(session?.currency ?? "eur"),
    lines,
    shipping: null,
    other: Math.max(0, total - sum),
    discount: 0,
    tax: 0,
    total,
    method: null,
    name: session?.customer_details?.name ?? null,
  }
}
