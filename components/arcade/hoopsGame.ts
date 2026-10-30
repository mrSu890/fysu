import { NEON, clamp, rand, pixelText, type ArcadeMaker } from "@/lib/arcadeKit"
import { skinItem } from "@/lib/skins"

/* ====================================================================
   FYSU Hoops (vue du joueur, panier face à l'écran)
   - le panier est devant toi, la balle est en bas : glisse vers le haut et relâche pour tirer
     (plus tu glisses, plus le tir est fort ; glisse un peu sur le côté pour viser)
   - un panier raté = fin
   - SWISH (ni anneau ni panneau touchés) = 2 points ; un panier qui touche = 1 point
   - 3 swish d'affilée : l'anneau prend feu
   - à partir du niveau 40 (= 40 paniers marqués) le panier se met à bouger, de plus en plus vite
   Le monde est en mètres : x = côté, y = hauteur, z = profondeur (le panier est devant).
   ==================================================================== */

const G = 9.8
const BR = 0.2 // rayon de la balle
const HY = 3.05 // hauteur de l'anneau
const CAM = { y: 1.6, z: -2.2 }
const F = 760 // « zoom » de la caméra
const FIRE_AT = 3 // swish d'affilée pour mettre le feu
const MOVE_AT = 40 // niveau où le panier commence à bouger
const ANGLE = (55 * Math.PI) / 180
const MAX_PULL = 320
const START = { x: 0, y: 0.95, z: 0 }

