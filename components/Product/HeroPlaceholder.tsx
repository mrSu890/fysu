"use client"

import { useEffect, useState } from "react"

/* Écran de chargement de la fiche produit : il réserve la place de la grande photo (même cadre que la vraie fiche)
   et y pose l'image de la carte touchée. L'image qui voyage s'y pose donc tout de suite, sans attendre le serveur. */

export default function HeroPlaceholder() {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    try {
      const s = (window as unknown as { __fysuHeroSrc?: string }).__fysuHeroSrc
      if (s) setSrc(s)
    } catch {}
  }, [])
  return (
    <div className="min-h-screen bg-background">
      <div className="relative top-0 mx-auto max-w-6xl py-12 sm:mt-24">
        <div className="grid items-start gap-12 md:grid-cols-2 lg:gap-24">
          <div className="relative">
            <div className="flex gap-2 overflow-hidden sm:flex-col sm:gap-3">
              <div data-hero-target="" data-hero-pos="top" data-hero-crop="1.8" className="relative aspect-[3/4] w-[88%] shrink-0 overflow-hidden bg-foreground/[0.06] sm:w-full">
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover object-top" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
