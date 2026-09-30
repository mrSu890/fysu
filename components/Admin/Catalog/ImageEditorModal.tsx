"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { RotateCcw, RotateCw, X } from "lucide-react"
import { AdminButton } from "@/components/Admin/ui/kit"
import { loadImageForCanvas } from "@/lib/imageTools"

/* ====================================================================
   RECADRER / PIVOTER UNE IMAGE
   - glisse l'image avec le doigt pour la placer
   - curseur pour zoomer, boutons pour pivoter
   - formats : Original, 3:4 (fiche produit), 1:1, 4:5
   ==================================================================== */

type Aspect = "original" | "3:4" | "1:1" | "4:5"

const ASPECTS: { id: Aspect; label: string; ratio: number | null }[] = [
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "original", label: "Original", ratio: null },
]

const MAX_OUTPUT = 2400

export default function ImageEditorModal({
  url,
  onCancel,
  onSave,
}: {
  url: string
  onCancel: () => void
  onSave: (file: File) => void | Promise<void>
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [aspect, setAspect] = useState<Aspect>("3:4")
  const [rotation, setRotation] = useState(0) // 0 / 90 / 180 / 270
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [box, setBox] = useState({ w: 320, h: 420 })

  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    loadImageForCanvas(url)
      .then((i) => !cancelled && setImg(i))
      .catch(() => !cancelled && setError("Impossible de charger cette image pour la modifier."))
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    const update = () =>
      setBox({
        w: Math.min(420, window.innerWidth - 48),
        h: Math.max(240, Math.min(window.innerHeight * 0.5, 520)),
      })
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  // dimensions de l'image une fois pivotée
  const eff = useMemo(() => {
    if (!img) return { w: 1, h: 1 }
    return rotation % 180 === 0
      ? { w: img.naturalWidth, h: img.naturalHeight }
      : { w: img.naturalHeight, h: img.naturalWidth }
  }, [img, rotation])

  // taille du cadre
  const frame = useMemo(() => {
    const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? eff.w / eff.h
    let w = box.w
    let h = w / ratio
    if (h > box.h) {
      h = box.h
      w = h * ratio
    }
    return { w, h }
  }, [aspect, box, eff])

  // échelle : l'image couvre toujours le cadre, puis zoom
  const scale = Math.max(frame.w / eff.w, frame.h / eff.h) * zoom

  const clamp = (o: { x: number; y: number }) => {
    const maxX = Math.max(0, (eff.w * scale - frame.w) / 2)
    const maxY = Math.max(0, (eff.h * scale - frame.h) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, o.x)),
      y: Math.min(maxY, Math.max(-maxY, o.y)),
    }
  }

  // repositionne dans les limites quand le cadre, le zoom ou la rotation changent
  useEffect(() => {
    setOffset((o) => clamp(o))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.w, frame.h, zoom, rotation, img])

  function rotate(dir: 1 | -1) {
    setRotation((r) => (r + 90 * dir + 360) % 360)
    setOffset({ x: 0, y: 0 })
  }

  async function save() {
    if (!img) return
    setSaving(true)
    try {
      // qualité d'origine, plafonnée à 2400 px
      let k = 1 / scale
      const longest = Math.max(frame.w, frame.h) * k
      if (longest > MAX_OUTPUT) k = k * (MAX_OUTPUT / longest)

      const canvas = document.createElement("canvas")
      canvas.width = Math.round(frame.w * k)
      canvas.height = Math.round(frame.h * k)
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("canvas")

      const isPng = /\.png($|\?)/i.test(url)
      if (!isPng) {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.translate(canvas.width / 2 + offset.x * k, canvas.height / 2 + offset.y * k)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(scale * k, scale * k)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, isPng ? "image/png" : "image/jpeg", 0.92)
      )
      if (!blob) throw new Error("blob")

      const file = new File([blob], `edited.${isPng ? "png" : "jpg"}`, {
        type: isPng ? "image/png" : "image/jpeg",
      })
      await onSave(file)
    } catch {
      setError("Impossible d'enregistrer cette modification.")
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center">
      <div className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Modifier l&apos;image</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#171717]/[0.06]"
          >
            <X size={16} />
          </button>
        </div>

        {error ? (
          <p className="rounded-2xl bg-[#fdeeee] px-4 py-3 text-sm text-[#7a1f1f]">{error}</p>
        ) : !img ? (
          <p className="py-16 text-center text-sm text-[#7a756d]">Chargement…</p>
        ) : (
          <>
            {/* Cadre */}
            <div className="flex justify-center">
              <div
                className="relative touch-none select-none overflow-hidden rounded-2xl bg-[#f0ece5] ring-1 ring-[#e0dbd3]"
                style={{ width: frame.w, height: frame.h }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return
                  setOffset(
                    clamp({
                      x: drag.current.ox + (e.clientX - drag.current.x),
                      y: drag.current.oy + (e.clientY - drag.current.y),
                    })
                  )
                }}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                  style={{
                    width: img.naturalWidth * scale,
                    height: img.naturalHeight * scale,
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg)`,
                  }}
                />
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-[#9a948a]">
              Glisse l&apos;image pour la placer.
            </p>

            {/* Format */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
              {ASPECTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setAspect(a.id)
                    setOffset({ x: 0, y: 0 })
                  }}
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm ${
                    aspect === a.id
                      ? "bg-[#171717] text-white"
                      : "bg-[#171717]/[0.06] text-[#3d3a35]"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {/* Zoom + rotation */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => rotate(-1)}
                aria-label="Pivoter à gauche"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#171717]/[0.06]"
              >
                <RotateCcw size={17} />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom"
                className="h-2 flex-1 cursor-pointer accent-[#171717]"
              />
              <button
                type="button"
                onClick={() => rotate(1)}
                aria-label="Pivoter à droite"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#171717]/[0.06]"
              >
                <RotateCw size={17} />
              </button>
            </div>
          </>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onCancel} disabled={saving}>
            Annuler
          </AdminButton>
          <AdminButton variant="primary" onClick={save} disabled={!img || saving}>
            {saving ? "Enregistrement…" : "Appliquer"}
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
