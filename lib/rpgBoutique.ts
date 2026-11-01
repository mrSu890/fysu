/* ====================================================================
   BOUTIQUE RPG — moteur du prototype
   Le décor est l'image (1199 × 1312). Par-dessus :
   - des animations (taches de soleil qui respirent, feuillage qui scintille, poussière)
   - une zone de marche (rectangles « interdits » + recherche de chemin)
   - le tri en profondeur : si le personnage passe DERRIÈRE un meuble, on redessine
     le meuble par-dessus lui (découpe en polygone dans l'image)
   - des points d'interaction (toucher → le personnage y va → bulle)
   Toutes les coordonnées sont celles de l'image.
   ==================================================================== */

export const SW = 1199
export const SH = 1312

type Rect = [number, number, number, number] // x0, y0, x1, y1
type Poly = [number, number][]

/* Zone de marche : les pieds du personnage restent dans ce cadre... */
const FLOOR: Rect = [52, 262, 1128, 1250]

/* ...sauf dans ces zones occupées (là où les meubles touchent le sol) */
const BLOCKED: Rect[] = [
  [18, 240, 252, 830], // grande étagère de gauche
  [868, 240, 1072, 468], // comptoir
  [362, 400, 580, 636], // banquette en cuir
  [622, 440, 866, 654], // table basse + vase
  [722, 440, 846, 494], // pouf
  [572, 395, 618, 448], // pied du lampadaire
  [338, 680, 498, 752], // fauteuil gauche
  [702, 690, 878, 770], // fauteuil droit
  [1022, 640, 1135, 835], // portant
  [396, 838, 806, 1052], // grande table en verre
  [60, 972, 324, 1148], // table en verre gauche
  [882, 972, 1140, 1148], // table en verre droite
]

/* Meubles qui passent DEVANT le personnage quand ses pieds sont au-dessus de `base` */
const OCCLUDERS: { poly: Poly; base: number }[] = [
  { poly: [[362, 374], [582, 374], [582, 634], [362, 634]], base: 626 }, // banquette
  { poly: [[618, 372], [716, 372], [712, 514], [654, 516], [640, 490], [618, 488]], base: 505 }, // vase
  { poly: [[620, 486], [864, 486], [864, 654], [620, 654]], base: 648 }, // table basse
  { poly: [[724, 420], [842, 420], [842, 494], [724, 494]], base: 488 }, // pouf
  { poly: [[552, 250], [614, 250], [622, 286], [604, 292], [606, 448], [578, 448], [578, 292], [548, 286]], base: 446 }, // lampadaire
  { poly: [[324, 628], [400, 626], [494, 680], [490, 716], [440, 744], [404, 776], [334, 746]], base: 740 }, // fauteuil gauche
  { poly: [[704, 690], [790, 648], [876, 626], [872, 722], [812, 772], [740, 746]], base: 760 }, // fauteuil droit
  { poly: [[1016, 494], [1146, 494], [1146, 832], [1106, 832], [1012, 742]], base: 826 }, // portant
  { poly: [[394, 836], [804, 836], [804, 1054], [394, 1054]], base: 1046 }, // grande table
  { poly: [[60, 970], [322, 970], [322, 1148], [60, 1148]], base: 1140 }, // table gauche
  { poly: [[882, 970], [1140, 970], [1140, 1148], [882, 1148]], base: 1140 }, // table droite
]

/* Taches de soleil sur le sol (cx, cy, rayon x, rayon y) — elles respirent */
const DAPPLES: [number, number, number, number][] = [
  [350, 290, 70, 36], [750, 305, 62, 30], [320, 350, 50, 26], [290, 440, 54, 30], [300, 710, 56, 40],
  [250, 770, 46, 30], [620, 810, 56, 24], [920, 855, 62, 34], [1000, 450, 50, 28], [130, 1210, 70, 34],
  [1060, 1215, 72, 36], [940, 1180, 50, 24], [880, 600, 40, 24],
]

