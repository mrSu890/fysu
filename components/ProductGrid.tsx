"use client"

import { useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"
import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import { prefetchProduct } from "@/lib/productCache"
import { getAvailabilityCopy, getBadgeText, getEffectiveAvailability } from "@/lib/availability"
import type { ProductType } from "@/types/product"

/* ====================================================================
   GRILLE DE PRODUITS (pages For him, For her…)
   - en haut à gauche : les catégories (toutes + une par rangée), le nombre de pièces à côté
   - en haut à droite : le nombre de pièces affichées
   - les cartes : image plein cadre, coins arrondis, nom et prix en bas ; elles se réarrangent en douceur quand on change de catégorie
   - l'adresse ?cat=<id> ouvre directement une catégorie (c'est ce que fait le menu)
   RÉGLAGES : COLS = colonnes (téléphone / tablette / ordinateur)
   ==================================================================== */

export type GridGroup = { id: string; title: string; products: ProductType[] }

const PIECES: Record<string, [string, string]> = {
  fr: ["pièce", "pièces"],
  en: ["piece", "pieces"],
  nl: ["stuk", "stuks"],
  ja: ["点", "点"],
}
const ALL: Record<string, string> = { fr: "Tout", en: "All", nl: "Alles", ja: "すべて" }

function Card({ product, who }: { product: ProductType; who: "men" | "women" | null }) {
  const router = useRouter()
  const imgs = ((product as any).product_images ?? []) as { url: string; worn_for?: string | null }[]
  const src = (imgs.find((i) => !i.worn_for) ?? imgs[0])?.url
  const path = `/product/${product.slug}`
  const boxRef = useRef<HTMLDivElement>(null)
  const locale = useLocale()
  const mode = getEffectiveAvailability(product as any)
  // épuisé ou à venir : photo floutée (la fiche s'ouvre quand même)
  const blurred = mode === "sold_out" || mode === "coming_soon"
  const status = blurred ? getBadgeText(mode, getAvailabilityCopy(locale)) : null
  const go = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    try {
      if (who) sessionStorage.setItem("fysu-who", who)
      else sessionStorage.removeItem("fysu-who")
    } catch {}
    try {
      const w = window as any
      const el = boxRef.current?.querySelector("img") as HTMLImageElement | null
      const shown = el?.currentSrc || el?.src
      if (!blurred && w.__fysuHero && shown && product.brand !== "thewave" && w.__fysuHero(boxRef.current, path, shown)) return
    } catch {}
    const handled = (window as any).__fysuNavigate?.(path)
    if (!handled) router.push(path)
  }
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      data-href={path}
      onPointerEnter={() => prefetchProduct(product.slug)}
      onPointerDown={() => prefetchProduct(product.slug)}
    >
      <Link href={path} onClick={go} data-hero-link="" aria-label={product.name} draggable={false} className="block">
        <div ref={boxRef} data-card-box="" className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-200 transition active:scale-[0.98] dark:bg-neutral-800 sm:rounded-3xl">
          {src && <Image src={src} alt="" fill draggable={false} sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw" className={`object-cover ${blurred ? "scale-110 blur-2xl" : ""}`} />}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/55 via-black/20 to-transparent px-3.5 pb-3 pt-12 text-white sm:px-4 sm:pb-4">
            <p className="truncate text-[13px] font-medium tracking-tight sm:text-sm">{product.name}</p>
            <p className="font-info mt-0.5 text-[10px] tracking-[0.12em] text-white/75">{status ?? `${Number(product.price).toFixed(0)} €`}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function ProductGrid({ groups, who }: { groups: GridGroup[]; who: "men" | "women" | null }) {
  const lang = useLocale().slice(0, 2)
  const params = useSearchParams()
  const initial = params.get("cat")
  const [cat, setCat] = useState<string>(initial && groups.some((g) => g.id === initial) ? initial : "all")

  const all = useMemo(() => {
    const seen = new Set<number>()
    const out: ProductType[] = []
    for (const g of groups) for (const p of g.products) if (!seen.has(p.id as number)) { seen.add(p.id as number); out.push(p) }
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
  const pcs = PIECES[lang] ?? PIECES.en
  const chips = [{ id: "all", title: ALL[lang] ?? ALL.en, n: all.length }, ...(groups.length > 1 ? groups.map((g) => ({ id: g.id, title: g.title, n: g.products.length })) : [])]

  return (
    <LayoutGroup>
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="flex items-start justify-between gap-6">
          <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 pb-1" role="tablist">
            {chips.map((c) => {
              const on = cat === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => pick(c.id)}
                  className={`relative shrink-0 cursor-pointer touch-manipulation whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] tracking-tight transition-colors ${on ? "text-foreground" : "text-foreground/50 hover:text-foreground"}`}
                >
                  {on && <motion.span layoutId="grid-chip" className="absolute inset-0 rounded-full bg-foreground/[0.08]" transition={{ type: "spring", stiffness: 380, damping: 34 }} />}
                  <span className="relative">
                    {c.title}
                    <sup className="font-info ml-1 text-[8px] text-foreground/45">{c.n}</sup>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="shrink-0 text-right leading-none">
            <span className="text-[34px] font-extralight tracking-tight tabular-nums sm:text-[44px]">{String(shown.length).padStart(2, "0")}</span>
            <span className="font-info ml-1 align-top text-[9px] uppercase tracking-[0.18em] text-foreground/45">{shown.length === 1 ? pcs[0] : pcs[1]}</span>
          </p>
        </div>

        <motion.div layout className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((p) => (
              <Card key={String(p.id)} product={p} who={who} />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </LayoutGroup>
  )
}
