"use client"

import { useEffect, useRef } from "react"
import type { GamesCopy } from "@/lib/games"

/* ====================================================================
   FYSU BIRD : le jeu (canvas). Visuels brodés dans /public/games-bird-*
   Le composant ne connaît ni les scores en ligne ni les réductions :
   il prévient seulement la page quand une partie commence et finit.
   ==================================================================== */

type Props = {
  copy: GamesCopy
  onStart: () => void
  onOver: (score: number) => void
}

const W = 480
const H = 720
const BASE = "/games-bird-"

const GRAVITY = 1500
const FLAP = -430
const SPEED = 150
const PIPE_W = 92
const GAP = 190
const SPACING = 270
const GROUND = H - 70
const BIRD_X = 130
const BIRD_W = 84
const R = 17

type Pipe = { x: number; top: number; passed: boolean }

export default function FysuBirdGame({ copy, onStart, onOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const copyRef = useRef(copy)
  const onStartRef = useRef(onStart)
  const onOverRef = useRef(onOver)
  copyRef.current = copy
  onStartRef.current = onStart
  onOverRef.current = onOver

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext("2d")
    if (!ctx) return
    const c = ctx

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = W * dpr
    cv.height = H * dpr
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    c.imageSmoothingQuality = "high"

    let alive = true
    let raf = 0
    let IMG: Record<string, HTMLImageElement> | null = null
    let best = 0
    try {
      best = Number(localStorage.getItem("fysu-bird-best")) || 0
    } catch {}

    let state: "ready" | "play" | "over" = "ready"
    let bird = { y: H * 0.42, vy: 0 }
    let pipes: Pipe[] = []
    let score = 0
    let bgX = 0
    let t = 0
    let flapT = 0
    let dead = 0
    let last = 0

    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = reject
        i.src = src
      })

    function spawn(x: number) {
      const min = 130
      const max = GROUND - GAP - 70
      pipes.push({ x, top: min + Math.random() * (max - min), passed: false })
    }

    function reset() {
      bird = { y: H * 0.42, vy: 0 }
      pipes = []
      score = 0
      spawn(W + 120)
    }

    function flap() {
      if (!IMG) return
      if (state === "ready") {
        state = "play"
        onStartRef.current()
      }
      if (state === "play") {
        bird.vy = FLAP
        flapT = 0.16
      } else if (state === "over" && dead > 0.5) {
        reset()
        state = "ready"
      }
    }

    /* ---------- dessin ---------- */
    function drawBg() {
      const img = IMG!.fond
      const bw = img.width * (H / img.height)
      const u = ((bgX % (bw * 2)) + bw * 2) % (bw * 2)
      for (let i = Math.floor(u / bw); i * bw - u < W; i++) {
        const x = i * bw - u
        if (i % 2) {
          c.save()
          c.translate(x + bw, 0)
          c.scale(-1, 1)
          c.drawImage(img, 0, 0, bw, H)
          c.restore()
        } else {
          c.drawImage(img, x, 0, bw, H)
        }
      }
    }

    function drawPipe(p: Pipe) {
      const im = IMG!.tuyau
      const cw = im.width
      const ch = im.height
      const capSrc = ch * 0.145
      const bodySrcY = ch * 0.2
      const bodySrcH = ch * 0.6
      const scale = PIPE_W / cw
      const capH = capSrc * scale
      // tuyau du bas (capuchon en haut)
      const by = p.top + GAP
      c.drawImage(im, 0, bodySrcY, cw, bodySrcH, p.x, by + capH - 1, PIPE_W, GROUND + 80 - by)
      c.drawImage(im, 0, 0, cw, capSrc, p.x, by, PIPE_W, capH)
      // tuyau du haut (retourné)
      c.save()
      c.translate(p.x, p.top)
      c.scale(1, -1)
      c.drawImage(im, 0, bodySrcY, cw, bodySrcH, 0, capH - 1, PIPE_W, p.top + 80)
      c.drawImage(im, 0, 0, cw, capSrc, 0, 0, PIPE_W, capH)
      c.restore()
    }

    function drawBird() {
      const up = flapT > 0 || bird.vy < -80
      const im = up ? IMG!.haut : IMG!.bas
      const w = BIRD_W
      const h = (im.height * w) / im.width
      const cy = up ? 0.66 : 0.42
      const rot = Math.max(-0.45, Math.min(0.9, bird.vy / 650))
      c.save()
      c.translate(BIRD_X, bird.y)
      c.rotate(rot)
      if (state === "ready") c.translate(0, Math.sin(t * 5) * 6)
      c.drawImage(im, -w * 0.55, -h * cy, w, h)
      c.restore()
    }

    function text(s: string, x: number, y: number, size: number, color = "#fff", stroke = "rgba(40,70,110,.55)") {
      c.font = `800 ${size}px Helvetica, Arial, sans-serif`
      c.textAlign = "center"
      c.lineJoin = "round"
      c.lineWidth = size * 0.14
      c.strokeStyle = stroke
      c.strokeText(s, x, y)
      c.fillStyle = color
      c.fillText(s, x, y)
    }

    function draw() {
      const cp = copyRef.current
      drawBg()
      pipes.forEach(drawPipe)
      drawBird()
      text(cp.score.toUpperCase(), W / 2, 70, 34)
      text(String(score).padStart(2, "0"), W / 2, 122, 54)
      if (state === "ready") {
        text("FYSU BIRD", W / 2, 270, 46)
        text(cp.reward, W / 2, 320, 19)
        text(cp.tapToFly, W / 2, 560, 22)
        text(cp.tapToFly2, W / 2, 590, 22)
      }
      if (state === "over") {
        c.fillStyle = "rgba(30,50,80,.35)"
        c.fillRect(0, 0, W, H)
        text(cp.lost, W / 2, 290, 58)
        text(`${cp.score} ${score}   ·   ${cp.record} ${best}`, W / 2, 345, 26)
        if (dead > 0.5) text(cp.replay, W / 2, 420, 24)
      }
    }

    /* ---------- logique ---------- */
    function hit() {
      if (bird.y + R > GROUND || bird.y - R < -40) return true
      for (const p of pipes) {
        const px0 = p.x + 8
        const px1 = p.x + PIPE_W - 8
        if (BIRD_X + R > px0 && BIRD_X - R < px1 && (bird.y - R < p.top - 4 || bird.y + R > p.top + GAP + 4)) {
          return true
        }
      }
      return false
    }

    function update(dt: number) {
      t += dt
      flapT = Math.max(0, flapT - dt)
      if (state === "ready") {
        bgX += SPEED * 0.12 * dt
        return
      }
      if (state === "over") {
        dead += dt
        bird.vy += GRAVITY * dt
        bird.y = Math.min(GROUND - R, bird.y + bird.vy * dt)
        return
      }
      bird.vy += GRAVITY * dt
      bird.y += bird.vy * dt
      bgX += SPEED * 0.35 * dt
      pipes.forEach((p) => (p.x -= SPEED * dt))
      if (pipes[0].x < -PIPE_W - 10) pipes.shift()
      const lastPipe = pipes[pipes.length - 1]
      if (lastPipe.x < W - SPACING) spawn(lastPipe.x + SPACING)
      pipes.forEach((p) => {
        if (!p.passed && p.x + PIPE_W < BIRD_X - R) {
          p.passed = true
          score++
        }
      })
      if (hit()) {
        state = "over"
        dead = 0
        bird.vy = -120
        if (score > best) {
          best = score
          try {
            localStorage.setItem("fysu-bird-best", String(best))
          } catch {}
        }
        onOverRef.current(score)
      }
    }

    function loop(ts: number) {
      if (!alive) return
      const dt = Math.min(0.033, (ts - last) / 1000 || 0.016)
      last = ts
      update(dt)
      draw()
      raf = requestAnimationFrame(loop)
    }

    /* ---------- entrées ---------- */
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault()
        flap()
      }
    }
    const onPointer = (e: PointerEvent) => {
      e.preventDefault()
      flap()
    }
    window.addEventListener("keydown", onKey)
    cv.addEventListener("pointerdown", onPointer)

    Promise.all([load(BASE + "fond.jpg"), load(BASE + "pie-bas.png"), load(BASE + "pie-haut.png"), load(BASE + "tuyau.png")])
      .then(([fond, bas, haut, tuyau]) => {
        if (!alive) return
        IMG = { fond, bas, haut, tuyau }
        reset()
        raf = requestAnimationFrame(loop)
      })
      .catch(() => {})

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener("keydown", onKey)
      cv.removeEventListener("pointerdown", onPointer)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="block touch-none select-none"
      style={{ height: "100%", maxWidth: "100%", aspectRatio: `${W} / ${H}`, background: "#bcd9ee" }}
    />
  )
}
