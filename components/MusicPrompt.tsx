"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Music, X } from "lucide-react"
import { useMusicPlayer, type PlayerAlbum } from "@/context/MusicPlayerContext"
import type { MusicTrack } from "@/lib/music"
import { useMusicCopy } from "@/lib/musicCopy"
import { getStoredCountry } from "@/lib/regions"

/* ====================================================================
   POP-UP « ÉCOUTER LA MUSIQUE DE CETTE COLLECTION ? »
   - apparaît sur les pages liées à un album (réglé dans Admin > Musique)
   - ne disparaît pas tout seul : il faut le fermer
   - il n'apparaît qu'UNE fois par visite, quelle que soit la collection : une fois la question posée
     (ou si de la musique est déjà chargée), il ne revient plus tant que la visite continue
   - si on refuse, il reste caché 24 h
   - il n'apparaît jamais en même temps que la pastille de musique : la pastille attend
     la réponse, puis apparaît
   ==================================================================== */

type PromptAlbum = {
  id: number
  slug: string
  title: string
  artist: string | null
  cover_url: string | null
}

const HIDE_HOURS = 24
const SEEN_KEY = "fysu-music-prompt-seen" // sessionStorage : la question a déjà été posée pendant cette visite
const REFUSED_KEY = "fysu-music-prompt-refused" // localStorage : refus (24 h)
const PROMPT_DELAY = 11000 // pause avant la question (ms) : la bienvenue passe d'abord

// Quelle collection / page est affichée ? (/thewave, /collections/xxx, /for-her…)
function slugFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length === 1) return parts[0]
  if (parts.length === 2 && parts[0] === "collections") return parts[1]
  return null
}

const RESERVED = new Set(["admin", "auth", "cart", "checkout", "success", "password", "profile", "music", "privacy"])

function alreadyHandled(): boolean {
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return true
    const raw = localStorage.getItem(REFUSED_KEY)
    return !!raw && Date.now() - Number(raw) < HIDE_HOURS * 3600 * 1000
  } catch {
    return false
  }
}

