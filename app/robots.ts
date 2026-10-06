import type { MetadataRoute } from "next"

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://f-y-s-u.com").replace(/\/$/, "")

// Ce que les moteurs de recherche (Google…) peuvent visiter : toute la boutique,
// sauf l'admin, le panier, le compte et les routes techniques.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/checkout", "/success", "/profile", "/auth", "/password", "/u/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
