"use client"

// Petites barres animées : indiquent le titre en cours de lecture
export default function Equalizer({
  playing = true,
  size = 14,
}: {
  playing?: boolean
  size?: number
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-end gap-[2px]"
      style={{ height: size, width: size }}
    >
      <style>{`
        @keyframes mp-eq { 0%,100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }
      `}</style>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] origin-bottom rounded-full bg-current"
          style={{
            height: "100%",
            transform: "scaleY(0.3)",
            animation: playing ? `mp-eq 0.9s ease-in-out ${i * 0.15}s infinite` : "none",
          }}
        />
      ))}
    </span>
  )
}
