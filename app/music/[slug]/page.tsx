"use client"

import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Music, Pause, Play, Shuffle } from "lucide-react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import Equalizer from "@/components/MusicEqualizer"
import { useMusicPlayer } from "@/context/MusicPlayerContext"
import { BRANDS, WAVE, getBrandId } from "@/lib/brands"
import { waveColors } from "@/lib/waveColor"
import WaveLoader from "@/components/WaveLoader"
import { formatTime, totalMinutes, type MusicAlbumFull } from "@/lib/music"
import { useMusicCopy } from "@/lib/musicCopy"

/* ====================================================================
   PAGE D'UN ALBUM
   Elle prend l'ambiance de la marque de l'album, comme une fiche produit :
   The Wave = fond rouge + vague rose + logo The Wave dans la barre de navigation
   Kiban Collector = sombre · fysu = style classique du site
   ==================================================================== */

const LINE = "color-mix(in srgb, currentColor 22%, transparent)"

export default function MusicAlbumPage() {
  const { slug } = useParams<{ slug: string }>()
  const copy = useMusicCopy()
  const player = useMusicPlayer()

  const [album, setAlbum] = useState<(MusicAlbumFull & { collections?: { slug: string; href: string; title: string }[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [openInfo, setOpenInfo] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/music?slug=${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not found")
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setAlbum(data)
      })
      .catch(() => {
        if (!cancelled) setMissing(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  /* ================= MARQUE (même mécanisme que la fiche produit) ================= */

  const brandId = getBrandId(album?.brand)
  const brand = BRANDS[brandId]
  const wc = waveColors(album?.wave_bg)

  useLayoutEffect(() => {
    if (brandId === "fysu") return
    const html = document.documentElement
    const extra = brandId === "thewave" ? ["dark", "brand-page", "wave-page"] : ["dark", "brand-page"]
    html.classList.add(...extra)
    // la barre de navigation et le pied de page s'adaptent à la marque
    html.setAttribute("data-brand", brandId)

    return () => {
      html.removeAttribute("data-brand")
      html.classList.remove("brand-page", "wave-page")
      let saved: string | null = null
      try {
        saved = localStorage.getItem("theme")
      } catch {}
      if (saved !== "dark") html.classList.remove("dark")
    }
  }, [brandId])

  const tracks = album?.tracks ?? []
  const isCurrentAlbum = Boolean(album && player.album?.id === album.id)
  const minutes = useMemo(() => totalMinutes(tracks), [tracks])

  const albumInfo = album
    ? {
        id: album.id,
        slug: album.slug,
        title: album.title,
        artist: album.artist,
        cover_url: album.cover_url,
        brand: album.brand,
      }
    : null

  function onPlayAll() {
    if (!album || !albumInfo) return
    if (isCurrentAlbum) player.toggle()
    else player.playAlbum(albumInfo, tracks, 0)
  }

  function onRow(index: number) {
    if (!album || !albumInfo) return
    const track = tracks[index]
    setOpenInfo((cur) => (track.info && cur !== track.id ? track.id : null))
    if (isCurrentAlbum && player.current?.id === track.id) player.toggle()
    else player.playAlbum(albumInfo, tracks, index)
  }

  return (
    <>
      {brandId !== "fysu" && (
        <style>{`
          html.brand-page button[aria-pressed] { display: none; }
          ${
            brandId === "thewave"
              ? `
          html.wave-page { background: ${wc.bg}; }
          html.wave-page body { background: transparent !important; color: ${wc.ink}; }
          html.wave-page .bg-background { background-color: transparent !important; }
          html.wave-page .flower-light,
          html.wave-page .flower-dark { display: none !important; }
          `
              : ""
          }
        `}</style>
      )}

      {brandId === "thewave" && (
        <div className="fixed inset-0 -z-10" style={{ background: wc.bg }} aria-hidden="true">
          <svg className="h-full w-full" viewBox="0 0 1821 2576" preserveAspectRatio="xMidYMax slice">
            <path d={WAVE.PATH} fill={wc.wave} />
          </svg>
        </div>
      )}

      {brandId === "thewave" && <WaveLoader />}

      <Navbar />

      <main className="mx-auto min-h-[70svh] w-11/12 max-w-3xl pb-44 pt-28 sm:pt-36">
        {loading && <p className="text-center text-sm opacity-70">{copy.loading}…</p>}
        {!loading && (missing || !album) && (
          <p className="text-center text-sm opacity-70">{copy.notFound}</p>
        )}

        {album && (
          <>
            {/* Boutons de retour : bien visibles, et ils restent accrochés en haut en faisant défiler */}
            <nav className="sticky top-[76px] z-30 -mx-1 mb-8 flex flex-wrap items-center gap-2 px-1 py-2 text-sm">
              <Link
                href="/music"
                className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 font-medium text-[#171717] shadow-lg transition active:scale-95"
              >
                <ArrowLeft size={16} /> {copy.allAlbums}
              </Link>
              {(album.collections ?? []).map((c) => (
                <Link
                  key={c.slug}
                  href={c.href}
                  className="flex items-center gap-2 rounded-full border border-current/30 bg-black/20 px-4 py-2.5 backdrop-blur-md transition active:scale-95"
                >
                  <ArrowLeft size={16} /> {c.title}
                </Link>
              ))}
              {(album.collections ?? []).length === 0 && brand.path && (
                <Link
                  href={brand.path}
                  className="flex items-center gap-2 rounded-full border border-current/30 bg-black/20 px-4 py-2.5 backdrop-blur-md transition active:scale-95"
                >
                  <ArrowLeft size={16} /> {brand.label}
                </Link>
              )}
            </nav>

            {/* ================= EN-TÊTE ================= */}
            <header className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:gap-7 sm:text-left">
              <div className="h-44 w-44 shrink-0 overflow-hidden rounded-2xl bg-current/10 shadow-[0_18px_50px_rgba(0,0,0,0.25)] sm:h-52 sm:w-52">
                {album.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={album.cover_url} alt={album.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music size={48} className="opacity-50" />
                  </div>
                )}
              </div>

              <div className="mt-5 min-w-0 sm:mt-0 sm:pb-1">
                <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  {album.title}
                </h1>
                {album.artist && <p className="mt-1 text-base opacity-85">{album.artist}</p>}
                {album.description && (
                  <p className="mt-3 max-w-md text-sm leading-relaxed opacity-75">
                    {album.description}
                  </p>
                )}
                <p className="mt-3 text-xs uppercase tracking-[0.14em] opacity-60">
                  {copy.tracks(tracks.length, minutes)}
                </p>
              </div>
            </header>

            {/* ================= BOUTONS ================= */}
            {tracks.length > 0 && (
              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onPlayAll}
                  className="flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-white text-base font-medium text-[#171717] shadow-lg transition active:scale-[0.98]"
                >
                  {isCurrentAlbum && player.playing ? (
                    <>
                      <Pause size={20} fill="currentColor" /> {copy.pause}
                    </>
                  ) : (
                    <>
                      <Play size={20} fill="currentColor" /> {copy.play}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => albumInfo && player.playAlbum(albumInfo, tracks, 0, true)}
                  aria-label={copy.shuffle}
                  title={copy.shuffle}
                  className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-current/15 transition active:scale-95"
                >
                  <Shuffle size={20} />
                </button>
              </div>
            )}

            {/* ================= LISTE DES TITRES ================= */}
            <ol className="mt-8" style={{ borderTop: `1px solid ${LINE}` }}>
              {tracks.map((track, i) => {
                const active = isCurrentAlbum && player.current?.id === track.id
                return (
                  <li key={track.id} style={{ borderBottom: `1px solid ${LINE}` }}>
                    <button
                      type="button"
                      onClick={() => onRow(i)}
                      className="flex w-full cursor-pointer items-center gap-3 py-3 text-left"
                    >
                      <span className="flex w-6 shrink-0 justify-center text-xs tabular-nums opacity-60">
                        {active ? <Equalizer playing={player.playing} /> : i + 1}
                      </span>

                      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-current/10">
                        {album.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={album.cover_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Music size={16} className="opacity-50" />
                          </span>
                        )}
                      </span>

                      <span className="min-w-0 flex-1 leading-tight">
                        <span className={`block truncate text-[15px] ${active ? "font-semibold" : ""}`}>
                          {track.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] opacity-65">
                          {track.artist || album.artist}
                        </span>
                      </span>

                      <span className="shrink-0 text-xs tabular-nums opacity-60">
                        {formatTime(track.duration_seconds)}
                      </span>
                    </button>

                    {openInfo === track.id && track.info && (
                      <p className="pb-4 pl-[84px] pr-2 text-[13px] leading-relaxed opacity-75">
                        {track.info}
                      </p>
                    )}
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </main>

      <Footer />
    </>
  )
}
