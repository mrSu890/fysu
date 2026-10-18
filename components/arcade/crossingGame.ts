import { NEON, clamp, pick, rand, type ArcadeMaker } from "@/lib/arcadeKit"

/* FYSU Crossing : traverse des autoroutes sans fin. Une voiture te touche = fin. */

const ROW = 64
const COLS = 7
const BASE_Y = 520
const HOP = 0.1
const CAR_COLORS = [NEON.orange, NEON.cyan, NEON.pink, NEON.yellow, "#e8e8e8", NEON.green, "#b583ff"]

type Car = { x: number; len: number; color: string }
type Lane = { row: number; road: boolean; dir: 1 | -1; speed: number; minGap: number; cars: Car[]; nextGap: number; seed: number }

export const makeCrossing: ArcadeMaker = ({ c, W, H, end }) => {
  const hero = new Image()
  hero.src = "/games-hero.png"
  const CW = W / COLS
  let lanes = new Map<number, Lane>()
  let col = 3
  let row = 0
  let maxRow = 0
  let cam = 0
  let hop: { fromCol: number; fromRow: number; t: number } | null = null
  let dead = false
  let deadT = 0
  let roadsInARow = 0
  let nextGrassAfter = 3
  let genRow = -1
  let sx = 0
  let sy = 0
  let fired = false

  function makeLane(r: number): Lane {
    const seed = Math.floor(Math.random() * 1000)
    if (r < 2) return { row: r, road: false, dir: 1, speed: 0, minGap: 0, cars: [], nextGap: 0, seed }
    if (roadsInARow >= nextGrassAfter) {
      roadsInARow = 0
      nextGrassAfter = 2 + Math.floor(Math.random() * 4)
      return { row: r, road: false, dir: 1, speed: 0, minGap: 0, cars: [], nextGap: 0, seed }
    }
    roadsInARow++
    const dir = Math.random() < 0.5 ? 1 : -1
    const speed = rand(190, 430) + Math.min(r * 3, 220)
    const minGap = rand(170, 330) - Math.min(r, 80)
    const lane: Lane = { row: r, road: true, dir: dir as 1 | -1, speed, minGap, cars: [], nextGap: 0, seed }
    let x = rand(-100, 150)
    while (x < W + 100) {
      const len = Math.random() < 0.22 ? 130 : 84
      lane.cars.push({ x, len, color: pick(CAR_COLORS) })
      x += len + minGap + rand(0, 240)
    }
    lane.nextGap = minGap + rand(0, 240)
    return lane
  }

  function ensureLanes() {
    while (genRow < maxRow + 14) {
      genRow++
      lanes.set(genRow, makeLane(genRow))
    }
    for (const k of lanes.keys()) if (k < maxRow - 6) lanes.delete(k)
  }

  function reset() {
    lanes = new Map()
    col = 3
    row = 0
    maxRow = 0
    cam = 0
    hop = null
    dead = false
    deadT = 0
    roadsInARow = 0
    nextGrassAfter = 3
    genRow = -1
    ensureLanes()
  }

  function updateLane(l: Lane, dt: number) {
    if (!l.road) return
    for (const car of l.cars) car.x += l.dir * l.speed * dt
    l.cars = l.cars.filter((k) => (l.dir > 0 ? k.x < W + 20 : k.x + k.len > -20))
    // dernière voiture entrée
    const entry = l.dir > 0 ? Math.min(...l.cars.map((k) => k.x), W) : Math.max(...l.cars.map((k) => k.x + k.len), 0)
    const space = l.dir > 0 ? entry : W - entry
    if (!l.cars.length || space > l.nextGap) {
      const len = Math.random() < 0.22 ? 130 : 84
      l.cars.push({ x: l.dir > 0 ? -len - 4 : W + 4, len, color: pick(CAR_COLORS) })
      l.nextGap = l.minGap + rand(0, 240)
    }
  }

  function hits(r: number, px: number) {
    const l = lanes.get(r)
    if (!l || !l.road) return false
    return l.cars.some((k) => px + 9 > k.x + 5 && px - 9 < k.x + k.len - 5)
  }

  function update(dt: number) {
    if (dead) {
      deadT += dt
      return
    }
    for (const l of lanes.values()) updateLane(l, dt)
    if (hop) {
      hop.t += dt / HOP
      if (hop.t >= 1) hop = null
    }
    cam += (row - cam) * Math.min(1, dt * 8)
    // position réelle du personnage (celle qu'on voit à l'écran)
    const px = (col + 0.5) * CW
    let cx = px
    let cr = row
    if (hop) {
      const fx = (hop.fromCol + 0.5) * CW
      cx = fx + (px - fx) * hop.t
      cr = hop.t < 0.5 ? hop.fromRow : row
    }
    if (hits(cr, cx)) {
      dead = true
      end()
    }
  }

  function go(dx: number, dy: number) {
    if (dead) return
    const nc = clamp(col + dx, 0, COLS - 1)
    const nr = row - dy // dy = -1 → avancer
    const target = row - dy < 0 ? 0 : nr
    if (target < maxRow - 3) return
    hop = { fromCol: col, fromRow: row, t: 0 }
    col = nc
    row = target
    if (row > maxRow) {
      maxRow = row
      ensureLanes()
    }
  }

  /* --- dessin --- */
  const yOf = (r: number) => BASE_Y - (r - cam) * ROW

  function drawCar(k: Car, l: Lane, y: number) {
    const h = 38
    const x = k.x
    const front = l.dir > 0 ? x + k.len : x
    // traînée de vitesse
    c.fillStyle = "rgba(255,255,255,.08)"
    c.fillRect(l.dir > 0 ? x - 50 : x + k.len, y - h / 2 + 8, 50, h - 16)
    c.fillStyle = "rgba(0,0,0,.35)"
    c.fillRect(x + 3, y - h / 2 + 5, k.len, h)
    c.fillStyle = k.color
    c.fillRect(x, y - h / 2, k.len, h)
    c.fillStyle = "rgba(0,0,0,.45)"
    const wx = l.dir > 0 ? x + k.len * 0.55 : x + k.len * 0.1
    c.fillRect(wx, y - h / 2 + 5, k.len * 0.35, h - 10)
    c.fillStyle = "#222"
    c.fillRect(x + 10, y - h / 2 - 3, 16, 5)
    c.fillRect(x + 10, y + h / 2 - 2, 16, 5)
    c.fillRect(x + k.len - 26, y - h / 2 - 3, 16, 5)
    c.fillRect(x + k.len - 26, y + h / 2 - 2, 16, 5)
    c.fillStyle = "#fffbd0"
    c.fillRect(front - (l.dir > 0 ? 6 : 0), y - h / 2 + 3, 6, 8)
    c.fillRect(front - (l.dir > 0 ? 6 : 0), y + h / 2 - 11, 6, 8)
  }

  function drawPlayer(y: number) {
    const px = (col + 0.5) * CW
    let ox = px
    let oy = y
    let lift = 0
    if (hop) {
      const fx = (hop.fromCol + 0.5) * CW
      ox = fx + (px - fx) * hop.t
      lift = Math.sin(Math.PI * hop.t) * 16
    }
    c.fillStyle = "rgba(0,0,0,.35)"
    c.beginPath()
    c.ellipse(ox, oy + 16, 14, 6, 0, 0, Math.PI * 2)
    c.fill()
    oy -= lift
    if (!(hero.complete && hero.naturalWidth)) {
      c.fillStyle = NEON.yellow
      c.fillRect(ox - 11, oy - 20, 22, 34)
      return
    }
    const hh = 66
    const ww = (hero.naturalWidth * hh) / hero.naturalHeight
    if (dead) {
      c.save()
      c.translate(ox, oy + 8)
      c.rotate(Math.PI / 2)
      c.drawImage(hero, -hh / 2, -ww / 2, hh, ww)
      c.restore()
      return
    }
    c.drawImage(hero, ox - ww / 2, oy + 18 - hh, ww, hh)
  }

  function draw() {
    c.fillStyle = "#14532d"
    c.fillRect(0, 0, W, H)
    const lo = Math.floor(cam - 3)
    const hi = Math.ceil(cam + 10)
    for (let r = lo; r <= hi; r++) {
      const l = lanes.get(r) ?? (r < 0 ? undefined : undefined)
      const y = yOf(r)
      if (y < -ROW || y > H + ROW) continue
      if (!l || !l.road) {
        c.fillStyle = r % 2 ? "#1a6b3a" : "#1d7540"
        c.fillRect(0, y - ROW / 2, W, ROW)
        c.fillStyle = "rgba(255,255,255,.07)"
        const sd = l ? l.seed : r * 37
        for (let i = 0; i < 9; i++) c.fillRect(((sd * 53 + i * 71) % W), y - ROW / 2 + ((sd + i * 29) % (ROW - 6)), 4, 4)
        continue
      }
      c.fillStyle = "#26282f"
      c.fillRect(0, y - ROW / 2, W, ROW)
      c.fillStyle = "rgba(255,255,255,.55)"
      const prev = lanes.get(r + 1)
      if (prev && prev.road) {
        for (let x = 0; x < W; x += 48) c.fillRect(x, y - ROW / 2 - 1, 26, 3)
      }
      for (const k of l.cars) drawCar(k, l, y)
    }
    drawPlayer(yOf(row))
    // bandeau « danger » en haut pour la profondeur
    const g = c.createLinearGradient(0, 0, 0, 160)
    g.addColorStop(0, "rgba(0,0,0,.55)")
    g.addColorStop(1, "rgba(0,0,0,0)")
    c.fillStyle = g
    c.fillRect(0, 0, W, 160)
    if (dead && deadT < 0.25) {
      c.fillStyle = `rgba(255,255,255,${0.5 * (1 - deadT / 0.25)})`
      c.fillRect(0, 0, W, H)
    }
  }

  return {
    reset,
    update,
    draw,
    score: () => maxRow,
    down(x, y) {
      sx = x
      sy = y
      fired = false
    },
    move(x, y) {
      // glissade : on part tout de suite, sans attendre que le doigt se lève
      if (fired) return
      const dx = x - sx
      const dy = y - sy
      if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return
      fired = true
      if (Math.abs(dx) > Math.abs(dy)) go(dx > 0 ? 1 : -1, 0)
      else go(0, dy > 0 ? 1 : -1)
    },
    up(x, y) {
      if (fired) return
      const dx = x - sx
      const dy = y - sy
      if (Math.abs(dx) < 22 && Math.abs(dy) < 22) go(0, -1)
      else if (Math.abs(dx) > Math.abs(dy)) go(dx > 0 ? 1 : -1, 0)
      else go(0, dy > 0 ? 1 : -1)
    },
    key: (dx, dy) => go(dx, dy),
  }
}
