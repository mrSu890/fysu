/* ====================================================================
   EAU QUI MONTE ET REDESCEND (écran de chargement The Wave)
   Dessin pur sur un canvas : surface organique (plusieurs ondes), 2 couches, bulles.
   ==================================================================== */

export type Bubble = { x: number; y: number; r: number; vy: number; ph: number; wob: number }

export const RISE_MS = 1250
export const HOLD_MS = 160
export const DROP_MS = 1150
export const TOTAL_MS = RISE_MS + HOLD_MS + DROP_MS

const TOP = -0.2 // niveau d'eau quand tout l'écran est couvert (au-dessus du haut de l'écran)
const BOTTOM = 1.1 // niveau d'eau quand l'écran est vide (sous le bas de l'écran)

const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// niveau de l'eau (0 = haut de l'écran, 1 = bas) à l'instant ms
export function levelAt(ms: number) {
  if (ms <= RISE_MS) return BOTTOM + (TOP - BOTTOM) * easeInOut(clamp01(ms / RISE_MS))
  if (ms <= RISE_MS + HOLD_MS) return TOP
  return TOP + (BOTTOM - TOP) * easeInOut(clamp01((ms - RISE_MS - HOLD_MS) / DROP_MS))
}

// true quand l'eau couvre tout l'écran (le fond blanc peut alors disparaître sans qu'on le voie)
export const isCovered = (ms: number) => levelAt(ms) < -0.1

function surfaceY(x: number, w: number, h: number, level: number, t: number, amp: number, seed: number) {
  const k = (Math.PI * 2) / Math.max(320, w * 0.75)
  return (
    level * h +
    amp *
      (Math.sin(x * k * 1.0 + t * 2.1 + seed) +
        0.55 * Math.sin(x * k * 1.9 - t * 2.9 + seed * 1.7) +
        0.3 * Math.sin(x * k * 3.4 + t * 4.1 + seed * 0.6))
  )
}

function layer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  level: number,
  t: number,
  amp: number,
  seed: number,
  fill: string
) {
  ctx.beginPath()
  ctx.moveTo(0, h + 10)
  const step = Math.max(6, w / 90)
  for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, surfaceY(x, w, h, level, t, amp, seed))
  ctx.lineTo(w + step, h + 10)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

export function stepBubbles(bubbles: Bubble[], dt: number, w: number, h: number, ms: number) {
  const t = ms / 1000
  const level = levelAt(ms)
  const amp = Math.min(34, h * 0.035)
  // nouvelles bulles, tant qu'il y a de l'eau
  const surface = level * h
  if (surface < h - 30 && bubbles.length < 70) {
    const n = dt * 34
    let spawn = Math.floor(n) + (Math.random() < n - Math.floor(n) ? 1 : 0)
    while (spawn-- > 0) {
      const top = Math.max(0, surface + amp + 10)
      const y = top + Math.random() * Math.max(10, h - top)
      const r = 3 + Math.random() * Math.random() * 15
      bubbles.push({ x: Math.random() * w, y, r, vy: (60 + Math.random() * 150) * (h / 800), ph: Math.random() * 6.28, wob: 6 + Math.random() * 14 })
    }
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]
    b.y -= b.vy * dt * (1 + b.r / 40)
    b.x += Math.sin(t * 3 + b.ph) * b.wob * dt
    const s = surfaceY(b.x, w, h, level, t, amp, 0)
    // la bulle éclate en arrivant à la surface
    if (b.y < s + b.r * 0.4 || b.y < -b.r) bubbles.splice(i, 1)
  }
}

export function drawWater(ctx: CanvasRenderingContext2D, w: number, h: number, ms: number, bubbles: Bubble[]) {
  const t = ms / 1000
  ctx.clearRect(0, 0, w, h)
  const amp = Math.min(34, h * 0.035)

  // couche claire : un peu en avance sur la principale, elle forme la crête
  layer(ctx, w, h, levelAt(ms + 130), t, amp * 1.15, 2.1, "#6cc3ea")
  // couche principale
  layer(ctx, w, h, levelAt(ms), t, amp, 0, "#0393d1")

  // reflets de la surface
  ctx.beginPath()
  const level = levelAt(ms)
  const step = Math.max(6, w / 90)
  for (let x = 0; x <= w + step; x += step) {
    const y = surfaceY(x, w, h, level, t, amp, 0)
    if (x === 0) ctx.moveTo(x, y + 2)
    else ctx.lineTo(x, y + 2)
  }
  ctx.strokeStyle = "rgba(255,255,255,0.35)"
  ctx.lineWidth = 2
  ctx.stroke()

  // bulles
  for (const b of bubbles) {
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255,255,255,0.16)"
    ctx.fill()
    ctx.lineWidth = Math.max(1, b.r * 0.12)
    ctx.strokeStyle = "rgba(255,255,255,0.65)"
    ctx.stroke()
    // petit reflet
    ctx.beginPath()
    ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(1, b.r * 0.2), 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255,255,255,0.85)"
    ctx.fill()
  }
}
