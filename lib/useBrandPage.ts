"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

/* ====================================================================
   Sur quelle « page de marque » est-on ? (The Wave, Kiban Collector)
   - les pages /thewave et /kiban-collector
   - les fiches produit de ces marques (elles posent data-brand sur <html>)
   ==================================================================== */

export type BrandPage = "thewave" | "kiban" | null

export function useBrandPage(): BrandPage {
  const pathname = usePathname()
  const [marked, setMarked] = useState<BrandPage>(null)

  useEffect(() => {
    const html = document.documentElement
    const read = () => {
      const v = html.getAttribute("data-brand")
      setMarked(v === "thewave" || v === "kiban" ? v : null)
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(html, { attributes: true, attributeFilter: ["data-brand"] })
    return () => observer.disconnect()
  }, [])

  if (pathname === "/thewave") return "thewave"
  if (pathname === "/kiban-collector") return "kiban"
  return marked
}
