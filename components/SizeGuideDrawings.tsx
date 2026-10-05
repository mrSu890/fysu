import type { ReactNode } from "react"
import type { DrawingTemplate } from "@/lib/sizeGuide"

/* ====================================================================
   DESSINS DU GUIDE DES TAILLES
   Manteau, veste, bomber, blazer, chemise, manches longues, pantalon, jupe, cravate : les dessins
   sont les images fournies (public/images/sg-*.png, fond transparent) affichées en masque,
   donc le trait suit la couleur du texte (mode clair / sombre). Les flèches A, B, C, D sont
   dessinées par-dessus, positionnées en % de l'image.
   T-shirt, short, sac : dessins codés en attendant les images.
   Quand il n'y a qu'une seule vue, toutes les flèches sont sur cette vue.
   Les traits utilisent la couleur du texte : ils suivent le mode clair / sombre tout seuls.
   ==================================================================== */

type Pt = [number, number]
const CX = 100

/* ---------- petits outils de dessin ---------- */

function Line({ d, o = 0.6, w = 1 }: { d: string; o?: number; w?: number }) {
  return <path d={d} fill="none" stroke="currentColor" strokeOpacity={o} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" />
}
const Outline = ({ d }: { d: string }) => <Line d={d} o={0.7} w={1.1} />
const Detail = ({ d }: { d: string }) => <Line d={d} o={0.42} w={0.9} />
const Guide = ({ a, b }: { a: Pt; b: Pt }) => (
  <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="currentColor" strokeOpacity={0.3} strokeWidth={0.8} strokeDasharray="2 2.2" />
)
const Dot = ({ p, r = 1.3 }: { p: Pt; r?: number }) => (
  <circle cx={p[0]} cy={p[1]} r={r} fill="none" stroke="currentColor" strokeOpacity={0.5} strokeWidth={0.8} />
)

// Flèche de mesure à deux pointes, avec la lettre au milieu (sur un petit fond qui masque le trait)
function Dim({ a, b, letter, side }: { a: Pt; b: Pt; letter: string; side?: "end" }) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const head = (p: Pt, s: 1 | -1) => {
    const L = 5
    const ang = 0.5
    const bx = -ux * s
    const by = -uy * s
    const r1: Pt = [p[0] + L * (bx * Math.cos(ang) - by * Math.sin(ang)), p[1] + L * (bx * Math.sin(ang) + by * Math.cos(ang))]
    const r2: Pt = [p[0] + L * (bx * Math.cos(-ang) - by * Math.sin(-ang)), p[1] + L * (bx * Math.sin(-ang) + by * Math.cos(-ang))]
    return `M${r1[0]} ${r1[1]} L${p[0]} ${p[1]} L${r2[0]} ${r2[1]}`
  }
  const lx = side === "end" ? b[0] + (dx >= 0 ? 10 : -10) * Math.abs(ux) + 0 : (a[0] + b[0]) / 2
  const ly = side === "end" ? b[1] + (dy >= 0 ? 10 : -10) * Math.abs(uy) : (a[1] + b[1]) / 2
  return (
    <g>
      <Line d={`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`} o={0.38} w={0.9} />
      <Line d={head(a, -1)} o={0.38} w={0.9} />
      <Line d={head(b, 1)} o={0.38} w={0.9} />
      {side !== "end" && <rect x={lx - 7} y={ly - 7} width={14} height={14} fill="var(--sg-bg, #fff)" />}
      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="currentColor" fillOpacity={0.85}>
        {letter}
      </text>
    </g>
  )
}

const mirrorX = (p: Pt): Pt => [2 * CX - p[0], p[1]]
const P = (p: Pt) => `${p[0]} ${p[1]}`

/* ====================================================================
   HAUTS : manteau, veste, blazer, chemise, t-shirt, manches longues
   Un seul générateur : la forme change avec les paramètres.
   ==================================================================== */

