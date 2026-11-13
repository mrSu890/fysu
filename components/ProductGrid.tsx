"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"
import { LayoutGroup, motion } from "framer-motion"
import Product from "@/components/Product"
import GridToggle, { useGridCols } from "@/components/GridToggle"
import { variantKey } from "@/lib/expandColors"
import type { ProductType } from "@/types/product"

/* ====================================================================
   GRILLE DE PRODUITS (pages For him, For her, collections)
   - en haut à gauche : les catégories (Tout + une par rangée)
   - en haut à droite : choix du nombre de produits par ligne (comme sur les collections)
   - les cartes sont les cartes habituelles (angulaires, nom et prix dessous)
   - l'adresse ?cat=<id> ouvre directement une catégorie (c'est ce que fait le menu)
   ==================================================================== */

export type GridGroup = { id: string; title: string; products: ProductType[] }

const ALL: Record<string, string> = { fr: "Tout", en: "All", nl: "Alles", ja: "すべて" }

export default function ProductGrid({ groups }: { groups: GridGroup[]; who?: "men" | "women" | null }) {
  const lang = useLocale().slice(0, 2)
  const params = useSearchParams()
  const initial = params.get("cat")
  const [cat, setCat] = useState<string>(initial && groups.some((g) => g.id === initial) ? initial : "all")
  const [gridCols, setGridCols] = useGridCols()

  const all = useMemo(() => {
    const seen = new Set<string>()
    const out: ProductType[] = []
    for (const g of groups)
      for (const p of g.products) {
        const k = variantKey(p as any)
        if (!seen.has(k)) {
          seen.add(k)
          out.push(p)
        }
      }
    return out
  }, [groups])

  const shown = cat === "all" ? all : groups.find((g) => g.id === cat)?.products ?? all
  const pick = (id: string) => {
    setCat(id)
    try {
      const u = new URL(window.location.href)
      if (id === "all") u.searchParams.delete("cat")
      else u.searchParams.set("cat", id)
      window.history.replaceState(window.history.state, "", u.toString())
    } catch {}
  }
  const chips = [
    { id: "all", title: ALL[lang] ?? ALL.en, n: all.length },
    ...(groups.length > 1 ? groups.map((g) => ({ id: g.id, title: g.title, n: g.products.length })) : []),
  ]

  return (
    <LayoutGroup>
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="flex items-center justify-between gap-4">
          <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 pb-1" role="tablist">
            {chips.length > 1 &&
              chips.map((c) => {
                const on = cat === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => pick(c.id)}
                    className={`relative shrink-0 cursor-pointer touch-manipulation whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] tracking-tight transition-colors ${on ? "text-foreground" : "text-foreground/65 hover:text-foreground"}`}
                  >
                    {on && <motion.span layoutId="grid-chip" className="absolute inset-0 rounded-full bg-foreground/[0.08]" transition={{ type: "spring", stiffness: 380, damping: 34 }} />}
                    <span className="relative">
                      {c.title}
                      <sup className="font-info ml-1 text-[8px] text-foreground/62">{c.n}</sup>
                    </span>
                  </button>
                )
              })}
          </div>
          <div className="shrink-0 [&>div]:mb-0">
            <GridToggle cols={gridCols} setCols={setGridCols} />
          </div>
        </div>

        <div className={`mt-6 grid ${gridCols === 1 ? "grid-cols-1" : "grid-cols-2"} gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4`}>
          {shown.map((p) => (
            <Product key={variantKey(p as any)} product={p} />
          ))}
        </div>
      </div>
    </LayoutGroup>
  )
}
