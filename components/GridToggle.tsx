"use client"

import { useEffect, useState } from "react"
import { useLocale } from "next-intl"

/* Téléphone : 1 grand produit par ligne par défaut ; on peut passer à 2 par ligne (et inversement). Choix gardé. */

const KEY = "fysu-grid-cols"

export function useGridCols(): [1 | 2, (n: 1 | 2) => void] {
  const [cols, setCols] = useState<1 | 2>(2) // par défaut : deux produits par ligne
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") setCols(1)
    } catch {}
  }, [])
  const set = (n: 1 | 2) => {
    setCols(n)
    try {
      localStorage.setItem(KEY, String(n))
    } catch {}
  }
  return [cols, set]
}

export default function GridToggle({ cols, setCols }: { cols: 1 | 2; setCols: (n: 1 | 2) => void }) {
  const fr = useLocale().startsWith("fr")
  const btn = (n: 1 | 2) => (
    <button
      type="button"
      onClick={() => setCols(n)}
      aria-pressed={cols === n}
      aria-label={n === 1 ? (fr ? "Un produit par ligne" : "One per row") : fr ? "Deux produits par ligne" : "Two per row"}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center transition-opacity ${cols === n ? "opacity-100" : "opacity-35"}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
        {n === 1 ? (
          <rect x="3" y="2" width="10" height="12" />
        ) : (
          <>
            <rect x="1.5" y="2" width="5.5" height="12" />
            <rect x="9" y="2" width="5.5" height="12" />
          </>
        )}
      </svg>
    </button>
  )
  return (
    <div className="mb-3 flex justify-end md:hidden">
      {btn(1)}
      {btn(2)}
    </div>
  )
}
