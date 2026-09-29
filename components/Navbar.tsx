"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
} from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, UserRound, ShoppingCart } from "lucide-react";
import Image from "next/image";
import CartDrawer from "./CartDrawer";
import { useCart } from "@/context/CartContext";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "./LocaleSwitcher";
import CroppedLogo from "./CroppedLogo";

const logoWhite = "/images/fysu-light.png";
const logoBlack = "/images/fysu-dark.png";

// Logos de la page Kiban Collector (à déposer dans public/images)
const KIBAN_LOGO_LIGHT = "/images/kiban-logo-light"; // logo clair (mode clair)
const KIBAN_LOGO_DARK = "/images/kiban-logo-dark"; // logo foncé (mode sombre)
const KIBAN_LOGO_EXTENSIONS = ["png", "PNG", "jpg", "JPG", "jpeg", "JPEG", "webp", "svg"];

// Animation "vivante" : ressort souple et élastique, mais sombre et chic
const SPRING = { type: "spring", stiffness: 140, damping: 19, mass: 1.1 } as const;
const PILL_RADIUS = 30;
const HEADER_H = 42; // hauteur de la ligne avec les icônes
const GAP = 12; // écart entre les deux pastilles
const ICONS_W = 60; // largeur approximative du groupe d'icônes (panier + menu)
const ICONS_PAD = 24; // marge à droite des icônes quand le panneau est ouvert

