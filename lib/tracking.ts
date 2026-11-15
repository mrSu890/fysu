import { createHmac } from "crypto"
import { SITE_URL } from "@/lib/emailBlocks"

/* SUIVI DES CAMPAGNES : chaque lien du mail passe par /api/e/c (qui note le clic puis renvoie vers la vraie page),
   et un pixel invisible /api/e/o note l'ouverture. Les liens sont signés : personne ne peut s'en servir pour rediriger ailleurs.
   Limite connue : Apple Mail et certains antivirus « ouvrent » les mails tout seuls, les ouvertures sont donc un peu gonflées. */

const secret = () => process.env.TRACKING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "fysu-tracking"
export const sign = (url: string) => createHmac("sha256", secret()).update(url).digest("hex").slice(0, 20)
export const b64 = (s: string) => Buffer.from(s).toString("base64url")
export const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8")

export function trackHtml(html: string, o: { campaign: string; email: string; variant: string }): string {
  const base = `c=${o.campaign}&r=${b64(o.email)}&v=${o.variant}`
  const out = html.replace(/href="(https?:\/\/[^"]+)"/g, (m, u: string) => {
    if (u.includes("/api/e/") || u.includes("/unsubscribe")) return m
    const raw = u.replace(/&amp;/g, "&")
    return `href="${SITE_URL}/api/e/c?${base}&u=${encodeURIComponent(raw)}&s=${sign(raw)}"`
  })
  const pixel = `<img src="${SITE_URL}/api/e/o?${base}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;">`
  return out.replace("</body>", `${pixel}</body>`)
}
