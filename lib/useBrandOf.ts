"use client"

import { useEffect, useState } from "react"

type BrandMap = { kiban: number[]; thewave: number[] }

// une seule requête par visite, partagée par toutes les cartes
let cache: Promise<BrandMap> | null = null
const load = () => {
  if (!cache) {
    cache = fetch("/api/brand-products")
      .then((r) => (r.ok ? (r.json() as Promise<BrandMap>) : { kiban: [], thewave: [] }))
      .catch(() => ({ kiban: [], thewave: [] }))
  }
  return cache
}

export type SubBrand = "kiban" | "thewave" | null

export function useBrandOf(productId: number, brand?: string | null): SubBrand {
  const direct: SubBrand = brand === "kiban" || brand === "thewave" ? brand : null
  const [found, setFound] = useState<SubBrand>(null)
  useEffect(() => {
    if (direct) return
    let alive = true
    load().then((m) => {
      if (!alive) return
      if (m.kiban.includes(productId)) setFound("kiban")
      else if (m.thewave.includes(productId)) setFound("thewave")
    })
    return () => {
      alive = false
    }
  }, [productId, direct])
  return direct ?? found
}