/* Fenêtres (zones où le feuillage scintille) */
const WINDOWS: Rect[] = [
  [288, 0, 1030, 74],
  [0, 0, 56, 820],
  [1042, 0, 1199, 470],
  [66, 0, 228, 60],
]

export type Hotspot = {
  id: string
  /** zone touchable (image) */
  hit: Rect
  /** où le personnage va se placer (image) */
  stand: [number, number]
  /** position du repère « ! » */
  mark: [number, number]
}

export const HOTSPOTS: Hotspot[] = [
  { id: "racks", hit: [285, 86, 892, 246], stand: [590, 290], mark: [590, 150] },
  { id: "shelf", hit: [24, 84, 242, 826], stand: [292, 520], mark: [150, 330] },
  { id: "counter", hit: [872, 214, 1068, 468], stand: [968, 500], mark: [968, 330] },
  { id: "daybed", hit: [364, 376, 580, 634], stand: [472, 662], mark: [472, 500] },
  { id: "coats", hit: [1018, 496, 1146, 834], stand: [986, 800], mark: [1085, 640] },
]

/* ---------- recherche de chemin (grille de 10 px) ---------- */
const CELL = 10
const GW = Math.ceil(SW / CELL)
const GH = Math.ceil(SH / CELL)
const PAD = 8 // marge autour des meubles (les pieds ont une épaisseur)

const grid = new Uint8Array(GW * GH) // 1 = interdit
for (let gy = 0; gy < GH; gy++) {
  for (let gx = 0; gx < GW; gx++) {
    const x = gx * CELL + CELL / 2
    const y = gy * CELL + CELL / 2
    let bad = x < FLOOR[0] || x > FLOOR[2] || y < FLOOR[1] || y > FLOOR[3]
    if (!bad) bad = BLOCKED.some((r) => x > r[0] - PAD && x < r[2] + PAD && y > r[1] - PAD && y < r[3] + PAD)
    grid[gy * GW + gx] = bad ? 1 : 0
  }
}
const cellOf = (x: number, y: number): [number, number] => [Math.min(GW - 1, Math.max(0, Math.floor(x / CELL))), Math.min(GH - 1, Math.max(0, Math.floor(y / CELL)))]
const free = (gx: number, gy: number) => gx >= 0 && gy >= 0 && gx < GW && gy < GH && grid[gy * GW + gx] === 0

/* case libre la plus proche (en spirale) */
function nearestFree(x: number, y: number): [number, number] {
  const [cx, cy] = cellOf(x, y)
  if (free(cx, cy)) return [cx, cy]
  for (let r = 1; r < 60; r++) {
    let best: [number, number] | null = null
    let bd = 1e9
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        if (!free(cx + dx, cy + dy)) continue
        const d = dx * dx + dy * dy
        if (d < bd) {
          bd = d
          best = [cx + dx, cy + dy]
        }
      }
    if (best) return best
  }
  return [cx, cy]
}

function lineFree(a: [number, number], b: [number, number]) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (CELL / 2))
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0
    const [gx, gy] = cellOf(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    if (!free(gx, gy)) return false
  }
  return true
}

