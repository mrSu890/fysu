"use client"

import { useEffect, useState } from "react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import Product from "@/components/Product"
import ProductFilters from "@/components/ProductFilters"
import ThemeToggle from "@/components/ThemeToggle"

/* ====== À MODIFIER FACILEMENT ====== */

// Photo de la zone arrondie : à déposer dans public/images
const HERO_IMAGE = "/images/kiban-collector.jpg"

const TITLE = "KIBAN COLLECTOR"

const TEXT =
  "Kiban Collector brings together the essential pieces of the Kiban universe. A selection made for collectors: objects designed with care, made to last and to be kept."

// Collection créée dans l'admin (lien = kiban-collector) qui contient les produits
const COLLECTION_SLUG = "kiban-collector"

/* =================================== */

export default function KibanCollectorPage() {
  const [products, setProducts] = useState<any[]>([])
  const [heroFailed, setHeroFailed] = useState(false)
  const [filters, setFilters] = useState({
    gender: "all",
    sort: "default",
  })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/collections/${COLLECTION_SLUG}`)
        if (!res.ok) return
        const data = await res.json()
        setProducts(data.products ?? [])
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

      {/* ================= IMAGE ARRONDIE + TEXTE ================= */}
      <section className="w-11/12 max-w-6xl mx-auto pt-28 sm:pt-32">
        <div className="relative w-full aspect-[3/2] overflow-hidden rounded-2xl bg-neutral-200">
          {!heroFailed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={HERO_IMAGE}
              alt={TITLE}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setHeroFailed(true)}
            />
          )}
        </div>

        <div className="mx-auto mt-12 sm:mt-16 max-w-3xl text-center">
          <h1 className="font-serif text-3xl sm:text-5xl uppercase tracking-wide leading-tight">
            {TITLE}
          </h1>

          <p className="mt-6 text-sm sm:text-base leading-relaxed text-foreground/80">
            {TEXT}
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

      <ThemeToggle />
      <Footer />
    </>
  )
}
