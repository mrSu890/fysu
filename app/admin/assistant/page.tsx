"use client"

import { useEffect, useRef, useState } from "react"
import { Send, Sparkles } from "lucide-react"
import { PageHeader } from "@/components/Admin/ui/kit"
import { api, errorMessage } from "@/lib/adminApi"

type M = { role: "user" | "assistant"; text: string }
const IDEAS = ["Résume la semaine", "Qui sont mes 5 meilleurs clients ?", "Quels clients à relancer, avec un message pour eux ?", "Qu'est-ce qui est à expédier ?", "Quel stock est bas ?"]

export default function AssistantPage() {
  const [msgs, setMsgs] = useState<M[]>([])
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs, busy])

  async function ask(q: string) {
    if (!q.trim() || busy) return
    const next: M[] = [...msgs, { role: "user", text: q.trim() }]
    setMsgs(next); setText(""); setBusy(true); setErr("")
    try {
      const r = await api.post<{ text: string }>("/api/admin/assistant", { messages: next })
      setMsgs([...next, { role: "assistant", text: r.text }])
    } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Assistant" description="Pose une question sur la boutique. Il regarde tes vrais chiffres, mais ne peut rien modifier ni envoyer." />
      <div className="space-y-3">
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {IDEAS.map((i) => <button key={i} type="button" onClick={() => ask(i)} className="rounded-full bg-white px-3.5 py-2 text-sm ring-1 ring-[#e0dbd3] hover:ring-[#171717]">{i}</button>)}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
            <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === "user" ? "bg-[#171717] text-white" : "bg-white ring-1 ring-[#e9e5df]"}`}>{m.text}</div>
          </div>
        ))}
        {busy && <p className="flex items-center gap-2 text-sm text-[#9a948a]"><Sparkles size={14} className="animate-pulse" />Il regarde tes chiffres…</p>}
        {err && <p className="rounded-xl bg-[#fdeeee] p-3 text-sm text-[#9b1c1c]">{err}</p>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(text) }} className="sticky bottom-3 mt-4 flex gap-2 rounded-2xl bg-white p-2 shadow-md ring-1 ring-[#e0dbd3]">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ta question…" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[15px] outline-none" />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Envoyer" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171717] text-white disabled:opacity-40"><Send size={16} /></button>
      </form>
    </>
  )
}