export function findPath(from: [number, number], to: [number, number]): [number, number][] {
  const s = nearestFree(from[0], from[1])
  const g = nearestFree(to[0], to[1])
  const key = (c: [number, number]) => c[1] * GW + c[0]
  const open: [number, number, number][] = [[0, s[0], s[1]]] // f, gx, gy
  const cost = new Map<number, number>([[key(s), 0]])
  const prev = new Map<number, number>()
  const h = (x: number, y: number) => Math.hypot(x - g[0], y - g[1])
  let found = false
  while (open.length) {
    let bi = 0
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i
    const [, x, y] = open.splice(bi, 1)[0]
    if (x === g[0] && y === g[1]) {
      found = true
      break
    }
    const c0 = cost.get(y * GW + x)!
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx = x + dx
        const ny = y + dy
        if (!free(nx, ny)) continue
        if (dx && dy && (!free(x + dx, y) || !free(x, y + dy))) continue
        const nc = c0 + (dx && dy ? 1.414 : 1)
        const k = ny * GW + nx
        if (nc < (cost.get(k) ?? 1e9)) {
          cost.set(k, nc)
          prev.set(k, y * GW + x)
          open.push([nc + h(nx, ny), nx, ny])
        }
      }
  }
  if (!found) return []
  const cells: [number, number][] = []
  let k = key(g)
  const sk = key(s)
  while (k !== sk) {
    cells.push([(k % GW) * CELL + CELL / 2, Math.floor(k / GW) * CELL + CELL / 2])
    k = prev.get(k)!
  }
  cells.reverse()
  // on raccourcit : on saute les étapes quand la ligne droite est libre
  const out: [number, number][] = []
  let cur: [number, number] = [from[0], from[1]]
  let i = 0
  while (i < cells.length) {
    let j = cells.length - 1
    while (j > i && !lineFree(cur, cells[j])) j--
    out.push(cells[j])
    cur = cells[j]
    i = j + 1
  }
  return out
}

/* ---------- le moteur ---------- */
export type BoutiqueOpts = {
  canvas: HTMLCanvasElement
  bg: HTMLImageElement
  avatar: HTMLCanvasElement | null
  /** appelé quand le personnage arrive à un point d'interaction (ou quand on s'en éloigne : null) */
  onHotspot: (id: string | null) => void
  reduceMotion?: boolean
}

