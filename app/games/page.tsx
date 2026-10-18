"use client"

import Link from "next/link"
import { useLayoutEffect, useEffect, useState } from "react"
import { useLocale } from "next-intl"
import Navbar from "@/components/Navbar"
import { GAMES, REWARD_PERCENT, REWARD_SCORE, bestKey, gameTextFor, gamesCopyFor } from "@/lib/games"

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

function GameIcon({ slug }: { slug: string }) {
  const box = { width: 84, height: 84, borderRadius: 19, boxShadow: `0 0 0 2px ${YELLOW}` }
  return (
    <svg viewBox="0 0 84 84" className="shrink-0" style={box} aria-hidden>
      {slug === "fysu-pool" && (
        <>
          <rect width="84" height="84" fill="#0f6b43" />
          <circle cx="12" cy="12" r="9" fill="#000" />
          <circle cx="72" cy="72" r="9" fill="#000" />
          <circle cx="30" cy="60" r="9" fill="#fff" />
          <circle cx="50" cy="38" r="8" fill={YELLOW} />
          <circle cx="62" cy="26" r="8" fill={PINK} />
          <path d="M30 60 L8 82" stroke={YELLOW} strokeWidth="4" />
        </>
      )}
      {slug === "fysu-hoops" && (
        <>
          <rect width="84" height="84" fill="#0b0f24" />
          <rect x="60" y="8" width="8" height="40" fill="#fff" />
          <path d="M22 34 H58" stroke={ORANGE} strokeWidth="5" />
          <path d="M24 36 L32 54 M36 36 L38 54 M48 36 L46 54 M56 36 L50 54" stroke="#fff" strokeWidth="1.5" />
          <circle cx="40" cy="20" r="10" fill="#e8601c" stroke="#2a1005" strokeWidth="2" />
          <circle cx="16" cy="68" r="10" fill="#e8601c" stroke="#2a1005" strokeWidth="2" />
        </>
      )}
      {slug === "fysu-crossing" && (
        <>
          <rect width="84" height="84" fill="#26282f" />
          <rect y="0" width="84" height="18" fill="#1d7540" />
          <path d="M0 42 H84" stroke="#fff" strokeWidth="2" strokeDasharray="10 8" />
          <rect x="8" y="22" width="34" height="16" fill={ORANGE} />
          <rect x="46" y="48" width="30" height="16" fill={CYAN} />
          <rect x="34" y="62" width="10" height="14" fill={YELLOW} />
          <circle cx="39" cy="58" r="5" fill="#f2c9a0" />
        </>
      )}
      {slug === "fysu-slice" && (
        <>
          <rect width="84" height="84" fill="#14082e" />
          <g transform="translate(42 44)">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <ellipse key={i} cx="16" cy="0" rx="11" ry="8" fill={PINK} transform={`rotate(${i * 60})`} />
            ))}
            <circle r="8" fill={YELLOW} />
          </g>
          <path d="M6 76 L78 10" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

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
  const locale = useLocale()
  const [bests, setBests] = useState<Record<string, number>>({})

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
    const out: Record<string, number> = {}
    for (const g of GAMES) {
      try {
        out[g.slug] = Number(localStorage.getItem(bestKey(g.slug))) || 0
      } catch {}
    }
    setBests(out)
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
                {g.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.image}
                    alt=""
                    width={84}
                    height={84}
                    className="shrink-0"
                    style={{ width: 84, height: 84, borderRadius: 19, imageRendering: "pixelated", boxShadow: `0 0 0 2px ${YELLOW}` }}
                  />
                ) : (
                  <GameIcon slug={g.slug} />
                )}
                <div>
                  <h2 style={{ fontFamily: PIXEL, color: "#fff", fontSize: 16, lineHeight: 1.6 }}>{g.name.toUpperCase()}</h2>
                  <p style={{ fontFamily: TERM, color: GREEN, fontSize: 20, letterSpacing: "0.1em" }}>1 PLAYER</p>
                </div>
              </div>
              {!g.reward && (
                <p className="px-4 pb-4 sm:px-6" style={{ fontFamily: TERM, color: "#bdbdbd", fontSize: 20, letterSpacing: "0.06em" }}>
                  {gameTextFor(g.slug, locale).tag}
                </p>
              )}

              <Row label={copy.highScore} value={String(bests[g.slug] ?? 0).padStart(3, "0")} color={YELLOW} />
              {g.reward && <Row label={copy.goalLabel} value={`${REWARD_SCORE} PTS`} color={PINK} />}
              {g.reward && <Row label={copy.rewardLabel} value={`−${REWARD_PERCENT} %`} color={ORANGE} />}
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
