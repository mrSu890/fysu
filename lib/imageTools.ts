/* ====================================================================
   OUTILS IMAGES (côté navigateur)
   - resizeImage : réduit les photos trop lourdes avant l'envoi
     (le serveur refuse les fichiers de plus de ~4,5 Mo)
   - loadImageForCanvas : charge une image distante pour pouvoir la recadrer
   ==================================================================== */

const MAX_SIDE = 2400
const MAX_BYTES = 3.5 * 1024 * 1024

function loadFromUrl(src: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Impossible de charger l'image"))
    img.src = src
  })
}

export function loadImageForCanvas(url: string) {
  // paramètre ajouté pour éviter une copie en cache sans autorisation de recadrage
  const sep = url.includes("?") ? "&" : "?"
  return loadFromUrl(`${url}${sep}cb=${Date.now()}`, true)
}

export async function resizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadFromUrl(objectUrl, false)
    const longSide = Math.max(img.naturalWidth, img.naturalHeight)

    if (longSide <= MAX_SIDE && file.size <= MAX_BYTES) return file

    const ratio = Math.min(1, MAX_SIDE / longSide)
    const w = Math.round(img.naturalWidth * ratio)
    const h = Math.round(img.naturalHeight * ratio)

    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return file

    const isPng = file.type === "image/png"
    if (!isPng) {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(img, 0, 0, w, h)

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, isPng ? "image/png" : "image/jpeg", 0.9)
    )
    if (!blob) return file

    const base = file.name.replace(/\.[^.]+$/, "") || "image"
    return new File([blob], `${base}.${isPng ? "png" : "jpg"}`, {
      type: isPng ? "image/png" : "image/jpeg",
    })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
