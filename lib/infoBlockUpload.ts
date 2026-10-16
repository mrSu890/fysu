import toast from "react-hot-toast"
import { resizeImage } from "@/lib/imageTools"
import { compressVideo, MAX_UPLOAD_BYTES } from "@/lib/videoTools"

/* Envoie une photo ou une vidéo d'un bloc infos produit, directement vers Supabase
   (le fichier ne passe pas par Vercel → plus de 413). Renvoie l'adresse publique.
   Affiche le pourcentage d'envoi et s'arrête avec un message clair si ça bloque. */

type Sign = { path: string; token: string; signedUrl: string; url: string; error?: string }

async function sign(productId: string | number, ext: string): Promise<Sign> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = await fetch("/api/admin/products/upload-info-block/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, ext }),
      signal: ctrl.signal,
    })
    const data = (await res.json().catch(() => null)) as Sign | null
    if (!res.ok || !data) throw new Error(`Préparation de l'envoi refusée (${res.status})${data?.error ? " : " + data.error : ""}`)
    return data
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new Error("Préparation de l'envoi bloquée (étape 1). Recharge la page et réessaie.")
    throw e
  } finally {
    window.clearTimeout(timer)
  }
}

function put(signedUrl: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let last = Date.now()
    const watchdog = window.setInterval(() => {
      if (Date.now() - last > 60000) {
        xhr.abort()
        reject(new Error("Envoi bloqué (étape 2) : aucune donnée envoyée depuis 60 s."))
      }
    }, 5000)
    const done = () => window.clearInterval(watchdog)

    xhr.open("PUT", signedUrl)
    xhr.setRequestHeader("x-upsert", "false")
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (key) xhr.setRequestHeader("apikey", key)
    xhr.upload.onprogress = (e) => {
      last = Date.now()
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      done()
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      let msg = ""
      try {
        msg = JSON.parse(xhr.responseText)?.message ?? JSON.parse(xhr.responseText)?.error ?? ""
      } catch {
        /* ignore */
      }
      reject(new Error(`Envoi refusé par Supabase (${xhr.status})${msg ? " : " + msg : ""}`))
    }
    xhr.onerror = () => {
      done()
      reject(new Error("Envoi impossible (connexion ou règle CORS)."))
    }
    const form = new FormData()
    form.append("cacheControl", "3600")
    form.append("", file)
    xhr.send(form)
  })
}

export async function uploadInfoBlockMedia(
  original: File,
  productId: string | number,
  onInfo?: (message: string) => void
): Promise<string> {
  const isVideo = original.type.startsWith("video")
  const toastId = toast.loading("Préparation…")
  try {
    let file: File
    if (isVideo) {
      file = original
      if (file.size > 12 * 1024 * 1024) {
        toast.loading("Vidéo lourde : allègement en cours…", { id: toastId })
        file = await compressVideo(file)
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error("Vidéo trop lourde (max 45 Mo). Raccourcis-la ou baisse sa qualité.")
      }
    } else {
      file = await resizeImage(original)
    }

    const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase()
    const sig = await sign(productId, ext)
    toast.loading("Envoi… 0 %", { id: toastId })
    await put(sig.signedUrl, file, (pct) => toast.loading(`Envoi… ${pct} %`, { id: toastId }))
    toast.success("Média envoyé", { id: toastId })
    onInfo?.("")
    return sig.url
  } catch (e) {
    toast.dismiss(toastId)
    throw e
  }
}
