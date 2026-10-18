"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { ArrowLeft, Check } from "lucide-react"
import AvatarCanvas from "@/components/arcade/AvatarCanvas"
import {
  BEARDS,
  DEFAULT_AVATAR,
  GLASSES,
  HAIR_PRESETS,
  HAIR_STYLES,
  SKIN_PRESETS,
  avatarPortrait,
  itemsOf,
  loadAvatar,
  ownedIds,
  saveAvatar,
  type AvatarConfig,
  type Silhouette,
  type Slot,
} from "@/lib/avatar"

/* ====================================================================
   MON AVATAR : silhouette, coiffure, barbe, lunettes, peau, cheveux.
   Enregistré automatiquement sur l'appareil.
   ==================================================================== */

const CYAN = "#3fd0ff"
const YELLOW = "#ffd23f"
const GREEN = "#39ff88"
const ORANGE = "#ff5a36"
const PIXEL = '"Press Start 2P", "VT323", ui-monospace, monospace'
const TERM = '"VT323", ui-monospace, monospace'

const TXT = {
  fr: { title: "MON AVATAR", back: "JEUX", sil: "SILHOUETTE", style: "COIFFURE", beard: "BARBE", none: "Aucune", glasses: "LUNETTES", profile: "PHOTO DE PROFIL", setProfile: "UTILISER COMME PHOTO", profOk: "PHOTO DE PROFIL MISE À JOUR", profLogin: "CONNECTE-TOI D'ABORD", profErr: "ERREUR, RÉESSAIE", login: "SE CONNECTER", skin: "PEAU", hair: "CHEVEUX", orig: "Origine", saved: "ENREGISTRÉ", custom: "Autre couleur", wardrobe: "GARDE-ROBE", slots: { top: "HAUT", outer: "VESTE", bottom: "BAS", shoes: "CHAUSSURES" }, trying: "ESSAYAGE : PAS ÉQUIPÉ", reset: "REMETTRE MA TENUE", locked: "À DÉBLOQUER", worn: "ÉQUIPÉ", tryHint: "Touche une pièce verrouillée pour l'essayer. Tu ne peux l'équiper qu'une fois débloquée." },
  en: { title: "MY AVATAR", back: "GAMES", sil: "SILHOUETTE", style: "HAIRSTYLE", beard: "BEARD", none: "None", glasses: "GLASSES", profile: "PROFILE PICTURE", setProfile: "USE AS PROFILE PICTURE", profOk: "PROFILE PICTURE UPDATED", profLogin: "LOG IN FIRST", profErr: "ERROR, TRY AGAIN", login: "LOG IN", skin: "SKIN", hair: "HAIR", orig: "Original", saved: "SAVED", custom: "Custom colour", wardrobe: "WARDROBE", slots: { top: "TOP", outer: "JACKET", bottom: "BOTTOM", shoes: "SHOES" }, trying: "TRY-ON: NOT EQUIPPED", reset: "BACK TO MY OUTFIT", locked: "LOCKED", worn: "WORN", tryHint: "Tap a locked piece to try it on. You can only equip it once unlocked." },
}

const HEAD_CROP = { x: 20, y: 0, w: 200, h: 190 }
const FACE_CROP = { x: 55, y: 95, w: 130, h: 90 }
const SLOT_CROP: Record<Slot, { x: number; y: number; w: number; h: number }> = {
  top: { x: 20, y: 140, w: 200, h: 220 },
  outer: { x: 0, y: 140, w: 240, h: 290 },
  bottom: { x: 20, y: 300, w: 200, h: 316 },
  shoes: { x: 20, y: 440, w: 200, h: 176 },
}
const SLOTS: Slot[] = ["top", "outer", "bottom", "shoes"]

