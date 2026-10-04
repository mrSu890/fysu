"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useMusicCopy } from "@/lib/musicCopy"

/* ====================================================================
   PAGE D'ACCUEIL : « Explore The Universe »
   Une liste typographique : un grand mot par page, un trait fin entre chaque ligne.
   Kiban Collector, TheWave, FY'grances, Music, Arcade + Instagram.
   Une ligne disparaît si la page est masquée dans l'admin.
   ==================================================================== */

type Visibility = { kibanCollector: boolean; thewave: boolean; fygrances: boolean; music: boolean; arcade?: boolean }

const INSTAGRAM_URL = "https://www.instagram.com/fysustudios?stkn=czExZWs1MnE0dHpn"

type Row = { href: string; label: string; external?: boolean }

export default function HomeTiles() {
  const musicCopy = useMusicCopy()
  const [visible, setVisible] = useState<Visibility | null>(null)

  useEffect(() => {
    fetch("/api/collectionPages?visibility=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setVisible(
          d && typeof d === "object" && "thewave" in d
            ? (d as Visibility)
            : { kibanCollector: true, thewave: true, fygrances: true, music: true }
        )
      )
      .catch(() => setVisible({ kibanCollector: true, thewave: true, fygrances: true, music: true }))
  }, [])

  const rows: Row[] = []
  if (visible?.kibanCollector) rows.push({ href: "/kiban-collector", label: "Kiban Collector" })
  if (visible?.thewave) rows.push({ href: "/thewave", label: "TheWave" })
  if (visible?.fygrances) rows.push({ href: "/fygrances", label: "FY'grances" })
  if (visible?.music) rows.push({ href: "/music", label: musicCopy.musicTitle })
  if (visible && visible.arcade !== false) rows.push({ href: "/games", label: "Arcade" })
  if (visible) rows.push({ href: INSTAGRAM_URL, label: "Instagram", external: true })

  return (
    <section className="mx-auto w-11/12 max-w-5xl py-24 sm:py-40">
      <p className="text-[10px] font-light uppercase tracking-[0.4em] text-foreground/40 sm:text-xs">
        ( {String(rows.length || 0).padStart(2, "0")} )
      </p>
      <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-7xl">Explore The Universe</h2>

      <ul className="mt-14 min-h-[140px] border-t border-foreground/15 sm:mt-24">
        {rows.map((row, i) => {
          const inner = (
            <>
              <span className="w-10 shrink-0 text-[10px] font-light tracking-[0.3em] text-foreground/40 sm:w-16 sm:text-xs">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-2xl font-light tracking-tight transition-transform duration-500 group-hover:translate-x-2 sm:text-5xl">
                {row.label}
              </span>
              <span className="text-lg font-light text-foreground/40 transition-all duration-500 group-hover:translate-x-1 group-hover:text-foreground sm:text-2xl" aria-hidden="true">
                {row.external ? "↗" : "→"}
              </span>
            </>
          )
          const cls = "group flex items-baseline gap-2 border-b border-foreground/15 py-6 sm:py-9"
          return (
            <li key={row.href}>
              {row.external ? (
                <a href={row.href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {inner}
                </a>
              ) : (
                <Link href={row.href} className={cls}>
                  {inner}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
