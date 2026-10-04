"use client"

import { useEffect } from "react"
import { Heart } from "lucide-react"
import { useRouter } from "next/navigation"
import { loadWishlist, toggleWishlist, useIsLiked } from "@/lib/wishlistStore"

/* Bouton cœur (favoris) : réaction immédiate au toucher */

export default function WishlistHeart({
  productId,
  size = 22,
  className = "",
  label = "Favorite",
}: {
  productId: number | string
  size?: number
  className?: string
  label?: string
}) {
  const router = useRouter()
  const liked = useIsLiked(productId)

  useEffect(() => {
    loadWishlist()
  }, [])

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const result = await toggleWishlist(productId)
    if (result === "auth") router.push("/auth/signin")
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-liked={liked ? "true" : "false"}
      className={`cursor-pointer touch-manipulation select-none rounded-full p-1.5 transition active:scale-90 ${className}`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <Heart
        size={size}
        strokeWidth={1.5}
        className={`transition-colors ${liked ? "fill-[#4eac6c] text-[#4eac6c]" : "text-current opacity-80"}`}
      />
    </button>
  )
}
