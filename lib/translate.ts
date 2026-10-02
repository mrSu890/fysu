/* ====================================================================
   TRADUCTION AUTOMATIQUE (DeepL) DU CONTENU ÉCRIT DANS L'ADMIN
   - Les routes publiques passent leurs données dans localize().
   - Chaque texte est traduit une seule fois par langue, puis gardé dans
     la table Supabase "translations" (clé = empreinte du texte d'origine).
     Si tu modifies un texte dans l'admin, il est retraduit tout seul.
   - Sans clé DEEPL_API_KEY, ou pour une langue que DeepL ne gère pas,
     le texte d'origine s'affiche (rien ne casse).
   - Dans l'admin, rien n'est traduit (tu vois toujours ton texte d'origine).
   ==================================================================== */

import { createHash } from "crypto"
import { cookies, headers } from "next/headers"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { locales } from "@/i18n/routing"

// Langue du site -> code DeepL
const DEEPL_TARGET: Record<string, string> = {
  en: "EN-GB",
  fr: "FR",
  nl: "NL",
  ja: "JA",
  de: "DE",
  es: "ES",
  it: "IT",
  pt: "PT-PT",
  sv: "SV",
  da: "DA",
  no: "NB",
  pl: "PL",
  id: "ID",
  ms: "MS",
  sw: "SW",
  lb: "LB",
  zh: "ZH-HANS",
  ko: "KO",
  th: "TH",
  he: "HE",
  ar: "AR",
  hi: "HI",
  ta: "TA",
}

// Champs traduits (le reste : prix, liens, identifiants… ne bouge jamais)
const TRANSLATABLE_KEYS = new Set([
  "name",
  "title",
  "subtitle",
  "description",
  "details",
  "size_fit",
  "content",
  "category",
  "evocation",
  "body",
])

const memory = new Map<string, string>()
const unsupportedUntil = new Map<string, number>()

const hashOf = (text: string) => createHash("sha256").update(text).digest("hex")

function worthTranslating(text: string) {
  const s = text.trim()
  if (s.length < 2) return false
  if (/^(https?:|\/|#|data:)/i.test(s)) return false
  if (/^[\d\s.,€$£%+\-–—/:()]+$/.test(s)) return false
  return /\p{L}/u.test(s)
}

function deeplHost(key: string) {
  return key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com"
}

async function callDeepL(texts: string[], target: string, key: string, locale: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${deeplHost(key)}/v2/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: texts,
        target_lang: target,
        preserve_formatting: true,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("DeepL error", res.status, body.slice(0, 200))
      // langue refusée par DeepL : on arrête d'essayer pendant 10 minutes
      if (res.status === 400) unsupportedUntil.set(locale, Date.now() + 10 * 60 * 1000)
      return null
    }

    const json = (await res.json()) as { translations?: { text: string }[] }
    const out = json.translations?.map((t) => t.text)
    return out && out.length === texts.length ? out : null
  } catch (err) {
    console.error("DeepL request failed", err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function translateMany(texts: string[], locale: string) {
  const result = new Map<string, string>()
  const target = DEEPL_TARGET[locale]
  const key = process.env.DEEPL_API_KEY
  if (!key || !target) return result

  const unique = [...new Set(texts.filter(worthTranslating))]
  const pending: { text: string; hash: string }[] = []

  for (const text of unique) {
    const hash = hashOf(text)
    const cached = memory.get(`${locale}:${hash}`)
    if (cached !== undefined) result.set(text, cached)
    else pending.push({ text, hash })
  }

  // 1) déjà traduits dans Supabase ?
  let misses = pending
  if (pending.length) {
    const found = new Map<string, string>()
    for (let i = 0; i < pending.length; i += 150) {
      const chunk = pending.slice(i, i + 150)
      const { data, error } = await supabaseAdmin
        .from("translations")
        .select("source_hash, translated_text")
        .eq("locale", locale)
        .in("source_hash", chunk.map((c) => c.hash))
      if (error) {
        console.error("translations read:", error.message)
        break
      }
      for (const row of data ?? []) found.set(row.source_hash, row.translated_text)
    }
    misses = []
    for (const p of pending) {
      const hit = found.get(p.hash)
      if (hit !== undefined) {
        result.set(p.text, hit)
        memory.set(`${locale}:${p.hash}`, hit)
      } else {
        misses.push(p)
      }
    }
  }

  // 2) à traduire avec DeepL
  if (misses.length && (unsupportedUntil.get(locale) ?? 0) < Date.now()) {
    for (let i = 0; i < misses.length; i += 40) {
      const chunk = misses.slice(i, i + 40)
      const translated = await callDeepL(
        chunk.map((c) => c.text),
        target,
        key,
        locale
      )
      if (!translated) break

      const rows = chunk.map((c, idx) => ({
        source_hash: c.hash,
        locale,
        source_text: c.text,
        translated_text: translated[idx],
      }))
      chunk.forEach((c, idx) => {
        result.set(c.text, translated[idx])
        memory.set(`${locale}:${c.hash}`, translated[idx])
      })

      const { error } = await supabaseAdmin
        .from("translations")
        .upsert(rows, { onConflict: "source_hash,locale" })
      if (error) console.error("translations write:", error.message)
    }
  }

  return result
}

/* ====== Parcours des données (copie, sans modifier l'original) ====== */

// Noms propres qui ne se traduisent jamais :
// - un produit (slug + prix) : son nom, ex. « Gigil »
// - une page, collection ou album (slug + titre) : son titre, ex. « For her »
function keepsName(obj: Record<string, unknown>, key: string) {
  if (!("slug" in obj)) return false
  if (key === "name") return "price" in obj
  return key === "title"
}

function collect(node: unknown, inside: boolean, out: string[]) {
  if (typeof node === "string") {
    if (inside) out.push(node)
  } else if (Array.isArray(node)) {
    for (const item of node) collect(item, inside, out)
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      collect(v, inside || (TRANSLATABLE_KEYS.has(k) && !keepsName(node as Record<string, unknown>, k)), out)
    }
  }
}

function apply(node: unknown, inside: boolean, map: Map<string, string>): unknown {
  if (typeof node === "string") {
    return inside ? map.get(node) ?? node : node
  }
  if (Array.isArray(node)) return node.map((item) => apply(item, inside, map))
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = apply(v, inside || (TRANSLATABLE_KEYS.has(k) && !keepsName(node as Record<string, unknown>, k)), map)
    }
    return out
  }
  return node
}

async function visitorLocale(): Promise<string | null> {
  const value = (await cookies()).get("NEXT_LOCALE")?.value
  if (!value || !(locales as readonly string[]).includes(value)) return null

  // Dans l'admin, on garde toujours le texte d'origine
  const referer = (await headers()).get("referer")
  if (referer) {
    try {
      if (new URL(referer).pathname.startsWith("/admin")) return null
    } catch {
      /* ignore */
    }
  }
  return value
}

/** À appeler sur les données d'une route publique juste avant de les renvoyer. */
export async function localize<T>(data: T): Promise<T> {
  try {
    const locale = await visitorLocale()
    if (!locale) return data

    const strings: string[] = []
    collect(data, false, strings)
    if (!strings.length) return data

    const map = await translateMany(strings, locale)
    if (!map.size) return data

    return apply(data, false, map) as T
  } catch (err) {
    console.error("localize failed", err)
    return data
  }
}
