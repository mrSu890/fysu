"use client"

import { useEffect, useState } from "react"
import { useLocale } from "next-intl"
import { Star } from "lucide-react"

type R = { name: string; rating: number; text: string }

export default function ProductReviews({ productId }: { productId: number }) {
  const fr = useLocale() === "fr"
  const [d, setD] = useState<{ reviews: R[]; average: number; count: number } | null>(null)
  useEffect(() => { fetch(`/api/reviews?productId=${productId}`).then((r) => r.json()).then(setD).catch(() => {}) }, [productId])
  if (!d || d.count === 0) return null
  return (
    <section className="mx-auto mb-24 w-11/12 max-w-3xl border-t border-foreground/15 pt-10">
      <div className="flex items-baseline gap-4">
        <p className="text-[11px] font-light uppercase tracking-[0.22em]">{fr ? "Avis" : "Reviews"}</p>
        <p className="font-info text-sm font-light"><Star size={13} strokeWidth={1.3} className="mr-1 inline fill-current align-[-1px]" />{d.average.toFixed(1)} · {d.count}</p>
      </div>
      <ul className="mt-6 space-y-7">
        {d.reviews.slice(0, 6).map((r, i) => (
          <li key={i}>
            <div className="flex items-center gap-3">
              <span className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} strokeWidth={1.3} className={r.rating >= n ? "fill-current" : "opacity-30"} />)}</span>
              <span className="text-[11px] font-light uppercase tracking-[0.18em] text-foreground/55">{r.name}</span>
            </div>
            {r.text && <p className="mt-2 text-sm font-light leading-relaxed text-foreground/80">{r.text}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