type Upper = {
  nh: number // demi-largeur de l'encolure
  ny: number // hauteur du haut du col
  sh: number // demi-largeur aux épaules
  shY: number // hauteur de l'épaule
  ch: number // demi-largeur de la poitrine
  armY: number // hauteur de l'aisselle
  hh: number // demi-largeur du bas
  hemY: number // hauteur du bas
  len: number // longueur de manche
  ang: number // inclinaison de la manche (degrés)
  cw: number // largeur de la manche au poignet
  curve?: number // bas arrondi
}

const UPPERS: Record<"coat" | "jacket" | "blazer" | "shirt" | "tshirt" | "longsleeve", Upper> = {
  tshirt: { nh: 13, ny: 28, sh: 40, shY: 38, ch: 36, armY: 66, hh: 36, hemY: 196, len: 36, ang: 38, cw: 28 },
  longsleeve: { nh: 13, ny: 28, sh: 40, shY: 38, ch: 36, armY: 66, hh: 36, hemY: 196, len: 138, ang: 17, cw: 22 },
  shirt: { nh: 13, ny: 28, sh: 42, shY: 40, ch: 40, armY: 70, hh: 40, hemY: 204, len: 134, ang: 14, cw: 22, curve: 10 },
  blazer: { nh: 14, ny: 26, sh: 42, shY: 38, ch: 38, armY: 70, hh: 42, hemY: 190, len: 134, ang: 12, cw: 24 },
  jacket: { nh: 15, ny: 24, sh: 44, shY: 38, ch: 42, armY: 70, hh: 40, hemY: 176, len: 126, ang: 14, cw: 26 },
  coat: { nh: 15, ny: 24, sh: 44, shY: 38, ch: 42, armY: 72, hh: 44, hemY: 236, len: 138, ang: 12, cw: 28 },
}

function upperGeom(u: Upper) {
  const t = (u.ang * Math.PI) / 180
  const S: Pt = [CX - u.sh, u.shY]
  const cuffO: Pt = [S[0] - u.len * Math.sin(t), S[1] + u.len * Math.cos(t)]
  const cuffI: Pt = [cuffO[0] + u.cw * Math.cos(t), cuffO[1] + u.cw * Math.sin(t)]
  const N: Pt = [CX - u.nh, u.ny]
  const A: Pt = [CX - u.ch, u.armY]
  const H: Pt = [CX - u.hh, u.hemY]
  return { t, S, cuffO, cuffI, N, A, H }
}

function upperOutline(u: Upper) {
  const g = upperGeom(u)
  const left = [g.N, g.S, g.cuffO, g.cuffI, g.A, g.H]
  const right = [...left].reverse().map(mirrorX)
  const cv = u.curve ?? 0
  // le contour : épaule, manche, côté, bas (légèrement arrondi), et retour
  return (
    `M${P(left[0])} ` +
    left.slice(1).map((p) => `L${P(p)}`).join(" ") +
    ` Q${CX} ${u.hemY + cv} ${P(right[0])} ` +
    right.slice(1).map((p) => `L${P(p)}`).join(" ") +
    ` Q${CX} ${u.ny - 3} ${P(left[0])}`
  )
}

function Armholes({ u }: { u: Upper }) {
  const g = upperGeom(u)
  const d1 = `M${P(g.S)} Q${g.S[0] + 5} ${(g.S[1] + g.A[1]) / 2} ${P(g.A)}`
  const m1 = mirrorX(g.S)
  const m2 = mirrorX(g.A)
  const d2 = `M${P(m1)} Q${m1[0] - 5} ${(g.S[1] + g.A[1]) / 2} ${P(m2)}`
  return (
    <>
      <Detail d={d1} />
      <Detail d={d2} />
    </>
  )
}

// Ligne perpendiculaire à la manche, à une distance d du bout (pour les poignets)
function cuffLine(u: Upper, d: number, side: 1 | -1) {
  const g = upperGeom(u)
  const ux = Math.sin(g.t)
  const uy = -Math.cos(g.t) // vers l'épaule
  const a: Pt = [g.cuffO[0] + ux * d, g.cuffO[1] + uy * d]
  const b: Pt = [g.cuffI[0] + ux * d, g.cuffI[1] + uy * d]
  const pa = side === 1 ? a : mirrorX(a)
  const pb = side === 1 ? b : mirrorX(b)
  return `M${P(pa)} L${P(pb)}`
}

