"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useLocale } from "next-intl"
import { Share2, X } from "lucide-react"
import Avatar from "./Avatar"
import { socialCopy } from "./socialCopy"

type Person = { username: string; display_name: string | null; avatar_url: string | null }

/* Bouton « Partager » d'une fiche produit : envoyer la pièce à un ami FYSU ou copier le lien */
export default function ShareButton({ productId, slug }: { productId: number; slug: string }) {
  const c = socialCopy(useLocale())
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [loading, setLoading] = useState(false)
  const [loggedIn, setLoggedIn] = useState(true)
  const [friends, setFriends] = useState<Person[]>([])
  const [to, setTo] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openModal() {
    setOpen(true)
    setDone(false)
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/social", { cache: "no-store" })
      if (res.status === 401) {
        setLoggedIn(false)
        return
      }
      setLoggedIn(true)
      const j = await res.json()
      setFriends(j.friends ?? [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/product/${slug}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  async function send() {
    if (!to) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "share", username: to, productId, message }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error ?? c.error)
      setDone(true)
      setMessage("")
      setTo(null)
    } catch (e: any) {
      setError(e?.message ?? c.error)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex w-fit items-center gap-2 text-xs uppercase tracking-[0.18em] opacity-70 transition hover:opacity-100"
      >
        <Share2 className="h-4 w-4" /> {c.shareButton}
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-background p-5 text-foreground shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-dior text-xl">{c.shareTitle}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label={c.close} className="rounded-full p-2 hover:bg-foreground/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={copyLink}
              className="mb-5 w-full rounded-full border border-foreground/30 py-3 text-sm"
            >
              {copied ? c.shareLinkCopied : c.shareCopyLink}
            </button>

            {loading ? (
              <p className="text-sm text-foreground/50">…</p>
            ) : !loggedIn ? (
              <p className="text-sm text-foreground/70">
                {c.shareLogin}{" "}
                <Link href="/auth/signin" className="underline">
                  →
                </Link>
              </p>
            ) : friends.length === 0 ? (
              <p className="text-sm text-foreground/70">{c.shareNoFriends}</p>
            ) : done ? (
              <p className="py-4 text-center text-lg">✅ {c.shareDone}</p>
            ) : (
              <>
                <p className="mb-2 text-xs uppercase tracking-wider text-foreground/50">{c.shareTo}</p>
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {friends.map((f) => (
                    <button
                      key={f.username}
                      type="button"
                      onClick={() => setTo(f.username)}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left"
                      style={{ background: to === f.username ? "rgba(128,128,128,.18)" : "transparent" }}
                    >
                      <Avatar url={f.avatar_url} name={f.display_name || f.username} accent="#171717" size={40} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{f.display_name || f.username}</span>
                        <span className="block truncate text-xs text-foreground/50">@{f.username}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={140}
                  rows={2}
                  placeholder={c.shareMessage}
                  className="mt-4 w-full resize-none rounded-xl border border-foreground/20 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground/60"
                />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={send}
                  disabled={!to || sending}
                  className="mt-4 w-full rounded-full bg-foreground py-3 text-sm font-medium text-background disabled:opacity-40"
                >
                  {sending ? c.sharing : c.shareSend}
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
