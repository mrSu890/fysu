"use client"

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

  if (!pathname.startsWith("/music")) return null

  const target = GAMES.length === 1 ? `/games/${GAMES[0].slug}` : "/games"

  return (
    <DraggableFab
      storageKey="fysu-games-fab"
      side="left"
      size={52}
      label={copy.openGames}
      onTap={() => router.push(target)}
      zIndex={54}
      lift
      bottomOffset={64}
      className="liquid-glass overflow-hidden"
      style={{ color: "var(--menu)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={GAMES[0].image} alt="" className="h-8 w-8 object-contain" draggable={false} />
    </DraggableFab>
  )
}