function UpperFront({ k }: { k: keyof typeof UPPERS }) {
  const u = UPPERS[k]
  const g = upperGeom(u)
  const lapelY = u.ny + 62
  return (
    <g>
      <Outline d={upperOutline(u)} />
      <Armholes u={u} />

      {(k === "tshirt" || k === "longsleeve") && <Detail d={`M${CX - u.nh} ${u.ny} Q${CX} ${u.ny + 24} ${CX + u.nh} ${u.ny}`} />}
      {k === "longsleeve" && (
        <>
          <Detail d={cuffLine(u, 7, 1)} />
          <Detail d={cuffLine(u, 7, -1)} />
        </>
      )}

      {k === "shirt" && (
        <>
          {/* col, boutons, poignets */}
          <Detail d={`M${CX - u.nh} ${u.ny - 1} L${CX} ${u.ny + 5} L${CX - 3} ${u.ny + 22} L${CX - u.nh - 7} ${u.ny + 9} Z`} />
          <Detail d={`M${CX + u.nh} ${u.ny - 1} L${CX} ${u.ny + 5} L${CX + 3} ${u.ny + 22} L${CX + u.nh + 7} ${u.ny + 9} Z`} />
          <Detail d={`M${CX} ${u.ny + 22} L${CX} ${u.hemY + 5}`} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Dot key={i} p={[CX, u.ny + 36 + i * 26]} r={1.2} />
          ))}
          <Detail d={cuffLine(u, 12, 1)} />
          <Detail d={cuffLine(u, 12, -1)} />
          <Detail d={cuffLine(u, 0, 1)} />
        </>
      )}

      {(k === "blazer" || k === "coat") && (
        <>
          {/* revers à cran, boutons, poches */}
          {[1, -1].map((s) => {
            const m = (p: Pt): Pt => (s === 1 ? p : mirrorX(p))
            const nTop = m([CX - u.nh, u.ny])
            const notchOut = m([CX - u.nh - 11, u.ny + 28])
            const notchIn = m([CX - u.nh - 3, u.ny + 33])
            const tip = m([CX + 1, lapelY])
            return (
              <g key={s}>
                <Detail d={`M${P(nTop)} L${P(notchOut)} L${P(notchIn)} L${P(tip)}`} />
                <Detail d={`M${P(nTop)} Q${P(m([CX - u.nh + 2, u.ny + 40]))} ${P(tip)}`} />
              </g>
            )
          })}
          <Detail d={`M${CX + 1} ${lapelY} L${CX + 1} ${u.hemY + 3}`} />
          {k === "blazer" ? (
            <>
              <Dot p={[CX + 6, lapelY + 8]} />
              <Dot p={[CX + 6, lapelY + 34]} />
              <Detail d={`M${CX - u.ch + 8} ${u.armY + 62} L${CX - u.ch + 34} ${u.armY + 62} L${CX - u.ch + 34} ${u.armY + 70} L${CX - u.ch + 8} ${u.armY + 70}`} />
              <Detail d={`M${CX + u.ch - 8} ${u.armY + 62} L${CX + u.ch - 34} ${u.armY + 62} L${CX + u.ch - 34} ${u.armY + 70} L${CX + u.ch - 8} ${u.armY + 70}`} />
            </>
          ) : (
            <>
              <Dot p={[CX + 6, lapelY + 10]} />
              <Dot p={[CX + 6, lapelY + 46]} />
              <Dot p={[CX + 6, lapelY + 82]} />
              <Detail d={`M${CX - u.ch + 12} ${u.armY + 76} L${CX - u.ch + 24} ${u.armY + 128} L${CX - u.ch + 34} ${u.armY + 126} L${CX - u.ch + 22} ${u.armY + 74}`} />
              <Detail d={`M${CX + u.ch - 12} ${u.armY + 76} L${CX + u.ch - 24} ${u.armY + 128} L${CX + u.ch - 34} ${u.armY + 126} L${CX + u.ch - 22} ${u.armY + 74}`} />
            </>
          )}
          <Detail d={cuffLine(u, 6, 1)} />
          <Detail d={cuffLine(u, 6, -1)} />
        </>
      )}

      {k === "jacket" && (
        <>
          {/* col montant, fermeture éclair, poches, bande en bas */}
          <Detail d={`M${CX - u.nh - 2} ${u.ny + 2} L${CX - u.nh - 3} ${u.ny - 8} L${CX + u.nh + 3} ${u.ny - 8} L${CX + u.nh + 2} ${u.ny + 2}`} />
          <Detail d={`M${CX - u.nh} ${u.ny} Q${CX} ${u.ny + 12} ${CX + u.nh} ${u.ny}`} />
          <Detail d={`M${CX} ${u.ny + 8} L${CX} ${u.hemY}`} />
          <Detail d={`M${CX - 2.5} ${u.ny + 10} L${CX + 2.5} ${u.ny + 10} M${CX - 2.5} ${u.ny + 16} L${CX + 2.5} ${u.ny + 16}`} />
          <Detail d={`M${CX - u.hh + 1} ${u.hemY - 14} L${CX + u.hh - 1} ${u.hemY - 14}`} />
          <Detail d={`M${CX - u.ch + 8} ${u.armY + 38} L${CX - u.ch + 18} ${u.armY + 82}`} />
          <Detail d={`M${CX + u.ch - 8} ${u.armY + 38} L${CX + u.ch - 18} ${u.armY + 82}`} />
          <Detail d={cuffLine(u, 10, 1)} />
          <Detail d={cuffLine(u, 10, -1)} />
        </>
      )}

      {/* B : largeur de poitrine ; C : longueur de manche */}
      <Dim a={[CX - u.ch + 1, u.armY + 15]} b={[CX + u.ch - 1, u.armY + 15]} letter="A" />
      {(() => {
        const off = 13
        const nx = -Math.cos(g.t)
        const ny = -Math.sin(g.t)
        const a: Pt = [g.S[0] + nx * off, g.S[1] + ny * off]
        const b: Pt = [g.cuffO[0] + nx * off, g.cuffO[1] + ny * off]
        return <Dim a={a} b={b} letter="D" />
      })()}
    </g>
  )
}

