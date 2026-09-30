"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { countryName, flagEmoji, getStoredCountry } from "@/lib/regions";

// Bouton du menu : affiche la zone choisie et rouvre le pop-up de choix
export default function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("LocaleSwitcher");
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setCountry(getStoredCountry());
    read();
    window.addEventListener("region-done", read);
    return () => window.removeEventListener("region-done", read);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-region-picker"))}
      aria-label={t("label")}
      className="inline-flex cursor-pointer items-center gap-2 text-[11px] uppercase tracking-[0.18em]"
    >
      <span aria-hidden="true">{country ? flagEmoji(country) : "🌍"}</span>
      <span>{country ? countryName(country, locale) : t("label")}</span>
      <span className="opacity-60">· {locale.toUpperCase()}</span>
    </button>
  );
}
