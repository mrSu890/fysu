"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useMusicCopy } from "@/lib/musicCopy"
import CountUp from "@/components/CountUp"
import SectionTitle from "@/components/SectionTitle"

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
      <p className="text-[10px] font-light uppercase tracking-[0.4em] sm:text-xs">
        <CountUp value={rows.length} prefix="( " suffix=" )" />
      </p>
      <div className="mt-3">
        <SectionTitle className="text-4xl font-bold tracking-tight sm:text-7xl" lineClassName="!opacity-25">Explore The Universe</SectionTitle>
      </div>

      <ul className="-mx-3 mt-12 min-h-[140px] border-t border-foreground/15 sm:-mx-5 sm:mt-20">
        {rows.map((row, i) => {
          const inner = (
            <>
              <span className="w-8 shrink-0 text-[9px] font-light tracking-[0.3em] sm:w-14 sm:text-[11px]">
                <CountUp value={i + 1} />
              </span>
              <span className="font-info flex-1 text-base font-light transition-transform duration-500 group-hover:translate-x-1.5 sm:text-2xl">
                {row.label}
              </span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 self-center text-foreground/40 transition-all duration-500 group-hover:translate-x-1 group-hover:text-white sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {row.external ? <path d="M7 17L17 7M9 7h8v8" /> : <path d="M4 12h16M14 6l6 6-6 6" />}
              </svg>
            </>
          )
          // au survol (ou au toucher) la ligne devient verte d'un coup, puis reprend sa couleur doucement quand on la quitte
          const cls =
            "group flex items-center gap-2 border-b border-foreground/15 px-3 py-4 transition-[background-color,color] duration-[900ms] ease-out hover:bg-[#154733] hover:text-white hover:duration-150 active:bg-[#154733] active:text-white active:duration-100 sm:px-5 sm:py-6"
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