function UpperBack({ k }: { k: keyof typeof UPPERS }) {
  const u = UPPERS[k]
  const g = upperGeom(u)
  const right = Math.max(CX + u.sh, mirrorX(g.cuffO)[0])
  const dimY = u.ny - 15
  return (
    <g>
      <Outline d={upperOutline(u)} />
      <Armholes u={u} />
      <Detail d={`M${CX - u.nh} ${u.ny} Q${CX} ${u.ny + 7} ${CX + u.nh} ${u.ny}`} />

      {(k === "blazer" || k === "coat" || k === "jacket") && <Detail d={`M${CX} ${u.ny + 5} L${CX} ${u.hemY + 3}`} />}
      {k === "coat" && <Detail d={`M${CX} ${u.hemY - 60} L${CX - 7} ${u.hemY - 60} M${CX} ${u.hemY - 60} L${CX + 7} ${u.hemY - 60}`} />}
      {k === "shirt" && (
        <>
          <Detail d={`M${CX - u.sh + 4} ${u.shY + 24} L${CX + u.sh - 4} ${u.shY + 24}`} />
          <Detail d={`M${CX - 3} ${u.shY + 24} L${CX - 3} ${u.shY + 44} M${CX + 3} ${u.shY + 24} L${CX + 3} ${u.shY + 44}`} />
          <Detail d={cuffLine(u, 12, 1)} />
          <Detail d={cuffLine(u, 12, -1)} />
        </>
      )}
      {k === "longsleeve" && (
        <>
          <Detail d={cuffLine(u, 7, 1)} />
          <Detail d={cuffLine(u, 7, -1)} />
        </>
      )}
      {(k === "blazer" || k === "coat" || k === "jacket") && (
        <>
          <Detail d={cuffLine(u, 6, 1)} />
          <Detail d={cuffLine(u, 6, -1)} />
        </>
      )}
      {k === "jacket" && <Detail d={`M${CX - u.hh + 1} ${u.hemY - 14} L${CX + u.hh - 1} ${u.hemY - 14}`} />}

      {/* A : largeur d'épaules ; D : longueur */}
      <Guide a={[CX - u.sh, u.shY - 2]} b={[CX - u.sh, dimY]} />
      <Guide a={[CX + u.sh, u.shY - 2]} b={[CX + u.sh, dimY]} />
      <Dim a={[CX - u.sh, dimY]} b={[CX + u.sh, dimY]} letter="C" />

      <Guide a={[CX + u.nh, u.ny]} b={[right + 12, u.ny]} />
      <Guide a={[CX + u.hh, u.hemY]} b={[right + 12, u.hemY]} />
      <Dim a={[right + 12, u.ny + 1]} b={[right + 12, u.hemY - 1]} letter="B" />
    </g>
  )
}

