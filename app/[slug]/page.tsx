"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import Product from "@/components/Product"
import ProductFilters from "@/components/ProductFilters"
import StoryBar from "@/components/Stories/StoryBar"
import { ProductType } from "@/types/product"
import ThemeToggle from "@/components/ThemeToggle"
import { useTranslations } from "next-intl"

type SectionType = {
  id: string
  title: string
  display_order: number
  section_products: {
    display_order: number
    product: ProductType
  }[]
}

export default function CollectionPage() {
  const t = useTranslations("Pages")
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement | null>(null)


  const [page, setPage] = useState<any>(null)
  const [sections, setSections] = useState<SectionType[]>([])
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    gender: "all",
    sort: "default",
  })

  /* FETCH DATA */

  useEffect(() => {
    if (!slug) return

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/pages/${slug}`)

        if (!res.ok) throw new Error("Page not found")

        const data = await res.json()

        setPage(data.page)
        setSections(data.sections ?? [])
      } catch (err) {
        console.error(err)
        router.replace("/404")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug, router])

  /* FILTER + SORT */

  const applyFilters = (products: ProductType[]) => {
    return products
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
  }

  /* LOADING */

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="h-[100vh] w-[100vw] font-pagetitle flex items-center justify-center text-neutral-500 text-4xl">
          Fysu
        </div>
        <Footer />
      </>
    )
  }

  if (!page) {
    return (
      <>
        <Navbar />
        <div className="p-20 text-center text-neutral-500">
          {t("pageNotFound")}
        </div>
        <Footer />
      </>
    )
  }

  const hasHero = Boolean(page.hero_image)
  const visibleSections = sections
    .sort((a, b) => a.display_order - b.display_order)
    .map((section) => {
      const products = section.section_products
        ?.sort((a, b) => a.display_order - b.display_order)
        .map((sp) => sp.product)

      return {
        ...section,
        filteredProducts: applyFilters(products ?? []),
      }
    })
    .filter((section) => section.filteredProducts.length > 0)


  return (
    <>
      <Navbar />

      {/* ================= MOBILE / TABLETTE ================= */}
      <div className="hidden">

        {/* STORIES */}
        <StoryBar pageSlug={slug} />

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

        {/* STORIES */}
        <StoryBar pageSlug={slug} />

      </div>

      {/* CONTENT */}
      <div
        className={`relative p-6 pb-44 ${
          hasHero ? "top-28" : "top-24"
        }`}
      >
        {sections.length === 0 ? (
          <p className="text-neutral-500">
            {t("noProducts")}
          </p>
        ) : (
          <>
            <ProductFilters filters={filters} setFilters={setFilters} />

            {visibleSections
              .map((section, sectionIndex) => {
                return (
                  <div key={section.id} className="mb-20">

                    {/* SECTION TITLE */}
                    <h2 className="text-xl font-pagetitle mb-6">
                      {section.title}
                    </h2>

                    {/* PRODUCTS HORIZONTAL SCROLL */}
                    <div className="relative">
                      <div 
                        ref={scrollRef}
                        className="
                          flex
                          gap-6
                          overflow-x-auto
                          scroll-smooth
                          snap-x snap-mandatory
                          no-scrollbar
                          pb-2
                          touch-pan-x
                          overscroll-x-contain
                        "
                      >

                        {section.filteredProducts.map((product, index) => (
                          <div
                            key={product.id}
                            className="
                              min-w-[220px] 
                              sm:min-w-[260px] 
                              md:min-w-[300px] 
                              snap-start
                              flex-shrink-0
                            "
                          >
                            <Product
                              product={product}
                              scrollRef={scrollRef}
                              isFirst={sectionIndex === 0 && index === 0}
                            />
                          </div>
                        ))}

                      </div>
                    </div>
                  </div>
                )
              })}
          </>
        )}
      </div>

      <ThemeToggle />
      <Footer />
    </>
  )
}
