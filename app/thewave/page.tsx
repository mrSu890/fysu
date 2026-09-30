"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import Product from "@/components/Product"
import ProductFilters from "@/components/ProductFilters"
import CroppedLogo from "@/components/CroppedLogo"
import { useSiteCopy } from "@/lib/siteCopy"

/* ====== À MODIFIER FACILEMENT ====== */

// Photo verticale : à déposer dans public/images
const HERO_IMAGE = "/images/the-wave-hero.jpg"

// Hauteur de l'image (en % de la hauteur de l'écran) : augmente pour l'allonger, diminue pour la raccourcir
const HERO_HEIGHT = "78svh"

const TITLE = "TheWave"

// Collection créée dans l'admin (lien = thewave) qui contient les produits
const COLLECTION_SLUG = "thewave"

/* =================================== */

// Fond : la grande vague, fixe, exactement comme l'image de référence
const WAVE_PATH =
  "M1820 1833 C1808 1834 1780 1839 1761 1840 C1742 1841 1723 1842 1704 1840 C1685 1838 1666 1837 1647 1829 C1628 1822 1606 1810 1592 1795 C1579 1780 1571 1758 1566 1739 C1562 1720 1566 1701 1566 1682 C1567 1663 1572 1644 1572 1625 C1571 1606 1570 1587 1564 1568 C1558 1549 1549 1529 1535 1511 C1522 1493 1501 1475 1483 1462 C1465 1449 1445 1440 1426 1432 C1407 1424 1388 1419 1369 1414 C1350 1409 1332 1407 1313 1404 C1294 1402 1275 1401 1256 1400 C1237 1400 1218 1400 1199 1400 C1180 1401 1161 1402 1142 1404 C1123 1406 1104 1409 1085 1412 C1066 1414 1047 1418 1028 1422 C1009 1425 990 1429 971 1434 C952 1438 933 1443 914 1448 C895 1453 876 1458 857 1463 C838 1469 819 1475 800 1481 C781 1487 762 1494 743 1500 C724 1507 705 1515 686 1522 C667 1529 649 1537 630 1545 C611 1553 592 1561 573 1570 C554 1578 535 1587 516 1596 C497 1605 478 1614 459 1624 C440 1633 421 1642 402 1652 C383 1661 364 1671 345 1681 C326 1691 307 1700 288 1710 C269 1720 250 1730 231 1739 C212 1749 193 1759 174 1769 C155 1778 136 1788 117 1797 C98 1807 79 1816 60 1825 C41 1834 12 1848 3 1852 L0 1852 L-3 2579 L1824 2579Z"

const RED = "#e10813"
const PINK = "#f5b0b3"

export default function TheWavePage() {
  const copy = useSiteCopy()
  const [products, setProducts] = useState<any[]>([])
  const [heroFailed, setHeroFailed] = useState(false)
  const productsRef = useRef<HTMLDivElement>(null)
  const [waveOpacity, setWaveOpacity] = useState(0)
  const [filters, setFilters] = useState({
    gender: "all",
    sort: "default",
  })

  // Cette page a son propre fond (pas de mode clair/sombre) : on utilise le style sombre pour les textes clairs
  useLayoutEffect(() => {
    const html = document.documentElement
    html.classList.add("dark", "wave-page")

    return () => {
      html.classList.remove("wave-page")
      let saved: string | null = null
      try {
        saved = localStorage.getItem("theme")
      } catch {}
      if (saved !== "dark") html.classList.remove("dark")
    }
  }, [])

  // La vague rose apparaît doucement quand on arrive aux produits
  useEffect(() => {
    const update = () => {
      const el = productsRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const vh = window.innerHeight
      // début : le haut de la zone produits est à 90% de l'écran, fin : à 40%
      const start = vh * 0.9
      const end = vh * 0.4
      const p = (start - top) / (start - end)
      setWaveOpacity(Math.min(1, Math.max(0, p)))
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/collections/${COLLECTION_SLUG}`)
        if (!res.ok) return
        const data = await res.json()
        setProducts(data.products ?? [])
      } catch (err) {
        console.error(err)
      }
    }

    load()
  }, [])

  const filteredProducts = products
    .filter((p) => {
      if (filters.gender !== "all" && p.gender !== filters.gender) return false
      return true
    })
    .sort((a, b) => {
      if (filters.sort === "price-asc") return a.price - b.price
      if (filters.sort === "price-desc") return b.price - a.price
      if (filters.sort === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      }
      return 0
    })

  return (
    <>
      <style>{`
        html.wave-page { background: ${RED}; }
        html.wave-page body { background: transparent !important; color: #fff; }
        html.wave-page .bg-background { background-color: transparent !important; }
        html.wave-page .flower-light,
        html.wave-page .flower-dark { display: none !important; }
      `}</style>

      {/* Fond fixe : tout rouge, puis la grande vague rose apparaît au niveau des produits */}
      <div className="fixed inset-0 -z-10" style={{ background: RED }} aria-hidden="true">
        <svg
          className="h-full w-full"
          viewBox="0 0 1821 2576"
          preserveAspectRatio="xMidYMax slice"
          style={{ opacity: waveOpacity, transition: "opacity 0.25s linear" }}
        >
          <path d={WAVE_PATH} fill={PINK} />
        </svg>
      </div>

      <Navbar />

      {/* ================= IMAGE PLEINE LARGEUR (sans arrondi, sans marges) ================= */}
      <section
        className="relative w-full overflow-hidden bg-white/10"
        style={{ height: HERO_HEIGHT }}
      >
        {!heroFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={HERO_IMAGE}
            alt={TITLE}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setHeroFailed(true)}
          />
        )}
      </section>

      {/* ================= LOGO + TEXTE ================= */}
      <section className="w-11/12 max-w-6xl mx-auto pt-12 sm:pt-16 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="sr-only">{TITLE}</h1>

          {/* Le logo 2 remplace le titre écrit */}
          <div className="flex justify-center">
            <CroppedLogo
              bases={["/images/the-wave-logo2"]}
              alt={TITLE}
              className="h-16 sm:h-24 w-auto"
            />
          </div>

          <p className="mt-8 text-sm sm:text-base leading-relaxed text-white">
            {copy.waveText}
          </p>
        </div>
      </section>

      {/* ================= PRODUITS ================= */}
      <div ref={productsRef} className="relative px-6 pt-20 pb-44 text-white">
        {products.length > 0 && (
          <>
            <ProductFilters filters={filters} setFilters={setFilters} />
            <div className="relative top-12">
              <div
                className="
                  grid
                  grid-cols-2
                  gap-x-4 gap-y-8
                  md:grid-cols-3
                  lg:grid-cols-4
                "
              >
                {filteredProducts.map((product) => (
                  <Product key={product.id} product={product} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </>
  )
}