/* ====================================================================
   BAS : pantalon, short, jupe
   ==================================================================== */

type Lower = { wh: number; wy: number; hip: number; hipY: number; crY: number; hemY: number; hemO: number; hemI: number }
const SHORT: Lower = { wh: 38, wy: 20, hip: 45, hipY: 62, crY: 96, hemY: 150, hemO: 47, hemI: 5 }

function lowerOutline(l: Lower) {
  const pts: Pt[] = [
    [CX - l.wh, l.wy],
    [CX - l.hip, l.hipY],
    [CX - l.hemO, l.hemY],
    [CX - l.hemI, l.hemY],
    [CX, l.crY],
  ]
  const right = [...pts].reverse().slice(1).map(mirrorX)
  return `M${pts.map(P).join(" L")} L${right.map(P).join(" L")} Z`
}

function LowerDraw({ l, view }: { l: Lower; view: "front" | "back" }) {
  const wb = l.wy + 12
  return (
    <g>
      <Outline d={lowerOutline(l)} />
      <Detail d={`M${CX - l.wh - 0.5} ${wb} L${CX + l.wh + 0.5} ${wb}`} />
      {view === "front" ? (
        <>
          <Detail d={`M${CX} ${l.wy} L${CX} ${l.crY - 22} Q${CX} ${l.crY - 12} ${CX - 8} ${l.crY - 12}`} />
          <Detail d={`M${CX - l.wh + 4} ${wb} Q${CX - l.wh - 6} ${wb + 20} ${CX - l.hip + 4} ${l.hipY + 8}`} />
          <Detail d={`M${CX + l.wh - 4} ${wb} Q${CX + l.wh + 6} ${wb + 20} ${CX + l.hip - 4} ${l.hipY + 8}`} />
          <Dot p={[CX + 3, wb + 2]} r={1.2} />
        </>
      ) : (
        <>
          <Detail d={`M${CX - l.wh} ${wb} L${CX} ${wb + 14} L${CX + l.wh} ${wb}`} />
          <Detail d={`M${CX - 30} ${wb + 18} L${CX - 8} ${wb + 18} L${CX - 8} ${wb + 36} L${CX - 30} ${wb + 36} Z`} />
          <Detail d={`M${CX + 30} ${wb + 18} L${CX + 8} ${wb + 18} L${CX + 8} ${wb + 36} L${CX + 30} ${wb + 36} Z`} />
        </>
      )}
      {view === "front" ? (
        <>
          {/* A : taille ; C : entrejambe */}
          <Guide a={[CX - l.wh, l.wy]} b={[CX - l.wh, l.wy - 12]} />
          <Guide a={[CX + l.wh, l.wy]} b={[CX + l.wh, l.wy - 12]} />
          <Dim a={[CX - l.wh, l.wy - 12]} b={[CX + l.wh, l.wy - 12]} letter="A" />
          <Dim a={[CX - 22, l.crY + 2]} b={[CX - 22, l.hemY]} letter="C" />
        </>
      ) : (
        <>
          {/* B : hanches ; D : longueur */}
          <Dim a={[CX - l.hip, l.hipY + 14]} b={[CX + l.hip, l.hipY + 14]} letter="B" />
          <Guide a={[CX - l.wh, l.wy]} b={[CX - l.hip - 20, l.wy]} />
          <Guide a={[CX - l.hemO, l.hemY]} b={[CX - l.hip - 20, l.hemY]} />
          <Dim a={[CX - l.hip - 20, l.wy + 1]} b={[CX - l.hip - 20, l.hemY - 1]} letter="D" />
        </>
      )}
    </g>
  )
}

