import { LOGO_H, LOGO_HEX, LOGO_W } from "./receiptLogo"
import { COPY, barcodeBars, dateText, money as moneyRaw, type ReceiptData, type ReceiptLang } from "./receipt"

// « EUR 12.00 » dans le PDF : le symbole € n'est pas affiché de la même façon par tous les lecteurs de PDF
const money = (cents: number, currency: string) => moneyRaw(cents, currency).replace("€", "EUR ")

/* ====================================================================
   REÇU EN PDF
   Un petit PDF « ticket de caisse » (80 mm de large) fabriqué directement,
   sans bibliothèque : texte, traits, code-barres et tampon.
   ==================================================================== */

const W = 240 // largeur de la page (points)
const M = 22 // marge
const CW = 0.6 // largeur d'un caractère de la police Courier (× taille)

const INK = "0.1 0.1 0.1"
const SOFT = "0.45 0.45 0.45"
const GREEN = "0.082 0.278 0.2" // #154733

// texte compatible PDF (caractères Latin-1 + €) ; le reste devient « ? »
function norm(input: string) {
  const s = input
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
  let out = ""
  for (const ch of s) {
    const c = ch.codePointAt(0)!
    if ((c >= 32 && c < 127) || (c >= 160 && c <= 255) || ch === "€") out += ch
    else out += "?"
  }
  return out
}

function esc(s: string) {
  let out = ""
  for (const ch of s) {
    const c = ch.codePointAt(0)!
    if (ch === "(" || ch === ")" || ch === "\\") out += "\\" + ch
    else if (ch === "€") out += "\\200"
    else if (c >= 127) out += "\\" + c.toString(8).padStart(3, "0")
    else out += ch
  }
  return out
}

const n2 = (n: number) => n.toFixed(2)

