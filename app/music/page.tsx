import { GET as getMusicRoute } from "@/app/api/music/route"
import { readRoute } from "@/lib/serverData"
import MusicIndexClient from "./MusicIndexClient"

// Lu à chaque visite : prix, stock et textes toujours à jour (jamais figés au moment du build)
export const dynamic = "force-dynamic"

/* Liste des albums lue côté serveur (dans le HTML pour Google) ; métadonnées dans layout.tsx */

export default async function MusicIndexPage() {
  const albums = await readRoute<any[]>(() => getMusicRoute(new Request("http://internal.local/api/music")))
  return <MusicIndexClient initialAlbums={Array.isArray(albums) ? albums : []} />
}
