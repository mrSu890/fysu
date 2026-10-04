"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { AdminButton, EmptyState, PageHeader, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"

type Avatar = { id: string; url: string; label: string | null }

export default function AdminAvatars() {
  const [avatars, setAvatars] = useState<Avatar[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ avatars: Avatar[] }>("/api/admin/avatars")
      setAvatars(r.avatars)
      setError(null)
    } catch (e) {
      setError(errorMessage(e, "Impossible de charger les avatars"))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    try {
      const form = new FormData()
      Array.from(files).forEach((f) => form.append("file", f))
      await api.upload("/api/admin/avatars", form)
      notify.success("Avatars ajoutés")
      await load()
    } catch (e) {
      notify.error(errorMessage(e, "Envoi impossible"))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  async function remove(a: Avatar) {
    if (!confirm("Supprimer cet avatar ? Les clients qui l'ont choisi garderont l'image.")) return
    try {
      await api.del("/api/admin/avatars", { id: a.id })
      setAvatars((list) => (list ?? []).filter((x) => x.id !== a.id))
    } catch (e) {
      notify.error(errorMessage(e, "Suppression impossible"))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avatars"
        description="Les images que les clients peuvent choisir comme photo de profil. Carrées de préférence (ex. 512 × 512)."
        actions={
          <>
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => upload(e.target.files)}
            />
            <AdminButton variant="primary" onClick={() => input.current?.click()} disabled={busy}>
              <Plus className="h-4 w-4" /> {busy ? "Envoi…" : "Ajouter des avatars"}
            </AdminButton>
          </>
        }
      />

      <Panel>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : avatars === null ? (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-full" />
            ))}
          </div>
        ) : avatars.length === 0 ? (
          <EmptyState title="Aucun avatar" description="Ajoute des images : les clients pourront les choisir dans leur profil." />
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-8">
            {avatars.map((a) => (
              <div key={a.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.label ?? ""} className="aspect-square w-full rounded-full border border-[#e0dbd3] object-cover" />
                <button
                  type="button"
                  onClick={() => remove(a)}
                  aria-label="Supprimer"
                  className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-600 shadow ring-1 ring-black/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
