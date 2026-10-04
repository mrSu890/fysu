"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { Pencil } from "lucide-react"
import PageBar from "@/components/PageBar"
import { DEFAULT_ACCENT, type ProfileData } from "@/lib/profile"
import Avatar from "./Avatar"
import Badges, { type Reward } from "./Badges"
import Closet from "./Closet"
import ProfileEditor, { type GalleryAvatar } from "./ProfileEditor"
import { profileCopy } from "./profileCopy"

// Image d'en-tête de la page compte (à déposer dans public/images/)
const PROFILE_HERO_SRC = "/images/profile-hero.jpeg"
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
  const [heroFailed, setHeroFailed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [welcome, setWelcome] = useState(false)
  const [rewards, setRewards] = useState<Reward[]>([])

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

  return (
    <>
      {/* HERO */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[8/5] overflow-hidden bg-neutral-300 dark:bg-neutral-800">
        {!heroFailed && (
          <Image
            src={PROFILE_HERO_SRC}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            onError={() => setHeroFailed(true)}
          />
        )}
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: accent }} />

        <div className="absolute inset-0 flex items-end">
          <div className="flex items-end gap-4 pb-5 pl-4 pr-4 sm:gap-6 sm:pb-10 sm:pl-10 sm:pr-10">
            <Avatar url={profile?.avatar_url ?? null} name={name} accent={accent} size={96} />
            <div className="min-w-0 pb-1 text-white">
              <h1 className="font-dior font-bold text-3xl sm:text-5xl tracking-tight leading-none">
                {t("hello", { name })}
              </h1>
              {profile?.username && <p className="mt-1.5 text-sm text-white/80 sm:text-base">@{profile.username}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* BANDE BLANCHE : chemin / interrupteur */}
      <PageBar trail={[{ label: tn("myFysu") }]} />

      {/* CARTE PROFIL */}
      <section className="mx-auto w-11/12 max-w-7xl pt-6">
        <div className="flex flex-col gap-5 rounded-3xl border border-foreground/15 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="text-foreground/80">
              {profile?.bio ? profile.bio : <span className="text-foreground/50">{copy.noBio}</span>}
            </p>
            {since && (
              <p className="mt-1 text-xs uppercase tracking-wider text-foreground/45">
                {copy.memberSince} {since}
              </p>
            )}
            <div className="mt-4 flex gap-6">
              {[
                [data?.stats.orders ?? 0, copy.stats.orders],
                [data?.stats.pieces ?? 0, copy.stats.pieces],
                [data?.stats.wishlist ?? 0, copy.stats.favorites],
              ].map(([n, label]) => (
                <div key={String(label)}>
                  <p className="font-dior text-2xl leading-none" style={{ color: accent }}>
                    {n}
                  </p>
                  <p className="mt-1 text-xs text-foreground/55">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={!data}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
            style={{ background: accent }}
          >
            <Pencil className="h-4 w-4" /> {copy.editProfile}
          </button>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="w-fit text-foreground/40 rounded cursor-pointer underline underline-offset-1 disabled:opacity-50"
          >
            {loggingOut ? t("signingOut") : t("signOut")}
          </button>
        </div>
      </section>

      {data && (
        <>
          <Closet copy={copy} accent={accent} />
          <Badges
            earned={data.earned}
            rewards={rewards}
            stats={data.stats}
            copy={copy}
            locale={locale}
            accent={accent}
            onRewards={setRewards}
          />
        </>
      )}

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
