"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, Music, Search, X } from "lucide-react"
import { useLocale } from "next-intl"
import { useCart } from "@/context/CartContext"

/* ====================================================================
   RECHERCHE : s'ouvre avec la loupe de la barre de navigation
   Propose au fur et à mesure : produits, pages et collections, projets (albums),
   et fonctionnalités du site (compte, panier, langue, accessibilité…).
   ==================================================================== */

type Product = { id: number; name: string; slug: string; price: number; image: string | null }
type Entry = { title: string; slug: string }
type Album = { title: string; slug: string; artist: string | null; cover_url: string | null }
type Results = { products: Product[]; pages: Entry[]; collections: Entry[]; albums: Album[] }

const EMPTY: Results = { products: [], pages: [], collections: [], albums: [] }

/* ---------- textes (en / fr / nl / ja ; les autres langues : anglais) ---------- */

type Copy = {
  label: string
  placeholder: string
  close: string
  products: string
  pages: string
  projects: string
  features: string
  suggestions: string
  none: (q: string) => string
  loading: string
}

const COPY: Record<string, Copy> = {
  en: {
    label: "Search",
    placeholder: "Search the site…",
    close: "Close",
    products: "Products",
    pages: "Pages and collections",
    projects: "Projects",
    features: "Features",
    suggestions: "Suggestions",
    none: (q) => `Nothing found for “${q}”.`,
    loading: "Searching…",
  },
  fr: {
    label: "Rechercher",
    placeholder: "Rechercher sur le site…",
    close: "Fermer",
    products: "Produits",
    pages: "Pages et collections",
    projects: "Projets",
    features: "Fonctionnalités",
    suggestions: "Suggestions",
    none: (q) => `Aucun résultat pour « ${q} ».`,
    loading: "Recherche…",
  },
  nl: {
    label: "Zoeken",
    placeholder: "Zoek op de site…",
    close: "Sluiten",
    products: "Producten",
    pages: "Pagina's en collecties",
    projects: "Projecten",
    features: "Functies",
    suggestions: "Suggesties",
    none: (q) => `Niets gevonden voor “${q}”.`,
    loading: "Zoeken…",
  },
  ja: {
    label: "検索",
    placeholder: "サイト内を検索…",
    close: "閉じる",
    products: "商品",
    pages: "ページとコレクション",
    projects: "プロジェクト",
    features: "機能",
    suggestions: "おすすめ",
    none: (q) => `「${q}」は見つかりませんでした。`,
    loading: "検索中…",
  },
}

export function searchLabel(locale: string) {
  return (COPY[locale] ?? COPY.en).label
}

/* ---------- fonctionnalités du site ---------- */

type Feature = {
  id: string
  labels: Record<string, string>
  keys: string // mots qui doivent aussi trouver cette fonctionnalité (toutes langues)
  href?: string
}

const FEATURES: Feature[] = [
  {
    id: "account",
    labels: { en: "My fysu (account)", fr: "Mon fysu (compte)", nl: "Mijn fysu (account)", ja: "マイfysu（アカウント）" },
    keys: "account compte profile profil login log in connexion se connecter sign in inscription sign up account orders commandes bestellingen",
    href: "/profile",
  },
  {
    id: "cart",
    labels: { en: "Cart", fr: "Panier", nl: "Winkelmand", ja: "カート" },
    keys: "cart basket panier winkelmand checkout commande acheter buy",
  },
  {
    id: "music",
    labels: { en: "Music", fr: "Musique", nl: "Muziek", ja: "音楽" },
    keys: "music musique muziek albums songs sons playlist vinyl vinyle",
    href: "/music",
  },
  {
    id: "region",
    labels: {
      en: "Country and language",
      fr: "Pays et langue",
      nl: "Land en taal",
      ja: "国と言語",
    },
    keys: "country language langue pays region zone taal land livraison shipping delivery",
  },
  {
    id: "access",
    labels: { en: "Accessibility", fr: "Accessibilité", nl: "Toegankelijkheid", ja: "アクセシビリティ" },
    keys: "accessibility accessibilite taille texte text size contrast contraste adhd tdah dyslexia dyslexie concentration focus",
  },
  {
    id: "about",
    labels: { en: "About", fr: "À propos", nl: "Over ons", ja: "概要" },
    keys: "about a propos over ons story histoire brand marque contact",
    href: "/about",
  },
  {
    id: "privacy",
    labels: { en: "Privacy policy", fr: "Politique de confidentialité", nl: "Privacybeleid", ja: "プライバシーポリシー" },
    keys: "privacy confidentialite privacy policy cookies donnees data vie privee",
    href: "/privacy",
  },
]

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

/* ---------- une ligne de résultat ---------- */

type Item = {
  key: string
  label: string
  sub?: string
  image?: string | null
  href?: string
  action?: () => void
  icon?: "arrow" | "music"
}

