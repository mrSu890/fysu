"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

/* ====================================================================
   HEURE + MÉTÉO (en bas à droite, très discret)
   - l'heure exacte avec les secondes, police mono
   - la météo à l'endroit du visiteur (ville approximative) : soleil / lune / nuages…
   - mode sombre automatique de 20h00 à 7h00 (le script de app/layout.tsx l'applique
     dès l'arrivée ; ici on le fait aussi quand l'horaire change pendant la visite)
   ==================================================================== */

type Weather = { temp: number; code: number; isDay: boolean; city: string }

const HIDDEN = ["/admin", "/games", "/thewave", "/checkout", "/success", "/password", "/auth"]

const slotNow = () => {
  const h = new Date().getHours()
  return h >= 20 || h < 7 ? "night" : "day"
}

type Kind = "clear" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm"

function kindOf(code: number): Kind {
  if (code === 0 || code === 1) return "clear"
  if (code === 2) return "partly"
  if (code === 3) return "cloud"
  if (code === 45 || code === 48) return "fog"
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain"
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow"
  if (code >= 95) return "storm"
  return "cloud"
}

const two = (n: number) => String(n).padStart(2, "0")

function Icon({ kind, day }: { kind: Kind; day: boolean }) {
  const p = { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const
  const sun = (
    <g>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </g>
  )
  const moon = <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  const cloud = <path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.2 4.4 4.4 0 0 0 7 18z" />
  if (kind === "clear") return <svg {...p}>{day ? sun : moon}</svg>
  if (kind === "partly")
    return (
      <svg {...p}>
        {day ? (
          <g transform="translate(-3 -3) scale(0.7)">{sun}</g>
        ) : (
          <g transform="translate(-3 -3) scale(0.7)">{moon}</g>
        )}
        <g transform="translate(4 5) scale(0.75)">{cloud}</g>
      </svg>
    )
  if (kind === "cloud") return <svg {...p}>{cloud}</svg>
  if (kind === "fog") return <svg {...p}><path d="M4 9h16M3 13h18M6 17h12" /></svg>
  if (kind === "rain")
    return (
      <svg {...p}>
        <g transform="translate(0 -3)">{cloud}</g>
        <path d="M9 19.5l-1 2M13 19.5l-1 2M17 19.5l-1 2" />
      </svg>
    )
  if (kind === "snow")
    return (
      <svg {...p}>
        <g transform="translate(0 -3)">{cloud}</g>
        <path d="M9 20h.01M13 21h.01M17 20h.01" strokeWidth="2.4" />
      </svg>
    )
  return (
    <svg {...p}>
      <g transform="translate(0 -3)">{cloud}</g>
      <path d="M12.5 15l-2 3h3l-2 3" />
    </svg>
  )
}

export default function ClockWeather() {
  const pathname = usePathname() ?? "/"
  const [now, setNow] = useState<Date | null>(null)
  const [weather, setWeather] = useState<Weather | null>(null)

  // l'horloge (chaque seconde) + le changement automatique de mode
  useEffect(() => {
    setNow(new Date())
    const id = window.setInterval(() => {
      setNow(new Date())
      try {
        const slot = slotNow()
        if (localStorage.getItem("fysu-theme-slot") !== slot) {
          localStorage.setItem("fysu-theme-slot", slot)
          localStorage.setItem("theme", slot === "night" ? "dark" : "light")
          const html = document.documentElement
          // les pages à fond propre (TheWave, arcade) restent comme elles sont
          if (!html.classList.contains("wave-page") && !html.classList.contains("arcade-page") && !html.classList.contains("event-page")) {
            html.classList.toggle("dark", slot === "night")
          }
          window.dispatchEvent(new Event("theme-change"))
        }
      } catch {}
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  // la météo (toutes les 15 minutes)
  useEffect(() => {
    let alive = true
    const load = () =>
      fetch("/api/collectionPages?weather=1")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d?.ok) setWeather({ temp: d.temp, code: d.code, isDay: !!d.isDay, city: d.city || "" })
        })
        .catch(() => {})
    load()
    const id = window.setInterval(load, 15 * 60 * 1000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  if (!now || HIDDEN.some((p) => pathname.startsWith(p))) return null

  const time = `${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}`
  const label = weather ? `${time}${weather.city ? `, ${weather.city}` : ""}, ${weather.temp}°C` : time

  return (
    <div
      aria-label={label}
      className="font-info pointer-events-none fixed bottom-[calc(6px+env(safe-area-inset-bottom))] right-3 z-30 flex items-center gap-1.5 text-[10px] tabular-nums tracking-[0.12em] text-foreground/45"
    >
      {weather && (
        <>
          <Icon kind={kindOf(weather.code)} day={weather.isDay} />
          <span>{weather.temp}°</span>
          <span aria-hidden="true" className="opacity-50">·</span>
        </>
      )}
      <span>{time}</span>
    </div>
  )
}
