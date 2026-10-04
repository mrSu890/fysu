"use client"

import { useEffect, useState } from "react"
import { formatMeasure, type SizeGuide } from "@/lib/sizeGuide"

/* ====================================================================
   GUIDE DES TAILLES (fenêtre de la fiche produit)
   Dessin du vêtement (ou ton image) + tableau en cm / pouces.
   ==================================================================== */

const COPY = {
  fr: { size: "Taille", unitCm: "cm", unitIn: "pouces", how: "Comment mesurer : les lettres du dessin correspondent aux colonnes du tableau.", modelNote: "Mesures du vêtement posé à plat, en" },
  en: { size: "Size", unitCm: "cm", unitIn: "inches", how: "How to measure: the letters on the drawing match the table columns.", modelNote: "Garment measurements, laid flat, in" },
}

const INK = "currentColor"

function Marker({ x, y, letter }: { x: number; y: number; letter: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={7.5} fill="#171717" />
      <text x={x} y={y + 3.4} textAnchor="middle" fontSize="9.5" fontWeight={700} fill="#fff">
        {letter}
      </text>
    </g>
  )
}

function Tick({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#171717" strokeWidth={1.4} />
}

// T-shirt / haut : A poitrine, B longueur, C épaules, D manche
function TopDrawing() {
  return (
    <svg viewBox="0 0 200 220" className="mx-auto h-56 w-auto" role="img" aria-label="Top">
      <path
        d="M60 30 L80 20 Q100 34 120 20 L140 30 L182 64 L160 88 L140 74 L140 202 L60 202 L60 74 L40 88 L18 64 Z"
        fill="none"
        stroke={INK}
        strokeOpacity={0.55}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {/* A poitrine */}
      <line x1={60} y1={98} x2={140} y2={98} stroke="#171717" strokeWidth={1.4} strokeDasharray="4 3" />
      <Tick x1={60} y1={93} x2={60} y2={103} />
      <Tick x1={140} y1={93} x2={140} y2={103} />
      <Marker x={100} y={98} letter="A" />
      {/* B longueur */}
      <line x1={100} y1={34} x2={100} y2={202} stroke="#171717" strokeWidth={1.4} strokeDasharray="4 3" />
      <Tick x1={95} y1={202} x2={105} y2={202} />
      <Marker x={100} y={160} letter="B" />
      {/* C épaules */}
      <line x1={60} y1={30} x2={140} y2={30} stroke="#171717" strokeWidth={1.4} strokeDasharray="4 3" />
      <Tick x1={60} y1={25} x2={60} y2={35} />
      <Tick x1={140} y1={25} x2={140} y2={35} />
      <Marker x={100} y={30} letter="C" />
      {/* D manche */}
      <line x1={140} y1={30} x2={176} y2={66} stroke="#171717" strokeWidth={1.4} strokeDasharray="4 3" />
      <Marker x={160} y={50} letter="D" />
    </svg>
  )
}

// Pantalon : A taille, B hanches, C entrejambe, D longueur
function BottomDrawing() {
  return (
    <svg viewBox="0 0 200 220" className="mx-auto h-56 w-auto" role="img" aria-label="Bottom">
      <path
        d="M58 20 L142 20 L152 204 L108 204 L100 84 L92 204 L48 204 Z"
        fill="none"
        stroke={INK}
        strokeOpacity={0.55}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {/* A taille */}
      <line x1={58} y1={30} x2={142} y2={30} stroke="#171717" strokeWidth={1.4} strokeDasharray="4 3" />
      <Tick x1={58} y1={25} x2={58} y2={35} />
      <Tick x1={142} y1={25} x2={142} y2={35} />
      <Marker x={100} y={30} letter="A" />
      {/* B hanches */}
      <line x1={55} y1={66} x2={145} y2={66} stroke="#171717" strokeWidth={1.4} strokeDasharray="4 3" />
      <Tick x1={55} y1={61} x2={55} y2={71} />
      <Tick x1={145} y1={61} x2={145} y2={71} />
      <Marker x={100} y={66} letter="B" />
      {/* C entrejambe */}
      <line x1={100} y1={84} x2={100} y2={204} stroke="#171717" strokeWidth={1.4} strokeDasharray="4 3" />
      <Tick x1={95} y1={204} x2={105} y2={204} />
      <Marker x={100} y={150} letter="C" />
      {/* D longueur */}
      <line x1={46} y1={20} x2={46} y2={204} stroke="#171717" strokeWidth={1.4} strokeDasharray="4 3" />
      <Tick x1={41} y1={20} x2={51} y2={20} />
      <Tick x1={41} y1={204} x2={51} y2={204} />
      <Marker x={46} y={112} letter="D" />
    </svg>
  )
}

export default function SizeGuideView({
  guide,
  imageUrl,
  lang,
}: {
  guide: SizeGuide | null
  imageUrl?: string | null
  lang: "fr" | "en"
}) {
  const copy = COPY[lang]
  const [unit, setUnit] = useState<"cm" | "in">("cm")

  // on se souvient du choix cm / pouces
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("fysu:sizeunit")
      if (saved === "cm" || saved === "in") setUnit(saved)
    } catch {}
  }, [])

  function choose(u: "cm" | "in") {
    setUnit(u)
    try {
      window.localStorage.setItem("fysu:sizeunit", u)
    } catch {}
  }

  const showDrawing = !imageUrl && guide && (guide.template === "top" || guide.template === "bottom")
  const lettered = !!showDrawing

  return (
    <div className="space-y-5">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="mx-auto max-h-[46vh] w-auto max-w-full object-contain" />
      ) : showDrawing ? (
        <div>
          {guide!.template === "top" ? <TopDrawing /> : <BottomDrawing />}
          <p className="mt-2 text-center text-xs opacity-60">{copy.how}</p>
        </div>
      ) : null}

      {guide && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs opacity-60">
              {copy.modelNote} {unit === "cm" ? copy.unitCm : copy.unitIn}.
            </p>
            <div role="group" className="flex shrink-0 overflow-hidden rounded-full border border-current/20 text-xs">
              {(["cm", "in"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => choose(u)}
                  aria-pressed={unit === u}
                  className="cursor-pointer px-3 py-1.5 font-medium transition"
                  style={unit === u ? { background: "#171717", color: "#fff" } : undefined}
                >
                  {u === "cm" ? copy.unitCm : copy.unitIn}
                </button>
              ))}
            </div>
          </div>

          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-center text-sm">
              <thead>
                <tr className="border-b border-current/20">
                  <th className="px-2 py-2 text-left font-medium">{copy.size}</th>
                  {guide.columns.map((c, i) => (
                    <th key={i} className="px-2 py-2 font-medium">
                      {lettered && i < 4 && (
                        <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#171717] align-middle text-[9px] font-bold text-white">
                          {String.fromCharCode(65 + i)}
                        </span>
                      )}
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guide.rows.map((r) => (
                  <tr key={r.size} className="border-b border-current/10">
                    <td className="px-2 py-2 text-left font-semibold">{r.size}</td>
                    {guide.columns.map((_, i) => (
                      <td key={i} className="px-2 py-2 tabular-nums">
                        {formatMeasure(r.values[i] ?? "", unit)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {guide.note && <p className="text-xs leading-relaxed opacity-70">{guide.note}</p>}
        </>
      )}
    </div>
  )
}
