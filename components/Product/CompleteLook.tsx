"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { prefetchProduct } from "@/lib/productCache"
import { useFormatter, useLocale } from "next-intl"
import QuickAdd from "@/components/QuickAdd"
import { getEffectiveAvailability } from "@/lib/availability"
import type { ProductType } from "@/types/product"

/* ====================================================================
   COMPLÉTER LE LOOK (sous la fiche produit)
   Les produits choisis dans l'admin (fiche produit → « Complète le look »), un par un, qu'on fait défiler du doigt :
   la photo, une fine barre de progression, le nom, le prix et « Ajouter au panier ».
   ==================================================================== */

export default function CompleteLook({ products }: { products: ProductType[] }) {
  const fr = useLocale().startsWith("fr")
  const format = useFormatter()
  const track = useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = useState(0)
  const router = useRouter()
  const n = products.length

  // la photo touchée voyage jusqu'à la fiche (comme sur les cartes des rangées) ; sinon navigation normale
  const open = (e: React.MouseEvent<HTMLAnchorElement>, p: ProductType, path: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    try {
      const box = (e.currentTarget as HTMLElement).querySelector("[data-card-box]") as HTMLElement | null
      const img = box?.querySelector("img") as HTMLImageElement | null
      const shown = img?.currentSrc || img?.src
      const w = window as unknown as { __fysuHero?: (el: HTMLElement | null, p: string, src: string | null) => boolean }
      if (w.__fysuHero && box && shown && p.brand !== "thewave" && w.__fysuHero(box, path, shown)) return
    } catch {}
    const handled = (window as unknown as { __fysuNavigate?: (p: string) => boolean }).__fysuNavigate?.(path)
    if (!handled) router.push(path)
  }

  const onScroll = () => {
    const el = track.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setProgress(max > 0 ? Math.max(0, Math.min(1, el.scrollLeft / max)) : 0)
  }

  if (n === 0) return null

  return (
    <section className="mx-auto mt-24 w-11/12 max-w-md sm:mt-32" aria-label={fr ? "Compléter le look" : "Complete the look"}>
      <h2 className="font-info mb-6 text-center text-[11px] font-normal uppercase tracking-[0.14em]">
        {fr ? "Compléter le look" : "Complete the look"}
      </h2>

      <div ref={track} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
        {products.map((p) => {
          const imgs = ((p as any).product_images ?? []) as { url: string; worn_for?: string | null }[]
          const src = (imgs.find((i) => !i.worn_for) ?? imgs[0])?.url
          const buyable = getEffectiveAvailability(p as any) === "available"
          return (
            <div key={p.id} data-href={`/product/${p.slug}`} className="w-full flex-shrink-0 snap-start snap-always" onPointerDown={() => prefetchProduct(p.slug)}>
              <Link href={`/product/${p.slug}`} data-hero-link="" onClick={(e) => open(e, p, `/product/${p.slug}`)} draggable={false} className="block">
                <div data-card-box="" className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
                  {src && <Image src={src} alt={p.name} fill draggable={false} sizes="(max-width: 768px) 92vw, 448px" className="object-cover" />}
                </div>
              </Link>
              <div className="px-1 pt-4 text-center">
                <p className="text-[11px] uppercase tracking-wide">{p.name}</p>
                <p className="font-info mt-1 text-[11px] font-light opacity-70">
                  {format.number(Number(p.price), { style: "currency", currency: "EUR" })}
                </p>
              </div>
              <div className="mt-4">
                {buyable ? (
                  <QuickAdd product={p} inline />
                ) : (
                  <Link
                    href={`/product/${p.slug}`}
                    className="font-info block w-full border border-foreground/25 py-3 text-center text-[10px] uppercase tracking-[0.14em]"
                  >
                    {fr ? "Voir la fiche" : "View details"}
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* barre de progression des slides : fine, discrète */}
      {n > 1 && (
        <div className="mt-5 h-px w-full bg-foreground/15" aria-hidden="true">
          <div className="h-full bg-foreground/70" style={{ width: `${100 / n}%`, transform: `translateX(${progress * (n - 1) * 100}%)` }} />
        </div>
      )}
    </section>
  )
}
