import { BUSINESS } from "@/lib/business"
import { esc, F, C, renderDoc, renderText, SITE_URL, type Block } from "@/lib/emailBlocks"

/* ====================================================================
   MAIL DE CONFIRMATION DE COMMANDE (confirmation + remerciement, envoyé juste après le paiement)
   Textes modifiables dans l'admin (table email_templates, clé « order_confirmation »), en français et en anglais.
   Règles : l'essentiel d'abord (récapitulatif lisible en vrai texte), ton chaleureux et sobre, aucune promesse
   qu'on ne tient pas, pas de vente forcée, réponse possible à ce mail.
   ==================================================================== */

export type OrderCopy = {
  subject: string
  eyebrow: string // + n° de commande
  title: string // {prenom} est remplacé
  intro: string
  next: string // ce qui se passe ensuite
  signoff: string
}

export const DEFAULT_ORDER_COPY: Record<"fr" | "en", OrderCopy> = {
  fr: {
    subject: "Ta commande FYSU est confirmée",
    eyebrow: "Commande",
    title: "Merci, {prenom}.",
    intro: "Ta commande est bien confirmée. Chaque pièce est préparée avec soin avant de partir chez toi.",
    next: "Une question, un ajustement d'adresse ? Réponds simplement à cet e-mail, nous lisons chaque message.",
    signoff: "À très vite,\nL'équipe FYSU",
  },
  en: {
    subject: "Your FYSU order is confirmed",
    eyebrow: "Order",
    title: "Thank you, {prenom}.",
    intro: "Your order is confirmed. Every piece is prepared with care before it leaves for you.",
    next: "A question, or need to change your address? Simply reply to this email, we read every message.",
    signoff: "Speak soon,\nThe FYSU team",
  },
}

export type OrderLine = { name: string; detail: string; quantity: number; imageUrl?: string; url?: string; unit?: number }
export type OrderData = {
  id: string
  firstName: string
  lines: OrderLine[]
  total: number // en euros
  currency: string
  shipTo: string[] // lignes d'adresse
}

export const langForCountry = (country?: string | null): "fr" | "en" =>
  ["BE", "FR", "LU", "CH", "MC", "CA"].includes((country || "").toUpperCase()) ? "fr" : "en"

const eyebrow = `font-family:${F.mono};font-size:11px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:${C.soft};`
const fmt = (n: number, cur: string) => `${Number.isInteger(n) ? n : n.toFixed(2)} ${cur.toUpperCase()}`

export function renderOrderEmail(copy: OrderCopy, d: OrderData, lang: "fr" | "en"): { subject: string; html: string; text: string } {
  const L = lang === "fr" ? { total: "Total payé", ship: "Livraison", qty: "Qté" } : { total: "Total paid", ship: "Shipping to", qty: "Qty" }
  const short = d.id.slice(0, 8).toUpperCase()
  const blocks: Block[] = [
    { type: "title", eyebrow: `${copy.eyebrow} N° ${short}`, title: copy.title.replace("{prenom}", d.firstName || "").replace(/\s+([.,!])/g, "$1") },
    { type: "text", text: copy.intro },
  ]
  // le récapitulatif : du vrai texte, jamais dans une image
  const lines = d.lines
    .map(
      (l) => `<tr>
<td width="84" valign="top" style="padding:14px 0;border-top:1px solid ${C.line};">${l.imageUrl ? `<img src="${esc(l.imageUrl)}" alt="${esc(l.name)}" width="72" style="display:block;width:72px;height:auto;border:0;background:${C.paper};">` : ""}</td>
<td valign="top" style="padding:14px 12px;border-top:1px solid ${C.line};font-family:${F.sans};font-size:14px;line-height:1.5;color:${C.ink};">
<span style="font-weight:500;">${esc(l.name)}</span><br><span style="${eyebrow}">${esc(l.detail)} · ${L.qty} ${l.quantity}</span></td>
<td valign="top" align="right" style="padding:14px 0;border-top:1px solid ${C.line};font-family:${F.mono};font-size:12px;letter-spacing:0.06em;color:${C.ink};white-space:nowrap;">${l.unit != null ? esc(fmt(l.unit * l.quantity, d.currency)) : ""}</td></tr>`
    )
    .join("")
  const summary = `<tr><td style="padding:10px 28px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${lines}
<tr><td colspan="2" style="padding:16px 0 0;border-top:1px solid ${C.ink};${eyebrow}color:${C.ink};">${L.total}</td>
<td align="right" style="padding:16px 0 0;border-top:1px solid ${C.ink};font-family:${F.mono};font-size:14px;color:${C.ink};white-space:nowrap;">${esc(fmt(d.total, d.currency))}</td></tr></table></td></tr>`
  const ship = d.shipTo.length
    ? `<tr><td style="padding:0 28px 26px;"><div style="${eyebrow}padding:0 0 8px;">${L.ship}</div><div style="font-family:${F.sans};font-size:14px;line-height:1.65;font-weight:300;color:${C.ink};">${d.shipTo.map(esc).join("<br>")}</div></td></tr>`
    : ""
  const all: Block[] = [
    ...blocks,
    { type: "raw", html: summary + ship },
    { type: "divider" },
    { type: "text", text: copy.next },
    { type: "text", text: copy.signoff },
  ]
  const finalHtml = renderDoc({ preheader: copy.intro, blocks: all, business: BUSINESS })
  const text = `${renderText(blocks)}\n\n${d.lines.map((l) => `- ${l.name} (${l.detail}) x${l.quantity}`).join("\n")}\n${L.total} : ${fmt(d.total, d.currency)}\n${d.shipTo.length ? `\n${L.ship} :\n${d.shipTo.join("\n")}\n` : ""}\n${copy.next}\n\n${copy.signoff}`
  return { subject: copy.subject, html: finalHtml, text }
}

export const SAMPLE_ORDER: OrderData = {
  id: "a1b2c3d4-0000-0000-0000-000000000000",
  firstName: "David",
  lines: [
    { name: "The Regular Jeans", detail: "W32 · Mid Blue", quantity: 1, unit: 170, imageUrl: `${SITE_URL}/images/sg-pants.png` },
    { name: "Heavy Wool Sweater", detail: "M · Charcoal", quantity: 1, unit: 190, imageUrl: `${SITE_URL}/images/sg-jacket.png` },
  ],
  total: 360,
  currency: "eur",
  shipTo: ["David Djoko Bamela", "Rue de Trèves 74", "1040 Bruxelles", "BE"],
}
