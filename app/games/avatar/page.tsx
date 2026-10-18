"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { ArrowLeft, Check } from "lucide-react"
import AvatarCanvas from "@/components/arcade/AvatarCanvas"
import {
  DEFAULT_AVATAR,
  HAIR_PRESETS,
  HEADS,
  SKIN_PRESETS,
  loadAvatar,
  saveAvatar,
  silOf,
  type AvatarConfig,
  type Silhouette,
} from "@/lib/avatar"

/* ====================================================================
   MON AVATAR : silhouette, coiffure, peau, cheveux.
   Enregistré automatiquement sur l'appareil.
   ==================================================================== */

const CYAN = "#3fd0ff"
const YELLOW = "#ffd23f"
const GREEN = "#39ff88"
const ORANGE = "#ff5a36"
const PIXEL = '"Press Start 2P", "VT323", ui-monospace, monospace'
const TERM = '"VT323", ui-monospace, monospace'

const TXT = {
  fr: { title: "MON AVATAR", back: "JEUX", sil: "SILHOUETTE", style: "COIFFURE", skin: "PEAU", hair: "CHEVEUX", orig: "Origine", saved: "ENREGISTRÉ", custom: "Autre couleur", a: "A", b: "B" },
  en: { title: "MY AVATAR", back: "GAMES", sil: "SILHOUETTE", style: "HAIRSTYLE", skin: "SKIN", hair: "HAIR", orig: "Original", saved: "SAVED", custom: "Custom colour", a: "A", b: "B" },
}

function Swatch({ color, active, onClick, label }: { color: string | null; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative h-11 w-11 shrink-0 active:translate-y-0.5"
      style={{
        border: `3px solid ${active ? GREEN : "#444"}`,
        background: color ?? "repeating-linear-gradient(45deg,#777 0 6px,#333 6px 12px)",
      }}
    >
      {active && <Check size={18} color="#000" className="absolute inset-0 m-auto" strokeWidth={4} />}
    </button>
  )
}

