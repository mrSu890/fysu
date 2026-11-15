import { NextResponse } from "next/server"
import { TOOLS, runTool } from "@/lib/aiTools"

export const runtime = "nodejs"
export const maxDuration = 60

/* ASSISTANT ADMIN : questions en français sur la boutique, en lecture seule.
   Variables Vercel : ANTHROPIC_API_KEY (obligatoire), AI_MODEL (facultatif). */
const MODEL = process.env.AI_MODEL || "claude-sonnet-5-5"
const SYSTEM = `Tu es l'assistant de l'admin de FYSU, une marque de vêtements belge. Tu aides le fondateur et son équipe à comprendre la boutique : ventes, commandes, clients, stock.
Règles : réponds en français, très court et concret, chiffres en euros. Appuie-toi uniquement sur les outils ; si une donnée manque, dis-le. Tu ne peux rien modifier ni envoyer : tu peux proposer des actions ou rédiger un brouillon de message que l'humain enverra lui-même depuis l'admin (page Mails). Ne montre jamais d'identifiants techniques.`

type Msg = { role: "user" | "assistant"; content: any }

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: "La clé ANTHROPIC_API_KEY n'est pas encore ajoutée dans Vercel." }, { status: 400 })
  const body = await req.json().catch(() => null)
  const asked = Array.isArray(body?.messages) ? (body.messages as { role: string; text: string }[]) : []
  const messages: Msg[] = asked.slice(-8).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.text ?? "").slice(0, 2000) }))
  if (!messages.length || messages[messages.length - 1].role !== "user") return NextResponse.json({ error: "Question vide." }, { status: 400 })

  try {
    for (let i = 0; i < 6; i++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: 1200, system: SYSTEM, tools: TOOLS, messages }),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data?.error?.message || `Erreur ${res.status}` }, { status: 502 })
      messages.push({ role: "assistant", content: data.content })
      const uses = (data.content as any[]).filter((c) => c.type === "tool_use")
      if (data.stop_reason !== "tool_use" || uses.length === 0) {
        const text = (data.content as any[]).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim()
        return NextResponse.json({ text: text || "Je n'ai pas de réponse." })
      }
      const results = await Promise.all(uses.map(async (u) => ({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(await runTool(u.name, u.input).catch((e) => ({ error: String(e) }))).slice(0, 12000) })))
      messages.push({ role: "user", content: results })
    }
    return NextResponse.json({ text: "La question demande trop d'étapes, essaie de la préciser." })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 })
  }
}
