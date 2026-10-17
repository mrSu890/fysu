import { optimizeStoryMedia } from "@/lib/storyMedia"
import { putSigned, withTimeout } from "@/lib/signedUpload"

/* Envoi d'une photo / vidéo de story : allègement dans le navigateur, puis
   - fichier léger (< 4 Mo) : par le serveur (même chemin que le reste de l'admin)
   - gros fichier (vidéo) : direct vers Supabase avec pourcentage
   « onStatus » reçoit le message à afficher ("Allègement…", "Envoi… 40 %"). Lance une erreur lisible si ça échoue. */
export async function uploadStoryFile(
  original: File,
  bucket: "story-covers" | "story-media",
  onStatus?: (message: string) => void
): Promise<string> {
  onStatus?.("Allègement du fichier…")
  const isVideo = original.type.startsWith("video/")
  const file = await withTimeout(
    optimizeStoryMedia(original, bucket === "story-covers" ? "cover" : "media"),
    isVideo ? 180000 : 20000,
    original
  )

  if (file.size <= 4 * 1024 * 1024) {
    onStatus?.("Envoi en cours…")
    const fd = new FormData()
    fd.append("file", file)
    fd.append("bucket", bucket)
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), 60000)
    try {
      const res = await fetch("/api/admin/stories/upload", { method: "POST", body: fd, signal: ctrl.signal })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.url) throw new Error(data?.error || `Erreur ${res.status}`)
      return data.url as string
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw new Error("Envoi trop long, réessaie avec un fichier plus léger.")
      throw e
    } finally {
      window.clearTimeout(timer)
    }
  }

  if (file.size > 48 * 1024 * 1024) throw new Error("Fichier trop lourd (48 Mo maximum). Raccourcis la vidéo.")
  const res = await fetch("/api/admin/stories/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, filename: file.name }),
  })
  const sig = await res.json().catch(() => null)
  if (!res.ok || !sig?.signedUrl) throw new Error(sig?.error || `Erreur ${res.status}`)
  await putSigned(sig.signedUrl, file, (pct) => onStatus?.(`Envoi… ${pct} %`))
  return sig.url as string
}
