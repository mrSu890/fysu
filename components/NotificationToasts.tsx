"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion, type PanInfo } from "framer-motion"
import { useLocale } from "next-intl"
import { X } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"

/* ====== TEXTES (faciles à modifier) ====== */

type Copy = {
  welcomeLabel: string
  welcomeText: string
  backLabel: string
  backText: (name: string | null) => string
  shippingLabel: string
  shippingText: string
  signupLabel: string
  signupText: string
  signupYes: string
  signupNo: string
  close: string
}

const COPY: Record<string, Copy> = {
  en: {
    welcomeLabel: "Welcome",
    welcomeText: "Hi there, make yourself at home.",
    backLabel: "Welcome back",
    backText: (n) =>
      n ? `Good to see you again, ${n}.` : "Good to see you again.",
    shippingLabel: "A little something",
    shippingText: "Delivery is on us from €150 of shopping.",
    signupLabel: "Quick question",
    signupText: "Have you already joined Fysu?",
    signupYes: "I have an account",
    signupNo: "Not yet, let's do it",
    close: "Close",
  },
  fr: {
    welcomeLabel: "Bienvenue",
    welcomeText: "Bienvenue chez Fysu, faites comme chez vous.",
    backLabel: "Content de vous revoir",
    backText: (n) =>
      n ? `Ravis de vous retrouver, ${n}.` : "Ravis de vous retrouver.",
    shippingLabel: "Petit plaisir",
    shippingText: "La livraison est offerte dès 150 € d'achats.",
    signupLabel: "Petite question",
    signupText: "Avez-vous déjà rejoint Fysu ?",
    signupYes: "J'ai déjà un compte",
    signupNo: "Pas encore, avec plaisir",
    close: "Fermer",
  },
  nl: {
    welcomeLabel: "Welkom",
    welcomeText: "Welkom bij Fysu, voel je thuis.",
    backLabel: "Fijn dat je er weer bent",
    backText: (n) => (n ? `Leuk je weer te zien, ${n}.` : "Leuk je weer te zien."),
    shippingLabel: "Een klein cadeautje",
    shippingText: "Vanaf €150 betaal je geen verzendkosten.",
    signupLabel: "Even een vraagje",
    signupText: "Heb je je al bij Fysu aangemeld?",
    signupYes: "Ik heb al een account",
    signupNo: "Nog niet, ik doe mee",
    close: "Sluiten",
  },
  ja: {
    welcomeLabel: "ようこそ",
    welcomeText: "Fysuへようこそ。ゆっくりご覧ください。",
    backLabel: "おかえりなさい",
    backText: (n) =>
      n ? `${n}さん、またお会いできて嬉しいです。` : "またお会いできて嬉しいです。",
    shippingLabel: "ささやかなお知らせ",
    shippingText: "150€以上のお買い物で、送料は無料です。",
    signupLabel: "ひとつだけ",
    signupText: "すでにFysuに登録されていますか？",
    signupYes: "登録済みです",
    signupNo: "まだです、登録します",
    close: "閉じる",
  },
}

/* ====== RYTHME ====== */

const WELCOME_VISIBLE = 6500 // durée d'affichage (ms)
const SHIPPING_GAP = 14000 // silence avant la livraison offerte
const SHIPPING_VISIBLE = 8000
const SIGNUP_GAP = 18000 // silence avant la question d'inscription
const SIGNUP_VISIBLE = 12000

const EXCLUDED = ["/admin", "/checkout", "/success", "/auth", "/password"]

type ToastId = "welcome" | "shipping" | "signup"

/* ====== PETITES FONCTIONS ====== */

const readStore = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStore = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

const todayKey = () => new Date().toISOString().slice(0, 10)

/* ====== CARTE DE NOTIFICATION ====== */

const SAGE = {
  "--glass-color": "#93ad8e",
  "--navbar-bg": "#93ad8e",
  "--glass-tint": "62%",
  color: "#1e2b1b",
} as React.CSSProperties

const GREY = {
  "--glass-color": "#b9bdc1",
  "--navbar-bg": "#b9bdc1",
  "--glass-tint": "62%",
  color: "#262626",
} as React.CSSProperties

function ToastCard({
  position,
  label,
  text,
  onClose,
  closeLabel,
  children,
}: {
  position: "top" | "bottom"
  label: string
  text: string
  onClose: () => void
  closeLabel: string
  children?: React.ReactNode
}) {
  const isTop = position === "top"
  const offset = isTop ? -28 : 28

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (isTop && (info.offset.y < -30 || info.velocity.y < -300)) onClose()
    if (!isTop && (info.offset.y > 30 || info.velocity.y > 300)) onClose()
  }

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: offset, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: offset, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.5}
      onDragEnd={onDragEnd}
      style={isTop ? SAGE : GREY}
      className="pointer-events-auto relative liquid-glass w-full max-w-md rounded-[26px] px-4 py-3 touch-pan-x"
    >
      <div className="flex items-center gap-3">
        {/* Point : blanc en haut, rouge en bas */}
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: isTop ? "#ffffff" : "#ff3b57" }}
        />

        <div className="min-w-0 flex-1">
          <p className="text-[11px] leading-tight opacity-70">{label}</p>
          <p className="mt-0.5 text-[15px] leading-snug">{text}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/10"
        >
          <X size={13} />
        </button>
      </div>

      {children}
    </motion.div>
  )
}

