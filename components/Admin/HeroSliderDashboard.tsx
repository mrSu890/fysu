"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ImagePlus, Trash2 } from "lucide-react"
import { AdminButton, EmptyState, PageHeader, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { supabaseClient } from "@/lib/supabaseClient"
import { api, errorMessage, notify } from "@/lib/adminApi"
import { resizeImage } from "@/lib/imageTools"

/* ====================================================================
   ACCUEIL (HERO) : les images et vidéos du grand carrousel de la page d'accueil
   ==================================================================== */

type HeroMedia = {
  id: string
  media_path: string
  media_type?: "image" | "video"
  order: number
}

const getUrl = (path: string) =>
  `https://mugpnlsqeqbojnzrfnjf.supabase.co/storage/v1/object/public/hero-images/${path}`

const isVideoMedia = (m: HeroMedia) =>
  m.media_type === "video" || /\.(mp4|webm|mov)$/i.test(m.media_path)

export default function HeroSliderDashboard() {
  const [items, setItems] = useState<HeroMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabaseClient
      .from("hero_slider")
      .select("id, media_path, media_type, order")
      .order("order")

    if (error) notify.error("Impossible de charger les médias")
    else setItems((data as HeroMedia[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files: File[] = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0) return

    setUploading(true)
    let done = 0
    for (const original of files) {
      try {
        const isVideo = original.type.startsWith("video")
        const file = isVideo ? original : await resizeImage(original)
        const form = new FormData()
        form.append("file", file)
        form.append("type", isVideo ? "video" : "image")
        await api.upload("/api/admin/hero-images/upload", form)
        done += 1
      } catch (err) {
        notify.error(errorMessage(err, `Envoi impossible : ${original.name}`))
      }
    }
    setUploading(false)
    if (done > 0) notify.success(done > 1 ? `${done} médias ajoutés` : "Média ajouté")
    load()
  }

  async function remove(item: HeroMedia) {
    if (!confirm("Supprimer ce média du carrousel de l'accueil ?")) return
    setBusyId(item.id)
    try {
      await api.post("/api/admin/hero-images/delete", { id: item.id, path: item.media_path })
      notify.success("Média supprimé")
      load()
    } catch (err) {
      notify.error(errorMessage(err, "Impossible de supprimer le média"))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Contenu du site"
        title="Accueil (hero)"
        description="Les images et vidéos du grand carrousel de la page d'accueil. Pour les images de garde des autres pages, va dans « Images de garde »."
        actions={
          <>
            <AdminButton href="/admin/heroes">Images de garde</AdminButton>
            <AdminButton
              variant="primary"
              icon={ImagePlus}
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? "Envoi en cours…" : "Ajouter un média"}
            </AdminButton>
          </>
        }
      />

      <input
        ref={fileInput}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={onFiles}
      />

      <Panel title="Carrousel" description="Images et vidéos affichées en haut de l'accueil.">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-52 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucun média"
            description="Ajoute une image ou une vidéo avec le bouton « Ajouter un média »."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item: HeroMedia) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-[#e9e5df] bg-white"
              >
                <div className="relative aspect-[8/5] w-full bg-[#f0ece5]">
                  {isVideoMedia(item) ? (
                    <video
                      src={getUrl(item.media_path)}
                      className="absolute inset-0 h-full w-full object-cover"
                      muted
                      autoPlay
                      loop
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getUrl(item.media_path)}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="text-xs text-[#7a756d]">
                    {isVideoMedia(item) ? "Vidéo" : "Image"}
                  </span>
                  <AdminButton
                    variant="danger"
                    icon={Trash2}
                    disabled={busyId === item.id}
                    onClick={() => remove(item)}
                  >
                    Supprimer
                  </AdminButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
