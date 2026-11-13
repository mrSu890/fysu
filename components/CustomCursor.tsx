"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"

/* Curseur rond (ordinateur seulement) : un point qui suit la souris avec un anneau doux,
   et des ondes qui partent du clic. Invisible sur téléphone et tablette. */
export default function CustomCursor() {
  const [active, setActive] = useState(false)
  const [down, setDown] = useState(false)
  const [over, setOver] = useState(false)
  const [waves, setWaves] = useState<{ id: number; x: number; y: number }[]>([])
  const idRef = useRef(0)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const dotX = useSpring(x, { stiffness: 900, damping: 50, mass: 0.2 })
  const dotY = useSpring(y, { stiffness: 900, damping: 50, mass: 0.2 })
  const ringX = useSpring(x, { stiffness: 260, damping: 26, mass: 0.6 })
  const ringY = useSpring(y, { stiffness: 260, damping: 26, mass: 0.6 })

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)")
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!mq.matches) return
    setActive(true)
    document.documentElement.classList.add("fysu-cursor")

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      x.set(e.clientX)
      y.set(e.clientY)
      const t = e.target as HTMLElement | null
      setOver(Boolean(t?.closest?.("a, button, [role='button'], summary, label, select")))
    }
    const press = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      setDown(true)
      if (reduce.matches) return
      const id = ++idRef.current
      setWaves((w) => [...w.slice(-4), { id, x: e.clientX, y: e.clientY }])
      window.setTimeout(() => setWaves((w) => w.filter((k) => k.id !== id)), 1100)
    }
    const release = () => setDown(false)
    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("pointerdown", press, { passive: true })
    window.addEventListener("pointerup", release, { passive: true })
    return () => {
      document.documentElement.classList.remove("fysu-cursor")
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerdown", press)
      window.removeEventListener("pointerup", release)
    }
  }, [x, y])

  if (!active) return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[99999] mix-blend-difference">
      {waves.map((w) => (
        <span key={w.id} className="absolute" style={{ left: w.x, top: w.y }}>
          {[0, 0.12, 0.24].map((d) => (
            <motion.span
              key={d}
              initial={{ scale: 0.15, opacity: 0.9 }}
              animate={{ scale: 1, opacity: 0 }}
              transition={{ duration: 0.95, delay: d, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -left-[70px] -top-[70px] block h-[140px] w-[140px] rounded-full border border-white"
            />
          ))}
        </span>
      ))}
      <motion.span
        style={{ x: ringX, y: ringY }}
        className="absolute left-0 top-0 block"
      >
        <motion.span
          animate={{ scale: down ? 0.8 : over ? 1.5 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 24 }}
          className="absolute -left-[17px] -top-[17px] block h-[34px] w-[34px] rounded-full border border-white/80"
        />
      </motion.span>
      <motion.span style={{ x: dotX, y: dotY }} className="absolute left-0 top-0 block">
        <motion.span
          animate={{ scale: down ? 0.6 : over ? 0.5 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
          className="absolute -left-[6px] -top-[6px] block h-3 w-3 rounded-full bg-white"
        />
      </motion.span>
    </div>
  )
}
