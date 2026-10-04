"use client"

import { useParams, notFound, useSearchParams, useRouter } from "next/navigation"
import { useEffect, useLayoutEffect, useState, useMemo, useRef } from "react"
import Link from "next/link"
import type { ProductType, ProductSize, ProductColor } from "@/types/product"
import Product from "@/components/Product"
import WishlistHeart from "@/components/WishlistHeart"
import Image from "next/image"
import { Collapse, Modal } from "antd"
import type { CollapseProps } from "antd"
import AddToCartButton from "@/components/ui/AddToCartButton"
import AvailabilityBlock from "@/components/Product/AvailabilityBlock"
import SizeNotify from "@/components/Product/SizeNotify"
import ShareButton from "@/components/Profile/ShareButton"
import ProductInfoBlocks from "@/components/Product/ProductInfoBlocks"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { getTypeCopy } from "@/lib/productTypes"
import { BRANDS, WAVE, getBrandId } from "@/lib/brands"
import { waveColors } from "@/lib/waveColor"
import WaveLoader from "@/components/WaveLoader"
import SizeGuideView from "@/components/SizeGuideView"
import { cleanSizeGuide } from "@/lib/sizeGuide"
import AutoContrast from "@/components/AutoContrast"
import { getColorCopy } from "@/lib/colorCopy"
import { getFamilyCopy, isFamilyId } from "@/lib/olfactive"
import { getFygrancesCopy } from "@/lib/fygrancesCopy"
import {
  formatReleaseDate,
  getAvailabilityCopy,
  getEffectiveAvailability,
  isBuyable,
} from "@/lib/availability"

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

  const colorParam: string | null = searchParams?.get("color") ?? null

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


  /* ================= MARQUE (style de la fiche) ================= */

  const brandId = getBrandId(product?.brand)
  const wc = waveColors(product?.wave_bg)

  // The Wave et Kiban Collector ont leur propre ambiance (comme leurs pages)
  useLayoutEffect(() => {
    if (brandId === "fysu") return
    const html = document.documentElement
    const extra = brandId === "thewave" ? ["dark", "brand-page", "wave-page"] : ["dark", "brand-page"]
    html.classList.add(...extra)
    // la barre de navigation et le pied de page s'adaptent à la marque
    html.setAttribute("data-brand", brandId)

    return () => {
      html.removeAttribute("data-brand")
      html.classList.remove("brand-page", "wave-page")
      let saved: string | null = null
      try {
        saved = localStorage.getItem("theme")
      } catch {}
      if (saved !== "dark") html.classList.remove("dark")
    }
  }, [brandId])

  /* ================= DERIVED DATA ================= */

  const colorList: ProductColor[] = useMemo(
    () => [...(product?.product_colors ?? [])].sort((a, b) => a.display_order - b.display_order),
    [product]
  )

  // stock total de chaque couleur (tailles actives)
  const stockByColor = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of product?.product_sizes ?? []) {
      if (!s.is_active || !s.color_id) continue
      map[s.color_id] = (map[s.color_id] ?? 0) + Math.max(0, s.stock)
    }
    return map
  }, [product])

  // couleur affichée : celle de l'adresse (?color=), sinon la première en stock
  const selectedColor: ProductColor | null = useMemo(() => {
    if (colorList.length === 0) return null
    const q = colorParam?.toLowerCase()
    return (
      colorList.find((c) => c.hex.toLowerCase() === q) ??
      colorList.find((c) => (stockByColor[c.id] ?? 0) > 0) ??
      colorList[0]
    )
  }, [colorList, colorParam, stockByColor])

  const filteredImages = useMemo(() => {
    if (!product) return []
    if (!selectedColor) return product.product_images

    const matching = product.product_images.filter(
      (img) => img.color && img.color.toLowerCase() === selectedColor.hex.toLowerCase()
    )
    return matching.length > 0 ? matching : product.product_images
  }, [product, selectedColor])

  // tailles de la couleur choisie (une ligne de stock = une couleur + une taille)
  const sizesForColor: ProductSize[] = useMemo(() => {
    if (!product?.product_sizes) return []
    return product.product_sizes.filter(
      (s) => s.is_active && (!selectedColor || !s.color_id || s.color_id === selectedColor.id)
    )
  }, [product, selectedColor])

  const availableSizes: ProductSize[] = useMemo(
    () => sizesForColor.filter((s) => s.stock > 0),
    [sizesForColor]
  )

  // Quand on change de couleur : la taille choisie n'existe peut-être plus.
  // Une seule taille disponible (taille unique, un seul volume…) : on la sélectionne d'office
  useEffect(() => {
    if (selectedSizeId && availableSizes.some((s) => s.id === selectedSizeId)) return

    if (availableSizes.length === 1) {
      setSelectedSizeId(availableSizes[0].id)
      setSelectedSizeLabel(availableSizes[0].size)
    } else if (selectedSizeId) {
      setSelectedSizeId(null)
      setSelectedSizeLabel(null)
    }
  }, [availableSizes, selectedSizeId])

  /* ================= HANDLERS ================= */

  const handleColorClick = (color: ProductColor) => {
    const params = new URLSearchParams(window.location.search)
    params.set("color", color.hex)
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

  // Mode de disponibilité réellement appliqué (achat, précommande, me prévenir, devis, à venir, épuisé)
  const mode = getEffectiveAvailability(product)
  const canBuy = isBuyable(mode)

  const colorCopy = getColorCopy(locale)
  const family = isFamilyId(product.olfactive_family) ? getFamilyCopy(product.olfactive_family, locale) : null
  const familyLabel = getFygrancesCopy(locale).familyLabel
  const brand = BRANDS[brandId]
  const hasColors = colorList.length > 1
  // achat possible mais plus rien en stock dans cette couleur
  const colorSoldOut = canBuy && availableSizes.length === 0

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
    {brandId !== "fysu" && (
      <style>{`
        html.brand-page button[aria-pressed] { display: none; }
        ${
          brandId === "thewave"
            ? `
        html.wave-page { background: ${wc.bg}; }
        html.wave-page body { background: transparent !important; color: ${wc.ink}; }
        html.wave-page .bg-background { background-color: transparent !important; }
        html.wave-page .flower-light,
        html.wave-page .flower-dark { display: none !important; }
        html.wave-page .ant-collapse,
        html.wave-page .ant-collapse-header,
        html.wave-page .ant-collapse-header-text,
        html.wave-page .ant-collapse-content,
        html.wave-page .ant-collapse-content-box,
        html.wave-page .ant-collapse-expand-icon { color: ${wc.ink} !important; }
        `
            : ""
        }
      `}</style>
    )}

    {brandId === "thewave" && (
      <div className="fixed inset-0 -z-10" style={{ background: wc.bg }} aria-hidden="true">
        <svg
          className="h-full w-full"
          viewBox="0 0 1821 2576"
          preserveAspectRatio="xMidYMax slice"
        >
          <path d={WAVE.PATH} fill={wc.wave} />
        </svg>
      </div>
    )}

    {brandId === "thewave" && <WaveLoader />}
    {brandId === "thewave" && <AutoContrast bg={wc.bg} />}

    <div className="max-w-6xl mx-auto py-12 relative top-0 sm:top-24">
      <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-start">
  
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
        <div className="space-y-10 sticky top-24 lg:top-[14vh] self-start w-11/12 mx-auto lg:pr-8">
  
          {brand.path && (
            <Link
              href={brand.path}
              style={{ color: "inherit" }}
              className="block text-[10px] font-light uppercase tracking-[0.3em] opacity-50 hover:opacity-100 transition"
            >
              ← {colorCopy.backTo} {brand.label}
            </Link>
          )}

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                {product.name}
              </h1>
              <WishlistHeart productId={product.id} size={24} className="-mr-1.5 -mt-1 shrink-0" />
            </div>

            {product.evocation && (
              <p className="text-xs font-light italic opacity-60">{product.evocation}</p>
            )}

            <p className="pt-2 text-base font-light tracking-wide">
              {format.number(product.price, {
                style: "currency",
                currency: "EUR",
              })}
            </p>
          </div>

          <p className="max-w-md border-t border-foreground/15 pt-8 text-[13px] font-light leading-[1.9] whitespace-pre-line opacity-80">
            {formatText(product.description)}
          </p>

          {family && (
            <Link
              href={`/fygrances?family=${family.id}`}
              style={{ color: "inherit", borderTop: "1px solid color-mix(in srgb, currentColor 15%, transparent)", borderBottom: "1px solid color-mix(in srgb, currentColor 15%, transparent)" }}
              className="block py-4 transition hover:opacity-70"
            >
              <span className="block text-[10px] font-light uppercase tracking-[0.3em] opacity-50">{familyLabel}</span>
              <span className="mt-1 block text-lg font-light tracking-tight">{family.name}</span>
              <span className="mt-0.5 block text-xs opacity-70">{family.line}</span>
            </Link>
          )}
  
          {/* COLORS */}
          {hasColors && (
            <div className="space-y-3 border-t border-foreground/15 pt-8">
              <p className="text-[11px] font-light uppercase tracking-[0.25em] opacity-60">
                {colorCopy.color} <span className="ml-2 normal-case tracking-normal opacity-100">{selectedColor?.name}</span>
              </p>

              <div className="flex flex-wrap gap-3">
                {colorList.map((c) => {
                  const isSelected = selectedColor?.id === c.id
                  const isOut = (stockByColor[c.id] ?? 0) <= 0

                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={c.name}
                      aria-label={c.name}
                      onClick={() => handleColorClick(c)}
                      className={`relative h-8 w-8 cursor-pointer rounded-full border border-black/20 transition ${
                        isSelected
                          ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {isOut && (
                        <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
                          <span className="block h-px w-[150%] rotate-45 bg-foreground/70" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
  
          {/* SIZES */}
          {canBuy && sizesForColor.length > 0 && (
            <div className="space-y-3 border-t border-foreground/15 pt-8">

              <div className="flex justify-between items-center">
                <p className="text-[11px] font-light uppercase tracking-[0.25em] opacity-60">{copy.sizeTitle ?? t("size")}</p>

                {copy.sizeGuide && (
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen(true)}
                    className="text-[11px] font-light uppercase tracking-[0.2em] underline underline-offset-4 text-foreground/60 hover:text-foreground cursor-pointer"
                  >
                    {t("sizeGuide")}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {sizesForColor.map((s) => {
                  const isSelected = selectedSizeId === s.id
                  const isOut = s.stock <= 0

                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isOut}
                      onClick={() => {
                        setSelectedSizeId(s.id)
                        setSelectedSizeLabel(s.size)
                      }}
                      className={`
                        min-w-[48px]
                        px-4 py-2
                        text-sm tracking-wide
                        border rounded-none
                        transition-all duration-200
                        ${
                          isOut
                            ? "cursor-not-allowed border-foreground/10 text-foreground/30 line-through"
                            : isSelected
                              ? "border-foreground bg-foreground text-background"
                              : "border-foreground/20 text-foreground hover:border-foreground"
                        }
                      `}
                    >
                      {s.size}
                    </button>
                  )
                })}
              </div>

              {canBuy && !colorSoldOut && sizesForColor.some((s) => s.stock <= 0) && (
                <div className="mt-4">
                  <SizeNotify
                    product={product}
                    sizes={sizesForColor.filter((s) => s.stock <= 0).map((s) => s.size)}
                    colorName={hasColors ? selectedColor?.name ?? null : null}
                  />
                </div>
              )}

            </div>
          )}
  
                    <div className="relative liquid-glass flex flex-col gap-4 p-4 rounded-2xl">
            {canBuy && colorSoldOut ? (
              <div className="w-full space-y-3">
                <div
                  aria-disabled="true"
                  className="w-full cursor-not-allowed border border-neutral-300 py-3 text-center text-sm font-medium tracking-wide text-foreground/50"
                >
                  {colorCopy.colorSoldOut}
                </div>
                <SizeNotify
                  product={product}
                  sizes={sizesForColor.map((s) => s.size)}
                  colorName={hasColors ? selectedColor?.name ?? null : null}
                />
              </div>
            ) : canBuy ? (
              <AddToCartButton
                product={product}
                selectedSizeId={selectedSizeId}
                selectedSizeLabel={selectedSizeLabel}
                mode={mode === "available" ? "available" : "preorder"}
                color={
                  hasColors && selectedColor
                    ? {
                        name: selectedColor.name,
                        hex: selectedColor.hex,
                        imageUrl: filteredImages[0]?.url ?? null,
                      }
                    : null
                }
              />
            ) : (
              <AvailabilityBlock product={product} mode={mode} />
            )}

            {mode === "preorder" && product.release_date && (
              <p className="-mt-1 text-center text-xs text-foreground/60">
                {getAvailabilityCopy(locale).expected.replace(
                  "{date}",
                  formatReleaseDate(product.release_date, locale)
                )}
              </p>
            )}
    
            {items.length > 0 && <Collapse items={items} bordered={false} ghost />}
          </div>

          <div className="border-t border-foreground/15 pt-6">
            <ShareButton productId={product.id} slug={slug} />
          </div>
  
        </div>
      </div>

      {product.product_info_blocks?.length > 0 && (
        <ProductInfoBlocks blocks={product.product_info_blocks} />
      )}
  
      {/* ================= SUGGESTIONS ================= */}
  
      {product.product_suggestions?.length > 0 && (
        <section className="mt-32 w-11/12 mx-auto sm:mt-48">
          <h2 className="mb-12 text-start text-3xl font-bold tracking-tight sm:mb-16 sm:text-5xl">
            {t("youMayAlsoLike")}
          </h2>

          <div ref={scrollRef} className="flex gap-8 overflow-x-auto overflow-y-hidden no-scrollbar overscroll-x-contain touch-pan-x">
            {product.product_suggestions.map((p) => (
              <div key={p.id} className="flex-shrink-0 w-[280px]">
                <Product showArrows product={p} scrollRef={scrollRef} />
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
      width={560}
    >

      {product.size_guide_image_url || cleanSizeGuide(product.size_guide) ? (
        <SizeGuideView
          guide={cleanSizeGuide(product.size_guide)}
          imageUrl={product.size_guide_image_url}
          lang={locale === "fr" ? "fr" : "en"}
        />
      ) : (
        <p>{t("noSizeGuide")}</p>
      )}

    </Modal>
    </>
  )
}
