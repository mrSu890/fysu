/* ====================================================================
   PRESSE-PAPIERS DE L'ADMIN : copier un bloc (tableau des tailles, textes…) sur un produit
   et le coller sur un autre. Fonctionne d'une page produit à l'autre (même navigateur).
   ==================================================================== */

const KEY = "fysu-admin-clip-"

export function clipCopy(kind: string, data: unknown): boolean {
  try {
    const json = JSON.stringify(data)
    localStorage.setItem(KEY + kind, json)
    // en plus, on essaie le vrai presse-papiers du téléphone (facultatif)
    void navigator.clipboard?.writeText(json).catch(() => {})
    return true
  } catch {
    return false
  }
}

export function clipPaste<T = unknown>(kind: string): T | null {
  try {
    const raw = localStorage.getItem(KEY + kind)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function clipHas(kind: string): boolean {
  try {
    return !!localStorage.getItem(KEY + kind)
  } catch {
    return false
  }
}
