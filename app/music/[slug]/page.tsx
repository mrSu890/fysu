import { notFound } from "next/navigation"
import { GET as getMusicRoute } from "@/app/api/music/route"
import { readRoute } from "@/lib/serverData"
import { SITE, SITE_NAME } from "@/lib/seo"
import JsonLd from "@/components/JsonLd"
import { getBrandId } from "@/lib/brands"
import MusicAlbumClient from "./MusicAlbumClient"

// Lu à chaque visite : prix, stock et textes toujours à jour (jamais figés au moment du build)
export const dynamic = "force-dynamic"

/* Un album lu côté serveur (titres, texte, pochette dans le HTML pour Google) ; métadonnées dans layout.tsx */

export default async function MusicAlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const album = await readRoute<any>(() =>
    getMusicRoute(new Request(`http://internal.local/api/music?slug=${encodeURIComponent(slug)}`))
  )
  if (!album) notFound()

  const url = `${SITE}/music/${slug}`
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: String(album.title ?? slug),
    url,
    ...(album.artist ? { byArtist: { "@type": "MusicGroup", name: String(album.artist) } } : {}),
    ...(album.cover_url ? { image: album.cover_url } : {}),
    ...(album.description ? { description: String(album.description).replace(/\s+/g, " ").trim().slice(0, 500) } : {}),
    publisher: { "@type": "Organization", name: SITE_NAME },
    numTracks: Array.isArray(album.tracks) ? album.tracks.length : undefined,
    track: (album.tracks ?? []).map((t: any, i: number) => ({
      "@type": "MusicRecording",
      position: i + 1,
      name: String(t.title ?? `Track ${i + 1}`),
    })),
  }

  // Albums TheWave / Kiban : l'ambiance de la marque est posée dès l'arrivée (même classes que le composant client)
  const brandId = getBrandId(album.brand)
  const brandInit =
    brandId === "fysu"
      ? null
      : `(function(){var h=document.documentElement;h.classList.add(${
          brandId === "thewave" ? '"dark","brand-page","wave-page"' : '"dark","brand-page"'
        });h.setAttribute("data-brand","${brandId}")})()`

  return (
    <>
      {brandInit && <script dangerouslySetInnerHTML={{ __html: brandInit }} />}
      <JsonLd data={jsonLd} />
      <MusicAlbumClient initialAlbum={album} />
    </>
  )
}
