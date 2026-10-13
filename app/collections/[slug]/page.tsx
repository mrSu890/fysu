import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { GET as getCollectionRoute } from "@/app/api/collections/[slug]/route"
import { internalRequest, readRoute } from "@/lib/serverData"
import { HOME_DESCRIPTION, SITE, SITE_NAME, pageMeta } from "@/lib/seo"
import CollectionClient from "./CollectionClient"

// Lu à chaque visite : prix, stock et textes toujours à jour (jamais figés au moment du build)
export const dynamic = "force-dynamic"

/* ====================================================================
   COLLECTIONS (/collections/<lien>)
   Produits, prix et textes sont lus côté serveur : ils sont dans le HTML
   envoyé à Google. Le composant client gère filtres, grille et animations.
   ==================================================================== */

const loadCollection = cache(async (slug: string) =>
  readRoute<{ page: any; products: any[] }>(() =>
    getCollectionRoute(internalRequest(`/api/collections/${slug}`) as any, { params: Promise.resolve({ slug }) })
  )
)

function short(text: unknown, max: number) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim()
  return s.length > max ? `${s.slice(0, max - 3)}...` : s
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await loadCollection(slug)
  if (!data?.page) return {}
  const name = String(data.page.title ?? data.page.name ?? slug)
  const description =
    short(data.page.description ?? data.page.intro, 155) || `${name}, a FYSU collection. ${HOME_DESCRIPTION}`
  const image: string | null = data.page.hero_image || null
  return pageMeta({ title: `${name} — ${SITE_NAME}`, description, path: `/collections/${slug}`, image })
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await loadCollection(slug)
  if (!data?.page) notFound()

  const products = data.products ?? []
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: String(data.page.title ?? slug),
    url: `${SITE}/collections/${slug}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products
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
      <CollectionClient slug={slug} initialPage={data.page} initialProducts={products} />
    </>
  )
}
