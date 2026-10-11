import { useSyncExternalStore } from "react"

/* ====================================================================
   LAMPES : ALLUMÉES / ÉTEINTES (état partagé par tout le site)
   Un seul interrupteur pour toutes les lampes : celui de la rangée « Lampes » (page Kiban Collector)
   et celui de la fiche produit sont reliés. L'état est retenu pendant la visite.
   ==================================================================== */

const KEY = "fysu-lamp-lit"

let lit = false
let ready = false
const listeners = new Set<() => void>()

function read() {
  if (ready || typeof window === "undefined") return
  ready = true
  try {
    lit = sessionStorage.getItem(KEY) === "1"
  } catch {
    /* ignore */
  }
}

function subscribe(cb: () => void) {
  read()
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function snapshot() {
  read()
  return lit
}

export function setLamp(value: boolean) {
  read()
  lit = value
  try {
    sessionStorage.setItem(KEY, value ? "1" : "0")
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn())
}

export function useLamp(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, snapshot, () => false)
  return [value, setLamp]
}
