"use client"

import { useEffect, useRef } from "react"
import type { GamesCopy } from "@/lib/games"
import { AH, AW, NEON, pixelText, type ArcadeMaker } from "@/lib/arcadeKit"

/* ====================================================================
   Cadre commun des jeux sans récompense : écran d'accueil, score,
   « perdu », record (sur l'appareil) et rejouer. Le jeu lui-même
   (voir lib/arcadeKit.ts pour l'interface) ne dessine que son décor.
   ==================================================================== */

type Props = {
  make: ArcadeMaker
  title: string
  hint: [string, string]
  bestKey: string
  copy: GamesCopy
  skin: { bg: string; ball: string }
  /** éléments à débloquer : score à atteindre + nom affiché */
  unlocks: { need: number; label: string }[]
  unlockedLabel: string
  onState?: (s: "ready" | "play" | "over") => void
}

export default function ArcadeCanvas({ make, title, hint, bestKey, copy, skin, unlocks, unlockedLabel, onState }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const propsRef = useRef({ title, hint, copy, unlocks, unlockedLabel, onState })
  propsRef.current = { title, hint, copy, unlocks, unlockedLabel, onState }

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext("2d")
    if (!ctx) return
    const c = ctx

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = AW * dpr
    cv.height = AH * dpr
    c.setTransform(dpr, 0, 0, dpr, 0, 0)

    // la taille d'affichage garde toujours les proportions du jeu (pas d'image étirée)
    const holder = cv.parentElement
    const fit = () => {
      if (!holder) return
      const k = Math.min(holder.clientWidth / AW, holder.clientHeight / AH)
      if (k > 0) {
        cv.style.width = `${AW * k}px`
        cv.style.height = `${AH * k}px`
      }
    }
    fit()
    const ro = holder && typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null
    if (holder) ro?.observe(holder)
    window.addEventListener("resize", fit)

    let alive = true
    let raf = 0
    let last = 0
    let state: "ready" | "play" | "over" = "ready"
    let overT = 0
    let t = 0
    let best = 0
    let fresh: string[] = []
    const setState = (n: "ready" | "play" | "over") => {
      state = n
      propsRef.current.onState?.(n)
    }
    try {
      best = Number(localStorage.getItem(bestKey)) || 0
    } catch {}

    const game = make({
      c,
      W: AW,
      H: AH,
      skin,
      end: () => {
        if (state !== "play") return
        setState("over")
        overT = 0
        const s = game.score()
        fresh = propsRef.current.unlocks.filter((u) => u.need > best && u.need <= s).map((u) => u.label)
        if (s > best) {
          best = s
          try {
            localStorage.setItem(bestKey, String(best))
          } catch {}
        }
      },
    })
    game.reset()

    function overlay() {
      const p = propsRef.current
      const cp = p.copy
      if (state === "ready") {
        c.fillStyle = "rgba(0,0,0,.55)"
        c.fillRect(0, 0, AW, AH)
        pixelText(c, p.title.toUpperCase(), AW / 2, 250, 26, NEON.cyan)
        pixelText(c, p.hint[0], AW / 2, 420, 13, "#fff")
        pixelText(c, p.hint[1], AW / 2, 448, 13, "#fff")
        if (Math.floor(t * 2) % 2 === 0) pixelText(c, cp.pressStart, AW / 2, 540, 16, NEON.yellow)
        pixelText(c, `${cp.highScore} ${String(best).padStart(3, "0")}`, AW / 2, 600, 12, NEON.green)
      } else if (state === "play") {
        pixelText(c, String(game.score()), AW / 2, 78, 40, "#fff")
      } else {
        c.fillStyle = "rgba(0,0,0,.6)"
        c.fillRect(0, 0, AW, AH)
        pixelText(c, cp.lost, AW / 2, 280, 40, NEON.orange)
        pixelText(c, `${cp.score.toUpperCase()} ${game.score()}`, AW / 2, 360, 20, "#fff")
        pixelText(c, `${cp.record.toUpperCase()} ${best}`, AW / 2, 410, 16, NEON.yellow)
        fresh.slice(0, 3).forEach((n, i) => pixelText(c, `${p.unlockedLabel} : ${n}`, AW / 2, 460 + i * 26, 12, NEON.green))
        if (overT > 0.7 && Math.floor(t * 2) % 2 === 0) pixelText(c, cp.replay, AW / 2, 560, 13, NEON.cyan)
      }
    }

    function loop(ts: number) {
      if (!alive) return
      const dt = Math.min(0.033, (ts - last) / 1000 || 0.016)
      last = ts
      t += dt
      if (state === "over") overT += dt
      if (state !== "ready") game.update(dt)
      game.draw()
      overlay()
      raf = requestAnimationFrame(loop)
    }

    const pos = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      return { x: ((e.clientX - r.left) / r.width) * AW, y: ((e.clientY - r.top) / r.height) * AH }
    }
    const onDown = (e: PointerEvent) => {
      e.preventDefault()
      try {
        cv.setPointerCapture(e.pointerId)
      } catch {}
      if (state === "over") {
        if (overT > 0.7) {
          game.reset()
          setState("ready")
        }
        return
      }
      if (state === "ready") setState("play")
      const p = pos(e)
      game.down(p.x, p.y)
    }
    const onMove = (e: PointerEvent) => {
      if (state !== "play") return
      e.preventDefault()
      const p = pos(e)
      game.move(p.x, p.y)
    }
    const onUp = (e: PointerEvent) => {
      if (state !== "play") return
      const p = pos(e)
      game.up(p.x, p.y)
    }
    cv.addEventListener("pointerdown", onDown)
    cv.addEventListener("pointermove", onMove)
    cv.addEventListener("pointerup", onUp)
    cv.addEventListener("pointercancel", onUp)

    // sur ordinateur : flèches / espace (seulement pour les jeux qui les gèrent)
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], Space: [0, -1] }
      const d = map[e.code]
      if (!d || !game.key) return
      e.preventDefault()
      if (state === "over") {
        if (overT > 0.7) {
          game.reset()
          setState("ready")
        }
        return
      }
      if (state === "ready") setState("play")
      game.key(d[0], d[1])
    }
    window.addEventListener("keydown", onKey)

    raf = requestAnimationFrame(loop)
    return () => {
      alive = false
      ro?.disconnect()
      window.removeEventListener("resize", fit)
      cancelAnimationFrame(raf)
      cv.removeEventListener("pointerdown", onDown)
      cv.removeEventListener("pointermove", onMove)
      cv.removeEventListener("pointerup", onUp)
      cv.removeEventListener("pointercancel", onUp)
      window.removeEventListener("keydown", onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [make, bestKey, skin])

  return (
    <canvas
      ref={ref}
      className="block touch-none select-none"
      style={{ width: "100%", aspectRatio: `${AW} / ${AH}`, background: "#000" }}
    />
  )
}
