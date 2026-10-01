"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import WishlistHeart from "@/components/WishlistHeart"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ProductType } from "@/types/product"
import { motion, useMotionValue, animate } from "framer-motion"
import { useLocale, useTranslations } from "next-intl"
import { getAvailabilityCopy, getBadgeText, getEffectiveAvailability } from "@/lib/availability"

const IMAGE_CLICK_THRESHOLD = 8

const Product = ({
  product,
  isFirst = false,
}: {
  product: ProductType
  scrollRef?: React.RefObject<HTMLDivElement | null> // gardé pour compatibilité (plus utilisé)
  isFirst?: boolean
}) => {
  const t = useTranslations("Product")
  const locale = useLocale()
  const badgeText = getBadgeText(
    getEffectiveAvailability(product),
    getAvailabilityCopy(locale)
  )
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isInView, setIsInView] = useState(false)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const dragIntentRef = useRef(false)
    const [infoRevealed, setInfoRevealed] = useState(false)
  const hideInfoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (hideInfoTimeoutRef.current) clearTimeout(hideInfoTimeoutRef.current)
    }
  }, [])


  useEffect(() => {
    if (!containerRef.current) return
  
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      {
        threshold: 0.6,
      }
    )
  
    observer.observe(containerRef.current)
  
    return () => observer.disconnect()
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

  const trackRef = useRef<HTMLDivElement | null>(null)
  const x = useMotionValue(0)

  const [trackWidth, setTrackWidth] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const updateWidth = () => {
      if (!trackRef.current) return
      setTrackWidth(trackRef.current.offsetWidth)
    }
  
    updateWidth()
    window.addEventListener("resize", updateWidth)
  
    return () => window.removeEventListener("resize", updateWidth)
  }, [])

  const hasAnimatedRef = useRef(false)

  // Glisser les photos du produit (souris et doigt) quand il y en a plusieurs.
  // Pour faire défiler la rangée de produits : glisser sur le texte sous la photo ou entre les cartes.
  const canDrag = images.length > 1

  const goToProduct = () => {
    router.push(`/product/${product.slug}`)
  }

  const resetGesture = () => {
    pointerStartRef.current = null
    dragIntentRef.current = false
        // Tactile : les infos se recachent un peu après que le doigt a quitté l'écran
    if (hideInfoTimeoutRef.current) clearTimeout(hideInfoTimeoutRef.current)
    hideInfoTimeoutRef.current = setTimeout(() => {
      setInfoRevealed(false)
      hideInfoTimeoutRef.current = null
    }, 2500)

  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    dragIntentRef.current = false
        // Tactile (téléphone / iPad) : on révèle les infos dès que le doigt se pose
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      if (hideInfoTimeoutRef.current) {
        clearTimeout(hideInfoTimeoutRef.current)
        hideInfoTimeoutRef.current = null
      }
      setInfoRevealed(true)
    }

  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return

    const deltaX = Math.abs(e.clientX - pointerStartRef.current.x)
    const deltaY = Math.abs(e.clientY - pointerStartRef.current.y)

    if (deltaX > IMAGE_CLICK_THRESHOLD || deltaY > IMAGE_CLICK_THRESHOLD) {
      dragIntentRef.current = true
    }
  }

  const handlePointerUp = () => {
    if (!pointerStartRef.current) return

    const shouldNavigate = !dragIntentRef.current
    resetGesture()

    if (shouldNavigate) {
      goToProduct()
    }
  }

  useEffect(() => {
    if (!isFirst) return
    if (!isInView) return
    if (hasAnimatedRef.current) return
    if (images.length <= 1) return
    if (!trackWidth) return
  
    hasAnimatedRef.current = true
  
    const timeout = setTimeout(() => {
      animate(x, -trackWidth * 0.6, {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      }).then(() => {
        animate(x, 0, {
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1],
        })
      })
    }, 300)
  
    return () => clearTimeout(timeout)
  }, [isFirst, isInView, trackWidth, images.length])

  return (
    <div className="relative w-full group" ref={containerRef} >
      {/* Bouton like */}
      <WishlistHeart
        productId={product.id}
        className="absolute top-2 right-2 z-10 hover:bg-gray-200"
      />

      {/* Image */}
      <div
        ref={trackRef}
        className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100 mb-4"
      >
        {/* Badge de disponibilité (précommande, épuisé, bientôt…) */}
        {images.length > 1 && (
          <span className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === currentIndex ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </span>
        )}
        {badgeText && (
          <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-black">
            {badgeText}
          </span>
        )}
        <motion.div
          className={`flex h-full w-full ${canDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{ x, touchAction: canDrag ? "pan-y" : "auto" }}
          drag={canDrag ? "x" : false}
          dragConstraints={{
            right: 0,
            left: -(trackWidth * (images.length - 1)),
          }}
          dragElastic={0.05}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={resetGesture}
          onDragStart={() => {
            dragIntentRef.current = true
          }}
          onDragEnd={() => {
            if (!trackWidth) return

            const movedBy = -x.get()
            const index = Math.round(movedBy / trackWidth)

            const clampedIndex = Math.min(
              images.length - 1,
              Math.max(0, index)
            )

            setCurrentIndex(clampedIndex)

            animate(x, -clampedIndex * trackWidth, {
              type: "spring",
              stiffness: 400,
              damping: 40,
            })

            resetGesture()
          }}
        >
          {images.map((src, index) => (
            <div key={index} className="relative flex-shrink-0 w-full h-full">
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
        </motion.div>
      </div>
  
      {/* Infos produit */}
      <Link href={`/product/${product.slug}`} className="block w-full">
                <div
          className={`flex justify-between items-start gap-3 mx-2 transition-all duration-300 ease-out group-focus-within:opacity-100 group-focus-within:translate-y-0 ${
            infoRevealed
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0"
          }`}
        >

          <div className="flex flex-col items-start">
            <p className="text-xs uppercase tracking-wide group-hover:underline transition truncate">
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
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
  
                {extraCount > 0 && (
                  <span className="text-xs text-neutral-500">
                    +{extraCount}
                  </span>
                )}
              </div>
            )}
          </div>
  
          <p className="text-xs whitespace-nowrap">
            {product.price} EUR
          </p>
        </div>
      </Link>
    </div>
  )
}

export default Product
