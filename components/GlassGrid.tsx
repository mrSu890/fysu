"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { PixelMode } from "@/components/PixelGrid"

/* ====================================================================
   RIDEAU DE VERRE (remplace les carrés noirs / blancs entre les pages)
   Même principe que PixelGrid : une grille de carreaux qui couvre l'écran.
   - "in"    : les carreaux se givrent en vague (floutent la page, puis deviennent laiteux)
   - "solid" : tout est opaque, la page change derrière sans qu'on la voie
   - "out"   : les carreaux se dégivrent du bas vers le haut, la nouvelle page apparaît au travers
   Chaque carreau : verre blanc laiteux, flou de ce qu'il y a derrière, reflets et bords de verre.
   ==================================================================== */

const SIZE = 64
const IN_MS = 240
const IN_SPREAD = 220
const OUT_MS = 340
const OUT_SWEEP = 560
const OUT_JITTER = 300

export const GLASS_IN_TOTAL = IN_MS + IN_SPREAD + 20
export const GLASS_OUT_TOTAL = OUT_MS + OUT_SWEEP + OUT_JITTER + 20

export default function GlassGrid({ mode, onDone }: { mode: PixelMode; onDone?: () => void }) {
  const [dims] = useState(() => ({
    w: typeof window === "undefined" ? 0 : window.innerWidth,
    h: typeof window === "undefined" ? 0 : window.innerHeight,
  }))

  const { rows, cells } = useMemo(() => {
    const cols = Math.ceil(dims.w / SIZE) + 1
    const rows = Math.ceil(dims.h / SIZE) + 1
    const list: { r: number; c: number; rand: number; rand2: number; angle: number; hx: number; hy: number }[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push({
          r,
          c,
          rand: Math.random(),
          rand2: Math.random(),
          angle: 110 + Math.random() * 100, // sens du reflet, différent à chaque carreau
          hx: 15 + Math.random() * 60,
          hy: 10 + Math.random() * 60,
        })
      }
    }
    return { rows, cells: list }
  }, [dims.w, dims.h])

  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (mode === "solid") return
    const total = mode === "in" ? GLASS_IN_TOTAL : GLASS_OUT_TOTAL
    const timer = window.setTimeout(() => onDoneRef.current?.(), total)
    return () => window.clearTimeout(timer)
  }, [mode])

  return (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden" style={{ pointerEvents: mode === "out" ? "none" : "auto" }}>
      <style>{`@keyframes gl-in{from{opacity:0}to{opacity:1}}@keyframes gl-out{from{opacity:1}to{opacity:0}}`}</style>
      {cells.map((cell) => {
        let animation: string | undefined
        if (mode === "in") {
          animation = `gl-in ${IN_MS}ms ${Math.round(cell.rand * IN_SPREAD)}ms cubic-bezier(.4,0,.2,1) both`
        } else if (mode === "out") {
          const fromBottom = (rows - 1 - cell.r) / Math.max(1, rows - 1)
          const delay = Math.round(fromBottom * OUT_SWEEP + cell.rand2 * OUT_JITTER)
          animation = `gl-out ${OUT_MS}ms ${delay}ms cubic-bezier(.4,0,.2,1) both`
        }
        const tone = 244 + Math.round(cell.rand * 8) // petite variation de blanc d'un carreau à l'autre
        return (
          <span
            key={`${cell.r}-${cell.c}`}
            className="absolute"
            style={{
              left: cell.c * SIZE,
              top: cell.r * SIZE,
              width: SIZE + 1,
              height: SIZE + 1,
              animation,
              willChange: "opacity",
              WebkitBackdropFilter: "blur(14px) saturate(1.15)",
              backdropFilter: "blur(14px) saturate(1.15)",
              background: `radial-gradient(circle at ${cell.hx}% ${cell.hy}%, rgba(255,255,255,.98), rgba(255,255,255,0) 62%), linear-gradient(${cell.angle}deg, rgba(${tone},${tone},${tone - 3},.96), rgba(${tone - 12},${tone - 12},${tone - 14},.97))`,
              boxShadow:
                "inset 0 0 0 1px rgba(255,255,255,.75), inset 2px 2px 7px rgba(255,255,255,.95), inset -3px -3px 9px rgba(0,0,0,.09)",
            }}
          />
        )
      })}
    </div>
  )
}
