"use client"

import { useState } from "react"
import Link from "next/link"
import { Info, type LucideIcon } from "lucide-react"

/* ---------- CODE COULOR (un sens = une couleur, partout dans l'admin) ----------
   vert   : argent et ventes (commandes, codes promo)
   bleu   : catalogue et personnes (produits, clients)
   orange : à traiter (demandes)
   rose   : l'accueil et l'image du site
   violet : le contenu éditorial (stories, musique, FY'grances, about)
   gris   : légal et réglages, aperçu
   -------------------------------------------------------------------------- */
export type TileTone = "green" | "blue" | "orange" | "pink" | "purple" | "gray"
const TILE: Record<TileTone, string> = {
  green: "#34c759",
  blue: "#0a84ff",
  orange: "#ff9500",
  pink: "#ff375f",
  purple: "#af52de",
  gray: "#8e8e93",
}

/* Pastille d'icône : carré arrondi coloré, pictogramme blanc (comme les réglages iOS) */
export function IconTile({ icon: Icon, tone = "gray", size = 28 }: { icon: LucideIcon; tone?: TileTone; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center text-white"
      style={{ width: size, height: size, borderRadius: size * 0.27, background: TILE[tone] }}
    >
      <Icon size={Math.round(size * 0.58)} strokeWidth={2} />
    </span>
  )
}

/* Texte d'aide : replié derrière une petite icône « i » (un toucher l'ouvre) */
export function Hint({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Aide"
        aria-expanded={open}
        className="ml-1.5 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full align-middle text-[#9a948a] hover:text-[#171717]"
      >
        <Info size={14} strokeWidth={1.75} />
      </button>
      {open && <span className="mt-1.5 block max-w-2xl text-xs font-normal normal-case tracking-normal text-[#7a756d]">{children}</span>}
    </>
  )
}

/* ====================================================================
   KIT DE COMPOSANTS COMMUNS À TOUS LES PANNEAUX ADMIN
   Utilisation : import { PageHeader, Panel, ... } from "@/components/Admin/ui/kit"
   ==================================================================== */

/* ---------- En-tête de page ---------- */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
          {description && <Hint>{description}</Hint>}
        </h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ---------- Carte / panneau ---------- */
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section
      className={`rounded-3xl border border-[#e9e5df] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold tracking-tight">
                {title}
                {description && <Hint>{description}</Hint>}
              </h2>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? "p-5 sm:p-6" : ""}>{children}</div>
    </section>
  )
}

/* ---------- Petit badge coloré ---------- */
type Tone = "neutral" | "green" | "orange" | "blue" | "red"

const TONES: Record<Tone, string> = {
  neutral: "bg-[#171717]/[0.06] text-[#3d3a35]",
  green: "bg-[#dcebd8] text-[#2c4a26]",
  orange: "bg-[#fbe6c8] text-[#7a4a0a]",
  blue: "bg-[#dbe7f7] text-[#1f3f73]",
  red: "bg-[#f8d9d9] text-[#7a1f1f]",
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}

/* ---------- Statut d'une commande ---------- */
const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "En attente", tone: "orange" },
  paid: { label: "Payée", tone: "green" },
  shipped: { label: "Expédiée", tone: "blue" },
  cancelled: { label: "Annulée", tone: "red" },
  refunded: { label: "Remboursée", tone: "red" },
}

export function OrderStatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, tone: "neutral" as Tone }
  return <Badge tone={s.tone}>{s.label}</Badge>
}

/* ---------- Chiffre clé ---------- */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "gray",
  href,
  loading,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon?: LucideIcon
  tone?: TileTone
  href?: string
  loading?: boolean
}) {
  const inner = (
    <div className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-[#e9e5df] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-xs text-[#7a756d]">{label}</p>
        {Icon && <IconTile icon={Icon} tone={tone} size={30} />}
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight sm:text-[28px]">{value}</p>
        )}
        {/* hint volontairement non affiché : le chiffre suffit */}
      </div>
    </div>
  )

  return href ? (
    <Link href={href} style={{ color: "inherit" }} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  )
}

/* ---------- Boutons ---------- */
export function AdminButton({
  children,
  href,
  onClick,
  variant = "secondary",
  icon: Icon,
  type = "button",
  disabled,
}: {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost" | "danger"
  icon?: LucideIcon
  type?: "button" | "submit"
  disabled?: boolean
}) {
  const styles = {
    primary: { className: "bg-[#171717] hover:bg-[#2b2925]", color: "#ffffff" },
    secondary: {
      className: "bg-white ring-1 ring-[#e0dbd3] hover:bg-[#faf8f5]",
      color: "#171717",
    },
    ghost: { className: "hover:bg-[#171717]/[0.06]", color: "#3d3a35" },
    danger: { className: "bg-[#fdeeee] ring-1 ring-[#f3c9c9] hover:bg-[#fbe0e0]", color: "#9b1c1c" },
  }[variant]

  const className = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles.className}`
  const content = (
    <>
      {Icon && <Icon size={15} strokeWidth={1.9} />}
      {children}
    </>
  )

  if (href) {
    return (
      <Link href={href} style={{ color: styles.color }} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ color: styles.color }}
      className={className}
    >
      {content}
    </button>
  )
}

/* ---------- Etats vides et chargement ---------- */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#171717]/[0.07] ${className}`} />
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#ddd7cd] px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-xs text-[#7a756d]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
