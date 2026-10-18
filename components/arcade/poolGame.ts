import { NEON, clamp, rand, type ArcadeMaker } from "@/lib/arcadeKit"
import { skinItem } from "@/lib/skins"

/* FYSU Pool : un coup = au moins une bille rentrée, sinon fin.
   Le score est le nombre de coups réussis d'affilée. */

const TX0 = 30
const TX1 = 450
const TY0 = 130
const TY1 = 690
const R = 12
const POCKET_R = 25
const POCKETS: [number, number][] = [
  [TX0, TY0],
  [TX1, TY0],
  [TX0, (TY0 + TY1) / 2],
  [TX1, (TY0 + TY1) / 2],
  [TX0, TY1],
  [TX1, TY1],
]
const COLORS = [NEON.yellow, NEON.pink, NEON.cyan, NEON.orange, NEON.green, "#b583ff", "#ff9bd0"]
const MAX_PULL = 150
const MAX_SPEED = 1250

type Ball = { x: number; y: number; vx: number; vy: number; ci: number; cue: boolean; sunk: number }

export const makePool: ArcadeMaker = ({ c, W, H, end, skin }) => {
  const ballColors = () => skinItem("fysu-pool", "ball", skin.ball)?.colors ?? COLORS
  const felt = () => skinItem("fysu-pool", "bg", skin.bg)?.colors ?? ["#0f6b43", "#1c8a55"]
  let balls: Ball[] = []
  let score = 0
  let dead = false
  let rolling = false
  let sunkThisShot = 0
  let aim: { sx: number; sy: number; px: number; py: number } | null = null
  let flash = 0

  const cue = () => balls.find((b) => b.cue)!

  function free(x: number, y: number) {
    if (x < TX0 + 40 || x > TX1 - 40 || y < TY0 + 40 || y > TY1 - 40) return false
    for (const p of POCKETS) if (Math.hypot(p[0] - x, p[1] - y) < 60) return false
    return balls.every((b) => Math.hypot(b.x - x, b.y - y) > R * 3)
  }

  function addBalls(n: number) {
    let tries = 0
    let k = 0
    while (k < n && tries++ < 400) {
      const x = rand(TX0 + 40, TX1 - 40)
      const y = rand(TY0 + 40, TY1 - 200)
      if (free(x, y)) {
        balls.push({ x, y, vx: 0, vy: 0, ci: balls.length + k, cue: false, sunk: 0 })
        k++
      }
    }
  }

  function reset() {
    balls = [{ x: W / 2, y: TY1 - 110, vx: 0, vy: 0, ci: 0, cue: true, sunk: 0 }]
    addBalls(6)
    score = 0
    dead = false
    rolling = false
    aim = null
    sunkThisShot = 0
    flash = 0
  }

  function step(dt: number) {
    for (const b of balls) {
      b.x += b.vx * dt
      b.y += b.vy * dt
      const f = Math.exp(-1.15 * dt)
      b.vx *= f
      b.vy *= f
      if (Math.hypot(b.vx, b.vy) < 9) {
        b.vx = 0
        b.vy = 0
      }
    }
    // billes entre elles
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i]
        const b = balls[j]
        if (a.sunk || b.sunk) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.hypot(dx, dy)
        if (d > 0 && d < R * 2) {
          const nx = dx / d
          const ny = dy / d
          const overlap = R * 2 - d
          a.x -= nx * overlap * 0.5
          a.y -= ny * overlap * 0.5
          b.x += nx * overlap * 0.5
          b.y += ny * overlap * 0.5
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
          if (rv < 0) {
            const j2 = -rv * 0.97
            a.vx -= j2 * nx
            a.vy -= j2 * ny
            b.vx += j2 * nx
            b.vy += j2 * ny
          }
        }
      }
    }
    // poches
    for (const b of balls) {
      if (b.sunk) continue
      for (const p of POCKETS) {
        if (Math.hypot(b.x - p[0], b.y - p[1]) < POCKET_R) {
          b.sunk = 1
          b.x = p[0]
          b.y = p[1]
          b.vx = 0
          b.vy = 0
          if (b.cue) {
            dead = true
          } else {
            sunkThisShot++
          }
        }
      }
    }
    // bandes
    for (const b of balls) {
      if (b.sunk) continue
      if (b.x < TX0 + R) {
        b.x = TX0 + R
        b.vx = Math.abs(b.vx) * 0.82
      } else if (b.x > TX1 - R) {
        b.x = TX1 - R
        b.vx = -Math.abs(b.vx) * 0.82
      }
      if (b.y < TY0 + R) {
        b.y = TY0 + R
        b.vy = Math.abs(b.vy) * 0.82
      } else if (b.y > TY1 - R) {
        b.y = TY1 - R
        b.vy = -Math.abs(b.vy) * 0.82
      }
    }
  }

  function update(dt: number) {
    flash = Math.max(0, flash - dt)
    // billes rentrées : on les retire un instant plus tard
    for (const b of balls) if (b.sunk) b.sunk += dt
    balls = balls.filter((b) => b.sunk < 0.35 || b.cue)
    if (dead) return
    if (!rolling) return
    const n = 4
    for (let i = 0; i < n; i++) step(dt / n)
    if (dead) {
      end()
      return
    }
    if (balls.every((b) => b.sunk || (b.vx === 0 && b.vy === 0))) {
      rolling = false
      if (sunkThisShot > 0) {
        score++
        flash = 0.35
        if (balls.filter((b) => !b.cue && !b.sunk).length < 3) addBalls(4)
      } else {
        dead = true
        end()
      }
    }
  }

  function rayHit(ox: number, oy: number, dx: number, dy: number) {
    // premier obstacle : bille ou bande
    let best = 900
    let ball: Ball | null = null
    for (const b of balls) {
      if (b.cue || b.sunk) continue
      const fx = b.x - ox
      const fy = b.y - oy
      const proj = fx * dx + fy * dy
      if (proj <= 0) continue
      const perp = Math.abs(fx * dy - fy * dx)
      if (perp < R * 2) {
        const t = proj - Math.sqrt(Math.max(0, R * R * 4 - perp * perp))
        if (t < best) {
          best = t
          ball = b
        }
      }
    }
    const walls: number[] = []
    if (dx > 0) walls.push((TX1 - R - ox) / dx)
    if (dx < 0) walls.push((TX0 + R - ox) / dx)
    if (dy > 0) walls.push((TY1 - R - oy) / dy)
    if (dy < 0) walls.push((TY0 + R - oy) / dy)
    for (const t of walls) if (t >= 0 && t < best) best = t
    return { t: best, ball }
  }

  function ball3d(b: Ball) {
    const g = c.createRadialGradient(b.x - R * 0.35, b.y - R * 0.4, 1, b.x, b.y, R)
    g.addColorStop(0, "#fff")
    const pal = ballColors()
    g.addColorStop(0.25, b.cue ? "#fff" : pal[b.ci % pal.length])
    g.addColorStop(1, "#111")
    c.fillStyle = g
    c.beginPath()
    c.arc(b.x, b.y, R, 0, Math.PI * 2)
    c.fill()
  }

  function draw() {
    c.fillStyle = "#06080f"
    c.fillRect(0, 0, W, H)
    // bois
    c.fillStyle = "#3a2312"
    c.fillRect(TX0 - 22, TY0 - 22, TX1 - TX0 + 44, TY1 - TY0 + 44)
    c.strokeStyle = NEON.orange
    c.lineWidth = 2
    c.strokeRect(TX0 - 22, TY0 - 22, TX1 - TX0 + 44, TY1 - TY0 + 44)
    // tapis
    c.fillStyle = flash > 0 ? felt()[1] : felt()[0]
    c.fillRect(TX0, TY0, TX1 - TX0, TY1 - TY0)
    c.strokeStyle = "rgba(255,255,255,.07)"
    c.lineWidth = 1
    for (let y = TY0; y < TY1; y += 8) {
      c.beginPath()
      c.moveTo(TX0, y)
      c.lineTo(TX1, y)
      c.stroke()
    }
    // poches
    c.fillStyle = "#000"
    for (const p of POCKETS) {
      c.beginPath()
      c.arc(p[0], p[1], POCKET_R, 0, Math.PI * 2)
      c.fill()
    }
    // ombre + billes
    for (const b of balls) {
      const s = b.sunk ? Math.max(0, 1 - b.sunk / 0.35) : 1
      if (s <= 0) continue
      c.save()
      c.translate(b.x, b.y)
      c.scale(s, s)
      c.translate(-b.x, -b.y)
      c.fillStyle = "rgba(0,0,0,.3)"
      c.beginPath()
      c.ellipse(b.x + 3, b.y + 4, R, R * 0.85, 0, 0, Math.PI * 2)
      c.fill()
      ball3d(b)
      c.restore()
    }
    // visée
    if (aim && !rolling && !dead) {
      const cb = cue()
      let dx = aim.sx - aim.px
      let dy = aim.sy - aim.py
      const len = Math.hypot(dx, dy)
      if (len > 8) {
        const pw = Math.min(len, MAX_PULL) / MAX_PULL
        dx /= len
        dy /= len
        const hit = rayHit(cb.x, cb.y, dx, dy)
        c.setLineDash([6, 8])
        c.strokeStyle = "rgba(255,255,255,.8)"
        c.lineWidth = 2
        c.beginPath()
        c.moveTo(cb.x, cb.y)
        c.lineTo(cb.x + dx * hit.t, cb.y + dy * hit.t)
        c.stroke()
        c.setLineDash([])
        c.strokeStyle = "rgba(255,255,255,.8)"
        c.beginPath()
        c.arc(cb.x + dx * hit.t, cb.y + dy * hit.t, R, 0, Math.PI * 2)
        c.stroke()
        // queue + jauge de puissance
        const back = 22 + pw * 70
        c.strokeStyle = NEON.yellow
        c.lineWidth = 5
        c.beginPath()
        c.moveTo(cb.x - dx * back, cb.y - dy * back)
        c.lineTo(cb.x - dx * (back + 150), cb.y - dy * (back + 150))
        c.stroke()
        c.fillStyle = "rgba(255,255,255,.15)"
        c.fillRect(W / 2 - 80, H - 22, 160, 8)
        c.fillStyle = pw > 0.8 ? NEON.orange : NEON.green
        c.fillRect(W / 2 - 80, H - 22, 160 * pw, 8)
      }
    }
  }

  return {
    reset,
    update,
    draw,
    score: () => score,
    down(x, y) {
      if (rolling || dead) return
      aim = { sx: x, sy: y, px: x, py: y }
    },
    move(x, y) {
      if (aim) {
        aim.px = x
        aim.py = y
      }
    },
    up() {
      if (!aim || rolling || dead) {
        aim = null
        return
      }
      const dx = aim.sx - aim.px
      const dy = aim.sy - aim.py
      const len = Math.hypot(dx, dy)
      aim = null
      if (len < 12) return
      const pw = clamp(len, 0, MAX_PULL) / MAX_PULL
      const cb = cue()
      cb.vx = (dx / len) * MAX_SPEED * pw
      cb.vy = (dy / len) * MAX_SPEED * pw
      rolling = true
      sunkThisShot = 0
    },
  }
}
