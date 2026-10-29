"use client"

import { lowStockCount, lowStockText } from "@/lib/lowStock"
import { useParams, notFound, useSearchParams, useRouter } from "next/navigation"
import { useEffect, useLayoutEffect, useState, useMemo, useRef } from "react"
import Link from "next/link"
import type { ProductType, ProductSize, ProductColor } from "@/types/product"
import Product from "@/components/Product"
import WishlistHeart from "@/components/WishlistHeart"
import Image from "next/image"
import LampSwitch from "@/components/LampSwitch"
import { useLamp } from "@/lib/lamp"
import { Collapse } from "antd"
import { useCart } from "@/context/CartContext"
import { fetchProductCached } from "@/lib/productCache"
import RecentlyViewed from "@/components/RecentlyViewed"
import { rememberProduct } from "@/lib/recentlyViewed"
import DeliveryNote from "@/components/Product/DeliveryNote"
import "@/lib/useScrollRestore"
import type { CollapseProps } from "antd"
import AddToCartButton from "@/components/ui/AddToCartButton"
import AvailabilityBlock from "@/components/Product/AvailabilityBlock"
import SizeNotify from "@/components/Product/SizeNotify"
import ShareButton from "@/components/Profile/ShareButton"
import ProductInfoBlocks, { isPackagingBlock } from "@/components/Product/ProductInfoBlocks"
import PackagingDrawer, { packagingLabel } from "@/components/Product/PackagingDrawer"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { getTypeCopy } from "@/lib/productTypes"
import { BRANDS, WAVE, getBrandId } from "@/lib/brands"
import { waveColors } from "@/lib/waveColor"
import WaveLoader from "@/components/WaveLoader"
import SizeGuideView from "@/components/SizeGuideView"
import SizeAdvisor, { sizeAdvisorLabel } from "@/components/Product/SizeAdvisor"
import HelpLink from "@/components/HelpLink"
import { cleanSizeGuide } from "@/lib/sizeGuide"
import { kindOf } from "@/lib/sizeAdvisor"
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

// recadrage des photos : on coupe le haut (le blanc au-dessus de la barre métallique) pour que l'image commence à la barre
// 1,8 % de la hauteur ; augmente le chiffre pour couper plus, diminue-le pour couper moins
const CROP = "1.8%"
const CROP_TOP = { top: `-${CROP}`, height: `calc(100% + ${CROP})` }

