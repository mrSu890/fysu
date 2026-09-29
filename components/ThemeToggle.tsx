"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function ThemeToggle() {
  const [isOn, setIsOn] = useState(false); // true = mode sombre

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const dark = saved === "dark";
    setIsOn(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggle = () => {
    const next = !isOn;
    setIsOn(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    window.dispatchEvent(new Event("theme-change"));
  };

  return (
      <div className="relative top-5 w-full flex items-center justify-center py-6">
      <button
        type="button"
        onClick={toggle}
        aria-label={isOn ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={isOn}
        className="relative liquid-glass h-10 w-[88px] rounded-full cursor-pointer"
      >
        {/* Pastille qui glisse sous le soleil ou la lune */}
        <motion.div
          initial={false}
          animate={{ x: isOn ? 44 : 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="absolute left-1 top-1 h-8 w-10 rounded-full bg-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
        />

        <div className="relative z-10 flex h-full w-full items-center">
          {/* Soleil */}
          <span
            className={`flex h-full w-1/2 items-center justify-center transition-colors ${
              isOn ? "text-white/60" : "text-neutral-700"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </span>

          {/* Lune */}
          <span
            className={`flex h-full w-1/2 items-center justify-center transition-colors ${
              isOn ? "text-neutral-700" : "text-white/60"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
            </svg>
          </span>
        </div>
      </button>
    </div>
  );
}
