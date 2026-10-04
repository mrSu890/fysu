"use client"

import { Plus, Trash2 } from "lucide-react"
import { DEFAULT_SIZES, TEMPLATE_COLUMNS, emptyGuide, type SizeGuide, type SizeGuideTemplate } from "@/lib/sizeGuide"

/* ====================================================================
   ÉDITEUR DU TABLEAU DES TAILLES (admin)
   Les mesures s'écrivent en cm ; le site les convertit en pouces tout seul.
   ==================================================================== */

const CELL =
  "h-9 w-full min-w-[64px] rounded-lg border border-[#e0dbd3] bg-white px-2 text-center text-sm text-[#171717] outline-none focus:ring-2 focus:ring-[#171717]/10"

const TEMPLATES: { id: SizeGuideTemplate; label: string; hint: string }[] = [
  { id: "top", label: "Haut", hint: "T-shirt, chemise, veste… (dessin A B C D)" },
  { id: "bottom", label: "Bas", hint: "Pantalon, short… (dessin A B C D)" },
  { id: "none", label: "Libre", hint: "Tes colonnes, sans dessin" },
]

export default function SizeGuideEditor({
  value,
  onChange,
}: {
  value: SizeGuide | null
  onChange: (v: SizeGuide | null) => void
}) {
  if (!value) {
    return (
      <div>
        <p className="mb-3 text-sm text-[#7a756d]">
          Ajoute un tableau de mesures que les clients verront en cm ou en pouces, avec un dessin du vêtement.
        </p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(emptyGuide(t.id))}
              className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-[#171717] ring-1 ring-[#e0dbd3] hover:bg-[#faf8f5]"
              title={t.hint}
            >
              + Tableau « {t.label} »
            </button>
          ))}
        </div>
      </div>
    )
  }

  const g = value
  const set = (patch: Partial<SizeGuide>) => onChange({ ...g, ...patch })

  function changeTemplate(t: SizeGuideTemplate) {
    if (t === g.template) return
    if (!confirm("Changer de modèle remplace les noms des colonnes (les mesures déjà écrites sont gardées). Continuer ?")) return
    const cols = t === "none" ? g.columns : [...TEMPLATE_COLUMNS[t].fr]
    onChange({
      ...g,
      template: t,
      columns: cols,
      rows: g.rows.map((r) => ({ ...r, values: cols.map((_, i) => r.values[i] ?? "") })),
    })
  }

  function setColumn(i: number, name: string) {
    set({ columns: g.columns.map((c, k) => (k === i ? name : c)) })
  }
  function addColumn() {
    if (g.columns.length >= 12) return
    set({ columns: [...g.columns, ""], rows: g.rows.map((r) => ({ ...r, values: [...r.values, ""] })) })
  }
  function removeColumn(i: number) {
    if (g.columns.length <= 1) return
    set({
      columns: g.columns.filter((_, k) => k !== i),
      rows: g.rows.map((r) => ({ ...r, values: r.values.filter((_, k) => k !== i) })),
    })
  }
  function setCell(ri: number, ci: number, v: string) {
    set({ rows: g.rows.map((r, k) => (k === ri ? { ...r, values: r.values.map((x, j) => (j === ci ? v : x)) } : r)) })
  }
  function setSize(ri: number, v: string) {
    set({ rows: g.rows.map((r, k) => (k === ri ? { ...r, size: v } : r)) })
  }
  function addRow() {
    if (g.rows.length >= 30) return
    set({ rows: [...g.rows, { size: DEFAULT_SIZES[g.rows.length] ?? "", values: g.columns.map(() => "") }] })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[#7a756d]">Modèle de dessin :</span>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => changeTemplate(t.id)}
            title={t.hint}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              g.template === t.id ? "bg-[#171717] text-white" : "bg-white text-[#171717] ring-1 ring-[#e0dbd3]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {g.template !== "none" && (
        <p className="text-xs text-[#7a756d]">
          Sur le site, un dessin montre les lignes A, B, C, D : elles correspondent aux 4 premières colonnes, dans l'ordre. Si tu
          ajoutes une image ci-dessus, elle remplace le dessin.
        </p>
      )}

      <div className="-mx-1 overflow-x-auto px-1">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="px-1 text-left text-[11px] font-medium text-[#9a948a]">Taille</th>
              {g.columns.map((c, i) => (
                <th key={i} className="min-w-[84px]">
                  <div className="flex items-center gap-1">
                    {g.template !== "none" && i < 4 && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#171717] text-[10px] font-bold text-white">
                        {String.fromCharCode(65 + i)}
                      </span>
                    )}
                    <input
                      className={CELL + " font-medium"}
                      value={c}
                      placeholder="Mesure"
                      onChange={(e) => setColumn(i, e.target.value)}
                    />
                    <button
                      type="button"
                      title="Supprimer la colonne"
                      onClick={() => removeColumn(i)}
                      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#9b1c1c] hover:bg-[#fdeeee]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {g.rows.map((r, ri) => (
              <tr key={ri}>
                <td>
                  <input className={CELL + " font-semibold"} value={r.size} onChange={(e) => setSize(ri, e.target.value)} />
                </td>
                {g.columns.map((_, ci) => (
                  <td key={ci}>
                    <input
                      className={CELL}
                      inputMode="decimal"
                      placeholder="cm"
                      value={r.values[ci] ?? ""}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                    />
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    title="Supprimer la ligne"
                    onClick={() => set({ rows: g.rows.filter((_, k) => k !== ri) })}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[#9b1c1c] hover:bg-[#fdeeee]"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-medium text-[#171717] ring-1 ring-[#e0dbd3] hover:bg-[#faf8f5]"
        >
          <Plus size={13} /> Ajouter une taille
        </button>
        <button
          type="button"
          onClick={addColumn}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-medium text-[#171717] ring-1 ring-[#e0dbd3] hover:bg-[#faf8f5]"
        >
          <Plus size={13} /> Ajouter une mesure
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => {
            if (confirm("Supprimer tout le tableau des tailles ?")) onChange(null)
          }}
          className="cursor-pointer rounded-full bg-[#fdeeee] px-3.5 py-2 text-xs font-medium text-[#9b1c1c] ring-1 ring-[#f3c9c9]"
        >
          Supprimer le tableau
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[#7a756d]">Note sous le tableau (facultatif)</label>
        <textarea
          rows={2}
          value={g.note ?? ""}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="Ex : coupe oversize, prends ta taille habituelle."
          className="w-full rounded-2xl border border-[#e0dbd3] bg-white px-4 py-2.5 text-sm text-[#171717] outline-none focus:ring-2 focus:ring-[#171717]/10"
        />
      </div>

      <p className="text-[11px] text-[#9a948a]">Les mesures sont en cm (décimales avec . ou ,). Les clients peuvent les voir en pouces.</p>
    </div>
  )
}
