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

  return (
    <section className="mx-auto w-11/12 max-w-7xl py-8">
      <h2 className="font-dior text-2xl">{copy.badges}</h2>
      <p className="mt-1 text-sm text-foreground/60">{copy.badgesIntro}</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BADGES.map((b) => {
          const got = earned.includes(b.id)
          const reward = rewards.find((r) => r.badge === b.id && r.code)
          const prog = !got && b.progress ? b.progress(stats) : null
          return (
            <div
              key={b.id}
              className={`rounded-2xl border p-4 transition ${got ? "border-foreground/25" : "border-foreground/10 opacity-70"}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${got ? "" : "grayscale"}`}
                  style={{ background: got ? `${accent}22` : "rgba(128,128,128,.12)" }}
                >
                  {b.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{b[lang].name}</p>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px]"
                      style={got ? { background: accent, color: "#fff" } : { background: "rgba(128,128,128,.15)" }}
                    >
                      {got ? copy.earned : copy.locked}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-foreground/60">{b[lang].desc}</p>
                </div>
              </div>

              {prog && (
                <div className="mt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, (prog.value / prog.max) * 100)}%`, background: accent }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-foreground/50">
                    {Math.min(prog.value, prog.max)} / {prog.max}
                  </p>
                </div>
              )}

              {b.reward && got && !reward && (
                <button
                  type="button"
                  onClick={() => claim(b.id)}
                  disabled={busy === b.id}
                  className="mt-3 w-full rounded-full py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: accent }}
                >
                  {busy === b.id ? copy.claiming : `${copy.claim} · −${b.reward.percent} %`}
                </button>
              )}

              {reward?.code && (
                <div className="mt-3 rounded-xl border border-dashed border-foreground/30 p-3">
                  <p className="text-xs text-foreground/50">
                    {copy.yourCode} · −{reward.percent} %
                    {reward.expires_at ? ` · ${copy.validUntil} ${dateFmt(reward.expires_at)}` : ""}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-base tracking-wider">{reward.code}</span>
                    <button
                      type="button"
                      onClick={() => copyCode(reward.code!)}
                      className="rounded-full border border-foreground/30 px-3 py-1 text-xs"
                    >
                      {copied === reward.code ? copy.copied : copy.copy}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
    </section>
  )
}
