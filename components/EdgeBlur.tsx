"use client"

/* ====================================================================
   FONDU EN HAUT ET EN BAS DE L'ÉCRAN (comme Apple Musique)
   Le contenu qui défile sous la barre d'état et sous la zone des pastilles du bas s'efface
   dans la couleur de fond de l'ambiance en cours (nuit, aube, jour, après-midi, coucher de soleil).
   Pas de flou : un simple dégradé de la couleur du fond vers la transparence.
   Réglages : TOP / BOTTOM (hauteur en px, hors zones de sécurité de l'iPhone), STRENGTH (0 à 1, opacité au bord).
   ==================================================================== */

const TOP = 92
const BOTTOM = 84
const STRENGTH = 0.94

// dégradé « adouci » : la couleur s'estompe progressivement, sans bord visible
const stops = (dir: "to bottom" | "to top") =>
  `linear-gradient(${dir},
    color-mix(in srgb, var(--background) ${STRENGTH * 100}%, transparent) 0%,
    color-mix(in srgb, var(--background) ${STRENGTH * 86}%, transparent) 22%,
    color-mix(in srgb, var(--background) ${STRENGTH * 58}%, transparent) 46%,
    color-mix(in srgb, var(--background) ${STRENGTH * 28}%, transparent) 70%,
    color-mix(in srgb, var(--background) ${STRENGTH * 9}%, transparent) 88%,
    transparent 100%)`

const CSS = `
.edge-fade{position:fixed;left:0;right:0;pointer-events:none;z-index:40}
.edge-fade-top{top:0;height:calc(env(safe-area-inset-top,0px) + ${TOP}px);background:${stops("to bottom")}}
.edge-fade-bottom{bottom:0;height:calc(env(safe-area-inset-bottom,0px) + ${BOTTOM}px);background:${stops("to top")}}
html.a11y-calm .edge-fade,html.a11y-focus .edge-fade{display:none}
html.wave-page .edge-fade,html.arcade-page .edge-fade,html.event-page .edge-fade{display:none}
`

export default function EdgeBlur() {
  return (
    <>
      <style>{CSS}</style>
      <div className="edge-fade edge-fade-top" aria-hidden="true" />
      <div className="edge-fade edge-fade-bottom" aria-hidden="true" />
    </>
  )
}
