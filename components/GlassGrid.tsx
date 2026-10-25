"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { PixelMode } from "@/components/PixelGrid"

/* ====================================================================
   RIDEAU DE VERRE ENTRE LES PAGES
   1. Au clic, on prend une « photo » de la page (glassStore.old).
   2. Cette photo est affichée sur une grille de carreaux de verre (WebGL) : chaque carreau
      décale, zoome et floute un morceau de l'image, de plus en plus fort, en vague ("in").
   3. Quand tout est déformé ("solid"), la nouvelle page charge derrière sans qu'on la voie.
   4. Quand elle est prête, on la photographie aussi (glassStore.next) : les carreaux la montrent
      déformée, puis la déformation disparaît en vague du bas vers le haut ("out").
   Si la photo ou le WebGL ne marche pas : repli sur de simples carreaux de verre laiteux (FlatGlass).
   ==================================================================== */

/* ---------- les « photos » de la page ---------- */

export const glassStore: { old: HTMLCanvasElement | null; next: HTMLCanvasElement | null } = { old: null, next: null }

const SNAP_TIMEOUT = 900

// photo de ce qu'on voit à l'écran (null si ça échoue ou si c'est trop long)
export async function takeSnapshot(): Promise<HTMLCanvasElement | null> {
  try {
    const w = window.innerWidth
    const h = window.innerHeight
    const job = (async () => {
      const mod: any = await import("html2canvas-pro")
      const html2canvas = mod.default ?? mod.html2canvas
      let bg = getComputedStyle(document.body).backgroundColor
      if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") bg = "#ffffff"
      return (await html2canvas(document.body, {
        x: window.scrollX,
        y: window.scrollY,
        width: w,
        height: h,
        scale: Math.min(1, 820 / Math.max(w, h)),
        useCORS: true,
        logging: false,
        backgroundColor: bg,
        ignoreElements: (el: Element) => el.hasAttribute?.("data-px"),
      })) as HTMLCanvasElement
    })()
    const timeout = new Promise<null>((r) => window.setTimeout(() => r(null), SNAP_TIMEOUT))
    const c = await Promise.race([job, timeout])
    return c && c.width > 8 && c.height > 8 ? c : null
  } catch {
    return null
  }
}

/* ---------- le verre en WebGL ---------- */

const SIZE = 64 // taille d'un carreau (px d'écran)
const GL_IN_MS = 720
const GL_OUT_MS = 1000

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uOld;
uniform sampler2D uNew;
uniform vec2 uRes;
uniform float uTile;
uniform float uT;
uniform float uPhase;
uniform float uHasNext;
uniform vec2 uSeed;

float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec3 grab(sampler2D tex, vec2 s, float rad){
  vec2 px = 1.0 / uRes;
  vec3 acc = texture2D(tex, clamp(s * px, 0.001, 0.999)).rgb;
  float tot = 1.0;
  for (int i = 0; i < 8; i++) {
    float ang = float(i) * 0.7853982;
    float k = 0.55 + 0.45 * mod(float(i), 2.0);
    vec2 o = vec2(cos(ang), sin(ang)) * rad * k;
    acc += texture2D(tex, clamp((s + o) * px, 0.001, 0.999)).rgb;
    tot += 1.0;
  }
  return acc / tot;
}

