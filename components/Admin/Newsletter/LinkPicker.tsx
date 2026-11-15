"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronRight, Link2, Search, X } from "lucide-react"
import { api } from "@/lib/adminApi"

type Group = { group: string; items: { label: string; url: string }[] }
let cache: Group[] | null = null

/* Choisir la page vers laquelle ça mène, dans la liste des pages du site. */
export default function LinkPicker({ value, onChange, optional }: { value: string; onChange: (url: string) => void; optional?: boolean }) {
  const [open, setOpen] = useState(false)
  const [groups, setGroups] = useState<Group[]>(cache ?? [])
  const [q, setQ] = useState("")
  const [custom, setCustom] = useState("")

  useEffect(() => {
    if (!open || cache) return
    api.get<{ groups: Group[] }>("/api/admin/links").then((r) => { cache = r.groups; setGroups(r.groups) }).catch(() => {})
  }, [open])

  const norm = (u: string) => u.replace(/\/$/, "")
  const all = groups.flatMap((g) => g.items)
  const current = all.find((i) => norm(i.url) === norm(value))
  const label = !value ? (optional ? "Aucun lien" : "Choisir une page") : current?.label ?? value.replace(/^https?:\/\//, "")

  const s = q.trim().toLowerCase()
  const shown = groups.map((g) => ({ ...g, items: g.items.filter((i) => !s || i.label.toLowerCase().includes(s)) })).filter((g) => g.items.length)
  const pick = (u: string) => { onChange(u); setOpen(false); setQ("") }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-[15px] ring-1 ring-[#e0dbd3] hover:ring-[#171717]">
        <Link2 size={15} className="shrink-0 text-[#9a948a]" />
        <span className={`min-w-0 flex-1 truncate ${value ? "" : "text-[#9a948a]"}`}>{label}</span>
        <ChevronRight size={15} className="text-[#9a948a]" />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-white sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-[#f0ece5] px-4">
              <Search size={16} className="text-[#9a948a]" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une page" className="h-14 flex-1 bg-transparent text-[16px] outline-none" />
              <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-[#171717]/[0.06]"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {optional && value && <button type="button" onClick={() => pick("")} className="mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm text-[#9b1c1c] hover:bg-[#fdeeee]">Retirer le lien</button>}
              {groups.length === 0 && <p className="p-4 text-center text-sm text-[#9a948a]">Chargement…</p>}
              {shown.map((g) => (
                <div key={g.group} className="mb-2">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-[#9a948a]">{g.group}</p>
                  {g.items.map((i) => (
                    <button key={i.url} type="button" onClick={() => pick(i.url)} className={`w-full truncate rounded-xl px-3 py-2.5 text-left text-sm ${norm(i.url) === norm(value) ? "bg-[#171717] text-white" : "hover:bg-[#171717]/[0.05]"}`}>{i.label}</button>
                  ))}
                </div>
              ))}
              <div className="mt-2 border-t border-[#f0ece5] p-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#9a948a]">Autre adresse</p>
                <div className="flex gap-2">
                  <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="https://…" className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]" />
                  <button type="button" disabled={!/^https?:\/\//i.test(custom.trim())} onClick={() => pick(custom.trim())} className="rounded-full bg-[#171717] px-4 text-sm text-white disabled:opacity-30">OK</button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
