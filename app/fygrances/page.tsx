"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import Product from "@/components/Product"
import PageBar from "@/components/PageBar"
import { getFygrancesCopy } from "@/lib/fygrancesCopy"
import { FAMILY_ORDER, getFamilyCopy, isFamilyId, type FamilyId } from "@/lib/olfactive"

/* ====================================================================
   PAGE FY'GRANCES
   Image du haut · manifeste · un chapitre par catégorie (parfums, soins, maison)
   Les parfums sont classés par famille olfactive, des plus fraîches aux plus profondes.
   ==================================================================== */

const LINE = "color-mix(in srgb, currentColor 22%, transparent)"

// quel type de produit va dans quel chapitre
const CHAPTER_TYPES: { id: "parfums" | "soins" | "maison"; types: string[] }[] = [
  { id: "parfums", types: ["fragrance"] },
  { id: "soins", types: ["skincare"] },
  { id: "maison", types: ["home", "other"] },
]

type Chapter = { id: string; title: string; body: string; image_url: string | null }

function Row({ products }: { products: any[] }) {
  const rowRef = useRef<HTMLDivElement | null>(null)
  return (
    <div
      ref={rowRef}
      className="no-scrollbar flex touch-pan-x snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth overscroll-x-contain pb-2"
    >
      {products.map((product) => (
        <div
          key={product.id}
          className="w-[220px] flex-shrink-0 snap-start sm:w-[260px] md:w-[300px]"
        >
          <Product product={product} scrollRef={rowRef} />
        </div>
      ))}
    </div>
  )
}

