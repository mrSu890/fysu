/* Envoi d'un gros fichier directement vers Supabase (URL signée) avec pourcentage et arrêt clair si ça bloque. */
export function putSigned(signedUrl: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let last = Date.now()
    const watchdog = window.setInterval(() => {
      if (Date.now() - last > 60000) {
        xhr.abort()
        window.clearInterval(watchdog)
        reject(new Error("Envoi bloqué : aucune donnée envoyée depuis 60 s."))
      }
    }, 5000)
    xhr.open("PUT", signedUrl)
    xhr.setRequestHeader("x-upsert", "false")
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (key) xhr.setRequestHeader("apikey", key)
    xhr.upload.onprogress = (e) => {
      last = Date.now()
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      window.clearInterval(watchdog)
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      let msg = ""
      try {
        const j = JSON.parse(xhr.responseText)
        msg = j?.message ?? j?.error ?? ""
      } catch {
        /* ignore */
      }
      reject(new Error(`Envoi refusé par Supabase (${xhr.status})${msg ? " : " + msg : ""}`))
    }
    xhr.onerror = () => {
      window.clearInterval(watchdog)
      reject(new Error("Envoi impossible (connexion bloquée)."))
    }
    const form = new FormData()
    form.append("cacheControl", "3600")
    form.append("", file)
    xhr.send(form)
  })
}

// rend la main au bout de « ms » avec la valeur de secours (pour ne jamais rester bloqué à charger)
export function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = window.setTimeout(() => resolve(fallback), ms)
    p.then(
      (v) => {
        window.clearTimeout(t)
        resolve(v)
      },
      () => {
        window.clearTimeout(t)
        resolve(fallback)
      }
    )
  })
}
