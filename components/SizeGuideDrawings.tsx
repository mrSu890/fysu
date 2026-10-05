import type { ReactNode } from "react"
import type { DrawingTemplate } from "@/lib/sizeGuide"

/* ====================================================================
   DESSINS DU GUIDE DES TAILLES
   Un dessin au trait fin par type de produit (manteau, veste, blazer, chemise, t-shirt,
   manches longues, pantalon, jupe, short, cravate, sac), vu de face et de dos,
   avec les lignes de mesure A, B, C, D qui correspondent aux lignes du tableau.
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
      <Dim a={[CX - u.ch + 1, u.armY + 15]} b={[CX + u.ch - 1, u.armY + 15]} letter="B" />
      {(() => {
        const off = 13
        const nx = -Math.cos(g.t)
        const ny = -Math.sin(g.t)
        const a: Pt = [g.S[0] + nx * off, g.S[1] + ny * off]
        const b: Pt = [g.cuffO[0] + nx * off, g.cuffO[1] + ny * off]
        return <Dim a={a} b={b} letter="C" />
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
      <Dim a={[CX - u.sh, dimY]} b={[CX + u.sh, dimY]} letter="A" />

      <Guide a={[CX + u.nh, u.ny]} b={[right + 12, u.ny]} />
      <Guide a={[CX + u.hh, u.hemY]} b={[right + 12, u.hemY]} />
      <Dim a={[right + 12, u.ny + 1]} b={[right + 12, u.hemY - 1]} letter="D" />
    </g>
  )
}

/* ====================================================================
   BAS : pantalon, short, jupe
   ==================================================================== */

type Lower = { wh: number; wy: number; hip: number; hipY: number; crY: number; hemY: number; hemO: number; hemI: number }
const PANTS: Lower = { wh: 38, wy: 20, hip: 44, hipY: 62, crY: 98, hemY: 232, hemO: 36, hemI: 8 }
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

function SkirtDraw({ view }: { view: "front" | "back" }) {
  const wy = 24
  const wh = 34
  const hip = 42
  const hipY = 70
  const hem = 64
  const hemY = 196
  return (
    <g>
      <Outline d={`M${CX - wh} ${wy} L${CX - hip} ${hipY} L${CX - hem} ${hemY} Q${CX} ${hemY + 5} ${CX + hem} ${hemY} L${CX + hip} ${hipY} L${CX + wh} ${wy} Z`} />
      <Detail d={`M${CX - wh} ${wy + 10} L${CX + wh} ${wy + 10}`} />
      {view === "front" ? (
        <>
          <Detail d={`M${CX} ${wy + 10} L${CX} ${hemY + 3}`} />
          <Dot p={[CX + 3, wy + 5]} r={1.1} />
          <Detail d={`M${CX - 20} ${wy + 10} L${CX - 24} ${wy + 54}`} />
          <Detail d={`M${CX + 20} ${wy + 10} L${CX + 24} ${wy + 54}`} />
        </>
      ) : (
        <>
          <Detail d={`M${CX} ${wy + 10} L${CX} ${hemY + 3}`} />
          <Detail d={`M${CX - 22} ${wy + 10} L${CX - 4} ${wy + 40} M${CX + 22} ${wy + 10} L${CX + 4} ${wy + 40}`} />
        </>
      )}
      {view === "front" ? (
        <>
          <Guide a={[CX - wh, wy]} b={[CX - wh, wy - 12]} />
          <Guide a={[CX + wh, wy]} b={[CX + wh, wy - 12]} />
          <Dim a={[CX - wh, wy - 12]} b={[CX + wh, wy - 12]} letter="A" />
          <Dim a={[CX - hip + 1, hipY + 12]} b={[CX + hip - 1, hipY + 12]} letter="B" />
          <Dim a={[CX - hem, hemY + 14]} b={[CX + hem, hemY + 14]} letter="D" />
          <Guide a={[CX - hem, hemY + 3]} b={[CX - hem, hemY + 14]} />
          <Guide a={[CX + hem, hemY + 3]} b={[CX + hem, hemY + 14]} />
        </>
      ) : (
        <>
          <Guide a={[CX - wh, wy]} b={[CX - hem - 18, wy]} />
          <Guide a={[CX - hem, hemY]} b={[CX - hem - 18, hemY]} />
          <Dim a={[CX - hem - 18, wy + 1]} b={[CX - hem - 18, hemY - 1]} letter="C" />
        </>
      )}
    </g>
  )
}

