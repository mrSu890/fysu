import type { Metadata } from "next"
import { cache } from "react"
import { GET as getCollectionRoute } from "@/app/api/collections/[slug]/route"
import { internalRequest, readRoute } from "@/lib/serverData"
import { PAGES, SITE, pageMeta } from "@/lib/seo"
import JsonLd, { itemListJsonLd } from "@/components/JsonLd"
import KibanClient from "./KibanClient"

// Lu à chaque visite : prix, stock et textes toujours à jour (jamais figés au moment du build)
export const dynamic = "force-dynamic"

/* Kiban Collector : produits lus côté serveur (dans le HTML pour Google) */

// Collection créée dans l'admin (lien = kiban-collector) qui contient les produits
const COLLECTION_SLUG = "kiban-collector"

const loadProducts = cache(async () => {
  const data = await readRoute<{ page: any; products: any[] }>(() =>
    getCollectionRoute(internalRequest(`/api/collections/${COLLECTION_SLUG}`), {
      params: Promise.resolve({ slug: COLLECTION_SLUG }),
    })
  )
  return data?.products ?? []
})

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta({ ...PAGES.kibanCollector, image: `${SITE}/images/kiban-collector-portrait.jpg` })
}

export default async function KibanCollectorPage() {
  const products = await loadProducts()
  return (
    <>
      {/* l'ambiance de la page est posée dès l'arrivée (mêmes classes que le composant client) : pas de flash */}
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add("dark","kiban-dark")` }} />
      <JsonLd data={itemListJsonLd("Kiban Collector", `${SITE}/kiban-collector`, products)} />
      <KibanClient initialProducts={products} />
    </>
  )
}
