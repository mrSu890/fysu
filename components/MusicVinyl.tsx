"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Music, X } from "lucide-react"
import { useMusicPlayer } from "@/context/MusicPlayerContext"
import { useMusicCopy } from "@/lib/musicCopy"
import { formatTime } from "@/lib/music"

/* ====================================================================
   VINYLE
   - s'ouvre en grand au-dessus de la pastille, le fond s'assombrit
   - la cover est l'étiquette du disque ; il tourne dans le sens des aiguilles
     d'une montre quand la musique joue
   - on le tourne avec le doigt : dans le sens horaire on avance, dans l'autre on recule
   - un simple toucher sur le disque = pause / lecture
   - se ferme en touchant le fond, la croix, ou Échap
   ==================================================================== */

const SPIN_DEG_PER_SEC = 200 // ~33 tours par minute

export default function MusicVinyl({ onClose }: { onClose: () => void }) {
  const { album, current, playing, time, duration, toggle, seek } = useMusicPlayer()
  const copy = useMusicCopy()

  const discRef = useRef<HTMLDivElement | null>(null)
  const timeLabelRef = useRef<HTMLSpanElement | null>(null)

  const angle = useRef(0)
  const dragging = useRef(false)
  const lastPointer = useRef(0)
  const movedDeg = useRef(0)
  const startedPlaying = useRef(false)
  const target = useRef(0)
  const lastSeekAt = useRef(0)

  const playingRef = useRef(playing)
  const timeRef = useRef(time)
  const durationRef = useRef(duration)
  playingRef.current = playing
  timeRef.current = time
  durationRef.current = duration

  // le disque tourne
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (playingRef.current && !dragging.current) angle.current += SPIN_DEG_PER_SEC * dt
      if (discRef.current) discRef.current.style.transform = `rotate(${angle.current}deg)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // fond bloqué + Échap
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      html.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const pointerAngle = (e: React.PointerEvent) => {
    const rect = discRef.current!.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI
  }

  const onDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragging.current = true
    movedDeg.current = 0
    lastPointer.current = pointerAngle(e)
    target.current = timeRef.current
    startedPlaying.current = playingRef.current
    // pendant qu'on tourne le disque à la main, la musique est en pause
    if (startedPlaying.current) toggle()
  }

  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const a = pointerAngle(e)
    let delta = a - lastPointer.current
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    lastPointer.current = a

    angle.current += delta
    movedDeg.current += Math.abs(delta)

    const total = durationRef.current
    if (total > 0) {
      // 1 tour = 1/12 du titre (au moins 5 secondes)
      const perTurn = Math.max(5, total / 12)
      target.current = Math.min(total, Math.max(0, target.current + (delta / 360) * perTurn))
      if (timeLabelRef.current) timeLabelRef.current.textContent = formatTime(target.current)
      const now = performance.now()
      if (now - lastSeekAt.current > 80) {
        lastSeekAt.current = now
        seek(target.current)
      }
    }
  }

  const onUp = () => {
    if (!dragging.current) return
    dragging.current = false

    if (movedDeg.current < 6) {
      // simple toucher : pause / lecture
      if (!startedPlaying.current) toggle()
      return
    }
    seek(target.current)
    if (startedPlaying.current) toggle()
  }

  if (!current || !album) return null

  const size = "min(80vw, 52svh, 380px)"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[59] flex flex-col items-center justify-end"
      style={{
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        paddingBottom: "calc(104px + env(safe-area-inset-bottom))",
      }}
      onClick={onClose}
      role="dialog"
      aria-label={album.title}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={copy.close}
        className="absolute right-4 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md active:scale-95"
        style={{ top: "calc(16px + env(safe-area-inset-top))" }}
      >
        <X size={22} />
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.35, y: 140 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.35, y: 140 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="flex flex-col items-center text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* disque */}
        <div className="relative" style={{ width: size, height: size }}>
          <div
            ref={discRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="absolute inset-0 cursor-grab rounded-full active:cursor-grabbing"
            style={{
              touchAction: "none",
              background:
                "repeating-radial-gradient(circle at center, #0d0d0d 0px, #0d0d0d 2px, #1a1a1a 3px, #121212 4px)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.65), inset 0 0 0 2px rgba(255,255,255,0.05)",
            }}
          >
            {/* anneau de bord */}
            <span
              className="absolute inset-[3%] rounded-full"
              style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)" }}
            />
            {/* étiquette : la cover */}
            <span
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-neutral-700"
              style={{ width: "38%", height: "38%", boxShadow: "0 0 0 3px rgba(0,0,0,0.5)" }}
            >
              {album.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={album.cover_url}
                  alt=""
                  draggable={false}
                  className="h-full w-full select-none object-cover"
                />
              ) : (
                <Music size={36} className="opacity-60" />
              )}
            </span>
            {/* trou central */}
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black"
              style={{ width: "4.5%", height: "4.5%", boxShadow: "0 0 0 2px rgba(255,255,255,0.25)" }}
            />
            {/* repère pour voir tourner le disque */}
            <span
              className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white/70"
              style={{ top: "6%", width: "2.2%", height: "2.2%" }}
            />
          </div>

          {/* reflet fixe (ne tourne pas) */}
          <span
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 20deg, transparent 0 8%, rgba(255,255,255,0.13) 13%, transparent 20% 58%, rgba(255,255,255,0.1) 63%, transparent 70%)",
            }}
          />
        </div>

        {/* titre + temps */}
        <p className="mt-6 max-w-[80vw] truncate text-lg font-medium">{current.title}</p>
        <p className="max-w-[80vw] truncate text-sm opacity-70">
          {current.artist || album.artist || album.title}
        </p>
        <p className="mt-2 text-xs tabular-nums opacity-70">
          <span ref={timeLabelRef}>{formatTime(time)}</span> / {formatTime(duration)}
        </p>
        <p className="mt-3 max-w-[70vw] text-center text-[11px] opacity-50">{copy.vinylHint}</p>
      </motion.div>
    </motion.div>
  )
}
