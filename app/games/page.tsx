"use client"

import Link from "next/link"
import { useLocale } from "next-intl"
import { ArrowRight } from "lucide-react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { GAMES, gamesCopyFor } from "@/lib/games"

/* ====================================================================
   JEUX D'ARCADE : la liste des jeux (pour l'instant FYSU Bird)
   ==================================================================== */

export default function GamesPage() {
  const copy = gamesCopyFor(useLocale())

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[70svh] w-11/12 max-w-3xl pb-44 pt-28 sm:pt-36">
        <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-3 max-w-md text-sm opacity-70">{copy.intro}</p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {GAMES.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/games/${g.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-[#bcd9ee]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.cover}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.image}
                  alt=""
                  className="absolute left-1/2 top-[30%] w-32 -translate-x-1/2 drop-shadow-lg"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-5 pt-16 text-white">
                  <span className="block text-xl font-semibold">{g.name}</span>
                  <span className="mt-1 block text-xs opacity-85">{copy.reward}</span>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black">
                    {copy.play}
                    <ArrowRight size={15} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-xs opacity-55">{copy.offlineHint}</p>
      </main>
      <Footer />
    </>
  )
}
