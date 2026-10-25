"use client"

import { useEffect, useState } from "react"
import { useLocale } from "next-intl"
import { PersonStanding, Shirt } from "lucide-react"

/* Vue des produits : « à plat » (le vêtement seul) ou « modèle » (le vêtement porté, quand la photo existe).
   Le choix est gardé et s'applique partout (cartes des pages, accueil, rangées). */

export type ViewMode = "flat" | "model"

const KEY = "fysu-view-mode"
const EVENT = "fysu-view-mode"

let current: ViewMode = "flat"
let loaded = false

function load() {
  if (loaded || typeof window === "undefined") return
  loaded = true
  try {
    if (localStorage.getItem(KEY) === "model") current = "model"
  } catch {}
}

export function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>("flat")
  useEffect(() => {
    load()
    setMode(current)
    const on = () => setMode(current)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  const set = (m: ViewMode) => {
    current = m
    try {
      localStorage.setItem(KEY, m)
    } catch {}
    window.dispatchEvent(new Event(EVENT))
  }
  return [mode, set]
}

export default function ViewToggle() {
  const fr = useLocale().startsWith("fr")
  const [mode, setMode] = useViewMode()
  const btn = (m: ViewMode) => {
    const label = m === "flat" ? (fr ? "Vue à plat" : "Flat view") : fr ? "Vue modèle" : "Model view"
    const Icon = m === "flat" ? Shirt : PersonStanding
    return (
      <button
        type="button"
        onClick={() => setMode(m)}
        aria-pressed={mode === m}
        aria-label={label}
        title={label}
        className={`flex h-8 w-8 cursor-pointer touch-manipulation items-center justify-center transition-opacity ${mode === m ? "opacity-100" : "opacity-35"}`}
      >
        <Icon size={17} strokeWidth={1.3} />
      </button>
    )
  }
  return (
    <div className="flex items-center">
      {btn("flat")}
      {btn("model")}
    </div>
  )
}
