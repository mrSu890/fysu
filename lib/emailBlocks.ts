/* ====================================================================
   MAILS FYSU : même langage visuel que le site.
   - fond crème (#e8e7e3), texte #151515, filets fins, boutons ANGULAIRES (aucun arrondi)
   - petites étiquettes en capitales espacées (le « DM Mono » du site, repli monospace)
   - gros titres gras serrés, texte courant fin ; une colonne de 600 px, beaucoup d'air
   - tout le texte reste du vrai texte (images bloquées = mail lisible), alt sur chaque image
   - mode sombre : on impose le thème clair pour que le logo et les couleurs ne soient pas inversés
   Ce fichier sert à la fois pour l'aperçu dans l'admin et pour l'envoi.
   ==================================================================== */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://f-y-s-u.com").replace(/\/$/, "")

export type ProductPick = { id: number; name: string; price: number; imageUrl: string; url: string }

export type Block =
  | { type: "hero"; imageUrl: string; alt?: string; href?: string }
  | { type: "title"; eyebrow?: string; title: string }
  | { type: "text"; text: string }
  | { type: "button"; label: string; url: string; style?: "solid" | "outline" }
  | { type: "products"; heading?: string; columns?: 1 | 2; items: ProductPick[] }
  | { type: "quote"; text: string; by?: string }
  | { type: "divider" }
  | { type: "raw"; html: string } // usage interne (récapitulatif de commande)

export const BLOCK_LABEL: Record<Block["type"], string> = {
  hero: "Image",
  title: "Titre",
  text: "Texte",
  button: "Bouton",
  products: "Grille de produits",
  quote: "Citation",
  divider: "Séparateur",
  raw: "Contenu",
}

export const C = {
  page: "#e8e7e3",
  paper: "#efeeea",
  ink: "#151515",
  soft: "#5c5a55",
  line: "#cfcdc7",
}
export const F = {
  sans: "'Helvetica Neue',Helvetica,Arial,sans-serif",
  mono: "'DM Mono','SF Mono',Menlo,Consolas,'Courier New',monospace",
  serif: "Georgia,'Times New Roman',serif",
}

export const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export const safeUrl = (u?: string) => (u && /^https?:\/\//i.test(u.trim()) ? esc(u.trim()) : "")

/** texte avec [lien](https://…) et retours à la ligne */
export function richText(s: string): string {
  return esc(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, `<a href="$2" style="color:${C.ink};text-decoration:underline;">$1</a>`)
    .replace(/\n/g, "<br>")
}

const money = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2)} EUR`

const eyebrowStyle = `font-family:${F.mono};font-size:11px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:${C.soft};`

export function button(label: string, url: string, style: "solid" | "outline" = "solid"): string {
  const href = safeUrl(url)
  if (!href || !label) return ""
  const solid = style === "solid"
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${solid ? C.ink : C.page}" style="background:${solid ? C.ink : "transparent"};border:1px solid ${C.ink};">
<a href="${href}" style="display:inline-block;padding:16px 34px;font-family:${F.mono};font-size:12px;line-height:1;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;color:${solid ? "#ffffff" : C.ink};">${esc(label)}</a></td></tr></table>`
}

const row = (inner: string, pad = "0 28px 22px") => `<tr><td style="padding:${pad};">${inner}</td></tr>`

function productCell(p: ProductPick, big: boolean): string {
  const href = safeUrl(p.url)
  const img = safeUrl(p.imageUrl)
  const w = big ? 544 : 262
  return `<a href="${href}" style="text-decoration:none;color:${C.ink};display:block;">
${img ? `<img src="${img}" alt="${esc(p.name)}" width="${w}" style="display:block;width:100%;height:auto;border:0;background:${C.paper};">` : ""}
<div style="padding:12px 0 0;font-family:${F.sans};font-size:14px;line-height:1.35;font-weight:500;color:${C.ink};">${esc(p.name)}</div>
<div style="padding:4px 0 0;${eyebrowStyle}">${money(p.price)}</div></a>`
}

