"use client"

import { useEffect, useRef, useState } from "react"

/* Petit nombre en police « info » qui monte de 00 jusqu'à la bonne valeur
   quand il arrive à l'écran (rapide, discret, faible opacité).
   Usage : <CountUp value={24} />  →  « 24 » ;  <CountUp value={3} prefix="( " suffix=" )" />  →  « ( 03 ) » */

export default function CountUp({
  value,
  pad = 2,
  duration = 900,
  prefix = "",
  suffix = "",
  opacity = 0.4,
  className = "",
}: {
  value: number
  pad?: number
  duration?: number
  prefix?: string
  suffix?: string
  opacity?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState(0)
  const nRef = useRef(0)
  const seen = useRef(false)
  const raf = useRef<number | null>(null)

  function run(to: number) {
    if (raf.current) cancelAnimationFrame(raf.current)
    const reduce =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.classList.contains("a11y-calm"))
    const from = nRef.current
    if (reduce || from === to) {
      nRef.current = to
      setN(to)
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = Math.round(from + (to - from) * eased)
      nRef.current = v
      setN(v)
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }

  // démarre quand le nombre devient visible (une seule fois), puis suit la valeur si elle change
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (seen.current) {
      run(value)
      return
    }
    if (typeof IntersectionObserver === "undefined") {
      seen.current = true
      run(value)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          seen.current = true
          io.disconnect()
          run(value)
        }
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    },
    []
  )

  return (
    <span ref={ref} className={`font-info tabular-nums ${className}`} style={{ opacity }}>
      {prefix}
      {String(n).padStart(pad, "0")}
      {suffix}
    </span>
  )
}
