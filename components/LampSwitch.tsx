"use client"

import { Lightbulb } from "lucide-react"
import { useLocale } from "next-intl"
import { useLamp } from "@/lib/lamp"

/* ====================================================================
   INTERRUPTEUR DES LAMPES
   Une ampoule + un interrupteur qui glisse. Un seul état pour tout le site (voir lib/lamp.ts).
   - par défaut : sobre, à poser à côté d'un titre
   - glass : pastille en verre, à poser par-dessus une photo (fiche produit)
   - big : version plus grande (fiche produit)
   ==================================================================== */

function labels(locale: string, lit: boolean) {
  const t: Record<string, [string, string]> = {
    fr: ["Allumer", "Éteindre"],
    nl: ["Aanzetten", "Uitzetten"],
    ja: ["つける", "消す"],
    en: ["Turn on", "Turn off"],
  }
  return (t[locale] ?? t.en)[lit ? 1 : 0]
}

export default function LampSwitch({
  glass = false,
  big = false,
  showLabel = false,
  className = "",
}: {
  glass?: boolean
  big?: boolean
  showLabel?: boolean
  className?: string
}) {
  const locale = useLocale()
  const [lit, setLit] = useLamp()
  const label = labels(locale, lit)

  const trackW = big ? 64 : 48
  const trackH = big ? 36 : 28
  const knob = trackH - 8

  return (
    <button
      type="button"
      role="switch"
      aria-checked={lit}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        setLit(!lit)
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`${glass ? "liquid-glass" : ""} inline-flex cursor-pointer touch-manipulation items-center gap-3 rounded-full transition active:scale-95 ${
        glass ? (big ? "px-4 py-3" : "px-3 py-2") : "py-1"
      } ${className}`}
      style={glass ? { color: "var(--menu)" } : undefined}
    >
      <Lightbulb
        size={big ? 24 : 20}
        strokeWidth={1.6}
        style={{
          color: lit ? "#f5c542" : "currentColor",
          fill: lit ? "#f5c542" : "transparent",
          filter: lit ? "drop-shadow(0 0 6px rgba(245,197,66,0.8))" : "none",
          transition: "all 0.5s ease",
        }}
      />
      <span
        aria-hidden="true"
        className="relative shrink-0 rounded-full"
        style={{
          width: trackW,
          height: trackH,
          background: lit ? "#f5c542" : "color-mix(in srgb, currentColor 28%, transparent)",
          transition: "background 0.5s ease",
        }}
      >
        <span
          className="absolute rounded-full bg-white shadow"
          style={{
            top: 4,
            width: knob,
            height: knob,
            left: lit ? trackW - knob - 4 : 4,
            transition: "left 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </span>
      {showLabel && <span className={big ? "text-sm" : "text-xs"}>{label}</span>}
    </button>
  )
}
