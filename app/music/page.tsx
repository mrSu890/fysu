"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Music } from "lucide-react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { useMusicCopy } from "@/lib/musicCopy"

/* ====================================================================
   TOUS LES ALBUMS
   ==================================================================== */

type AlbumCard = {
  id: number
  slug: string
  title: string
  artist: string | null
  cover_url: string | null
  track_count: number
}

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

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[70svh] w-11/12 max-w-3xl pb-44 pt-28 sm:pt-36">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight">{copy.musicTitle}</h1>

        {loading && <p className="text-sm opacity-70">{copy.loading}…</p>}
        {!loading && albums.length === 0 && <p className="text-sm opacity-70">{copy.notFound}</p>}

        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {albums.map((a) => (
            <li key={a.id}>
              <Link href={`/music/${a.slug}`} className="block">
                <span className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-current/10">
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
      </main>
      <Footer />
    </>
  )
}
