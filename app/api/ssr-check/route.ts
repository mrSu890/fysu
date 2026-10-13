/* ====================================================================
   TEST TEMPORAIRE (à supprimer après vérification)
   Ouvre https://www.f-y-s-u.com/api/ssr-check dans Safari :
   la page lit le HTML brut de chaque page (ce que voit Google, avant tout JavaScript)
   et indique s'il contient déjà les produits, les prix et les données structurées.
   Ne lit que les pages de ton propre site.
   ==================================================================== */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SITE = "https://www.f-y-s-u.com"
const PATHS = ["/", "/for-him", "/for-her", "/product/saku-t-1", "/fygrances", "/kiban-collector", "/thewave", "/music"]

async function check(path: string) {
  try {
    const res = await fetch(`${SITE}${path}`, { cache: "no-store", headers: { "user-agent": "Mozilla/5.0 (ssr-check)" } })
    const html = await res.text()
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "—"
    const euros = [...html.matchAll(/[^<>"]{0,25}(?:€\s?\d[\d.,]*|\d[\d.,]*\s?€)/g)].map((m) => m[0].trim())
    const productLinks = new Set([...html.matchAll(/href="\/product\/([^"?#]+)/g)].map((m) => m[1]))
    const ld = (html.match(/application\/ld\+json/g) ?? []).length
    const ok = path === "/music" ? html.includes("/music/") : productLinks.size > 0 || euros.length > 0
    return [
      `${ok ? "OK  " : "VIDE"} ${path}  (HTTP ${res.status}, ${Math.round(html.length / 1024)} Ko)`,
      `     titre : ${title}`,
      `     liens produits dans le HTML : ${productLinks.size}   prix (€) dans le HTML : ${euros.length}   JSON-LD : ${ld}`,
      ...(euros.length ? [`     exemples : ${euros.slice(0, 3).join(" | ")}`] : []),
    ].join("\n")
  } catch (err) {
    return `ERREUR ${path} : ${String(err)}`
  }
}

export async function GET() {
  const lines = await Promise.all(PATHS.map(check))
  return new Response(lines.join("\n\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } })
}
