import toast from "react-hot-toast"

/* ====================================================================
   OUTILS COMMUNS POUR TOUS LES PANNEAUX ADMIN
   - api.get / post / put / del : appellent le serveur et renvoient le JSON
     (si le serveur répond une erreur, on reçoit une vraie erreur lisible)
   - notify : les messages en bas / en haut de l'écran (un seul système)
   ==================================================================== */

export function errorMessage(error: unknown, fallback = "Une erreur est survenue") {
  return error instanceof Error && error.message ? error.message : fallback
}

export async function adminFetch<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)

  // On n'impose le JSON que si on envoie du texte (pas pour les envois de fichiers)
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(url, { ...init, headers })
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error((data && (data.error || data.message)) || `Erreur ${res.status}`)
  }

  return data as T
}

export const api = {
  get: <T = any>(url: string) => adminFetch<T>(url),
  post: <T = any>(url: string, body?: unknown) =>
    adminFetch<T>(url, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T = any>(url: string, body?: unknown) =>
    adminFetch<T>(url, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T = any>(url: string, body?: unknown) =>
    adminFetch<T>(url, { method: "DELETE", body: body === undefined ? undefined : JSON.stringify(body) }),
  upload: <T = any>(url: string, form: FormData) =>
    adminFetch<T>(url, { method: "POST", body: form }),
}

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
}

/* ====== Petites fonctions partagées (avant, recopiées dans plusieurs fichiers) ====== */

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "")

export const formatMoney = (cents: number | null | undefined, currency = "EUR") =>
  new Intl.NumberFormat("fr-BE", { style: "currency", currency: currency.toUpperCase() }).format(
    (cents ?? 0) / 100
  )

export const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("fr-BE", { day: "2-digit", month: "short", year: "numeric" })
    : "—"
