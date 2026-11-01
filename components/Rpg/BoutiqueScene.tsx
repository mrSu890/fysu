"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { loadAvatar, renderAvatar } from "@/lib/avatar"
import { HOTSPOTS, SH, SW, createBoutique } from "@/lib/rpgBoutique"

/* Prototype : la boutique en mode RPG. On touche le sol pour marcher, on touche un « ! » pour interagir. */

const TEXT: Record<string, { fr: [string, string, string]; en: [string, string, string]; href: string }> = {
  racks: { fr: ["Vestes & chemises", "Toute la collection, du denim aux chemises.", "Voir la collection"], en: ["Jackets & shirts", "The whole collection, from denim to shirts.", "See the collection"], href: "/collections" },
  shelf: { fr: ["Sacs & parfums", "Les FY'grances et les accessoires.", "Découvrir"], en: ["Bags & fragrances", "The FY'grances and accessories.", "Discover"], href: "/fygrances" },
  counter: { fr: ["Le comptoir", "Tes commandes et ton profil.", "Ouvrir My FYSU"], en: ["The counter", "Your orders and your profile.", "Open My FYSU"], href: "/profile" },
  daybed: { fr: ["Le canapé", "Pose-toi un instant et écoute de la musique.", "Écouter"], en: ["The daybed", "Sit for a moment and listen to music.", "Listen"], href: "/music" },
  coats: { fr: ["Les manteaux", "Les pièces de saison.", "Voir la collection"], en: ["The coats", "Seasonal pieces.", "See the collection"], href: "/collections" },
}

export default function BoutiqueScene({ locale }: { locale: string }) {
  const lang = locale === "fr" ? "fr" : "en"
  const cvRef = useRef<HTMLCanvasElement | null>(null)
  const apiRef = useRef<ReturnType<typeof createBoutique> | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const cv = cvRef.current
    if (!cv) return
    let dead = false
    const img = new Image()
    img.src = "/rpg-boutique.jpg"
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    Promise.all([img.decode().catch(() => undefined), renderAvatar(loadAvatar()).catch(() => null)]).then(([, av]) => {
      if (dead) return
      apiRef.current = createBoutique({ canvas: cv, bg: img, avatar: av, onHotspot: setOpen, reduceMotion: reduce })
      setReady(true)
    })
    return () => {
      dead = true
      apiRef.current?.destroy()
      apiRef.current = null
    }
  }, [])

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    apiRef.current?.tap(((e.clientX - r.left) / r.width) * SW, ((e.clientY - r.top) / r.height) * SH)
  }

  const h = HOTSPOTS.find((x) => x.id === open)
  const tx = open ? TEXT[open] : null

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <div
        className="relative w-full select-none overflow-hidden rounded-2xl bg-[#3b2a20] shadow-[0_18px_50px_rgba(0,0,0,0.25)]"
        style={{ aspectRatio: `${SW} / ${SH}`, touchAction: "manipulation" }}
        onPointerDown={onDown}
      >
        <canvas ref={cvRef} className="block h-full w-full" />
        {!ready && <div className="absolute inset-0 animate-pulse bg-[#3b2a20]" />}
        {h && tx && (
          <div
            className="absolute z-10 w-[min(70%,260px)] -translate-x-1/2 -translate-y-full rounded-2xl bg-white/95 p-4 text-[#171717] shadow-xl backdrop-blur-md"
            style={{ left: `${(h.mark[0] / SW) * 100}%`, top: `${(h.mark[1] / SH) * 100}%`, animation: "rpgPop .28s cubic-bezier(0.32,0.72,0,1)" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="font-info text-[12px] uppercase tracking-[0.1em]">{tx[lang][0]}</p>
            <p className="mt-1.5 text-[13px] leading-snug opacity-70">{tx[lang][1]}</p>
            <Link href={tx.href} className="mt-3 flex h-10 items-center justify-center rounded-full bg-[#171717] text-[13px] text-white transition active:scale-95">
              {tx[lang][2]}
            </Link>
          </div>
        )}
      </div>
      <p className="mt-3 text-center font-info text-[11px] uppercase tracking-[0.12em] opacity-60">
        {lang === "fr" ? "Touche le sol pour marcher · touche un « ! » pour interagir" : "Tap the floor to walk · tap a “!” to interact"}
      </p>
      <style>{`@keyframes rpgPop{from{opacity:0;transform:translate(-50%,-92%) scale(.92)}to{opacity:1;transform:translate(-50%,-100%) scale(1)}}`}</style>
    </div>
  )
}
