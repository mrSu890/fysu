"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import WishlistHeart from "@/components/WishlistHeart"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import CroppedLogo from "@/components/CroppedLogo"
import { useBrandOf } from "@/lib/useBrandOf"
import QuickAdd from "@/components/QuickAdd"
import LampSwitch from "@/components/LampSwitch"
import { prefetchProduct } from "@/lib/productCache"
import "@/lib/useScrollRestore"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ProductType } from "@/types/product"
import { useLocale, useTranslations } from "next-intl"
import { useLamp } from "@/lib/lamp"
import { getAvailabilityCopy, getBadgeText, getEffectiveAvailability } from "@/lib/availability"
import { lowStockCount, lowStockText } from "@/lib/lowStock"
import { pageWho, useViewMode, useWho } from "@/components/ViewToggle"

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
  reveal = false,
  forceWho = null,
}: {
  product: ProductType
  // true quand la carte est dans une rangée qui défile (flèches, pas de glissement sur l'image)
  showArrows?: boolean
  // true : nom, prix et couleurs n'apparaissent qu'au toucher (accueil, « récemment vus ») ; false : toujours visibles, très discrets
  reveal?: boolean
  // (ancien réglage de la rangée, plus utilisé : on le garde pour ne rien casser)
  scrollRef?: React.RefObject<HTMLDivElement | null>
  isFirst?: boolean
  // pour qui est la photo portée quand la page ne le dit pas (ex. carrousel Womenswear / Menswear de l'accueil)
  forceWho?: "men" | "women" | null
}) => {
  const t = useTranslations("Product")
  const [lit] = useLamp() // lampes : allumées / éteintes
  const locale = useLocale()
  const badgeText = getBadgeText(
    getEffectiveAvailability(product),
    getAvailabilityCopy(locale)
  )
  const lowN = getEffectiveAvailability(product) === "available" ? lowStockCount(product) : null
  const lowText = lowN ? lowStockText(lowN, locale) : null
  const router = useRouter()
  const pathname = usePathname() ?? ""
  // petit logo Kiban Collector / The Wave sur les cartes affichées hors de leur propre page
  const subBrand = useBrandOf(product.id, product.brand)
  const showBrandLogo = !!subBrand && !pathname.startsWith("/kiban-collector") && !pathname.startsWith("/thewave")
  const [infoRevealed, setInfoRevealed] = useState(false)
  const hideInfoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [viewMode] = useViewMode()
  const [visitorWho] = useWho()
  const pathnameNow = usePathname()
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  // la carte est restée un instant bien visible à l'écran : on prépare déjà sa fiche (données + page)
  useEffect(() => {
    const el = cardRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    let timer: ReturnType<typeof setTimeout> | null = null
    const io = new IntersectionObserver(
      ([entry]) => {
        if (timer) clearTimeout(timer)
        timer = null
        if (!entry.isIntersecting) return
        timer = setTimeout(() => {
          prefetchProduct(product.slug)
          try {
            router.prefetch(`/product/${product.slug}`)
          } catch {}
        }, 400)
      },
      { threshold: 0.6 }
    )
    io.observe(el)
    return () => {
      if (timer) clearTimeout(timer)
      io.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug])
  const swipedRef = useRef(false)
  // grilles (sans flèches) : les photos suivent le doigt et s'arrêtent net sur chaque photo (défilement natif)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const onTrackScroll = () => {
    const el = trackRef.current
    if (!el || !el.clientWidth) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setCurrentIndex((c) => (c === i ? c : i))
  }
  useEffect(() => {
    if (showArrows) return
    const el = trackRef.current
    if (!el || !el.clientWidth) return
    if (Math.round(el.scrollLeft / el.clientWidth) !== currentIndex) el.scrollTo({ left: currentIndex * el.clientWidth, behavior: "auto" })
  }, [currentIndex, showArrows])
  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return () => {
      if (hideInfoTimeoutRef.current) clearTimeout(hideInfoTimeoutRef.current)
    }
  }, [])

  // Extraire les couleurs uniques depuis les images
  const uniqueColors = useMemo(() => {
    // toutes les couleurs du produit (celles déclarées sur la fiche d'abord, sinon celles des photos)
    const declared = [...(product.product_colors ?? [])]
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((c) => c.hex)
      .filter((c): c is string => !!c)
    const fromImages = (product.product_images || [])
      .map((img) => img.color)
      .filter((c): c is string => !!c && !["lit", "swatch"].includes(c.toLowerCase()))
    const all = Array.from(new Set([...declared, ...fromImages].map((c) => c.toLowerCase())))
    if (product.variant_color && !all.includes(product.variant_color.toLowerCase())) all.unshift(product.variant_color.toLowerCase())
    return all
  }, [product.product_colors, product.product_images, product.variant_color])

  const displayedColors = uniqueColors.slice(0, 4)
  const extraCount = uniqueColors.length - displayedColors.length

  // couleurs qui ont leurs propres photos : on peut passer de l'une à l'autre directement sur la carte
  const imageColors = useMemo(() => {
    const out: string[] = []
    for (const img of product.product_images ?? []) {
      const c = (img.color ?? "").toLowerCase()
      if (c && c !== "lit" && c !== "swatch" && !out.includes(c)) out.push(c)
    }
    return out
  }, [product.product_images])
  const [sel, setSel] = useState<string | null>(product.variant_color ? product.variant_color.toLowerCase() : null)
  const activeColor = imageColors.length > 1 ? (sel && imageColors.includes(sel) ? sel : imageColors[0]) : null
  const activeImgsBase = useMemo(() => {
    const all = product.product_images ?? []
    if (!activeColor) return all
    return all.filter((img) => {
      const c = (img.color ?? "").toLowerCase()
      // les images sans couleur reconnue vont sur la première couleur
      return c === activeColor || (activeColor === imageColors[0] && !imageColors.includes(c))
    })
  }, [product.product_images, activeColor, imageColors])
  // vue « modèle » : la photo portée (celle marquée « survol » dans l'admin) passe en premier, quand elle existe
  // quelle photo portée ? le genre du produit décide ; sinon la page (For him / For her) ; sinon le choix du visiteur
  const ownGender = product.gender === "men" || product.gender === "women" ? product.gender : null
  const wanted = ownGender ?? forceWho ?? pageWho(pathnameNow) ?? visitorWho
  // page neutre en vue à plat : on ne trie pas par genre (sinon on ne voit que les photos d'homme par défaut)
  const neutral = !ownGender && !forceWho && !pageWho(pathnameNow)
  const filterWho = neutral && viewMode !== "model" ? null : wanted
  const wornImg = useMemo(() => {
    // seule la photo portée PRINCIPALE (étoile dans l'admin) sert de première photo en vue modèle :
    // celle du bon genre, sinon celle « pour tous » ; jamais la photo de l'autre genre
    const principal = activeImgsBase.filter((i) => i.is_hover)
    return (
      principal.find((i) => i.worn_for === wanted) ??
      principal.find((i) => !i.worn_for || i.worn_for === "any") ??
      null
    )
  }, [activeImgsBase, wanted, ownGender])
  const activeImgs = useMemo(() => {
    // on ne montre jamais, en défilant, la photo portée de l'autre genre (un homme sur « For her »…)
    const visible = activeImgsBase.filter((i) => !filterWho || !i.worn_for || i.worn_for === "any" || i.worn_for === filterWho)
    if (viewMode !== "model" || !wornImg) return visible
    return [wornImg, ...visible.filter((i) => i !== wornImg)]
  }, [activeImgsBase, viewMode, wornImg, filterWho])
  useEffect(() => setCurrentIndex(0), [viewMode])
  const colorQuery = activeColor
    ? `?color=${encodeURIComponent(activeColor)}`
    : product.variant_color
      ? `?color=${encodeURIComponent(product.variant_color)}`
      : ""
  const pickColor = (c: string) => {
    if (c === activeColor || !imageColors.includes(c)) return
    setSel(c)
    setCurrentIndex(0)
  }

  const images = activeImgs.length ? activeImgs.map((i) => i.url) : ["/placeholder.png"]

  // photos « allumées » (lampes) : une par image, si elle existe
  const litImages = activeImgs.length ? activeImgs.map((i) => i.lit_url ?? null) : [null]
  const hasLit = litImages.some(Boolean)

  // photo portée sur mannequin : apparaît au survol de la carte (ordinateur, première image seulement)
  const hoverUrl = wornImg?.url ?? null
  const showHover = !!hoverUrl && hoverUrl !== images[0]

  // la fiche produit saura de quel côté on vient (For her → pas de photos d'homme)
  const rememberWho = () => {
    try {
      if (filterWho) sessionStorage.setItem("fysu-who", filterWho)
      else sessionStorage.removeItem("fysu-who")
    } catch {}
  }

  const goToProduct = () => {
    rememberWho()
    const path = `/product/${product.slug}${colorQuery}`
    // l'image de la carte est « transportée » jusqu'à la fiche (voir components/ProductHero.tsx) ;
    // pas pour The Wave (qui a son eau) ni quand la carte montre une autre image que la première
    try {
      const hero = (window as unknown as { __fysuHero?: (el: HTMLElement | null, p: string, src: string | null) => boolean }).__fysuHero
      const imgs = boxRef.current?.querySelectorAll("img[data-base]")
      const shown = imgs?.[currentIndex] as HTMLImageElement | undefined
      if (hero && currentIndex === 0 && product.brand !== "thewave" && !(lit && hasLit) && shown?.currentSrc) {
        if (hero(boxRef.current, path, shown.currentSrc)) return
      }
    } catch {}
    // la transition (eau / pixels) prend la main si elle est prête ; sinon navigation normale
    const handled = (window as unknown as { __fysuNavigate?: (p: string) => boolean }).__fysuNavigate?.(path)
    if (!handled) router.push(path)
  }

  // Tactile : les infos apparaissent quand le doigt se pose, puis se recachent un peu après
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    rememberWho()
    prefetchProduct(product.slug)
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
    if (false && e && start && images.length > 1 && e.type === "pointerup") {
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

  // zone d'appui large (toute la bande du bord de l'image, sous le coeur) ; la flèche visible reste petite et discrète
  const arrowClass = "group/arrow absolute bottom-14 top-14 z-10 flex w-16 items-center"

  return (
    <div ref={cardRef} className="relative w-full group" onPointerEnter={() => prefetchProduct(product.slug)} data-href={`/product/${product.slug}${colorQuery}`}>
      {/* Bouton like */}
      <WishlistHeart
        productId={product.id}
        className="absolute top-2 right-2 z-10 text-neutral-900 hover:bg-gray-200"
      />

      {/* Image */}
      <div
        ref={boxRef}
        data-card-box=""
        className="relative mb-4 aspect-[3/4] w-full cursor-pointer overflow-hidden bg-neutral-100"
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
        {getEffectiveAvailability(product) === "available" && <QuickAdd product={product} />}

        {showBrandLogo && (
          <div
            aria-label={subBrand === "kiban" ? "Kiban Collector" : "The Wave"}
            className="pointer-events-none absolute left-3 top-3 z-10 text-[8px] font-medium tracking-[0.2em]"
            style={{ filter: "brightness(0) drop-shadow(0 0 3px rgba(255,255,255,0.35))" }}
          >
            <CroppedLogo
              key={subBrand}
              bases={subBrand === "kiban" ? ["/images/kiban-logo-light"] : ["/images/the-wave-logo"]}
              alt={subBrand === "kiban" ? "KIBAN" : "THE WAVE"}
              className="block h-[13px] w-auto max-w-[72px] sm:h-[15px]"
            />
          </div>
        )}

        {/* lampes : interrupteur sur la carte, sauf sur la page Kiban Collector (qui a le sien en tête de rangée) */}
        {hasLit && !pathname.startsWith("/kiban-collector") && (
          <div
            className={`absolute bottom-3 z-10 ${getEffectiveAvailability(product) === "available" ? "right-14" : "right-3"}`}
          >
            <LampSwitch glass />
          </div>
        )}

        {(badgeText || lowText) && (
          <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-black">
            {badgeText ?? lowText}
          </span>
        )}

        <div
          ref={showArrows ? undefined : trackRef}
          onScroll={showArrows ? undefined : onTrackScroll}
          className={showArrows ? "flex h-full w-full" : "no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"}
          style={
            showArrows
              ? {
                  transform: `translateX(-${currentIndex * 100}%)`,
                  transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                }
              : undefined
          }
        >
          {images.map((src, index) => (
            <div key={index} className={`relative h-full w-full flex-shrink-0 ${showArrows ? "" : "snap-start snap-always"}`}>
              <Image
                src={src}
                alt={`${product.name}-${index}`}
                fill
                draggable={false}
                data-base
                className="object-cover"
                sizes="(max-width: 768px) 90vw, 350px"
              />
              {index === 0 && showHover && (
                <Image
                  src={hoverUrl as string}
                  alt=""
                  fill
                  draggable={false}
                  className="pointer-events-none hidden object-cover opacity-0 transition-opacity duration-500 ease-out [@media(hover:hover)]:block group-hover:opacity-100"
                  sizes="(max-width: 768px) 90vw, 350px"
                />
              )}
              {litImages[index] && (
                <Image
                  src={litImages[index] as string}
                  alt=""
                  fill
                  draggable={false}
                  className="object-cover transition-opacity duration-[900ms] ease-in-out"
                  style={{ opacity: lit ? 1 : 0 }}
                  sizes="(max-width: 768px) 90vw, 350px"
                />
              )}
            </div>
          ))}
        </div>

        {/* Flèches discrètes (seulement s'il y a plusieurs images) */}
        {showArrows && images.length > 1 && currentIndex > 0 && (
          <button
            type="button"
            aria-label="Previous image"
            className={`${arrowClass} left-0 justify-start pl-2`}
            onClick={step(-1)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/15 text-white/80 backdrop-blur-sm transition group-hover/arrow:bg-black/30 group-active/arrow:scale-90">
              <ChevronLeft size={14} />
            </span>
          </button>
        )}
        {showArrows && images.length > 1 && currentIndex < images.length - 1 && (
          <button
            type="button"
            aria-label="Next image"
            className={`${arrowClass} right-0 justify-end pr-2`}
            onClick={step(1)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/15 text-white/80 backdrop-blur-sm transition group-hover/arrow:bg-black/30 group-active/arrow:scale-90">
              <ChevronRight size={14} />
            </span>
          </button>
        )}
      </div>

      {/* Infos produit : nom et prix sur une ligne, puis les pastilles de couleur (on touche une pastille pour changer de photos) */}
      <div
        className={`mx-2 transition-all duration-300 ease-out ${
          reveal
            ? infoRevealed
              ? "translate-y-0 opacity-100"
              : "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
            : ""
        }`}
      >
        <Link
          href={`/product/${product.slug}${colorQuery}`}
          className="flex w-full items-baseline justify-between gap-3"
        >
          <p className="truncate text-xs uppercase tracking-wide">{product.name}</p>
          <p className="font-info whitespace-nowrap text-xs">{product.price} EUR</p>
        </Link>

        {uniqueColors.length > 1 && (
          <div className="-ml-1.5 mt-0.5 flex items-center">
            {displayedColors.map((color) => {
              const clickable = imageColors.includes(color) && imageColors.length > 1
              const active = (activeColor ?? product.variant_color?.toLowerCase()) === color
              const dot = (
                <span
                  className="block h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: active
                      ? "0 0 0 1.5px var(--page-bg, var(--background)), 0 0 0 2.5px var(--foreground)"
                      : "inset 0 0 0 1px rgba(128,128,128,0.35)",
                  }}
                />
              )
              return clickable ? (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  aria-pressed={active}
                  title={color}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    pickColor(color)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex h-7 w-7 cursor-pointer touch-manipulation items-center justify-center"
                >
                  {dot}
                </button>
              ) : (
                <span key={color} title={color} className="flex h-7 w-7 items-center justify-center">
                  {dot}
                </span>
              )
            })}
            {extraCount > 0 && <span className="ml-1 text-xs text-foreground/50">+{extraCount}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default Product
