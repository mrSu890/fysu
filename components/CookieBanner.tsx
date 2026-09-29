"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { acceptAll, rejectAll, getConsent, setConsent, CookieConsent } from "@/lib/cookieConsent";
import { useTranslations } from "next-intl";

type Mode = "banner" | "prefs";

export default function CookieBanner() {
  const t = useTranslations("CookieBanner");
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("banner");

  // état local des toggles (pour l'écran prefs)
  const [prefs, setPrefs] = useState<Omit<CookieConsent, "necessary" | "updatedAt" | "version">>({
    analytics: false,
    marketing: false,
    personalization: false,
  });

  useEffect(() => {
    const existing = getConsent();
    if (!existing) {
      setVisible(true);
      setMode("banner");
    } else {
      // si tu veux permettre réouverture via un bouton ailleurs,
      // tu peux laisser visible=false.
      setVisible(false);
    }
  }, []);

  const openPrefs = () => {
    const existing = getConsent();
    if (existing) {
      setPrefs({
        analytics: !!existing.analytics,
        marketing: !!existing.marketing,
        personalization: !!existing.personalization,
      });
    } else {
      setPrefs({ analytics: false, marketing: false, personalization: false });
    }
    setMode("prefs");
    setVisible(true);
  };

  const close = () => setVisible(false);

  const onAcceptAll = () => {
    acceptAll();
    close();
  };

  const onRejectAll = () => {
    rejectAll();
    close();
  };

  const onSavePrefs = () => {
    setConsent(prefs);
    close();
  };

  const title = useMemo(() => {
    return mode === "banner" ? t("privacyTitle") : t("prefsTitle");
  }, [mode, t]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          // mobile: bottom center | desktop: bottom left
          className="
            fixed z-50
            bottom-5 left-1/2 -translate-x-1/2
            md:left-5 md:translate-x-0
          "
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div
            className="
              w-[min(560px,calc(100vw-2.5rem))]
              rounded-3xl
                            relative liquid-glass cookie-glass
              shadow-2xl
              p-6 md:p-7
            "
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm md:text-base font-medium">{title}</p>
                {mode === "banner" ? (
                  <p className="mt-2 text-xs md:text-sm text-gray-700 leading-relaxed">
                    {t("privacyText")}
                  </p>
                ) : (
                  <p className="mt-2 text-xs md:text-sm text-gray-700 leading-relaxed">
                    {t("prefsText")}
                  </p>
                )}
              </div>

              <button
                onClick={close}
                aria-label={t("close")}
                className="text-gray-500 hover:text-gray-900 transition text-xl leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            {mode === "banner" ? (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={onAcceptAll}
                  className="bg-black text-white py-3.5 rounded-xl text-xs tracking-wide hover:opacity-90 transition cursor-pointer"
                >
                  {t("acceptCasual")}
                </button>

                <button
                  onClick={onRejectAll}
                  className="border border-black/15 bg-white py-3.5 rounded-xl text-xs tracking-wide hover:bg-black/5 transition cursor-pointer"
                >
                  {t("rejectNonEssential")}
                </button>

                <button
                  onClick={openPrefs}
                  className="border border-black/15 bg-white py-3.5 rounded-xl text-xs tracking-wide hover:bg-black/5 transition cursor-pointer"
                >
                  {t("setPreferences")}
                </button>
              </div>
            ) : (
              <>
                <div className="mt-5 space-y-3">
                  <PrefRow
                    title={t("necessary")}
                    desc={t("necessaryDesc")}
                    checked
                    disabled
                    onChange={() => {}}
                  />
                  <PrefRow
                    title={t("analytics")}
                    desc={t("analyticsDesc")}
                    checked={prefs.analytics}
                    onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                  />
                  <PrefRow
                    title={t("personalization")}
                    desc={t("personalizationDesc")}
                    checked={prefs.personalization}
                    onChange={(v) => setPrefs((p) => ({ ...p, personalization: v }))}
                  />
                  <PrefRow
                    title={t("marketing")}
                    desc={t("marketingDesc")}
                    checked={prefs.marketing}
                    onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={onSavePrefs}
                    className="bg-black text-white py-3.5 rounded-xl text-xs md:text-sm tracking-wide hover:opacity-90 transition"
                  >
                    {t("save").toUpperCase()}
                  </button>

                  <button
                    onClick={onRejectAll}
                    className="border border-black/15 bg-white py-3.5 rounded-xl text-xs md:text-sm tracking-wide hover:bg-black/5 transition"
                  >
                    {t("rejectAll").toUpperCase()}
                  </button>

                  <button
                    onClick={onAcceptAll}
                    className="border border-black/15 bg-white py-3.5 rounded-xl text-xs md:text-sm tracking-wide hover:bg-black/5 transition"
                  >
                    {t("acceptAll").toUpperCase()}
                  </button>
                </div>

                <button
                  onClick={() => setMode("banner")}
                  className="mt-3 text-xs md:text-sm text-gray-700 hover:underline"
                >
                  {t("back")}
                </button>
              </>
            )}

            {/* Optionnel: lien vers ta policy */}
            <p className="mt-4 text-[11px] md:text-xs text-gray-500 leading-relaxed">
              {t("policy")}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PrefRow({
  title,
  desc,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-black/10 bg-white p-4">
      <div className="min-w-0">
        <p className="text-xs md:text-sm font-medium">{title}</p>
        <p className="mt-1 text-[11px] md:text-xs text-gray-600">{desc}</p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          "relative h-7 w-12 rounded-full transition",
          checked ? "bg-black" : "bg-black/15",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
        ].join(" ")}
        aria-pressed={checked}
      >
        <span
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-white transition",
            checked ? "left-6" : "left-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