/* ====================================================================
   CRAVATE
   ==================================================================== */

function TieDraw({ view }: { view: "front" | "back" }) {
  const top = 14
  const body = `M${CX - 11} ${top} L${CX + 11} ${top} L${CX + 8} ${top + 30} L${CX + 6} ${top + 44} L${CX + 21} ${top + 178} L${CX} ${top + 206} L${CX - 21} ${top + 178} L${CX - 6} ${top + 44} L${CX - 8} ${top + 30} Z`
  return (
    <g>
      <Outline d={body} />
      <Detail d={`M${CX - 11} ${top + 5} L${CX + 11} ${top + 5}`} />
      <Detail d={`M${CX - 8} ${top + 30} Q${CX} ${top + 36} ${CX + 8} ${top + 30}`} />
      {view === "back" && (
        <>
          <Detail d={`M${CX - 9} ${top + 130} L${CX + 9} ${top + 130} L${CX + 9} ${top + 140} L${CX - 9} ${top + 140} Z`} />
          <Detail d={`M${CX - 14} ${top + 158} L${CX + 14} ${top + 158}`} />
        </>
      )}
      {view === "front" ? (
        <>
          {/* A : longueur ; C : largeur en haut */}
          <Guide a={[CX - 11, top]} b={[CX - 40, top]} />
          <Guide a={[CX, top + 220]} b={[CX - 40, top + 220]} />
          <Dim a={[CX - 40, top + 1]} b={[CX - 40, top + 219]} letter="A" />
          <Guide a={[CX + 6, top + 44]} b={[CX + 38, top + 44]} />
          <Guide a={[CX - 6, top + 44]} b={[CX - 6, top + 54]} />
          <Dim a={[CX - 6, top + 54]} b={[CX + 6, top + 54]} letter="C" side="end" />
        </>
      ) : (
        <>
          {/* B : largeur de la partie large */}
          <Dim a={[CX - 20, top + 168]} b={[CX + 20, top + 168]} letter="B" />
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
   ASSEMBLAGE : deux vues côte à côte
   ==================================================================== */

function Frame({ children, h = 262 }: { children: ReactNode; h?: number }) {
  return (
    <svg viewBox={`-4 -2 208 ${h}`} className="h-auto w-full" fontFamily="inherit" aria-hidden="true">
      {children}
    </svg>
  )
}

export function SizeGuideDrawing({ template }: { template: DrawingTemplate }) {
  let left: ReactNode
  let right: ReactNode
  switch (template) {
    case "coat":
    case "jacket":
    case "blazer":
    case "shirt":
    case "tshirt":
    case "longsleeve":
      left = <UpperFront k={template} />
      right = <UpperBack k={template} />
      break
    case "pants":
      left = <LowerDraw l={PANTS} view="front" />
      right = <LowerDraw l={PANTS} view="back" />
      break
    case "short":
      left = <LowerDraw l={SHORT} view="front" />
      right = <LowerDraw l={SHORT} view="back" />
      break
    case "skirt":
      left = <SkirtDraw view="front" />
      right = <SkirtDraw view="back" />
      break
    case "tie":
      left = <TieDraw view="front" />
      right = <TieDraw view="back" />
      break
    case "bag":
      left = <BagDraw view="front" />
      right = <BagDraw view="side" />
      break
  }
  return (
    <div className="mx-auto grid w-full max-w-[640px] grid-cols-2 items-end gap-2 sm:gap-6">
      <Frame>{left}</Frame>
      <Frame>{right}</Frame>
    </div>
  )
}