export default function AvatarPage() {
  const locale = useLocale()
  const t = locale === "fr" ? TXT.fr : TXT.en
  const lang = locale === "fr" ? "fr" : "en"
  const [cfg, setCfg] = useState<AvatarConfig>(DEFAULT_AVATAR)
  const [ready, setReady] = useState(false)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    setCfg(loadAvatar())
    setReady(true)
    const prev = document.body.style.overflow
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  function update(next: AvatarConfig) {
    setCfg(next)
    saveAvatar(next)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 1200)
  }

  const sil = silOf(cfg.head)
  const setSil = (s: Silhouette) => {
    if (s === sil) return
    update({ ...cfg, head: HEADS.find((h) => h.sil === s)!.id })
  }
  const custom = (v: string | null, list: (string | null)[]) => v !== null && !list.includes(v)

  return (
    <div className="fixed inset-0 overflow-y-auto bg-black text-white" style={{ zIndex: 45 }}>
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap");`}</style>

      <Link
        href="/games"
        className="fixed left-4 top-4 flex items-center gap-2 border-2 bg-black px-4 py-3 active:translate-y-0.5"
        style={{ zIndex: 50, marginTop: "env(safe-area-inset-top)", borderColor: CYAN, color: CYAN, fontFamily: PIXEL, fontSize: 12 }}
      >
        <ArrowLeft size={16} />
        {t.back}
      </Link>

      <main className="mx-auto w-11/12 max-w-md pb-24 pt-24">
        <h1 style={{ fontFamily: PIXEL, color: CYAN, fontSize: 20, lineHeight: 1.5, textShadow: "3px 3px 0 #ff3d9a" }}>
          {">"} {t.title}
        </h1>

        {/* aperçu */}
        <div className="mt-6 flex justify-center border-2 py-4" style={{ borderColor: ORANGE, background: "linear-gradient(#14082e,#08131f)" }}>
          {ready && <AvatarCanvas cfg={cfg} crop={{ x: 0, y: 0, w: 240, h: 616 }} width={240} height={616} className="h-[390px] w-auto" />}
        </div>
        <p className="mt-2 h-6 text-center" style={{ fontFamily: PIXEL, color: GREEN, fontSize: 10, opacity: flash ? 1 : 0, transition: "opacity .3s" }}>
          {t.saved}
        </p>

        {/* silhouette */}
        <p className="mt-6 mb-2" style={{ fontFamily: PIXEL, fontSize: 11, color: YELLOW }}>{t.sil}</p>
        <div className="flex gap-3">
          {(["a", "b"] as Silhouette[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSil(s)}
              className="flex-1 border-2 py-2 active:translate-y-0.5"
              style={{ borderColor: sil === s ? GREEN : "#444", fontFamily: PIXEL, fontSize: 14, color: sil === s ? GREEN : "#888" }}
            >
              {s === "a" ? t.a : t.b}
            </button>
          ))}
        </div>

        {/* coiffure */}
        <p className="mt-6 mb-2" style={{ fontFamily: PIXEL, fontSize: 11, color: YELLOW }}>{t.style}</p>
        <div className="grid grid-cols-4 gap-2">
          {HEADS.filter((h) => h.sil === sil).map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => update({ ...cfg, head: h.id })}
              className="flex flex-col items-center border-2 p-1 active:translate-y-0.5"
              style={{ borderColor: cfg.head === h.id ? GREEN : "#444", background: "#0b0b14" }}
              aria-label={h.name[lang]}
            >
              <AvatarCanvas cfg={{ ...cfg, head: h.id }} crop={{ x: 20, y: 0, w: 200, h: 190 }} width={100} height={95} className="h-auto w-full" />
              <span className="mt-1 text-center leading-none" style={{ fontFamily: TERM, fontSize: 15, color: cfg.head === h.id ? GREEN : "#bbb" }}>
                {h.name[lang]}
              </span>
            </button>
          ))}
        </div>

        {/* peau */}
        <p className="mt-6 mb-2" style={{ fontFamily: PIXEL, fontSize: 11, color: YELLOW }}>{t.skin}</p>
        <div className="flex flex-wrap gap-2">
          {SKIN_PRESETS.map((c) => (
            <Swatch key={c ?? "orig"} color={c} active={cfg.skin === c} onClick={() => update({ ...cfg, skin: c })} label={c ?? t.orig} />
          ))}
          <label className="relative h-11 w-11 shrink-0 cursor-pointer" style={{ border: `3px solid ${custom(cfg.skin, SKIN_PRESETS) ? GREEN : "#444"}`, background: custom(cfg.skin, SKIN_PRESETS) ? cfg.skin! : "conic-gradient(#f44,#fd4,#4f8,#4df,#a5f,#f44)" }}>
            <input type="color" aria-label={t.custom} className="absolute inset-0 h-full w-full opacity-0" value={cfg.skin ?? "#ebb48c"} onChange={(e) => update({ ...cfg, skin: e.target.value })} />
          </label>
        </div>

        {/* cheveux */}
        <p className="mt-6 mb-2" style={{ fontFamily: PIXEL, fontSize: 11, color: YELLOW }}>{t.hair}</p>
        <div className="flex flex-wrap gap-2">
          {HAIR_PRESETS.map((c) => (
            <Swatch key={c ?? "orig"} color={c} active={cfg.hair === c} onClick={() => update({ ...cfg, hair: c })} label={c ?? t.orig} />
          ))}
          <label className="relative h-11 w-11 shrink-0 cursor-pointer" style={{ border: `3px solid ${custom(cfg.hair, HAIR_PRESETS) ? GREEN : "#444"}`, background: custom(cfg.hair, HAIR_PRESETS) ? cfg.hair! : "conic-gradient(#f44,#fd4,#4f8,#4df,#a5f,#f44)" }}>
            <input type="color" aria-label={t.custom} className="absolute inset-0 h-full w-full opacity-0" value={cfg.hair ?? "#46301e"} onChange={(e) => update({ ...cfg, hair: e.target.value })} />
          </label>
        </div>
      </main>
    </div>
  )
}
