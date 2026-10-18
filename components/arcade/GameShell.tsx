"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { ArrowLeft } from "lucide-react"
import ArcadeCanvas from "@/components/arcade/ArcadeCanvas"
import { makePool } from "@/components/arcade/poolGame"
import { makeHoops } from "@/components/arcade/hoopsGame"
import { makeCrossing } from "@/components/arcade/crossingGame"
import { makeSlice } from "@/components/arcade/sliceGame"
import { GAMES, bestKey, gameTextFor, gamesCopyFor } from "@/lib/games"
import type { ArcadeMaker } from "@/lib/arcadeKit"

/* Page plein écran d'un jeu sans récompense (Pool, Hoops, Crossing, Slice). */

const MAKERS: Record<string, ArcadeMaker> = {
  "fysu-pool": makePool,
  "fysu-hoops": makeHoops,
  "fysu-crossing": makeCrossing,
  "fysu-slice": makeSlice,
}

export default function GameShell({ slug }: { slug: string }) {
  const locale = useLocale()
  const copy = gamesCopyFor(locale)
  const text = gameTextFor(slug, locale)
  const name = GAMES.find((g) => g.slug === slug)?.name ?? slug
  const make = MAKERS[slug]

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("/games-sw.js").catch(() => {})
    }
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black" style={{ zIndex: 45 }}>
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap");`}</style>
      {make && <ArcadeCanvas make={make} title={name} hint={text.hint} bestKey={bestKey(slug)} copy={copy} />}
      <Link
        href="/games"
        className="absolute left-4 top-4 flex items-center gap-2 border-2 bg-black px-4 py-3 active:translate-y-0.5"
        style={{
          zIndex: 50,
          marginTop: "env(safe-area-inset-top)",
          borderColor: "#3fd0ff",
          color: "#3fd0ff",
          fontFamily: '"Press Start 2P", "VT323", ui-monospace, monospace',
          fontSize: 12,
        }}
      >
        <ArrowLeft size={16} />
        {copy.back.toUpperCase()}
      </Link>
    </div>
  )
}
