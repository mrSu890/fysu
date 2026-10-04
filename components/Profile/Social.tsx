"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Avatar from "./Avatar"
import { socialCopy } from "./socialCopy"

type Person = { username: string; display_name: string | null; avatar_url: string | null }
type Found = Person & { relation: string }
type InboxItem = {
  id: string
  message: string | null
  reaction: string | null
  seen: boolean
  created_at: string
  product: { id: number; name: string; slug: string | null; image: string | null }
  from: Person | null
}

const REACTIONS = ["❤️", "🔥", "🎁", "👀", "👌"]

async function post(body: any) {
  const res = await fetch("/api/social", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json().catch(() => ({}))
}

/* Amis + boîte de réception, dans My FYSU */
export default function Social({
  accent,
  locale,
  hasUsername,
}: {
  accent: string
  locale: string
  hasUsername: boolean
}) {
  const c = socialCopy(locale)
  const [friends, setFriends] = useState<Person[]>([])
  const [incoming, setIncoming] = useState<Person[]>([])
  const [outgoing, setOutgoing] = useState<Person[]>([])
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [q, setQ] = useState("")
  const [results, setResults] = useState<Found[] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/social", { cache: "no-store" })
      if (!res.ok) return
      const j = await res.json()
      setFriends(j.friends ?? [])
      setIncoming(j.incoming ?? [])
      setOutgoing(j.outgoing ?? [])
      setInbox(j.inbox ?? [])
      if ((j.unseen ?? 0) > 0) setTimeout(() => post({ action: "seen" }), 2500)
    } catch {}
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const term = q.trim()
    if (term.replace(/^@/, "").length < 2) {
      setResults(null)
      return
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/social?what=search&q=${encodeURIComponent(term)}`, { cache: "no-store" })
        const j = await res.json()
        setResults(j.users ?? [])
      } catch {
        setResults([])
      }
    }, 300)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [q])

  async function act(action: string, username: string) {
    await post({ action, username })
    await load()
    if (action === "request") {
      setResults((r) => (r ?? []).map((u) => (u.username === username ? { ...u, relation: "outgoing" } : u)))
    }
  }

  async function react(item: InboxItem, reaction: string) {
    const next = item.reaction === reaction ? null : reaction
    setInbox((list) => list.map((i) => (i.id === item.id ? { ...i, reaction: next } : i)))
    await post({ action: "react", id: item.id, reaction: next })
  }

  const btn = "rounded-full px-4 py-2 text-sm font-medium"
  const nameOf = (p: Person) => p.display_name || p.username

  const Row = ({ p, children }: { p: Person; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <Link href={`/u/${p.username}`} className="flex min-w-0 items-center gap-3">
        <Avatar url={p.avatar_url} name={nameOf(p)} accent={accent} size={44} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{nameOf(p)}</span>
          <span className="block truncate text-xs text-foreground/50">@{p.username}</span>
        </span>
      </Link>
      <div className="flex shrink-0 gap-2">{children}</div>
    </div>
  )

  return (
    <>
      {/* AMIS */}
      <section className="mx-auto w-11/12 max-w-7xl py-8">
        <h2 className="font-dior text-2xl">{c.friends}</h2>
        <p className="mt-1 text-sm text-foreground/60">{hasUsername ? c.friendsIntro : c.needUsername}</p>

        {hasUsername && (
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50">@</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value.replace(/^@/, ""))}
                  placeholder={c.search}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-foreground/20 bg-transparent py-3 pl-9 pr-4 text-base outline-none focus:border-foreground/60"
                />
              </div>
              {results && (
                <div className="mt-2 divide-y divide-foreground/10 rounded-2xl border border-foreground/15 px-4">
                  {results.length === 0 && <p className="py-3 text-sm text-foreground/50">{c.noResult}</p>}
                  {results.map((u) => (
                    <Row key={u.username} p={u}>
                      {u.relation === "none" && (
                        <button className={btn + " text-white"} style={{ background: accent }} onClick={() => act("request", u.username)}>
                          {c.add}
                        </button>
                      )}
                      {u.relation === "outgoing" && <span className="text-xs text-foreground/50">{c.requested}</span>}
                      {u.relation === "friends" && <span className="text-xs text-foreground/50">{c.alreadyFriends}</span>}
                      {u.relation === "incoming" && (
                        <button className={btn + " text-white"} style={{ background: accent }} onClick={() => act("accept", u.username)}>
                          {c.accept}
                        </button>
                      )}
                    </Row>
                  ))}
                </div>
              )}

              {incoming.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-wider text-foreground/50">{c.incoming}</p>
                  <div className="divide-y divide-foreground/10">
                    {incoming.map((p) => (
                      <Row key={p.username} p={p}>
                        <button className={btn + " text-white"} style={{ background: accent }} onClick={() => act("accept", p.username)}>
                          {c.accept}
                        </button>
                        <button className={btn + " border border-foreground/30"} onClick={() => act("decline", p.username)}>
                          {c.decline}
                        </button>
                      </Row>
                    ))}
                  </div>
                </div>
              )}

              {outgoing.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-wider text-foreground/50">{c.pending}</p>
                  <div className="divide-y divide-foreground/10">
                    {outgoing.map((p) => (
                      <Row key={p.username} p={p}>
                        <button className="text-sm text-foreground/50 underline" onClick={() => act("cancel", p.username)}>
                          {c.cancel}
                        </button>
                      </Row>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              {friends.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-foreground/25 px-6 py-8 text-center text-sm text-foreground/55">
                  {c.noFriends}
                </p>
              ) : (
                <div className="divide-y divide-foreground/10 rounded-2xl border border-foreground/15 px-4">
                  {friends.map((p) => (
                    <Row key={p.username} p={p}>
                      <button className="text-sm text-foreground/50 underline" onClick={() => act("remove", p.username)}>
                        {c.remove}
                      </button>
                    </Row>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* BOÎTE DE RÉCEPTION */}
      <section className="mx-auto w-11/12 max-w-7xl py-8">
        <h2 className="font-dior text-2xl">{c.inbox}</h2>
        <p className="mt-1 text-sm text-foreground/60">{c.inboxIntro}</p>

        {inbox.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-foreground/25 px-6 py-8 text-center text-sm text-foreground/55">
            {c.inboxEmpty}
          </p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inbox.map((i) => (
              <div key={i.id} className="overflow-hidden rounded-2xl border border-foreground/15">
                <Link href={i.product.slug ? `/product/${i.product.slug}` : "#"} className="relative block aspect-[4/3] bg-foreground/10">
                  {i.product.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.product.image} alt={i.product.name} className="h-full w-full object-cover" />
                  )}
                  {!i.seen && (
                    <span className="absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs text-white" style={{ background: accent }}>
                      {c.newTag}
                    </span>
                  )}
                </Link>
                <div className="p-4">
                  <p className="truncate text-sm font-medium uppercase tracking-wide">{i.product.name}</p>
                  {i.from && (
                    <Link href={`/u/${i.from.username}`} className="mt-2 flex items-center gap-2 text-xs text-foreground/60">
                      <Avatar url={i.from.avatar_url} name={nameOf(i.from)} accent={accent} size={24} />
                      {c.from} {nameOf(i.from)}
                    </Link>
                  )}
                  {i.message && <p className="mt-2 text-sm">« {i.message} »</p>}
                  <div className="mt-3 flex gap-1.5">
                    {REACTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => react(i, r)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                        style={{
                          background: i.reaction === r ? `${accent}30` : "transparent",
                          boxShadow: i.reaction === r ? `inset 0 0 0 2px ${accent}` : "inset 0 0 0 1px rgba(128,128,128,.25)",
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
