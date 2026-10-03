import { createHmac, randomBytes, timingSafeEqual } from "crypto"

/* Jeton signé : prouve que la partie a bien commencé à telle heure, pour tel joueur.
   Sert à vérifier côté serveur qu'un score est réaliste (impossible de tricher en
   envoyant simplement un faux score). */

const secret = () =>
  process.env.GAME_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "fysu-game-dev-secret"

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("hex")

export function makeGameToken(userId: string, game: string) {
  const nonce = randomBytes(8).toString("hex")
  const startedAt = Date.now()
  const payload = `${userId}.${game}.${startedAt}.${nonce}`
  return { token: `${payload}.${sign(payload)}`, nonce }
}

export function readGameToken(token: unknown, userId: string, game: string) {
  if (typeof token !== "string") return null
  const parts = token.split(".")
  if (parts.length !== 5) return null
  const [uid, g, startedAt, nonce, sig] = parts
  const payload = `${uid}.${g}.${startedAt}.${nonce}`
  const expected = sign(payload)
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  if (uid !== userId || g !== game) return null
  const started = Number(startedAt)
  if (!Number.isFinite(started)) return null
  return { startedAt: started, nonce }
}
