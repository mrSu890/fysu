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
const CAM = { y: 2.6, z: -2.2 } // caméra un peu haute : on voit le terrain de dessus
const F = 450 // « zoom » de la caméra (le panier fait la taille qu'il doit avoir sur le terrain)
const FIRE_AT = 3 // swish d'affilée pour mettre le feu
const MOVE_AT = 40 // niveau où le panier commence à bouger
const ANGLE = (55 * Math.PI) / 180
const MAX_PULL = 320
const START = { x: 0, y: 0.95, z: 0 }

const BW = 2.4 // largeur du panneau (m)
const PX = 2 // taille d'un « gros pixel » pour le panier, l'anneau, le filet et la balle

export const makeHoops: ArcadeMaker = ({ c: mainC, W, H, end, skin }) => {
  // tout ce qui bouge (panier, anneau, filet, balle) est dessiné en basse résolution puis agrandi sans lissage :
  // même grain de pixel que le décor
  let c = mainC
  const lay = document.createElement("canvas")
  lay.width = Math.ceil(W / PX)
  lay.height = Math.ceil(H / PX)
  const lc = lay.getContext("2d", { willReadFrequently: true })!
  lc.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0)

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

  const HOR = H * 0.42 // ligne d'horizon à l'écran

  /* ---------- sprites (panier, balle) ---------- */
  const load = (src: string) => {
    const im = new Image()
    im.src = src
    return im
  }
  const postImg = load("/games-hoops-post.png")
  const ballImg = load("/games-hoops-ball.png")
  const ok = (im: HTMLImageElement) => im.complete && im.naturalWidth > 0
  // repères du panneau dans l'image d'origine (324 × 568) : bas du panneau, haut du mât, etc.
  const SP = { w: 324, boardBot: 198, aBot: 250, bTop: 245, cTop: 300, h: 568 }

  /* ---------- le vent dans les feuilles (terrain de quartier) ----------
     Le décor est copié une fois à la résolution de l'écran ; les carreaux qui contiennent du
     feuillage sont redessinés légèrement décalés, au rythme d'une brise qui passe. */
  const TILE = 6
  let wind: { src: string; cv: HTMLCanvasElement; sc: number; tiles: { x: number; y: number; a: number }[] } | null = null
  function buildWind(bg: HTMLImageElement, src: string) {
    const sc = Math.max(1, Math.round(c.getTransform().a))
    const cv = document.createElement("canvas")
    cv.width = W * sc
    cv.height = H * sc
    const x = cv.getContext("2d")!
    const s = Math.max(cv.width / bg.naturalWidth, cv.height / bg.naturalHeight)
    x.drawImage(bg, (cv.width - bg.naturalWidth * s) / 2, (cv.height - bg.naturalHeight * s) / 2, bg.naturalWidth * s, bg.naturalHeight * s)
    const tiles: { x: number; y: number; a: number }[] = []
    let data: ImageData | null = null
    try {
      data = x.getImageData(0, 0, cv.width, cv.height)
    } catch {}
    if (data) {
      const T = TILE * sc
      for (let ty = 0; ty < H / TILE; ty++) {
        for (let tx = 0; tx < W / TILE; tx++) {
          let leaf = 0
          let n = 0
          for (let yy = 0; yy < T; yy += 2) {
            for (let xx = 0; xx < T; xx += 2) {
              const i = ((ty * T + yy) * cv.width + tx * T + xx) * 4
              const r = data.data[i]
              const g = data.data[i + 1]
              const b = data.data[i + 2]
              n++
              if (g > b + 60 && g > r - 20) leaf++ // feuille verte ou jaune
            }
          }
          const y = ty * TILE
          // seulement l'intérieur du feuillage de l'arbre (les bords restent fixes : l'image ne se déforme pas)
          if (n && leaf / n > 0.8 && y < H * 0.4) tiles.push({ x: tx * TILE, y, a: 1.7 })
        }
      }
    }
    wind = { src, cv, sc, tiles }
  }
  // feuilles emportées par le vent
  const leaves = Array.from({ length: 8 }, (_, i) => ({ x: rand(0, W * 0.5), y: rand(H * 0.05, H * 0.5), ph: i * 1.3, s: rand(0.7, 1.4), col: ["#e8e23a", "#c9d63a", "#8fb83a"][i % 3] }))

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
        if (ball.vz > 0 && ball.z + BR > bz && ball.z - BR < bz + 0.1 && Math.abs(ball.x - hx) < BW / 2 && ball.y > HY - 0.2 && ball.y < HY + 1.3) {
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
    if (bg && skin.bg === "court") {
      drawCourt(bg)
      return
    }
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

  function drawCourt(bg: HTMLImageElement) {
    if (!wind || wind.src !== bg.src) buildWind(bg, bg.src)
    const w = wind!
    c.drawImage(w.cv, 0, 0, W, H)
    const gust = 0.6 + 0.4 * Math.sin(t * 0.4) + 0.2 * Math.sin(t * 1.1 + 1)
    const sc = w.sc
    for (const tl of w.tiles) {
      const ph = t * 2.4 + tl.x * 0.06 + tl.y * 0.045
      const ox = Math.sin(ph) * tl.a * gust
      const oy = Math.sin(t * 1.7 + tl.x * 0.05) * tl.a * 0.3 * gust
      c.drawImage(w.cv, tl.x * sc, tl.y * sc, TILE * sc, TILE * sc, tl.x + ox, tl.y + oy, TILE, TILE)
    }
    // quelques feuilles qui s'envolent de l'arbre
    for (const l of leaves) {
      l.x += (28 + 40 * gust) * l.s * (1 / 60)
      l.y += (6 + 10 * Math.sin(t * 2 + l.ph)) * (1 / 60) + 0.12
      if (l.x > W + 10 || l.y > H * 0.8) {
        l.x = rand(-20, W * 0.3)
        l.y = rand(H * 0.04, H * 0.34)
      }
      c.fillStyle = l.col
      const sz = Math.round(2 + l.s * 1.5)
      c.fillRect(Math.round(l.x), Math.round(l.y + Math.sin(t * 4 + l.ph) * 3), sz + (Math.sin(t * 6 + l.ph) > 0 ? 1 : 0), sz)
    }
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
    if (!ok(postImg)) return
    const iw = postImg.naturalWidth
    const u = iw / SP.w // l'image est peut-être réduite : tout est proportionnel
    const P = proj(hx, 0, bz + 0.05)
    const s = (P.k * BW) / SP.w // pixels d'écran par pixel d'origine (le panneau fait BW mètres)
    const cx = P.x
    const yBoard = proj(hx, HY - 0.2, bz + 0.05).y // bas du panneau
    const yGround = P.y
    const dw = SP.w * s
    const x0 = cx - dw / 2
    // ombre au sol (sur l'image principale, en transparence)
    mainC.save()
    mainC.globalAlpha = appear
    mainC.fillStyle = "rgba(0,0,0,.25)"
    mainC.beginPath()
    mainC.ellipse(cx, yGround, 0.5 * P.k, 0.13 * P.k, 0, 0, Math.PI * 2)
    mainC.fill()
    mainC.restore()
    // haut : panneau + début du mât
    const aTop = yBoard - SP.boardBot * s
    const aBot = yBoard + (SP.aBot - SP.boardBot) * s
    c.drawImage(postImg, 0, 0, iw, SP.aBot * u, x0, aTop, dw, aBot - aTop)
    // bas : mât avec protection bleue et socle, posé sur le sol
    const cTop = yGround - (SP.h - SP.cTop) * s
    c.drawImage(postImg, 0, SP.cTop * u, iw, (SP.h - SP.cTop) * u, x0, cTop, dw, yGround - cTop)
    // milieu : un bout de mât étiré
    if (cTop > aBot) c.drawImage(postImg, 0, SP.bTop * u, iw, (SP.cTop - SP.bTop) * u, x0, aBot - 0.5, dw, cTop - aBot + 1)
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
    c.strokeStyle = "rgba(255,255,255,.95)"
    c.lineWidth = 2.2
    const bottom: { x: number; y: number }[] = []
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2
      const q = proj(hx + Math.cos(a) * rimR * 0.62 + sway, HY - 0.55, hz + Math.sin(a) * rimR * 0.62)
      bottom.push(q)
    }
    for (let i = 0; i < 28; i += 4) {
      c.beginPath()
      c.moveTo(pts[i].x, pts[i].y)
      c.lineTo(bottom[(i + 1) % 28].x, bottom[(i + 1) % 28].y)
      c.moveTo(pts[i].x, pts[i].y)
      c.lineTo(bottom[(i + 27) % 28].x, bottom[(i + 27) % 28].y)
      c.stroke()
    }
    for (let j = 1; j <= 1; j++) {
      const f = j / 2
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
    mainC.save()
    const glow = mainC.createRadialGradient(W / 2 + hx * k, proj(hx, HY, hz).y, 4, W / 2 + hx * k, proj(hx, HY, hz).y, rimR * k * 2.4)
    glow.addColorStop(0, "rgba(255,120,30,.30)")
    glow.addColorStop(1, "rgba(255,80,20,0)")
    mainC.fillStyle = glow
    mainC.globalAlpha = appear
    mainC.fillRect(0, 0, W, H)
    mainC.restore()
    c.save()
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
    mainC.fillStyle = "rgba(0,0,0,.28)"
    mainC.beginPath()
    mainC.ellipse(sh.x, sh.y, r * 1.1, r * 0.3, 0, 0, Math.PI * 2)
    mainC.fill()
    if (skin.ball === "classic" && ok(ballImg)) {
      c.save()
      c.translate(p.x, p.y)
      c.rotate(spin * 0.3)
      c.drawImage(ballImg, -r, -r, r * 2, r * 2)
      c.restore()
      return
    }
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
    c = mainC
    drawFloor()
    // couche « gros pixels »
    lc.setTransform(1, 0, 0, 1, 0, 0)
    lc.clearRect(0, 0, lay.width, lay.height)
    lc.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0)
    c = lc
    c.save()
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
    if (swish > 0) {
      const p = proj(hx, HY, hz)
      c.strokeStyle = onFire() ? NEON.orange : NEON.yellow
      c.lineWidth = 4
      c.beginPath()
      c.arc(p.x, p.y, rimR * p.k + (0.6 - swish) * 90, 0, Math.PI * 2)
      c.stroke()
    }
    c.restore()
    // bords nets : pas de demi-transparence, puis on agrandit sans lissage
    lc.setTransform(1, 0, 0, 1, 0, 0)
    const im = lc.getImageData(0, 0, lay.width, lay.height)
    const d = im.data
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 96 ? 255 : 0
    lc.putImageData(im, 0, 0)
    lc.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0)
    c = mainC
    c.save()
    c.imageSmoothingEnabled = false
    c.globalAlpha = appear
    c.drawImage(lay, 0, 0, lay.width * PX, lay.height * PX)
    c.restore()
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
