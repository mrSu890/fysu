"use client"

import { useParams, notFound, useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, useMemo, useRef } from "react"
import type { ProductType, ProductSize } from "@/types/product"
import Product from "@/components/Product"
import Image from "next/image"
import { Collapse, Modal } from "antd"
import type { CollapseProps } from "antd"
import AddToCartButton from "@/components/ui/AddToCartButton"
import ProductInfoBlocks from "@/components/Product/ProductInfoBlocks"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { getTypeCopy } from "@/lib/productTypes"

export default function ProductClient() {
  const t = useTranslations("Product")
  const format = useFormatter()
  const locale = useLocale()
  const { slug } = useParams() as { slug: string }
  const searchParams = useSearchParams()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const [product, setProduct] = useState<ProductType | null>(null)
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null)
  const [selectedSizeLabel, setSelectedSizeLabel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)

  const selectedColor: string | null = searchParams?.get("color")

  /* ================= FETCH ================= */

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${slug}`)
        if (!res.ok) throw new Error("Product not found")
        const data: ProductType = await res.json()
        setProduct(data)
      } catch {
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }

    if (slug) fetchProduct()
  }, [slug])


  /* ================= DERIVED DATA ================= */

  const filteredImages = useMemo(() => {
    if (!product) return []

    if (!selectedColor) return product.product_images

    return product.product_images.filter(
      (img) =>
        img.color &&
        img.color.toLowerCase() === selectedColor.toLowerCase()
    )
  }, [product, selectedColor])

  const availableColors: string[] = useMemo(() => {
    if (!product) return []

    return Array.from(
      new Set(
        product.product_images
          .map((img) => img.color)
          .filter(Boolean)
      )
    )
  }, [product])

  const availableSizes: ProductSize[] = useMemo(() => {
    if (!product?.product_sizes) return []
  
    return product.product_sizes.filter(
      (s) => s.is_active && s.stock > 0
    )
  }, [product])

  // Une seule taille disponible (taille unique, un seul volume…) : on la sélectionne d'office
  useEffect(() => {
    if (availableSizes.length === 1 && !selectedSizeId) {
      setSelectedSizeId(availableSizes[0].id)
      setSelectedSizeLabel(availableSizes[0].size)
    }
  }, [availableSizes, selectedSizeId])

  /* ================= HANDLERS ================= */

  const handleColorClick = (color: string) => {
    const params = new URLSearchParams(window.location.search)

    if (selectedColor === color) {
      params.delete("color")
    } else {
      params.set("color", color)
    }

    router.replace(`?${params.toString()}`, { scroll: false })
  }

  /* ================= STATES ================= */

    if (loading) return <div className="w-screen h-screen bg-background" />

  if (!product) return notFound()

  const mainImage = filteredImages[0]?.url
  const otherImages = filteredImages.slice(1)

  function formatText(text?: string | null) {
    if (!text) return ""
    return text.replace(/\\n/g, "\n")
  }

  const copy = getTypeCopy(product.product_type, locale)

  const rawItems: { key: string; label: string; text?: string | null }[] = [
    { key: "1", label: copy.details ?? t("details"), text: product.details },
    ...(copy.sizeFit === false
      ? []
      : [{ key: "2", label: copy.sizeFit ?? t("sizeFit"), text: product.size_fit }]),
    ...(copy.care === false
      ? []
      : [{ key: "3", label: copy.care ?? t("careInstructions"), text: product.care_instructions }]),
    { key: "4", label: t("shipping"), text: product.shipping },
  ]

  // on n'affiche que les rubriques remplies
  const items: CollapseProps["items"] = rawItems
    .filter((item) => formatText(item.text).trim() !== "")
    .map((item) => ({
      key: item.key,
      label: item.label,
      children: <p className="whitespace-pre-line">{formatText(item.text)}</p>,
    }))

  /* ================= RENDER ================= */

  return (
    <>
    <div className="max-w-6xl mx-auto py-12 relative top-0 sm:top-24">
      <div className="grid md:grid-cols-2 gap-12 items-start">
  
        {/* ================= IMAGES ================= */}
        <div
          className="
                        space-y-3
            sm:h-auto
            h-[66vh]
            overflow-y-scroll
            sm:overflow-visible
            no-scrollbar
          "
        >

          {/* Grande image principale */}
          {mainImage && (
            <div
              className="
                relative w-full aspect-[3/4] overflow-hidden
                rounded-3xl sm:rounded-none
              "
            >
              <Image
                src={mainImage}
                alt={product.name}
                fill
                className="object-contain"
                priority
              />
            </div>
          )}

          {/* Autres images */}
          {otherImages.length > 0 && (
            <div>
              {/* DESKTOP */}
                            <div className="hidden sm:flex sm:flex-col gap-3">
                {otherImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-[3/4] overflow-hidden"
                  >
                    <Image
                      src={img.url}
                      alt={product.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>

              {/* MOBILE */}
              <div className="sm:hidden flex flex-col gap-3">
                {otherImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-[3/4] overflow-hidden"
                  >
                    <Image
                      src={img.url}
                      alt={product.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
  
        {/* ================= INFO ================= */}
        <div className="space-y-6 sticky top-24 self-start w-11/12 mx-auto">
  
          <h1 className="text-xl font-medium">
            {product.name}
          </h1>

          <p className="text-sm whitespace-pre-line">
            {formatText(product.description)}
          </p>
  
          <p className="text-sm font-bold">
            {format.number(product.price, {
              style: "currency",
              currency: "EUR",
            })}
          </p>
  
          {/* COLORS */}
          {availableColors.length > 0 && (
            <div className="flex gap-3">
              {availableColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorClick(color)}
                  className={`w-7 h-7 rounded-full ${
                    selectedColor === color
                      ? "ring-2 ring-black"
                      : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
  
          {/* SIZES */}
          {availableSizes.length > 0 && (
            <div className="space-y-3">

              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">{copy.sizeTitle ?? t("size")}</p>

                {copy.sizeGuide && (
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen(true)}
                    className="text-sm underline text-foreground hover:text-foreground/60 cursor-pointer"
                  >
                    {t("sizeGuide")}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {availableSizes.map((s) => {
                  const isSelected = selectedSizeId === s.id

                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSizeId(s.id)
                        setSelectedSizeLabel(s.size)
                      }}
                      className={`
                        min-w-[48px]
                        px-4 py-2
                        text-sm tracking-wide
                        border rounded-md
                        transition-all duration-200
                        ${
                          isSelected
                            ? "border-black bg-black text-white"
                            : "border-neutral-300 text-foreground hover:border-black"
                        }
                      `}
                    >
                      {s.size}
                    </button>
                  )
                })}
              </div>

            </div>
          )}
  
                    <div className="relative liquid-glass flex flex-col gap-4 p-4 rounded-2xl">
            <AddToCartButton
              product={product}
              selectedSizeId={selectedSizeId}
              selectedSizeLabel={selectedSizeLabel}
            />
    
            {items.length > 0 && <Collapse items={items} bordered={false} ghost />}
          </div>
  
        </div>
      </div>

      {product.product_info_blocks?.length > 0 && (
        <ProductInfoBlocks blocks={product.product_info_blocks} />
      )}
  
      {/* ================= SUGGESTIONS ================= */}
  
      {product.product_suggestions?.length > 0 && (
        <section className="mt-24 w-11/12 mx-auto">
          <h2 className="text-2xl font-dior text-start mb-12">
            {t("youMayAlsoLike")}
          </h2>

          <div ref={scrollRef} className="flex gap-8 overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain">
            {product.product_suggestions.map((p) => (
              <div key={p.id} className="flex-shrink-0 w-[280px]">
                <Product product={p} scrollRef={scrollRef} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
    <Modal
      open={sizeGuideOpen}
      footer={null}
      onCancel={() => setSizeGuideOpen(false)}
      centered
      width={500}
    >

      {product.size_guide_image_url ? (
        <div className="relative w-full aspect-[3/4]">
          <Image
            src={product.size_guide_image_url}
            alt={t("sizeGuide")}
            fill
            className="object-contain"
          />
        </div>
      ) : (
        <p>{t("noSizeGuide")}</p>
      )}

    </Modal>
    </>
  )
}
