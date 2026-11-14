"use client"

import { useEffect, useState } from "react"

/* Bouton « retour » d'un jeu : revient à la page d'où on est venu (ex. une collection, via ?from=…),
   et à la liste des jeux si on est arrivé autrement. */
export function useGameBack(): string {
  const [href, setHref] = useState("/games")
  useEffect(() => {
    try {
      const from = new URLSearchParams(window.location.search).get("from")
      if (from && from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/games")) setHref(from)
    } catch {}
  }, [])
  return href
}
