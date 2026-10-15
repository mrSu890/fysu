"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale } from "next-intl"

/* ====================================================================
   PAGE D'ATTENTE : photo de vêtements derrière une vitre givrée, texte d'ouverture, compte à rebours,
   mot de passe + e-mail. La photo est dans public/images/gate-bg.jpg (remplaçable).
   Réglages (date, activer / désactiver) : lib/preLaunch.ts
   ==================================================================== */

type Copy = {
  password: string
  wrong: string
  notify: string
  email: string
  invalid: string
  thanks: string
  error: string
  opening: string
  enter: string
  countdown: string
  units: [string, string, string, string]
}

const COPY: Record<string, Copy> = {
  en: {
    password: "Password",
    wrong: "Wrong password",
    notify: "Be notified when we open",
    email: "Email",
    invalid: "Please enter a valid email",
    thanks: "Thank you. We will write to you on opening day.",
    error: "Something went wrong, please try again",
    opening: "Opening",
    enter: "Enter",
    countdown: "until opening",
    units: ["d", "h", "min", "s"],
  },
  fr: {
    password: "Mot de passe",
    wrong: "Mot de passe incorrect",
    notify: "Être averti de l'ouverture",
    email: "E-mail",
    invalid: "Adresse e-mail invalide",
    thanks: "Merci. Nous vous écrirons le jour de l'ouverture.",
    error: "Une erreur est survenue, réessayez",
    opening: "Ouverture le",
    enter: "Entrer",
    countdown: "avant l'ouverture",
    units: ["j", "h", "min", "s"],
  },
  nl: {
    password: "Wachtwoord",
    wrong: "Onjuist wachtwoord",
    notify: "Verwittig me bij de opening",
    email: "E-mail",
    invalid: "Ongeldig e-mailadres",
    thanks: "Bedankt. We mailen je op de dag van de opening.",
    error: "Er ging iets mis, probeer opnieuw",
    opening: "Opening op",
    enter: "Binnenkomen",
    countdown: "tot de opening",
    units: ["d", "u", "min", "s"],
  },
  ja: {
    password: "パスワード",
    wrong: "パスワードが違います",
    notify: "オープンをメールで知らせる",
    email: "メールアドレス",
    invalid: "メールアドレスが正しくありません",
    thanks: "ありがとうございます。オープン当日にご連絡します。",
    error: "エラーが発生しました。もう一度お試しください",
    opening: "オープン",
    enter: "入る",
    countdown: "オープンまで",
    units: ["日", "時間", "分", "秒"],
  },
}

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const GATE_CSS = `
.gate-root{background:#8a8f86 url(/images/gate-bg.jpg) center/cover no-repeat;animation:gate-in .9s ease both;color:#fff}
.gate-root.gate-leaving{animation:gate-out .6s ease forwards}
.gate-video{display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
@media (orientation:portrait) and (pointer:coarse){.gate-video{display:block}}
@media (prefers-reduced-motion:reduce){.gate-video{display:none!important}}
@keyframes gate-in{from{opacity:0}to{opacity:1}}
@keyframes gate-out{to{opacity:0}}
.gate-field{width:100%;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.38);border-radius:999px;padding:13px 52px 13px 20px;color:#fff;font-size:14px;outline:none;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.gate-field::placeholder{color:rgba(255,255,255,0.8)}
.gate-field:focus{border-color:rgba(255,255,255,0.75)}
.gate-go{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:999px;background:rgba(255,255,255,0.9);color:#2a2f2a;display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;transition:opacity .2s}
.gate-go:disabled{opacity:.45;cursor:default}
.gate-num{font-variant-numeric:tabular-nums;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
`

