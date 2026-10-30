"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useLocale } from "next-intl"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, X } from "lucide-react"
import { useCart } from "@/context/CartContext"
import { fetchProductCached } from "@/lib/productCache"
import type { ProductType } from "@/types/product"

/* Ajout rapide sur la carte : un petit « + » en bas à droite de la photo.
   Il ouvre un petit pop-up (même style que le pop-up de l'ambiance) avec l'essentiel :
   photo, nom, prix, couleur, taille, puis « Ajouter au panier » — et le panier s'ouvre tout seul. */

const copy = (locale: string) =>
  locale.startsWith("fr")
    ? {
        aria: "Ajout rapide",
        soldOut: "Épuisé",
        close: "Fermer",
        size: "Taille",
        color: "Couleur",
        add: "Ajouter au panier",
        pick: "Choisis une taille",
        pickColor: "Choisis une couleur",
        details: "Voir la fiche",
        loading: "Chargement…",
      }
    : {
        aria: "Quick add",
        soldOut: "Sold out",
        close: "Close",
        size: "Size",
        color: "Color",
        add: "Add to cart",
        pick: "Select a size",
        pickColor: "Select a color",
        details: "View details",
        loading: "Loading…",
      }

export default function QuickAdd({ product, inline = false }: { product: ProductType; inline?: boolean }) {
  const locale = useLocale()
  const c = copy(locale)
  const { addToCartWithFeedback, setIsCartOpen } = useCart()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [detail, setDetail] = useState<ProductType | null>(null)
  const [failed, setFailed] = useState(false)
  const [colorId, setColorId] = useState<string | null>(null)
  const [sizeId, setSizeId] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  // Échap ferme le pop-up
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // aucun des gestes sur ce bouton ne doit ouvrir la fiche ou faire glisser la carte
  // (les événements d'un portail remontent aussi par ici : c'est voulu)
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
  const preColor = product.variant_color ? colors.find((x) => x.hex.toLowerCase() === product.variant_color) ?? null : null
  const selColor =
    colors.find((x) => x.id === colorId) ?? preColor ?? (colors.length === 1 ? colors[0] : null)
  const needColor = colors.length > 1 && !selColor
  const sizes = (detail?.product_sizes ?? []).filter(
    (s) => s.is_active && (!selColor || !s.color_id || s.color_id === selColor.id)
  )
  const hasStock = (detail?.product_sizes ?? []).some((s) => s.is_active && s.stock > 0)
  const chosen = sizes.find((s) => s.id === sizeId && s.stock > 0) ?? null
  // une seule taille disponible : elle est déjà choisie
  const onlyOne = sizes.filter((s) => s.stock > 0).length === 1 ? sizes.find((s) => s.stock > 0)! : null
  const finalSize = chosen ?? onlyOne

  // photo : celle de la couleur choisie si elle existe, sinon la première
  const imgs = (detail?.product_images ?? product.product_images ?? []).filter((i) => !i.is_hover)
  const wantHex = (selColor?.hex ?? product.variant_color ?? "").toLowerCase()
  const photo = (wantHex && imgs.find((i) => (i.color ?? "").toLowerCase() === wantHex)) || imgs[0] || null

  const href = `/product/${product.slug}${selColor && colors.length > 1 ? `?color=${encodeURIComponent(selColor.hex.toLowerCase())}` : product.variant_color ? `?color=${encodeURIComponent(product.variant_color)}` : ""}`

  const addNow = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!detail || !finalSize || needColor) return
    const color =
      colors.length > 1 && selColor
        ? { name: selColor.name, hex: selColor.hex, imageUrl: photo?.url ?? product.product_images?.[0]?.url ?? null }
        : null
    addToCartWithFeedback(detail, finalSize.id, finalSize.size, 1500, color)
    setOpen(false)
    setSizeId(null)
    // le panier s'ouvre tout seul
    window.setTimeout(() => setIsCartOpen(true), 180)
  }

  const label = needColor ? c.pickColor : !finalSize ? c.pick : c.add
  const ready = !!finalSize && !needColor

  return (
    <div {...stop} className={inline ? "w-full" : "absolute bottom-3 right-3 z-20"}>
      {inline ? (
        <button
          type="button"
          onClick={openIt}
          className="font-info w-full cursor-pointer bg-foreground py-3 text-[10px] uppercase tracking-[0.14em] text-background transition active:opacity-80"
        >
          {c.add}
        </button>
      ) : (
        <button
          type="button"
          aria-label={c.aria}
          onClick={openIt}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/85 text-[18px] font-light leading-none text-black backdrop-blur-sm transition active:scale-90 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
        >
          +
        </button>
      )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                {/* fond léger : un toucher en dehors ferme le pop-up */}
                <motion.div
                  key="qa-bg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[8000] bg-black/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(false)
                  }}
                  aria-hidden="true"
                />
                <div className="pointer-events-none fixed inset-x-0 bottom-[calc(20px+env(safe-area-inset-bottom))] z-[8001] flex justify-center px-3">
                  <motion.div
                    key="qa-card"
                    role="dialog"
                    aria-label={product.name}
                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 18, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 240, damping: 26 }}
                    style={{ transformOrigin: "50% 100%" }}
                    className="liquid-glass pointer-events-auto relative w-[min(94vw,360px)] rounded-[28px] p-5 text-[var(--menu)]"
                  >
                    {/* en-tête : photo, nom, prix, fermer */}
                    <div className="flex items-start gap-3.5">
                      <div className="h-[84px] w-[64px] shrink-0 overflow-hidden rounded-2xl bg-white/20">
                        {photo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo.url} alt="" className="h-full w-full object-cover" draggable={false} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="font-info truncate text-[12px] font-light uppercase tracking-[0.06em]">{product.name}</p>
                        <p className="font-info mt-1 text-[11px] font-light uppercase tracking-[0.06em] opacity-70">{product.price} EUR</p>
                        {selColor && colors.length > 1 && (
                          <p className="font-info mt-1 text-[10px] font-light uppercase tracking-[0.06em] opacity-55">{selColor.name}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label={c.close}
                        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15"
                      >
                        <X size={12} strokeWidth={1.4} />
                      </button>
                    </div>

                    {!detail && !failed ? (
                      <p className="font-info mt-6 mb-2 text-center text-[11px] font-light uppercase tracking-[0.06em] opacity-55">{c.loading}</p>
                    ) : failed || !hasStock ? (
                      <p className="font-info mt-6 mb-2 text-center text-[11px] font-light uppercase tracking-[0.06em] opacity-60">{c.soldOut}</p>
                    ) : (
                      <>
                        {/* couleurs (seulement s'il y en a plusieurs à choisir) */}
                        {colors.length > 1 && (
                          <div className="mt-5">
                            <p className="font-info mb-2 text-[10px] font-light uppercase tracking-[0.06em] opacity-55">{c.color}</p>
                            <div className="flex flex-wrap gap-2.5">
                              {colors.map((col) => {
                                const on = selColor?.id === col.id
                                return (
                                  <button
                                    key={col.id}
                                    type="button"
                                    aria-label={col.name}
                                    title={col.name}
                                    aria-pressed={on}
                                    onClick={() => {
                                      setColorId(col.id)
                                      setSizeId(null)
                                    }}
                                    className={`h-7 w-7 cursor-pointer rounded-full border transition active:scale-90 ${on ? "border-current ring-1 ring-current ring-offset-2 ring-offset-transparent" : "border-current/25"}`}
                                    style={{
                                      background: col.image_url ? `center/cover url(${col.image_url})` : col.hex,
                                    }}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* tailles */}
                        <div className="mt-5">
                          <p className="font-info mb-2 text-[10px] font-light uppercase tracking-[0.06em] opacity-55">{c.size}</p>
                          <div className="flex flex-wrap gap-2">
                            {sizes.map((s) => {
                              const out = s.stock <= 0
                              const on = finalSize?.id === s.id
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  disabled={out}
                                  aria-pressed={on}
                                  onClick={() => setSizeId(s.id)}
                                  className={`font-info min-w-[2.75rem] cursor-pointer rounded-full border px-3.5 py-2 text-[11px] font-light uppercase tracking-[0.04em] transition active:scale-95 ${
                                    out
                                      ? "cursor-not-allowed border-current/15 line-through opacity-35"
                                      : on
                                        ? "border-current bg-white/30 opacity-100"
                                        : "border-current/25 opacity-75"
                                  }`}
                                >
                                  {s.size}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* ajouter au panier */}
                        <button
                          type="button"
                          onClick={addNow}
                          disabled={!ready}
                          className="font-info mt-5 w-full cursor-pointer rounded-full bg-white py-3 text-[11px] font-normal uppercase tracking-[0.12em] text-black transition active:scale-[0.98] disabled:cursor-default disabled:opacity-60"
                        >
                          {label}
                        </button>
                      </>
                    )}

                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className="font-info mt-4 flex items-center justify-center gap-1 text-[10px] font-light uppercase tracking-[0.06em] opacity-70"
                    >
                      {c.details} <ArrowUpRight size={12} strokeWidth={1.4} />
                    </Link>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}
