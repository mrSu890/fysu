"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SlidersHorizontal, X } from "lucide-react"
import { useTranslations } from "next-intl"

/* ====================================================================
   FILTRES
   Panneau en verre comme la barre de navigation (lisible sur tous les fonds,
   y compris The Wave) avec des pastilles à toucher au lieu de menus déroulants.
   ==================================================================== */

const LINE = "color-mix(in srgb, currentColor 22%, transparent)"

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer touch-manipulation rounded-full px-4 py-2 text-xs transition active:scale-95"
      style={
        active
          ? { background: "var(--menu)", color: "var(--navbar-bg)", border: "1px solid transparent" }
          : { background: "transparent", color: "inherit", border: `1px solid ${LINE}` }
      }
    >
      {children}
    </button>
  )
}

export default function ProductFilters({
  filters,
  setFilters,
}: {
  filters: any
  setFilters: (f: any) => void
}) {
  const t = useTranslations("Filters")
  const [open, setOpen] = useState(false)

  const resetFilters = () => {
    setFilters({
      price: [0, 1000],
      gender: "all",
      sort: "default",
    })
  }

  const genders = [
    { value: "all", label: t("all") },
    { value: "men", label: t("men") },
    { value: "women", label: t("women") },
    { value: "unisex", label: t("unisex") },
  ]

  const sorts = [
    { value: "default", label: t("default") },
    { value: "price-asc", label: t("priceAsc") },
    { value: "price-desc", label: t("priceDesc") },
    { value: "newest", label: t("newest") },
  ]

  const activeCount =
    (filters.gender && filters.gender !== "all" ? 1 : 0) +
    (filters.sort && filters.sort !== "default" ? 1 : 0)

  return (
    <>
      {/* BOUTON */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-info flex cursor-pointer touch-manipulation items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] transition active:scale-95"
          style={{ border: `1px solid ${LINE}`, background: "transparent", color: "inherit" }}
        >
          <SlidersHorizontal size={14} />
          {t("open")}
          {activeCount > 0 && (
            <span
              className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]"
              style={{ background: "var(--navbar-bg)", color: "var(--menu)" }}
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            {/* FOND FLOU */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            />

            {/* PANNEAU EN VERRE */}
            <motion.div
              initial={{ x: "110%" }}
              animate={{ x: 0 }}
              exit={{ x: "110%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              role="dialog"
              aria-label={t("title")}
              className="liquid-glass fixed bottom-3 right-3 top-3 z-50 flex w-[calc(100%-24px)] flex-col rounded-[30px] p-7 sm:w-[400px] sm:p-9"
              style={{
                color: "var(--menu)",
                background: "color-mix(in srgb, var(--navbar-bg) 80%, transparent)",
              }}
            >
              {/* EN-TÊTE */}
              <div className="mb-10 flex items-center justify-between">
                <h3 className="text-sm uppercase tracking-[0.3em]">{t("title")}</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
                  style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-9 overflow-y-auto">
                <div>
                  <p className="mb-3 text-[11px] uppercase tracking-[0.25em] opacity-70">{t("gender")}</p>
                  <div className="flex flex-wrap gap-2">
                    {genders.map((g) => (
                      <Chip
                        key={g.value}
                        active={filters.gender === g.value}
                        onClick={() => setFilters({ ...filters, gender: g.value })}
                      >
                        {g.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[11px] uppercase tracking-[0.25em] opacity-70">{t("sort")}</p>
                  <div className="flex flex-wrap gap-2">
                    {sorts.map((s) => (
                      <Chip
                        key={s.value}
                        active={filters.sort === s.value}
                        onClick={() => setFilters({ ...filters, sort: s.value })}
                      >
                        {s.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="cursor-pointer self-start text-[11px] uppercase tracking-[0.25em] underline underline-offset-4 opacity-80"
                >
                  {t("reset")}
                </button>
              </div>

              {/* VALIDER */}
              <div className="mt-auto pt-8">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full cursor-pointer rounded-full py-4 text-xs uppercase tracking-[0.3em] transition active:scale-[0.98]"
                  style={{ background: "var(--menu)", color: "var(--navbar-bg)" }}
                >
                  {t("apply")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
