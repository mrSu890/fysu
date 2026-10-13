import type { Metadata } from "next"
import { cache } from "react"
import { GET as getFygrancesRoute } from "@/app/api/fygrances/route"
import { readRoute } from "@/lib/serverData"
import { PAGES, SITE, pageMeta } from "@/lib/seo"
import FygrancesClient from "./FygrancesClient"

// Lu à chaque visite : prix, stock et textes toujours à jour (jamais figés au moment du build)
export const dynamic = "force-dynamic"

/* ====================================================================
   FY'GRANCES : parfums, soins et maison lus côté serveur (dans le HTML pour Google)
   ==================================================================== */

const loadFygrances = cache(async () =>
  readRoute<{ page: any; products: any[]; chapters: any[] }>(() => getFygrancesRoute())
)

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadFygrances()
  const image: string | null = data?.page?.hero_image || null
  return pageMeta({ ...PAGES.fygrances, image })
}

export default async function FygrancesPage() {
  const data = await loadFygrances()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "FY'grances",
    url: `${SITE}/fygrances`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: (data?.products ?? [])
        .filter((p) => p?.slug)
        .map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE}/product/${p.slug}`,
          name: String(p.name ?? p.slug),
        })),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <FygrancesClient initialData={data} />
    </>
  )
}
