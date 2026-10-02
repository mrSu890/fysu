"use client"

import { useEffect, useMemo, useRef, useState } from "react"

/* ====================================================================
   RIDEAU DE PIXELS
   Une grille de gros carrés qui couvre tout l'écran.
   - "in"    : les carrés apparaissent vite, dans le désordre (~0,3 s)
   - "solid" : tout est couvert
   - "out"   : les carrés disparaissent un peu au hasard, du bas vers le haut (~1 s)
   Les carrés font environ 64 px (≈ 1,7 cm sur téléphone et iPad).
   ==================================================================== */

export type PixelMode = "in" | "solid" | "out"

const SIZE = 64
const IN_MS = 130 // durée d'un carré qui apparaît
const IN_SPREAD = 170 // étalement des départs (au hasard)
const OUT_MS = 190 // durée d'un carré qui disparaît
const OUT_SWEEP = 520 // temps que met la vague pour monter de bas en haut
const OUT_JITTER = 280 // part de hasard en plus

export const PIXEL_IN_TOTAL = IN_MS + IN_SPREAD + 20
export const PIXEL_OUT_TOTAL = OUT_MS + OUT_SWEEP + OUT_JITTER + 20

export default function PixelGrid({
  mode,
  color = "var(--foreground)",
  onDone,
}: {
  mode: PixelMode
  color?: string
  onDone?: () => void
}) {
  // taille de l'écran au moment où le rideau apparaît
  const [dims] = useState(() => ({
    w: typeof window === "undefined" ? 0 : window.innerWidth,
    h: typeof window === "undefined" ? 0 : window.innerHeight,
  }))

  const { cols, rows, cells } = useMemo(() => {
    const cols = Math.ceil(dims.w / SIZE) + 1
    const rows = Math.ceil(dims.h / SIZE) + 1
    const list: { r: number; c: number; rand: number; rand2: number }[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push({ r, c, rand: Math.random(), rand2: Math.random() })
      }
    }
    return { cols, rows, cells: list }
  }, [dims.w, dims.h])

  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (mode === "solid") return
    const total = mode === "in" ? PIXEL_IN_TOTAL : PIXEL_OUT_TOTAL
    const timer = window.setTimeout(() => onDoneRef.current?.(), total)
    return () => window.clearTimeout(timer)
  }, [mode])

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden"
      style={{ pointerEvents: mode === "out" ? "none" : "auto" }}
    >
      <style>{`@keyframes px-in{from{opacity:0}to{opacity:1}}@keyframes px-out{from{opacity:1}to{opacity:0}}`}</style>
      {cells.map((cell) => {
        let animation: string | undefined
        if (mode === "in") {
          animation = `px-in ${IN_MS}ms ${Math.round(cell.rand * IN_SPREAD)}ms both`
        } else if (mode === "out") {
          // la vague part du bas : la dernière ligne disparaît la première
          const fromBottom = (rows - 1 - cell.r) / Math.max(1, rows - 1)
          const delay = Math.round(fromBottom * OUT_SWEEP + cell.rand2 * OUT_JITTER)
          animation = `px-out ${OUT_MS}ms ${delay}ms both`
        }
        return (
          <span
            key={`${cell.r}-${cell.c}`}
            className="absolute"
            style={{
              left: cell.c * SIZE,
              top: cell.r * SIZE,
              width: SIZE + 1,
              height: SIZE + 1,
              background: color,
              opacity: 1,
              animation,
            }}
          />
        )
      })}
      {/* évite un avertissement si la grille est vide */}
      <span className="hidden">{cols}</span>
    </div>
  )
}
