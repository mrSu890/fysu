"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Music, Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { useMusicPlayer } from "@/context/MusicPlayerContext"
import { useMusicCopy } from "@/lib/musicCopy"
import Equalizer from "@/components/MusicEqualizer"

/* ====================================================================
   PASTILLE DU LECTEUR (en bas de l'écran, comme la barre de navigation)
   - pause / lecture, titre suivant / précédent
   - bouton pour la réduire en petite bulle (un clic pour la rouvrir)
   ==================================================================== */

function Cover({ src, size }: { src: string | null | undefined; size: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-current/15"
      style={{ width: size, height: size }}
    >
      <Music size={size * 0.45} />
    </span>
  )
}

export default function MiniPlayer() {
  const pathname = usePathname()
  const copy = useMusicCopy()
  const { album, current, playing, time, duration, collapsed, setCollapsed, toggle, next, prev } =
    useMusicPlayer()

  if (!current || !album || pathname.startsWith("/admin")) return null

  const progress = duration > 0 ? Math.min(100, (time / duration) * 100) : 0
  const bottom = "calc(16px + env(safe-area-inset-bottom))"

  return (
    <AnimatePresence mode="wait" initial={false}>
      {collapsed ? (
        <motion.button
          key="bubble"
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label={copy.expand}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.2 }}
          className="liquid-glass fixed right-4 z-[60] flex h-[56px] w-[56px] cursor-pointer items-center justify-center rounded-full"
          style={{ bottom, color: "var(--menu)" }}
        >
          <Cover src={album.cover_url} size={44} />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-white">
            <Equalizer playing={playing} size={16} />
          </span>
        </motion.button>
      ) : (
        <motion.div
          key="pill"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-x-0 z-[60] flex justify-center px-3"
          style={{ bottom, pointerEvents: "none" }}
        >
          <div
            className="liquid-glass relative flex w-full max-w-[440px] items-center gap-2 rounded-full py-2 pl-2 pr-2"
            style={{ color: "var(--menu)", pointerEvents: "auto" }}
          >
            <Link href={`/music/${album.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Cover src={album.cover_url} size={42} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-medium">{current.title}</span>
                <span className="block truncate text-[11px] opacity-70">
                  {current.artist || album.artist || album.title}
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={prev}
              aria-label={copy.previous}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
            >
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? copy.pause : copy.play}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-current/10"
            >
              {playing ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={copy.next}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
            >
              <SkipForward size={18} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label={copy.collapse}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full opacity-70"
            >
              <ChevronDown size={18} />
            </button>

            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-6 bottom-[3px] h-[2px] overflow-hidden rounded-full bg-current/10"
            >
              <span
                className="block h-full rounded-full bg-current/70"
                style={{ width: `${progress}%` }}
              />
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
