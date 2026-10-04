"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useLocale } from "next-intl"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import Avatar from "@/components/Profile/Avatar"
import { socialCopy } from "@/components/Profile/socialCopy"
import { BADGES } from "@/lib/badges"
import { DEFAULT_ACCENT } from "@/lib/profile"

type Piece = { id: number; name: string; slug: string | null; image: string | null; qty?: number }
type Data = {
  profile: {
    username: string
    display_name: string | null
    bio: string | null
    avatar_url: string | null
    accent: string | null
    created_at: string | null
  }
  private: boolean
  relation: string
  earned?: string[]
  closet?: Piece[]
  wishlist?: Piece[]
}

function Grid({ items }: { items: Piece[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((p) => {
        const card = (
          <div className="group">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-foreground/10">
              {p.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              )}
              {(p.qty ?? 1) > 1 && (
                <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">×{p.qty}</span>
              )}
            </div>
            <p className="mt-2 truncate text-sm">{p.name}</p>
          </div>
        )
        return p.slug ? (
          <Link key={p.id} href={`/product/${p.slug}`}>
            {card}
          </Link>
        ) : (
          <div key={p.id}>{card}</div>
        )
      })}
    </div>
  )
}

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>()
  const username = decodeURIComponent(String(params?.username ?? "")).toLowerCase()
  const locale = useLocale()
  const c = socialCopy(locale)
  const lang = locale === "fr" ? "fr" : "en"

  const [data, setData] = useState<Data | null>(null)
  const [missing, setMissing] = useState(false)
  const [relation, setRelation] = useState("anon")

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/social?what=profile&u=${encodeURIComponent(username)}`, { cache: "no-store" })
      if (res.status === 404) {
        setMissing(true)
        return
      }
      const j: Data = await res.json()
      setData(j)
      setRelation(j.relation)
    } catch {
      setMissing(true)
    }
  }, [username])

  useEffect(() => {
    load()
  }, [load])

  async function act(action: string) {
    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, username }),
    })
    const j = await res.json().catch(() => ({}))
    if (j?.relation) setRelation(j.relation)
    if (action === "request" || action === "accept") load()
  }

  const p = data?.profile
  const accent = p?.accent ?? DEFAULT_ACCENT
  const name = p?.display_name || p?.username || ""
  const since = p?.created_at
    ? new Date(p.created_at).toLocaleDateString(locale, { month: "long", year: "numeric" })
    : null

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 sm:pt-40">
        {missing ? (
          <div className="mx-auto w-11/12 max-w-3xl py-20 text-center">
            <p className="text-lg">{c.notFound}</p>
            <Link href="/" className="mt-4 inline-block underline">
              {c.backShop}
            </Link>
          </div>
        ) : !data || !p ? (
          <div className="mx-auto w-11/12 max-w-3xl py-20 text-center text-foreground/40">…</div>
        ) : (
          <>
            <section className="mx-auto w-11/12 max-w-7xl">
              <div className="h-1.5 rounded-full" style={{ background: accent }} />
              <div className="mt-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
                <Avatar url={p.avatar_url} name={name} accent={accent} size={120} />
                <div className="min-w-0 flex-1">
                  <h1 className="font-dior text-3xl font-bold sm:text-5xl">{name}</h1>
                  <p className="mt-1 text-foreground/60">@{p.username}</p>
                  {p.bio && <p className="mt-3 max-w-xl text-foreground/80">{p.bio}</p>}
                  {since && (
                    <p className="mt-2 text-xs uppercase tracking-wider text-foreground/45">
                      {c.memberSince} {since}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {relation === "anon" && (
                    <Link href="/auth/signin" className="inline-block rounded-full border border-foreground/30 px-5 py-3 text-sm">
                      {c.loginToAdd}
                    </Link>
                  )}
                  {relation === "none" && (
                    <button
                      onClick={() => act("request")}
                      className="rounded-full px-6 py-3 text-sm font-medium text-white"
                      style={{ background: accent }}
                    >
                      {c.addFriend}
                    </button>
                  )}
                  {relation === "outgoing" && <span className="text-sm text-foreground/55">{c.requestSent}</span>}
                  {relation === "incoming" && (
                    <button
                      onClick={() => act("accept")}
                      className="rounded-full px-6 py-3 text-sm font-medium text-white"
                      style={{ background: accent }}
                    >
                      {c.acceptRequest}
                    </button>
                  )}
                  {relation === "friends" && <span className="text-sm text-foreground/55">✓ {c.friendsNow}</span>}
                  {relation === "self" && (
                    <Link href="/profile" className="inline-block rounded-full border border-foreground/30 px-5 py-3 text-sm">
                      My FYSU
                    </Link>
                  )}
                </div>
              </div>
            </section>

            {data.private ? (
              <p className="mx-auto w-11/12 max-w-7xl py-16 text-center text-foreground/55">{c.privateProfile}</p>
            ) : (
              <>
                <section className="mx-auto w-11/12 max-w-7xl py-8">
                  <h2 className="font-dior text-2xl">{c.badges}</h2>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {BADGES.filter((b) => data.earned?.includes(b.id)).map((b) => (
                      <div key={b.id} className="flex items-center gap-2 rounded-full border border-foreground/20 py-1.5 pl-2 pr-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full text-lg" style={{ background: `${accent}22` }}>
                          {b.icon}
                        </span>
                        <span className="text-sm">{b[lang].name}</span>
                      </div>
                    ))}
                    {!(data.earned?.length) && <p className="text-sm text-foreground/50">{c.empty}</p>}
                  </div>
                </section>

                <section className="mx-auto w-11/12 max-w-7xl py-8">
                  <h2 className="font-dior text-2xl">{c.closet}</h2>
                  {(data.closet?.length ?? 0) === 0 ? (
                    <p className="mt-4 text-sm text-foreground/50">{c.empty}</p>
                  ) : (
                    <Grid items={data.closet!} />
                  )}
                </section>

                <section className="mx-auto w-11/12 max-w-7xl py-8 pb-20">
                  <h2 className="font-dior text-2xl">{c.wishlist}</h2>
                  {(data.wishlist?.length ?? 0) === 0 ? (
                    <p className="mt-4 text-sm text-foreground/50">{c.empty}</p>
                  ) : (
                    <Grid items={data.wishlist!} />
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  )
}
