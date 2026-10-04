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

  const ghost = "border border-foreground/40 px-4 py-2 text-[11px] font-light uppercase tracking-[0.18em]"
  const solid = "bg-foreground text-background px-4 py-2 text-[11px] font-light uppercase tracking-[0.18em]"
  const linkBtn = "text-xs font-light text-foreground/55 underline underline-offset-4"
  const label = "text-[10px] font-light uppercase tracking-[0.2em] text-foreground/50"
  const nameOf = (p: Person) => p.display_name || p.username

  const Row = ({ p, children }: { p: Person; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 py-3">
      <Link href={`/u/${p.username}`} className="flex min-w-0 items-center gap-3">
        <Avatar url={p.avatar_url} name={nameOf(p)} accent={accent} size={40} thin />
        <span className="min-w-0">
          <span className="block truncate text-sm">{nameOf(p)}</span>
          <span className="block truncate text-xs font-light text-foreground/50">@{p.username}</span>
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  )

  return (
    <>
      {/* AMIS */}
      <section>
        <h2 className="font-dior text-2xl font-bold tracking-tight sm:text-3xl">{c.friends}</h2>
        <p className="mt-2 max-w-md text-sm font-light text-foreground/60">{hasUsername ? c.friendsIntro : c.needUsername}</p>

        {hasUsername && (
          <div className="mt-8 grid gap-10 lg:grid-cols-2">
            <div>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-foreground/50">@</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value.replace(/^@/, ""))}
                  placeholder={c.search}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full rounded-none border-0 border-b border-foreground/25 bg-transparent py-3 pl-6 pr-2 text-base font-light outline-none focus:border-foreground/70"
                />
              </div>
              {results && (
                <div className="divide-y divide-foreground/15">
                  {results.length === 0 && <p className="py-3 text-sm font-light text-foreground/50">{c.noResult}</p>}
                  {results.map((u) => (
                    <Row key={u.username} p={u}>
                      {u.relation === "none" && (
                        <button className={solid} onClick={() => act("request", u.username)}>
                          {c.add}
                        </button>
                      )}
                      {u.relation === "outgoing" && <span className="text-xs font-light text-foreground/50">{c.requested}</span>}
                      {u.relation === "friends" && <span className="text-xs font-light text-foreground/50">{c.alreadyFriends}</span>}
                      {u.relation === "incoming" && (
                        <button className={solid} onClick={() => act("accept", u.username)}>
                          {c.accept}
                        </button>
                      )}
                    </Row>
                  ))}
                </div>
              )}

              {incoming.length > 0 && (
                <div className="mt-8">
                  <p className={label}>{c.incoming}</p>
                  <div className="mt-2 divide-y divide-foreground/15">
                    {incoming.map((p) => (
                      <Row key={p.username} p={p}>
                        <button className={solid} onClick={() => act("accept", p.username)}>
                          {c.accept}
                        </button>
                        <button className={ghost} onClick={() => act("decline", p.username)}>
                          {c.decline}
                        </button>
                      </Row>
                    ))}
                  </div>
                </div>
              )}

              {outgoing.length > 0 && (
                <div className="mt-8">
                  <p className={label}>{c.pending}</p>
                  <div className="mt-2 divide-y divide-foreground/15">
                    {outgoing.map((p) => (
                      <Row key={p.username} p={p}>
                        <button className={linkBtn} onClick={() => act("cancel", p.username)}>
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
                <p className="border-t border-foreground/15 pt-6 text-sm font-light text-foreground/55">{c.noFriends}</p>
              ) : (
                <div className="divide-y divide-foreground/15 border-y border-foreground/15">
                  {friends.map((p) => (
                    <Row key={p.username} p={p}>
                      <button className={linkBtn} onClick={() => act("remove", p.username)}>
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
      <section className="mt-16 border-t border-foreground/15 pt-12">
        <h2 className="font-dior text-2xl font-bold tracking-tight sm:text-3xl">{c.inbox}</h2>
        <p className="mt-2 max-w-md text-sm font-light text-foreground/60">{c.inboxIntro}</p>

        {inbox.length === 0 ? (
          <p className="mt-8 text-sm font-light text-foreground/55">{c.inboxEmpty}</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-4">
            {inbox.map((i) => (
              <div key={i.id}>
                <Link href={i.product.slug ? `/product/${i.product.slug}` : "#"} className="relative block aspect-[3/4] bg-foreground/5">
                  {i.product.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.product.image} alt={i.product.name} className="h-full w-full object-cover" />
                  )}
                  {!i.seen && (
                    <span className="absolute left-2 top-2 bg-background/85 px-2 py-0.5 text-[10px] font-light uppercase tracking-[0.18em]">
                      <span className="mr-1.5 inline-block h-1 w-1 rounded-full align-middle" style={{ background: accent }} />
                      {c.newTag}
                    </span>
                  )}
                </Link>
                <p className="mt-3 truncate text-[11px] font-light uppercase tracking-[0.16em]">{i.product.name}</p>
                {i.from && (
                  <Link href={`/u/${i.from.username}`} className="mt-1 block truncate text-xs font-light text-foreground/55">
                    {c.from} {nameOf(i.from)}
                  </Link>
                )}
                {i.message && <p className="mt-2 text-sm font-light">« {i.message} »</p>}
                <div className="mt-3 flex gap-0.5">
                  {REACTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => react(i, r)}
                      className={`flex h-8 w-8 items-center justify-center text-base transition ${
                        i.reaction === r ? "bg-foreground/10" : "opacity-40 hover:opacity-100"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
