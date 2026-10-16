/* ====================================================================
   ALLÈGER UNE VIDÉO avant de l'envoyer (dans le navigateur, sans serveur)
   On relit la vidéo et on la ré-enregistre en 1280 px max, ~2,5 Mbit/s, sans le son.
   Une vidéo de 200 Mo devient quelques Mo. Si le navigateur ne sait pas le faire,
   on renvoie le fichier d'origine.
   ==================================================================== */

export const MAX_UPLOAD_BYTES = 45 * 1024 * 1024

export async function compressVideo(
  file: File,
  opts: { maxWidth?: number; bitrate?: number } = {}
): Promise<File> {
  const maxWidth = opts.maxWidth ?? 1280
  const bitrate = opts.bitrate ?? 2_500_000

  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return file

  const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) => {
    try {
      return MediaRecorder.isTypeSupported(m)
    } catch {
      return false
    }
  })
  if (!mime) return file

  const url = URL.createObjectURL(file)
  const video = document.createElement("video")
  video.muted = true
  video.playsInline = true
  video.preload = "auto"
  video.src = url

  try {
    await new Promise<void>((ok, ko) => {
      video.onloadedmetadata = () => ok()
      video.onerror = () => ko(new Error("Vidéo illisible"))
    })

    const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth))
    const w = Math.max(2, Math.round(((video.videoWidth || maxWidth) * scale) / 2) * 2)
    const h = Math.max(2, Math.round(((video.videoHeight || maxWidth) * scale) / 2) * 2)

    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return file

    const stream = canvas.captureStream(30)
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    const stopped = new Promise<void>((ok) => (rec.onstop = () => ok()))

    let raf = 0
    const draw = () => {
      ctx.drawImage(video, 0, 0, w, h)
      raf = requestAnimationFrame(draw)
    }

    const finished = new Promise<void>((ok) => {
      video.onended = () => ok()
      // sécurité : on s'arrête de toute façon
      window.setTimeout(ok, ((video.duration || 30) * 1.5 + 10) * 1000)
    })

    rec.start(500)
    await video.play()
    draw()
    await finished
    cancelAnimationFrame(raf)
    if (rec.state !== "inactive") rec.stop()
    await stopped

    const type = mime.split(";")[0]
    const blob = new Blob(chunks, { type })
    if (!blob.size || blob.size >= file.size) return file

    const ext = type === "video/mp4" ? "mp4" : "webm"
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}
