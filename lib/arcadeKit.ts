/* Outils communs aux jeux d'arcade (canvas 480 × 720). */

export const AW = 480
export const AH = 720

export const NEON = {
  cyan: "#3fd0ff",
  orange: "#ff5a36",
  yellow: "#ffd23f",
  pink: "#ff3d9a",
  green: "#39ff88",
}

export const PIXEL_FONT = '"Press Start 2P", ui-monospace, Menlo, Consolas, monospace'

export type ArcadeEnv = {
  c: CanvasRenderingContext2D
  W: number
  H: number
  /** décor / balle choisis (objet modifié en direct par la page) */
  skin: { bg: string; ball: string }
  /** à appeler quand la partie est perdue (après avoir figé la logique du jeu) */
  end: () => void
}

export type ArcadeGame = {
  reset: () => void
  update: (dt: number) => void
  draw: () => void
  score: () => number
  down: (x: number, y: number) => void
  move: (x: number, y: number) => void
  up: (x: number, y: number) => void
  /** clavier (optionnel) : direction -1 / 0 / 1 */
  key?: (dx: number, dy: number) => void
}

export type ArcadeMaker = (env: ArcadeEnv) => ArcadeGame

export const rand = (a: number, b: number) => a + Math.random() * (b - a)
export const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function pixelText(
  c: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  color = "#fff",
  align: CanvasTextAlign = "center"
) {
  c.font = `${size}px ${PIXEL_FONT}`
  c.textAlign = align
  c.textBaseline = "alphabetic"
  c.fillStyle = "#000"
  c.fillText(s, x + size * 0.12, y + size * 0.12)
  c.fillStyle = color
  c.fillText(s, x, y)
}
