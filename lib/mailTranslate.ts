import { createHash } from "crypto"

/* TRADUCTION AUTOMATIQUE DES MAILS
   Le client reçoit son mail dans la langue de son site (celle enregistrée à son inscription).
   Français et anglais : textes écrits par toi. Les 21 autres langues : traduction à l'envoi (Claude Haiku).
   - Les mots entre [[doubles crochets]] ne sont jamais traduits.
   - {prenom}, {commande}… et les liens restent intacts.
   - Sans ANTHROPIC_API_KEY ou en cas d'erreur : le mail part en anglais (ou en français). */

export const LANG_NAME: Record<string, string> = {
  en: "English", nl: "Dutch", fr: "French", ja: "Japanese", de: "German", es: "Spanish", it: "Italian", pt: "Portuguese",
  sv: "Swedish", da: "Danish", no: "Norwegian", pl: "Polish", id: "Indonesian", ms: "Malay", sw: "Swahili", lb: "Luxembourgish",
  zh: "Chinese (Simplified)", ko: "Korean", th: "Thai", he: "Hebrew", ar: "Arabic", hi: "Hindi", ta: "Tamil",
}

/** champs de texte à traduire (jamais les liens, noms de produits, auteurs) */
const KEYS = new Set(["subject", "subjectB", "preheader", "eyebrow", "title", "body", "cta", "text", "buttonLabel", "label", "heading", "intro", "link"])
const MODEL = process.env.AI_TRANSLATE_MODEL || "claude-haiku-4-5"
const cache = new Map<string, string[]>()

export const baseLocale = (l?: string | null) => String(l ?? "").toLowerCase().split(/[-_]/)[0]
export const isTranslated = (l?: string | null) => !!LANG_NAME[baseLocale(l)] && baseLocale(l) !== "fr" && baseLocale(l) !== "en"

type Ref = { o: Record<string, unknown>; k: string }
function collect(x: unknown, out: Ref[]) {
  if (Array.isArray(x)) x.forEach((i) => collect(i, out))
  else if (x && typeof x === "object") {
    for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
      if (typeof v === "string") { if (KEYS.has(k) && v.trim()) out.push({ o: x as Record<string, unknown>, k }) }
      else collect(v, out)
    }
  }
}

async function ask(strings: string[], from: string, to: string): Promise<string[] | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || strings.length === 0) return null
  const ck = createHash("sha1").update(`${to}|${JSON.stringify(strings)}`).digest("hex")
  const hit = cache.get(ck)
  if (hit) return hit
  const system = `You translate transactional and marketing emails of FYSU, a premium Belgian fashion brand, from ${LANG_NAME[from] || from} into ${LANG_NAME[to]}.
Input: a JSON array of strings. Output: ONLY a JSON array of the same length, same order, nothing else.
Rules: keep tokens like {prenom}, {commande}, {suivi}, {produit}, {produits} exactly. Keep anything inside [[double brackets]] exactly as is, brackets included, and do not translate it. Keep markdown links [text](url): translate the text, never the url. Keep line breaks. Keep the brand name FYSU and product names. Tone: warm, sober, elegant, informal "you" when the language has one. Keep similar length; uppercase words stay uppercase.`
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 4000, system, messages: [{ role: "user", content: JSON.stringify(strings) }] }),
    })
    const data = await res.json()
    if (!res.ok) { console.error("translate:", data?.error?.message); return null }
    const txt = String((data.content as { type: string; text?: string }[]).find((c) => c.type === "text")?.text ?? "")
    const arr = JSON.parse(txt.slice(txt.indexOf("["), txt.lastIndexOf("]") + 1))
    if (!Array.isArray(arr) || arr.length !== strings.length || arr.some((s) => typeof s !== "string")) return null
    cache.set(ck, arr)
    return arr
  } catch (e) {
    console.error("translate:", e)
    return null
  }
}

/** copie traduite de l'objet (blocs, sujet…) ; null si impossible → l'appelant garde la langue d'origine */
export async function translateDeep<T>(obj: T, from: string, to: string): Promise<T | null> {
  const copy = JSON.parse(JSON.stringify(obj)) as T
  const refs: Ref[] = []
  collect(copy, refs)
  const out = await ask(refs.map((r) => String(r.o[r.k])), from, baseLocale(to))
  if (!out) return null
  refs.forEach((r, i) => { r.o[r.k] = out[i] })
  return copy
}
