"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { Check, X } from "lucide-react"
import { useCart } from "@/context/CartContext"
import { fetchProductCached } from "@/lib/productCache"
import type { ProductType } from "@/types/product"

/* Ajout rapide sur la carte : un petit « + » en bas à droite de la photo.
   Il ouvre une bande avec les tailles ; un toucher sur une taille ajoute au panier, sans ouvrir la fiche. */

const copy = (locale: string) =>
  locale.startsWith("fr")
    ? { aria: "Ajout rapide", added: "Ajouté", soldOut: "Épuisé", close: "Fermer" }
    : { aria: "Quick add", added: "Added", soldOut: "Sold out", close: "Close" }

export default function QuickAdd({ product }: { product: ProductType }) {
  const locale = useLocale()
  const c = copy(locale)
  const { addToCartWithFeedback } = useCart()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<ProductType | null>(null)
  const [failed, setFailed] = useState(false)
  const [added, setAdded] = useState(false)

  // aucun des gestes sur ce bouton ne doit ouvrir la fiche ou faire glisser la carte
  const stop = {
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onPointerUp: (e: React.PointerEvent) => e.stopPropagation(),
    onPointerCancel: (e: React.PointerEvent) => e.stopPropagation(),
  }

  const openIt = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setOpen(true)
    if (!detail) {
      fetchProductCached(product.slug)
        .then(setDetail)
        .catch(() => setFailed(true))
    }
  }

  const colors = detail?.product_colors ?? []
  const selColor = product.variant_color
    ? colors.find((x) => x.hex.toLowerCase() === product.variant_color) ?? null
    : colors.length === 1
      ? colors[0]
      : null
  const sizes = (detail?.product_sizes ?? []).filter(
    (s) => s.is_active && (!selColor || !s.color_id || s.color_id === selColor.id)
  )
  const hasStock = sizes.some((s) => s.stock > 0)

  const pick = (e: React.MouseEvent, id: string, label: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!detail) return
    const color =
      colors.length > 1 && selColor
        ? { name: selColor.name, hex: selColor.hex, imageUrl: product.product_images?.[0]?.url ?? null }
        : null
    addToCartWithFeedback(detail, id, label, 1500, color)
    setAdded(true)
    window.setTimeout(() => {
      setAdded(false)
      setOpen(false)
    }, 1100)
  }

  return (
    <div {...stop} className="absolute bottom-3 right-3 z-20">
      {!open ? (
        <button
          type="button"
          aria-label={c.aria}
          onClick={openIt}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/85 text-[18px] font-light leading-none text-black backdrop-blur-sm transition active:scale-90 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          +
        </button>
      ) : null}

      {open && (
        <div
          {...stop}
          className="absolute bottom-[-0.75rem] right-[-0.75rem] flex min-w-[9rem] max-w-[calc(100vw-3rem)] items-center gap-2 rounded-full bg-white/90 py-1.5 pl-3 pr-1.5 text-black backdrop-blur-md"
          style={{ boxShadow: "0 4px 18px rgba(0,0,0,0.12)" }}
        >
          {added ? (
            <span className="font-info flex flex-1 items-center gap-1.5 py-1 text-[11px] uppercase tracking-[0.12em]">
              <Check size={13} /> {c.added}
            </span>
          ) : !detail && !failed ? (
            <span className="font-info flex-1 py-1 text-[11px] opacity-50">…</span>
          ) : failed || !hasStock ? (
            <span className="font-info flex-1 py-1 text-[11px] uppercase tracking-[0.12em] opacity-60">{c.soldOut}</span>
          ) : (
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {sizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={s.stock <= 0}
                  onClick={(e) => pick(e, s.id, s.size)}
                  className={`font-info min-w-[2rem] cursor-pointer rounded-full px-2 py-1 text-[11px] transition active:scale-90 ${
                    s.stock <= 0 ? "cursor-not-allowed text-black/30 line-through" : "text-black hover:bg-black hover:text-white"
                  }`}
                >
                  {s.size}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            aria-label={c.close}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setOpen(false)
            }}
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/[0.06]"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
