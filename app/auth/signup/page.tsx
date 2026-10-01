"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthShell, AuthInput, PrimaryButton, Divider, GoogleButton } from "@/components/ui/AuthShell";

export default function SignupPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Créer le profile métier
    if (data.user) {
      await supabaseClient.from("profiles").insert({
        id: data.user.id,
        name: email.split("@")[0],
      });
    }

    router.push("/");
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

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
    <AuthShell title={t("signupTitle")} subtitle={t("signupSubtitle")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSignup();
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
          autoComplete="new-password"
          placeholder={t("password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="px-2 text-center text-sm text-red-500">{error}</p>}

        <div className="pt-2">
          <PrimaryButton type="submit" loading={loading}>
            {loading ? t("creating") : t("createAccount")}
          </PrimaryButton>
        </div>
      </form>

      <Divider label={t("or")} />

      <GoogleButton label={t("continueGoogle")} onClick={handleGoogleLogin} />

      <p className="mt-6 text-center text-xs opacity-60">{t("terms")}</p>

      <p className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
        <span className="opacity-60">{t("alreadyAccount")}</span>
        <Link href="/auth/signin" className="underline underline-offset-4">
          {t("signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
