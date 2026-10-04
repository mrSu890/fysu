"use client"

import { useState } from "react"
import { BADGES } from "@/lib/badges"
import type { PCopy } from "./profileCopy"

export type Reward = { badge: string; code: string | null; percent: number; expires_at?: string | null }

export default function Badges({
  earned,
  rewards,
  stats,
  copy,
  locale,
  accent,
  onRewards,
}: {
  earned: string[]
  rewards: Reward[]
  stats: any
  copy: PCopy
  locale: string
  accent: string
  onRewards: (r: Reward[]) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const lang = locale === "fr" ? "fr" : "en"

  async function claim(id: string) {
    setBusy(id)
    setMsg(null)
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badge: id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? copy.error)
      onRewards([...rewards.filter((r) => r.badge !== id), json.reward])
    } catch (e: any) {
      setMsg(e?.message ?? copy.error)
    } finally {
      setBusy(null)
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 1800)
    } catch {}
  }

  const dateFmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : ""

  const ghost =
    "border border-foreground/40 px-4 py-2 text-[11px] font-light uppercase tracking-[0.18em] disabled:opacity-40"

  return (
    <div>
      <p className="max-w-md text-sm font-light text-foreground/60">{copy.badgesIntro}</p>

      <div className="mt-8 border-t border-foreground/15">
        {BADGES.map((b, idx) => {
          const got = earned.includes(b.id)
          const reward = rewards.find((r) => r.badge === b.id && r.code)
          const prog = !got && b.progress ? b.progress(stats) : null
          return (
            <div key={b.id} className={`border-b border-foreground/15 py-6 ${got ? "" : "opacity-60"}`}>
              <div className="flex items-start gap-5 sm:gap-8">
                <span className="w-6 shrink-0 pt-1 text-[11px] font-light tabular-nums tracking-[0.18em] text-foreground/50">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-lg font-bold tracking-tight sm:text-xl">{b[lang].name}</p>
                    <span
                      className="shrink-0 text-[10px] font-light uppercase tracking-[0.2em]"
                      style={got ? { color: accent } : undefined}
                    >
                      {got ? copy.earned : copy.locked}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-light text-foreground/60">{b[lang].desc}</p>

                  {prog && (
                    <div className="mt-4 max-w-xs">
                      <div className="h-px bg-foreground/20">
                        <div
                          className="h-px"
                          style={{ width: `${Math.min(100, (prog.value / prog.max) * 100)}%`, background: accent }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] font-light tabular-nums tracking-[0.18em] text-foreground/50">
                        {Math.min(prog.value, prog.max)} / {prog.max}
                      </p>
                    </div>
                  )}

                  {b.reward && got && !reward && (
                    <button type="button" onClick={() => claim(b.id)} disabled={busy === b.id} className={`mt-4 ${ghost}`}>
                      {busy === b.id ? copy.claiming : `${copy.claim} · −${b.reward.percent} %`}
                    </button>
                  )}

                  {reward?.code && (
                    <div className="mt-4 max-w-sm border-t border-foreground/15 pt-3">
                      <p className="text-[10px] font-light uppercase tracking-[0.18em] text-foreground/50">
                        {copy.yourCode} · −{reward.percent} %
                        {reward.expires_at ? ` · ${copy.validUntil} ${dateFmt(reward.expires_at)}` : ""}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="font-mono text-sm tracking-[0.12em]">{reward.code}</span>
                        <button type="button" onClick={() => copyCode(reward.code!)} className="text-xs font-light underline underline-offset-4">
                          {copied === reward.code ? copy.copied : copy.copy}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
    </div>
  )
}
