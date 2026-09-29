"use client";

import { useEffect } from "react";

// Éléments qui apparaissent en fondu quand ils entrent à l'écran
const SELECTOR = [
  "h1",
  "h2",
  "h3",
  "p",
  "li",
  "img",
  "video",
  "div.group.relative.w-full", // cartes produit
  "[data-reveal]",
].join(",");

// Zones où l'animation ne doit jamais s'appliquer
const EXCLUDE = [
  "nav",
  "header",
  ".liquid-glass",
  ".ant-drawer",
  ".ant-modal",
  ".ant-message",
  ".ant-notification",
  "[role='dialog']",
  "[data-no-reveal]",
].join(",");

// vrai si l'élément est dans un panneau fixe (menu, panier, fenêtre...)
const insideFixed = (el: HTMLElement) => {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    if (getComputedStyle(node).position === "fixed") return true;
    node = node.parentElement;
  }
  return false;
};

export default function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const seen = new WeakSet<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        let i = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.style.transitionDelay = `${Math.min(i, 5) * 70}ms`;
          i++;
          // on attend une frame pour que le fondu se voie
          requestAnimationFrame(() => el.classList.add("reveal-in"));
          io.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );

    const scan = () => {
      document.querySelectorAll(SELECTOR).forEach((node) => {
        if (seen.has(node)) return;
        seen.add(node);
        const el = node as HTMLElement;

        if (el.closest(EXCLUDE)) return;
        // pas de double animation si un parent est déjà animé
        if (el.parentElement?.closest(".reveal")) return;
        // éléments fixes / invisibles : on ne touche pas
        if (getComputedStyle(el).display === "none") return;
        if (insideFixed(el)) return;

        el.classList.add("reveal");
        io.observe(el);
      });
    };

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    };

    scan();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
