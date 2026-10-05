"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { formatMeasure, isDrawingTemplate, cleanSizeGuide, type SizeGuide } from "@/lib/sizeGuide"
import { SizeGuideDrawing } from "@/components/SizeGuideDrawings"

/* ====================================================================
   GUIDE DES TAILLES (page plein écran de la fiche produit)
   - Fiche FYSU : suit le mode clair / sombre du site.
   - Pages indépendantes (The Wave, Kiban Collector…) : reste blanc.
   Dessin du vêtement (face + dos) ou ton image, puis tableau : une ligne par mesure (A, B, C, D),
   une colonne par taille.
   ==================================================================== */

const COPY = {
  fr: {
    title: "Guide des tailles",
    size: "Taille",
    cm: "CM",
    inch: "Pouces",
    close: "Fermer",
    note: "*Les mesures sont approximatives et peuvent varier selon la matière et la finition.",
    none: "Pas de guide des tailles pour ce produit.",
  },
  en: {
    title: "Size guide",
    size: "Size",
    cm: "CM",
    inch: "Inch",
    close: "Close",
    note: "*Measurements are approximate and may vary by material and finish.",
    none: "No size guide for this product.",
  },
}

export default function SizeGuideView({
  open,
  onClose,
  guide: rawGuide,
  imageUrl,
  lang,
  light = false,
}: {
  open: boolean
  onClose: () => void
  guide: SizeGuide | null | unknown
  imageUrl?: string | null
  lang: "fr" | "en"
  // true = toujours blanc (pages indépendantes) ; false = suit le mode clair / sombre
  light?: boolean
}) {
  const copy = COPY[lang]
  const guide = cleanSizeGuide(rawGuide)
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

  // fermer avec Échap + bloquer le défilement de la page derrière
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const drawing = !imageUrl && guide && isDrawingTemplate(guide.template) ? guide.template : null
  const lettered = !!drawing
  const bg = light ? "#ffffff" : "var(--background)"
  const fg = light ? "#171717" : "var(--foreground)"

  const cols = guide ? guide.rows.length : 0
  const grid = { gridTemplateColumns: `minmax(130px,1.7fr) repeat(${cols}, minmax(52px,1fr))` }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      className="fixed inset-0 z-[300] overflow-y-auto"
      style={{ background: bg, color: fg, ["--sg-bg" as any]: bg }}
    >
      <div className="mx-auto min-h-full w-full max-w-4xl px-5 pb-24 pt-5 sm:px-10">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            data-no-tap
            className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full opacity-70 transition hover:opacity-100"
          >
            <X size={26} strokeWidth={1} />
          </button>
        </div>

        <h2 className="mt-4 font-info text-[13px] font-normal uppercase tracking-[0.18em] opacity-90">{copy.title}</h2>

        {!guide && !imageUrl && <p className="mt-16 text-sm opacity-60">{copy.none}</p>}

        {(imageUrl || drawing) && (
          <div className="mt-14 sm:mt-20">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="mx-auto max-h-[60vh] w-auto max-w-full object-contain" />
            ) : (
              <SizeGuideDrawing template={drawing!} />
            )}
          </div>
        )}

        {guide && (
          <>
            <div className="mt-14 flex items-center gap-6 font-info text-[13px] uppercase tracking-[0.14em] sm:mt-20">
              {(["in", "cm"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => choose(u)}
                  aria-pressed={unit === u}
                  data-no-tap
                  className={`cursor-pointer pb-0.5 transition-opacity ${unit === u ? "border-b border-current opacity-100" : "opacity-40 hover:opacity-70"}`}
                >
                  {u === "cm" ? copy.cm : copy.inch}
                </button>
              ))}
            </div>

            <div className="mt-10 overflow-x-auto">
              <div className="min-w-full" style={{ minWidth: 130 + cols * 56 }}>
                <div className="grid items-center border-b border-current/40 pb-5 font-info text-[13px] uppercase tracking-[0.12em]" style={grid}>
                  <span>{copy.size}</span>
                  {guide.rows.map((r) => (
                    <span key={r.size} className="text-center">
                      {r.size}
                    </span>
                  ))}
                </div>

                {guide.columns.map((c, ci) => (
                  <div key={ci} className="grid items-center py-[17px] font-info text-[13px] tracking-[0.06em]" style={grid}>
                    <span className="pr-3 leading-snug">
                      {lettered && ci < 4 ? `${String.fromCharCode(65 + ci)} : ` : ""}
                      {c}
                    </span>
                    {guide.rows.map((r) => (
                      <span key={r.size} className="text-center tabular-nums">
                        {formatMeasure(r.values[ci] ?? "", unit)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-14 font-info text-[12px] leading-relaxed tracking-[0.04em] opacity-55">{guide.note || copy.note}</p>
          </>
        )}
      </div>
    </div>
  )
}
