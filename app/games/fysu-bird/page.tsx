"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { ArrowLeft, Check, Copy } from "lucide-react"
import FysuBirdGame from "@/components/FysuBirdGame"
import { REWARD_SCORE, gamesCopyFor } from "@/lib/games"

/* ====================================================================
   FYSU BIRD : page du jeu (plein écran)
   - une partie commence : on demande un jeton au serveur (joueur connecté)
   - une partie finit : on envoie le score ; si l'objectif est atteint,
     le serveur crée un code −10 % unique, affiché ici
   ==================================================================== */

type Reward = { code: string; percent: number }

const TERM = '"VT323", ui-monospace, "SF Mono", Menlo, Consolas, monospace'

export default function FysuBirdPage() {
  const copy = gamesCopyFor(useLocale())
  const token = useRef<string | null>(null)
  const [reward, setReward] = useState<Reward | null>(null)
  const rewardRef = useRef<Reward | null>(null)
  const [fresh, setFresh] = useState(false) // code gagné à l'instant
  const [needLogin, setNeedLogin] = useState(false)
  const [copied, setCopied] = useState(false)

  // pas de défilement derrière le jeu + jeu hors-ligne
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("/games-sw.js").catch(() => {})
    }
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const onStart = useCallback(() => {
    token.current = null
    fetch("/api/games/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: "fysu-bird" }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        token.current = d.token ?? null
        if (d.reward) {
          rewardRef.current = d.reward
          setReward(d.reward)
        }
      })
      .catch(() => {})
  }, [])

  const onOver = useCallback((score: number) => {
    const t = token.current
    token.current = null

    if (!t) {
      // pas connecté (ou hors-ligne) : on invite à se connecter si l'objectif est atteint
      if (score >= REWARD_SCORE && navigator.onLine) setNeedLogin(true)
      return
    }

    fetch("/api/games/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: "fysu-bird", score, token: t }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.reward?.code) {
          if (!rewardRef.current && !d.already) setFresh(true)
          rewardRef.current = d.reward
          setReward(d.reward)
        }
      })
      .catch(() => {})
  }, [])

  async function copyCode() {
    if (!reward) return
    try {
      await navigator.clipboard.writeText(reward.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black" style={{ zIndex: 45 }}>
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap");`}</style>
      <FysuBirdGame copy={copy} onStart={onStart} onOver={onOver} />

      {/* retour : gros bouton facile à repérer */}
      <Link
        href="/games"
        className="absolute left-4 top-4 flex items-center gap-2 border-2 bg-black px-4 py-3 active:translate-y-0.5"
        style={{
          zIndex: 50,
          marginTop: "env(safe-area-inset-top)",
          borderColor: "#3fd0ff",
          color: "#3fd0ff",
          fontFamily: '"Press Start 2P", "VT323", ui-monospace, monospace',
          fontSize: 12,
        }}
      >
        <ArrowLeft size={16} />
        {copy.back.toUpperCase()}
      </Link>

      {/* code gagné (ou déjà gagné) */}
      {reward && (
        <div
          className="absolute left-1/2 w-[min(92vw,380px)] -translate-x-1/2 border-2 bg-black p-4 text-center"
          style={{ zIndex: 50, bottom: "calc(90px + env(safe-area-inset-bottom))", borderColor: "#ffd23f", fontFamily: TERM }}
        >
          <p style={{ color: "#3fd0ff", fontSize: 20, letterSpacing: "0.1em" }}>{fresh ? copy.yourCode : copy.alreadyWon}</p>
          <button
            type="button"
            onClick={copyCode}
            className="mt-2 inline-flex items-center gap-2 border-2 px-4 py-2 active:translate-y-0.5"
            style={{ borderColor: "#ff5a36", color: "#ffd23f", fontSize: 26, letterSpacing: "0.18em" }}
          >
            {reward.code}
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
          <p className="mt-2" style={{ color: "#bdbdbd", fontSize: 17 }}>{copied ? copy.copied : copy.codeHint}</p>
        </div>
      )}

      {/* objectif atteint sans être connecté */}
      {!reward && needLogin && (
        <div
          className="absolute left-1/2 w-[min(92vw,380px)] -translate-x-1/2 border-2 bg-black p-4 text-center"
          style={{ zIndex: 50, bottom: "calc(90px + env(safe-area-inset-bottom))", borderColor: "#ffd23f", fontFamily: TERM }}
        >
          <p style={{ color: "#3fd0ff", fontSize: 21, letterSpacing: "0.06em" }}>{copy.loginToWin}</p>
          <Link
            href="/auth/signin"
            className="mt-3 inline-block border-2 px-5 py-2 active:translate-y-0.5"
            style={{ borderColor: "#ff5a36", color: "#ffd23f", fontSize: 22, letterSpacing: "0.14em" }}
          >
            {copy.loginCta.toUpperCase()}
          </Link>
        </div>
      )}
    </div>
  )
}
