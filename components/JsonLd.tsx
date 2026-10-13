// Données structurées pour Google (schema.org). Composant serveur : rien côté navigateur.
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const blocks = Array.isArray(data) ? data : [data]
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  )
}

export function itemListJsonLd(name: string, url: string, products: { slug?: string; name?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products
        .filter((p) => p?.slug)
        .map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/product/${p.slug}`,
          name: String(p.name ?? p.slug),
        })),
    },
  }
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://f-y-s-u.com").replace(/\/$/, "")
