"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, X } from "lucide-react"
import { notify } from "@/lib/adminApi"

type R = { x: number; y: number; w: number; h: number }
type Handle = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"

const PRESETS: [string, number][] = [["Libre", 0], ["Original", -1], ["1:1", 1], ["4:5", 0.8], ["3:4", 0.75], ["3:2", 1.5], ["16:9", 16 / 9]]
const MIN = 48

/* Recadrage libre : la photo est montrée en entier, on déplace le cadre et on tire ses coins ou ses bords. */
export default function CropModal({ src, onCancel, onDone }: { src: File | string; onCancel: () => void; onDone: (f: File) => void }) {
  const [url, setUrl] = useState("")
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [avail, setAvail] = useState({ w: 300, h: 300 })
  const [sel, setSel] = useState("Libre")
  const [rect, setRect] = useState<R | null>(null)
  const [fail, setFail] = useState(false)
  const img = useRef<HTMLImageElement>(null)
  const area = useRef<HTMLDivElement>(null)
  const g = useRef<{ h: Handle; px: number; py: number; r: R } | null>(null)

  useEffect(() => {
    if (typeof src === "string") { setUrl(src); return }
    const u = URL.createObjectURL(src)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [src])

  useEffect(() => {
    const el = area.current
    if (!el) return
    const ro = new ResizeObserver(() => setAvail({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setAvail({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // taille d'affichage de la photo entière
  const scale = nat ? Math.min((avail.w - 24) / nat.w, (avail.h - 24) / nat.h) : 1
  const dw = nat ? Math.max(1, nat.w * scale) : 1
  const dh = nat ? Math.max(1, nat.h * scale) : 1
  const lock = sel === "Libre" ? 0 : sel === "Original" ? (nat ? nat.w / nat.h : 0) : (PRESETS.find((p) => p[0] === sel)?.[1] ?? 0)

  // le cadre garde les mêmes proportions quand la fenêtre change de taille
  const prev = useRef({ dw: 0, dh: 0 })
  useEffect(() => {
    if (!nat) return
    if (!rect) { setRect({ x: 0, y: 0, w: dw, h: dh }); prev.current = { dw, dh }; return }
    const k = dw / (prev.current.dw || dw)
    if (Math.abs(k - 1) > 0.001) setRect((r) => (r ? { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k } : r))
    prev.current = { dw, dh }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nat, dw, dh])

  function choose(label: string, ratio: number) {
    setSel(label)
    if (!nat) return
    const r = label === "Original" ? nat.w / nat.h : ratio
    if (!r) return
    let w = dw, h = dw / r
    if (h > dh) { h = dh; w = dh * r }
    setRect({ x: (dw - w) / 2, y: (dh - h) / 2, w, h })
  }

  const clampMove = (r: R): R => ({ ...r, x: Math.min(dw - r.w, Math.max(0, r.x)), y: Math.min(dh - r.h, Math.max(0, r.y)) })

  function resize(h: Handle, r0: R, dx: number, dy: number): R {
    if (h === "move") return clampMove({ ...r0, x: r0.x + dx, y: r0.y + dy })
    let l = r0.x, t = r0.y, rr = r0.x + r0.w, b = r0.y + r0.h
    if (lock && h.length === 2) {
      // coin avec proportions verrouillées : le coin opposé reste en place
      const ax = h.includes("w") ? rr : l
      const ay = h.includes("n") ? b : t
      const px = (h.includes("w") ? l : rr) + dx
      const py = (h.includes("n") ? t : b) + dy
      const sx = h.includes("w") ? -1 : 1
      const sy = h.includes("n") ? -1 : 1
      let w = Math.max(0, (px - ax) * sx)
      const hh = Math.max(0, (py - ay) * sy)
      w = Math.max(w, hh * lock)
      const maxW = Math.min(sx > 0 ? dw - ax : ax, (sy > 0 ? dh - ay : ay) * lock)
      w = Math.max(MIN, Math.min(w, maxW))
      const nh = w / lock
      const nx = sx > 0 ? ax : ax - w
      const ny = sy > 0 ? ay : ay - nh
      return { x: nx, y: ny, w, h: nh }
    }
    if (h.includes("w")) l = Math.min(rr - MIN, Math.max(0, l + dx))
    if (h.includes("e")) rr = Math.max(l + MIN, Math.min(dw, rr + dx))
    if (h.includes("n")) t = Math.min(b - MIN, Math.max(0, t + dy))
    if (h.includes("s")) b = Math.max(t + MIN, Math.min(dh, b + dy))
    return { x: l, y: t, w: rr - l, h: b - t }
  }

  const down = (h: Handle) => (e: React.PointerEvent) => {
    if (!rect) return
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    g.current = { h, px: e.clientX, py: e.clientY, r: rect }
  }
  const move = (e: React.PointerEvent) => {
    const s = g.current
    if (s) setRect(resize(s.h, s.r, e.clientX - s.px, e.clientY - s.py))
  }
  const up = () => { g.current = null }

  function out() {
    if (!nat || !img.current || !rect) return
    try {
      const sx = rect.x / scale, sy = rect.y / scale, sw = rect.w / scale, sh = rect.h / scale
      const outW = Math.min(1600, Math.round(sw))
      const outH = Math.max(1, Math.round((outW * sh) / sw))
      const c = document.createElement("canvas")
      c.width = outW; c.height = outH
      c.getContext("2d")!.drawImage(img.current, sx, sy, sw, sh, 0, 0, outW, outH)
      c.toBlob((b) => {
        if (!b) { setFail(true); notify.error("Recadrage impossible"); return }
        onDone(new File([b], "photo.jpg", { type: "image/jpeg" }))
      }, "image/jpeg", 0.9)
    } catch {
      setFail(true)
      notify.error("Impossible de recadrer cette photo : choisis-la à nouveau depuis ton téléphone.")
    }
  }

  const dot = (h: Handle, style: React.CSSProperties) => (
    <div key={h} onPointerDown={down(h)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="absolute flex h-11 w-11 touch-none items-center justify-center" style={style}>
      <div className={h.length === 2 ? "h-4 w-4 rounded-full bg-white shadow ring-1 ring-black/30" : (h === "n" || h === "s") ? "h-1.5 w-8 rounded-full bg-white shadow ring-1 ring-black/30" : "h-8 w-1.5 rounded-full bg-white shadow ring-1 ring-black/30"} />
    </div>
  )

  if (typeof document === "undefined") return null
  return createPortal(
    <div className="fixed left-0 top-0 z-[200] flex w-full flex-col bg-[#111]" style={{ height: "100dvh" }}>
      <div className="flex shrink-0 items-center px-3 pb-2 text-white" style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}>
        <button type="button" aria-label="Annuler" onClick={onCancel} className="rounded-full p-2.5 hover:bg-white/10"><X size={20} /></button>
        <span className="mx-auto text-sm font-medium">Recadrer</span>
        <button type="button" aria-label="Valider" onClick={out} disabled={!nat || !rect || fail} className="flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#111] disabled:opacity-40"><Check size={16} />OK</button>
      </div>

      <div ref={area} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        {url && (
          <div className="relative touch-none select-none" style={{ width: dw, height: dh }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={img} src={url} alt="" crossOrigin="anonymous" draggable={false}
              onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              onError={() => setFail(true)}
              className="pointer-events-none absolute inset-0 block h-full w-full max-w-none" />
            {rect && (
              <>
                <div onPointerDown={down("move")} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
                  className="absolute touch-none cursor-move outline outline-1 outline-white"
                  style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)" }}>
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-white/30" />)}</div>
                </div>
                {dot("nw", { left: rect.x - 22, top: rect.y - 22 })}
                {dot("ne", { left: rect.x + rect.w - 22, top: rect.y - 22 })}
                {dot("sw", { left: rect.x - 22, top: rect.y + rect.h - 22 })}
                {dot("se", { left: rect.x + rect.w - 22, top: rect.y + rect.h - 22 })}
                {!lock && (
                  <>
                    {dot("n", { left: rect.x + rect.w / 2 - 22, top: rect.y - 22 })}
                    {dot("s", { left: rect.x + rect.w / 2 - 22, top: rect.y + rect.h - 22 })}
                    {dot("w", { left: rect.x - 22, top: rect.y + rect.h / 2 - 22 })}
                    {dot("e", { left: rect.x + rect.w - 22, top: rect.y + rect.h / 2 - 22 })}
                  </>
                )}
              </>
            )}
          </div>
        )}
        {fail && <p className="absolute inset-x-6 bottom-3 rounded-xl bg-white p-3 text-center text-xs text-[#9b1c1c]">Cette photo ne peut pas être recadrée ici. Choisis-la à nouveau depuis ton téléphone.</p>}
      </div>

      <div className="shrink-0 overflow-x-auto px-3 pt-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
        <div className="mx-auto flex w-max gap-2">
          {PRESETS.map(([l, r]) => (
            <button key={l} type="button" onClick={() => choose(l, r)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm ${sel === l ? "bg-white text-[#111]" : "bg-white/10 text-white"}`}>{l}</button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
