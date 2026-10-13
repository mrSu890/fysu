import { NextRequest } from "next/server"

/* ====================================================================
   DONNÉES CÔTÉ SERVEUR (pour le référencement Google)
   Les pages serveur lisent exactement les mêmes données que les routes /api
   (mêmes requêtes Supabase, mêmes traductions, noms de produits jamais traduits),
   puis les passent en props aux composants clients : le HTML envoyé par le serveur
   contient déjà les produits, les prix et les textes.
   Ce fichier ne s'exécute jamais dans le navigateur (aucune clé n'en sort).
   ==================================================================== */

/** Une requête factice, pour appeler une route /api depuis une page serveur. */
export function internalRequest(path = "/") {
  return new NextRequest(new URL(path, "http://internal.local"))
}

/** Exécute une route /api et renvoie son JSON, ou null si elle répond une erreur. */
export async function readRoute<T = any>(run: () => Promise<Response>): Promise<T | null> {
  try {
    const res = await run()
    if (!res.ok) return null
    return (await res.json()) as T
  } catch (err) {
    console.error("readRoute:", err)
    return null
  }
}
