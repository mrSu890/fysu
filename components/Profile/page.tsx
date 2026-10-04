"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProfileHub from "@/components/Profile/ProfileHub";

export default function ProfilePage() {
  const router = useRouter();
  const { user: hookUser, loading } = useCurrentUser();
  // si la lecture rapide de la session n'a rien donné, on demande directement au serveur qui est connecté
  const [verifiedUser, setVerifiedUser] = useState<any>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const user = hookUser ?? verifiedUser;
  const [loggingOut, setLoggingOut] = useState(false);

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

      <ProfileHub user={user} onLogout={handleLogout} loggingOut={loggingOut} />

      <Footer />
    </>
  );
}
