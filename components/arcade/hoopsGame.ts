import { NEON, clamp, rand, type ArcadeMaker } from "@/lib/arcadeKit"

/* FYSU Hoops : enchaîne les paniers. Un panier raté = fin. */

const G = 1000
const BR = 22
const START = { x: 90, y: 610 }
const MAX_PULL = 140
const K = 8
const RIM_W = 88

export const makeHoops: ArcadeMaker = ({ c, W, H, end }) => {
  let score = 0
  let dead = false
  let hx = 330
  let hy = 300
  let ball = { x: START.x, y: START.y, vx: 0, vy: 0 }
  let flying = false
  let scored = false
  let after = 0
  let aim: { sx: number; sy: number; px: number; py: number } | null = null
  let missT = 0
  let swish = 0
  let spin = 0

  const rx0 = () => hx - RIM_W / 2
  const rx1 = () => hx + RIM_W / 2

  function newHoop() {
    hx = rand(280, 365)
    hy = rand(240, 400)
  }

  function reset() {
    score = 0
    dead = false
    newHoop()
    ball = { x: START.x, y: START.y, vx: 0, vy: 0 }
    flying = false
    scored = false
    aim = null
    missT = 0
    swish = 0
  }

  function bounceOff(px: number, py: number, pr: number, rest: number) {
    const dx = ball.x - px
    const dy = ball.y - py
    const d = Math.hypot(dx, dy)
    const m = BR + pr
    if (d > 0 && d < m) {
      const nx = dx / d
      const ny = dy / d
      ball.x = px + nx * m
      ball.y = py + ny * m
      const vn = ball.vx * nx + ball.vy * ny
      if (vn < 0) {
        ball.vx -= (1 + rest) * vn * nx
        ball.vy -= (1 + rest) * vn * ny
      }
    }
  }

  function update(dt: number) {
    swish = Math.max(0, swish - dt)
    if (dead) return
    if (!flying) return
    const n = 3
    for (let i = 0; i < n; i++) {
      const h = dt / n
      const py = ball.y
      ball.vy += G * h
      ball.x += ball.vx * h
      ball.y += ball.vy * h
      spin += ball.vx * h * 0.03

      if (!scored) {
        bounceOff(rx0(), hy, 5, 0.55)
        bounceOff(rx1(), hy, 5, 0.55)
        // panneau
        const bx = rx1() + 10
        if (ball.x + BR > bx && ball.x - BR < bx + 12 && ball.y > hy - 120 && ball.y < hy + 8) {
          ball.x = bx - BR
          ball.vx = -Math.abs(ball.vx) * 0.55
        }
        // panier : traverse l'anneau en descendant
        if (ball.vy > 0 && py < hy && ball.y >= hy && ball.x > rx0() + 8 && ball.x < rx1() - 8) {
          scored = true
          score++
          swish = 0.5
        }
        if (ball.vy > 0 && ball.y > hy + 95 && !scored) {
          missT += h
        }
      } else {
        // dans le filet : on le guide vers le bas
        ball.vx *= 0.9
      }
    }
    if (!scored && (missT > 0.12 || ball.y > H + 60 || ball.x < -80 || ball.x > W + 80)) {
      dead = true
      end()
      return
    }
    if (scored) {
      after += dt
      if (after > 0.75 || ball.y > H + 40) {
        after = 0
        flying = false
        scored = false
        missT = 0
        newHoop()
        ball = { x: START.x, y: START.y, vx: 0, vy: 0 }
      }
    }
  }

  function launchVel(a: { sx: number; sy: number; px: number; py: number }) {
    const dx = a.sx - a.px
    const dy = a.sy - a.py
    const len = Math.hypot(dx, dy)
    if (len < 10) return null
    const pw = Math.min(len, MAX_PULL)
    return { vx: (dx / len) * pw * K, vy: (dy / len) * pw * K, pw: pw / MAX_PULL }
  }

  function drawBall(x: number, y: number, r: number) {
    c.save()
    c.translate(x, y)
    c.rotate(spin)
    const g = c.createRadialGradient(-r * 0.35, -r * 0.4, 2, 0, 0, r)
    g.addColorStop(0, "#ff9a4d")
    g.addColorStop(1, "#c4410c")
    c.fillStyle = g
    c.beginPath()
    c.arc(0, 0, r, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = "#2a1005"
    c.lineWidth = 2
    c.beginPath()
    c.arc(0, 0, r, 0, Math.PI * 2)
    c.moveTo(-r, 0)
    c.lineTo(r, 0)
    c.moveTo(0, -r)
    c.lineTo(0, r)
    c.stroke()
    c.beginPath()
    c.arc(-r * 1.15, 0, r * 0.85, -0.9, 0.9)
    c.arc(r * 1.15, 0, r * 0.85, Math.PI - 0.9, Math.PI + 0.9)
    c.stroke()
    c.restore()
  }

  function draw() {
    // salle
    const g = c.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, "#0b0f24")
    g.addColorStop(1, "#1a1030")
    c.fillStyle = g
    c.fillRect(0, 0, W, H)
    c.strokeStyle = "rgba(63,208,255,.12)"
    c.lineWidth = 1
    for (let x = 0; x < W; x += 40) {
      c.beginPath()
      c.moveTo(x, 0)
      c.lineTo(x, 650)
      c.stroke()
    }
    // parquet
    c.fillStyle = "#b9722e"
    c.fillRect(0, 650, W, H - 650)
    c.strokeStyle = "rgba(0,0,0,.25)"
    for (let x = 0; x < W; x += 60) {
      c.beginPath()
      c.moveTo(x, 650)
      c.lineTo(x - 30, H)
      c.stroke()
    }
    c.fillStyle = NEON.orange
    c.fillRect(0, 648, W, 4)

    // panneau + support
    const bx = rx1() + 10
    c.fillStyle = "rgba(255,255,255,.9)"
    c.fillRect(bx, hy - 120, 12, 128)
    c.strokeStyle = NEON.pink
    c.lineWidth = 3
    c.strokeRect(bx, hy - 120, 12, 128)
    // filet
    const sw = swish > 0 ? Math.sin(swish * 40) * 4 : 0
    c.strokeStyle = "rgba(255,255,255,.75)"
    c.lineWidth = 1.5
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      c.beginPath()
      c.moveTo(rx0() + t * RIM_W, hy)
      c.lineTo(rx0() + 14 + t * (RIM_W - 28) + sw, hy + 52)
      c.stroke()
    }
    for (let j = 1; j <= 3; j++) {
      const t = j / 4
      c.beginPath()
      c.moveTo(rx0() + 14 * t, hy + 52 * t)
      c.lineTo(rx1() - 14 * t + sw * t, hy + 52 * t)
      c.stroke()
    }
    // anneau
    c.strokeStyle = NEON.orange
    c.lineWidth = 7
    c.lineCap = "round"
    c.beginPath()
    c.moveTo(rx0(), hy)
    c.lineTo(rx1(), hy)
    c.stroke()
    c.lineCap = "butt"

    // trajectoire
    if (aim && !flying && !dead) {
      const v = launchVel(aim)
      if (v) {
        c.fillStyle = "rgba(255,255,255,.85)"
        let x = START.x
        let y = START.y
        let vx = v.vx
        let vy = v.vy
        for (let i = 0; i < 16; i++) {
          for (let k = 0; k < 3; k++) {
            vy += G * 0.015
            x += vx * 0.015
            y += vy * 0.015
          }
          c.beginPath()
          c.arc(x, y, 4 - i * 0.12, 0, Math.PI * 2)
          c.fill()
        }
        c.fillStyle = "rgba(255,255,255,.15)"
        c.fillRect(W / 2 - 80, H - 22, 160, 8)
        c.fillStyle = v.pw > 0.8 ? NEON.orange : NEON.green
        c.fillRect(W / 2 - 80, H - 22, 160 * v.pw, 8)
      }
    }
    // balle (derrière l'anneau quand elle tombe dans le filet : on la dessine après)
    const bxp = aim && !flying ? START.x - (aim.sx - aim.px) * 0.25 : ball.x
    const byp = aim && !flying ? START.y - (aim.sy - aim.py) * 0.25 : ball.y
    drawBall(flying ? ball.x : clamp(bxp, 40, 200), flying ? ball.y : clamp(byp, 560, 660), BR)
    // avant de l'anneau
    if (swish > 0) {
      c.strokeStyle = NEON.yellow
      c.lineWidth = 3
      c.beginPath()
      c.arc(hx, hy, 30 + (0.5 - swish) * 80, 0, Math.PI * 2)
      c.stroke()
    }
  }

  return {
    reset,
    update,
    draw,
    score: () => score,
    down(x, y) {
      if (flying || dead) return
      aim = { sx: x, sy: y, px: x, py: y }
    },
    move(x, y) {
      if (aim) {
        aim.px = x
        aim.py = y
      }
    },
    up() {
      if (!aim || flying || dead) {
        aim = null
        return
      }
      const v = launchVel(aim)
      aim = null
      if (!v) return
      ball = { x: START.x, y: START.y, vx: v.vx, vy: v.vy }
      flying = true
      scored = false
      missT = 0
      after = 0
    },
  }
}
