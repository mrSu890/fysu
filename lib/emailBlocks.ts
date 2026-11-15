/* ====================================================================
   MAILS FYSU : même langage visuel que le site.
   - fond crème (#e8e7e3), texte #151515, filets fins, boutons ANGULAIRES (aucun arrondi)
   - petites étiquettes en capitales espacées (le « DM Mono » du site, repli monospace)
   - gros titres gras serrés, texte courant fin ; une colonne de 600 px, beaucoup d'air
   - tout le texte reste du vrai texte (images bloquées = mail lisible), alt sur chaque image
   - mode sombre : on impose le thème clair pour que le logo et les couleurs ne soient pas inversés
   Ce fichier sert à la fois pour l'aperçu dans l'admin et pour l'envoi.
   ==================================================================== */

const RAW_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://f-y-s-u.com").trim()
// sans « https:// » (réglage Vercel incomplet), les liens du mail resteraient vides : on le complète
export const SITE_URL = (/^https?:\/\//i.test(RAW_SITE) ? RAW_SITE : `https://${RAW_SITE}`).replace(/\/$/, "")

export type ProductPick = { id: number; name: string; price: number; imageUrl: string; url: string }

export type Size = "s" | "m" | "l"

export type LogoSize = "none" | "s" | "m" | "l"
export type LogoOver = "none" | "top" | "center"
const LOGO_W: Record<Exclude<LogoSize, "none">, number> = { s: 72, m: 104, l: 170 }

/** logo FYSU en ligne (foncé sur fond clair, clair sur photo) */
export function logoImg(w: number, color: "dark" | "light" = "dark"): string {
  const f = color === "light" ? "fysu-light.png" : "fysu-dark.png"
  return `<a href="${SITE_URL}" target="_blank"><img src="${SITE_URL}/images/${f}" alt="FYSU" width="${w}" style="display:block;border:0;width:${w}px;height:auto;"></a>`
}

export type Block =
  | { type: "logo"; size?: LogoSize; align?: "left" | "center" | "right"; color?: "dark" | "light" }
  | { type: "hero"; imageUrl: string; alt?: string; href?: string; frame?: "wide" | "landscape" | "square" | "full"; focus?: "top" | "center" | "bottom"; logo?: LogoOver }
  | { type: "title"; eyebrow?: string; title: string; style?: "bold" | "light"; align?: "left" | "center"; size?: Size }
  | { type: "text"; text: string; align?: "left" | "center"; size?: Size }
  | { type: "nav"; links: { label: string; url: string }[] }
  | { type: "heroTitle"; imageUrl: string; alt?: string; title: string; buttonLabel?: string; buttonUrl?: string; size?: Size; height?: "s" | "m" | "l"; focus?: "top" | "center" | "bottom"; logo?: LogoOver }
  | { type: "mosaic"; images: { imageUrl: string; alt?: string; href?: string }[] }
  | { type: "button"; label: string; url: string; style?: "solid" | "outline" }
  | { type: "products"; heading?: string; columns?: 1 | 2; items: ProductPick[] }
  | { type: "quote"; text: string; by?: string }
  | { type: "divider" }
  | { type: "raw"; html: string } // usage interne (récapitulatif de commande)

export const BLOCK_LABEL: Record<Block["type"], string> = {
  logo: "Logo FYSU",
  hero: "Image",
  nav: "Menu (liens du haut)",
  heroTitle: "Image avec titre dessus",
  mosaic: "Mosaïque de photos",
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
  // le lien ne reste jamais vide : à défaut, la boutique
  const href = safeUrl(p.url) || safeUrl(`${SITE_URL}/product/${p.id}`) || SITE_URL
  const img = safeUrl(p.imageUrl)
  const w = big ? 544 : 262
  const link = `color:${C.ink};text-decoration:none;`
  // photo, nom et prix sont chacun un lien (un seul bloc cliquable pose problème dans certains clients mail)
  return `${img ? `<a href="${href}" target="_blank" style="${link}display:block;"><img src="${img}" alt="${esc(p.name)}" width="${w}" style="display:block;width:100%;height:auto;border:0;background:${C.paper};"></a>` : ""}
<div style="padding:12px 0 0;font-family:${F.sans};font-size:14px;line-height:1.35;font-weight:500;"><a href="${href}" target="_blank" style="${link}color:${C.ink};">${esc(p.name)}</a></div>
<div style="padding:4px 0 0;${eyebrowStyle}"><a href="${href}" target="_blank" style="${link}color:${C.soft};">${money(p.price)}</a></div>`
}

export function renderBlock(b: Block): string {
  switch (b.type) {
    case "logo": {
      if (b.size === "none") return ""
      const al = b.align ?? "center"
      return `<tr><td align="${al}" style="padding:34px 28px 30px;">${logoImg(LOGO_W[b.size ?? "m"], b.color)}</td></tr>`
    }
    case "hero": {
      const img = safeUrl(b.imageUrl)
      if (!img) return ""
      const href = safeUrl(b.href)
      const frame = b.frame ?? "landscape"
      if (frame !== "full") {
        // cadre fixe (mail plus court) : la photo remplit le cadre, on choisit la partie visible
        const H = { wide: 300, landscape: 380, square: 520 }[frame]
        const lg = b.logo && b.logo !== "none"
        const inner = lg
          ? `<table role="presentation" width="100%" height="${H}" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="${b.logo === "top" ? "top" : "middle"}" height="${H}" style="height:${H}px;padding:${b.logo === "top" ? "30px" : "0"} 0 0;">${logoImg(b.logo === "top" ? 104 : 150, "light")}</td></tr></table>`
          : href ? `<a href="${href}" target="_blank" style="display:block;height:${H}px;font-size:0;line-height:0;text-decoration:none;">&nbsp;</a>` : "&nbsp;"
        return `<tr><td background="${img}" bgcolor="${lg ? "#3a3935" : "#e8e7e3"}" height="${H}" style="height:${H}px;font-size:0;line-height:0;background-color:${lg ? "#3a3935" : "#e8e7e3"};background-image:url('${img}');background-size:cover;background-position:center ${b.focus ?? "center"};">${inner}</td></tr><tr><td style="font-size:0;line-height:0;height:30px;">&nbsp;</td></tr>`
      }
      const tag = `<img src="${img}" alt="${esc(b.alt || "")}" width="600" style="display:block;width:100%;height:auto;border:0;">`
      return `<tr><td style="padding:0 0 30px;">${href ? `<a href="${href}">${tag}</a>` : tag}</td></tr>`
    }
    case "title": {
      const ta = b.align === "center" ? "text-align:center;" : ""
      const titleCss =
        b.style === "light"
          ? `font-size:${{ s: 20, m: 26, l: 34 }[b.size ?? "m"]}px;line-height:1.2;font-weight:300;letter-spacing:0.03em;text-transform:uppercase;`
          : `font-size:${{ s: 24, m: 32, l: 42 }[b.size ?? "m"]}px;line-height:1.08;font-weight:800;letter-spacing:-0.025em;`
      return row(
        `${b.eyebrow ? `<div style="${eyebrowStyle}padding:0 0 14px;${ta}">${esc(b.eyebrow)}</div>` : ""}
<div style="font-family:${F.sans};${titleCss}color:${C.ink};${ta}">${esc(b.title)}</div>`,
        "6px 28px 18px"
      )
    }
    case "nav": {
      const links = (b.links || []).filter((l) => l.label && safeUrl(l.url)).slice(0, 4)
      if (links.length === 0) return ""
      const cells = links
        .map((l) => `<td align="center" style="padding:0 4px;"><a href="${safeUrl(l.url)}" target="_blank" style="font-family:${F.mono};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;color:${C.ink};">${esc(l.label)}</a></td>`)
        .join("")
      return `<tr><td style="padding:0 28px 26px;"><div style="border-top:1px solid ${C.ink};font-size:0;line-height:0;">&nbsp;</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table></td></tr>`
    }
    case "heroTitle": {
      const img = safeUrl(b.imageUrl)
      if (!img) return ""
      const href = safeUrl(b.buttonUrl)
      const btn = href && b.buttonLabel
        ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:22px auto 0;"><tr><td bgcolor="#ffffff" style="background:#ffffff;"><a href="${href}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:${F.mono};font-size:11px;line-height:1;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;color:${C.ink};">${esc(b.buttonLabel)}</a></td></tr></table>`
        : ""
      const H = { s: 300, m: 400, l: 520 }[b.height ?? "l"]
      // photo en fond de cellule : sous Outlook (ordinateur) elle ne s'affiche pas, le fond reste sombre et le texte lisible
      const lg = b.logo && b.logo !== "none"
      const txt = `<div style="font-family:${F.sans};font-size:${{ s: 22, m: 30, l: 40 }[b.size ?? "m"]}px;line-height:1.1;font-weight:300;letter-spacing:0.03em;text-transform:uppercase;color:#ffffff;text-shadow:0 1px 14px rgba(0,0,0,0.45);">${esc(b.title)}</div>${btn}`
      const bg = `background-color:#3a3935;background-image:linear-gradient(rgba(0,0,0,0) 45%,rgba(0,0,0,0.5) 100%),url('${img}');background-size:cover;background-position:center ${b.focus ?? "top"};`
      const cell = lg
        ? `<td background="${img}" bgcolor="#3a3935" height="${H}" valign="top" align="center" style="height:${H}px;${bg}padding:0;"><table role="presentation" width="100%" height="${H}" cellpadding="0" cellspacing="0" border="0">${
            b.logo === "center"
              ? `<tr><td align="center" valign="middle" style="padding:0 20px;">${logoImg(150, "light")}<div style="height:22px;font-size:0;line-height:0;">&nbsp;</div>${txt}</td></tr>`
              : `<tr><td align="center" valign="top" style="padding:30px 20px 0;">${logoImg(104, "light")}</td></tr><tr><td align="center" valign="bottom" style="padding:0 20px 34px;">${txt}</td></tr>`
          }</table></td>`
        : `<td background="${img}" bgcolor="#3a3935" height="${H}" valign="bottom" align="center" style="height:${H}px;${bg}padding:0 20px 34px;">${txt}</td>`
      // photo en fond de cellule : sous Outlook (ordinateur) elle ne s'affiche pas, le fond reste sombre et le texte lisible
      return `<tr><td style="padding:0 28px 30px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cell}</tr></table></td></tr>`
    }
    case "mosaic": {
      const imgs = (b.images || []).filter((i) => safeUrl(i.imageUrl))
      if (imgs.length === 0) return ""
      const tag = (i: { imageUrl: string; alt?: string; href?: string }, w: number) => {
        const t = `<img src="${safeUrl(i.imageUrl)}" alt="${esc(i.alt || "")}" width="${w}" style="display:block;width:100%;height:auto;border:0;background:${C.paper};">`
        return safeUrl(i.href) ? `<a href="${safeUrl(i.href)}" target="_blank">${t}</a>` : t
      }
      const top = imgs.length >= 2
        ? `<tr><td style="padding:0 28px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="50%" valign="top" style="padding:0 4px 0 0;">${tag(imgs[0], 262)}</td><td width="50%" valign="top" style="padding:0 0 0 4px;">${tag(imgs[1], 262)}</td></tr></table></td></tr>`
        : `<tr><td style="padding:0 28px 8px;">${tag(imgs[0], 544)}</td></tr>`
      const wide = imgs.length >= 3 ? `<tr><td style="padding:0 28px 8px;">${tag(imgs[2], 544)}</td></tr>` : ""
      return top + wide + `<tr><td style="font-size:0;line-height:0;height:22px;">&nbsp;</td></tr>`
    }
    case "text":
      return (b.text || "")
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => row(`<div style="font-family:${F.sans};font-size:${{ s: 13, m: 15, l: 19 }[b.size ?? "m"]}px;line-height:1.75;font-weight:300;color:#2b2a27;${b.align === "center" ? "text-align:center;" : ""}">${richText(p)}</div>`, "0 28px 16px"))
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
  const hasLogo = o.blocks.some((x) => x.type === "logo")
  const body = o.blocks.map(renderBlock).join("\n")
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<style>:root{color-scheme:light only;supported-color-schemes:light only;}@media only screen and (max-width:620px){.wrap{width:100%!important}}</style></head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(o.preheader || "")}${"&zwnj;&nbsp;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};"><tr><td align="center" style="padding:0;">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">
${hasLogo ? "" : `<tr><td align="center" style="padding:40px 28px 34px;">${logoImg(104)}</td></tr>`}
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
    else if (b.type === "heroTitle") out.push(`${b.title}${b.buttonLabel && b.buttonUrl ? "\n" + b.buttonLabel + " : " + b.buttonUrl : ""}`)
    else if (b.type === "nav") out.push(b.links.filter((l) => l.label).map((l) => `${l.label} : ${l.url}`).join("\n"))
    else if (b.type === "quote") out.push(`« ${b.text} »${b.by ? " — " + b.by : ""}`)
    else if (b.type === "products") out.push((b.heading ? b.heading + "\n" : "") + (b.items || []).map((p) => `${p.name} — ${money(p.price)}\n${p.url}`).join("\n\n"))
  }
  if (unsubUrl) out.push(`—\nSe désinscrire : ${unsubUrl}`)
  return out.join("\n\n")
}
