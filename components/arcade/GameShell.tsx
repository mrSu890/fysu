"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { ArrowLeft, Lock, Palette, X } from "lucide-react"
import ArcadeCanvas from "@/components/arcade/ArcadeCanvas"
import { makePool } from "@/components/arcade/poolGame"
import { makeHoops } from "@/components/arcade/hoopsGame"
import { makeCrossing } from "@/components/arcade/crossingGame"
import { makeSlice } from "@/components/arcade/sliceGame"
import { GAMES, bestKey, gameTextFor, gamesCopyFor } from "@/lib/games"
import { loadSkin, skinKey, skinList, skinText, type SkinKind } from "@/lib/skins"
import type { ArcadeMaker } from "@/lib/arcadeKit"

/* Page plein écran d'un jeu sans récompense (Pool, Hoops, Crossing, Slice),
   avec le choix des décors / balles débloqués. */

const MAKERS: Record<string, ArcadeMaker> = {
  "fysu-pool": makePool,
  "fysu-hoops": makeHoops,
  "fysu-crossing": makeCrossing,
  "fysu-slice": makeSlice,
}

const PIXEL = '"Press Start 2P", "VT323", ui-monospace, monospace'
const CYAN = "#3fd0ff"

export default function GameShell({ slug }: { slug: string }) {
  const locale = useLocale()
  const lang = locale === "fr" ? "fr" : "en"
  const copy = gamesCopyFor(locale)
  const text = gameTextFor(slug, locale)
  const tx = skinText(locale)
  const name = GAMES.find((g) => g.slug === slug)?.name ?? slug
  const make = MAKERS[slug]
  const kinds = (["bg", "ball"] as SkinKind[]).filter((k) => skinList(slug, k).length > 0)

  // choix en cours (objet partagé avec le jeu, modifié en direct)
  const skin = useMemo(() => ({ bg: skinList(slug, "bg")[0]?.id ?? "", ball: skinList(slug, "ball")[0]?.id ?? "" }), [slug])
  const [best, setBest] = useState(0)
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [, bump] = useState(0)

  const readBest = () => {
    let b = 0
    try {
      b = Number(localStorage.getItem(bestKey(slug))) || 0
    } catch {}
    return b
  }

  useEffect(() => {
    const b = readBest()
    setBest(b)
    skin.bg = loadSkin(slug, "bg", b) || skin.bg
    skin.ball = loadSkin(slug, "ball", b) || skin.ball
    bump((n) => n + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

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

  const unlocks = useMemo(
    () =>
      kinds.flatMap((k) =>
        skinList(slug, k)
          .filter((s) => s.need > 0)
          .map((s) => ({ need: s.need, label: s.name[lang] }))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, lang]
  )

  function choose(kind: SkinKind, id: string) {
    skin[kind] = id
    try {
      localStorage.setItem(skinKey(slug, kind), id)
    } catch {}
    bump((n) => n + 1)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black" style={{ zIndex: 45 }}>
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap");`}</style>
      {make && (
        <ArcadeCanvas
          make={make}
          title={name}
          hint={text.hint}
          bestKey={bestKey(slug)}
          copy={copy}
          skin={skin}
          unlocks={unlocks}
          unlockedLabel={tx.unlocked}
          onState={(s) => {
            setPlaying(s === "play")
            if (s !== "play") setBest(readBest())
          }}
        />
      )}

      <Link
        href="/games"
        className="absolute left-4 top-4 flex items-center gap-2 border-2 bg-black px-4 py-3 active:translate-y-0.5"
        style={{ zIndex: 50, marginTop: "env(safe-area-inset-top)", borderColor: CYAN, color: CYAN, fontFamily: PIXEL, fontSize: 12 }}
      >
        <ArrowLeft size={16} />
        {copy.back.toUpperCase()}
      </Link>

      {kinds.length > 0 && !playing && (
        <button
          type="button"
          onClick={() => {
            setBest(readBest())
            setOpen(true)
          }}
          className="absolute right-4 top-4 flex items-center gap-2 border-2 bg-black px-4 py-3 active:translate-y-0.5"
          style={{ zIndex: 50, marginTop: "env(safe-area-inset-top)", borderColor: "#ffd23f", color: "#ffd23f", fontFamily: PIXEL, fontSize: 12 }}
        >
          <Palette size={16} />
          {tx.open.toUpperCase()}
        </button>
      )}

      {open && (
        <div className="absolute inset-0 flex items-end justify-center bg-black/70" style={{ zIndex: 60 }} onClick={() => setOpen(false)}>
          <div
            className="max-h-[82%] w-full max-w-[520px] overflow-y-auto border-2 bg-black p-4"
            style={{ borderColor: CYAN, paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span style={{ fontFamily: PIXEL, color: "#ffd23f", fontSize: 13 }}>{name.toUpperCase()}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label={tx.close} style={{ color: CYAN }}>
                <X size={22} />
              </button>
            </div>
            {kinds.map((k) => (
              <div key={k} className="mb-4">
                <p className="mb-2" style={{ fontFamily: PIXEL, color: "#fff", fontSize: 11 }}>
                  {(k === "bg" ? tx.bg : tx.ball).toUpperCase()}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {skinList(slug, k).map((it) => {
                    const locked = it.need > best
                    const selected = skin[k] === it.id
                    return (
                      <button
                        key={it.id}
                        type="button"
                        disabled={locked}
                        onClick={() => choose(k, it.id)}
                        className="relative flex flex-col items-stretch border-2 text-left active:translate-y-0.5"
                        style={{ borderColor: selected ? "#39ff88" : locked ? "#444" : CYAN, opacity: locked ? 0.6 : 1 }}
                      >
                        <div
                          className="relative h-20 w-full"
                          style={{
                            background: it.image
                              ? `center / cover url(${it.image})`
                              : it.colors
                                ? `linear-gradient(135deg, ${it.colors.slice(0, 3).join(", ")})`
                                : "#14082e",
                          }}
                        >
                          {locked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/65">
                              <Lock size={20} color="#fff" />
                            </div>
                          )}
                        </div>
                        <span className="px-1 py-1" style={{ fontFamily: '"VT323", monospace', fontSize: 17, color: locked ? "#888" : "#fff", lineHeight: 1.1 }}>
                          {it.name[lang]}
                          {locked ? ` · ${tx.score} ${it.need}` : ""}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
