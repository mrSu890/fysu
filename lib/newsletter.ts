/* ====================================================================
   NEWSLETTER : modèle d'e-mail unique à la DA de FYSU (fond crème, titres gras, texte fin).
   Pour chaque campagne on ne change que le contenu (objet, titre, texte, image, bouton).
   ==================================================================== */

export type Campaign = {
  subject: string
  preheader?: string
  title: string
  body: string // paragraphes séparés par une ligne vide
  imageUrl?: string
  ctaLabel?: string
  ctaUrl?: string
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://f-y-s-u.com").replace(/\/$/, "")

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const safeUrl = (u?: string) => (u && /^https?:\/\//i.test(u.trim()) ? esc(u.trim()) : "")

export function renderEmail(c: Campaign, unsubUrl: string): { html: string; text: string } {
  const paras = (c.body || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const img = safeUrl(c.imageUrl)
  const cta = safeUrl(c.ctaUrl)
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#efeeea;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preheader || "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efeeea;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:0.14em;color:#151515;font-weight:700;">FYSU</td></tr>
${img ? `<tr><td style="padding:0 0 28px;"><img src="${img}" alt="" width="520" style="display:block;width:100%;height:auto;border:0;"></td></tr>` : ""}
<tr><td style="padding:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:26px;line-height:1.15;font-weight:800;color:#151515;">${esc(c.title)}</td></tr>
${paras.map((p) => `<tr><td style="padding:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;font-weight:300;color:#2b2b2b;">${esc(p).replace(/\n/g, "<br>")}</td></tr>`).join("")}
${cta && c.ctaLabel ? `<tr><td style="padding:14px 0 36px;"><a href="${cta}" style="display:inline-block;background:#151515;color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;padding:14px 26px;">${esc(c.ctaLabel)}</a></td></tr>` : ""}
<tr><td style="border-top:1px solid #cfcdc7;padding:20px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;font-weight:300;color:#6b6b66;">
Tu reçois cet e-mail car tu t'es inscrit à la newsletter FYSU.<br>
<a href="${esc(unsubUrl)}" style="color:#6b6b66;">Se désinscrire</a> · <a href="${SITE_URL}" style="color:#6b6b66;">f-y-s-u.com</a>
</td></tr>
</table></td></tr></table></body></html>`
  const text = `${c.title}\n\n${paras.join("\n\n")}${cta && c.ctaLabel ? `\n\n${c.ctaLabel} : ${c.ctaUrl}` : ""}\n\n—\nSe désinscrire : ${unsubUrl}`
  return { html, text }
}
