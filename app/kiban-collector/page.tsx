"use client"

import { useEffect, useLayoutEffect, useState } from "react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import Product from "@/components/Product"
import ProductFilters from "@/components/ProductFilters"
import KibanLogo from "@/components/KibanLogo"
import { useSiteCopy } from "@/lib/siteCopy"

/* ====== À MODIFIER FACILEMENT ====== */

// Image par défaut (si aucune image n'est choisie dans l'admin > Images de garde)
const HERO_IMAGE = "/images/kiban-collector.jpg"

const TITLE = "KIBAN COLLECTOR"

// Collection créée dans l'admin (lien = kiban-collector) qui contient les produits
const COLLECTION_SLUG = "kiban-collector"

/* =================================== */

export default function KibanCollectorPage() {
  const copy = useSiteCopy()
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

    return () => {
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

      {/* ================= PRODUITS ================= */}
      <div className="relative px-6 pt-20 pb-44">
        {products.length > 0 && (
          <>
            <ProductFilters filters={filters} setFilters={setFilters} />
            <div className="relative top-12">
              <div
                className="
                  grid
                  grid-cols-2
                  gap-x-4 gap-y-8
                  md:grid-cols-3
                  lg:grid-cols-4
                "
              >
                {filteredProducts.map((product) => (
                  <Product key={product.id} product={product} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </>
  )
}