function MobileMenu({
  activePanel,
  setActivePanel,
  collectionOpen,
  setCollectionOpen,
  handleMobileLinkClick,
  links,
  collections,
}: {
  activePanel: "menu" | null;
  setActivePanel: (v: "menu" | null) => void;
  collectionOpen: boolean;
  setCollectionOpen: (v: boolean) => void;
  handleMobileLinkClick: () => void;
  links: { label: string; href: string }[];
  collections: { label: string; href: string }[];
}) {
  const t = useTranslations("Navigation");
  const { cart, isCartOpen, setIsCartOpen } = useCart();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();
  const isKiban = pathname === "/kiban-collector";
  const isWave = pathname === "/thewave";
  const [kibanLogoSrc, setKibanLogoSrc] = useState<string | null>(null);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const update = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    update();

    const observer = new MutationObserver(update);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cherche le logo Kiban Collector (peu importe son extension)
  useEffect(() => {
    if (!isKiban) return;

    let cancelled = false;
    const base = isDark ? KIBAN_LOGO_DARK : KIBAN_LOGO_LIGHT;

    const tryNext = (index: number) => {
      if (cancelled) return;
      if (index >= KIBAN_LOGO_EXTENSIONS.length) {
        setKibanLogoSrc(null);
        return;
      }
      const src = `${base}.${KIBAN_LOGO_EXTENSIONS[index]}`;
      const probe = new window.Image();
      probe.onload = () => {
        if (cancelled) return;
        // Recadre automatiquement le logo (retire les marges transparentes)
        try {
          const w = probe.naturalWidth;
          const h = probe.naturalHeight;
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("no ctx");
          ctx.drawImage(probe, 0, 0);
          const data = ctx.getImageData(0, 0, w, h).data;
          let minX = w, minY = h, maxX = -1, maxY = -1;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              if (data[(y * w + x) * 4 + 3] > 8) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (maxX < 0) throw new Error("empty");
          const pad = 2;
          minX = Math.max(0, minX - pad);
          minY = Math.max(0, minY - pad);
          maxX = Math.min(w - 1, maxX + pad);
          maxY = Math.min(h - 1, maxY + pad);
          const cw = maxX - minX + 1;
          const ch = maxY - minY + 1;
          const out = document.createElement("canvas");
          out.width = cw;
          out.height = ch;
          out.getContext("2d")!.drawImage(probe, minX, minY, cw, ch, 0, 0, cw, ch);
          setKibanLogoSrc(out.toDataURL("image/png"));
        } catch {
          setKibanLogoSrc(src);
        }
      };
      probe.onerror = () => tryNext(index + 1);
      probe.src = src;
    };

    tryNext(0);

    return () => {
      cancelled = true;
    };
  }, [isKiban, isDark]);

  const panel: "menu" | "cart" | null = isCartOpen
    ? "cart"
    : activePanel === "menu"
    ? "menu"
    : null;
  const open = panel !== null;

  const toggleCart = () => {
    if (isCartOpen) {
      setIsCartOpen(false);
      return;
    }
    setActivePanel(null);
    setIsCartOpen(true);
  };

  const toggleMenu = () => {
    if (activePanel === "menu") {
      setActivePanel(null);
      return;
    }
    setIsCartOpen(false);
    setActivePanel("menu");
  };

  /* ---------- Animation des pastilles (largeur / hauteur / position réelles) ---------- */
  const rowRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [rowW, setRowW] = useState(0);
  const [topH, setTopH] = useState(HEADER_H);
  const [contentH, setContentH] = useState(0);
  const readyRef = useRef(false);

  // Valeurs de départ en CSS (avant la mesure), puis en pixels
  const logoWidth = useMotionValue<any>("calc(70% - 6px)");
  const rightWidth = useMotionValue<any>("calc(30% - 6px)");
  const rightHeight = useMotionValue<any>(HEADER_H);
  const rightX = useMotionValue<any>(0);
  const rightY = useMotionValue<any>(0);
  const iconsRight = useMotionValue<any>(`calc(50% - ${ICONS_W / 2}px)`);

  // Mesure la largeur disponible et la hauteur de la pastille du logo
  useEffect(() => {
    const row = rowRef.current;
    const logo = logoRef.current;
    if (!row || !logo) return;

    const measure = () => {
      setRowW(row.offsetWidth);
      if (logo.offsetHeight > 0) setTopH(logo.offsetHeight);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(row);
    ro.observe(logo);
    return () => ro.disconnect();
  }, []);

  // Mesure la hauteur du contenu (menu ou panier) affiché dans le panneau
  const contentObserver = useRef<ResizeObserver | null>(null);
  const setContentEl = useCallback((el: HTMLDivElement | null) => {
    if (contentObserver.current) {
      contentObserver.current.disconnect();
      contentObserver.current = null;
    }
    if (!el) return;
    const measure = () => {
      if (el.offsetHeight > 0) setContentH(el.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    contentObserver.current = ro;
  }, []);

  useEffect(() => {
    if (!rowW) return;

    const closedRightW = rowW * 0.3 - GAP / 2;
    const targets: [any, number][] = [
      [logoWidth, open ? rowW : rowW * 0.7 - GAP / 2],
      [rightWidth, open ? rowW : closedRightW],
      [rightX, open ? 0 : rowW - closedRightW],
      [rightY, open ? topH + GAP : 0],
      [rightHeight, open ? HEADER_H + contentH : HEADER_H],
      [iconsRight, open ? ICONS_PAD : (closedRightW - ICONS_W) / 2],
    ];

    if (!readyRef.current) {
      // Première mesure : on place tout d'un coup, sans animation
      targets.forEach(([mv, v]) => mv.jump(v));
      readyRef.current = true;
      return;
    }

    targets.forEach(([mv, v]) => animate(mv, v, SPRING));
  }, [rowW, topH, open, contentH, logoWidth, rightWidth, rightX, rightY, rightHeight, iconsRight]);

  return (
    <div className="navbar-root fixed top-2 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-3xl">
      <div ref={rowRef} className="relative">
        {/* Pastille du logo : elle s'étend pour combler le vide laissé par l'autre pastille */}
        <motion.div
          ref={logoRef}
          style={{ width: logoWidth, borderRadius: PILL_RADIUS }}
          className="relative liquid-glass flex justify-start"
        >
          <Link href="/" className="flex items-center justify-start">
            <div
              className={
                isKiban || isWave
                  ? "relative"
                  : "relative h-[16px] w-[105px] my-[13px] sm:h-[24px] sm:w-[160px] sm:my-[.52rem]"
              }
            >
              {isKiban ? (
                kibanLogoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={kibanLogoSrc}
                    alt="Kiban Collector"
                    className="block h-[26px] sm:h-[30px] w-auto max-w-full my-[8px] sm:my-[6px]"
                    style={{
                      filter: isDark
                        ? "brightness(0)"
                        : "brightness(0) invert(1)",
                    }}
                  />
                ) : (
                  <span className="block my-[10px] whitespace-nowrap text-sm sm:text-lg font-medium tracking-[0.25em] uppercase">
                    Kiban Collector
                  </span>
                )
              ) : isWave ? (
                <CroppedLogo
                  bases={["/images/the-wave-logo"]}
                  alt="TheWave"
                  className="block h-[26px] sm:h-[30px] w-auto max-w-full my-[8px] sm:my-[6px]"
                  style={{ marginLeft: 18 }}
                />
              ) : (
                <Image
                  src={isDark ? logoBlack : logoWhite}
                  alt="FYSU Logo"
                  fill
                  priority
                  sizes="160px"
                  className="object-contain"
                />
              )}
            </div>
          </Link>
        </motion.div>

        {/* Pastille panier / menu : elle descend et s'agrandit en panneau */}
        <motion.div
          style={{
            width: rightWidth,
            height: rightHeight,
            x: rightX,
            y: rightY,
            borderRadius: PILL_RADIUS,
          }}
          className="absolute top-0 left-0 liquid-glass overflow-hidden text-[var(--menu)]"
        >
          <div className="relative" style={{ height: HEADER_H }}>
            <motion.div
              style={{ right: iconsRight, width: ICONS_W }}
              className="absolute top-1/2 -translate-y-1/2 flex items-center justify-between"
            >
              <button
                onClick={toggleCart}
                className="relative cursor-pointer"
                type="button"
              >
                <ShoppingCart size={20} />

                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-green-900 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {totalItems}
                  </span>
                )}
              </button>

              <button
                onClick={toggleMenu}
                className="text-[var(--menu)] cursor-pointer"
                type="button"
              >
                {panel === "menu" ? <X size={24} /> : <Menu size={24} />}
              </button>
            </motion.div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {panel === "cart" && mounted && (
              <motion.div
                key="cart"
                ref={setContentEl}
                style={{ width: rowW || "100%" }}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { delay: 0.18, duration: 0.35 },
                }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <CartDrawer />
              </motion.div>
            )}

            {panel === "menu" && (
              <motion.div
                key="menu"
                ref={setContentEl}
                style={{ width: rowW || "100%" }}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { delay: 0.18, duration: 0.35 },
                }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="max-h-[calc(100dvh-7rem)] overflow-y-auto"
              >
                <p className="text-5xl font-bold tracking-tighter px-6 pb-4">
                  {t("menu")}
                </p>

                <ul className="flex flex-col gap-4 uppercase text-sm tracking-wider px-6 pb-6">
                  {links.map((link) =>
                    link.href === "#" ? (
                      <React.Fragment key="collections-mobile">
                        <li>
                          <button
                            onClick={() => setCollectionOpen(!collectionOpen)}
                            className="flex items-center justify-between w-full py-2 border-b border-white/20"
                            type="button"
                          >
                            {t("collections").toUpperCase()}
                            <ChevronDown
                              size={16}
                              className={`transition-transform ${
                                collectionOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </li>

                        <AnimatePresence>
                          {collectionOpen && (
                            <motion.ul
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="pl-4 space-y-2 text-xs overflow-hidden"
                            >
                              {collections.map((col) => (
                                <li key={col.label}>
                                  <Link
                                    href={col.href}
                                    onClick={handleMobileLinkClick}
                                    className="block py-1 border-b border-white/10"
                                  >
                                    {col.label}
                                  </Link>
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ) : (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={handleMobileLinkClick}
                          className="block py-2 border-b border-white/20"
                        >
                          {link.label}
                        </Link>
                      </li>
                    )
                  )}

                  <li>
                    <Link
                      href="/about"
                      onClick={handleMobileLinkClick}
                      className="block py-2 border-b border-white/20"
                    >
                      {t("about")}
                    </Link>
                  </li>

                  <li>
                    <LocaleSwitcher />
                  </li>

                  <li className="mt-24">
                    <Link
                      href="/profile"
                      onClick={handleMobileLinkClick}
                      className="flex items-center gap-2"
                    >
                      <UserRound size={20} /> {t("myFysu")}
                    </Link>
                  </li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const t = useTranslations("Navigation");
  const [activePanel, setActivePanel] = useState<"menu" | null>(null);
  const [collectionOpen, setCollectionOpen] = useState(false);

  const [links, setLinks] = useState<{ label: string; href: string }[]>([]);
  const [collections, setCollections] = useState<
    { label: string; href: string }[]
  >([]);

  useEffect(() => {
    const loadPages = async () => {
      const res = await fetch("/api/pages");
      const data = await res.json();

      const pageLinks = data.map((p: any) => ({
        label: p.title.toUpperCase(),
        href: `/${p.slug}`,
      }));

      // "Kiban Collector" et "TheWave" sont placés juste au-dessus de Fy'grances
      const kibanLink = { label: "KIBAN COLLECTOR", href: "/kiban-collector" };
      const waveLink = { label: "THEWAVE", href: "/thewave" };
      const fyIndex = pageLinks.findIndex((l: { label: string; href: string }) =>
        /fy.?grances/i.test(l.href + l.label)
      );
      if (fyIndex === -1) pageLinks.push(kibanLink, waveLink);
      else pageLinks.splice(fyIndex, 0, kibanLink, waveLink);

      setLinks([
        ...pageLinks,
        { label: t("collections").toUpperCase(), href: "#" },
      ]);
    };

    const loadCollections = async () => {
      const res = await fetch("/api/collectionPages");
      const data = await res.json();

      setCollections(
        data.map((c: any) => ({
          label: c.title,
          href: `/collections/${c.slug}`,
        }))
      );
    };

    loadPages();
    loadCollections();
  }, [t]);

  const handleMobileLinkClick = () => {
    setCollectionOpen(false);
    setActivePanel(null);
  };

  return (
    <MobileMenu
      activePanel={activePanel}
      setActivePanel={setActivePanel}
      collectionOpen={collectionOpen}
      setCollectionOpen={setCollectionOpen}
      handleMobileLinkClick={handleMobileLinkClick}
      links={links}
      collections={collections}
    />
  );
}
