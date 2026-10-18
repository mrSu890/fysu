import { NEON, pick, rand, type ArcadeMaker } from "@/lib/arcadeKit"

/* FYSU Slice : coupe les fleurs d'un coup de doigt, évite les bombes. */

const G = 900
const FLOWER_R = 36
const BOMB_R = 30
const PETALS = ["#ff3d9a", "#ffd23f", "#3fd0ff", "#ff5a36", "#b583ff", "#ff9bd0"]

type Obj = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; bomb: boolean; color: string; alive: boolean }
type Half = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; color: string; cut: number; side: 1 | -1; life: number }
type Pt = { x: number; y: number; t: number }
type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string }

export const makeSlice: ArcadeMaker = ({ c, W, H, end }) => {
  let objs: Obj[] = []
  let halves: Half[] = []
  let sparks: Spark[] = []
  let trail: Pt[] = []
  let score = 0
  let time = 0
  let spawnT = 0
  let down = false
  let last: { x: number; y: number } | null = null
  let dead = false
  let boom = 0
  let bombAt = { x: 0, y: 0 }

  function reset() {
    objs = []
    halves = []
    sparks = []
    trail = []
    score = 0
    time = 0
    spawnT = 0.5
    down = false
    last = null
    dead = false
    boom = 0
  }

  function launch(bomb: boolean) {
    const x = rand(70, W - 70)
    const apex = rand(H * 0.3, H * 0.78)
    const vy = -Math.sqrt(2 * G * apex)
    const toCenter = (W / 2 - x) / (-vy / G) * rand(0.2, 0.9)
    objs.push({ x, y: H + 40, vx: toCenter + rand(-40, 40), vy, rot: rand(0, 6), vr: rand(-3, 3), bomb, color: pick(PETALS), alive: true })
  }

  function spawnWave() {
    const diff = Math.min(1, time / 90)
    const n = 1 + Math.floor(Math.random() * (1.6 + diff * 2.6))
    for (let i = 0; i < n; i++) {
      const bombP = time < 4 ? 0 : 0.1 + diff * 0.22
      launch(Math.random() < bombP)
    }
    spawnT = rand(0.7, 1.25) - diff * 0.4
  }

  function cut(o: Obj, ang: number) {
    o.alive = false
    if (o.bomb) {
      dead = true
      boom = 0
      bombAt = { x: o.x, y: o.y }
      for (let i = 0; i < 40; i++) {
        const a = rand(0, Math.PI * 2)
        const s = rand(150, 600)
        sparks.push({ x: o.x, y: o.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.4, 0.9), color: pick([NEON.orange, NEON.yellow, "#fff"]) })
      }
      end()
      return
    }
    score++
    const nx = -Math.sin(ang)
    const ny = Math.cos(ang)
    for (const side of [1, -1] as const) {
      halves.push({
        x: o.x,
        y: o.y,
        vx: o.vx * 0.6 + nx * side * 140,
        vy: o.vy * 0.6 + ny * side * 140,
        rot: o.rot,
        vr: o.vr + side * 2.5,
        color: o.color,
        cut: ang,
        side,
        life: 2,
      })
    }
    for (let i = 0; i < 10; i++) {
      const a = rand(0, Math.PI * 2)
      sparks.push({ x: o.x, y: o.y, vx: Math.cos(a) * rand(60, 260), vy: Math.sin(a) * rand(60, 260), life: rand(0.25, 0.5), color: o.color })
    }
  }

  function segHits(x1: number, y1: number, x2: number, y2: number, o: Obj, r: number) {
    const dx = x2 - x1
    const dy = y2 - y1
    const l2 = dx * dx + dy * dy
    let t = l2 ? ((o.x - x1) * dx + (o.y - y1) * dy) / l2 : 0
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(x1 + dx * t - o.x, y1 + dy * t - o.y) < r
  }

  function slice(x: number, y: number) {
    if (!last) {
      last = { x, y }
      return
    }
    const dx = x - last.x
    const dy = y - last.y
    if (Math.hypot(dx, dy) < 4) return
    const ang = Math.atan2(dy, dx)
    for (const o of objs) {
      if (!o.alive || dead) continue
      if (segHits(last.x, last.y, x, y, o, o.bomb ? BOMB_R : FLOWER_R)) cut(o, ang)
    }
    last = { x, y }
  }

  function update(dt: number) {
    const now = performance.now()
    trail = trail.filter((p) => now - p.t < 180)
    for (const s of sparks) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.vy += 500 * dt
      s.life -= dt
    }
    sparks = sparks.filter((s) => s.life > 0)
    if (dead) {
      boom += dt
      return
    }
    time += dt
    spawnT -= dt
    if (spawnT <= 0) spawnWave()
    for (const o of objs) {
      o.vy += G * dt
      o.x += o.vx * dt
      o.y += o.vy * dt
      o.rot += o.vr * dt
    }
    objs = objs.filter((o) => o.alive && !(o.y > H + 80 && o.vy > 0))
    for (const h of halves) {
      h.vy += G * dt
      h.x += h.vx * dt
      h.y += h.vy * dt
      h.rot += h.vr * dt
      h.life -= dt
    }
    halves = halves.filter((h) => h.y < H + 80 && h.life > 0)
  }

  function flower(color: string, r: number) {
    for (let i = 0; i < 6; i++) {
      c.save()
      c.rotate((i * Math.PI) / 3)
      c.fillStyle = color
      c.beginPath()
      c.ellipse(r * 0.58, 0, r * 0.42, r * 0.3, 0, 0, Math.PI * 2)
      c.fill()
      c.strokeStyle = "rgba(0,0,0,.25)"
      c.lineWidth = 1.5
      c.stroke()
      c.restore()
    }
    c.fillStyle = NEON.yellow
    c.beginPath()
    c.arc(0, 0, r * 0.3, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = "#c98a00"
    c.beginPath()
    c.arc(-r * 0.06, -r * 0.06, r * 0.12, 0, Math.PI * 2)
    c.fill()
  }

  function bombShape(r: number) {
    c.fillStyle = "#15151c"
    c.beginPath()
    c.arc(0, 0, r, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = NEON.orange
    c.lineWidth = 3
    c.stroke()
    c.fillStyle = "rgba(255,255,255,.25)"
    c.beginPath()
    c.arc(-r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = "#777"
    c.fillRect(-4, -r - 8, 8, 10)
    c.strokeStyle = "#cfa77a"
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(0, -r - 8)
    c.quadraticCurveTo(10, -r - 20, 18, -r - 14)
    c.stroke()
    c.fillStyle = Math.floor(performance.now() / 90) % 2 ? NEON.yellow : NEON.orange
    c.beginPath()
    c.arc(18, -r - 14, 5, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = NEON.orange
    c.font = `${r * 0.8}px "Press Start 2P", monospace`
    c.textAlign = "center"
    c.textBaseline = "middle"
    c.fillText("!", 0, 3)
  }

  function draw() {
    const g = c.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, "#14082e")
    g.addColorStop(1, "#08131f")
    c.fillStyle = g
    c.fillRect(0, 0, W, H)
    // grille de fond
    c.strokeStyle = "rgba(63,208,255,.08)"
    c.lineWidth = 1
    for (let y = 0; y < H; y += 48) {
      c.beginPath()
      c.moveTo(0, y)
      c.lineTo(W, y)
      c.stroke()
    }
    for (const h of halves) {
      c.save()
      c.translate(h.x, h.y)
      c.rotate(h.cut)
      c.beginPath()
      if (h.side === 1) c.rect(-100, -100, 200, 100)
      else c.rect(-100, 0, 200, 100)
      c.clip()
      c.rotate(-h.cut + h.rot)
      flower(h.color, FLOWER_R)
      c.restore()
    }
    for (const o of objs) {
      c.save()
      c.translate(o.x, o.y)
      if (o.bomb) bombShape(BOMB_R)
      else {
        c.rotate(o.rot)
        flower(o.color, FLOWER_R)
      }
      c.restore()
    }
    for (const s of sparks) {
      c.globalAlpha = Math.max(0, Math.min(1, s.life * 2.5))
      c.fillStyle = s.color
      c.fillRect(s.x - 3, s.y - 3, 6, 6)
    }
    c.globalAlpha = 1
    // lame
    const now = performance.now()
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1]
        const b = trail[i]
        const k = 1 - (now - b.t) / 180
        c.strokeStyle = `rgba(255,255,255,${Math.max(0, k)})`
        c.lineWidth = 2 + 8 * Math.max(0, k)
        c.lineCap = "round"
        c.beginPath()
        c.moveTo(a.x, a.y)
        c.lineTo(b.x, b.y)
        c.stroke()
      }
    }
    if (dead) {
      const k = Math.max(0, 1 - boom / 0.5)
      c.fillStyle = `rgba(255,255,255,${k})`
      c.fillRect(0, 0, W, H)
      c.strokeStyle = NEON.orange
      c.lineWidth = 6
      c.beginPath()
      c.arc(bombAt.x, bombAt.y, boom * 700, 0, Math.PI * 2)
      c.globalAlpha = k
      c.stroke()
      c.globalAlpha = 1
    }
  }

  return {
    reset,
    update,
    draw,
    score: () => score,
    down(x, y) {
      down = true
      last = { x, y }
      trail = [{ x, y, t: performance.now() }]
    },
    move(x, y) {
      if (!down || dead) return
      trail.push({ x, y, t: performance.now() })
      slice(x, y)
    },
    up() {
      down = false
      last = null
    },
  }
}
