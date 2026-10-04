"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import DraggableFab from "@/components/DraggableFab"
import { GAMES, gamesCopyFor } from "@/lib/games"

/* ====================================================================
   PASTILLE « JEUX » (style appli) : apparaît en bas des pages Projets
   (pour l'instant la musique). On peut la déplacer avec le doigt.
   ==================================================================== */

export default function GamesFab() {
  const pathname = usePathname()
  const router = useRouter()
  const copy = gamesCopyFor(useLocale())
  const [hidden, setHidden] = useState(false)

  // pastille masquée si l'Arcade est désactivée dans l'admin
  useEffect(() => {
    if (!pathname.startsWith("/music")) return
    fetch("/api/collectionPages?visibility=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setHidden(d?.arcade === false))
      .catch(() => {})
  }, [pathname])

  if (!pathname.startsWith("/music") || hidden) return null

  const target = GAMES.length === 1 ? `/games/${GAMES[0].slug}` : "/games"

  return (
    <DraggableFab
      storageKey="fysu-games-fab"
      side="left"
      size={50}
      label={copy.openGames}
      onTap={() => router.push(target)}
      zIndex={54}
      lift
      bottomOffset={64}
      className="overflow-hidden shadow-lg"
      style={{ borderRadius: 12, boxShadow: "0 4px 14px rgba(0,0,0,0.35)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={GAMES[0].image} alt="" className="h-full w-full" style={{ imageRendering: "pixelated" }} draggable={false} />
    </DraggableFab>
  )
}