export default function PreLaunchGate({ openAt }: { openAt: string }) {
  const locale = useLocale()
  const c = COPY[locale] ?? COPY.en

  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const [email, setEmail] = useState("")
  const [trap, setTrap] = useState("")
  const [mailMessage, setMailMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [mailBusy, setMailBusy] = useState(false)

  // le site ne défile pas derrière la vitre
  useEffect(() => {
    const html = document.documentElement
    const previous = html.style.overflow
    html.style.overflow = "hidden"
    return () => {
      html.style.overflow = previous
    }
  }, [])

  // « 15 décembre 2026 à 12:00 CET (UTC+1) » : date dans la langue du visiteur, fuseau horaire lisible partout
  const openingText = useMemo(() => {
    try {
      const d = new Date(openAt)
      const tz = "Europe/Brussels"
      const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: tz, hourCycle: "h23" }).format(d)
      const part = (style: "short" | "shortOffset") =>
        new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: style })
          .formatToParts(d)
          .find((x) => x.type === "timeZoneName")?.value
      const zone = part("short") ?? "CET"
      const offset = (part("shortOffset") ?? "GMT+1").replace("GMT", "UTC")
      return { line: `${c.opening} ${date}`, zone: `${zone} (${offset})` }
    } catch {
      return { line: `${c.opening} 15 December 2026, 12:00`, zone: "CET (UTC+1)" }
    }
  }, [locale, openAt, c])

  // compte à rebours en direct (seulement une fois monté, pour éviter un décalage serveur / navigateur)
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    const target = new Date(openAt).getTime()
    const tick = () => {
      const ms = target - Date.now()
      if (ms <= 0) {
        window.location.reload()
        return
      }
      setLeft(ms)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [openAt])
  const pad = (n: number) => String(n).padStart(2, "0")
  const parts =
    left === null
      ? null
      : (() => {
          const t = Math.floor(left / 1000)
          return [Math.floor(t / 86400), Math.floor((t % 86400) / 3600), Math.floor((t % 3600) / 60), t % 60]
        })()

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!password || passwordBusy) return
    setPasswordBusy(true)
    setPasswordError("")
    try {
      const res = await fetch("/api/check-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        setLeaving(true)
        window.setTimeout(() => window.location.reload(), 650)
        return
      }
      setPasswordError(res.status === 401 ? c.wrong : c.error)
    } catch {
      setPasswordError(c.error)
    }
    setPasswordBusy(false)
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    if (mailBusy) return
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setMailMessage({ text: c.invalid, ok: false })
      return
    }
    setMailBusy(true)
    setMailMessage(null)
    try {
      const res = await fetch("/api/launch-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, locale, website: trap }),
      })
      if (res.ok) {
        setEmail("")
        setMailMessage({ text: c.thanks, ok: true })
      } else {
        setMailMessage({ text: res.status === 400 ? c.invalid : c.error, ok: false })
      }
    } catch {
      setMailMessage({ text: c.error, ok: false })
    }
    setMailBusy(false)
  }

  return (
    <div
      className={`gate-root fixed inset-0 z-[2147483000] overflow-hidden ${leaving ? "gate-leaving" : ""}`}
      role="dialog"
      aria-modal="true"
    >
      <style>{GATE_CSS}</style>

      {/* Téléphone et iPad en portrait : une vidéo en boucle remplace l'image de fond */}
      <video
        className="gate-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/images/gate-video-poster.jpg"
        aria-hidden="true"
      >
        <source src="/videos/gate-bg.mp4" type="video/mp4" />
      </video>

      {/* assombrit le bas pour garder les champs lisibles */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[45%]"
        style={{ background: "linear-gradient(180deg, transparent, rgba(20,28,22,0.5))" }}
      />

      {/* Accès admin, très discret */}
      <a
        href="/auth/signin"
        className="absolute right-5 top-5 text-[10px] uppercase tracking-[0.28em] text-white/55 transition hover:text-white"
      >
        Admin
      </a>

      {/* Champs */}
      <main className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-6 pb-8">
        <div className="w-full max-w-[330px]">
          <form onSubmit={submitPassword} className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordError("")
              }}
              placeholder={c.password}
              aria-label={c.password}
              autoComplete="current-password"
              className="gate-field"
            />
            <button type="submit" className="gate-go" aria-label={c.enter} disabled={passwordBusy || !password}>
              <Arrow />
            </button>
          </form>
          <p className="mt-2 h-4 text-center text-[11px] tracking-wide text-white/85" aria-live="polite">
            {passwordError}
          </p>

          <p className="mb-3 mt-5 text-center text-[10px] uppercase tracking-[0.3em] text-white/80">{c.notify}</p>
          <form onSubmit={submitEmail} className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setMailMessage(null)
              }}
              placeholder={c.email}
              aria-label={c.email}
              autoComplete="email"
              inputMode="email"
              className="gate-field"
            />
            {/* piège anti-robots : invisible, doit rester vide */}
            <input
              type="text"
              name="website"
              value={trap}
              onChange={(e) => setTrap(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />
            <button type="submit" className="gate-go" aria-label={c.notify} disabled={mailBusy || !email}>
              <Arrow />
            </button>
          </form>
          <p
            className="mt-2 min-h-4 text-center text-[11px] leading-snug tracking-wide text-white/90"
            aria-live="polite"
          >
            {mailMessage?.text}
          </p>
        </div>
      </main>

      {/* Bande du milieu : texte d'ouverture + compte à rebours à gauche, logo à droite */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-between"
        style={{ top: "51%", transform: "translateY(-50%)", paddingLeft: "3vw", paddingRight: "3vw" }}
      >
        <div style={{ maxWidth: "52%", fontSize: "clamp(11px, 1.15vw + 7px, 17px)", fontWeight: 300, lineHeight: 1.5 }}>
          <p>{openingText.line}</p>
          <p className="text-white/85">{openingText.zone}</p>
          <p className="gate-num mt-3 text-[1.25em] tracking-wide" aria-live="off">
            {parts ? (
              <>
                {parts[0]}
                <span className="text-[0.7em] text-white/80"> {c.units[0]} </span>
                {pad(parts[1])}
                <span className="text-[0.7em] text-white/80"> {c.units[1]} </span>
                {pad(parts[2])}
                <span className="text-[0.7em] text-white/80"> {c.units[2]} </span>
                {pad(parts[3])}
                <span className="text-[0.7em] text-white/80"> {c.units[3]}</span>
              </>
            ) : (
              "\u00a0"
            )}
          </p>
          <p className="text-[0.75em] text-white/80">
            {c.countdown} · {openingText.zone}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/fysu-light.png"
          alt="FYSU"
          style={{ width: "clamp(84px, 22vw, 260px)", height: "auto" }}
          draggable={false}
        />
      </div>
    </div>
  )
}
