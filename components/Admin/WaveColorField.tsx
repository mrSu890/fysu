"use client"

import { WAVE } from "@/lib/brands"
import { normalizeWaveBg } from "@/lib/waveColor"

/* Choix de la couleur de fond de la page The Wave (produit ou album) */
export default function WaveColorField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const valid = normalizeWaveBg(value)
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-[#3d3a35]">Couleur de fond The Wave</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Couleur de fond"
          value={valid ?? WAVE.RED}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-[#e6e1d8] bg-white p-1"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#e10813"
          maxLength={7}
          className="h-10 w-28 rounded border border-[#e6e1d8] bg-white px-2 text-sm"
        />
        <button
          type="button"
          onClick={() => onChange("")}
          className="h-10 rounded border border-[#e6e1d8] bg-white px-3 text-xs"
        >
          Rouge par défaut
        </button>
      </div>
      <p className="mt-1 text-[11px] text-[#7a756c]">
        La vague prend automatiquement une teinte plus claire de cette couleur. Choisis plutôt une couleur soutenue.
      </p>
    </div>
  )
}
