"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { PCopy } from "./profileCopy"

type Piece = { id: number; name: string; slug: string | null; image: string | null; qty: number }

/* Garde-robe : les pièces déjà achetées, tirées des commandes. */
export default function Closet({ copy }: { copy: PCopy; accent?: string }) {
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
          let items: any[] = []
          try {
            items = typeof o.items === "string" ? JSON.parse(o.items) : Array.isArray(o.items) ? o.items : []
          } catch {}
          for (const it of items) {
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

  if (pieces === null) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse bg-foreground/5" />
        ))}
      </div>
    )
  }

  if (pieces.length === 0) {
    return <p className="border-t border-foreground/15 pt-6 text-sm font-light text-foreground/55">{copy.closetEmpty}</p>
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {pieces.map((p) => {
        const card = (
          <div className="group">
            <div className="relative aspect-[3/4] overflow-hidden bg-foreground/5">
              {p.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={p.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
              )}
            </div>
            <p className="mt-3 truncate text-[11px] font-light uppercase tracking-[0.16em]">
              {p.name}
              {p.qty > 1 && <span className="ml-2 text-foreground/50">×{p.qty}</span>}
            </p>
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
  )
}
