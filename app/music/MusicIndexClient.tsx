"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Music } from "lucide-react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { useMusicCopy } from "@/lib/musicCopy"
import SectionTitle from "@/components/SectionTitle"

/* ====================================================================
   TOUS LES ALBUMS
   Classés par page / collection : un album qui appartient à plusieurs pages
   apparaît dans chacune. Les albums sans page sont à la fin.
   ==================================================================== */

type Collection = { slug: string; href: string; title: string }

type AlbumCard = {
  id: number
  slug: string
  title: string
  artist: string | null
  cover_url: string | null
  track_count: number
  collections?: Collection[]
}

type Group = { key: string; title: string; href: string | null; albums: AlbumCard[] }

const FIRST = ["thewave", "kiban-collector"]


/* Une pile de pochettes en perspective : celle de devant est à plat, les autres s'étagent derrière.
   Glisser vers la gauche = album suivant, vers la droite = album précédent. Toucher la pochette de devant l'ouvre. */
function openAlbum(e: React.MouseEvent<HTMLAnchorElement>, slug: string, wave: boolean) {
  // la pochette est « transportée » jusqu'à la page de l'album (voir components/ProductHero.tsx) ; The Wave garde son rideau d'eau
  try {
    if (wave) return
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const box = e.currentTarget.querySelector("[data-hero-box]") as HTMLElement | null
    const img = box?.querySelector("img") as HTMLImageElement | null
    const hero = (window as unknown as { __fysuHero?: (el: HTMLElement | null, p: string, src: string | null) => boolean }).__fysuHero
    if (hero && box && img?.currentSrc && hero(box, `/music/${slug}`, img.currentSrc)) e.preventDefault()
  } catch {}
}

