"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { motion, useMotionValue } from "framer-motion"

/* ====================================================================
   BOUTON ROND DÉPLAÇABLE (pastille de musique repliée, accessibilité…)
   - on le glisse avec le doigt (ou la souris) n'importe où sur l'écran
   - sa place est retenue sur cet appareil
   - un simple toucher (sans glisser) déclenche l'action
   - option « tuckable » : une petite croix range la pastille hors de l'écran ; il reste une languette
     avec une flèche au bord, qu'on touche pour la faire revenir
   ==================================================================== */

const MARGIN = 16

type Props = {
  storageKey: string
  side: "left" | "right"
  size: number
  label: string
  onTap: () => void
  zIndex?: number
  // se décale vers le haut quand la pastille de musique est ouverte
  lift?: boolean
  // décalage vers le haut (pour empiler plusieurs pastilles du même côté)
  bottomOffset?: number
  className?: string
  style?: CSSProperties
  // repère pour les astuces guidées (voir lib/tips.ts)
  tip?: string
  // petite croix qui range la pastille sur le bord de l'écran (languette avec flèche pour la rappeler)
  tuckable?: boolean
  children: ReactNode
}

export default function DraggableFab({
  storageKey,
  side,
  size,
  label,
  onTap,
  zIndex = 60,
  lift = false,
  bottomOffset = 0,
  className = "",
  style,
  tip,
  tuckable = false,
  children,
}: Props) {
  const boundsRef = useRef<HTMLDivElement | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const moved = useRef(false)

  // pastille rangée sur le bord (retenu sur cet appareil)
  const tuckKey = `${storageKey}-tucked`
  const [tucked, setTucked] = useState(false)
  const [fr, setFr] = useState(true)
  useEffect(() => {
    setFr(!document.documentElement.lang.startsWith("en"))
    if (!tuckable) return
    try {
      setTucked(localStorage.getItem(tuckKey) === "1")
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const setTuck = (v: boolean) => {
    setTucked(v)
    try {
      if (v) localStorage.setItem(tuckKey, "1")
      else localStorage.removeItem(tuckKey)
    } catch {
      /* ignore */
    }
  }
  const baseBottom = `${MARGIN + bottomOffset}px + env(safe-area-inset-bottom) + ${lift ? "var(--fab-lift, 0px)" : "0px"}`

  // limites (écran visible) pour un décalage donné depuis la place d'origine
  const clamp = (ox: number, oy: number) => {
    const w = window.innerWidth
    const h = window.innerHeight
    const room = w - size - MARGIN * 2
    const minX = side === "right" ? -room : 0
    const maxX = side === "right" ? 0 : room
    const minY = -(h - size - MARGIN - 90) // on garde la barre du haut libre
    const maxY = 8
    return {
      x: Math.min(maxX, Math.max(minX, ox)),
      y: Math.min(maxY, Math.max(minY, oy)),
    }
  }

  // place retenue
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const saved = JSON.parse(raw) as { x: number; y: number }
      const c = clamp(Number(saved.x) || 0, Number(saved.y) || 0)
      x.set(c.x)
      y.set(c.y)
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // si l'écran change de taille (rotation de l'iPad), le bouton reste visible
  useEffect(() => {
    const onResize = () => {
      const c = clamp(x.get(), y.get())
      x.set(c.x)
      y.set(c.y)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      ref={boundsRef}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.25 }}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex }}
    >
      {tuckable && tucked ? (
        <motion.button
          type="button"
          aria-label={fr ? "Faire revenir" : "Bring back"}
          title={fr ? "Faire revenir" : "Bring back"}
          initial={{ x: side === "right" ? 24 : -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          onClick={() => setTuck(false)}
          className={`liquid-glass pointer-events-auto absolute flex h-[52px] w-[22px] cursor-pointer items-center justify-center ${
            side === "right" ? "rounded-l-full" : "rounded-r-full"
          }`}
          style={{
            ...style,
            ...(side === "right" ? { right: 0 } : { left: 0 }),
            bottom: `calc(${baseBottom} + ${(size - 52) / 2 - y.get()}px)`,
            transition: lift ? "bottom 0.3s ease" : undefined,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={side === "right" ? "M8 2L4 6l4 4" : "M4 2l4 4-4 4"} />
          </svg>
        </motion.button>
      ) : (
      <>
      <motion.button
        type="button"
        aria-label={label}
        title={label}
        data-tip={tip}
        drag
        dragConstraints={boundsRef}
        dragElastic={0}
        dragMomentum={false}
        onDragStart={() => {
          moved.current = true
        }}
        onDragEnd={() => {
          try {
            localStorage.setItem(storageKey, JSON.stringify({ x: x.get(), y: y.get() }))
          } catch {
            /* ignore */
          }
          window.setTimeout(() => {
            moved.current = false
          }, 60)
        }}
        onClick={() => {
          if (!moved.current) onTap()
        }}
        whileTap={{ scale: 0.94 }}
        className={`pointer-events-auto absolute flex cursor-pointer items-center justify-center rounded-full ${className}`}
        style={{
          ...style,
          x,
          y,
          width: size,
          height: size,
          ...(side === "right" ? { right: MARGIN } : { left: MARGIN }),
          bottom: `calc(${MARGIN + bottomOffset}px + env(safe-area-inset-bottom) + ${lift ? "var(--fab-lift, 0px)" : "0px"})`,
          transition: lift ? "bottom 0.3s ease" : undefined,
          touchAction: "none",
        }}
      >
        {children}
      </motion.button>

      {tuckable && (
        <motion.button
          type="button"
          aria-label={fr ? "Ranger sur le côté" : "Tuck away"}
          title={fr ? "Ranger sur le côté" : "Tuck away"}
          onClick={() => setTuck(true)}
          className="liquid-glass pointer-events-auto absolute flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full"
          style={{
            ...style,
            x,
            y,
            ...(side === "right" ? { right: MARGIN + size - 12 } : { left: MARGIN + size - 12 }),
            bottom: `calc(${baseBottom} + ${size - 12}px)`,
            transition: lift ? "bottom 0.3s ease" : undefined,
          }}
        >
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </motion.button>
      )}
      </>
      )}
    </motion.div>
  )
}
