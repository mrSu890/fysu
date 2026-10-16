"use client"

/* ====================================================================
   FLOU EN HAUT ET EN BAS DE L'ÉCRAN (comme Apple Musique)
   Le contenu qui défile sous la barre d'état et sous la zone des pastilles du bas se floute
   progressivement, pour que le regard reste sur ce qui est au milieu.
   Réglages : TOP / BOTTOM (hauteur en px, sans les zones de sécurité de l'iPhone), BLUR (flou max en px).
   Désactivé si l'appareil demande moins de transparence.
   ==================================================================== */

const TOP = 96
const BOTTOM = 84
const BLUR = 12

const CSS = `
.edge-blur{position:fixed;left:0;right:0;pointer-events:none;z-index:40}
.edge-blur>i{position:absolute;inset:0;display:block}
.edge-blur-top{top:0;height:calc(env(safe-area-inset-top,0px) + ${TOP}px)}
.edge-blur-bottom{bottom:0;height:calc(env(safe-area-inset-bottom,0px) + ${BOTTOM}px)}
.edge-blur-top>i:nth-child(1){-webkit-backdrop-filter:blur(${BLUR * 0.2}px);backdrop-filter:blur(${BLUR * 0.2}px);-webkit-mask-image:linear-gradient(to bottom,#000 0%,transparent 100%);mask-image:linear-gradient(to bottom,#000 0%,transparent 100%)}
.edge-blur-top>i:nth-child(2){-webkit-backdrop-filter:blur(${BLUR * 0.55}px);backdrop-filter:blur(${BLUR * 0.55}px);-webkit-mask-image:linear-gradient(to bottom,#000 0%,transparent 70%);mask-image:linear-gradient(to bottom,#000 0%,transparent 70%)}
.edge-blur-top>i:nth-child(3){-webkit-backdrop-filter:blur(${BLUR}px);backdrop-filter:blur(${BLUR}px);-webkit-mask-image:linear-gradient(to bottom,#000 0%,transparent 42%);mask-image:linear-gradient(to bottom,#000 0%,transparent 42%)}
.edge-blur-bottom>i:nth-child(1){-webkit-backdrop-filter:blur(${BLUR * 0.2}px);backdrop-filter:blur(${BLUR * 0.2}px);-webkit-mask-image:linear-gradient(to top,#000 0%,transparent 100%);mask-image:linear-gradient(to top,#000 0%,transparent 100%)}
.edge-blur-bottom>i:nth-child(2){-webkit-backdrop-filter:blur(${BLUR * 0.55}px);backdrop-filter:blur(${BLUR * 0.55}px);-webkit-mask-image:linear-gradient(to top,#000 0%,transparent 70%);mask-image:linear-gradient(to top,#000 0%,transparent 70%)}
.edge-blur-bottom>i:nth-child(3){-webkit-backdrop-filter:blur(${BLUR}px);backdrop-filter:blur(${BLUR}px);-webkit-mask-image:linear-gradient(to top,#000 0%,transparent 42%);mask-image:linear-gradient(to top,#000 0%,transparent 42%)}
@media (prefers-reduced-transparency:reduce){.edge-blur{display:none}}
html.a11y-calm .edge-blur,html.a11y-focus .edge-blur{display:none}
`

export default function EdgeBlur() {
  return (
    <>
      <style>{CSS}</style>
      <div className="edge-blur edge-blur-top" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="edge-blur edge-blur-bottom" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </>
  )
}