function AlbumStack({ groupKey, albums }: { groupKey: string; albums: AlbumCard[] }) {
  const n = albums.length
  const [active, setActive] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; id: number; locked: boolean; t: number } | null>(null)
  const moved = useRef(false)
  const STEP = 220 // pixels de glissement pour passer d'un album à l'autre

  const clamp = (v: number) => Math.max(0, Math.min(n - 1, v))
  const pos = active - dragX / STEP // position continue (pendant le glissement)

  const onDown = (e: React.PointerEvent) => {
    if (n < 2) return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, locked: false, t: performance.now() }
    moved.current = false
  }
  const onMove = (e: React.PointerEvent) => {
    const s = start.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (!s.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      if (Math.abs(dy) > Math.abs(dx)) {
        start.current = null // geste vertical : la page défile
        return
      }
      s.locked = true
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(s.id)
      } catch {}
      setDragging(true)
    }
    moved.current = true
    // résistance aux extrémités
    const atStart = active === 0 && dx > 0
    const atEnd = active === n - 1 && dx < 0
    setDragX(atStart || atEnd ? dx * 0.25 : dx)
  }
  const onUp = (e: React.PointerEvent) => {
    const s = start.current
    start.current = null
    if (!s || !s.locked) return
    const dx = e.clientX - s.x
    const v = dx / Math.max(1, performance.now() - s.t) // px par ms
    let next = active
    if (dx < -STEP * 0.22 || v < -0.45) next = active + 1
    else if (dx > STEP * 0.22 || v > 0.45) next = active - 1
    setActive(clamp(next))
    setDragX(0)
    setDragging(false)
  }

  const ease = "cubic-bezier(0.22, 1, 0.36, 1)"
  const front = albums[active]

  return (
    <div>
      <div
        className="relative mx-auto aspect-[5/4] w-full max-w-[460px] select-none"
        style={{ perspective: 1100, touchAction: "pan-y" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {albums.map((a, i) => {
          const d = i - pos // 0 = devant ; >0 = derrière ; <0 = déjà passée (sort à gauche)
          if (d < -1.2 || d > 4.2) return null
          const behind = Math.max(0, d)
          const gone = Math.min(0, d) // -1 = sortie complète
          const x = d >= 0 ? behind * 26 : gone * 115 // en % de la largeur de la carte
          const z = -behind * 70
          const rot = d >= 0 ? -Math.min(behind, 1) * 14 : gone * -8
          const scale = 1 - behind * 0.04
          const opacity = d >= 0 ? Math.max(0, 1 - Math.max(0, behind - 2.2) * 0.55 - behind * 0.08) : 1 + gone * 1.1
          const bright = 1 - Math.min(behind, 3) * 0.14
          const isFront = Math.round(d) === 0
          const wave = !!a.collections?.some((c) => c.slug === "thewave")
          return (
            <Link
              key={`${groupKey}-${a.id}`}
              href={`/music/${a.slug}`}
              draggable={false}
              aria-label={a.title}
              tabIndex={isFront ? 0 : -1}
              data-hero-link={wave ? undefined : ""}
              onClick={(e) => {
                if (moved.current) {
                  e.preventDefault()
                  moved.current = false
                  return
                }
                if (!isFront) {
                  e.preventDefault()
                  setActive(i)
                  return
                }
                openAlbum(e, a.slug, wave)
              }}
              className="absolute left-0 top-[6%] block w-[56%]"
              style={{
                transform: `translate3d(${x}%, 0, ${z}px) rotateY(${rot}deg) scale(${scale})`,
                transformOrigin: "left center",
                opacity,
                filter: bright < 1 ? `brightness(${bright})` : undefined,
                zIndex: 100 - Math.round(Math.abs(d) * 10) - (d < 0 ? 0 : 0),
                transition: dragging ? "none" : `transform 0.6s ${ease}, opacity 0.45s ease, filter 0.45s ease`,
                pointerEvents: d < -0.5 ? "none" : "auto",
                willChange: "transform, opacity",
              }}
            >
              <span data-hero-box className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-current/10 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.5)]">
                {a.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.cover_url} alt="" draggable={false} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <Music size={36} className="opacity-50" />
                  </span>
                )}
              </span>
            </Link>
          )
        })}
      </div>

      {/* titre de l'album de devant */}
      <div className="mx-auto mt-3 w-full max-w-[460px]" aria-live="polite">
        <p key={front.id} className="truncate text-sm font-medium" style={{ width: "56%", animation: "album-title-in 0.45s ease both" }}>
          {front.title}
        </p>
        {front.artist && <p className="truncate text-xs opacity-65" style={{ width: "56%" }}>{front.artist}</p>}
        {n > 1 && (
          <div className="mt-3 flex gap-1.5" aria-hidden="true">
            {albums.map((a, i) => (
              <span key={a.id} className={`h-1 rounded-full transition-all duration-300 ${i === active ? "w-4 bg-current opacity-70" : "w-1 bg-current opacity-25"}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Le serveur envoie déjà la liste des albums (dans le HTML) ; ce composant gère le regroupement et les animations.
export default function MusicIndexClient({ initialAlbums }: { initialAlbums: AlbumCard[] }) {
  const copy = useMusicCopy()
  const albums = initialAlbums ?? []
  const loading = false

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    const orphans: AlbumCard[] = []

    for (const album of albums) {
      const cols = album.collections ?? []
      if (cols.length === 0) {
        orphans.push(album)
        continue
      }
      for (const c of cols) {
        if (!map.has(c.slug)) map.set(c.slug, { key: c.slug, title: c.title, href: c.href, albums: [] })
        map.get(c.slug)!.albums.push(album)
      }
    }

    const list = [...map.values()].sort((a, b) => {
      const ia = FIRST.indexOf(a.key)
      const ib = FIRST.indexOf(b.key)
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      return a.title.localeCompare(b.title)
    })

    if (orphans.length) {
      list.push({ key: "__other", title: copy.otherAlbums, href: null, albums: orphans })
    }
    return list
  }, [albums, copy.otherAlbums])

  return (
    <>
      <Navbar />
      <main data-no-reveal className="mx-auto min-h-[70svh] w-11/12 max-w-3xl pb-44 pt-28 sm:pt-36">
        <div className="mb-10">
          <SectionTitle as="h1" className="text-3xl font-semibold tracking-tight sm:text-5xl">{copy.musicTitle}</SectionTitle>
        </div>

        {loading && <p className="text-sm opacity-70">{copy.loading}…</p>}
        {!loading && albums.length === 0 && <p className="text-sm opacity-70">{copy.notFound}</p>}

        <div className="space-y-14">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-5 flex items-end justify-between gap-4 border-b border-current/15 pb-3">
                <div>
                  <h2 className="text-xl font-light tracking-tight sm:text-2xl">{group.title}</h2>
                  <p className="mt-0.5 text-xs opacity-60">{copy.albumsCount(group.albums.length)}</p>
                </div>
                {group.href && (
                  <Link
                    href={group.href}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-current/25 px-3.5 py-1.5 text-xs transition hover:bg-current/10"
                  >
                    {group.title}
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>

              <AlbumStack groupKey={group.key} albums={group.albums} />
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}