export default function MusicPrompt() {
  const pathname = usePathname()
  const copy = useMusicCopy()
  const { album: playingAlbum, prime, unprime } = useMusicPlayer()
  const [albums, setAlbums] = useState<PromptAlbum[]>([])
  const [slug, setSlug] = useState<string | null>(null)
  const [regionReady, setRegionReady] = useState(false)
  const [closed, setClosed] = useState(false)
  // true = la question a déjà été posée (ou refusée) : on ne la repose pas. null = pas encore lu.
  const [handled, setHandled] = useState<boolean | null>(null)
  const [primeData, setPrimeData] = useState<{ album: PlayerAlbum; tracks: MusicTrack[] } | null>(null)

  useEffect(() => {
    setHandled(alreadyHandled())
  }, [])

  // On attend que la zone soit choisie (le pop-up de région passe en premier)
  // puis on laisse passer le message de bienvenue avant de poser la question
  useEffect(() => {
    let timer: number | undefined
    const check = () => {
      if (!getStoredCountry() || timer) return
      timer = window.setTimeout(() => setRegionReady(true), PROMPT_DELAY)
    }
    check()
    window.addEventListener("region-done", check)
    return () => {
      window.removeEventListener("region-done", check)
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const s = slugFromPath(pathname)
    setClosed(false)
    setAlbums([])
    setPrimeData(null)
    if (!s || (parts1(pathname) && RESERVED.has(s))) {
      setSlug(null)
      unprime()
      return
    }
    setSlug(s)

    let cancelled = false
    fetch(`/api/music?collection=${encodeURIComponent(s)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(async (data) => {
        if (cancelled) return
        const list: PromptAlbum[] = Array.isArray(data) ? data : []
        setAlbums(list)
        if (list.length === 0) {
          unprime()
          return
        }
        // la pastille de musique apparaît (en pause) sur chaque page qui a de la musique
        try {
          const res = await fetch(`/api/music?slug=${encodeURIComponent(list[0].slug)}`)
          if (!res.ok || cancelled) return
          const full = await res.json()
          if (cancelled) return
          // la pastille est préparée ici, mais affichée seulement quand la question a été réglée
          setPrimeData({
            album: {
              id: full.id,
              slug: full.slug,
              title: full.title,
              artist: full.artist,
              cover_url: full.cover_url,
              brand: full.brand,
            },
            tracks: full.tracks ?? [],
          })
        } catch {
          /* pas de pastille */
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [pathname, unprime])

  // accepted = vrai quand on clique sur « Oui » : plus de question pendant la visite.
  // Sinon (« Non » ou croix) : plus de question non plus, et on attend 24 h avant la prochaine visite.
  function close(accepted = false) {
    setClosed(true)
    setHandled(true)
    try {
      sessionStorage.setItem(SEEN_KEY, "1")
      if (!accepted) localStorage.setItem(REFUSED_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
  }

  // Mode concentration (accessibilité) : pas de pop-up
  const focusMode =
    typeof document !== "undefined" && document.documentElement.classList.contains("a11y-focus")
  // De la musique est déjà chargée (pastille présente) : on ne pose pas la question
  const musicLoaded = Boolean(playingAlbum)
  const visible =
    regionReady && handled === false && !closed && albums.length > 0 && !musicLoaded && !focusMode

  // La question est posée une seule fois par visite : on le note dès qu'elle apparaît
  useEffect(() => {
    if (!visible) return
    try {
      sessionStorage.setItem(SEEN_KEY, "1")
    } catch {
      /* ignore */
    }
  }, [visible])

  // La pastille de musique n'apparaît que lorsqu'il n'y a plus de question à poser
  useEffect(() => {
    if (!primeData || handled === null) return
    if (handled === false && !focusMode) return
    prime(primeData.album, primeData.tracks)
  }, [primeData, handled, focusMode, prime])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={slug}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.3 }}
          role="dialog"
          aria-label={copy.promptTitle}
          className="fixed inset-x-0 z-[58] flex justify-center px-3"
          style={{ bottom: "calc(88px + env(safe-area-inset-bottom))", pointerEvents: "none" }}
        >
          <div
            className="liquid-glass relative w-full max-w-[420px] rounded-[28px] p-4 pr-12"
            style={{ color: "var(--menu)", pointerEvents: "auto" }}
          >
            <button
              type="button"
              onClick={() => close()}
              aria-label={copy.close}
              className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-current/10"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 text-sm font-medium">
              <Music size={16} />
              <span>{albums.length > 1 ? copy.promptTitleMany : copy.promptTitle}</span>
            </div>

            {albums.length === 1 ? (
              <div className="mt-3 flex items-center gap-3">
                <Link
                  href={`/music/${albums[0].slug}`}
                  onClick={() => close(true)}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  {albums[0].cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={albums[0].cover_url}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-current/10">
                      <Music size={20} />
                    </span>
                  )}
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[13px] font-medium">{albums[0].title}</span>
                    {albums[0].artist && (
                      <span className="block truncate text-[11px] opacity-70">{albums[0].artist}</span>
                    )}
                  </span>
                </Link>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => close()}
                    className="cursor-pointer rounded-full px-3 py-2 text-xs opacity-70"
                  >
                    {copy.no}
                  </button>
                  <Link
                    href={`/music/${albums[0].slug}`}
                    onClick={() => close(true)}
                    className="rounded-full bg-current px-4 py-2 text-xs font-medium"
                  >
                    <span style={{ color: "var(--navbar-bg, #fff)" }}>{copy.yes}</span>
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
                {albums.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/music/${a.slug}`}
                      onClick={() => close(true)}
                      className="flex items-center gap-3 rounded-2xl p-1.5 hover:bg-current/10"
                    >
                      {a.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.cover_url}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-current/10">
                          <Music size={18} />
                        </span>
                      )}
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-[13px] font-medium">{a.title}</span>
                        {a.artist && (
                          <span className="block truncate text-[11px] opacity-70">{a.artist}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// vrai si l'adresse n'a qu'un seul morceau (/xxx)
function parts1(pathname: string) {
  return pathname.split("/").filter(Boolean).length === 1
}
