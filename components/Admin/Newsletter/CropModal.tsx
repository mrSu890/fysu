"use client"

import { useEffect, useRef, useState } from "react"
import { Check, X } from "lucide-react"
import { notify } from "@/lib/adminApi"

const RATIOS: [string, number][] = [["Original", 0], ["1:1", 1], ["4:5", 0.8], ["3:4", 0.75], ["3:2", 1.5], ["16:9", 16 / 9]]

/* Recadrage : on choisit le format, on fait glisser la photo, on zoome, puis on valide. */
export default function CropModal({ src, onCancel, onDone }: { src: File | string; onCancel: () => void; onDone: (f: File) => void }) {
  const [url, setUrl] = useState("")
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [ratio, setRatio] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [fail, setFail] = useState(false)
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const img = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (typeof src === "string") { setUrl(src); return }
    const u = URL.createObjectURL(src)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [src])

  const W = typeof window === "undefined" ? 320 : Math.min(340, window.innerWidth - 48)
  const aspect = ratio || (nat ? nat.w / nat.h : 1)
  const H = Math.min(W / aspect, 460)
  const FW = H === 460 ? 460 * aspect : W
  const base = nat ? Math.max(FW / nat.w, H / nat.h) : 1
  const s = base * zoom

  const clamp = (x: number, y: number) => {
    if (!nat) return { x, y }
    return { x: Math.min(0, Math.max(FW - nat.w * s, x)), y: Math.min(0, Math.max(H - nat.h * s, y)) }
  }
  // recentre quand le format ou le zoom change
  useEffect(() => {
    if (!nat) return
    setPos((p) => clamp(p.x === 0 && p.y === 0 ? (FW - nat.w * s) / 2 : p.x, p.x === 0 && p.y === 0 ? (H - nat.h * s) / 2 : p.y))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nat, ratio, zoom])

  function out() {
    if (!nat || !img.current) return
    try {
      const outW = 1600
      const outH = Math.round(outW / aspect)
      const c = document.createElement("canvas")
      c.width = outW; c.height = outH
      const g = c.getContext("2d")!
      g.drawImage(img.current, -pos.x / s, -pos.y / s, FW / s, H / s, 0, 0, outW, outH)
      c.toBlob((b) => {
        if (!b) { setFail(true); notify.error("Recadrage impossible"); return }
        onDone(new File([b], "photo.jpg", { type: "image/jpeg" }))
      }, "image/jpeg", 0.9)
    } catch {
      setFail(true)
      notify.error("Impossible de recadrer cette photo : choisis-la à nouveau depuis ton téléphone.")
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/80 p-4" onClick={onCancel}>
      <div className="flex w-full max-w-[400px] flex-col items-center gap-4 rounded-3xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex w-full items-center">
          <button type="button" aria-label="Annuler" onClick={onCancel} className="rounded-full p-2 hover:bg-[#171717]/[0.06]"><X size={18} /></button>
          <span className="mx-auto text-sm font-medium">Recadrer</span>
          <button type="button" aria-label="Valider" onClick={out} disabled={!nat || fail} className="flex items-center gap-1.5 rounded-full bg-[#171717] px-4 py-2 text-sm text-white disabled:opacity-40"><Check size={15} />OK</button>
        </div>

        <div className="relative touch-none select-none overflow-hidden rounded-xl bg-[#e8e7e3]" style={{ width: FW, height: H }}
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y } }}
          onPointerMove={(e) => { const d = drag.current; if (d) setPos(clamp(d.x + e.clientX - d.px, d.y + e.clientY - d.py)) }}
          onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
          {url && /* eslint-disable-next-line @next/next/no-img-element */ <img ref={img} src={url} alt="" crossOrigin="anonymous" draggable={false}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={() => setFail(true)}
            style={{ position: "absolute", left: pos.x, top: pos.y, width: nat ? nat.w * s : "auto", height: nat ? nat.h * s : "auto", maxWidth: "none" }} />}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-white/50" />)}</div>
        </div>
        {fail && <p className="text-xs text-[#9b1c1c]">Cette photo ne peut pas être recadrée ici. Choisis-la à nouveau depuis ton téléphone.</p>}

        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" className="w-full accent-[#171717]" />
        <div className="flex flex-wrap justify-center gap-2">
          {RATIOS.map(([l, r]) => (
            <button key={l} type="button" onClick={() => { setRatio(r); setPos({ x: 0, y: 0 }) }} className={`rounded-full px-3 py-1.5 text-sm ring-1 ${ratio === r ? "bg-[#171717] text-white ring-[#171717]" : "bg-white ring-[#e0dbd3]"}`}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
