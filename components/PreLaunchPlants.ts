/* ====================================================================
   TRINGLE DE VÊTEMENTS DERRIÈRE LA VITRE (page d'attente)
   Chemises, vestes, manteaux et pantalons en silhouette, floutés, suspendus à une tringle.
   Ils se balancent à peine, comme sous un courant d'air léger.
   Pour changer la composition : modifie les listes FRONT et BACK (position, hauteur, flou, couleur).
   ==================================================================== */

type Kind = "coat" | "shirt" | "blazer" | "trousers"

// Silhouettes dessinées dans une boîte de 120 de large (cintre en haut)
const SHAPES: Record<Kind, { h: number; body: string }> = {
  coat: {
    h: 270,
    body: "M60 24 L42 32 L14 46 L6 62 L10 156 L22 156 L25 76 L27 268 L93 268 L95 76 L98 156 L110 156 L114 62 L106 46 L78 32Z",
  },
  shirt: {
    h: 190,
    body: "M60 24 L40 30 L12 42 L4 58 L8 124 L20 124 L24 70 L26 186 L94 186 L96 70 L100 124 L112 124 L116 58 L108 42 L80 30Z",
  },
  blazer: {
    h: 222,
    body: "M60 24 L40 31 L13 44 L5 60 L9 140 L21 140 L24 74 L22 218 L98 218 L96 74 L99 140 L111 140 L115 60 L107 44 L80 31Z",
  },
  trousers: {
    h: 250,
    body: "M34 22 L86 22 L90 44 L88 246 L64 246 L60 74 L56 246 L32 246 L30 44Z",
  },
}

function garment(kind: Kind, color: string) {
  const s = SHAPES[kind]
  const hanger =
    kind === "trousers"
      ? `<path d="M60 0 L60 9 M60 9 C54 9 54 3 60 3" stroke="${color}" stroke-width="2.4" fill="none" stroke-linecap="round"/><rect x="26" y="14" width="68" height="6" rx="3" fill="${color}"/>`
      : `<path d="M60 0 L60 12 M60 12 L10 31 M60 12 L110 31 M60 0 C55 0 54 -5 59 -6" stroke="${color}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  return `<svg viewBox="0 -8 120 ${s.h + 8}" width="100%" height="100%" aria-hidden="true">${hanger}<path d="${s.body}" fill="${color}"/></svg>`
}

export type Item = {
  svg: string
  ratio: number // largeur / hauteur
  left: string
  height: string // hauteur à l'écran
  blur: number
  opacity: number
  sway: number // durée du balancement (secondes)
  delay: number
  swing: number // amplitude (degrés)
}

function item(kind: Kind, color: string, left: string, height: string, blur: number, opacity: number, sway: number, delay: number, swing = 1.4): Item {
  return { svg: garment(kind, color), ratio: 120 / (SHAPES[kind].h + 8), left, height, blur, opacity, sway, delay, swing }
}

// Tringle du fond : plus floue, plus claire
export const BACK: Item[] = [
  item("coat", "#8d9286", "-3%", "min(46vh, 74vw)", 12, 0.6, 10, -2, 1),
  item("shirt", "#969b8c", "15%", "min(30vh, 48vw)", 11, 0.55, 9, -5, 1.2),
  item("trousers", "#8b9084", "30%", "min(42vh, 66vw)", 12, 0.6, 11, -7, 0.9),
  item("blazer", "#939888", "47%", "min(38vh, 60vw)", 11, 0.55, 8.5, -3, 1.1),
  item("coat", "#8a8f83", "63%", "min(48vh, 76vw)", 12, 0.6, 10.5, -6, 1),
  item("shirt", "#969b8c", "80%", "min(30vh, 48vw)", 11, 0.55, 9.5, -1, 1.2),
  item("blazer", "#8d9286", "92%", "min(40vh, 62vw)", 12, 0.6, 11.5, -8, 0.9),
]

// Tringle de devant : plus sombre, plus nette (près de la vitre). Les teintes alternent pour qu'on distingue chaque pièce.
export const FRONT: Item[] = [
  item("coat", "#3b3e37", "1%", "min(58vh, 90vw)", 5, 0.9, 7.5, -1, 1.5),
  item("shirt", "#555950", "21%", "min(36vh, 56vw)", 5.5, 0.85, 6.5, -4, 1.7),
  item("blazer", "#42453e", "36%", "min(46vh, 72vw)", 5, 0.88, 8, -2, 1.4),
  item("trousers", "#5c6056", "55%", "min(48vh, 76vw)", 5.5, 0.85, 7, -6, 1.2),
  item("coat", "#373a34", "69%", "min(60vh, 94vw)", 5, 0.92, 8.5, -3, 1.4),
  item("shirt", "#555950", "87%", "min(34vh, 54vw)", 5.5, 0.85, 6.8, -7, 1.7),
]

export const GATE_CSS = `
  .gate-root { background: linear-gradient(180deg, #dcdfd4 0%, #b9bfae 46%, #6d7569 100%); }
  .gate-item { position: absolute; top: 0; transform-origin: 50% 0; will-change: transform; }
  .gate-rail { position: absolute; left: -5%; width: 110%; background: #31342f; }
  @keyframes gate-swing {
    0%, 100% { transform: rotate(calc(var(--swing) * -1deg)); }
    50% { transform: rotate(calc(var(--swing) * 1deg)); }
  }
  @keyframes gate-in { from { opacity: 0; } to { opacity: 1; } }
  .gate-root { animation: gate-in 900ms ease-out both; }
  .gate-leaving { opacity: 0 !important; transition: opacity 600ms ease; }
  .gate-glass {
    background:
      linear-gradient(180deg, rgba(230,233,224,0.44) 0%, rgba(190,197,176,0.32) 52%, rgba(58,66,56,0.36) 100%);
    -webkit-backdrop-filter: blur(5px) saturate(0.95);
    backdrop-filter: blur(5px) saturate(0.95);
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
  .gate-field::placeholder { color: rgba(255,255,255,0.8); }
  .gate-field:focus { background: rgba(255,255,255,0.24); border-color: rgba(255,255,255,0.7); }
  .gate-go {
    position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
    width: 36px; height: 36px; border-radius: 999px; border: 0; cursor: pointer;
    background: rgba(255,255,255,0.9); color: #2b302a; display: flex; align-items: center; justify-content: center;
    transition: transform 150ms ease, opacity 150ms ease;
  }
  .gate-go:active { transform: translateY(-50%) scale(0.92); }
  .gate-go:disabled { opacity: 0.5; cursor: default; }
  @media (prefers-reduced-motion: reduce) { .gate-swinger { animation: none !important; } .gate-root { animation: none; } }
`
