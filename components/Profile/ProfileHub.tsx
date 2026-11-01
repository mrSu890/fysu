"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Award, Check, Heart, Link2, LogOut, Package, Pencil, Shirt, Store, User, Users } from "lucide-react"
import { DEFAULT_ACCENT, type ProfileData } from "@/lib/profile"
import Avatar from "./Avatar"
import Badges, { type Reward } from "./Badges"
import Closet from "./Closet"
import UserWishlist from "./UserWishlist"
import UserOrders from "./UserOrders"
import Social from "@/components/Profile/Social"
import AvatarStudio from "./AvatarStudio"
import ProfileEditor, { type GalleryAvatar } from "./ProfileEditor"
import { profileCopy } from "./profileCopy"
import CountUp from "@/components/CountUp"

const BoutiqueScene = dynamic(() => import("@/components/Rpg/BoutiqueScene"), { ssr: false })

type TabId = "wardrobe" | "avatar" | "boutique" | "favorites" | "orders" | "friends" | "badges"
const TABS: Record<"fr" | "en", Record<TabId, string>> = {
  fr: { wardrobe: "Garde-robe", avatar: "Avatar", boutique: "Boutique", favorites: "Favoris", orders: "Commandes", friends: "Amis", badges: "Badges" },
  en: { wardrobe: "Wardrobe", avatar: "Avatar", boutique: "Boutique", favorites: "Favorites", orders: "Orders", friends: "Friends", badges: "Badges" },
}
const TAB_ORDER: TabId[] = ["wardrobe", "avatar", "boutique", "favorites", "orders", "friends", "badges"]
// un onglet = une icône (le nom apparaît à côté de l'icône de l'onglet ouvert)
const TAB_ICON: Record<TabId, typeof Shirt> = { wardrobe: Shirt, avatar: User, boutique: Store, favorites: Heart, orders: Package, friends: Users, badges: Award }
const STAT_ICON = [Package, Shirt, Heart]

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
  const iconBtn = "flex h-11 w-11 cursor-pointer touch-manipulation items-center justify-center rounded-full border border-foreground/25 transition active:scale-95 hover:border-foreground/60 disabled:opacity-40"

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
          ].map(([n, label], i) => {
            const Icon = STAT_ICON[i]
            return (
              <div key={String(label)} className={`py-5 ${i > 0 ? "border-l border-foreground/15 pl-5" : ""}`} title={String(label)}>
                <p className="text-3xl font-light leading-none"><CountUp value={Number(n)} opacity={1} /></p>
                <Icon className="mt-3 h-4 w-4 text-foreground/55" strokeWidth={1.3} aria-hidden="true" />
                <span className="sr-only">{label}</span>
              </div>
            )
          })}
        </div>

        {/* ACTIONS : trois icônes (le nom s'affiche en touchant longuement / au survol) */}
        <div className="mt-6 flex items-center gap-3">
          <button type="button" onClick={() => setEditing(true)} disabled={!data} className={iconBtn} aria-label={copy.editProfile} title={copy.editProfile}>
            <Pencil className="h-[18px] w-[18px]" strokeWidth={1.3} />
          </button>
          {profile?.username && (
            <button
              type="button"
              onClick={() => copyLink(profile.username!)}
              className={iconBtn}
              aria-label={linkCopied ? copy.linkCopied : copy.copyLink}
              title={linkCopied ? copy.linkCopied : copy.copyLink}
            >
              {linkCopied ? <Check className="h-[18px] w-[18px]" strokeWidth={1.3} /> : <Link2 className="h-[18px] w-[18px]" strokeWidth={1.3} />}
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className={iconBtn + " text-foreground/55"}
            aria-label={loggingOut ? t("signingOut") : t("signOut")}
            title={loggingOut ? t("signingOut") : t("signOut")}
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.3} />
          </button>
        </div>

        {/* ONGLETS : des icônes ; l'onglet ouvert affiche aussi son nom */}
        <nav className="no-scrollbar mt-14 flex gap-2 overflow-x-auto border-b border-foreground/15 sm:gap-4">
          {TAB_ORDER.map((id) => {
            const Icon = TAB_ICON[id]
            const on = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-label={labels[id]}
                title={labels[id]}
                aria-current={on ? "page" : undefined}
                className={`-mb-px flex shrink-0 cursor-pointer touch-manipulation items-center gap-2.5 border-b px-3.5 py-4 transition ${
                  on ? "border-foreground" : "border-transparent text-foreground/45 hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.3} />
                {on && <span className="text-[11px] font-light uppercase tracking-[0.2em]">{labels[id]}</span>}
              </button>
            )
          })}
        </nav>

        <div className="pt-10">
          {tab === "wardrobe" && <Closet copy={copy} />}
          {tab === "avatar" && <AvatarStudio locale={locale} onPhotoUpdated={load} />}
          {tab === "boutique" && <BoutiqueScene locale={locale} />}
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
          onOpenAvatar={() => {
            closeEditor()
            setTab("avatar")
          }}
          onSaved={async () => {
            await load()
            closeEditor()
          }}
        />
      )}
    </>
  )
}
