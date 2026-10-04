"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react"
import { AdminButton, PageHeader, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"

/* ====================================================================
   PAGES LÉGALES MODIFIABLES : conditions, livraison, paiement, retours,
   mentions légales, contact. Un texte par langue (français / anglais).
   Les autres langues sont traduites automatiquement à partir de l'anglais.
   ==================================================================== */

type Lang = "fr" | "en"
type Section = { h: string; p: string } // p = paragraphes séparés par une ligne vide
type Draft = { title: string; intro: string; sections: Section[] }
type Doc = { title: string; intro?: string; sections: { h: string; p: string[] }[] }

const DOCS = [
  { slug: "terms", label: "Conditions de vente" },
  { slug: "shipping", label: "Livraison" },
  { slug: "payment", label: "Paiement" },
  { slug: "returns", label: "Retours" },
  { slug: "legal-notice", label: "Mentions légales" },
  { slug: "contact", label: "Contact" },
]

const toDraft = (d: Doc): Draft => ({
  title: d.title,
  intro: d.intro ?? "",
  sections: d.sections.map((s) => ({ h: s.h, p: s.p.join("\n\n") })),
})

const fromDraft = (d: Draft) => ({
  title: d.title.trim(),
  intro: d.intro.trim(),
  sections: d.sections.map((s) => ({
    h: s.h.trim(),
    p: s.p
      .split(/\n\s*\n/)
      .map((x) => x.trim())
      .filter(Boolean),
  })),
})

const FIELD =
  "w-full rounded-2xl border border-[#e0dbd3] bg-white px-4 py-2.5 text-sm text-[#171717] outline-none focus:ring-2 focus:ring-[#171717]/10"

export default function AdminLegalPages() {
  const [slug, setSlug] = useState(DOCS[0].slug)
  const [lang, setLang] = useState<Lang>("fr")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)
  const [defaults, setDefaults] = useState<Record<Lang, Doc> | null>(null)
  const [overrides, setOverrides] = useState<Partial<Record<Lang, Doc>>>({})
  const [draft, setDraft] = useState<Draft | null>(null)
  const [dirty, setDirty] = useState(false)

  const load = useCallback(async (s: string) => {
    setLoading(true)
    try {
      const r = await api.get<{ defaults: Record<Lang, Doc>; overrides: Partial<Record<Lang, Doc>>; tableMissing: boolean }>(
        `/api/admin/legal-docs?slug=${s}`
      )
      setDefaults(r.defaults)
      setOverrides(r.overrides)
      setTableMissing(r.tableMissing)
    } catch (e) {
      notify.error(errorMessage(e, "Impossible de charger cette page"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(slug)
  }, [slug, load])

  // le brouillon repart du texte modifié (s'il existe) sinon du texte d'origine
  useEffect(() => {
    if (!defaults) return
    setDraft(toDraft(overrides[lang] ?? defaults[lang]))
    setDirty(false)
  }, [defaults, overrides, lang])

  const customized = useMemo(() => !!overrides[lang], [overrides, lang])

  function change(next: Draft) {
    setDraft(next)
    setDirty(true)
  }

  function guard(action: () => void) {
    if (dirty && !confirm("Tu as des modifications non enregistrées. Les abandonner ?")) return
    action()
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    try {
      await api.put("/api/admin/legal-docs", { slug, locale: lang, content: fromDraft(draft) })
      notify.success("Enregistré : la page est à jour sur le site")
      await load(slug)
    } catch (e) {
      notify.error(errorMessage(e, "Erreur lors de l'enregistrement"))
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    if (!confirm("Revenir au texte d'origine pour cette langue ? Tes modifications seront perdues.")) return
    setSaving(true)
    try {
      await api.del("/api/admin/legal-docs", { slug, locale: lang })
      notify.success("Texte d'origine rétabli")
      await load(slug)
    } catch (e) {
      notify.error(errorMessage(e, "Erreur"))
    } finally {
      setSaving(false)
    }
  }

  function moveSection(i: number, dir: -1 | 1) {
    if (!draft) return
    const j = i + dir
    if (j < 0 || j >= draft.sections.length) return
    const sections = [...draft.sections]
    ;[sections[i], sections[j]] = [sections[j], sections[i]]
    change({ ...draft, sections })
  }

  return (
    <>
      <PageHeader
        eyebrow="Contenu du site"
        title="Pages légales"
        description="Modifie les textes des conditions, de la livraison, du paiement, des retours, des mentions légales et du contact. Le changement est visible tout de suite sur le site."
      />

      {tableMissing && (
        <div className="mb-6 rounded-2xl border border-[#f3d9a8] bg-[#fff8ea] p-4 text-sm text-[#6b4b00]">
          La table « legal_docs » n'existe pas encore dans Supabase : tu vois les textes d'origine, mais l'enregistrement ne
          marchera pas tant qu'elle n'est pas créée (je t'ai donné le bloc SQL à coller).
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {DOCS.map((d) => (
          <button
            key={d.slug}
            type="button"
            onClick={() => guard(() => setSlug(d.slug))}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition ${
              slug === d.slug ? "bg-[#171717] text-white" : "bg-white text-[#171717] ring-1 ring-[#e0dbd3] hover:bg-[#faf8f5]"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-2">
        {(["fr", "en"] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => guard(() => setLang(l))}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              lang === l ? "bg-[#171717] text-white" : "bg-white text-[#171717] ring-1 ring-[#e0dbd3]"
            }`}
          >
            {l === "fr" ? "Français" : "English"}
          </button>
        ))}
        <span className="ml-2 text-xs text-[#9a948a]">
          {customized ? "Texte modifié par toi" : "Texte d'origine"}
          {dirty && " · modifications non enregistrées"}
        </span>
      </div>

      {loading || !draft ? (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="space-y-4">
          <Panel title="En-tête de la page">
            <label className="mb-1 block text-xs font-medium text-[#7a756d]">Titre</label>
            <input className={FIELD} value={draft.title} onChange={(e) => change({ ...draft, title: e.target.value })} />
            <label className="mb-1 mt-4 block text-xs font-medium text-[#7a756d]">Phrase d'introduction (facultatif)</label>
            <textarea
              className={FIELD}
              rows={2}
              value={draft.intro}
              onChange={(e) => change({ ...draft, intro: e.target.value })}
            />
          </Panel>

          {draft.sections.map((s, i) => (
            <Panel key={i}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-[#9a948a]">Section {i + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Monter"
                    onClick={() => moveSection(i, -1)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#3d3a35] hover:bg-[#171717]/[0.06]"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    title="Descendre"
                    onClick={() => moveSection(i, 1)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#3d3a35] hover:bg-[#171717]/[0.06]"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    title="Supprimer cette section"
                    onClick={() => {
                      if (!confirm("Supprimer cette section ?")) return
                      change({ ...draft, sections: draft.sections.filter((_, k) => k !== i) })
                    }}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#9b1c1c] hover:bg-[#fdeeee]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <label className="mb-1 block text-xs font-medium text-[#7a756d]">Sous-titre</label>
              <input
                className={FIELD}
                value={s.h}
                onChange={(e) => change({ ...draft, sections: draft.sections.map((x, k) => (k === i ? { ...x, h: e.target.value } : x)) })}
              />
              <label className="mb-1 mt-4 block text-xs font-medium text-[#7a756d]">
                Texte (laisse une ligne vide entre deux paragraphes)
              </label>
              <textarea
                className={FIELD}
                rows={Math.min(14, Math.max(4, s.p.split("\n").length + 2))}
                value={s.p}
                onChange={(e) => change({ ...draft, sections: draft.sections.map((x, k) => (k === i ? { ...x, p: e.target.value } : x)) })}
              />
            </Panel>
          ))}

          <div className="flex flex-wrap items-center gap-2 pb-10">
            <AdminButton
              icon={Plus}
              onClick={() => change({ ...draft, sections: [...draft.sections, { h: "", p: "" }] })}
            >
              Ajouter une section
            </AdminButton>
            <div className="flex-1" />
            {customized && (
              <AdminButton variant="ghost" icon={RotateCcw} onClick={reset} disabled={saving}>
                Revenir au texte d'origine
              </AdminButton>
            )}
            <AdminButton variant="primary" onClick={save} disabled={saving || !dirty}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </AdminButton>
          </div>

          <p className="pb-6 text-xs text-[#9a948a]">
            Les autres langues du site sont traduites automatiquement à partir de la version anglaise. Les informations de
            l'entreprise (adresse, numéro BCE, TVA) sont écrites dans les textes : pense à les mettre à jour ici le jour où
            vous passez en société.
          </p>
        </div>
      )}
    </>
  )
}
