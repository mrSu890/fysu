import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import EventPage from "@/components/EventPage"
import { getEvent } from "@/lib/events"
import { GET as getPageRoute } from "@/app/api/pages/[slug]/route"
import { internalRequest, readRoute } from "@/lib/serverData"
import { HOME_DESCRIPTION, SITE, SITE_NAME, pageMeta } from "@/lib/seo"
import SlugClient from "./SlugClient"

// Lu à chaque visite : prix, stock et textes toujours à jour (jamais figés au moment du build)
export const dynamic = "force-dynamic"

/* ====================================================================
   PAGES DE PRODUITS (For him, For her…) ET PAGES « ÉVENT »
   Les rangées de produits sont lues côté serveur : prix, noms et photos sont
   dans le HTML envoyé à Google. Le composant client gère filtres et animations.
   ==================================================================== */

const loadPage = cache(async (slug: string) =>
  readRoute<{ page: any; sections: any[] }>(() =>
    getPageRoute(internalRequest(`/api/pages/${slug}`), { params: Promise.resolve({ slug }) })
  )
)

function short(text: unknown, max: number) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim()
  return s.length > max ? `${s.slice(0, max - 3)}...` : s
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params

  const event = getEvent(slug)
  if (event) {
    return pageMeta({
      title: `${event.title} — ${SITE_NAME}`,
      description: short(event.intro.en, 155) || HOME_DESCRIPTION,
      path: `/${slug}`,
      image: event.hero?.src ? `${SITE}${event.hero.src}` : null,
    })
  }

  const data = await loadPage(slug)
  if (!data?.page) return {}
  const name = String(data.page.title ?? slug)
  const description =
    short(data.page.description, 155) || `${name}, a FYSU selection. ${HOME_DESCRIPTION}`
  const image: string | null = data.page.hero_image || null
  return pageMeta({ title: `${name} — ${SITE_NAME}`, description, path: `/${slug}`, image })
}

export default async function SlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const event = getEvent(slug)
  if (event) return <EventPage event={event} />

  const data = await loadPage(slug)
  if (!data?.page) notFound()

  // Liste des produits de la page pour Google (nom, lien, prix)
  const products: any[] = []
  const seen = new Set<string>()
  for (const section of data.sections ?? []) {
    for (const sp of section.section_products ?? []) {
      const p = sp?.product
      if (p?.slug && !seen.has(p.slug)) {
        seen.add(p.slug)
        products.push(p)
      }
    }
  }
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: String(data.page.title ?? slug),
    url: `${SITE}/${slug}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((p, i) => ({
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
      <SlugClient slug={slug} initialPage={data.page} initialSections={data.sections ?? []} />
    </>
  )
}
