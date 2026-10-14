"use client";

import { useEffect, useState } from "react";
import { captureNext, clearNext, getNext, stashNextForOAuth } from "@/lib/authNext";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthShell, AuthInput, PrimaryButton, Divider, GoogleButton } from "@/components/ui/AuthShell";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // on retient la page d'où on vient pour y revenir après la connexion
  useEffect(() => {
    captureNext();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const target = getNext();
    clearNext();
    router.push(target);
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    stashNextForOAuth();

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("signinTitle")} subtitle={t("signinSubtitle")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
        className="space-y-3"
      >
        <AuthInput
          type="email"
          autoComplete="email"
          placeholder={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthInput
          type="password"
          autoComplete="current-password"
          placeholder={t("password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="px-2 text-center text-sm text-red-500">{error}</p>}

        <div className="pt-2">
          <PrimaryButton type="submit" loading={loading}>
            {loading ? t("signingIn") : t("signIn")}
          </PrimaryButton>
        </div>
      </form>

      <Divider label={t("or")} />

      <GoogleButton label={t("continueGoogle")} onClick={handleGoogleLogin} />

      <p className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
        <span className="opacity-60">{t("noAccount")}</span>
        <Link href="/auth/signup" className="underline underline-offset-4">
          {t("createAccount")}
        </Link>
      </p>
    </AuthShell>
  );
}