function Label({ text }: { text: string }) {
  return (
    <p className="mt-6 mb-2" style={{ fontFamily: PIXEL, fontSize: 11, color: YELLOW }}>
      {text}
    </p>
  )
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
  const [pm, setPm] = useState<"idle" | "busy" | "ok" | "login" | "err">("idle")
  const [own, setOwn] = useState<string[]>([])
  const [slot, setSlot] = useState<Slot>("top")
  const [tryOn, setTryOn] = useState<Partial<Record<Slot, string | null>>>({})

  useEffect(() => {
    setCfg(loadAvatar())
    setOwn(ownedIds())
    setReady(true)
  }, [])

  // ce qu'on voit à l'écran = ma tenue + les pièces en essayage (jamais enregistrées)
  const shown: AvatarConfig = { ...cfg, ...tryOn } as AvatarConfig
  const trying = Object.keys(tryOn).length > 0
  const worn = (sl: Slot) => (sl === "outer" ? cfg.outer : cfg[sl])
  function pick(sl: Slot, id: string | null) {
    const mine = id === null || own.includes(id)
    if (mine) {
      setTryOn((t) => {
        const n = { ...t }
        delete n[sl]
        return n
      })
      update({ ...cfg, [sl]: id } as AvatarConfig)
    } else {
      setTryOn((t) => ({ ...t, [sl]: id }))
    }
  }

  function update(next: AvatarConfig) {
    setCfg(next)
    saveAvatar(next)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 1200)
  }

  async function setAsProfile() {
    setPm("busy")
    try {
      const blob = await avatarPortrait(cfg)
      const form = new FormData()
      form.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }))
      const res = await fetch("/api/profile", { method: "POST", body: form })
      if (res.status === 401) return setPm("login")
      setPm(res.ok ? "ok" : "err")
    } catch {
      setPm("err")
    }
  }

  const custom = (v: string | null, list: (string | null)[]) => v !== null && !list.includes(v)
  const box = (on: boolean) => ({ borderColor: on ? GREEN : "#444", background: "#0b0b14" })

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
          {ready && <AvatarCanvas cfg={shown} crop={{ x: 0, y: 0, w: 240, h: 616 }} width={240} height={616} className="h-[390px] w-auto" />}
        </div>
        {trying && (
          <div className="mt-2 flex items-center justify-between gap-2 border-2 px-3 py-2" style={{ borderColor: YELLOW }}>
            <span style={{ fontFamily: PIXEL, fontSize: 9, lineHeight: 1.6, color: YELLOW }}>{t.trying}</span>
            <button type="button" onClick={() => setTryOn({})} className="border-2 px-2 py-2 active:translate-y-0.5" style={{ borderColor: CYAN, fontFamily: PIXEL, fontSize: 9, color: CYAN }}>
              {t.reset}
            </button>
          </div>
        )}
        <p className="mt-2 h-6 text-center" style={{ fontFamily: PIXEL, color: GREEN, fontSize: 10, opacity: flash ? 1 : 0, transition: "opacity .3s" }}>
          {t.saved}
        </p>

        {/* garde-robe */}
        <Label text={t.wardrobe} />
        <div className="flex gap-2">
          {SLOTS.map((sl) => (
            <button
              key={sl}
              type="button"
              onClick={() => setSlot(sl)}
              className="flex-1 border-2 py-2 active:translate-y-0.5"
              style={{ borderColor: slot === sl ? GREEN : "#444", fontFamily: PIXEL, fontSize: 8, color: slot === sl ? GREEN : "#888" }}
            >
              {t.slots[sl]}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {slot === "outer" && (
            <button type="button" onClick={() => pick("outer", null)} className="flex flex-col items-center justify-center border-2 p-1 active:translate-y-0.5" style={box((shown.outer ?? null) === null)}>
              <span style={{ fontFamily: TERM, fontSize: 16, color: shown.outer === null ? GREEN : "#bbb" }}>{t.none}</span>
            </button>
          )}
          {itemsOf(slot).map((it) => {
            const mine = own.includes(it.id)
            const on = shown[slot] === it.id
            return (
              <button key={it.id} type="button" onClick={() => pick(slot, it.id)} className="relative flex flex-col items-center border-2 p-1 active:translate-y-0.5" style={box(on)} aria-label={it.name[lang]}>
                {ready && (
                  <AvatarCanvas
                    cfg={{ ...shown, [slot]: it.id } as AvatarConfig}
                    crop={SLOT_CROP[slot]}
                    width={SLOT_CROP[slot].w}
                    height={SLOT_CROP[slot].h}
                    className="h-auto w-full"
                  />
                )}
                <span className="mt-1 text-center leading-none" style={{ fontFamily: TERM, fontSize: 14, color: on ? GREEN : "#bbb" }}>
                  {it.name[lang]}
                </span>
                <span className="mt-1" style={{ fontFamily: PIXEL, fontSize: 7, color: !mine ? ORANGE : worn(slot) === it.id ? GREEN : "#666" }}>
                  {!mine ? t.locked : worn(slot) === it.id ? t.worn : "\u00a0"}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-3" style={{ fontFamily: TERM, fontSize: 15, color: "#888" }}>
          {t.tryHint}
        </p>

        {/* silhouette */}
        <Label text={t.sil} />
        <div className="flex gap-3">
          {(["a", "b"] as Silhouette[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update({ ...cfg, sil: s })}
              className="flex flex-1 flex-col items-center border-2 p-1 active:translate-y-0.5"
              style={box(cfg.sil === s)}
              aria-label={s.toUpperCase()}
            >
              {ready && <AvatarCanvas cfg={{ ...cfg, sil: s }} crop={HEAD_CROP} width={100} height={95} className="h-auto w-24" />}
              <span style={{ fontFamily: PIXEL, fontSize: 12, color: cfg.sil === s ? GREEN : "#888" }}>{s.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {/* coiffure */}
        <Label text={t.style} />
        <div className="grid grid-cols-4 gap-2">
          {HAIR_STYLES.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => update({ ...cfg, style: h.id })}
              className="flex flex-col items-center border-2 p-1 active:translate-y-0.5"
              style={box(cfg.style === h.id)}
              aria-label={h.name[lang]}
            >
              {ready && <AvatarCanvas cfg={{ ...cfg, style: h.id }} crop={HEAD_CROP} width={100} height={95} className="h-auto w-full" />}
              <span className="mt-1 text-center leading-none" style={{ fontFamily: TERM, fontSize: 15, color: cfg.style === h.id ? GREEN : "#bbb" }}>
                {h.name[lang]}
              </span>
            </button>
          ))}
        </div>

        {/* barbe */}
        <Label text={t.beard} />
        <div className="grid grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => update({ ...cfg, beard: null })}
            className="flex flex-col items-center justify-center border-2 p-1 active:translate-y-0.5"
            style={box(cfg.beard === null)}
          >
            <span className="text-center leading-none" style={{ fontFamily: TERM, fontSize: 16, color: cfg.beard === null ? GREEN : "#bbb" }}>
              {t.none}
            </span>
          </button>
          {BEARDS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => update({ ...cfg, beard: b.id })}
              className="flex flex-col items-center border-2 p-1 active:translate-y-0.5"
              style={box(cfg.beard === b.id)}
              aria-label={b.name[lang]}
            >
              {ready && <AvatarCanvas cfg={{ ...cfg, beard: b.id }} crop={FACE_CROP} width={130} height={90} className="h-auto w-full" />}
              <span className="mt-1 text-center leading-none" style={{ fontFamily: TERM, fontSize: 13, color: cfg.beard === b.id ? GREEN : "#bbb" }}>
                {b.name[lang]}
              </span>
            </button>
          ))}
        </div>

        {/* lunettes */}
        <Label text={t.glasses} />
        <div className="grid grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => update({ ...cfg, glasses: null })}
            className="flex flex-col items-center justify-center border-2 p-1 active:translate-y-0.5"
            style={box(cfg.glasses === null)}
          >
            <span className="text-center leading-none" style={{ fontFamily: TERM, fontSize: 16, color: cfg.glasses === null ? GREEN : "#bbb" }}>
              {t.none}
            </span>
          </button>
          {GLASSES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => update({ ...cfg, glasses: g.id })}
              className="flex flex-col items-center border-2 p-1 active:translate-y-0.5"
              style={box(cfg.glasses === g.id)}
              aria-label={g.name[lang]}
            >
              {ready && <AvatarCanvas cfg={{ ...cfg, glasses: g.id }} crop={FACE_CROP} width={130} height={90} className="h-auto w-full" />}
              <span className="mt-1 text-center leading-none" style={{ fontFamily: TERM, fontSize: 13, color: cfg.glasses === g.id ? GREEN : "#bbb" }}>
                {g.name[lang]}
              </span>
            </button>
          ))}
        </div>

        {/* peau */}
        <Label text={t.skin} />
        <div className="flex flex-wrap gap-2">
          {SKIN_PRESETS.map((c) => (
            <Swatch key={c ?? "orig"} color={c} active={cfg.skin === c} onClick={() => update({ ...cfg, skin: c })} label={c ?? t.orig} />
          ))}
          <label className="relative h-11 w-11 shrink-0 cursor-pointer" style={{ border: `3px solid ${custom(cfg.skin, SKIN_PRESETS) ? GREEN : "#444"}`, background: custom(cfg.skin, SKIN_PRESETS) ? cfg.skin! : "conic-gradient(#f44,#fd4,#4f8,#4df,#a5f,#f44)" }}>
            <input type="color" aria-label={t.custom} className="absolute inset-0 h-full w-full opacity-0" value={cfg.skin ?? "#ebb48c"} onChange={(e) => update({ ...cfg, skin: e.target.value })} />
          </label>
        </div>

        {/* cheveux */}
        <Label text={t.hair} />
        <div className="flex flex-wrap gap-2">
          {HAIR_PRESETS.map((c) => (
            <Swatch key={c ?? "orig"} color={c} active={cfg.hair === c} onClick={() => update({ ...cfg, hair: c })} label={c ?? t.orig} />
          ))}
          <label className="relative h-11 w-11 shrink-0 cursor-pointer" style={{ border: `3px solid ${custom(cfg.hair, HAIR_PRESETS) ? GREEN : "#444"}`, background: custom(cfg.hair, HAIR_PRESETS) ? cfg.hair! : "conic-gradient(#f44,#fd4,#4f8,#4df,#a5f,#f44)" }}>
            <input type="color" aria-label={t.custom} className="absolute inset-0 h-full w-full opacity-0" value={cfg.hair ?? "#46301e"} onChange={(e) => update({ ...cfg, hair: e.target.value })} />
          </label>
        </div>

        {/* photo de profil */}
        <Label text={t.profile} />
        <button
          type="button"
          onClick={setAsProfile}
          disabled={pm === "busy"}
          className="w-full border-2 py-3 active:translate-y-0.5 disabled:opacity-50"
          style={{ borderColor: CYAN, fontFamily: PIXEL, fontSize: 11, color: CYAN }}
        >
          {t.setProfile}
        </button>
        <p className="mt-3 text-center" style={{ fontFamily: PIXEL, fontSize: 10, lineHeight: 1.6, color: pm === "ok" ? GREEN : ORANGE }}>
          {pm === "ok" && t.profOk}
          {pm === "err" && t.profErr}
          {pm === "login" && (
            <>
              {t.profLogin}{" "}
              <Link href="/auth/signin" style={{ color: CYAN, textDecoration: "underline" }}>
                {t.login}
              </Link>
            </>
          )}
        </p>
      </main>
    </div>
  )
}
