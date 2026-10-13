"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale } from "next-intl"
import { BACK, FRONT, GATE_CSS, type Item } from "./PreLaunchPlants"

/* ====================================================================
   PAGE D'ATTENTE : vitre semi-transparente, plantes floues derrière, mot de passe + e-mail.
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
  },
}

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function Rail({ items, top, thickness }: { items: Item[]; top: string; thickness: number }) {
  return (
    <div aria-hidden="true" className="absolute inset-x-0" style={{ top }}>
      <div className="gate-rail" style={{ height: thickness, top: -thickness, opacity: 0.55, filter: "blur(1.5px)" }} />
      {items.map((g, i) => (
        <div
          key={i}
          className="gate-item"
          style={{ left: g.left, height: g.height, aspectRatio: String(g.ratio), opacity: g.opacity, filter: `blur(${g.blur}px)` }}
        >
          <div
            className="gate-swinger"
            style={
              {
                width: "100%",
                height: "100%",
                transformOrigin: "50% 0",
                "--swing": g.swing,
                animation: `gate-swing ${g.sway}s ease-in-out ${g.delay}s infinite`,
              } as React.CSSProperties
            }
            dangerouslySetInnerHTML={{ __html: g.svg }}
          />
        </div>
      ))}
    </div>
  )
}

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
      return `${c.opening} ${date} ${zone} (${offset})`
    } catch {
      return `${c.opening} 15 December 2026, 12:00 CET (UTC+1)`
    }
  }, [locale, openAt, c])

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

      {/* Deux tringles de vêtements, derrière la vitre (celle du fond plus floue) */}
      <Rail items={BACK} top="15vh" thickness={2} />
      <Rail items={FRONT} top="22vh" thickness={3} />

      {/* La vitre */}
      <div aria-hidden="true" className="gate-glass absolute inset-0" />
      <div aria-hidden="true" className="gate-grain absolute inset-0" />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-[34%] w-px"
        style={{ background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.28), transparent)" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-[67%] w-px"
        style={{ background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.2), transparent)" }}
      />
      {/* assombrit légèrement le bas pour que le logo blanc reste lisible */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[42%]"
        style={{ background: "linear-gradient(180deg, transparent, rgba(24,38,28,0.42))" }}
      />

      {/* Accès admin, très discret */}
      <a
        href="/auth/signin"
        className="absolute right-5 top-5 text-[10px] uppercase tracking-[0.28em] text-white/55 transition hover:text-white"
      >
        Admin
      </a>

      {/* Champs */}
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-6 pb-28">
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

          <p className="mb-3 mt-9 text-center text-[10px] uppercase tracking-[0.3em] text-white/80">{c.notify}</p>
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

      {/* Logo et date d'ouverture, en bas au centre */}
      <footer className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-6 pb-9 text-center sm:pb-11">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/fysu-light.png"
          alt="FYSU"
          style={{ width: "clamp(78px, 12vw, 108px)", height: "auto" }}
          draggable={false}
        />
        <p className="mt-9 text-[10px] uppercase leading-relaxed tracking-[0.22em] text-white/85 sm:text-[11px]">
          {openingText}
        </p>
      </footer>
    </div>
  )
}