function ChapterBlock({
  index,
  title,
  body,
  image,
  children,
}: {
  index: number
  title: string
  body: string
  image: string | null
  children: React.ReactNode
}) {
  const flip = index % 2 === 1
  return (
    <section className="py-14 sm:py-24">
      <div
        className={`mx-auto grid w-11/12 max-w-6xl gap-8 md:items-center md:gap-14 ${
          image ? "md:grid-cols-2" : ""
        }`}
      >
        {image && (
          <div
            className={`relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-neutral-200/60 ${
              flip ? "md:order-2" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" />
          </div>
        )}

        <div className={flip ? "md:order-1" : ""}>
          <p className="text-[11px] uppercase tracking-[0.3em] opacity-60">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h2 className="mt-3 text-3xl font-light tracking-tight sm:text-5xl">{title}</h2>
          {body && (
            <p className="mt-6 max-w-md whitespace-pre-line text-sm leading-relaxed opacity-80 sm:text-base">
              {body}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto mt-12 w-11/12 max-w-6xl">{children}</div>
    </section>
  )
}

export default function FygrancesPage() {
  const locale = useLocale()
  const copy = getFygrancesCopy(locale)

  const [data, setData] = useState<{ page: any; products: any[]; chapters: Chapter[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ gender: "all", sort: "default" })
  const [activeFamily, setActiveFamily] = useState<FamilyId | null>(null)

  useEffect(() => {
    fetch("/api/fygrances")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))

    // arrivée depuis une fiche parfum : /fygrances?family=boise
    try {
      const f = new URLSearchParams(window.location.search).get("family")
      if (isFamilyId(f)) setActiveFamily(f)
    } catch {}
  }, [])

  const filtered = useMemo(() => {
    const list = (data?.products ?? [])
      .filter((p) => filters.gender === "all" || p.gender === filters.gender)
      .slice()
    if (filters.sort === "price-asc") list.sort((a, b) => a.price - b.price)
    if (filters.sort === "price-desc") list.sort((a, b) => b.price - a.price)
    if (filters.sort === "newest")
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return list
  }, [data, filters])

  const chapterData = (id: string) => data?.chapters?.find((c) => c.id === id)

  // parfums par famille
  const fragrances = filtered.filter((p) => p.product_type === "fragrance")
  const familiesPresent = FAMILY_ORDER.filter((f) => fragrances.some((p) => p.olfactive_family === f))
  const withoutFamily = fragrances.filter((p) => !isFamilyId(p.olfactive_family))

  const used = new Set(CHAPTER_TYPES.flatMap((c) => c.types))
  const others = filtered.filter((p) => !used.has(p.product_type ?? "clothing"))

  const page = data?.page
  const heroImage: string | null = page?.hero_image ?? null

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen" />
      </>
    )
  }

  let chapterIndex = 0

  return (
    <>
      <Navbar />

      {/* ================= IMAGE DU HAUT ================= */}
      {heroImage && (
        <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[8/5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt="FY'grances" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 flex items-end">
            <div className="p-4 pb-4 sm:p-10">
              <h1 className="font-dior text-5xl font-bold leading-none tracking-tight text-white sm:text-7xl">
                FY&apos;grances
              </h1>
            </div>
          </div>
        </div>
      )}

      <div className={heroImage ? "" : "pt-24"}>
        <PageBar trail={[{ label: "FY'grances" }]} filters={filters} setFilters={setFilters} />
      </div>

      {/* ================= MANIFESTE ================= */}
      <section className="mx-auto w-11/12 max-w-2xl py-20 sm:py-28">
        <p className="mb-8 text-[11px] uppercase tracking-[0.3em] opacity-60">{copy.eyebrow}</p>
        <div className="space-y-6 text-base leading-relaxed opacity-90 sm:text-lg">
          {copy.manifesto.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        <p className="mt-14 text-3xl font-light leading-tight tracking-tight sm:text-5xl">
          {copy.closing.map((word, i) => (
            <span key={i} className="block">
              {word}
            </span>
          ))}
        </p>
      </section>

      {/* ================= CHAPITRES ================= */}
      {CHAPTER_TYPES.map((ch) => {
        const products = filtered.filter((p) => ch.types.includes(p.product_type ?? "clothing"))
        if (products.length === 0) return null

        const row = chapterData(ch.id)
        const title = row?.title?.trim() || copy.chapters[ch.id].title
        const body = row?.body?.trim() || copy.chapters[ch.id].body
        const index = chapterIndex++

        return (
          <ChapterBlock key={ch.id} index={index} title={title} body={body} image={row?.image_url ?? null}>
            {ch.id === "parfums" ? (
              <div>
                {/* Familles : pastilles */}
                {familiesPresent.length > 0 && (
                  <div className="mb-12">
                    <p className="mb-4 text-[11px] uppercase tracking-[0.3em] opacity-60">
                      {copy.familiesTitle}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[null, ...familiesPresent].map((f) => {
                        const active = activeFamily === f
                        return (
                          <button
                            key={f ?? "all"}
                            type="button"
                            onClick={() => setActiveFamily(f)}
                            className="cursor-pointer touch-manipulation rounded-full px-4 py-2 text-xs transition active:scale-95"
                            style={
                              active
                                ? { background: "var(--foreground)", color: "var(--background)", border: "1px solid transparent" }
                                : { background: "transparent", color: "inherit", border: `1px solid ${LINE}` }
                            }
                          >
                            {f ? getFamilyCopy(f, locale).name : copy.allFamilies}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Une rangée par famille */}
                <div className="space-y-14">
                  {familiesPresent
                    .filter((f) => !activeFamily || activeFamily === f)
                    .map((f) => {
                      const fam = getFamilyCopy(f, locale)
                      return (
                        <div key={f}>
                          <h3 className="text-xl font-light tracking-tight sm:text-2xl">{fam.name}</h3>
                          <p className="mb-6 mt-1 max-w-lg text-xs opacity-65 sm:text-sm">{fam.line}</p>
                          <Row products={fragrances.filter((p) => p.olfactive_family === f)} />
                        </div>
                      )
                    })}

                  {!activeFamily && withoutFamily.length > 0 && (
                    <div>
                      {familiesPresent.length > 0 && (
                        <h3 className="mb-6 text-xl font-light tracking-tight sm:text-2xl">
                          {copy.otherFamily}
                        </h3>
                      )}
                      <Row products={withoutFamily} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Row products={products} />
            )}
          </ChapterBlock>
        )
      })}

      {others.length > 0 && (
        <ChapterBlock index={chapterIndex++} title={copy.moreTitle} body="" image={null}>
          <Row products={others} />
        </ChapterBlock>
      )}

      {filtered.length === 0 && (
        <p className="mx-auto w-11/12 max-w-2xl pb-20 text-center text-sm opacity-60">—</p>
      )}

      <div className="pb-32" />
      <Footer />
    </>
  )
}