void main(){
  vec2 f = gl_FragCoord.xy;
  vec2 tid = vec2(floor(f.x / uTile), floor((uRes.y - f.y) / uTile));
  float rows = ceil(uRes.y / uTile);
  vec2 org = vec2(tid.x * uTile, uRes.y - (tid.y + 1.0) * uTile);
  vec2 q = (f - org) / uTile;
  float h1 = hh(tid + uSeed);
  float h2 = hh(tid.yx * 1.7 + uSeed + 3.1);
  float h3 = hh(tid * 0.73 + uSeed + 7.7);

  float a = 1.0;
  float alpha = 1.0;
  if (uPhase < 0.5) {
    float l = clamp((uT - h1 * 0.55) / 0.45, 0.0, 1.0);
    a = l * l * (3.0 - 2.0 * l);
  } else if (uPhase > 1.5) {
    float w = (rows - 1.0 - tid.y) / max(rows - 1.0, 1.0);
    float d = (w * 0.6 + h2 * 0.4) * 0.55;
    float l = clamp((uT - d) / 0.45, 0.0, 1.0);
    float e = l * l * (3.0 - 2.0 * l);
    a = 1.0 - e;
    float s0 = uHasNext > 0.5 ? 0.82 : 0.1;
    float s1 = uHasNext > 0.5 ? 1.0 : 0.9;
    alpha = 1.0 - smoothstep(s0, s1, l);
  }

  vec2 c = org + 0.5 * uTile;
  vec2 r = (f - c) / (0.5 * uTile);
  float zoom = mix(1.0, 0.3 + 0.5 * h3, a);
  float rowShift = (hh(vec2(tid.y, uSeed.x)) - 0.5) * 1.6;
  vec2 shift = a * uTile * (vec2(h1 - 0.5, h3 - 0.5) * 2.4 + vec2(rowShift, 0.0));
  vec2 s = c + (f - c) * zoom + shift + a * uTile * 0.18 * r * length(r);
  float rad = a * uTile * 0.30;

  float mixNew = uPhase > 1.5 ? uHasNext * (1.0 - smoothstep(0.85, 1.0, a)) : 0.0;
  vec3 col;
  if (mixNew < 0.001) col = grab(uOld, s, rad);
  else if (mixNew > 0.999) col = grab(uNew, s, rad);
  else col = mix(grab(uOld, s, rad), grab(uNew, s, rad), mixNew);

  // joints entre les carreaux, reflet sur le bord haut-gauche, voile laiteux, variation d'un carreau à l'autre
  float e = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
  col *= 1.0 - a * 0.30 * (1.0 - smoothstep(0.0, 0.035, e));
  col += a * 0.10 * (1.0 - smoothstep(0.0, 0.22, q.x * 0.5 + (1.0 - q.y) * 0.5));
  col = mix(col, vec3(0.97, 0.97, 0.95), a * 0.2);
  col *= 1.0 + (h3 - 0.5) * 0.14 * a;

  gl_FragColor = vec4(col * alpha, alpha);
}
`

function GLGlass({ mode, onDone, onFail }: { mode: PixelMode; onDone?: () => void; onFail: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const st = useRef<any>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const failRef = useRef(onFail)
  failRef.current = onFail

  // préparation : contexte WebGL + photo de l'ancienne page
  useEffect(() => {
    const canvas = ref.current
    const old = glassStore.old
    if (!canvas || !old) {
      failRef.current()
      return
    }
    try {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
      const W = Math.round(window.innerWidth * dpr)
      const H = Math.round(window.innerHeight * dpr)
      canvas.width = W
      canvas.height = H
      const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false }) as WebGLRenderingContext | null
      if (!gl) throw new Error("no webgl")
      const sh = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader")
        return s
      }
      const prog = gl.createProgram()!
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link")
      gl.useProgram(prog)
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(prog, "p")
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

      const tex = (src: HTMLCanvasElement, unit: number) => {
        const t = gl.createTexture()
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        return t
      }
      const oldTex = tex(old, 0)
      const U = (n: string) => gl.getUniformLocation(prog, n)
      const u = {
        old: U("uOld"), next: U("uNew"), res: U("uRes"), tile: U("uTile"), t: U("uT"),
        phase: U("uPhase"), hasNext: U("uHasNext"), seed: U("uSeed"),
      }
      gl.uniform1i(u.old, 0)
      gl.uniform1i(u.next, 1)
      gl.uniform2f(u.res, W, H)
      gl.uniform1f(u.tile, SIZE * dpr)
      gl.uniform2f(u.seed, Math.random() * 50, Math.random() * 50)
      gl.viewport(0, 0, W, H)
      gl.clearColor(0, 0, 0, 0)
      st.current = { gl, u, oldTex, tex, hasNext: 0, raf: 0 }
    } catch {
      failRef.current()
    }
    return () => {
      const s = st.current
      if (s) {
        cancelAnimationFrame(s.raf)
        try {
          s.gl.getExtension("WEBGL_lose_context")?.loseContext()
        } catch {}
      }
      st.current = null
    }
  }, [])

  // animation selon la phase
  useEffect(() => {
    const s = st.current
    if (!s) return
    const { gl, u } = s
    const draw = (phase: number, t: number) => {
      gl.uniform1f(u.phase, phase)
      gl.uniform1f(u.t, t)
      gl.uniform1f(u.hasNext, s.hasNext)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    cancelAnimationFrame(s.raf)
    if (mode === "solid") {
      draw(1, 1)
      return
    }
    if (mode === "out" && glassStore.next) {
      try {
        s.tex(glassStore.next, 1)
        s.hasNext = 1
      } catch {
        s.hasNext = 0
      }
    }
    const dur = mode === "in" ? GL_IN_MS : GL_OUT_MS
    const phase = mode === "in" ? 0 : 2
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      draw(phase, t)
      if (t < 1) s.raf = requestAnimationFrame(tick)
      else onDoneRef.current?.()
    }
    draw(phase, 0)
    s.raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(s.raf)
  }, [mode])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 h-full w-full"
      style={{ pointerEvents: mode === "out" ? "none" : "auto" }}
    />
  )
}

/* ---------- repli : carreaux de verre laiteux (sans photo de la page) ---------- */

const IN_MS = 240
const IN_SPREAD = 220
const OUT_MS = 340
const OUT_SWEEP = 560
const OUT_JITTER = 300

function FlatGlass({ mode, onDone }: { mode: PixelMode; onDone?: () => void }) {
  const [dims] = useState(() => ({
    w: typeof window === "undefined" ? 0 : window.innerWidth,
    h: typeof window === "undefined" ? 0 : window.innerHeight,
  }))

  const { rows, cells } = useMemo(() => {
    const cols = Math.ceil(dims.w / SIZE) + 1
    const rows = Math.ceil(dims.h / SIZE) + 1
    const list: { r: number; c: number; rand: number; rand2: number; angle: number; hx: number; hy: number }[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push({ r, c, rand: Math.random(), rand2: Math.random(), angle: 110 + Math.random() * 100, hx: 15 + Math.random() * 60, hy: 10 + Math.random() * 60 })
      }
    }
    return { rows, cells: list }
  }, [dims.w, dims.h])

  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (mode === "solid") return
    const total = mode === "in" ? IN_MS + IN_SPREAD + 20 : OUT_MS + OUT_SWEEP + OUT_JITTER + 20
    const timer = window.setTimeout(() => onDoneRef.current?.(), total)
    return () => window.clearTimeout(timer)
  }, [mode])

  return (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden" style={{ pointerEvents: mode === "out" ? "none" : "auto" }}>
      <style>{`@keyframes gl-in{from{opacity:0}to{opacity:1}}@keyframes gl-out{from{opacity:1}to{opacity:0}}`}</style>
      {cells.map((cell) => {
        let animation: string | undefined
        if (mode === "in") {
          animation = `gl-in ${IN_MS}ms ${Math.round(cell.rand * IN_SPREAD)}ms cubic-bezier(.4,0,.2,1) both`
        } else if (mode === "out") {
          const fromBottom = (rows - 1 - cell.r) / Math.max(1, rows - 1)
          const delay = Math.round(fromBottom * OUT_SWEEP + cell.rand2 * OUT_JITTER)
          animation = `gl-out ${OUT_MS}ms ${delay}ms cubic-bezier(.4,0,.2,1) both`
        }
        const tone = 244 + Math.round(cell.rand * 8)
        return (
          <span
            key={`${cell.r}-${cell.c}`}
            className="absolute"
            style={{
              left: cell.c * SIZE,
              top: cell.r * SIZE,
              width: SIZE + 1,
              height: SIZE + 1,
              animation,
              willChange: "opacity",
              WebkitBackdropFilter: "blur(14px) saturate(1.15)",
              backdropFilter: "blur(14px) saturate(1.15)",
              background: `radial-gradient(circle at ${cell.hx}% ${cell.hy}%, rgba(255,255,255,.98), rgba(255,255,255,0) 62%), linear-gradient(${cell.angle}deg, rgba(${tone},${tone},${tone - 3},.96), rgba(${tone - 12},${tone - 12},${tone - 14},.97))`,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,.75), inset 2px 2px 7px rgba(255,255,255,.95), inset -3px -3px 8px rgba(0,0,0,.09)",
            }}
          />
        )
      })}
    </div>
  )
}

export default function GlassGrid({ mode, onDone }: { mode: PixelMode; onDone?: () => void }) {
  const [flat, setFlat] = useState(() => !glassStore.old)
  if (flat) return <FlatGlass mode={mode} onDone={onDone} />
  return <GLGlass mode={mode} onDone={onDone} onFail={() => setFlat(true)} />
}
