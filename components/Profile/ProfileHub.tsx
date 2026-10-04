"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { DEFAULT_ACCENT, type ProfileData } from "@/lib/profile"
import Avatar from "./Avatar"
import Badges, { type Reward } from "./Badges"
import Closet from "./Closet"
import UserWishlist from "./UserWishlist"
import UserOrders from "./UserOrders"
import Social from "@/components/Profile/Social"
import ProfileEditor, { type GalleryAvatar } from "./ProfileEditor"
import { profileCopy } from "./profileCopy"

type TabId = "wardrobe" | "favorites" | "orders" | "friends" | "badges"
const TABS: Record<"fr" | "en", Record<TabId, string>> = {
  fr: { wardrobe: "Garde-robe", favorites: "Favoris", orders: "Commandes", friends: "Amis", badges: "Badges" },
  en: { wardrobe: "Wardrobe", favorites: "Favorites", orders: "Orders", friends: "Friends", badges: "Badges" },
}
const TAB_ORDER: TabId[] = ["wardrobe", "favorites", "orders", "friends", "badges"]

const ONBOARD_KEY = "fysu_profile_onboarding_seen"

type Payload = {
  profile: ProfileData
  avatars: GalleryAvatar[]
  stats: { orders: number; pieces: number; wishlist: number; birdBest: number }
  earned: string[]
  rewards: Reward[]
}

export default function ProfileHub({
  user,
  onLogout,
  loggingOut,
}: {
  user: any
  onLogout: () => void
  loggingOut: boolean
}) {
  const t = useTranslations("Profile")
  const tn = useTranslations("Navigation")
  const locale = useLocale()
  const copy = profileCopy(locale)

  const [data, setData] = useState<Payload | null>(null)
  const [tab, setTab] = useState<TabId>("wardrobe")
  const [editing, setEditing] = useState(false)
  const [welcome, setWelcome] = useState(false)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [linkCopied, setLinkCopied] = useState(false)

  async function copyLink(username: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${username}`)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1800)
    } catch {}
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/profile", { cache: "no-store" })
      if (!res.ok) return
      const json: Payload = await res.json()
      setData(json)
      setRewards(json.rewards ?? [])
      return json
    } catch {}
  }, [])

  useEffect(() => {
    load().then((json) => {
      if (!json || json.profile.username) return
      let seen = false
      try {
        seen = !!localStorage.getItem(ONBOARD_KEY)
      } catch {}
      if (!seen) {
        setWelcome(true)
        setEditing(true)
      }
    })
  }, [load])

  function closeEditor() {
    setEditing(false)
    if (welcome) {
      try {
        localStorage.setItem(ONBOARD_KEY, "1")
      } catch {}
      setWelcome(false)
    }
  }

  const profile = data?.profile
  const accent = profile?.accent ?? DEFAULT_ACCENT
  const name = profile?.display_name || user.user_metadata?.name || t("fallbackName")
  const since = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(locale, { month: "long", year: "numeric" })
    : null
  const labels = TABS[locale === "fr" ? "fr" : "en"]
  const link = "text-[11px] font-light uppercase tracking-[0.18em] underline-offset-[6px] hover:underline disabled:opacity-40"

  return (
    <>
      <main className="mx-auto w-11/12 max-w-6xl pb-24 pt-32 sm:pt-44">
        {/* EN-TÊTE */}
        <p className="text-[11px] font-light uppercase tracking-[0.22em] text-foreground/50">( {tn("myFysu")} )</p>

        <div className="mt-8 flex items-center gap-5 sm:gap-8">
          <Avatar url={profile?.avatar_url ?? null} name={name} accent={accent} size={72} thin />
          <div className="min-w-0">
            <h1 className="break-words font-dior text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl">{name}</h1>
            {profile?.username && (
              <p className="mt-2 text-sm font-light text-foreground/55">
                @{profile.username}
                {since && <span> · {copy.memberSince} {since}</span>}
              </p>
            )}
          </div>
        </div>

        {profile?.bio && <p className="mt-8 max-w-md text-sm font-light leading-relaxed text-foreground/70">{profile.bio}</p>}

        {/* CHIFFRES */}
        <div className="mt-10 grid grid-cols-3 border-y border-foreground/15 sm:max-w-md">
          {[
            [data?.stats.orders ?? 0, copy.stats.orders],
            [data?.stats.pieces ?? 0, copy.stats.pieces],
            [data?.stats.wishlist ?? 0, copy.stats.favorites],
          ].map(([n, label], i) => (
            <div key={String(label)} className={`py-5 ${i > 0 ? "border-l border-foreground/15 pl-5" : ""}`}>
              <p className="text-3xl font-light leading-none tabular-nums">{n}</p>
              <p className="mt-2 text-[10px] font-light uppercase tracking-[0.18em] text-foreground/55">{label}</p>
            </div>
          ))}
        </div>

        {/* ACTIONS */}
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          <button type="button" onClick={() => setEditing(true)} disabled={!data} className={link}>
            {copy.editProfile}
          </button>
          {profile?.username && (
            <button type="button" onClick={() => copyLink(profile.username!)} className={link}>
              {linkCopied ? copy.linkCopied : copy.copyLink}
            </button>
          )}
          <button type="button" onClick={onLogout} disabled={loggingOut} className={link + " text-foreground/45"}>
            {loggingOut ? t("signingOut") : t("signOut")}
          </button>
        </div>

        {/* ONGLETS */}
        <nav className="mt-16 flex gap-8 overflow-x-auto border-b border-foreground/15 sm:gap-12">
          {TAB_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`-mb-px shrink-0 border-b py-4 text-[11px] uppercase tracking-[0.2em] transition ${
                tab === id ? "border-foreground font-normal" : "border-transparent font-light text-foreground/50 hover:text-foreground"
              }`}
            >
              {labels[id]}
            </button>
          ))}
        </nav>

        <div className="pt-10">
          {tab === "wardrobe" && <Closet copy={copy} />}
          {tab === "favorites" && <UserWishlist />}
          {tab === "orders" && <UserOrders />}
          {tab === "friends" && data && <Social accent={accent} locale={locale} hasUsername={!!profile?.username} />}
          {tab === "badges" && data && (
            <Badges
              earned={data.earned}
              rewards={rewards}
              stats={data.stats}
              copy={copy}
              locale={locale}
              accent={accent}
              onRewards={setRewards}
            />
          )}
        </div>
      </main>

      {editing && data && (
        <ProfileEditor
          profile={data.profile}
          avatars={data.avatars}
          copy={copy}
          welcome={welcome}
          fallbackName={name}
          onClose={closeEditor}
          onSaved={async () => {
            await load()
            closeEditor()
          }}
        />
      )}
    </>
  )
}