function wrap(text: string, max: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    let word = w
    while (word.length > max) {
      if (cur) {
        lines.push(cur)
        cur = ""
      }
      lines.push(word.slice(0, max))
      word = word.slice(max)
    }
    if (!cur) cur = word
    else if ((cur + " " + word).length <= max) cur += " " + word
    else {
      lines.push(cur)
      cur = word
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : [""]
}

export function buildReceiptPdf(r: ReceiptData, lang: ReceiptLang, locale: string): Uint8Array {
  const c = COPY[lang]
  const ops: ((H: number) => string)[] = []
  let y = 34 // position courante depuis le haut

  const text = (
    x: number,
    base: number,
    s: string,
    size: number,
    font: "F1" | "F2" | "F3",
    color = INK,
    tc = 0
  ) => {
    const t = norm(s)
    ops.push((H) => `BT ${color} rg /${font} ${n2(size)} Tf ${n2(tc)} Tc ${n2(x)} ${n2(H - base)} Td (${esc(t)}) Tj ET`)
  }
  const width = (s: string, size: number, tc = 0) => norm(s).length * (size * CW + tc)
  const left = (base: number, s: string, size: number, font: "F1" | "F2" | "F3", color = INK, tc = 0) =>
    text(M, base, s, size, font, color, tc)
  const right = (base: number, s: string, size: number, font: "F1" | "F2" | "F3", color = INK) =>
    text(W - M - width(s, size), base, s, size, font, color)
  const center = (base: number, s: string, size: number, font: "F1" | "F2" | "F3", color = INK, tc = 0) =>
    text((W - (width(s, size, tc) - tc)) / 2, base, s, size, font, color, tc)

  const dashed = (top: number) =>
    ops.push((H) => `0.55 G 0.6 w [2.5 2.5] 0 d ${M} ${n2(H - top)} m ${W - M} ${n2(H - top)} l S [] 0 d`)
  const solid = (top: number) =>
    ops.push((H) => `0.1 G 0.9 w ${M} ${n2(H - top)} m ${W - M} ${n2(H - top)} l S`)

  // en-tête
  const logoH = 26
  const logoW = (logoH * LOGO_W) / LOGO_H
  const logoTop = y
  ops.push((H) => `q ${n2(logoW)} 0 0 ${n2(logoH)} ${n2((W - logoW) / 2)} ${n2(H - logoTop - logoH)} cm /Im1 Do Q`)
  y += 28
  center(y + 15, c.title.toUpperCase(), 6.5, "F1", SOFT, 3)
  y += 15 + 14
  dashed(y)
  y += 18

  // infos
  const meta = (label: string, value: string) => {
    left(y, label.toUpperCase(), 6.5, "F1", SOFT, 0.6)
    right(y, value, 7.5, "F1")
    y += 14
  }
  meta(c.receipt, r.number)
  meta(c.date, dateText(r.created, locale))
  if (r.name) meta(c.customer, norm(r.name).toUpperCase().slice(0, 22))
  y += 2
  dashed(y)
  y += 18

  // articles
  const maxChars = Math.floor((W - 2 * M) / (8 * CW))
  for (const l of r.lines) {
    const price = money(l.a, r.currency)
    const label = `${l.d}${l.q > 1 ? ` x${l.q}` : ""}`
    const parts = wrap(norm(label), Math.max(12, maxChars - norm(price).length - 2))
    parts.forEach((p, i) => {
      left(y, p, 8, "F2")
      if (i === 0) right(y, price, 8, "F1")
      y += 11
    })
    y += 4
  }

  // lignes en plus
  const extra = (label: string, value: string) => {
    left(y, label.toUpperCase(), 6.5, "F1", SOFT, 0.6)
    right(y, value, 7.5, "F1", SOFT)
    y += 12
  }
  if (r.shipping !== null) extra(c.shipping, r.shipping > 0 ? money(r.shipping, r.currency) : c.free)
  else if (r.other > 0) extra(c.other, money(r.other, r.currency))
  if (r.discount > 0) extra(c.discount, "-" + money(r.discount, r.currency))
  if (r.tax > 0) extra(c.vat, money(r.tax, r.currency))

  y += 6
  solid(y)
  y += 24

  // total + tampon
  const totalBase = y
  left(totalBase, c.total.toUpperCase(), 11, "F2")
  right(totalBase, money(r.total, r.currency), 14, "F2")
  const stampCx = 98
  const stampCy = totalBase - 2
  ops.push((H) => {
    const cy = H - stampCy
    const k = 0.5523
    const circle = (rad: number, w: number) => {
      const a = rad * k
      return (
        `${GREEN} RG ${n2(w)} w ` +
        `${n2(stampCx + rad)} ${n2(cy)} m ` +
        `${n2(stampCx + rad)} ${n2(cy + a)} ${n2(stampCx + a)} ${n2(cy + rad)} ${n2(stampCx)} ${n2(cy + rad)} c ` +
        `${n2(stampCx - a)} ${n2(cy + rad)} ${n2(stampCx - rad)} ${n2(cy + a)} ${n2(stampCx - rad)} ${n2(cy)} c ` +
        `${n2(stampCx - rad)} ${n2(cy - a)} ${n2(stampCx - a)} ${n2(cy - rad)} ${n2(stampCx)} ${n2(cy - rad)} c ` +
        `${n2(stampCx + a)} ${n2(cy - rad)} ${n2(stampCx + rad)} ${n2(cy - a)} ${n2(stampCx + rad)} ${n2(cy)} c S`
      )
    }
    const ang = (-12 * Math.PI) / 180
    const cs = Math.cos(ang)
    const sn = Math.sin(ang)
    const label = norm(c.paid).toUpperCase()
    const size = 13
    const w = label.length * size * CW
    return (
      `q ${circle(24, 1.5)} ${circle(19.5, 0.6)} ` +
      `${n2(cs)} ${n2(sn)} ${n2(-sn)} ${n2(cs)} ${n2(stampCx)} ${n2(cy)} cm ` +
      `BT ${GREEN} rg /F2 ${size} Tf ${n2(-w / 2)} -4.5 Td (${esc(label)}) Tj ET Q`
    )
  })
  y += 30
  left(y, (r.method ? `${c.paidBy} ${r.method}` : c.paid).toUpperCase(), 6.5, "F1", SOFT, 0.4)
  right(y, c.approved.toUpperCase(), 6.5, "F1", SOFT)
  y += 14
  dashed(y)
  y += 16

  // code-barres décoratif
  const bars = barcodeBars(r.number)
  const total = bars.reduce((s, b) => s + b, 0)
  const unit = (W - 2 * M) / total
  const bTop = y
  const bH = 36
  ops.push((H) => {
    let x = M
    let out = `${INK} rg `
    bars.forEach((b, i) => {
      const w = b * unit
      if (i % 2 === 0) out += `${n2(x)} ${n2(H - bTop - bH)} ${n2(w)} ${n2(bH)} re f `
      x += w
    })
    return out
  })
  y += bH + 12
  center(y, r.number, 6, "F1", SOFT, 2)
  y += 22
  center(y, c.thanks, 8, "F3", INK)
  y += 30

  const H = Math.ceil(y)
  const content =
    `0.976 0.969 0.945 rg 0 0 ${W} ${H} re f\n` + ops.map((o) => o(H)).join("\n")

  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> /XObject << /Im1 8 0 R >> >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Oblique /Encoding /WinAnsiEncoding >>",
    `<< /Type /XObject /Subtype /Image /Width ${LOGO_W} /Height ${LOGO_H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /FlateDecode] /Length ${LOGO_HEX.length + 1} >>\nstream\n${LOGO_HEX}>\nendstream`,
  ]
  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []
  objs.forEach((o, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`

  const bytes = new Uint8Array(pdf.length)
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 255
  return bytes
}

export function downloadReceiptPdf(r: ReceiptData, lang: ReceiptLang, locale: string) {
  const bytes = buildReceiptPdf(r, lang, locale)
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `FYSU-receipt-${r.number}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
