"use client"

import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import KibanLogo from "@/components/KibanLogo"
import { useMusicCopy } from "@/lib/musicCopy"
import { gamesCopyFor } from "@/lib/games"

/* ====================================================================
   PAGE D'ACCUEIL : « Explore The Universe »
   Une pastille (carré à bouts arrondis, comme une icône d'appli) par page :
   Kiban Collector, TheWave, FY'grances, Music, Arcade.
   Une pastille disparaît si la page est masquée dans l'admin.
   Toutes les images sont dessinées ici en code (rien à envoyer en plus).
   ==================================================================== */

type Visibility = { kibanCollector: boolean; thewave: boolean; fygrances: boolean; music: boolean }

const WAVE_PATH =
  "M1820 1833 C1808 1834 1780 1839 1761 1840 C1742 1841 1723 1842 1704 1840 C1685 1838 1666 1837 1647 1829 C1628 1822 1606 1810 1592 1795 C1579 1780 1571 1758 1566 1739 C1562 1720 1566 1701 1566 1682 C1567 1663 1572 1644 1572 1625 C1571 1606 1570 1587 1564 1568 C1558 1549 1549 1529 1535 1511 C1522 1493 1501 1475 1483 1462 C1465 1449 1445 1440 1426 1432 C1407 1424 1388 1419 1369 1414 C1350 1409 1332 1407 1313 1404 C1294 1402 1275 1401 1256 1400 C1237 1400 1218 1400 1199 1400 C1180 1401 1161 1402 1142 1404 C1123 1406 1104 1409 1085 1412 C1066 1414 1047 1418 1028 1422 C1009 1425 990 1429 971 1434 C952 1438 933 1443 914 1448 C895 1453 876 1458 857 1463 C838 1469 819 1475 800 1481 C781 1487 762 1494 743 1500 C724 1507 705 1515 686 1522 C667 1529 649 1537 630 1545 C611 1553 592 1561 573 1570 C554 1578 535 1587 516 1596 C497 1605 478 1614 459 1624 C440 1633 421 1642 402 1652 C383 1661 364 1671 345 1681 C326 1691 307 1700 288 1710 C269 1720 250 1730 231 1739 C212 1749 193 1759 174 1769 C155 1778 136 1788 117 1797 C98 1807 79 1816 60 1825 C41 1834 12 1848 3 1852 L0 1852 L-3 2579 L1824 2579Z"

// manette de jeu en pixels (# corps, d croix / boutons sombres, p rose, c cyan)
const PAD_ROWS = ["...##############...", "..################..", "..################..", ".###d#########pp###.", ".##ddd##dd#dd#pp###.", ".###d###########cc#.", ".###############cc#.", ".##################.", ".#####........#####.", "..####........####..", "..####........####..", "...................."]

/* ---------- les images des pastilles ---------- */

function KibanIcon() {
  return (
    <span className="flex h-full w-full items-center justify-center bg-black">
      <KibanLogo tone="white" className="w-[78%]" />
    </span>
  )
}

function WaveIcon() {
  return (
    <svg viewBox="0 1000 1824 1580" preserveAspectRatio="xMaxYMax slice" className="h-full w-full" aria-hidden="true">
      <rect x="0" y="1000" width="1824" height="1580" fill="#e10813" />
      <path d={WAVE_PATH} fill="#f5b0b3" />
    </svg>
  )
}

function FygrancesIcon() {
  // dessin épuré : un flacon d'échantillon 2 ml, simple trait clair sur fond vert sombre
  const ink = "#e9e4d6"
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <rect width="100" height="100" fill="#233129" />
      <g fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* bouchon */}
        <rect x="42.5" y="20" width="15" height="11" rx="1.5" />
        <path d="M45.5 20v11M50 20v11M54.5 20v11" strokeWidth="0.8" opacity="0.55" />
        {/* col + flacon */}
        <path d="M44.5 31v3.5M55.5 31v3.5" />
        <path d="M41 34.5h18v42a9 9 0 0 1-18 0z" />
        {/* niveau du liquide */}
        <path d="M41.2 55h17.6" strokeWidth="1" opacity="0.8" />
        {/* étiquette */}
        <path d="M45.5 64h9M45.5 68h6" strokeWidth="0.9" opacity="0.7" />
      </g>
      <path d="M41.8 55.5h16.4v21a8.2 8.2 0 0 1-16.4 0z" fill={ink} opacity="0.1" />
      <path d="M45 38v11" stroke={ink} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M32 85h36" stroke={ink} strokeWidth="0.8" strokeLinecap="round" opacity="0.35" />
    </svg>
  )
}

