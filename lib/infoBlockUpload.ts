import { api } from "@/lib/adminApi"
import { resizeImage } from "@/lib/imageTools"
import { compressVideo, MAX_UPLOAD_BYTES } from "@/lib/videoTools"
import { supabaseClient } from "@/lib/supabaseClient"

/* Envoie une photo ou une vidéo d'un bloc infos produit, directement vers Supabase
   (le fichier ne passe pas par Vercel → plus de 413). Renvoie l'adresse publique. */
export async function uploadInfoBlockMedia(
  original: File,
  productId: string | number,
  onInfo?: (message: string) => void
): Promise<string> {
  const isVideo = original.type.startsWith("video")
  let file: File

  if (isVideo) {
    file = original
    if (file.size > 12 * 1024 * 1024) {
      onInfo?.("Vidéo lourde : allègement en cours, ça peut prendre un moment…")
      file = await compressVideo(file)
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("Vidéo trop lourde (max 45 Mo). Raccourcis-la ou baisse sa qualité.")
    }
  } else {
    file = await resizeImage(original)
  }

  const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase()
  const sig = await api.post<{ path: string; token: string; url: string }>(
    "/api/admin/products/upload-info-block/sign",
    { productId, ext }
  )
  const { error } = await supabaseClient.storage
    .from("products")
    .uploadToSignedUrl(sig.path, sig.token, file, { contentType: file.type || undefined })
  if (error) throw new Error(error.message)
  return sig.url
}
