"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import Product from "@/components/Product"
import SectionTitle from "@/components/SectionTitle"
import Fold from "@/components/Home/Fold"
import ViewToggle from "@/components/ViewToggle"
import { readRecent } from "@/lib/recentlyViewed"
import type { ProductType } from "@/types/product"

/* Rangée « Récemment consulté » : les produits que le visiteur a vus, même style que les rangées de l'accueil.
   N'apparaît pas tant qu'il n'a rien consulté. */

export default function RecentlyViewed({
  excludeSlug,
  className = "",
  bare = false,
}: {
  excludeSlug?: string
  className?: string
  bare?: boolean // sans titre ni pli : juste la rangée (utilisé sous les onglets de la fiche produit)
}) {
  const fr = useLocale().startsWith("fr")
  const [items, setItems] = useState<ProductType[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setItems(readRecent(excludeSlug).slice(0, 6))
  }, [excludeSlug])

  if (items.length === 0) {
    return bare ? (
      <p className="font-info w-11/12 mx-auto text-[11px] font-light uppercase tracking-[0.12em] opacity-50">
        {fr ? "Rien consulté pour l'instant" : "Nothing viewed yet"}
      </p>
    ) : null
  }

  if (bare) {
    return (
      <div className={`relative mx-auto w-11/12 ${className}`}>
        <div className="mb-3 flex justify-end">
          <ViewToggle products={items} />
        </div>
        <div
          ref={scrollRef}
          className="no-scrollbar flex gap-6 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth pb-2"
        >
          {items.map((product) => (
            <div key={product.slug} className="w-[220px] flex-shrink-0 snap-start sm:w-[260px] md:w-[300px] lg:w-[320px]">
              <Product showArrows reveal product={product} scrollRef={scrollRef} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className={`relative mx-auto w-11/12 ${className}`}>
      <Fold
        defaultOpen={false}
        label={fr ? "Récemment consulté" : "Recently viewed"}
        meta={`( ${String(items.length).padStart(2, "0")} )`}
        header={
          <SectionTitle lineAbove className="text-[28px] font-extrabold leading-none tracking-[-0.045em] sm:text-[44px]">
            {fr ? "Récemment consulté" : "Recently viewed"}
          </SectionTitle>
        }
      >
        <div className="mb-3 flex justify-end">
          <ViewToggle products={items} />
        </div>
        <div
          ref={scrollRef}
          className="no-scrollbar flex gap-6 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth pb-2"
        >
          {items.map((product) => (
            <div key={product.slug} className="w-[220px] flex-shrink-0 snap-start sm:w-[260px] md:w-[300px] lg:w-[320px]">
              <Product showArrows reveal product={product} scrollRef={scrollRef} />
            </div>
          ))}
        </div>
      </Fold>
    </section>
  )
}