function MusicIcon() {
  // Liquid Glass : une plaque de verre (comme la barre de navigation) sur un décor vert aqua,
  // avec une note de musique en verre
  const glass = {
    "--glass-color": "#d8ffe6",
    "--glass-tint": "34%",
    "--glass-brightness": "1.08",
    "--glass-rim": "rgba(255,255,255,0.75)",
    "--glass-shadow": "rgba(0,70,40,0.35)",
  } as CSSProperties
  return (
    <span className="relative block h-full w-full">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="mu-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b6f27a" />
            <stop offset="0.5" stopColor="#25c27a" />
            <stop offset="1" stopColor="#067a68" />
          </linearGradient>
          <radialGradient id="mu-glow" cx="0.25" cy="0.2" r="0.7">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#mu-bg)" />
        <rect width="100" height="100" fill="url(#mu-glow)" />
        <circle cx="18" cy="78" r="13" fill="#ffffff" fillOpacity="0.22" />
        <circle cx="84" cy="22" r="9" fill="#ffffff" fillOpacity="0.2" />
        <circle cx="78" cy="84" r="6" fill="#d9ff9e" fillOpacity="0.45" />
        <circle cx="30" cy="16" r="5" fill="#ffffff" fillOpacity="0.25" />
      </svg>

      {/* plaque de verre */}
      <span
        className="liquid-glass absolute"
        style={{ ...glass, inset: "13%", borderRadius: "26%" }}
      />

      {/* note de musique en verre */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="mu-note" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.62" />
          </linearGradient>
          <filter id="mu-soft" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="2.2" stdDeviation="1.8" floodColor="#03402c" floodOpacity="0.35" />
          </filter>
        </defs>
        <g filter="url(#mu-soft)" fill="url(#mu-note)" stroke="#ffffff" strokeOpacity="0.95" strokeWidth="1.1" strokeLinejoin="round">
          <ellipse cx="38" cy="66" rx="8.5" ry="6.2" transform="rotate(-20 38 66)" />
          <ellipse cx="64" cy="60" rx="8.5" ry="6.2" transform="rotate(-20 64 60)" />
          <rect x="43.6" y="30" width="3.4" height="35" rx="1.6" />
          <rect x="69.6" y="24" width="3.4" height="35" rx="1.6" />
          <path d="M43.6 30 L73 23.6 L73 33.4 L43.6 39.8Z" />
        </g>
        {/* reflets */}
        <path d="M33 62.6c2-2.2 5.4-3 8-2.2" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <path d="M45 33.5l25-5.4" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1" strokeLinecap="round" fill="none" />
      </svg>
    </span>
  )
}

function ArcadeIcon() {
  const colors: Record<string, string> = { "#": "#ffffff", d: "#2a0a5e", p: "#ff3d9a", c: "#3fd0ff" }
  const cell = 4.2
  const ox = (100 - PAD_ROWS[0].length * cell) / 2
  const oy = (100 - PAD_ROWS.length * cell) / 2 + 2
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true" shapeRendering="crispEdges">
      <defs>
        <linearGradient id="ar-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14002e" />
          <stop offset="0.6" stopColor="#3a0a7a" />
          <stop offset="1" stopColor="#ff2f9c" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#ar-bg)" />
      {/* grille néon */}
      {[70, 78, 86, 94].map((y, i) => (
        <rect key={y} x="0" y={y} width="100" height={1 + i * 0.4} fill="#3fd0ff" opacity="0.85" />
      ))}
      {[-20, 0, 20, 40, 60, 80, 100, 120].map((x) => (
        <line key={x} x1={50 + (x - 50) * 0.25} y1="66" x2={x} y2="100" stroke="#3fd0ff" strokeWidth="0.8" opacity="0.7" />
      ))}
      {/* manette pixel */}
      {PAD_ROWS.flatMap((row, y) =>
        row.split("").map((ch, x) =>
          colors[ch] ? (
            <rect key={`${x}-${y}`} x={ox + x * cell} y={oy + y * cell} width={cell + 0.02} height={cell + 0.02} fill={colors[ch]} />
          ) : null
        )
      )}
    </svg>
  )
}

/* ---------- une pastille ---------- */

function Tile({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link href={href} className="group flex w-[88px] flex-col items-center gap-2.5 text-center sm:w-[112px]">
      <span
        className="relative block aspect-square w-full overflow-hidden shadow-lg transition duration-300 group-hover:-translate-y-1 group-active:scale-95"
        style={{ borderRadius: "22.4%", boxShadow: "0 8px 22px rgba(0,0,0,0.28)" }}
      >
        {children}
      </span>
      <span className="text-xs font-medium leading-tight sm:text-sm">{label}</span>
    </Link>
  )
}

export default function HomeTiles() {
  const locale = useLocale()
  const musicCopy = useMusicCopy()
  const gamesCopy = gamesCopyFor(locale)
  const [visible, setVisible] = useState<Visibility | null>(null)

  useEffect(() => {
    fetch("/api/collectionPages?visibility=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setVisible(
          d && typeof d === "object" && "thewave" in d
            ? (d as Visibility)
            : { kibanCollector: true, thewave: true, fygrances: true, music: true }
        )
      )
      .catch(() => setVisible({ kibanCollector: true, thewave: true, fygrances: true, music: true }))
  }, [])

  return (
    <section className="mx-auto w-11/12 max-w-3xl py-20 sm:py-28">
      <h2 className="text-center font-dior text-4xl font-bold tracking-tight sm:text-6xl">Explore The Universe</h2>

      <div className="mt-12 flex min-h-[140px] flex-wrap justify-center gap-x-7 gap-y-9 sm:gap-x-9">
        {visible?.kibanCollector && (
          <Tile href="/kiban-collector" label="Kiban Collector">
            <KibanIcon />
          </Tile>
        )}
        {visible?.thewave && (
          <Tile href="/thewave" label="TheWave">
            <WaveIcon />
          </Tile>
        )}
        {visible?.fygrances && (
          <Tile href="/fygrances" label="FY'grances">
            <FygrancesIcon />
          </Tile>
        )}
        {visible?.music && (
          <Tile href="/music" label={musicCopy.musicTitle}>
            <MusicIcon />
          </Tile>
        )}
        {visible && (
          <Tile href="/games" label="Arcade">
            <ArcadeIcon />
          </Tile>
        )}
      </div>
    </section>
  )
}