export function renderBlock(b: Block): string {
  switch (b.type) {
    case "hero": {
      const img = safeUrl(b.imageUrl)
      if (!img) return ""
      const tag = `<img src="${img}" alt="${esc(b.alt || "")}" width="600" style="display:block;width:100%;height:auto;border:0;">`
      const href = safeUrl(b.href)
      return `<tr><td style="padding:0 0 30px;">${href ? `<a href="${href}">${tag}</a>` : tag}</td></tr>`
    }
    case "title":
      return row(
        `${b.eyebrow ? `<div style="${eyebrowStyle}padding:0 0 14px;">${esc(b.eyebrow)}</div>` : ""}
<div style="font-family:${F.sans};font-size:32px;line-height:1.08;font-weight:800;letter-spacing:-0.025em;color:${C.ink};">${esc(b.title)}</div>`,
        "6px 28px 18px"
      )
    case "text":
      return (b.text || "")
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => row(`<div style="font-family:${F.sans};font-size:15px;line-height:1.75;font-weight:300;color:#2b2a27;">${richText(p)}</div>`, "0 28px 16px"))
        .join("")
    case "button":
      return row(button(b.label, b.url, b.style), "8px 28px 36px")
    case "quote":
      return row(
        `<div style="border-left:1px solid ${C.ink};padding:2px 0 2px 18px;">
<div style="font-family:${F.serif};font-size:21px;line-height:1.4;font-style:italic;color:${C.ink};">${esc(b.text)}</div>
${b.by ? `<div style="${eyebrowStyle}padding:12px 0 0;">${esc(b.by)}</div>` : ""}</div>`,
        "10px 28px 32px"
      )
    case "raw":
      return b.html
    case "divider":
      return `<tr><td style="padding:8px 28px 30px;"><div style="border-top:1px solid ${C.line};font-size:0;line-height:0;">&nbsp;</div></td></tr>`
    case "products": {
      const items = (b.items || []).filter((p) => p && p.name)
      if (items.length === 0) return ""
      const head = b.heading ? row(`<div style="${eyebrowStyle}">${esc(b.heading)}</div>`, "8px 28px 14px") : ""
      if (b.columns === 1) return head + items.map((p) => row(productCell(p, true), "0 28px 26px")).join("")
      const rows: string[] = []
      for (let i = 0; i < items.length; i += 2) {
        const a = items[i]
        const c = items[i + 1]
        rows.push(
          `<tr><td style="padding:0 28px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="50%" valign="top" style="padding:0 8px 0 0;">${productCell(a, false)}</td>
<td width="50%" valign="top" style="padding:0 0 0 8px;">${c ? productCell(c, false) : ""}</td></tr></table></td></tr>`
        )
      }
      return head + rows.join("")
    }
  }
}

export type DocOpts = {
  preheader?: string
  blocks: Block[]
  /** lien de désinscription (newsletter) ; absent pour les mails de commande */
  unsubUrl?: string | null
  footerNote?: string
  business: { name: string; street: string; postalCode: string; city: string; country: string; email: string; instagram?: string }
}

export function renderDoc(o: DocOpts): string {
  const b = o.business
  const body = o.blocks.map(renderBlock).join("\n")
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<style>:root{color-scheme:light only;supported-color-schemes:light only;}@media only screen and (max-width:620px){.wrap{width:100%!important}}</style></head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(o.preheader || "")}${"&zwnj;&nbsp;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};"><tr><td align="center" style="padding:0;">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">
<tr><td align="center" style="padding:40px 28px 34px;"><a href="${SITE_URL}"><img src="${SITE_URL}/images/fysu-dark.png" alt="FYSU" width="104" style="display:block;border:0;width:104px;height:auto;"></a></td></tr>
${body}
<tr><td style="padding:14px 28px 44px;">
<div style="border-top:1px solid ${C.line};padding:22px 0 0;font-family:${F.sans};font-size:12px;line-height:1.7;font-weight:300;color:${C.soft};">
${o.footerNote ? `${richText(o.footerNote)}<br><br>` : ""}
${esc(b.name)} · ${esc(b.street)}, ${esc(b.postalCode)} ${esc(b.city)}, ${esc(b.country)}<br>
<a href="mailto:${esc(b.email)}" style="color:${C.soft};">${esc(b.email)}</a>${b.instagram ? ` · <a href="${esc(b.instagram)}" style="color:${C.soft};">Instagram</a>` : ""} · <a href="${SITE_URL}" style="color:${C.soft};">f-y-s-u.com</a>
${o.unsubUrl ? `<br><br>Tu reçois cet e-mail car tu t'es inscrit à la newsletter FYSU. <a href="${esc(o.unsubUrl)}" style="color:${C.soft};">Se désinscrire</a>` : ""}
</div></td></tr>
</table></td></tr></table></body></html>`
}

/** version texte brut (clients sans HTML + score anti-spam) */
export function renderText(blocks: Block[], unsubUrl?: string | null): string {
  const out: string[] = []
  for (const b of blocks) {
    if (b.type === "title") out.push(`${b.eyebrow ? b.eyebrow.toUpperCase() + "\n" : ""}${b.title}`)
    else if (b.type === "text") out.push(b.text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)"))
    else if (b.type === "button") out.push(`${b.label} : ${b.url}`)
    else if (b.type === "quote") out.push(`« ${b.text} »${b.by ? " — " + b.by : ""}`)
    else if (b.type === "products") out.push((b.heading ? b.heading + "\n" : "") + (b.items || []).map((p) => `${p.name} — ${money(p.price)}\n${p.url}`).join("\n\n"))
  }
  if (unsubUrl) out.push(`—\nSe désinscrire : ${unsubUrl}`)
  return out.join("\n\n")
}
