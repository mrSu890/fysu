"use client"

import { useEffect, useState } from "react"
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
   AVATAR dans My FYSU : même éditeur que l'arcade, habillé aux couleurs
   du site (traits fins, mono, beaucoup d'espace). L'avatar reste en pixels,
   le reste de l'interface non.
   ==================================================================== */

const MONO = 'var(--font-dm-mono), ui-monospace, SFMono-Regular, Menlo, monospace'
const GREEN = "#4EAC6C"

const TXT = {
  fr: {
    wardrobe: "Garde-robe", slots: { top: "Haut", bottom: "Bas" }, silhouette: "Silhouette", style: "Coiffure", beard: "Barbe", glasses: "Lunettes",
    skin: "Peau", hair: "Cheveux", none: "Aucune", orig: "Origine", custom: "Autre couleur",
    locked: "À débloquer", worn: "Équipé", trying: "Essayage : non équipé", reset: "Remettre ma tenue",
    tryHint: "Touche une pièce verrouillée pour l'essayer. Tu pourras l'équiper une fois débloquée.",
    saved: "Enregistré", photo: "Photo de profil", setPhoto: "Utiliser comme photo de profil", ok: "Photo de profil mise à jour", login: "Connecte-toi d'abord", err: "Erreur, réessaie",
  },
  en: {
    wardrobe: "Wardrobe", slots: { top: "Top", bottom: "Bottom" }, silhouette: "Silhouette", style: "Hairstyle", beard: "Beard", glasses: "Glasses",
    skin: "Skin", hair: "Hair", none: "None", orig: "Original", custom: "Custom colour",
    locked: "Locked", worn: "Worn", trying: "Try-on: not equipped", reset: "Back to my outfit",
    tryHint: "Tap a locked piece to try it on. You can equip it once it is unlocked.",
    saved: "Saved", photo: "Profile picture", setPhoto: "Use as profile picture", ok: "Profile picture updated", login: "Log in first", err: "Error, try again",
  },
}

const HEAD_CROP = { x: 20, y: 0, w: 200, h: 190 }
const FACE_CROP = { x: 55, y: 95, w: 130, h: 90 }
const SLOT_CROP: Record<Slot, { x: number; y: number; w: number; h: number }> = {
  top: { x: 0, y: 140, w: 240, h: 290 },
  bottom: { x: 20, y: 300, w: 200, h: 316 },
}
const SLOTS: Slot[] = ["top", "bottom"]

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-foreground/15 py-8">
      <div className="mb-5 flex items-baseline gap-4">
        <span className="text-[10px] font-light text-foreground/40" style={{ fontFamily: MONO }}>{n}</span>
        <h3 className="text-[11px] font-light uppercase tracking-[0.2em]">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function Tile({ on, onClick, label, sub, children }: { on: boolean; onClick: () => void; label: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      className={`flex flex-col items-center border p-2 transition ${on ? "border-foreground" : "border-foreground/15 hover:border-foreground/40"}`}
    >
      {children}
      <span className={`mt-2 text-center text-[10px] font-light leading-tight tracking-wide ${on ? "text-foreground" : "text-foreground/60"}`}>{label}</span>
      {sub !== undefined && <span className="mt-1 h-3 text-center text-[9px] font-light uppercase tracking-[0.16em]" style={{ fontFamily: MONO }}>{sub}</span>}
    </button>
  )
}

function Swatch({ color, active, onClick, label }: { color: string | null; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`h-8 w-8 shrink-0 border transition ${active ? "outline outline-1 outline-offset-2 outline-foreground" : ""} border-foreground/25`}
      style={{ background: color ?? "repeating-linear-gradient(45deg,rgba(128,128,128,.5) 0 4px,transparent 4px 8px)" }}
    />
  )
}