export function createBoutique(o: BoutiqueOpts) {
  const cv = o.canvas
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  cv.width = Math.round(SW * dpr)
  cv.height = Math.round(SH * dpr)
  const c = cv.getContext("2d")!
  c.setTransform(dpr, 0, 0, dpr, 0, 0)

  let avatar = o.avatar
  const calm = !!o.reduceMotion
  const p = { x: 600, y: 1170, tx: 600, ty: 1170 }
  let path: [number, number][] = []
  let pendingHotspot: string | null = null
  let moving = false
  let walkPhase = 0
  let lean = 0
  let squash = 0
  let t = 0
  let last = 0
  let raf = 0
  let alive = true

  // poussière : de petits grains qui montent doucement
  const dust = Array.from({ length: 46 }, () => ({
    x: Math.random() * SW,
    y: 260 + Math.random() * 950,
    v: 4 + Math.random() * 9,
    s: 1 + Math.random() * 1.8,
    ph: Math.random() * 6.28,
  }))
  // éclats de feuillage
  const leaves = Array.from({ length: 70 }, () => {
    const w = WINDOWS[Math.floor(Math.random() * WINDOWS.length)]
    return { x: w[0] + Math.random() * (w[2] - w[0]), y: w[1] + Math.random() * (w[3] - w[1]), ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.4, hue: Math.random() < 0.6 ? "255,232,120" : "190,220,110" }
  })

  function scaleAt(y: number) {
    return 0.88 + 0.16 * ((y - 260) / 990) // un peu plus grand en bas (perspective)
  }
  const AV_H_PX = 230 // hauteur du personnage à l'échelle 1

  function drawAvatar() {
    if (!avatar) return
    const s = scaleAt(p.y)
    const h = AV_H_PX * s
    const w = (avatar.width / avatar.height) * h
    const bob = moving ? Math.abs(Math.sin(walkPhase)) * 7 * s : Math.sin(t * 1.6) * 0.8
    const sq = moving ? Math.sin(walkPhase * 2) * 0.035 : Math.sin(t * 1.6) * 0.01 // écrasement : rebond léger
    // ombre au sol
    c.save()
    c.fillStyle = "rgba(30,12,4,0.32)"
    c.beginPath()
    c.ellipse(p.x, p.y + 2, w * 0.3 * (1 - bob / 80), 8 * s, 0, 0, Math.PI * 2)
    c.fill()
    c.restore()
    c.save()
    // origine = les pieds
    c.translate(p.x, p.y - bob)
    c.rotate(lean * 0.07 + (moving ? Math.sin(walkPhase) * 0.035 : 0))
    c.scale(1 + sq, 1 - sq)
    c.imageSmoothingQuality = "high"
    // dans l'image de l'avatar, les pieds sont à 604/616 : on la pose en conséquence
    const feetFrac = 604 / avatar.height
    c.drawImage(avatar, -w / 2, -h * feetFrac, w, h)
    c.restore()
  }

  function drawOccluders() {
    if (!avatar) return
    for (const oc of OCCLUDERS) {
      if (p.y >= oc.base) continue // il est devant : rien à redessiner
      const s = scaleAt(p.y)
      const hw = 50 * s
      const top = p.y - AV_H_PX * s - 10
      let hit = false
      for (const [x, y] of oc.poly) if (x > p.x - hw - 30 && x < p.x + hw + 30 && y > top && y < p.y + 20) hit = true
      const xs = oc.poly.map((q) => q[0])
      const ys = oc.poly.map((q) => q[1])
      if (!hit && !(p.x + hw > Math.min(...xs) && p.x - hw < Math.max(...xs) && p.y + 10 > Math.min(...ys) && top < Math.max(...ys))) continue
      c.save()
      c.beginPath()
      oc.poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
      c.closePath()
      c.clip()
      c.drawImage(o.bg, 0, 0, SW, SH)
      c.restore()
    }
  }

  function drawLight() {
    // taches de soleil : elles respirent chacune à leur rythme
    c.save()
    c.globalCompositeOperation = "soft-light"
    for (let i = 0; i < DAPPLES.length; i++) {
      const [x, y, rx, ry] = DAPPLES[i]
      const k = calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * (0.5 + (i % 4) * 0.13) + i * 1.7)
      const a = 0.28 + 0.5 * k
      const g = c.createRadialGradient(x, y, 0, x, y, rx)
      g.addColorStop(0, `rgba(255,205,130,${a})`)
      g.addColorStop(1, "rgba(255,205,130,0)")
      c.fillStyle = g
      c.save()
      c.translate(x, y)
      c.scale(1, ry / rx)
      c.translate(-x, -y)
      c.beginPath()
      c.arc(x, y, rx, 0, Math.PI * 2)
      c.fill()
      c.restore()
    }
    c.restore()
    // petite lueur chaude en plus, pour la respiration
    c.save()
    c.globalCompositeOperation = "screen"
    for (let i = 0; i < DAPPLES.length; i++) {
      const [x, y, rx, ry] = DAPPLES[i]
      const k = calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * (0.5 + (i % 4) * 0.13) + i * 1.7)
      c.fillStyle = `rgba(255,170,80,${0.02 + 0.07 * k})`
      c.beginPath()
      c.ellipse(x, y, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2)
      c.fill()
    }
    c.restore()
  }

  function drawWindows() {
    // une bande de lumière passe lentement sur les vitres + éclats de feuilles
    c.save()
    c.globalCompositeOperation = "screen"
    for (const w of WINDOWS) {
      c.save()
      c.beginPath()
      c.rect(w[0], w[1], w[2] - w[0], w[3] - w[1])
      c.clip()
      const horiz = w[2] - w[0] > w[3] - w[1]
      const L = horiz ? w[2] - w[0] : w[3] - w[1]
      const pos = ((t * 38) % (L + 240)) - 120
      const g = horiz ? c.createLinearGradient(w[0] + pos - 90, 0, w[0] + pos + 90, 0) : c.createLinearGradient(0, w[1] + pos - 90, 0, w[1] + pos + 90)
      g.addColorStop(0, "rgba(255,240,170,0)")
      g.addColorStop(0.5, `rgba(255,240,170,${calm ? 0.06 : 0.14})`)
      g.addColorStop(1, "rgba(255,240,170,0)")
      c.fillStyle = g
      c.fillRect(w[0], w[1], w[2] - w[0], w[3] - w[1])
      c.restore()
    }
    for (const l of leaves) {
      const a = Math.max(0, Math.sin(t * l.sp + l.ph))
      if (a < 0.05) continue
      c.fillStyle = `rgba(${l.hue},${(calm ? 0.2 : 0.55) * a})`
      c.fillRect(Math.round(l.x + Math.sin(t * 0.7 + l.ph) * 2), Math.round(l.y), 4, 4)
    }
    c.restore()
  }

  function drawDust(dt: number) {
    c.save()
    for (const d of dust) {
      if (!calm) {
        d.y -= d.v * dt
        d.x += Math.sin(t * 0.6 + d.ph) * 6 * dt
        if (d.y < 250) {
          d.y = 1220
          d.x = Math.random() * SW
        }
      }
      const a = 0.12 + 0.28 * (0.5 + 0.5 * Math.sin(t * 1.3 + d.ph))
      c.fillStyle = `rgba(255,236,190,${a})`
      c.beginPath()
      c.arc(d.x, d.y, d.s, 0, Math.PI * 2)
      c.fill()
    }
    c.restore()
  }

  function drawMarks() {
    for (const h of HOTSPOTS) {
      const near = Math.hypot(p.x - h.stand[0], p.y - h.stand[1]) < 30
      if (near) continue
      const k = calm ? 0 : Math.sin(t * 2.4 + h.mark[0] * 0.01)
      const y = h.mark[1] - 4 - k * 4
      c.save()
      c.translate(h.mark[0], y)
      c.fillStyle = "rgba(255,255,255,0.92)"
      c.beginPath()
      c.arc(0, 0, 15, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = "#3a2314"
      c.font = "700 20px ui-monospace, monospace"
      c.textAlign = "center"
      c.textBaseline = "middle"
      c.fillText("!", 0, 1)
      c.restore()
    }
  }

  function step(dt: number) {
    moving = false
    const sp = 270
    if (path.length) {
      const [wx, wy] = path[0]
      const dx = wx - p.x
      const dy = wy - p.y
      const d = Math.hypot(dx, dy)
      const m = sp * dt
      if (d <= m) {
        p.x = wx
        p.y = wy
        path.shift()
      } else {
        p.x += (dx / d) * m
        p.y += (dy / d) * m
        moving = true
        lean += (Math.sign(dx) * Math.min(1, Math.abs(dx) / d) - lean) * Math.min(1, dt * 10)
        walkPhase += dt * 13
      }
      if (!path.length) arrive()
    } else {
      lean += (0 - lean) * Math.min(1, dt * 8)
    }
    void squash
  }

  function arrive() {
    if (pendingHotspot) {
      o.onHotspot(pendingHotspot)
      pendingHotspot = null
    }
  }

  function frame(ts: number) {
    if (!alive) return
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016)
    last = ts
    t += dt
    step(dt)
    c.clearRect(0, 0, SW, SH)
    c.drawImage(o.bg, 0, 0, SW, SH)
    drawLight()
    drawWindows()
    drawDust(dt)
    drawAvatar()
    drawOccluders()
    drawMarks()
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  /* toucher à (x, y) en coordonnées image */
  function tap(x: number, y: number) {
    o.onHotspot(null)
    pendingHotspot = null
    // un point d'interaction ?
    const hs = HOTSPOTS.find((h) => x >= h.hit[0] && x <= h.hit[2] && y >= h.hit[1] && y <= h.hit[3]) ?? HOTSPOTS.find((h) => Math.hypot(x - h.mark[0], y - h.mark[1]) < 26)
    const target: [number, number] = hs ? hs.stand : [x, y]
    const pth = findPath([p.x, p.y], target)
    path = pth
    if (hs) {
      pendingHotspot = hs.id
      if (!pth.length) arrive() // déjà sur place
    }
  }

  return {
    tap,
    setAvatar(a: HTMLCanvasElement | null) {
      avatar = a
    },
    pos: () => ({ x: p.x, y: p.y }),
    teleport(x: number, y: number) {
      p.x = x
      p.y = y
      path = []
    },
    destroy() {
      alive = false
      cancelAnimationFrame(raf)
    },
  }
}