function Row({ item, onGo }: { item: Item; onGo: (item: Item) => void }) {
  const inner = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-current/10">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        ) : item.icon === "music" ? (
          <Music size={18} className="opacity-60" />
        ) : (
          <ArrowUpRight size={18} className="opacity-50" />
        )}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[15px]">{item.label}</span>
        {item.sub && <span className="mt-0.5 block truncate text-xs opacity-60">{item.sub}</span>}
      </span>
    </>
  )

  const cls =
    "flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-current/10 active:bg-current/15"

  return item.href ? (
    <Link href={item.href} onClick={() => onGo(item)} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={() => onGo(item)} className={cls}>
      {inner}
    </button>
  )
}

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const locale = useLocale()
  const router = useRouter()
  const { setIsCartOpen } = useCart()
  const copy = COPY[locale] ?? COPY.en

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Results>(EMPTY)
  // pages de marque masquées dans l'admin : on ne les propose plus dans la recherche
  const [brandHidden, setBrandHidden] = useState<{ kiban: boolean; wave: boolean }>({ kiban: false, wave: false })
  useEffect(() => {
    fetch("/api/collectionPages?visibility=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d === "object") setBrandHidden({ kiban: d.kibanCollector === false, wave: d.thewave === false })
      })
      .catch(() => {})
  }, [])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // ouverture : champ vidé, clavier prêt, fond bloqué, Échap
  useEffect(() => {
    if (!open) return
    setQuery("")
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = "hidden"
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 120)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      html.style.overflow = prev
      window.clearTimeout(focusTimer)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  // recherche au fur et à mesure (petit délai pour ne pas surcharger)
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : EMPTY))
        .then((data) => setResults({ ...EMPTY, ...data }))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, query ? 180 : 0)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query, open])

  const go = (item: Item) => {
    onClose()
    if (item.action) item.action()
    else if (item.href && !item.href.startsWith("/")) router.push(item.href)
  }

  const actions: Record<string, () => void> = {
    cart: () => setIsCartOpen(true),
    region: () => window.dispatchEvent(new Event("open-region-picker")),
    access: () => window.dispatchEvent(new Event("open-accessibility")),
  }

  const groups = useMemo(() => {
    const q = norm(query.trim())
    const has = q.length > 0

    const products: Item[] = results.products.map((p) => ({
      key: `p-${p.id}`,
      label: p.name,
      sub: `${p.price} EUR`,
      image: p.image,
      href: `/product/${p.slug}`,
    }))

    // pages (+ les deux pages de marque, qui ne sont pas dans la liste)
    const brandPages: Entry[] = [
      { title: "Kiban Collector", slug: "kiban-collector" },
      { title: "The Wave", slug: "thewave" },
    ]
      .filter((b) => !(b.slug === "kiban-collector" && brandHidden.kiban) && !(b.slug === "thewave" && brandHidden.wave))
      .filter((b) => !has || norm(b.title).includes(q))
    const pageEntries: Entry[] = [...results.pages, ...brandPages].filter(
      (p, i, all) => all.findIndex((x) => x.slug === p.slug) === i
    )
    const pages: Item[] = [
      ...pageEntries.map((p) => ({ key: `pg-${p.slug}`, label: p.title, href: `/${p.slug}` })),
      ...results.collections.map((c) => ({
        key: `c-${c.slug}`,
        label: c.title,
        href: `/collections/${c.slug}`,
      })),
    ]

    const projects: Item[] = results.albums.map((a) => ({
      key: `a-${a.slug}`,
      label: a.title,
      sub: a.artist ?? undefined,
      image: a.cover_url,
      href: `/music/${a.slug}`,
      icon: "music" as const,
    }))

    const features: Item[] = FEATURES.filter((f) => {
      if (!has) return false
      const hay = norm(`${Object.values(f.labels).join(" ")} ${f.keys}`)
      return q.split(" ").every((word) => hay.includes(word))
    }).map((f) => ({
      key: `f-${f.id}`,
      label: f.labels[locale] ?? f.labels.en,
      href: f.href,
      action: actions[f.id],
    }))

    return [
      { id: "products", title: copy.products, items: products },
      { id: "pages", title: copy.pages, items: pages },
      { id: "projects", title: copy.projects, items: projects },
      { id: "features", title: copy.features, items: features },
    ].filter((g) => g.items.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, query, locale, brandHidden])

  const flat = groups.flatMap((g) => g.items)

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || flat.length === 0) return
    const first = flat[0]
    if (first.href) router.push(first.href)
    go(first)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="search"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80]"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
          }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={copy.label}
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-2 flex max-h-[88dvh] w-11/12 max-w-2xl flex-col overflow-hidden rounded-[28px] shadow-2xl"
            style={{
              background: "var(--background)",
              color: "var(--foreground)",
              marginTop: "calc(8px + env(safe-area-inset-top))",
            }}
          >
            {/* champ de recherche */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid color-mix(in srgb, currentColor 14%, transparent)" }}
            >
              <Search size={20} className="shrink-0 opacity-60" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onEnter}
                placeholder={copy.placeholder}
                aria-label={copy.label}
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:opacity-50"
                style={{ fontSize: 16 }}
              />
              <button
                type="button"
                onClick={onClose}
                aria-label={copy.close}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full active:scale-95"
                style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* résultats */}
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              {!query.trim() && flat.length > 0 && (
                <p className="px-3 pb-1 text-[11px] uppercase tracking-[0.2em] opacity-50">
                  {copy.suggestions}
                </p>
              )}

              {groups.map((group) => (
                <section key={group.id} className="mb-3">
                  <h3 className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-[0.2em] opacity-50">
                    {group.title}
                  </h3>
                  {group.items.map((item) => (
                    <Row key={item.key} item={item} onGo={go} />
                  ))}
                </section>
              ))}

              {flat.length === 0 && (
                <p className="px-4 py-10 text-center text-sm opacity-60">
                  {loading ? copy.loading : query.trim() ? copy.none(query.trim()) : ""}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