export default function ProductClient({ initialProduct = null }: { initialProduct?: ProductType | null }) {
  const t = useTranslations("Product")
  const format = useFormatter()
  const locale = useLocale()
  const { slug } = useParams() as { slug: string }
  const searchParams = useSearchParams()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const galleryRef = useRef<HTMLDivElement | null>(null)
  const [galleryIdx, setGalleryIdx] = useState(0)
  const onGalleryScroll = () => {
    const el = galleryRef.current
    if (!el || !el.firstElementChild) return
    const w = (el.firstElementChild as HTMLElement).offsetWidth + 8
    setGalleryIdx(Math.max(0, Math.round(el.scrollLeft / w)))
  }

  const [product, setProduct] = useState<ProductType | null>(initialProduct)
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null)
  const [selectedSizeLabel, setSelectedSizeLabel] = useState<string | null>(null)
  const [loading, setLoading] = useState(!initialProduct)
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [packagingOpen, setPackagingOpen] = useState(false)
  // lampes : allumée ou éteinte
  const [lit] = useLamp()
  const [advisorOpen, setAdvisorOpen] = useState(false)
  // barre d'achat collée en bas (téléphone) quand le vrai bouton n'est plus à l'écran
  const { addToCartWithFeedback, setIsCartOpen } = useCart()
  const buyRef = useRef<HTMLDivElement | null>(null)
  const sizesRef = useRef<HTMLDivElement | null>(null)
  const [buyVisible, setBuyVisible] = useState(true)
  const [barAdded, setBarAdded] = useState(false)
  const packagingBlock = (product?.product_info_blocks ?? []).find(isPackagingBlock) ?? null

  const colorParam: string | null = searchParams?.get("color") ?? null

  /* ================= FETCH ================= */

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data: ProductType = await fetchProductCached(slug)
        setProduct(data)
      } catch {
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }

    // le serveur a déjà envoyé le produit dans la page : pas besoin de le redemander
    if (slug && !initialProduct) fetchProduct()
  }, [slug, initialProduct])


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

  // d'où vient le visiteur ? (For her → photos de femme seulement ; For him → photos d'homme seulement)
  const [ctxWho, setCtxWho] = useState<string | null>(null)
  useEffect(() => {
    try {
      setCtxWho(sessionStorage.getItem("fysu-who"))
    } catch {}
  }, [])

  const filteredImages = useMemo(() => {
    if (!product) return []
    const who = product.gender === "men" || product.gender === "women" ? product.gender : ctxWho
    // on retire les photos portées de l'autre genre (sauf s'il ne resterait rien)
    const pick = (list: typeof product.product_images) => {
      const ok = list.filter((img) => !img.worn_for || img.worn_for === "any" || !who || img.worn_for === who)
      return ok.length > 0 ? ok : list
    }
    if (!selectedColor) return pick(product.product_images)

    const matching = product.product_images.filter(
      (img) => img.color && img.color.toLowerCase() === selectedColor.hex.toLowerCase()
    )
    return pick(matching.length > 0 ? matching : product.product_images)
  }, [product, selectedColor, ctxWho])

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
    } else if (!selectedSizeId && availableSizes.length > 1) {
      // la taille choisie sur une pièce précédente est présélectionnée si elle existe ici
      let pref: string | null = null
      try {
        pref = localStorage.getItem("fysu-pref-size")
      } catch {}
      const hit = pref ? availableSizes.find((s) => String(s.size).trim().toLowerCase() === pref!.trim().toLowerCase()) : undefined
      if (hit) {
        setSelectedSizeId(hit.id)
        setSelectedSizeLabel(hit.size)
      }
    } else if (selectedSizeId) {
      setSelectedSizeId(null)
      setSelectedSizeLabel(null)
    }
  }, [availableSizes, selectedSizeId])

  // on retient ce produit pour la rangée « Récemment consulté »
  useEffect(() => {
    if (product) rememberProduct(product)
  }, [product])

  useEffect(() => {
    const el = buyRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(([entry]) => setBuyVisible(entry.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [product])

  /* ================= HANDLERS ================= */

  const handleColorClick = (color: ProductColor) => {
    const params = new URLSearchParams(window.location.search)
    params.set("color", color.hex)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  /* ================= STATES ================= */

    if (loading) return <div className="w-screen h-screen bg-background" />

  if (!product) return notFound()

  // lampes : chaque image peut avoir sa photo « allumée » ; un seul bouton les fait toutes passer de l'une à l'autre
  // (pas de recadrage : les deux photos gardent le même cadre)
  const hasLit = filteredImages.some((img) => Boolean((img as { lit_url?: string | null }).lit_url))
  const imageCrop = hasLit ? undefined : CROP_TOP

  // une image + (si elle existe) sa version allumée en fondu par-dessus
  const renderPhoto = (img: { url: string; lit_url?: string | null }, extra: { priority?: boolean }) => (
    <>
      <Image
        src={img.url}
        alt={product.name}
        fill
        className="object-cover object-top"
        style={imageCrop}
        priority={extra.priority}
      />
      {img.lit_url && (
        <Image
          src={img.lit_url}
          alt={`${product.name} — ${locale === "fr" ? "allumée" : "on"}`}
          fill
          priority={extra.priority}
          className="object-cover object-top transition-opacity duration-[900ms] ease-in-out"
          style={{ opacity: lit ? 1 : 0 }}
        />
      )}
    </>
  )

  function formatText(text?: string | null) {
    if (!text) return ""
    return text.replace(/\\n/g, "\n")
  }

  const copy = getTypeCopy(product.product_type, locale)
  // conseiller de taille : seulement si le produit a un guide avec des mesures (haut ou bas)
  const advisorGuide = cleanSizeGuide(product.size_guide)
  const canAdvise = !!copy.sizeGuide && kindOf(advisorGuide) !== null

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

    <div className="max-w-6xl mx-auto py-12 relative top-0 sm:mt-24">
      <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-start">
  
        {/* ================= IMAGES ================= */}
        {/* téléphone : défilement horizontal, la photo suivante dépasse sur le bord ; ordinateur : photos en colonne */}
        <div className="relative">
          <div
            ref={galleryRef}
            onScroll={onGalleryScroll}
            className="no-scrollbar -mx-0 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain sm:snap-none sm:flex-col sm:gap-3 sm:overflow-visible"
          >
            {filteredImages.map((img, i) => (
              <div
                key={img.id}
                {...(i === 0 ? { "data-hero-target": true } : {})}
                className="relative aspect-[3/4] w-[88%] shrink-0 snap-start overflow-hidden bg-foreground/[0.06] sm:w-full"
              >
                {renderPhoto(img, { priority: i < 2 })}
              </div>
            ))}
          </div>
          {hasLit && (
            <div className="pointer-events-none absolute right-3 top-3 z-10 sm:hidden">
              <div className="pointer-events-auto"><LampSwitch glass /></div>
            </div>
          )}
          {hasLit && (
            <div className="absolute bottom-3 right-3 z-10 hidden sm:block">
              <LampSwitch glass />
            </div>
          )}
          {filteredImages.length > 1 && (
            <p className="font-info mt-3 text-center text-[11px] font-light tracking-[0.12em] opacity-60 sm:hidden">
              {galleryIdx + 1} / {filteredImages.length}
            </p>
          )}
        </div>

        {/* ================= INFO ================= */}
        <div className="space-y-12 sticky top-24 lg:top-[14vh] self-start w-11/12 mx-auto lg:pr-8">
  
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
              <h1 className="text-[28px] font-extrabold leading-none tracking-[-0.045em] sm:text-[44px]">
                {product.name}
              </h1>
              <WishlistHeart productId={product.id} size={24} className="-mr-1.5 -mt-1 shrink-0" />
            </div>

            {product.evocation && (
              <p className="text-xs font-light italic opacity-60">{product.evocation}</p>
            )}

            <p className="font-info pt-2 text-base font-light">
              {format.number(product.price, {
                style: "currency",
                currency: "EUR",
              })}
            </p>
            {(() => {
              const n = mode === "available" ? lowStockCount(product) : null
              return n ? (
                <p className="font-info text-[11px] font-light uppercase tracking-[0.12em] opacity-70">{lowStockText(n, locale)}</p>
              ) : null
            })()}
          </div>

          {/* Description : une phrase par ligne, une ligne vide = un temps de pause */}
          <div className="max-w-md border-t border-foreground/50 pt-8 text-[15px] font-light tracking-[-0.01em] opacity-75">
            {formatText(product.description)
              .split("\n")
              .map((line, i) =>
                line.trim() === "" ? (
                  <div key={i} className="h-6" aria-hidden />
                ) : (
                  <p key={i} className="leading-[2]">
                    {line}
                  </p>
                )
              )}
          </div>

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
            <div className="grid grid-cols-[6rem_1fr] items-start gap-x-4 border-t border-foreground/15 py-5 sm:grid-cols-[7rem_1fr]">
              <p className="font-info pt-1 text-[11px] font-light uppercase tracking-[0.12em] text-foreground/55">
                {colorCopy.color}
              </p>

              <div>
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
                        className="flex cursor-pointer flex-col items-center gap-1.5"
                      >
                        <span
                          className="relative block h-7 w-7 overflow-hidden border border-foreground/15"
                          style={
                            c.image_url
                              ? { backgroundColor: c.hex, backgroundImage: `url(${c.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                              : { backgroundColor: c.hex }
                          }
                        >
                          {isOut && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="block h-px w-[150%] rotate-45 bg-foreground/70" />
                            </span>
                          )}
                        </span>
                        <span className={`block h-px w-full transition-colors duration-300 ${isSelected ? "bg-foreground" : "bg-transparent"}`} />
                      </button>
                    )
                  })}
                </div>
                <p className="font-info mt-2 text-xs font-light text-foreground/60">{selectedColor?.name}</p>
              </div>
            </div>
          )}
  
          {/* SIZES */}
          {canBuy && sizesForColor.length > 0 && (
            <div ref={sizesRef} className="grid scroll-mt-28 grid-cols-[6rem_1fr] items-start gap-x-4 border-t border-foreground/15 py-5 sm:grid-cols-[7rem_1fr]">
              <p className="font-info pt-2 text-[11px] font-light uppercase tracking-[0.12em] text-foreground/55">{copy.sizeTitle ?? t("size")}</p>

              <div>
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
                        try {
                          localStorage.setItem("fysu-pref-size", String(s.size))
                        } catch {}
                      }}
                      className={`
                        min-w-[48px]
                        font-info px-4 py-2
                        text-sm
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

              {(
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                  {canAdvise && (
                    <button
                      type="button"
                      onClick={() => setAdvisorOpen(true)}
                      className="font-info cursor-pointer text-xs font-light text-foreground underline underline-offset-4"
                    >
                      {sizeAdvisorLabel(locale)}
                    </button>
                  )}
                  {copy.sizeGuide && (
                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen(true)}
                      className="font-info cursor-pointer text-xs font-light text-foreground/60 underline underline-offset-4 hover:text-foreground"
                    >
                      {t("sizeGuide")}
                    </button>
                  )}
                  {packagingBlock && (
                    <button
                      type="button"
                      onClick={() => setPackagingOpen(true)}
                      className="font-info cursor-pointer text-xs font-light text-foreground/60 underline underline-offset-4 hover:text-foreground"
                    >
                      {packagingLabel(locale)}
                    </button>
                  )}
                  <HelpLink />
                </div>
              )}

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
            </div>
          )}
  
                    <div ref={buyRef} data-ink-root className="relative liquid-glass flex flex-col gap-4 p-4 rounded-2xl">
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

            {canBuy && !colorSoldOut && <DeliveryNote preorder={mode !== "available"} />}

            {mode === "preorder" && product.release_date && (
              <p className="-mt-1 text-center text-xs text-foreground/60">
                {getAvailabilityCopy(locale).expected.replace(
                  "{date}",
                  formatReleaseDate(product.release_date, locale)
                )}
              </p>
            )}
    
            {items.length > 0 && (
              <div className="pdp-collapse border-t border-foreground/15 pt-2">
                <style>{`
                  .pdp-collapse .ant-collapse-item { border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent) !important; }
                  .pdp-collapse .ant-collapse-item:last-child { border-bottom: 0 !important; }
                  .pdp-collapse .ant-collapse-header { padding: 14px 0 !important; font-family: var(--font-dm-mono), ui-monospace, Menlo, monospace !important; font-size: 11px !important; font-weight: 300 !important; letter-spacing: 0.12em; text-transform: uppercase; align-items: center !important; }
                  .pdp-collapse .ant-collapse-content-box { padding: 0 0 16px 0 !important; }
                  .pdp-collapse .ant-collapse-content-box, .pdp-collapse .ant-collapse-content-box * { font-family: var(--font-dm-mono), ui-monospace, Menlo, monospace !important; font-size: 12px !important; font-weight: 300 !important; line-height: 1.8 !important; }
                `}</style>
                <Collapse items={items} bordered={false} ghost />
              </div>
            )}
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

      {/* sans suggestions : les produits déjà consultés prennent la place */}
      {!(product.product_suggestions?.length > 0) && (
        <RecentlyViewed excludeSlug={product.slug} className="mt-32 sm:mt-48" />
      )}
    </div>
    {canBuy && !colorSoldOut && !buyVisible && (
      <div
        className="liquid-glass fixed inset-x-3 bottom-[calc(34px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-full py-1.5 pl-5 pr-1.5 sm:hidden"
        style={{ color: "var(--menu)" }}
      >
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-medium">{product.name}</p>
          <p className="font-info text-[11px] font-light opacity-70">
            {format.number(product.price, { style: "currency", currency: "EUR" })}
            {selectedSizeLabel ? ` · ${selectedSizeLabel}` : ""}
          </p>
        </div>
        <button
          type="button"
          data-no-green
          onClick={() => {
            if (!selectedSizeId || !selectedSizeLabel) {
              sizesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
              return
            }
            addToCartWithFeedback(
              product,
              selectedSizeId,
              selectedSizeLabel,
              1500,
              hasColors && selectedColor
                ? { name: selectedColor.name, hex: selectedColor.hex, imageUrl: filteredImages[0]?.url ?? null }
                : null
            )
            setBarAdded(true)
            window.setTimeout(() => setBarAdded(false), 1400)
            setIsCartOpen(true)
          }}
          className="font-info h-10 shrink-0 cursor-pointer rounded-full bg-[#4eac6c] px-5 text-[11px] uppercase tracking-[0.14em] text-black transition active:scale-95"
        >
          {barAdded
            ? locale.startsWith("fr") ? "Ajouté" : "Added"
            : selectedSizeId
              ? mode === "available"
                ? locale.startsWith("fr") ? "Ajouter" : "Add"
                : locale.startsWith("fr") ? "Précommander" : "Pre-order"
              : locale.startsWith("fr") ? "Choisir la taille" : "Select size"}
        </button>
      </div>
    )}
    <PackagingDrawer open={packagingOpen} onClose={() => setPackagingOpen(false)} block={packagingBlock} />
    <SizeAdvisor
      open={advisorOpen}
      onClose={() => setAdvisorOpen(false)}
      guide={advisorGuide}
      sizes={sizesForColor.map((s) => ({ size: s.size, stock: s.stock }))}
      onPick={(label) => {
        const hit = sizesForColor.find((s) => s.size.trim().toLowerCase() === label.trim().toLowerCase() && s.stock > 0)
        if (hit) {
          setSelectedSizeId(hit.id)
          setSelectedSizeLabel(hit.size)
        }
      }}
    />
    <SizeGuideView
      open={sizeGuideOpen}
      onClose={() => setSizeGuideOpen(false)}
      guide={product.size_guide}
      imageUrl={product.size_guide_image_url}
      lang={locale === "fr" ? "fr" : "en"}
      light={brandId !== "fysu"}
    />
    </>
  )
}
