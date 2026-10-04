"use client"

import { useEffect, useRef, useState } from "react"

/* ====================================================================
   BOUTON « PRONONCER » : petite tête qui parle, à côté de /faɪ.su/
   - un toucher : une voix de femme dit « FYSU »
   - si tu déposes un vrai enregistrement dans public/audio/fysu.mp3, c'est lui qui est joué
     (sinon : voix de synthèse féminine de l'appareil)
   ==================================================================== */

const RECORDING = "/audio/fysu.mp3"
// ce que la synthèse vocale doit lire pour dire /faɪ.su/ (comme « fie-sou »)
const SPOKEN = "Fie-soo"
const FEMALE_HINTS = [
  "samantha", "ava", "allison", "susan", "karen", "moira", "tessa", "serena", "fiona", "victoria",
  "zira", "aria", "jenny", "libby", "sonia", "female", "woman", "google us english", "google uk english female",
]

function pickFemaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"))
  const pool = en.length ? en : voices
  for (const hint of FEMALE_HINTS) {
    const v = pool.find((x) => x.name.toLowerCase().includes(hint))
    if (v) return v
  }
  return pool[0] ?? null
}

export default function SpeakButton({ label = "Écouter la prononciation" }: { label?: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // certains navigateurs chargent la liste des voix avec un petit retard
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices()
    }
    return () => {
      try {
        window.speechSynthesis?.cancel()
        audioRef.current?.pause()
      } catch {}
    }
  }, [])

  function speak() {
    try {
      if (!("speechSynthesis" in window)) return setPlaying(false)
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(SPOKEN)
      const voice = pickFemaleVoice()
      if (voice) {
        u.voice = voice
        u.lang = voice.lang
      } else {
        u.lang = "en-US"
      }
      u.rate = 0.75
      u.pitch = 1.15
      u.onend = () => setPlaying(false)
      u.onerror = () => setPlaying(false)
      window.speechSynthesis.speak(u)
    } catch {
      setPlaying(false)
    }
  }

  function play() {
    if (playing) return
    setPlaying(true)
    const audio = new Audio(RECORDING)
    audioRef.current = audio
    audio.onended = () => setPlaying(false)
    // pas d'enregistrement (ou lecture refusée) : on bascule sur la voix de synthèse
    audio.onerror = () => speak()
    audio.play().catch(() => speak())
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={label}
      title={label}
      data-no-green
      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center text-foreground/40 transition-colors hover:text-foreground/70"
    >
      <svg viewBox="0 0 28 24" className="h-[22px] w-[26px]" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {/* tête de profil */}
        <path d="M6 22v-4.2C3.9 16.4 2.8 14.2 2.8 11.6 2.8 6.9 6.4 3 11 3c3.1 0 5.4 1.6 6.5 3.9l1.6 3.2-1.8 1v2.2h-1.9l-.2 2.2c-.1 1.1-.9 1.9-2 1.9H10.5V22" />
        {/* ondes sonores qui sortent de la bouche */}
        <path className={playing ? "fysu-wave fysu-wave-1" : ""} d="M21 12.2c.9.8.9 2.1 0 2.9" />
        <path className={playing ? "fysu-wave fysu-wave-2" : ""} d="M23.4 10.8c1.6 1.5 1.6 4.2 0 5.7" />
        <path className={playing ? "fysu-wave fysu-wave-3" : ""} d="M25.7 9.5c2.3 2.2 2.3 6.3 0 8.5" />
      </svg>
    </button>
  )
}
