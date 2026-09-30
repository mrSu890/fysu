"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react"

/* ====================================================================
   CHOIX DES PRODUITS (rangées et collections)
   - en haut : les produits choisis, dans l'ordre d'affichage (flèches pour les déplacer)
   - en bas : tous les autres produits, avec recherche
   ==================================================================== */

export type PickerProduct = {
  id: number
  name: string
  thumbnail_url?: string | null
  gender?: string | null
}

function Thumb({ url, name }: { url?: string | null; name: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className="h-12 w-10 shrink-0 rounded-lg object-cover" />
  ) : (
    <div className="h-12 w-10 shrink-0 rounded-lg bg-[#f0ece5]" />
  )
}

export default function ProductPicker({
  products,
  value,
  onChange,
}: {
  products: PickerProduct[]
  value: number[]
  onChange: (ids: number[]) => void
}) {
  const [query, setQuery] = useState("")

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const selected = value.map((id) => byId.get(id)).filter(Boolean) as PickerProduct[]

  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => !value.includes(p.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
  }, [products, value, query])

  const move = (index: number, delta: number) => {
    const next = [...value]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium text-[#3d3a35]">
          Produits choisis ({selected.length}) — dans l&apos;ordre d&apos;affichage
        </p>
        {selected.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#ddd7cd] px-4 py-5 text-center text-xs text-[#9a948a]">
            Aucun produit pour l&apos;instant. Ajoute-en depuis la liste ci-dessous.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {selected.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-[#e9e5df] bg-white p-2"
              >
                <Thumb url={p.thumbnail_url} name={p.name} />
                <p className="min-w-0 flex-1 truncate text-sm">{p.name}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label="Monter"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#171717]/[0.05] disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={i === selected.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Descendre"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#171717]/[0.05] disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((id) => id !== p.id))}
                    aria-label="Retirer"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#fdeeee] text-[#9b1c1c]"
                  >
                    <X size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-[#3d3a35]">Ajouter des produits</p>
        <div className="relative mb-2">
          <Search
            size={15}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a948a]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full rounded-2xl border border-[#e0dbd3] bg-white py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-[#b3ada3] focus:ring-2 focus:ring-[#171717]/10"
          />
        </div>
        <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {available.length === 0 ? (
            <li className="px-2 py-4 text-center text-xs text-[#9a948a]">
              {query ? "Aucun produit trouvé" : "Tous les produits sont déjà choisis"}
            </li>
          ) : (
            available.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-[#e9e5df] bg-white p-2"
              >
                <Thumb url={p.thumbnail_url} name={p.name} />
                <p className="min-w-0 flex-1 truncate text-sm">{p.name}</p>
                <button
                  type="button"
                  onClick={() => onChange([...value, p.id])}
                  aria-label={`Ajouter ${p.name}`}
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#171717] text-white"
                >
                  <Plus size={14} />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