export default function AvatarStudio({ locale, onPhotoUpdated }: { locale: string; onPhotoUpdated?: () => void }) {
  const lang = locale === "fr" ? "fr" : "en"
  const t = TXT[lang]
  const [cfg, setCfg] = useState<AvatarConfig>(DEFAULT_AVATAR)
  const [ready, setReady] = useState(false)
  const [flash, setFlash] = useState(false)
  const [own, setOwn] = useState<string[]>([])
  const [slot, setSlot] = useState<Slot>("top")
  const [tryOn, setTryOn] = useState<Partial<Record<Slot, string | null>>>({})
  const [pm, setPm] = useState<"idle" | "busy" | "ok" | "login" | "err">("idle")

  useEffect(() => {
    setCfg(loadAvatar())
    setOwn(ownedIds())
    setReady(true)
  }, [])

  // à l'écran : ma tenue + les pièces en essayage (jamais enregistrées)
  const shown: AvatarConfig = { ...cfg, ...tryOn } as AvatarConfig
  const trying = Object.keys(tryOn).length > 0

  function update(next: AvatarConfig) {
    setCfg(next)
    saveAvatar(next)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 1400)
  }
  function pick(sl: Slot, id: string) {
    if (own.includes(id)) {
      setTryOn((v) => {
        const n = { ...v }
        delete n[sl]
        return n
      })
      update({ ...cfg, [sl]: id } as AvatarConfig)
    } else {
      setTryOn((v) => ({ ...v, [sl]: id }))
    }
  }

  async function setAsPhoto() {
    setPm("busy")
    try {
      const blob = await avatarPortrait(cfg)
      const form = new FormData()
      form.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }))
      const res = await fetch("/api/profile", { method: "POST", body: form })
      if (res.status === 401) return setPm("login")
      if (!res.ok) return setPm("err")
      setPm("ok")
      onPhotoUpdated?.()
    } catch {
      setPm("err")
    }
  }

  const isCustom = (v: string | null, list: (string | null)[]) => v !== null && !list.includes(v)
  const customBg = "conic-gradient(#f44,#fd4,#4f8,#4df,#a5f,#f44)"
  const link = "text-[11px] font-light uppercase tracking-[0.18em] underline-offset-[6px] hover:underline disabled:opacity-40"

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-20">
      {/* APERÇU */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="flex justify-center bg-foreground/[0.04] py-8">
          {ready && <AvatarCanvas cfg={shown} crop={{ x: 0, y: 0, w: 240, h: 616 }} width={240} height={616} className="h-[420px] w-auto" />}
        </div>
        <div className="mt-4 flex min-h-[2.5rem] items-center justify-between gap-4">
          {trying ? (
            <>
              <span className="text-[10px] font-light uppercase tracking-[0.16em] text-foreground/60" style={{ fontFamily: MONO }}>{t.trying}</span>
              <button type="button" onClick={() => setTryOn({})} className={link}>{t.reset}</button>
            </>
          ) : (
            <span className="text-[10px] font-light uppercase tracking-[0.16em] transition-opacity" style={{ fontFamily: MONO, color: GREEN, opacity: flash ? 1 : 0 }}>{t.saved}</span>
          )}
        </div>
        <div className="mt-2 border-t border-foreground/15 pt-5">
          <p className="mb-3 text-[10px] font-light uppercase tracking-[0.2em] text-foreground/50">{t.photo}</p>
          <button type="button" onClick={setAsPhoto} disabled={pm === "busy"} className={link}>
            {pm === "busy" ? "…" : t.setPhoto}
          </button>
          <p className="mt-3 min-h-[1rem] text-xs font-light" style={{ color: pm === "ok" ? GREEN : undefined }}>
            {pm === "ok" && t.ok}
            {pm === "err" && <span className="text-foreground/60">{t.err}</span>}
            {pm === "login" && <span className="text-foreground/60">{t.login}</span>}
          </p>
        </div>
      </div>

      {/* RÉGLAGES */}
      <div className="min-w-0">
        <Section n="01" title={t.wardrobe}>
          <div className="mb-5 flex gap-8 border-b border-foreground/15">
            {SLOTS.map((sl) => (
              <button
                key={sl}
                type="button"
                onClick={() => setSlot(sl)}
                className={`-mb-px border-b py-3 text-[11px] uppercase tracking-[0.2em] transition ${slot === sl ? "border-foreground font-normal" : "border-transparent font-light text-foreground/50 hover:text-foreground"}`}
              >
                {t.slots[sl]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {itemsOf(slot).map((it) => {
              const mine = own.includes(it.id)
              const equipped = cfg[slot] === it.id
              return (
                <Tile
                  key={it.id}
                  on={shown[slot] === it.id}
                  onClick={() => pick(slot, it.id)}
                  label={it.name[lang]}
                  sub={<span style={{ color: equipped ? GREEN : undefined }} className={equipped ? "" : "text-foreground/45"}>{!mine ? t.locked : equipped ? t.worn : " "}</span>}
                >
                  {ready && (
                    <AvatarCanvas
                      cfg={{ ...shown, [slot]: it.id } as AvatarConfig}
                      crop={SLOT_CROP[slot]}
                      width={SLOT_CROP[slot].w}
                      height={SLOT_CROP[slot].h}
                      className="h-auto w-full"
                    />
                  )}
                </Tile>
              )
            })}
          </div>
          <p className="mt-4 text-xs font-light text-foreground/50">{t.tryHint}</p>
        </Section>

        <Section n="02" title={t.silhouette}>
          <div className="grid max-w-xs grid-cols-2 gap-3">
            {(["a", "b"] as Silhouette[]).map((s) => (
              <Tile key={s} on={cfg.sil === s} onClick={() => update({ ...cfg, sil: s })} label={s.toUpperCase()}>
                {ready && <AvatarCanvas cfg={{ ...cfg, sil: s }} crop={HEAD_CROP} width={100} height={95} className="h-auto w-full" />}
              </Tile>
            ))}
          </div>
        </Section>

        <Section n="03" title={t.style}>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {HAIR_STYLES.map((h) => (
              <Tile key={h.id} on={cfg.style === h.id} onClick={() => update({ ...cfg, style: h.id })} label={h.name[lang]}>
                {ready && <AvatarCanvas cfg={{ ...cfg, style: h.id }} crop={HEAD_CROP} width={100} height={95} className="h-auto w-full" />}
              </Tile>
            ))}
          </div>
        </Section>

        <Section n="04" title={t.beard}>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            <Tile on={cfg.beard === null} onClick={() => update({ ...cfg, beard: null })} label={t.none}>
              <div className="aspect-[130/90] w-full" />
            </Tile>
            {BEARDS.map((b) => (
              <Tile key={b.id} on={cfg.beard === b.id} onClick={() => update({ ...cfg, beard: b.id })} label={b.name[lang]}>
                {ready && <AvatarCanvas cfg={{ ...cfg, beard: b.id }} crop={FACE_CROP} width={130} height={90} className="h-auto w-full" />}
              </Tile>
            ))}
          </div>
        </Section>

        <Section n="05" title={t.glasses}>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            <Tile on={cfg.glasses === null} onClick={() => update({ ...cfg, glasses: null })} label={t.none}>
              <div className="aspect-[130/90] w-full" />
            </Tile>
            {GLASSES.map((g) => (
              <Tile key={g.id} on={cfg.glasses === g.id} onClick={() => update({ ...cfg, glasses: g.id })} label={g.name[lang]}>
                {ready && <AvatarCanvas cfg={{ ...cfg, glasses: g.id }} crop={FACE_CROP} width={130} height={90} className="h-auto w-full" />}
              </Tile>
            ))}
          </div>
        </Section>

        <Section n="06" title={t.skin}>
          <div className="flex flex-wrap gap-3">
            {SKIN_PRESETS.map((c) => (
              <Swatch key={c ?? "orig"} color={c} active={cfg.skin === c} onClick={() => update({ ...cfg, skin: c })} label={c ?? t.orig} />
            ))}
            <label
              className={`relative h-8 w-8 shrink-0 cursor-pointer border border-foreground/25 ${isCustom(cfg.skin, SKIN_PRESETS) ? "outline outline-1 outline-offset-2 outline-foreground" : ""}`}
              style={{ background: isCustom(cfg.skin, SKIN_PRESETS) ? cfg.skin! : customBg }}
            >
              <input type="color" aria-label={t.custom} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={cfg.skin ?? "#ebb48c"} onChange={(e) => update({ ...cfg, skin: e.target.value })} />
            </label>
          </div>
        </Section>

        <Section n="07" title={t.hair}>
          <div className="flex flex-wrap gap-3">
            {HAIR_PRESETS.map((c) => (
              <Swatch key={c ?? "orig"} color={c} active={cfg.hair === c} onClick={() => update({ ...cfg, hair: c })} label={c ?? t.orig} />
            ))}
            <label
              className={`relative h-8 w-8 shrink-0 cursor-pointer border border-foreground/25 ${isCustom(cfg.hair, HAIR_PRESETS) ? "outline outline-1 outline-offset-2 outline-foreground" : ""}`}
              style={{ background: isCustom(cfg.hair, HAIR_PRESETS) ? cfg.hair! : customBg }}
            >
              <input type="color" aria-label={t.custom} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={cfg.hair ?? "#46301e"} onChange={(e) => update({ ...cfg, hair: e.target.value })} />
            </label>
          </div>
        </Section>
      </div>
    </div>
  )
}
