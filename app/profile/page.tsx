"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UserOders from "@/components/Profile/UserOrders";
import UserWishlist from "@/components/Profile/UserWishlist";
import PageBar from "@/components/PageBar";
import { useTranslations } from "next-intl";

// Image d'en-tête de la page compte (à déposer dans public/images/)
const PROFILE_HERO_SRC = "/images/profile-hero.jpeg";

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const tn = useTranslations("Navigation");
  const router = useRouter();
  const { user: hookUser, loading } = useCurrentUser();
  // si la lecture rapide de la session n'a rien donné, on demande directement au serveur qui est connecté
  const [verifiedUser, setVerifiedUser] = useState<any>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const user = hookUser ?? verifiedUser;
  const [loggingOut, setLoggingOut] = useState(false);
  const [heroFailed, setHeroFailed] = useState(false);

  // Si la session n'est pas lue assez vite côté navigateur, on ne renvoie PAS tout de suite vers la connexion
  // (le site te renverrait alors à l'accueil parce que tu es en fait connecté) : on demande au serveur.
  useEffect(() => {
    if (loading || hookUser || verifiedUser) return;
    let cancelled = false;
    fetch("/api/auth/callback?me=1", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setVerifiedUser(data.user);
            return;
          }
        }
        if (res.status === 401) {
          router.replace("/auth/signin");
          router.refresh();
        } else {
          setCheckFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setCheckFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, hookUser, verifiedUser, router]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        return;
      }

      router.replace("/auth/signin");
      router.refresh();

      setTimeout(() => {
        window.location.href = "/auth/signin";
      }, 150);
    } catch (err) {
      console.error("Unexpected logout error:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading || !user) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center">
          {checkFailed && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full border border-current px-5 py-2 text-sm"
            >
              Réessayer
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

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

        {/* Overlay léger pour lisibilité */}
        <div className="absolute inset-0 bg-black/20" />

        {/* TITLE */}
        <div className="absolute inset-0 flex items-end">
          <div className="pb-4 pl-4 pr-4 sm:pb-10 sm:pl-10 sm:pr-10">
            <h1 className="text-white font-dior font-bold text-3xl sm:text-5xl tracking-tight leading-none">
              {t("hello", {
                name: user.user_metadata?.name ?? t("fallbackName"),
              })}
            </h1>
          </div>
        </div>
      </div>

      {/* BANDE BLANCHE : chemin / interrupteur */}
      <PageBar trail={[{ label: tn("myFysu") }]} />

      {/* DÉCONNEXION */}
      <div className="w-11/12 max-w-7xl mx-auto flex justify-end pt-4">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-fit text-foreground/40 rounded cursor-pointer underline underline-offset-1 disabled:opacity-50"
        >
          {loggingOut ? t("signingOut") : t("signOut")}
        </button>
      </div>

      {/* Les blocs ci-dessous ont un décalage interne : on le compense */}
      <div className="relative -top-28">
        <UserWishlist />
        <UserOders />
      </div>

      <Footer />
    </>
  );
}
