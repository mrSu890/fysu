"use client"

/* Avatar rond : image si elle existe, sinon l'initiale sur la couleur d'accent. */
export default function Avatar({
  url,
  name,
  accent,
  size = 96,
}: {
  url: string | null
  name: string
  accent: string
  size?: number
}) {
  const initial = (name.trim()[0] ?? "F").toUpperCase()
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-neutral-200 ring-4"
      style={{ width: size, height: size, ["--tw-ring-color" as any]: accent }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-dior text-white"
          style={{ background: accent, fontSize: size * 0.42 }}
        >
          {initial}
        </div>
      )}
    </div>
  )
}