/* ====== ENSEMBLE ====== */

export default function NotificationToasts() {
  const locale = useLocale()
  const copy = COPY[locale] ?? COPY.en
  const pathname = usePathname()
  const { user, profile, loading } = useCurrentUser()

  const [toast, setToast] = useState<ToastId | null>(null)

  const dismissRef = useRef<(() => void) | null>(null)
  const pathRef = useRef(pathname)
  const userRef = useRef({ user, profile, loading })

  pathRef.current = pathname
  userRef.current = { user, profile, loading }

  useEffect(() => {
    let cancelled = false
    const timers: number[] = []

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms))
      })

    // On attend la fin de l'écran de chargement
    const waitLoader = () =>
      new Promise<void>((resolve) => {
        if ((window as any).__siteLoaderDone) return resolve()
        const done = () => {
          window.removeEventListener("site-loader-done", done)
          resolve()
        }
        window.addEventListener("site-loader-done", done)
        timers.push(window.setTimeout(done, 6000)) // sécurité
      })

    const waitUser = async () => {
      for (let i = 0; i < 20 && userRef.current.loading; i++) {
        await sleep(150)
      }
    }

    const isExcluded = () =>
      EXCLUDED.some((p) => pathRef.current.startsWith(p))

    const show = (id: ToastId, visibleMs: number) =>
      new Promise<void>((resolve) => {
        setToast(id)
        const timer = window.setTimeout(() => finish(), visibleMs)
        timers.push(timer)
        function finish() {
          window.clearTimeout(timer)
          dismissRef.current = null
          setToast(null)
          resolve()
        }
        dismissRef.current = finish
      })

    const shippingOk = () => readStore("fysu:toast:shipping") !== todayKey()

    const signupOk = () => {
      if (userRef.current.user) return false
      const last = Number(readStore("fysu:toast:signup") || 0)
      return Date.now() - last > 7 * 24 * 3600 * 1000
    }

    const run = async () => {
      await waitLoader()
      await sleep(800)
      if (cancelled) return

      // 1. Bienvenue (toujours)
      await waitUser()
      if (cancelled) return
      if (!isExcluded()) {
        await show("welcome", WELCOME_VISIBLE)
        await sleep(600)
      }

      // 2. Livraison offerte (une fois par jour)
      if (!cancelled && shippingOk()) {
        await sleep(SHIPPING_GAP)
        if (cancelled) return
        if (!isExcluded() && shippingOk()) {
          writeStore("fysu:toast:shipping", todayKey())
          await show("shipping", SHIPPING_VISIBLE)
          await sleep(600)
        }
      }

      // 3. Inscription (si pas connecté, pas plus d'une fois par semaine)
      if (!cancelled && signupOk()) {
        await sleep(SIGNUP_GAP)
        if (cancelled) return
        if (!isExcluded() && signupOk()) {
          writeStore("fysu:toast:signup", String(Date.now()))
          await show("signup", SIGNUP_VISIBLE)
        }
      }
    }

    run()

    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  const close = () => dismissRef.current?.()

  const firstName = (
    profile?.name ??
    user?.user_metadata?.name ??
    ""
  )
    .toString()
    .trim()
    .split(" ")[0]

  return (
    <>
      {/* HAUT : verre sauge */}
      <div className="pointer-events-none fixed inset-x-0 top-[68px] z-40 flex justify-center px-4">
        <AnimatePresence mode="wait">
          {toast === "welcome" && (
            <ToastCard
              key="welcome"
              position="top"
              label={user ? copy.backLabel : copy.welcomeLabel}
              text={user ? copy.backText(firstName || null) : copy.welcomeText}
              onClose={close}
              closeLabel={copy.close}
            />
          )}

          {toast === "signup" && (
            <ToastCard
              key="signup"
              position="top"
              label={copy.signupLabel}
              text={copy.signupText}
              onClose={close}
              closeLabel={copy.close}
            >
              <div className="mt-3 flex flex-wrap gap-2 pl-[22px]">
                <Link
                  href="/auth/signin"
                  onClick={close}
                  style={{ color: "#1e2b1b" }}
                  className="rounded-full bg-black/10 px-3 py-1.5 text-xs"
                >
                  {copy.signupYes}
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={close}
                  style={{ color: "#ffffff" }}
                  className="rounded-full bg-[#2f4a2b] px-3 py-1.5 text-xs"
                >
                  {copy.signupNo}
                </Link>
              </div>
            </ToastCard>
          )}
        </AnimatePresence>
      </div>

      {/* BAS : gris clair */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-40 flex justify-end px-4">
        <AnimatePresence>
          {toast === "shipping" && (
            <ToastCard
              key="shipping"
              position="bottom"
              label={copy.shippingLabel}
              text={copy.shippingText}
              onClose={close}
              closeLabel={copy.close}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
