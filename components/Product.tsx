"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Heart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ProductType } from "@/types/product"
import { motion, useMotionValue, animate } from "framer-motion"
import { useTranslations } from "next-intl"

const IMAGE_CLICK_THRESHOLD = 8

const Product = ({
  product,
  scrollRef,
  isFirst = false,
}: {
  product: ProductType
  scrollRef?: React.RefObject<HTMLDivElement | null>
  isFirst?: boolean
}) => {
  const t = useTranslations("Product")
  const router = useRouter()
  const [liked, setLiked] = useState(false)
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

  // Vérifie si ce produit est déjà dans la wishlist
  useEffect(() => {
    const checkWishlist = async () => {
      try {
        const res = await fetch(`/api/wishlist/${product.id}`)
        const data = await res.json()
        setLiked(data.liked)
      } catch (err) {
        console.error("Erreur check wishlist:", err)
      }
    }
    checkWishlist()
  }, [product.id])

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      const res = await fetch("/api/wishlist", {
        method: liked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      })

      if (res.ok) {
        setLiked(!liked)
      } else {
        console.error("Erreur ajout/suppression wishlist")
      }
    } catch (err) {
      console.error(err)
    }
  }

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
      <button
        onClick={toggleLike}
        className="absolute top-2 right-2 rounded-full p-1.5 hover:bg-gray-200 cursor-pointer transition z-10"
      >
        <Heart
          size={22}
          className={`transition-colors ${
            liked ? "fill-green-900 text-green-900" : "text-gray-700"
          }`}
          strokeWidth={1.5}
        />
      </button>
  
      {/* Image */}
      <div
        ref={trackRef}
        className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100 mb-4"
      >
        <motion.div
          className="flex h-full w-full cursor-grab active:cursor-grabbing"
          style={{ x, touchAction: "pan-y" }}
          drag="x"
          dragConstraints={{
            right: 0,
            left: -(trackWidth * (images.length - 1)),
          }}
          dragElastic={0.05}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={resetGesture}
          onTouchStart={(e) => e.stopPropagation()}
          onDragStart={() => {
            dragIntentRef.current = true

            if (scrollRef?.current) {
              scrollRef.current.style.overflowX = "hidden"
            }
          }}
          onDragEnd={() => {
            if (scrollRef?.current) {
              scrollRef.current.style.overflowX = "auto"
            }

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
