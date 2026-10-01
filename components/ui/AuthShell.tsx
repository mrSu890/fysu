"use client"

import { motion } from "framer-motion"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

/* ====================================================================
   Page de connexion / création de compte : style fysu
   (carte douce, champs arrondis, bouton pastille, fonctionne en clair et en sombre)
   ==================================================================== */

const LINE = "color-mix(in srgb, var(--foreground) 14%, transparent)"

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="flex min-h-[100svh] items-center justify-center px-4 pb-24 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[420px] rounded-[32px] p-8 sm:p-10"
          style={{
            background: "color-mix(in srgb, var(--foreground) 5%, var(--background))",
            border: `1px solid ${LINE}`,
            boxShadow: "0 24px 60px rgba(0,0,0,0.10)",
          }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm opacity-60">{subtitle}</p>}
          </div>
          {children}
        </motion.div>
      </main>
      <Footer />
    </>
  )
}

export function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-full bg-transparent px-5 py-3.5 text-sm outline-none transition placeholder:opacity-50 focus:ring-2"
      style={
        {
          border: `1px solid ${LINE}`,
          "--tw-ring-color": "color-mix(in srgb, var(--foreground) 18%, transparent)",
        } as React.CSSProperties
      }
    />
  )
}

export function PrimaryButton({
  children,
  loading,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="w-full cursor-pointer touch-manipulation rounded-full py-3.5 text-sm font-medium tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      style={{ background: "var(--foreground)", color: "var(--background)" }}
    >
      {children}
    </button>
  )
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs opacity-60">
      <span className="h-px flex-1" style={{ background: LINE }} />
      {label}
      <span className="h-px flex-1" style={{ background: LINE }} />
    </div>
  )
}

export function GoogleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer touch-manipulation items-center justify-center gap-3 rounded-full bg-transparent py-3.5 text-sm font-medium transition active:scale-[0.98]"
      style={{ border: `1px solid ${LINE}` }}
    >
      <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.3 0 6.3 1.2 8.6 3.2l6.4-6.4C34.7 2.5 29.7 0 24 0 14.8 0 6.8 5.5 3 13.4l7.5 5.8C12.2 13.3 17.6 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.7-.4-3.9H24v7.4h12.7c-.3 2-1.9 5-5.5 7l8.5 6.6C44.5 36.7 46.5 31 46.5 24.5z" />
        <path fill="#FBBC05" d="M10.5 28.8c-.5-1.3-.8-2.7-.8-4.3s.3-3 .8-4.3L3 14.4C1.1 18 0 20.9 0 24.5s1.1 6.5 3 10.1l7.5-5.8z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-8.5-6.6c-2.3 1.6-5.3 2.6-7.4 2.6-6.4 0-11.8-3.8-13.5-9.7L3 34.6C6.8 42.5 14.8 48 24 48z" />
      </svg>
      {label}
    </button>
  )
}
