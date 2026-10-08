"use client"

import { useEffect, useMemo, useState } from "react"
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

export default function MusicIndexPage() {
  const copy = useMusicCopy()
  const [albums, setAlbums] = useState<AlbumCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/music")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAlbums(Array.isArray(data) ? data : []))
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false))
  }, [])

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

              <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                {group.albums.map((a) => (
                  <li key={`${group.key}-${a.id}`}>
                    <Link
                      href={`/music/${a.slug}`}
                      className="block"
                      // les albums The Wave gardent leur rideau d'eau : pas de transport d'image pour eux
                      data-hero-link={a.collections?.some((c) => c.slug === "thewave") ? undefined : ""}
                      onClick={(e) => {
                        // la pochette est « transportée » jusqu'à la page de l'album (voir components/ProductHero.tsx)
                        try {
                          if (!e.currentTarget.hasAttribute("data-hero-link")) return
                          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                          const box = e.currentTarget.querySelector("[data-hero-box]") as HTMLElement | null
                          const img = box?.querySelector("img") as HTMLImageElement | null
                          const hero = (window as unknown as { __fysuHero?: (el: HTMLElement | null, p: string, src: string | null) => boolean }).__fysuHero
                          if (hero && box && img?.currentSrc && hero(box, `/music/${a.slug}`, img.currentSrc)) e.preventDefault()
                        } catch {}
                      }}
                    >
                      <span data-hero-box className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-current/10">
                        {a.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.cover_url} alt={a.title} className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Music size={36} className="opacity-50" />
                          </span>
                        )}
                      </span>
                      <span className="mt-2 block truncate text-sm font-medium">{a.title}</span>
                      {a.artist && <span className="block truncate text-xs opacity-65">{a.artist}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}