export const makeHoops: ArcadeMaker = ({ c, W, H, end, skin }) => {
  const imgs = new Map<string, HTMLImageElement>()
  function bgImage() {
    const it = skinItem("fysu-hoops", "bg", skin.bg)
    if (!it || !it.image) return null
    let im = imgs.get(it.image)
    if (!im) {
      im = new Image()
      im.src = it.image
      imgs.set(it.image, im)
    }
    return im.complete && im.naturalWidth ? im : null
  }

  const HOR = H * 0.46 // ligne d'horizon à l'écran

  let score = 0
  let made = 0 // paniers marqués = niveau
  let streak = 0 // swish d'affilée
  let dead = false
  let t = 0
  // panier
  let baseX = 0
  let baseZ = 6.5
  let hx = 0
  let hz = 6.5
  let rimR = 0.6
  let phase = 0
  let appear = 1
  // balle
  let ball = { x: START.x, y: START.y, z: START.z, vx: 0, vy: 0, vz: 0 }
  let flying = false
  let scored = false
  let touched = false
  let after = 0
  let missT = 0
  let swish = 0
  let spin = 0
  let aim: { sx: number; sy: number; px: number; py: number } | null = null
  let pop: { text: string; t: number; color: string } | null = null

  const level = () => made + 1
  const onFire = () => streak >= FIRE_AT
  const moving = () => made >= MOVE_AT
  const boardZ = () => hz + rimR + 0.12

  // projection : monde -> écran
  function proj(x: number, y: number, z: number) {
    const d = Math.max(0.2, z - CAM.z)
    const k = F / d
    return { x: W / 2 + x * k, y: HOR - (y - CAM.y) * k, k, d }
  }

  function placeHoop() {
    const lat = Math.min(1.7, 0.25 + made * 0.04)
    const amp = !moving() ? 0 : made >= 60 ? 1.5 : made >= 50 ? 1.2 : 0.9
    const range = Math.max(0, Math.min(lat, 2.2 - amp))
    baseX = rand(-range, range)
    baseZ = rand(5.6, 5.6 + Math.min(2.4, 0.8 + made * 0.05))
    rimR = Math.max(0.5, 0.66 - made * 0.004)
    phase = rand(0, Math.PI * 2)
    hx = baseX
    hz = baseZ
    appear = 0
  }

  function reset() {
    score = 0
    made = 0
    streak = 0
    dead = false
    flying = false
    scored = false
    touched = false
    after = 0
    missT = 0
    swish = 0
    aim = null
    pop = null
    ball = { ...START, vx: 0, vy: 0, vz: 0 }
    placeHoop()
    appear = 1
  }

  function moveHoop() {
    if (!moving()) {
      hx = baseX
      hz = baseZ
      return
    }
    const amp = made >= 60 ? 1.5 : made >= 50 ? 1.2 : 0.9
    const sp = 0.9 + (made - MOVE_AT) * 0.03
    hx = clamp(baseX + amp * Math.sin(t * sp + phase), -2.3, 2.3)
    // au niveau 70 le panier avance et recule aussi
    hz = made >= 70 ? baseZ + 0.8 * Math.sin(t * sp * 0.8 + phase * 1.7) : baseZ
  }

  // rebond sur un point de l'anneau (cercle de rayon rimR)
  function rimCollide() {
    const dx = ball.x - hx
    const dz = ball.z - hz
    const dist = Math.hypot(dx, dz)
    const dy = ball.y - HY
    if (Math.abs(dy) > BR || dist < 0.0001) return
    const off = dist - rimR // > 0 : balle côté extérieur de l'anneau
    if (Math.abs(off) < BR * 0.55) {
      const nx = dx / dist
      const nz = dz / dist
      const dir = off >= 0 ? 1 : -1
      const vn = ball.vx * nx + ball.vz * nz
      // la balle va vers l'anneau : on la renvoie
      if (vn * dir < 0) {
        ball.vx -= 1.5 * vn * nx
        ball.vz -= 1.5 * vn * nz
        ball.vy *= 0.6
        if (ball.vy < 0) ball.vy = Math.abs(ball.vy) * 0.35
        touched = true
      }
    }
  }

  function update(dt: number) {
    t += dt
    swish = Math.max(0, swish - dt)
    appear = Math.min(1, appear + dt * 3)
    if (pop) {
      pop.t -= dt
      if (pop.t <= 0) pop = null
    }
    moveHoop()
    if (dead || !flying) return
    const n = 4
    for (let i = 0; i < n; i++) {
      const h = dt / n
      const py = ball.y
      ball.vy -= G * h
      ball.x += ball.vx * h
      ball.y += ball.vy * h
      ball.z += ball.vz * h
      spin += ball.vz * h * 0.9

      if (!scored) {
        rimCollide()
        // panneau (derrière l'anneau)
        const bz = boardZ()
        if (ball.vz > 0 && ball.z + BR > bz && ball.z - BR < bz + 0.1 && Math.abs(ball.x - hx) < 0.95 && ball.y > HY - 0.2 && ball.y < HY + 1.0) {
          ball.z = bz - BR
          ball.vz = -Math.abs(ball.vz) * 0.5
          ball.vx *= 0.8
          touched = true
        }
        // panier : la balle traverse l'anneau en descendant
        if (ball.vy < 0 && py > HY && ball.y <= HY && Math.hypot(ball.x - hx, ball.z - hz) < rimR - 0.07) {
          scored = true
          made++
          const clean = !touched
          if (clean) streak++
          else streak = 0
          const pts = clean ? 2 : 1
          score += pts
          swish = 0.6
          pop = { text: clean ? (onFire() ? "ON FIRE +2" : "SWISH +2") : "+1", t: 1, color: clean ? NEON.yellow : "#fff" }
        }
        // sol
        if (ball.y < BR && ball.vy < 0) {
          ball.y = BR
          ball.vy = -ball.vy * 0.45
          ball.vx *= 0.7
          ball.vz *= 0.7
          missT += 0.2
        }
        if (missT > 0) missT += h
      } else {
        // dans le filet : on freine la balle
        ball.vx *= 0.92
        ball.vz *= 0.92
        if (ball.vy < -3) ball.vy = -3
        const dx = ball.x - hx
        const dz = ball.z - hz
        ball.x = hx + dx * 0.9
        ball.z = hz + dz * 0.9
      }
    }
    if (!scored && (missT > 0.5 || ball.z > 25 || ball.y < -2)) {
      dead = true
      streak = 0
      end()
      return
    }
    if (scored) {
      after += dt
      if (after > 0.9 || ball.y < 0) {
        after = 0
        flying = false
        scored = false
        touched = false
        missT = 0
        ball = { ...START, vx: 0, vy: 0, vz: 0 }
        placeHoop()
      }
    }
  }

  function launch(a: { sx: number; sy: number; px: number; py: number }) {
    const dx = a.px - a.sx
    const dy = a.py - a.sy
    const up = -dy
    if (up < 18) return null
    const p = clamp(up / MAX_PULL, 0, 1)
    const v = 7.2 + p * 4.8
    const yaw = clamp(dx / 200, -1, 1) * 0.4
    const vh = v * Math.cos(ANGLE)
    return { vx: vh * Math.sin(yaw), vy: v * Math.sin(ANGLE), vz: vh * Math.cos(yaw), p }
  }

  /* ---------- dessin ---------- */

  function drawFloor() {
    const bg = bgImage()
    if (bg) {
      c.drawImage(bg, 0, 0, W, H)
      c.fillStyle = "rgba(0,0,0,.18)"
      c.fillRect(0, 0, W, H)
      return
    }
    // mur du fond + salle
    const g = c.createLinearGradient(0, 0, 0, HOR)
    g.addColorStop(0, "#0b0f24")
    g.addColorStop(1, "#1d1238")
    c.fillStyle = g
    c.fillRect(0, 0, W, HOR)
    // lumières du plafond
    c.fillStyle = "rgba(63,208,255,.10)"
    for (let i = 0; i < 6; i++) c.fillRect(30 + i * 80, 40 + (i % 2) * 24, 40, 6)
    // parquet en perspective
    const fg = c.createLinearGradient(0, HOR, 0, H)
    fg.addColorStop(0, "#8a521f")
    fg.addColorStop(1, "#c98238")
    c.fillStyle = fg
    c.fillRect(0, HOR, W, H - HOR)
    c.strokeStyle = "rgba(0,0,0,.22)"
    c.lineWidth = 1
    for (let x = -12; x <= 12; x += 1.5) {
      const a = proj(x, 0, 28)
      const b = proj(x, 0, -1.8)
      c.beginPath()
      c.moveTo(a.x, a.y)
      c.lineTo(b.x, b.y)
      c.stroke()
    }
    // ligne de fond + raquette
    c.strokeStyle = "rgba(255,255,255,.55)"
    c.lineWidth = 2
    const line = (z: number, x0: number, x1: number) => {
      const a = proj(x0, 0, z)
      const b = proj(x1, 0, z)
      c.beginPath()
      c.moveTo(a.x, a.y)
      c.lineTo(b.x, b.y)
      c.stroke()
    }
    line(hz + 1.4, -9, 9)
    line(hz - 4.2, -2.4, 2.4)
    const l1a = proj(-2.4, 0, hz - 4.2)
    const l1b = proj(-2.4, 0, hz + 1.4)
    const l2a = proj(2.4, 0, hz - 4.2)
    const l2b = proj(2.4, 0, hz + 1.4)
    c.beginPath()
    c.moveTo(l1a.x, l1a.y)
    c.lineTo(l1b.x, l1b.y)
    c.moveTo(l2a.x, l2a.y)
    c.lineTo(l2b.x, l2b.y)
    c.stroke()
    c.fillStyle = NEON.orange
    c.fillRect(0, HOR - 2, W, 3)
  }

  // l'anneau vu en perspective (points d'un cercle)
  function rimPoints() {
    const pts: { x: number; y: number; back: boolean }[] = []
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2
      const p = proj(hx + Math.cos(a) * rimR, HY, hz + Math.sin(a) * rimR)
      pts.push({ x: p.x, y: p.y, back: Math.sin(a) > 0 })
    }
    return pts
  }

  function drawBoard() {
    const bz = boardZ()
    const a = proj(hx - 0.95, HY + 1.0, bz)
    const b = proj(hx + 0.95, HY - 0.15, bz)
    // mât
    const m0 = proj(hx, 0, bz + 0.5)
    const m1 = proj(hx, HY - 0.15, bz + 0.1)
    c.strokeStyle = "rgba(180,185,205,.8)"
    c.lineWidth = Math.max(3, 0.12 * m0.k)
    c.beginPath()
    c.moveTo(m0.x, m0.y)
    c.lineTo(m1.x, m1.y)
    c.stroke()
    c.fillStyle = "rgba(255,255,255,.88)"
    c.fillRect(a.x, a.y, b.x - a.x, b.y - a.y)
    c.strokeStyle = onFire() ? NEON.orange : NEON.pink
    c.lineWidth = 3
    c.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y)
    // carré du panneau
    const s0 = proj(hx - 0.3, HY + 0.45, bz)
    const s1 = proj(hx + 0.3, HY + 0.02, bz)
    c.strokeStyle = "rgba(255,61,154,.8)"
    c.lineWidth = 2
    c.strokeRect(s0.x, s0.y, s1.x - s0.x, s1.y - s0.y)
  }

  function drawRimBack(pts: ReturnType<typeof rimPoints>) {
    c.strokeStyle = NEON.orange
    c.lineWidth = Math.max(3, 0.09 * proj(hx, HY, hz).k)
    c.lineCap = "round"
    c.beginPath()
    let started = false
    pts.forEach((p, i) => {
      if (!p.back && !(pts[(i + 1) % pts.length].back || pts[(i + pts.length - 1) % pts.length].back)) return
      if (!started) {
        c.moveTo(p.x, p.y)
        started = true
      } else c.lineTo(p.x, p.y)
    })
    c.stroke()
    c.lineCap = "butt"
  }

  function drawRimFrontAndNet(pts: ReturnType<typeof rimPoints>) {
    const k = proj(hx, HY, hz).k
    // filet : fils du bord de l'anneau vers un point plus étroit, plus bas
    const sway = swish > 0 ? Math.sin(swish * 40) * 0.06 : 0
    c.strokeStyle = "rgba(255,255,255,.7)"
    c.lineWidth = 1.2
    const bottom: { x: number; y: number }[] = []
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2
      const q = proj(hx + Math.cos(a) * rimR * 0.62 + sway, HY - 0.55, hz + Math.sin(a) * rimR * 0.62)
      bottom.push(q)
    }
    for (let i = 0; i < 28; i += 2) {
      c.beginPath()
      c.moveTo(pts[i].x, pts[i].y)
      c.lineTo(bottom[(i + 1) % 28].x, bottom[(i + 1) % 28].y)
      c.moveTo(pts[i].x, pts[i].y)
      c.lineTo(bottom[(i + 27) % 28].x, bottom[(i + 27) % 28].y)
      c.stroke()
    }
    for (let j = 1; j <= 2; j++) {
      const f = j / 3
      c.beginPath()
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * Math.PI * 2
        const q = proj(hx + Math.cos(a) * rimR * (1 - 0.38 * f) + sway * f, HY - 0.55 * f, hz + Math.sin(a) * rimR * (1 - 0.38 * f))
        if (i === 0) c.moveTo(q.x, q.y)
        else c.lineTo(q.x, q.y)
      }
      c.stroke()
    }
    // devant de l'anneau
    c.strokeStyle = NEON.orange
    c.lineWidth = Math.max(3, 0.09 * k)
    c.lineCap = "round"
    c.beginPath()
    let started = false
    pts.forEach((p) => {
      if (p.back) {
        started = false
        return
      }
      if (!started) {
        c.moveTo(p.x, p.y)
        started = true
      } else c.lineTo(p.x, p.y)
    })
    c.stroke()
    c.lineCap = "butt"
  }

  function drawFire(pts: ReturnType<typeof rimPoints>) {
    const k = proj(hx, HY, hz).k
    c.save()
    const glow = c.createRadialGradient(W / 2 + hx * k, proj(hx, HY, hz).y, 4, W / 2 + hx * k, proj(hx, HY, hz).y, rimR * k * 2.4)
    glow.addColorStop(0, "rgba(255,120,30,.30)")
    glow.addColorStop(1, "rgba(255,80,20,0)")
    c.fillStyle = glow
    c.fillRect(0, 0, W, H)
    pts.forEach((p, i) => {
      const fl = 0.6 + 0.4 * Math.sin(t * 15 + i * 1.9)
      const h = rimR * k * (0.9 + 0.6 * Math.sin(t * 9 + i * 0.7)) * fl
      const w = rimR * k * 0.26
      const g = c.createLinearGradient(p.x, p.y, p.x, p.y - h)
      g.addColorStop(0, "rgba(255,210,60,.95)")
      g.addColorStop(0.5, "rgba(255,110,30,.75)")
      g.addColorStop(1, "rgba(255,60,20,0)")
      c.fillStyle = g
      c.beginPath()
      c.moveTo(p.x - w, p.y)
      c.quadraticCurveTo(p.x - w * 0.2, p.y - h * 0.5, p.x + Math.sin(t * 12 + i) * w * 0.6, p.y - h)
      c.quadraticCurveTo(p.x + w * 0.2, p.y - h * 0.5, p.x + w, p.y)
      c.closePath()
      c.fill()
    })
    c.restore()
  }

  function drawBall(x: number, y: number, z: number) {
    const p = proj(x, y, z)
    const r = BR * p.k
    // ombre au sol
    const sh = proj(x, 0, z)
    c.fillStyle = "rgba(0,0,0,.28)"
    c.beginPath()
    c.ellipse(sh.x, sh.y, r * 1.1, r * 0.3, 0, 0, Math.PI * 2)
    c.fill()
    c.save()
    c.translate(p.x, p.y)
    c.rotate(spin * 0.3)
    const col = skinItem("fysu-hoops", "ball", skin.ball)?.colors ?? ["#ff9a4d", "#c4410c", "#2a1005"]
    const g = c.createRadialGradient(-r * 0.35, -r * 0.4, 2, 0, 0, r)
    g.addColorStop(0, col[0])
    g.addColorStop(1, col[1])
    c.fillStyle = g
    c.beginPath()
    c.arc(0, 0, r, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = col[2]
    c.lineWidth = Math.max(1, r * 0.06)
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
    drawFloor()
    c.save()
    c.globalAlpha = appear
    const pts = rimPoints()
    drawBoard()
    drawRimBack(pts)
    if (onFire()) drawFire(pts)

    // trajectoire (première moitié seulement)
    if (aim && !flying && !dead) {
      const v = launch(aim)
      if (v) {
        c.fillStyle = "rgba(255,255,255,.85)"
        let x = START.x
        let y = START.y
        let z = START.z
        let vy = v.vy
        const total = Math.max(0.1, hz / v.vz)
        for (let i = 1; i <= 14; i++) {
          const dt = total * 0.5 * (1 / 14)
          x += v.vx * dt
          z += v.vz * dt
          vy -= G * dt
          y += vy * dt
          const p = proj(x, y, z)
          c.beginPath()
          c.arc(p.x, p.y, Math.max(1.5, 0.05 * p.k), 0, Math.PI * 2)
          c.fill()
        }
        c.fillStyle = "rgba(255,255,255,.15)"
        c.fillRect(W / 2 - 80, H - 26, 160, 8)
        c.fillStyle = v.p > 0.85 ? NEON.orange : NEON.green
        c.fillRect(W / 2 - 80, H - 26, 160 * v.p, 8)
      }
    }

    // balle : derrière l'anneau, dedans, ou devant lui selon sa profondeur
    const holding = aim && !flying && !dead
    const lift = holding ? Math.min(0.25, Math.max(0, (aim!.sy - aim!.py) / MAX_PULL) * 0.25) : 0
    const bx = flying ? ball.x : START.x
    const by = flying ? ball.y : START.y + lift
    const bz = flying ? ball.z : START.z
    const near = flying && bz > hz - rimR - BR * 1.5 && bz < hz + rimR + BR * 1.5 && Math.abs(bx - hx) < rimR + BR * 1.5 && by < HY + 1.2
    const behind = flying && bz >= hz + rimR + BR * 1.5
    if (behind) drawBall(bx, by, bz)
    if (near) drawBall(bx, by, bz)
    drawRimFrontAndNet(pts)
    if (!behind && !near) drawBall(bx, by, bz)
    c.restore()

    if (swish > 0) {
      const p = proj(hx, HY, hz)
      c.strokeStyle = onFire() ? NEON.orange : NEON.yellow
      c.lineWidth = 3
      c.beginPath()
      c.arc(p.x, p.y, rimR * p.k + (0.6 - swish) * 90, 0, Math.PI * 2)
      c.stroke()
    }
    if (pop) {
      const p = proj(hx, HY + 1.2, hz)
      c.globalAlpha = Math.min(1, pop.t * 2)
      pixelText(c, pop.text, clamp(p.x, 90, W - 90), p.y - (1 - pop.t) * 30 - 20, 14, pop.color)
      c.globalAlpha = 1
    }

    // niveau et série
    pixelText(c, `NIV ${level()}`, 16, 36, 12, "#fff", "left")
    if (streak > 0) {
      pixelText(c, onFire() ? `FEU x${streak}` : `SWISH x${streak}`, W - 16, 36, 12, onFire() ? NEON.orange : NEON.yellow, "right")
    }
    if (moving() && made === MOVE_AT) pixelText(c, "LE PANIER BOUGE !", W / 2, 120, 12, NEON.pink)
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
      const v = launch(aim)
      aim = null
      if (!v) return
      ball = { x: START.x, y: START.y, z: START.z, vx: v.vx, vy: v.vy, vz: v.vz }
      flying = true
      scored = false
      touched = false
      missT = 0
      after = 0
    },
  }
}
