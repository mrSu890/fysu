import { compressVideo } from "@/lib/videoTools"

/* ====================================================================
   ALLÉGER LES MÉDIAS DE STORIES avant l'envoi (dans le navigateur)
   - photo : 1080 px de large max (un écran de téléphone), JPEG ~ 200-400 Ko au lieu de plusieurs Mo
   - couverture (pastille ronde) : 600 px max
   - vidéo : 720 px de large, ~2 Mbit/s, sans le son
   ==================================================================== */

async function toBitmap(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; done: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions)
      return { src: bmp, w: bmp.width, h: bmp.height, done: () => bmp.close() }
    } catch {
      /* on essaie autrement */
    }
  }
  const url = URL.createObjectURL(file)
  const img = await new Promise<HTMLImageElement>((ok, ko) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.onerror = () => ko(new Error("Image illisible"))
    i.src = url
  })
  return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) }
}

export async function optimizeStoryImage(file: File, maxWidth = 1080, maxHeight = 1920, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file
  try {
    const b = await toBitmap(file)
    const ratio = Math.min(1, maxWidth / b.w, maxHeight / b.h)
    const w = Math.max(1, Math.round(b.w * ratio))
    const h = Math.max(1, Math.round(b.h * ratio))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      b.done()
      return file
    }
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(b.src, 0, 0, w, h)
    b.done()
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality))
    if (!blob || (blob.size >= file.size && /^image\/(jpeg|webp)$/.test(file.type) && ratio === 1)) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })
  } catch {
    return file
  }
}

export async function optimizeStoryVideo(file: File): Promise<File> {
  if (!file.type.startsWith("video/")) return file
  return compressVideo(file, { maxWidth: 720, bitrate: 2_000_000 })
}

export async function optimizeStoryMedia(file: File, kind: "cover" | "media"): Promise<File> {
  if (file.type.startsWith("video/")) return optimizeStoryVideo(file)
  return kind === "cover" ? optimizeStoryImage(file, 600, 600, 0.85) : optimizeStoryImage(file)
}
