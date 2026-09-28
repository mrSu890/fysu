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
import ThemeToggle from "@/components/ThemeToggle";
import { useTranslations } from "next-intl";

// Image d'en-tête de la page compte (à déposer dans public/images/)
const PROFILE_HERO_SRC = "/images/profile-hero.jpeg";

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [loggingOut, setLoggingOut] = useState(false);
  const [heroFailed, setHeroFailed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/signin");
      router.refresh();
    }
  }, [loading, user, router]);

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

  if (loading) {
    return (
      <div className="w-screen h-[90vh] flex items-center justify-center">
        <h1 className="text-gray-500 text-4xl text-center">FYSU</h1>
      </div>
    );
  }

  if (!user) {
    return null;
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
          <div className="pb-8 pl-6 sm:pb-16 sm:pl-16">
            <h1 className="text-white font-dior font-bold text-4xl sm:text-6xl tracking-tight">
              {t("hello", {
                name: user.user_metadata?.name ?? t("fallbackName"),
              })}
            </h1>
          </div>
        </div>
      </div>

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

      <div className="relative top-36">
        <ThemeToggle />
      </div>
      <Footer />
    </>
  );
}