/* ====================================================================
   SAC
   ==================================================================== */

function BagDraw({ view }: { view: "front" | "side" }) {
  const hw = view === "front" ? 72 : 24
  const top = 76
  const bot = 204
  return (
    <g>
      <Outline d={`M${CX - hw} ${top + 6} Q${CX - hw} ${top} ${CX - hw + 6} ${top} L${CX + hw - 6} ${top} Q${CX + hw} ${top} ${CX + hw} ${top + 6} L${CX + hw} ${bot - 6} Q${CX + hw} ${bot} ${CX + hw - 6} ${bot} L${CX - hw + 6} ${bot} Q${CX - hw} ${bot} ${CX - hw} ${bot - 6} Z`} />
      {view === "front" ? (
        <>
          <Outline d={`M${CX - 34} ${top} C${CX - 34} ${top - 62} ${CX + 34} ${top - 62} ${CX + 34} ${top}`} />
          <Detail d={`M${CX - 30} ${top} C${CX - 30} ${top - 54} ${CX + 30} ${top - 54} ${CX + 30} ${top}`} />
          <Detail d={`M${CX - hw} ${top + 34} Q${CX} ${top + 52} ${CX + hw} ${top + 34}`} />
          <Detail d={`M${CX - 6} ${top + 44} L${CX + 6} ${top + 44} L${CX + 6} ${top + 56} L${CX - 6} ${top + 56} Z`} />
        </>
      ) : (
        <>
          <Outline d={`M${CX - 12} ${top} C${CX - 12} ${top - 60} ${CX + 12} ${top - 60} ${CX + 12} ${top}`} />
          <Detail d={`M${CX - hw + 6} ${top + 8} L${CX - hw + 6} ${bot - 8} M${CX + hw - 6} ${top + 8} L${CX + hw - 6} ${bot - 8}`} />
        </>
      )}
      {view === "front" ? (
        <>
          {/* A : largeur ; B : hauteur ; D : anse */}
          <Dim a={[CX - hw, bot + 16]} b={[CX + hw, bot + 16]} letter="A" />
          <Guide a={[CX - hw, bot + 2]} b={[CX - hw, bot + 16]} />
          <Guide a={[CX + hw, bot + 2]} b={[CX + hw, bot + 16]} />
          <Guide a={[CX + hw, top]} b={[CX + hw + 16, top]} />
          <Guide a={[CX + hw, bot]} b={[CX + hw + 16, bot]} />
          <Dim a={[CX + hw + 16, top + 1]} b={[CX + hw + 16, bot - 1]} letter="B" />
          <Dim a={[CX, top - 1]} b={[CX, top - 49]} letter="D" side="end" />
        </>
      ) : (
        <>
          <Dim a={[CX - hw, bot + 16]} b={[CX + hw, bot + 16]} letter="C" />
          <Guide a={[CX - hw, bot + 2]} b={[CX - hw, bot + 16]} />
          <Guide a={[CX + hw, bot + 2]} b={[CX + hw, bot + 16]} />
        </>
      )}
    </g>
  )
}

/* ====================================================================
   DESSINS À PARTIR D'IMAGES
   Coordonnées en % de l'image (x vers la droite, y vers le bas).
   ==================================================================== */

