"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { Mars, PersonStanding, Shirt, Venus } from "lucide-react"

/* Vue des produits : « à plat » (le vêtement seul) ou « modèle » (le vêtement porté, quand la photo existe).
   En vue modèle on choisit aussi homme / femme — sauf sur For him / For her, où c'est automatique.
   Les choix sont gardés et s'appliquent partout (cartes des pages, accueil, rangées). */

export type ViewMode = "flat" | "model"
export type Who = "men" | "women"

const KEY = "fysu-view-mode"
const WHO_KEY = "fysu-view-who"
const EVENT = "fysu-view-mode"

let mode: ViewMode = "flat"
let who: Who = "men"
let loaded = false

function load() {
  if (loaded || typeof window === "undefined") return
  loaded = true
  try {
    if (localStorage.getItem(KEY) === "model") mode = "model"
    if (localStorage.getItem(WHO_KEY) === "women") who = "women"
  } catch {}
}

function save(key: string, v: string) {
  try {
    localStorage.setItem(key, v)
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}

export function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const [m, setM] = useState<ViewMode>("flat")
  useEffect(() => {
    load()
    setM(mode)
    const on = () => setM(mode)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  return [
    m,
    (next) => {
      mode = next
      save(KEY, next)
    },
  ]
}

// homme / femme choisi par le visiteur (pour les pages neutres et les produits unisexes)
export function useWho(): [Who, (w: Who) => void] {
  const [w, setW] = useState<Who>("men")
  useEffect(() => {
    load()
    setW(who)
    const on = () => setW(who)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  return [
    w,
    (next) => {
      who = next
      save(WHO_KEY, next)
    },
  ]
}

// For him / For her : le genre de la page décide
export function pageWho(pathname: string | null | undefined): Who | null {
  if (!pathname) return null
  if (pathname === "/for-her" || pathname.startsWith("/for-her/")) return "women"
  if (pathname === "/for-him" || pathname.startsWith("/for-him/")) return "men"
  return null
}

export default function ViewToggle({ fixedWho }: { fixedWho?: Who | null }) {
  const fr = useLocale().startsWith("fr")
  const pathname = usePathname()
  const [m, setMode] = useViewMode()
  const [w, setWho] = useWho()
  const fixed = fixedWho ?? pageWho(pathname)

  const btn = (key: string, label: string, Icon: typeof Shirt, on: boolean, click: () => void) => (
    <button
      key={key}
      type="button"
      onClick={click}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 cursor-pointer touch-manipulation items-center justify-center transition-opacity ${on ? "opacity-100" : "opacity-35"}`}
    >
      <Icon size={17} strokeWidth={1.3} />
    </button>
  )

  return (
    <div className="flex items-center">
      {btn("flat", fr ? "Vue à plat" : "Flat view", Shirt, m === "flat", () => setMode("flat"))}
      {btn("model", fr ? "Vue modèle" : "Model view", PersonStanding, m === "model", () => setMode("model"))}
      {m === "model" && !fixed && (
        <>
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-current opacity-20" />
          {btn("men", fr ? "Modèle homme" : "Male model", Mars, w === "men", () => setWho("men"))}
          {btn("women", fr ? "Modèle femme" : "Female model", Venus, w === "women", () => setWho("women"))}
        </>
      )}
    </div>
  )
}
