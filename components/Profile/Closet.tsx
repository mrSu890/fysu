"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { PCopy } from "./profileCopy"

type Piece = { id: number; name: string; slug: string | null; image: string | null; qty: number }

/* Garde-robe : les pièces déjà achetées, tirées des commandes. */
export default function Closet({ copy, accent }: { copy: PCopy; accent: string }) {
  const [pieces, setPieces] = useState<Piece[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/getUserOrders", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((json) => {
        if (cancelled) return
        const map = new Map<number, Piece>()
        for (const o of json?.orders ?? []) {
          if (["pending", "canceled", "cancelled", "failed", "refunded"].includes(String(o.status ?? "").toLowerCase())) continue
          for (const it of Array.isArray(o.items) ? o.items : []) {
            const p = it?.product
            if (!p?.id) continue
            const qty = Math.max(1, Number(it.quantity) || 1)
            const prev = map.get(p.id)
            if (prev) prev.qty += qty
            else {
              const imgs: any[] = p.product_images ?? []
              const img = imgs.find((i) => i.color === it.color) ?? imgs[0]
              map.set(p.id, { id: p.id, name: p.name, slug: p.slug ?? null, image: img?.url ?? null, qty })
            }
          }
        }
        setPieces(Array.from(map.values()))
      })
      .catch(() => !cancelled && setPieces([]))
    return () => {
      cancelled = true
    }
  }, [])

  const total = (pieces ?? []).reduce((n, p) => n + p.qty, 0)

  return (
    <section className="mx-auto w-11/12 max-w-7xl py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-dior text-2xl">{copy.closet}</h2>
          <p className="mt-1 text-sm text-foreground/60">{copy.closetIntro}</p>
        </div>
        {pieces && pieces.length > 0 && (
          <span className="shrink-0 rounded-full px-3 py-1 text-sm text-white" style={{ background: accent }}>
            {copy.closetPieces(total)}
          </span>
        )}
      </div>

      {pieces === null ? (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-foreground/10" />
          ))}
        </div>
      ) : pieces.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-foreground/25 px-6 py-10 text-center text-sm text-foreground/60">
          {copy.closetEmpty}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {pieces.map((p) => {
            const card = (
              <div className="group">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-foreground/10">
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  )}
                  {p.qty > 1 && (
                    <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">×{p.qty}</span>
                  )}
                </div>
                <p className="mt-2 truncate text-sm">{p.name}</p>
              </div>
            )
            return p.slug ? (
              <Link key={p.id} href={`/product/${p.slug}`}>
                {card}
              </Link>
            ) : (
              <div key={p.id}>{card}</div>
            )
          })}
        </div>
      )}
    </section>
  )
}
