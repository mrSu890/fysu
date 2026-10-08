"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { motion, useMotionValue } from "framer-motion"

/* ====================================================================
   BOUTON ROND DÉPLAÇABLE (pastille de musique repliée, accessibilité…)
   - on le glisse avec le doigt (ou la souris) n'importe où sur l'écran
   - sa place est retenue sur cet appareil
   - un simple toucher (sans glisser) déclenche l'action
   - un toucher est reconnu même si le doigt bouge un tout petit peu (moins de 10 px) : la pastille ne glisse pas
   - option « tuckable » : une petite croix range la pastille hors de l'écran (même glissement doux que la barre
     du haut) ; il reste une languette avec une flèche au bord, qu'on touche pour la faire revenir
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
  const down = useRef<{ cx: number; cy: number; ox: number; oy: number } | null>(null)
  const tapped = useRef(false)

  // pastille rangée sur le bord (retenu sur cet appareil)
  const tuckKey = `${storageKey}-tucked`
  const [tucked, setTucked] = useState(false)
  const [shift, setShift] = useState(0) // de combien elle glisse pour sortir de l'écran
  const [instant, setInstant] = useState(false) // pas d'animation au chargement de la page
  const [fr, setFr] = useState(true)

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

  const outShift = () => {
    const dist = side === "right" ? MARGIN - x.get() : MARGIN + x.get()
    return (dist + size + 14) * (side === "right" ? 1 : -1)
  }

  // place retenue
  useEffect(() => {
    setFr(!document.documentElement.lang.startsWith("en"))
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const saved = JSON.parse(raw) as { x: number; y: number }
        const c = clamp(Number(saved.x) || 0, Number(saved.y) || 0)
        x.set(c.x)
        y.set(c.y)
      }
      if (tuckable && localStorage.getItem(tuckKey) === "1") {
        setInstant(true)
        setShift(outShift())
        setTucked(true)
        window.setTimeout(() => setInstant(false), 80)
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setTuck = (v: boolean) => {
    if (v) setShift(outShift())
    setTucked(v)
    try {
      if (v) localStorage.setItem(tuckKey, "1")
      else localStorage.removeItem(tuckKey)
    } catch {
      /* ignore */
    }
  }

  // si l'écran change de taille (rotation de l'iPad), le bouton reste visible
  useEffect(() => {
    const onResize = () => {
      const c = clamp(x.get(), y.get())
      x.set(c.x)
      y.set(c.y)
      if (tucked) setShift(outShift())
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tucked])

  const baseBottom = `${MARGIN + bottomOffset}px + env(safe-area-inset-bottom) + ${lift ? "var(--fab-lift, 0px)" : "0px"}`
  // même glissement que la barre du haut (0,5 s, démarrage vif, arrivée douce)
  const glide = { duration: instant ? 0 : 0.5, ease: "easeOut" as const }
  const off = tuckable && tucked

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
      {/* languette au bord : elle apparaît quand la pastille est rangée */}
      {tuckable && (
        <motion.button
          type="button"
          aria-label={fr ? "Faire revenir" : "Bring back"}
          title={fr ? "Faire revenir" : "Bring back"}
          tabIndex={off ? 0 : -1}
          initial={false}
          animate={{ x: off ? 0 : side === "right" ? 30 : -30, opacity: off ? 1 : 0 }}
          transition={{ ...glide, delay: off && !instant ? 0.12 : 0 }}
          onClick={() => setTuck(false)}
          className={`liquid-glass absolute flex h-[56px] w-[26px] cursor-pointer items-center justify-center ${
            side === "right" ? "rounded-l-full" : "rounded-r-full"
          }`}
          style={{
            ...style,
            pointerEvents: off ? "auto" : "none",
            ...(side === "right" ? { right: 0 } : { left: 0 }),
            bottom: `calc(${baseBottom} + ${(size - 56) / 2 - y.get()}px)`,
            transition: lift ? "bottom 0.3s ease" : undefined,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={side === "right" ? "M8 2L4 6l4 4" : "M4 2l4 4-4 4"} />
          </svg>
        </motion.button>
      )}

      {/* pastille + petite croix : elles glissent ensemble hors de l'écran */}
      <motion.div
        initial={false}
        animate={{ x: off ? shift : 0, opacity: off ? 0 : 1 }}
        transition={glide}
        className="pointer-events-none absolute inset-0"
      >
        <motion.button
          type="button"
          aria-label={label}
          title={label}
          data-tip={tip}
          tabIndex={off ? -1 : 0}
          drag
          dragConstraints={boundsRef}
          dragElastic={0}
          dragMomentum={false}
          onPointerDown={(e) => {
            down.current = { cx: e.clientX, cy: e.clientY, ox: x.get(), oy: y.get() }
            tapped.current = false
          }}
          onDragEnd={() => {
            try {
              localStorage.setItem(storageKey, JSON.stringify({ x: x.get(), y: y.get() }))
            } catch {
              /* ignore */
            }
          }}
          onPointerUp={(e) => {
            const d = down.current
            down.current = null
            if (!d) return
            // le doigt a à peine bougé : c'est un toucher, pas un glissement
            if (Math.hypot(e.clientX - d.cx, e.clientY - d.cy) < 10) {
              tapped.current = true
              x.set(d.ox)
              y.set(d.oy)
              onTap()
            }
          }}
          onClick={(e) => {
            // clavier (Entrée / Espace) : pas de pointeur, donc on déclenche ici
            if (e.detail === 0 && !tapped.current) onTap()
          }}
          whileTap={{ scale: 0.94 }}
          className={`absolute flex cursor-pointer items-center justify-center rounded-full ${className}`}
          style={{
            ...style,
            pointerEvents: off ? "none" : "auto",
            x,
            y,
            width: size,
            height: size,
            ...(side === "right" ? { right: MARGIN } : { left: MARGIN }),
            bottom: `calc(${baseBottom})`,
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
            tabIndex={off ? -1 : 0}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setTuck(true)}
            className="liquid-glass absolute flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full"
            style={{
              ...style,
              pointerEvents: off ? "none" : "auto",
              x,
              y,
              ...(side === "right" ? { right: MARGIN + size - 16 } : { left: MARGIN + size - 16 }),
              bottom: `calc(${baseBottom} + ${size - 16}px)`,
              transition: lift ? "bottom 0.3s ease" : undefined,
              touchAction: "manipulation",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  )
}