type Pct = [number, number]
type Arrow = { a: Pct; b: Pct; l: string; t?: number; out?: boolean }
type ImgSpec = { src: string; w: number; h: number; max: number; arrows: Arrow[]; guides?: [Pct, Pct][] }

const FS = 18 // taille des lettres (px à la largeur maximale)

function ImgDim({ a, b, l, t = 0.5, out }: { a: [number, number]; b: [number, number]; l: string; t?: number; out?: boolean }) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const L = 9
  const ang = 0.45
  const head = (p: [number, number], s: 1 | -1) => {
    const bx = -ux * s
    const by = -uy * s
    const c = Math.cos(ang)
    const sn = Math.sin(ang)
    const r1 = [p[0] + L * (bx * c - by * sn), p[1] + L * (bx * sn + by * c)]
    const r2 = [p[0] + L * (bx * c + by * sn), p[1] + L * (-bx * sn + by * c)]
    return `M${r1[0]} ${r1[1]} L${p[0]} ${p[1]} L${r2[0]} ${r2[1]}`
  }
  const lx = out ? b[0] + ux * 17 : a[0] + dx * t
  const ly = out ? b[1] + uy * 17 : a[1] + dy * t
  const st = { fill: "none", stroke: "currentColor", strokeOpacity: 0.55, strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const
  return (
    <g>
      <path d={`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`} {...st} />
      <path d={head(a, -1)} {...st} />
      <path d={head(b, 1)} {...st} />
      {!out && <rect x={lx - 12} y={ly - 12} width={24} height={24} fill="var(--sg-bg, #fff)" />}
      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={FS} fill="currentColor" fillOpacity={0.9}>
        {l}
      </text>
    </g>
  )
}

function ImageDrawing({ spec }: { spec: ImgSpec }) {
  const W = spec.max
  const H = (W * spec.h) / spec.w
  const px = (p: Pct): [number, number] => [(p[0] / 100) * W, (p[1] / 100) * H]
  const url = `url(${spec.src})`
  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: spec.max, aspectRatio: `${spec.w} / ${spec.h}` }}>
      <div
        className="absolute inset-0"
        style={{
          background: "currentColor",
          WebkitMaskImage: url,
          maskImage: url,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          opacity: 0.85,
        }}
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" fontFamily="inherit" aria-hidden="true">
        {(spec.guides ?? []).map((g, i) => {
          const a = px(g[0])
          const b = px(g[1])
          return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 3" />
        })}
        {spec.arrows.map((r) => (
          <ImgDim key={r.l} a={px(r.a)} b={px(r.b)} l={r.l} t={r.t} out={r.out} />
        ))}
      </svg>
    </div>
  )
}

