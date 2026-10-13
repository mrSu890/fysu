import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import ProductClient from "./ProductClient"
import ThemeToggle from "@/components/ThemeToggle"
import { GET as getProductRoute } from "@/app/api/products/[slug]/route"
import { internalRequest, readRoute } from "@/lib/serverData"
import { getEffectiveAvailability } from "@/lib/availability"
import { SITE, SITE_NAME } from "@/lib/seo"
import { getBrandId } from "@/lib/brands"
import type { ProductType } from "@/types/product"

// Lu à chaque visite : prix, stock et textes toujours à jour (jamais figés au moment du build)
export const dynamic = "force-dynamic"

/* ====================================================================
   FICHE PRODUIT (rendue côté serveur)
   Le produit, son prix, sa description et ses photos sont lus ici dans Supabase
   et déjà présents dans le HTML envoyé à Google. Le composant client ne gère
   que les interactions (couleurs, tailles, panier, animations).
   ==================================================================== */

// Une seule lecture par visite, partagée entre les métadonnées et la page
const loadProduct = cache(async (slug: string) =>
  readRoute<ProductType & Record<string, any>>(() =>
    getProductRoute(internalRequest(`/api/products/${slug}`), { params: Promise.resolve({ slug }) })
  )
)

const BRAND_NAMES: Record<string, string> = {
  fysu: SITE_NAME,
  thewave: "TheWave",
  kiban: "Kiban Collector",
}

function clean(text: unknown, max: number) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim()
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

// Aperçu quand on partage le lien d'un produit (Google, Instagram, WhatsApp, iMessage…)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const p = await loadProduct(slug)
  if (!p) return {}

  const name = String(p.name ?? SITE_NAME)
  const price = Number(p.price)
  const base = clean(p.description, 150)
  const description =
    [Number.isFinite(price) ? `€${price.toFixed(2)}` : "", base].filter(Boolean).join(" · ") || SITE_NAME
  const image: string | undefined = p.product_images?.[0]?.url ?? undefined
  const title = `${name} — ${SITE_NAME}`
  const url = `${SITE}/product/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      ...(image ? { images: [{ url: image, alt: name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

// État du stock vu par Google (schema.org)
function schemaAvailability(p: Record<string, any>): string | null {
  const mode = getEffectiveAvailability({ availability: p.availability, product_sizes: p.product_sizes })
  switch (mode) {
    case "available":
      return "https://schema.org/InStock"
    case "preorder":
    case "coming_soon":
      return "https://schema.org/PreOrder"
    case "notify":
    case "sold_out":
      return "https://schema.org/OutOfStock"
    default:
      return null // sur devis : pas d'état de stock
  }
}

function buildJsonLd(slug: string, p: Record<string, any>) {
  const url = `${SITE}/product/${slug}`
  const price = Number(p.price)
  const images: string[] = (p.product_images ?? []).map((i: any) => i?.url).filter(Boolean)
  const colors: string[] = (p.product_colors ?? []).map((c: any) => c?.name).filter(Boolean)
  const availability = schemaAvailability(p)
  const mode = getEffectiveAvailability({ availability: p.availability, product_sizes: p.product_sizes })
  const release = typeof p.release_date === "string" ? p.release_date.slice(0, 10) : ""

  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: String(p.name ?? SITE_NAME),
    ...(p.description ? { description: clean(p.description, 500) } : {}),
    ...(images.length ? { image: images } : {}),
    sku: String(p.slug ?? slug),
    ...(p.categories?.name || p.category ? { category: String(p.categories?.name ?? p.category) } : {}),
    ...(colors.length ? { color: colors.join(", ") } : {}),
    brand: { "@type": "Brand", name: BRAND_NAMES[String(p.brand ?? "fysu")] ?? SITE_NAME },
    url,
    ...(Number.isFinite(price)
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: "EUR",
            price: price.toFixed(2),
            itemCondition: "https://schema.org/NewCondition",
            ...(availability ? { availability } : {}),
            ...(mode === "coming_soon" && release ? { availabilityStarts: release } : {}),
            seller: { "@type": "Organization", name: SITE_NAME },
          },
        }
      : {}),
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE },
      { "@type": "ListItem", position: 2, name: String(p.name ?? slug), item: url },
    ],
  }

  return [product, breadcrumb]
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await loadProduct(slug)
  if (!product) notFound()

  const jsonLd = buildJsonLd(slug, product)

  // Fiches TheWave / Kiban : l'ambiance de la marque est posée dès l'arrivée de la page
  // (même classes que celles ajoutées par ProductClient), pour éviter un flash clair → sombre
  const brandId = getBrandId(product.brand)
  const brandInit =
    brandId === "fysu"
      ? null
      : `(function(){var h=document.documentElement;h.classList.add(${
          brandId === "thewave" ? '"dark","brand-page","wave-page"' : '"dark","brand-page"'
        });h.setAttribute("data-brand","${brandId}")})()`

  return (
    <>
      {jsonLd.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block).replace(/</g, "\\u003c") }}
        />
      ))}
      {brandInit && <script dangerouslySetInnerHTML={{ __html: brandInit }} />}
      <Navbar />
      <ProductClient key={slug} initialProduct={product} />
      <ThemeToggle />
      <Footer />
    </>
  )
}
