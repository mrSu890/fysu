"use client"

import Link from "next/link"
import { useLayoutEffect, useEffect, useState } from "react"
import { useLocale } from "next-intl"
import Navbar from "@/components/Navbar"
import { GAMES, REWARD_PERCENT, REWARD_SCORE, gamesCopyFor } from "@/lib/games"

/* ====================================================================
   JEUX D'ARCADE : style borne d'arcade / terminal des années 70-80
   Fond noir, textes et lignes de couleur, police « informatique ».
   Cette page n'a pas de mode clair / sombre : toujours noire.
   Pour changer les couleurs, modifie les 5 lignes ci-dessous.
   ==================================================================== */

const CYAN = "#3fd0ff"
const ORANGE = "#ff5a36"
const YELLOW = "#ffd23f"
const PINK = "#ff3d9a"
const GREEN = "#39ff88"

const PIXEL = `"Press Start 2P", "VT323", ui-monospace, "SF Mono", Menlo, Consolas, monospace`
const TERM = `"VT323", ui-monospace, "SF Mono", Menlo, Consolas, monospace`

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 border-t px-4 py-3"
      style={{ borderColor: CYAN, fontFamily: TERM, fontSize: 22, letterSpacing: "0.12em" }}
    >
      <span style={{ color: CYAN }}>{label}</span>
      <span style={{ color }} className="text-right">
        {value}
      </span>
    </div>
  )
}

export default function GamesPage() {
  const copy = gamesCopyFor(useLocale())
  const [best, setBest] = useState(0)

  // page toujours noire, sans mode clair / sombre
  useLayoutEffect(() => {
    const html = document.documentElement
    html.classList.add("dark", "arcade-page")
    return () => {
      html.classList.remove("arcade-page")
      let saved: string | null = null
      try {
        saved = localStorage.getItem("theme")
      } catch {}
      if (saved !== "dark") html.classList.remove("dark")
    }
  }, [])

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem("fysu-bird-best")) || 0)
    } catch {}
  }, [])

  return (
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap");
        html.arcade-page { background: #000; }
        html.arcade-page body { background: #000 !important; color: #fff; }
        html.arcade-page .bg-background { background-color: transparent !important; }
        @keyframes arcade-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
        .arcade-cursor { animation: arcade-blink 1s steps(1) infinite; }
        .arcade-scan {
          background: repeating-linear-gradient(to bottom, rgba(255,255,255,0.045) 0, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 3px);
        }
        .arcade-start:active { transform: translateY(2px); }
      `}</style>

      <Navbar />

      <div className="arcade-scan pointer-events-none fixed inset-0" style={{ zIndex: 5 }} />

      <main className="relative mx-auto min-h-[100svh] w-11/12 max-w-2xl pb-40 pt-28 sm:pt-36" style={{ zIndex: 6 }}>
        {/* titre */}
        <div className="border px-4 py-6 sm:px-6" style={{ borderColor: ORANGE }}>
          <h1
            style={{ fontFamily: PIXEL, color: CYAN, fontSize: "clamp(20px, 6vw, 34px)", lineHeight: 1.5, textShadow: `3px 3px 0 ${PINK}` }}
          >
            {">"} ARCADE<span className="arcade-cursor">_</span>
          </h1>
          <p className="mt-4" style={{ fontFamily: TERM, color: ORANGE, fontSize: 24, letterSpacing: "0.14em" }}>
            {copy.insertCoin}
          </p>
          <p className="mt-2 max-w-md" style={{ fontFamily: TERM, color: "#bdbdbd", fontSize: 20, letterSpacing: "0.06em" }}>
            {copy.intro}
          </p>
        </div>

        {/* jeux */}
        <ul className="mt-8 space-y-8">
          {GAMES.map((g) => (
            <li key={g.slug} className="border" style={{ borderColor: CYAN }}>
              <div className="flex items-center gap-5 px-4 py-5 sm:px-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.image}
                  alt=""
                  width={84}
                  height={84}
                  className="shrink-0"
                  style={{ width: 84, height: 84, borderRadius: 19, imageRendering: "pixelated", boxShadow: `0 0 0 2px ${YELLOW}` }}
                />
                <div>
                  <h2 style={{ fontFamily: PIXEL, color: "#fff", fontSize: 16, lineHeight: 1.6 }}>{g.name.toUpperCase()}</h2>
                  <p style={{ fontFamily: TERM, color: GREEN, fontSize: 20, letterSpacing: "0.1em" }}>1 PLAYER</p>
                </div>
              </div>

              <Row label={copy.highScore} value={String(best).padStart(3, "0")} color={YELLOW} />
              <Row label={copy.goalLabel} value={`${REWARD_SCORE} PTS`} color={PINK} />
              <Row label={copy.rewardLabel} value={`−${REWARD_PERCENT} %`} color={ORANGE} />
              <Row label={copy.offlineLabel} value={copy.offlineValue} color={GREEN} />

              <Link
                href={`/games/${g.slug}`}
                className="arcade-start block border-t px-4 py-4 text-center transition hover:bg-[#ffd23f] hover:text-black"
                style={{ borderColor: CYAN, fontFamily: PIXEL, color: YELLOW, fontSize: 14, letterSpacing: "0.08em" }}
              >
                ▶ {copy.pressStart}
              </Link>
            </li>
          ))}

          {/* emplacement des futurs jeux */}
          <li
            className="border border-dashed px-4 py-8 text-center"
            style={{ borderColor: "#555", color: "#777", fontFamily: TERM, fontSize: 22, letterSpacing: "0.16em" }}
          >
            {copy.player2} — {copy.comingSoon}
          </li>
        </ul>

        <p className="mt-10 text-center" style={{ fontFamily: TERM, color: "#555", fontSize: 18, letterSpacing: "0.16em" }}>
          © FYSU — INSERT COIN
        </p>
      </main>
    </>
  )
}
