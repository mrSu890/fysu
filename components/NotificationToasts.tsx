"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion, type PanInfo } from "framer-motion"
import { useLocale, useMessages } from "next-intl"
import { ArrowUpRight, X } from "lucide-react"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getConsent } from "@/lib/cookieConsent"

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

// Langues ajoutées ensuite : les textes viennent du fichier messages/<langue>.json
function fromMessages(m?: Record<string, string>): Copy | null {
  if (!m) return null
  return {
    welcomeLabel: m.welcomeLabel,
    welcomeText: m.welcomeText,
    backLabel: m.backLabel,
    backText: (n) => (n ? m.backText.replace("{name}", n) : m.backTextAnon),
    shippingLabel: m.shippingLabel,
    shippingText: m.shippingText,
    signupLabel: m.signupLabel,
    signupText: m.signupText,
    signupYes: m.signupYes,
    signupNo: m.signupNo,
    close: m.close,
  }
}

/* ====== RYTHME ====== */

const WELCOME_DELAY = 3500 // pause après le choix de zone, avant la bienvenue (ms)
const WELCOME_VISIBLE = 6500 // durée d'affichage (ms)
const SHIPPING_GAP = 14000 // silence avant la livraison offerte
const SHIPPING_VISIBLE = 8000
const SIGNUP_GAP = 18000 // silence avant la question d'inscription
const SIGNUP_VISIBLE = 20000

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

// Mémoire "pour cette visite" (elle s'efface quand on ferme l'onglet)
const readSession = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const writeSession = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value)
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


/* ====== BLOC D'INSCRIPTION : grand bloc rouge vif en verre, beaucoup d'air ====== */

// verre rouge « à plat » : flou doux derrière, aucun reflet ni liseré
const RED_GLASS = {
  background: "rgba(214, 0, 28, 0.9)",
  WebkitBackdropFilter: "blur(18px) saturate(150%)",
  backdropFilter: "blur(18px) saturate(150%)",
  boxShadow: "0 16px 44px rgba(0, 0, 0, 0.22)",
  color: "#ffffff",
} as React.CSSProperties

function SignupBlock({
  label,
  text,
  yes,
  no,
  onClose,
  closeLabel,
}: {
  label: string
  text: string
  yes: string
  no: string
  onClose: () => void
  closeLabel: string
}) {
  const row =
    "group flex items-center justify-between border-t border-white/35 py-4 text-left font-info text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 hover:bg-white hover:text-[#d6001c] active:bg-white active:text-[#d6001c] px-0 hover:px-3"
  return (
    <motion.div
      role="dialog"
      aria-label={text}
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 48 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={RED_GLASS}
      className="pointer-events-auto fixed right-3 top-[88px] z-40 flex h-[min(60dvh,480px)] w-[min(80vw,330px)] flex-col justify-between overflow-hidden rounded-[4px] p-5"
    >
      <div className="flex items-start justify-between">
        <p className="font-info text-[10px] uppercase tracking-[0.3em] opacity-90">{label}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center bg-white text-[#d6001c] transition-transform active:scale-95"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <p className="text-[30px] font-bold leading-[1.05] tracking-tight" style={{ color: "#ffffff" }}>
        {text}
      </p>

      <div>
        <Link href="/auth/signin" onClick={onClose} className={row} style={{ color: "inherit" }}>
          <span>{yes}</span>
          <ArrowUpRight size={16} strokeWidth={1.5} />
        </Link>
        <Link href="/auth/signup" onClick={onClose} className={row + " border-b"} style={{ color: "inherit" }}>
          <span>{no}</span>
          <ArrowUpRight size={16} strokeWidth={1.5} />
        </Link>
      </div>
    </motion.div>
  )
}

/* ====== ENSEMBLE ====== */

export default function NotificationToasts() {
  const locale = useLocale()
  const messages = useMessages() as { Toasts?: Record<string, string> }
  const copy = COPY[locale] ?? fromMessages(messages.Toasts) ?? COPY.en
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

    // On attend la fin de l'écran de chargement (et le choix de la zone)
    const waitLoader = () =>
      new Promise<void>((resolve) => {
        if ((window as any).__siteLoaderDone) return resolve()
        const done = () => {
          window.removeEventListener("site-loader-done", done)
          resolve()
        }
        window.addEventListener("site-loader-done", done)
        timers.push(window.setTimeout(done, 300000)) // sécurité (le choix de zone peut prendre du temps)
      })

    // Les notifications suivantes attendent que le choix des cookies soit fait
    // (au plus 60 s, pour ne jamais bloquer)
    const waitCookies = () =>
      new Promise<void>((resolve) => {
        if (getConsent()) return resolve()
        const done = () => {
          window.removeEventListener("cookie-consent-changed", done)
          resolve()
        }
        window.addEventListener("cookie-consent-changed", done)
        timers.push(window.setTimeout(done, 60000))
      })

    const waitUser = async () => {
      for (let i = 0; i < 20 && userRef.current.loading; i++) {
        await sleep(150)
      }
    }

    // Mode concentration (accessibilité) : aucune notification
    const isExcluded = () =>
      EXCLUDED.some((p) => pathRef.current.startsWith(p)) ||
      document.documentElement.classList.contains("a11y-focus")

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

    // Le message de bienvenue : une seule fois par visite
    const welcomeOk = () => readSession("fysu:toast:welcome") !== "1"

    const shippingOk = () => readStore("fysu:toast:shipping") !== todayKey()

    const signupOk = () => {
      if (userRef.current.user) return false
      const last = Number(readStore("fysu:toast:signup") || 0)
      return Date.now() - last > 7 * 24 * 3600 * 1000
    }

    const run = async () => {
      await waitLoader()
      await sleep(WELCOME_DELAY)
      if (cancelled) return

      // 1. Bienvenue (une fois par visite)
      await waitUser()
      if (cancelled) return
      if (!isExcluded() && welcomeOk()) {
        writeSession("fysu:toast:welcome", "1")
        await show("welcome", WELCOME_VISIBLE)
        await sleep(600)
      }

      // 2. Livraison offerte (une fois par jour)
      if (!cancelled && shippingOk()) {
        await sleep(SHIPPING_GAP)
        await waitCookies()
        await sleep(3000)
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
        await waitCookies()
        await sleep(3000)
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

  // la question d'inscription se ferme dès qu'on change de page (clic sur un de ses choix, retour…)
  const toastRef = useRef<ToastId | null>(null)
  toastRef.current = toast
  useEffect(() => {
    if (toastRef.current === "signup") dismissRef.current?.()
  }, [pathname])

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

        </AnimatePresence>
      </div>

      {/* GRAND BLOC ROUGE : la question d'inscription */}
      <AnimatePresence>
        {toast === "signup" && (
          <SignupBlock
            key="signup"
            label={copy.signupLabel}
            text={copy.signupText}
            yes={copy.signupYes}
            no={copy.signupNo}
            onClose={close}
            closeLabel={copy.close}
          />
        )}
      </AnimatePresence>

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
