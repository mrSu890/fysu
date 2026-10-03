"use client"

import { useEffect, useState, type ReactNode } from "react"
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
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="fy-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7bd36b" />
          <stop offset="1" stopColor="#1b6e3e" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#fy-bg)" />
      {/* feuilles */}
      <ellipse cx="14" cy="80" rx="26" ry="9" transform="rotate(-38 14 80)" fill="#ffffff" opacity="0.14" />
      <ellipse cx="88" cy="22" rx="24" ry="8" transform="rotate(34 88 22)" fill="#ffffff" opacity="0.14" />
      <ellipse cx="84" cy="86" rx="20" ry="7" transform="rotate(-25 84 86)" fill="#0d4a2a" opacity="0.28" />
      <ellipse cx="12" cy="20" rx="18" ry="6" transform="rotate(28 12 20)" fill="#0d4a2a" opacity="0.22" />
      {/* flacon échantillon 2 ml */}
      <g transform="rotate(-14 50 55)">
        <path d="M41 30h18v43a9 9 0 0 1-18 0z" fill="#ffffff" fillOpacity="0.3" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.6" />
        <path d="M42 52h16v21a8 8 0 0 1-16 0z" fill="#f3b43c" />
        <rect x="44" y="58" width="12" height="9" rx="1.5" fill="#ffffff" fillOpacity="0.92" />
        <text x="50" y="65" textAnchor="middle" fontSize="5.2" fontWeight="800" fill="#1b6e3e" fontFamily="Helvetica, Arial, sans-serif">FY</text>
        <rect x="39" y="17" width="22" height="14" rx="3" fill="#171717" />
        <rect x="42" y="20" width="1.6" height="8" rx="0.8" fill="#ffffff" opacity="0.28" />
        <rect x="46" y="20" width="1.6" height="8" rx="0.8" fill="#ffffff" opacity="0.28" />
        <rect x="50" y="20" width="1.6" height="8" rx="0.8" fill="#ffffff" opacity="0.28" />
        <rect x="54" y="20" width="1.6" height="8" rx="0.8" fill="#ffffff" opacity="0.28" />
        <rect x="43.5" y="34" width="2.6" height="34" rx="1.3" fill="#ffffff" opacity="0.7" />
      </g>
    </svg>
  )
}

function MusicIcon() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="mu-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4f58a" />
          <stop offset="0.5" stopColor="#2ccf78" />
          <stop offset="1" stopColor="#09745e" />
        </linearGradient>
        <linearGradient id="mu-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
        <filter id="mu-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#04483a" floodOpacity="0.55" />
        </filter>
      </defs>
      <rect width="100" height="100" fill="url(#mu-bg)" />
      {/* bulles */}
      <circle cx="20" cy="74" r="10" fill="#ffffff" fillOpacity="0.14" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1" />
      <circle cx="80" cy="30" r="6" fill="#ffffff" fillOpacity="0.14" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1" />
      <circle cx="78" cy="78" r="4" fill="#ffffff" fillOpacity="0.18" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1" />
      {/* note de musique */}
      <g filter="url(#mu-shadow)" fill="#ffffff">
        <ellipse cx="36" cy="68" rx="9" ry="6.5" transform="rotate(-20 36 68)" />
        <ellipse cx="65" cy="62" rx="9" ry="6.5" transform="rotate(-20 65 62)" />
        <rect x="42" y="30" width="3.6" height="38" rx="1.4" />
        <rect x="71" y="24" width="3.6" height="38" rx="1.4" />
        <path d="M42 30 L74.6 23 L74.6 33.5 L42 40.5Z" />
      </g>
      {/* reflet verre (Frutiger Aero) */}
      <path d="M0 0H100V46C78 56 28 56 0 40Z" fill="url(#mu-gloss)" opacity="0.55" />
      <rect x="1" y="1" width="98" height="98" rx="0" fill="none" stroke="#ffffff" strokeOpacity="0.35" />
    </svg>
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
