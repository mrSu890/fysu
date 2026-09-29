"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import Product from "@/components/Product"
import PageBar from "@/components/PageBar"
import ProductFilters from "@/components/ProductFilters"
import ThemeToggle from "@/components/ThemeToggle"
import StoryBar from "@/components/Stories/StoryBar"
import { useTranslations } from "next-intl"

export default function CollectionPage() {
  const t = useTranslations("Pages")
  const tn = useTranslations("Navigation")
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

    const isFlowersBloomCollection = false
  const [page, setPage] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    gender: "all",
    sort: "default",
  })
  
  useEffect(() => {
    if (!slug) return
  
    const fetchData = async () => {
      try {
  
        const fetchPromise = fetch(`/api/collections/${slug}`).then(
          async (res) => {
            if (!res.ok) throw new Error("Collection not found")
            const data = await res.json()
            setPage(data.page)
            setProducts(data.products ?? [])
          }
        )
  
        if (isFlowersBloomCollection) {
          await Promise.all([
            fetchPromise,
            new Promise((resolve) => setTimeout(resolve, 2400)),
          ])
        } else {
          await fetchPromise
        }
      } catch (err) {
        console.error(err)
        router.replace("/404")
      } finally {
        setLoading(false)
      }
    }
  
    fetchData()
  }, [slug, router, isFlowersBloomCollection]) 

  const filteredProducts = products
  .filter((p) => {
    if (filters.gender !== "all" && p.gender !== filters.gender)
      return false
    return true
  })
  .sort((a, b) => {
    if (filters.sort === "price-asc") return a.price - b.price
    if (filters.sort === "price-desc") return b.price - a.price
    if (filters.sort === "newest") {
      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      )
    }
    return 0
  })


    if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen" />
      </>
    )
  }


  if (!page) {
    return (
      <>
        <Navbar />
        <div className="p-20 text-center text-neutral-500">
          {t("collectionNotFound")}
        </div>
        <Footer />
      </>
    )
  }

  const hasHero = Boolean(page.hero_image)

    return (
      <>
        <Navbar />
    
        {/* ================= MOBILE / TABLETTE ================= */}
        <div className="hidden">
    
          {/* STORIES */}
          <StoryBar collectionSlug={slug} />
    
          {/* TITLE */}
          <div className="px-6 pt-24">
            <h1 className="text-2xl font-pagetitle font-thin text-center">
              {page.title}
            </h1>
          </div>
    
          {/* IMAGE */}
          {hasHero && (
            <div className="relative w-full h-[55vh] mt-6">
              <Image
                src={page.hero_image}
                alt={page.title}
                fill
                priority
                className="object-contain"
              />
            </div>
          )}
        </div>
    
        {/* ================= DESKTOP ================= */}
        <div className="block">
    
          {/* HERO */}
          {hasHero && (
            <div className="relative w-full aspect-[4/3] sm:aspect-[8/5] overflow-hidden">
              <Image
                src={page.hero_image}
                alt={page.title}
                fill
                priority
                className="object-cover"
              />

              {/* Overlay léger pour lisibilité */}
              <div className="absolute inset-0 bg-black/20" />

              {/* TITLE */}
              <div className="absolute inset-0 flex items-end">
                <div className="pb-4 pl-4 pr-4 sm:pb-10 sm:pl-10 sm:pr-10">
                  <h1 className={`text-white font-dior font-bold tracking-tight leading-none ${(page.title?.length ?? 0) <= 8 ? "text-5xl sm:text-7xl" : (page.title?.length ?? 0) <= 14 ? "text-4xl sm:text-6xl" : (page.title?.length ?? 0) <= 20 ? "text-3xl sm:text-5xl" : "text-2xl sm:text-4xl"}`}>
                    {page.title}
                  </h1>
                </div>
              </div>
            </div>
          )}

          {/* BANDE BLANCHE : chemin / interrupteur / filtres */}
          {hasHero && (
            <PageBar
              trail={[{ label: tn("collections") }, { label: page.title }]}
              filters={products.length > 0 ? filters : undefined}
              setFilters={products.length > 0 ? setFilters : undefined}
            />
          )}
    
          {/* STORIES */}
          <StoryBar collectionSlug={slug} />
    
        </div>
    
        {/* CONTENT */}
        <div className={`relative px-6 pb-44 ${hasHero ? "pt-8" : "pt-12"}`}>
          {products.length === 0 ? (
            <p className="text-neutral-500 font-dior">
              {t("noProducts")}
            </p>
          ) : (
            <>
              {!hasHero && (
                <ProductFilters filters={filters} setFilters={setFilters} />
              )}
              <div className={`relative ${hasHero ? "top-4" : "top-12"}`}>
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
    
        {!hasHero && <ThemeToggle />}
        <Footer />
      </>
    )
  
}
