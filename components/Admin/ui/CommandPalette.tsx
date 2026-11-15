"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CornerDownLeft, Plus, Search, Shirt, type LucideIcon } from "lucide-react"
import { IconTile, type TileTone } from "@/components/Admin/ui/kit"
import { api } from "@/lib/adminApi"

export type PaletteItem = { label: string; href: string; icon: LucideIcon; tone: TileTone }

type Row = { key: string; label: string; href: string; icon: LucideIcon; tone: TileTone; hint?: string }

/* Recherche rapide : ouvre n'importe quelle page ou produit (touche « / » ou Ctrl/⌘ + K, ou la loupe en haut) */
export default function CommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: PaletteItem[] }) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [cursor, setCursor] = useState(0)
  const [products, setProducts] = useState<{ id: number; name: string }[]>([])
  const loaded = useRef(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQ(""); setCursor(0)
    setTimeout(() => input.current?.focus(), 30)
    if (!loaded.current) {
      loaded.current = true
      api.get<{ products: { id: number; name: string }[] }>("/api/admin/products").then((r) => setProducts(r.products)).catch(() => { loaded.current = false })
    }
  }, [open])

  const rows = useMemo<Row[]>(() => {
    const s = q.trim().toLowerCase()
    const actions: Row[] = [
      { key: "a-prod", label: "Nouveau produit", href: "/admin/catalog/new", icon: Plus, tone: "blue" },
      { key: "a-news", label: "Nouvelle newsletter", href: "/admin/newsletter", icon: Plus, tone: "orange" },
    ]
    const pages: Row[] = items.map((i) => ({ key: i.href, label: i.label, href: i.href, icon: i.icon, tone: i.tone }))
    const prods: Row[] = products.map((p) => ({ key: `p-${p.id}`, label: p.name, href: `/admin/catalog/${p.id}`, icon: Shirt, tone: "blue" as TileTone, hint: "Produit" }))
    const all = [...actions, ...pages, ...prods]
    return (s ? all.filter((r) => r.label.toLowerCase().includes(s)) : [...actions, ...pages]).slice(0, 12)
  }, [q, items, products])

  useEffect(() => setCursor(0), [q])

  if (!open) return null
  const go = (r: Row) => { onClose(); router.push(r.href) }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/35 px-4 pt-[12vh] backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-[#e9e5df]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[#f0ece5] px-4">
          <Search size={17} className="text-[#9a948a]" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose()
              else if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(rows.length - 1, c + 1)) }
              else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)) }
              else if (e.key === "Enter" && rows[cursor]) go(rows[cursor])
            }}
            placeholder="Aller à…"
            className="h-14 flex-1 bg-transparent text-[16px] outline-none"
          />
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {rows.length === 0 && <li className="px-3 py-6 text-center text-sm text-[#9a948a]">Rien trouvé</li>}
          {rows.map((r, i) => (
            <li key={r.key}>
              <button type="button" onMouseEnter={() => setCursor(i)} onClick={() => go(r)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm ${i === cursor ? "bg-[#171717]/[0.06]" : ""}`}>
                <IconTile icon={r.icon} tone={r.tone} size={28} />
                <span className="flex-1 truncate">{r.label}</span>
                {r.hint && <span className="text-xs text-[#9a948a]">{r.hint}</span>}
                {i === cursor && <CornerDownLeft size={13} className="text-[#9a948a]" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