// A = poitrine, B = longueur, C = épaules, D = manche (même ordre que le tableau)
const SPECS: Partial<Record<DrawingTemplate, ImgSpec>> = {
  blazer: {
    src: "/images/sg-blazer.png", w: 1000, h: 661, max: 620,
    arrows: [
      { l: "C", a: [9.2, 14.5], b: [43.2, 14.5], t: 0.2 },
      { l: "D", a: [9.5, 17], b: [4.5, 85] },
      { l: "A", a: [11.5, 30], b: [41.5, 30], t: 0.2 },
      { l: "B", a: [68, 9], b: [68, 95.5] },
    ],
  },
  coat: {
    src: "/images/sg-coat.png", w: 1000, h: 971, max: 620,
    arrows: [
      { l: "C", a: [7.6, 10.3], b: [40.6, 10.3], t: 0.5 },
      { l: "D", a: [7.8, 13], b: [4.3, 52] },
      { l: "A", a: [10, 27], b: [38.3, 27], t: 0.5 },
      { l: "B", a: [66.5, 6], b: [66.5, 96.5] },
    ],
  },
  jacket: {
    src: "/images/sg-jacket.png", w: 1000, h: 511, max: 620,
    arrows: [
      { l: "C", a: [13.6, 18.5], b: [40, 18.5], t: 0.2 },
      { l: "D", a: [13, 22], b: [4.5, 88] },
      { l: "A", a: [14.8, 36.5], b: [38.8, 36.5], t: 0.2 },
      { l: "B", a: [68, 12], b: [68, 75.5] },
    ],
  },
  bomber: {
    src: "/images/sg-bomber.png", w: 1000, h: 556, max: 620,
    arrows: [
      { l: "C", a: [12.3, 17.5], b: [40, 17.5], t: 0.2 },
      { l: "D", a: [11.5, 20], b: [5, 93] },
      { l: "A", a: [11.5, 33], b: [38.7, 33], t: 0.2 },
      { l: "B", a: [72, 17], b: [72, 92.5] },
    ],
  },
  shirt: {
    src: "/images/sg-shirt.png", w: 1000, h: 749, max: 620,
    arrows: [
      { l: "C", a: [10.3, 12.8], b: [43.7, 12.8], t: 0.18 },
      { l: "D", a: [10.5, 16], b: [4.5, 80] },
      { l: "A", a: [10.4, 23], b: [44.6, 23], t: 0.2 },
      { l: "B", a: [66, 8], b: [66, 97] },
    ],
  },
  longsleeve: {
    src: "/images/sg-sweat.png", w: 700, h: 801, max: 330,
    arrows: [
      { l: "C", a: [20.6, 12], b: [79.4, 12], t: 0.72 },
      { l: "A", a: [22.8, 33], b: [77.2, 33], t: 0.5 },
      { l: "B", a: [28, 5], b: [28, 90.5] },
      { l: "D", a: [82, 14], b: [88, 96] },
    ],
  },
  pants: {
    src: "/images/sg-pants.png", w: 1000, h: 1013, max: 560,
    arrows: [
      { l: "A", a: [9.8, 4.6], b: [39, 4.6], t: 0.14 },
      { l: "C", a: [19, 2.5], b: [19, 30.5] },
      { l: "B", a: [57.8, 24], b: [92.3, 24], t: 0.2 },
      { l: "D", a: [67, 4.5], b: [67, 97.6] },
    ],
    guides: [[[19, 31], [24, 31]]],
  },
  skirt: {
    src: "/images/sg-skirt.png", w: 1000, h: 1078, max: 560,
    arrows: [
      { l: "A", a: [11.8, 4.6], b: [39.2, 4.6], t: 0.5 },
      { l: "B", a: [66, 3], b: [66, 97] },
    ],
  },
  tie: {
    src: "/images/sg-tie.png", w: 700, h: 1359, max: 250,
    arrows: [
      { l: "C", a: [8.2, 5], b: [27.8, 5], out: true },
      { l: "B", a: [3.8, 90], b: [33.4, 90], t: 0.5 },
      { l: "A", a: [74, 2.5], b: [74, 97.5], t: 0.3 },
    ],
  },
}

/* ====================================================================
   ASSEMBLAGE
   ==================================================================== */

function Frame({ children, h = 262 }: { children: ReactNode; h?: number }) {
  return (
    <svg viewBox={`-4 -2 208 ${h}`} className="h-auto w-full" fontFamily="inherit" aria-hidden="true">
      {children}
    </svg>
  )
}

export function SizeGuideDrawing({ template }: { template: DrawingTemplate }) {
  const spec = SPECS[template]
  if (spec) return <ImageDrawing spec={spec} />

  let left: ReactNode
  let right: ReactNode
  switch (template) {
    case "short":
      left = <LowerDraw l={SHORT} view="front" />
      right = <LowerDraw l={SHORT} view="back" />
      break
    case "bag":
      left = <BagDraw view="front" />
      right = <BagDraw view="side" />
      break
    default:
      left = <UpperFront k="tshirt" />
      right = <UpperBack k="tshirt" />
  }
  return (
    <div className="mx-auto grid w-full max-w-[560px] grid-cols-2 items-end gap-2 sm:gap-6">
      <Frame>{left}</Frame>
      <Frame>{right}</Frame>
    </div>
  )
}
