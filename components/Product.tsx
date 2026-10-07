"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import WishlistHeart from "@/components/WishlistHeart"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ProductType } from "@/types/product"
import { useLocale, useTranslations } from "next-intl"
import { getAvailabilityCopy, getBadgeText, getEffectiveAvailability } from "@/lib/availability"

/* ====================================================================
   CARTE PRODUIT
   - un toucher sur l'image ouvre la fiche produit
   - dans une RANGÉE qui défile (showArrows) : les images se font défiler UNIQUEMENT avec les petites
     flèches (glisser le doigt sur la carte fait défiler la rangée de produits)
   - dans une page fixe (grille) : pas de flèches, on glisse le doigt / le curseur sur l'image
   ==================================================================== */

const SWIPE_MIN = 35

const Product = ({
  product,
  showArrows = false,
}: {
  product: ProductType
  // true quand la carte est dans une rangée qui défile (flèches, pas de glissement sur l'image)
  showArrows?: boolean
  // (ancien réglage de la rangée, plus utilisé : on le garde pour ne rien casser)
  scrollRef?: React.RefObject<HTMLDivElement | null>
  isFirst?: boolean
}) => {
  const t = useTranslations("Product")
  const locale = useLocale()
  const badgeText = getBadgeText(
    getEffectiveAvailability(product),
    getAvailabilityCopy(locale)
  )
  const router = useRouter()
  const [infoRevealed, setInfoRevealed] = useState(false)
  const hideInfoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const swipedRef = useRef(false)
  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return () => {
      if (hideInfoTimeoutRef.current) clearTimeout(hideInfoTimeoutRef.current)
    }
  }, [])

  // Extraire les couleurs uniques depuis les images
  const uniqueColors = useMemo(() => {
    const colors = (product.product_images || [])
      .map((img) => img.color)
      .filter((c): c is string => !!c)
    return Array.from(new Set(colors))
  }, [product.product_images])

  const displayedColors = uniqueColors.slice(0, 4)
  const extraCount = uniqueColors.length - displayedColors.length

  const images = product.product_images?.length
    ? product.product_images.map((i) => i.url)
    : ["/placeholder.png"]

  const goToProduct = () => {
    const path = `/product/${product.slug}`
    // l'image de la carte est « transportée » jusqu'à la fiche (voir components/ProductHero.tsx) ;
    // pas pour The Wave (qui a son eau) ni quand la carte montre une autre image que la première
    try {
      const hero = (window as unknown as { __fysuHero?: (el: HTMLElement | null, p: string, src: string | null) => boolean }).__fysuHero
      const imgs = boxRef.current?.querySelectorAll("img")
      const shown = imgs?.[currentIndex] as HTMLImageElement | undefined
      if (hero && currentIndex === 0 && product.brand !== "thewave" && shown?.currentSrc) {
        if (hero(boxRef.current, path, shown.currentSrc)) return
      }
    } catch {}
    // la transition (eau / pixels) prend la main si elle est prête ; sinon navigation normale
    const handled = (window as unknown as { __fysuNavigate?: (p: string) => boolean }).__fysuNavigate?.(path)
    if (!handled) router.push(path)
  }

  // Tactile : les infos apparaissent quand le doigt se pose, puis se recachent un peu après
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    swipeStart.current = { x: e.clientX, y: e.clientY }
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      if (hideInfoTimeoutRef.current) {
        clearTimeout(hideInfoTimeoutRef.current)
        hideInfoTimeoutRef.current = null
      }
      setInfoRevealed(true)
    }
  }

  const handlePointerEnd = (e?: React.PointerEvent<HTMLDivElement>) => {
    // page fixe : un glissement horizontal change d'image (sans ouvrir la fiche)
    const start = swipeStart.current
    swipeStart.current = null
    if (!showArrows && e && start && images.length > 1 && e.type === "pointerup") {
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.2) {
        swipedRef.current = true
        setCurrentIndex((i) => Math.min(images.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1))))
      }
    }
    if (hideInfoTimeoutRef.current) clearTimeout(hideInfoTimeoutRef.current)
    hideInfoTimeoutRef.current = setTimeout(() => {
      setInfoRevealed(false)
      hideInfoTimeoutRef.current = null
    }, 2500)
  }

  const step = (dir: 1 | -1) => (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setCurrentIndex((i) => Math.min(images.length - 1, Math.max(0, i + dir)))
  }

  const arrowClass =
    "absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white/90 backdrop-blur-sm transition hover:bg-black/40 active:scale-90"

  return (
    <div className="relative w-full group" data-href={`/product/${product.slug}`}>
      {/* Bouton like */}
      <WishlistHeart
        productId={product.id}
        className="absolute top-2 right-2 z-10 text-neutral-900 hover:bg-gray-200"
      />

      {/* Image */}
      <div
        ref={boxRef}
        className="relative mb-4 aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-2xl bg-neutral-100"
        style={showArrows ? undefined : { touchAction: "pan-y" }}
        onClick={() => {
          if (swipedRef.current) {
            swipedRef.current = false
            return
          }
          goToProduct()
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {badgeText && (
          <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-black">
            {badgeText}
          </span>
        )}

        <div
          className="flex h-full w-full"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {images.map((src, index) => (
            <div key={index} className="relative h-full w-full flex-shrink-0">
              <Image
                src={src}
                alt={`${product.name}-${index}`}
                fill
                draggable={false}
                className="object-cover"
                sizes="(max-width: 768px) 90vw, 350px"
              />
            </div>
          ))}
        </div>

        {/* Flèches discrètes (seulement s'il y a plusieurs images) */}
        {showArrows && images.length > 1 && currentIndex > 0 && (
          <button
            type="button"
            aria-label="Previous image"
            className={`${arrowClass} left-2`}
            onClick={step(-1)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {showArrows && images.length > 1 && currentIndex < images.length - 1 && (
          <button
            type="button"
            aria-label="Next image"
            className={`${arrowClass} right-2`}
            onClick={step(1)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Infos produit */}
      <Link href={`/product/${product.slug}`} className="block w-full">
        <div
          className={`mx-2 flex items-start justify-between gap-3 transition-all duration-300 ease-out group-focus-within:translate-y-0 group-focus-within:opacity-100 ${
            infoRevealed
              ? "translate-y-0 opacity-100"
              : "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
          }`}
        >
          <div className="flex flex-col items-start">
            <p className="truncate text-xs uppercase tracking-wide transition group-hover:underline">
              {product.name}
            </p>

            {product.evocation && (
              <p className="line-clamp-2 text-[11px] italic text-foreground/60">
                {product.evocation}
              </p>
            )}

            {/* Couleurs */}
            {uniqueColors.length > 0 && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-foreground/60">{t("colors")}</p>

                {displayedColors.map((color) => (
                  <div
                    key={color}
                    title={color}
                    className="h-3.5 w-3.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}

                {extraCount > 0 && (
                  <span className="text-xs text-neutral-500">+{extraCount}</span>
                )}
              </div>
            )}
          </div>

          <p className="font-info whitespace-nowrap text-xs">{product.price} EUR</p>
        </div>
      </Link>
    </div>
  )
}

export default Product
