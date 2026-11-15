"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/adminApi"
import { resizeImage } from "@/lib/imageTools"
import type { ProductPick } from "@/lib/emailBlocks"

export const field = "w-full rounded-xl bg-white px-3 py-2.5 text-[15px] ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]"

export async function uploadImage(file: File): Promise<string> {
  const small = await resizeImage(file)
  const form = new FormData()
  form.append("file", small)
  form.append("bucket", "story-media")
  const r = await api.upload<{ url: string }>("/api/admin/stories/upload", form)
  return r.url
}

export function ProductPicker({ items, onChange }: { items: ProductPick[]; onChange: (v: ProductPick[]) => void }) {
  const [q, setQ] = useState("")
  const [all, setAll] = useState<ProductPick[]>([])
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => api.get<{ items: ProductPick[] }>(`/api/admin/newsletter/products?q=${encodeURIComponent(q)}`).then((r) => setAll(r.items)).catch(() => {}), 200)
    return () => clearTimeout(t)
  }, [q, open])
  const has = (id: number) => items.some((p) => p.id === id)
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <button key={p.id} type="button" onClick={() => onChange(items.filter((x) => x.id !== p.id))} className="flex items-center gap-2 rounded-full bg-[#f3f0ea] py-1 pl-1 pr-3 text-xs">
            {p.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.imageUrl} alt="" className="h-7 w-7 rounded-full object-cover" />}
            {p.name} ✕
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-4">
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-sm underline">{open ? "Fermer la liste" : "Ajouter des produits"}</button>
        <button type="button" className="text-sm underline" onClick={() => api.get<{ items: ProductPick[] }>("/api/admin/newsletter/products?q=").then((r) => onChange(r.items.slice(0, 4))).catch(() => {})}>Les 4 derniers produits</button>
        {items.length > 0 && <button type="button" className="text-sm underline" onClick={() => onChange([])}>Tout retirer</button>}
      </div>
      {open && (
        <div className="mt-2 rounded-xl bg-[#faf8f5] p-2 ring-1 ring-[#e0dbd3]">
          <input className={field} placeholder="Rechercher un produit" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {all.map((p) => (
              <button key={p.id} type="button" onClick={() => onChange(has(p.id) ? items.filter((x) => x.id !== p.id) : [...items, p])} className={`flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm ${has(p.id) ? "bg-[#171717] text-white" : "hover:bg-white"}`}>
                {p.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />}
                <span className="flex-1">{p.name}</span>
                <span className="text-xs opacity-70">{p.price} EUR</span>
              </button>
            ))}
            {all.length === 0 && <p className="p-2 text-xs text-[#6b6760]">Aucun produit.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

