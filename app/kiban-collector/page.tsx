"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import Product from "@/components/Product"
import ProductFilters from "@/components/ProductFilters"
import KibanLogo from "@/components/KibanLogo"
import { useSiteCopy } from "@/lib/siteCopy"
import { getKibanCategories } from "@/lib/kibanCategories"

/* ====== À MODIFIER FACILEMENT ====== */

// Image par défaut (si aucune image n'est choisie dans l'admin > Images de garde)
const HERO_IMAGE = "/images/kiban-collector.jpg"

const TITLE = "KIBAN COLLECTOR"

// Collection créée dans l'admin (lien = kiban-collector) qui contient les produits
const COLLECTION_SLUG = "kiban-collector"

/* =================================== */

/* Une rangée de produits qui défile (même comportement que les autres pages) */
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
          <Product showArrows product={product} scrollRef={rowRef} />
        </div>
      ))}
    </div>
  )
}

export default function KibanCollectorPage() {
  const copy = useSiteCopy()
  const locale = useLocale()
  const [products, setProducts] = useState<any[]>([])
  const [heroImage, setHeroImage] = useState<string | null>(null)
  const [heroFailed, setHeroFailed] = useState(false)
  const [filters, setFilters] = useState({
    gender: "all",
    sort: "default",
  })

  // Cette page existe uniquement en mode sombre
  useLayoutEffect(() => {
    const html = document.documentElement
    html.classList.add("dark")
    // marque la page : elle garde son fond sombre d'origine
    html.classList.add("kiban-dark")

    return () => {
      html.classList.remove("kiban-dark")
      // En partant, on remet le mode choisi par le visiteur
      let saved: string | null = null
      try {
        saved = localStorage.getItem("theme")
      } catch {}
      if (saved !== "dark") html.classList.remove("dark")
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/collections/${COLLECTION_SLUG}`)
        if (!res.ok) return
        const data = await res.json()
        setProducts(data.products ?? [])
        // image de garde choisie dans l'admin (sinon l'image par défaut)
        if (data.page?.hero_image) setHeroImage(data.page.hero_image)
      } catch (err) {
        console.error(err)
      }
    }

    load()
  }, [])

  const filteredProducts = products
    .filter((p) => {
      if (filters.gender !== "all" && p.gender !== filters.gender) return false
      return true
    })
    .sort((a, b) => {
      if (filters.sort === "price-asc") return a.price - b.price
      if (filters.sort === "price-desc") return b.price - a.price
      if (filters.sort === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      }
      return 0
    })

  // produits rangés par catégorie (objets collector, vêtements, accessoires…)
  const categories = useMemo(() => {
    const defs = getKibanCategories(locale)
    return defs
      .map((cat) => ({
        ...cat,
        products: filteredProducts.filter((p) => cat.types.includes(p.product_type ?? "clothing")),
      }))
      .filter((cat) => cat.products.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, products, filters])

  const goTo = (id: string) => {
    document.getElementById(`kiban-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <Navbar />

      {/* ================= IMAGE ARRONDIE + LOGO + TEXTE ================= */}
      <section className="w-11/12 max-w-6xl mx-auto pt-28 sm:pt-32">
        <div className="relative w-full aspect-[3/2] overflow-hidden rounded-2xl bg-neutral-200">
          {!heroFailed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage ?? HERO_IMAGE}
              alt={TITLE}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => {
                // si l'image de l'admin ne charge pas, on retombe sur l'image par défaut
                if (heroImage) setHeroImage(null)
                else setHeroFailed(true)
              }}
            />
          )}
        </div>

        <div className="mx-auto mt-12 sm:mt-16 max-w-3xl text-center">
          <h1 className="sr-only">{TITLE}</h1>

          {/* Le logo remplace le titre écrit */}
          <div className="flex justify-center">
            <KibanLogo tone="white" className="h-16 sm:h-24 w-auto" />
          </div>

          <p className="mt-8 text-sm sm:text-base leading-relaxed text-foreground/80">
            {copy.kibanText}
          </p>
        </div>
      </section>

      {/* ================= PRODUITS PAR CATÉGORIE ================= */}
      <div className="relative px-6 pt-16 pb-44">
        {products.length > 0 && (
          <>
            <ProductFilters filters={filters} setFilters={setFilters} />

            {/* raccourcis vers les catégories */}
            {categories.length > 1 && (
              <div className="mx-auto mb-4 mt-6 flex w-full max-w-6xl flex-wrap justify-center gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => goTo(cat.id)}
                    className="cursor-pointer touch-manipulation rounded-full px-4 py-2 text-xs transition active:scale-95"
                    style={{ border: "1px solid color-mix(in srgb, currentColor 25%, transparent)" }}
                  >
                    {cat.title}
                  </button>
                ))}
              </div>
            )}

            {categories.map((cat, index) => (
              <section
                key={cat.id}
                id={`kiban-${cat.id}`}
                className="mx-auto w-full max-w-6xl scroll-mt-28 pt-16 sm:pt-24"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] opacity-60">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-3 text-3xl font-light tracking-tight sm:text-5xl">{cat.title}</h2>
                <p className="mb-10 mt-4 max-w-md text-sm leading-relaxed opacity-75 sm:text-base">
                  {cat.body}
                </p>
                <Row products={cat.products} />
              </section>
            ))}
          </>
        )}
      </div>

      <Footer />
    </>
  )
}
