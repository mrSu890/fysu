/* ====================================================================
   PLANTES FLOUES DERRIÈRE LA VITRE (page d'attente)
   Dessinées en SVG, floutées, et qui bougent à peine, comme portées par une brise légère.
   Pour changer la composition : modifie la liste PLANTS (position, taille, flou, couleur).
   ==================================================================== */

// Petit générateur pseudo-aléatoire : le dessin est toujours le même (pas de décalage serveur / navigateur)
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const f = (n: number) => Math.round(n * 10) / 10

// Feuille allongée (palmier / bambou) partant de (0,0) vers le haut
function leaf(length: number, width: number, bend: number) {
  return (
    `M0 0 C${f(width)} ${f(-length * 0.3)} ${f(width * 0.7 + bend)} ${f(-length * 0.72)} ${f(bend * 1.6)} ${f(-length)} ` +
    `C${f(-width * 0.7 + bend)} ${f(-length * 0.7)} ${f(-width)} ${f(-length * 0.3)} 0 0Z`
  )
}

function palm(seed: number, color: string, leaves: number) {
  const r = rng(seed)
  let out = `<path d="M100 400 L100 322" stroke="${color}" stroke-width="3" fill="none"/>`
  for (let i = 0; i < leaves; i++) {
    const t = leaves === 1 ? 0.5 : i / (leaves - 1)
    const angle = -78 + t * 156 + (r() - 0.5) * 14
    const len = 150 + r() * 110 - Math.abs(angle) * 0.4
    const w = 7 + r() * 8
    const bend = (r() - 0.5) * 26
    out += `<path transform="translate(100 322) rotate(${f(angle)})" d="${leaf(len, w, bend)}" fill="${color}" opacity="${f(0.8 + r() * 0.2)}"/>`
  }
  return out
}

function grass(seed: number, color: string, blades: number) {
  const r = rng(seed)
  let out = ""
  for (let i = 0; i < blades; i++) {
    const x = 40 + r() * 120
    const len = 150 + r() * 220
    const lean = (r() - 0.5) * 90
    const w = 3 + r() * 3.5
    out +=
      `<path d="M${f(x - w)} 400 Q${f(x + lean * 0.15)} ${f(400 - len * 0.55)} ${f(x + lean)} ${f(400 - len)} ` +
      `Q${f(x + lean * 0.15 + 7)} ${f(400 - len * 0.5)} ${f(x + w)} 400Z" fill="${color}" opacity="${f(0.7 + r() * 0.3)}"/>`
  }
  return out
}

function bloom(seed: number, color: string) {
  const r = rng(seed)
  let out = `<path d="M100 400 Q${f(96 + r() * 8)} 250 100 120" stroke="${color}" stroke-width="3" fill="none"/>`
  out += `<circle cx="100" cy="104" r="26" fill="${color}"/>`
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const len = 34 + r() * 10
    out += `<path d="M100 104 L${f(100 + Math.cos(a) * len)} ${f(104 + Math.sin(a) * len)}" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`
  }
  out += `<path transform="translate(100 330) rotate(-38)" d="${leaf(120, 7, 8)}" fill="${color}"/>`
  out += `<path transform="translate(100 300) rotate(34)" d="${leaf(110, 6, -8)}" fill="${color}"/>`
  return out
}

export type Plant = {
  svg: string
  // position et taille (en % / vh de l'écran), flou en px, durée du balancement en secondes
  left: string
  bottom: string
  height: string
  blur: number
  opacity: number
  sway: number
  delay: number
  flip?: boolean
}

const wrap = (inner: string) => `<svg viewBox="0 0 200 400" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${inner}</svg>`

export const PLANTS: Plant[] = [
  // loin, très flou, vert clair (donne de la brume et de la profondeur)
  { svg: wrap(palm(11, "#7a9370", 11)), left: "40%", bottom: "-8%", height: "86vh", blur: 20, opacity: 0.8, sway: 11, delay: -3 },
  { svg: wrap(grass(23, "#86a07a", 11)), left: "62%", bottom: "-6%", height: "78vh", blur: 16, opacity: 0.75, sway: 9, delay: -6 },
  { svg: wrap(bloom(5, "#44604b")), left: "-2%", bottom: "-4%", height: "100vh", blur: 13, opacity: 0.8, sway: 10, delay: -2 },
  // plan moyen
  { svg: wrap(grass(47, "#3a553f", 12)), left: "22%", bottom: "-6%", height: "74vh", blur: 10, opacity: 0.85, sway: 8, delay: -5 },
  { svg: wrap(palm(31, "#2c4733", 13)), left: "-12%", bottom: "-12%", height: "104vh", blur: 8, opacity: 0.9, sway: 12, delay: -8 },
  { svg: wrap(bloom(9, "#35503c")), left: "76%", bottom: "-5%", height: "88vh", blur: 11, opacity: 0.75, sway: 9.5, delay: -4, flip: true },
  // près de la vitre, le plus net
  { svg: wrap(palm(77, "#1f3626", 12)), left: "66%", bottom: "-16%", height: "118vh", blur: 5, opacity: 0.95, sway: 13, delay: -1, flip: true },
]

export const GATE_CSS = `
  .gate-root { background: linear-gradient(180deg, #cdd6c3 0%, #aebd9f 46%, #6f8465 100%); }
  .gate-plant { position: absolute; aspect-ratio: 1 / 2; transform-origin: 50% 100%; will-change: transform; }
  @keyframes gate-sway {
    0%, 100% { transform: rotate(-1deg) translateX(-0.4%); }
    50% { transform: rotate(1.2deg) translateX(0.5%); }
  }
  @keyframes gate-in { from { opacity: 0; } to { opacity: 1; } }
  .gate-root { animation: gate-in 900ms ease-out both; }
  .gate-leaving { opacity: 0 !important; transition: opacity 600ms ease; }
  .gate-glass {
    background:
      linear-gradient(180deg, rgba(222,232,214,0.46) 0%, rgba(176,196,160,0.34) 52%, rgba(52,72,52,0.34) 100%);
    -webkit-backdrop-filter: blur(9px) saturate(1.05);
    backdrop-filter: blur(9px) saturate(1.05);
  }
  .gate-grain {
    opacity: 0.22; mix-blend-mode: soft-light;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  }
  .gate-field {
    width: 100%; background: rgba(255,255,255,0.16); color: #fff;
    border: 1px solid rgba(255,255,255,0.38); border-radius: 999px;
    padding: 13px 52px 13px 20px; font-size: 14px; letter-spacing: 0.02em; outline: none;
    -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
    transition: background 200ms ease, border-color 200ms ease;
  }
  .gate-field::placeholder { color: rgba(255,255,255,0.78); }
  .gate-field:focus { background: rgba(255,255,255,0.24); border-color: rgba(255,255,255,0.7); }
  .gate-go {
    position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
    width: 36px; height: 36px; border-radius: 999px; border: 0; cursor: pointer;
    background: rgba(255,255,255,0.9); color: #25392b; display: flex; align-items: center; justify-content: center;
    transition: transform 150ms ease, opacity 150ms ease;
  }
  .gate-go:active { transform: translateY(-50%) scale(0.92); }
  .gate-go:disabled { opacity: 0.5; cursor: default; }
  @media (prefers-reduced-motion: reduce) { .gate-plant { animation: none !important; } .gate-root { animation: none; } }
`
