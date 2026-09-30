"use client"

import { useSyncExternalStore } from "react"

/* ====================================================================
   FAVORIS (cœurs)
   Une seule liste partagée par tout le site : les cœurs réagissent tout
   de suite au toucher, puis l'enregistrement se fait en arrière-plan.
   ==================================================================== */

let ids = new Set<number>()
let loadedAt = 0
let inflight: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function loadWishlist(force = false): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (inflight) return inflight
  if (!force && loadedAt && Date.now() - loadedAt < 30000) return Promise.resolve()

  inflight = fetch("/api/wishlist")
    .then(async (res) => {
      if (!res.ok) {
        ids = new Set()
        return
      }
      const json = await res.json()
      const items = Array.isArray(json?.wishlist) ? json.wishlist : []
      ids = new Set(items.map((w: any) => Number(w.product_id)).filter((n: number) => !Number.isNaN(n)))
    })
    .catch(() => {
      /* on garde la liste actuelle */
    })
    .finally(() => {
      loadedAt = Date.now()
      inflight = null
      emit()
    })

  return inflight
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useIsLiked(productId: number | string) {
  const id = Number(productId)
  return useSyncExternalStore(
    subscribe,
    () => ids.has(id),
    () => false
  )
}

// Change le cœur tout de suite, puis enregistre. Renvoie "auth" si la personne n'est pas connectée.
export async function toggleWishlist(productId: number | string): Promise<"ok" | "auth" | "error"> {
  const id = Number(productId)
  const wasLiked = ids.has(id)

  const next = new Set(ids)
  if (wasLiked) next.delete(id)
  else next.add(id)
  ids = next
  emit()

  const revert = () => {
    const back = new Set(ids)
    if (wasLiked) back.add(id)
    else back.delete(id)
    ids = back
    emit()
  }

  try {
    const res = await fetch("/api/wishlist", {
      method: wasLiked ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: id }),
    })
    if (res.status === 401) {
      revert()
      return "auth"
    }
    if (!res.ok) {
      revert()
      return "error"
    }
    return "ok"
  } catch {
    revert()
    return "error"
  }
}
