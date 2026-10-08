"use client";

import { useCart } from "@/context/CartContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import HelpLink from "@/components/HelpLink";

type Applied = { code: string; freeShipping: boolean; discountLabel: string };

// textes du champ « code promo » (les autres langues affichent l'anglais)
const PROMO_COPY = {
  en: {
    label: "Promo code",
    placeholder: "Enter a code",
    apply: "Apply",
    checking: "…",
    invalid: "This code is not valid.",
    signIn: "Sign in to use a promo code.",
    freeDelivery: "Free delivery",
    remove: "Remove",
  },
  fr: {
    label: "Code promo",
    placeholder: "Saisis un code",
    apply: "Appliquer",
    checking: "…",
    invalid: "Ce code n'est pas valide.",
    signIn: "Connecte-toi pour utiliser un code promo.",
    freeDelivery: "Livraison offerte",
    remove: "Retirer",
  },
};

const LINE = "color-mix(in srgb, var(--foreground) 14%, transparent)";
const CARD = "color-mix(in srgb, var(--foreground) 5%, var(--background))";

export default function CheckoutClient() {
  const t = useTranslations("Checkout");
  const locale = useLocale();
  const pc = locale === "fr" ? PROMO_COPY.fr : PROMO_COPY.en;
  const { cart } = useCart();
  const { user: hookUser, loading: hookLoading } = useCurrentUser();
  const router = useRouter();

  // Si le navigateur n'a pas lu la session à temps, on demande au serveur qui est connecté
  // (sinon le bouton affichait « Se connecter pour payer » alors que tu es déjà connecté).
  const [serverUser, setServerUser] = useState<any>(null);
  const [serverChecked, setServerChecked] = useState(false);
  useEffect(() => {
    if (hookLoading || hookUser) return;
    let cancelled = false;
    fetch("/api/auth/callback?me=1", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.user) setServerUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setServerChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hookLoading, hookUser]);

  const user = hookUser ?? serverUser;
  const userLoading = hookLoading || (!hookUser && !serverChecked);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // code promo
  const [promoInput, setPromoInput] = useState("");
  const [applied, setApplied] = useState<Applied | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const applyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim();
    if (!code) return;
    if (!user) {
      setPromoError(pc.signIn);
      return;
    }
    setPromoLoading(true);
    setPromoError("");
    try {
      const res = await fetch("/api/checkout?promo=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setPromoError(data?.reason === "auth" ? pc.signIn : pc.invalid);
        return;
      }
      setApplied({ code: data.code, freeShipping: !!data.freeShipping, discountLabel: data.discountLabel || "" });
      setPromoInput("");
    } catch {
      setPromoError(pc.invalid);
    } finally {
      setPromoLoading(false);
    }
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (!user) {
      router.push("/auth/signin");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart,
          promoCode: applied?.code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || t("genericError"));
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(t("missingUrl"));
      }
    } catch (err: any) {
      setError(err.message || t("genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mx-auto w-11/12 max-w-6xl pb-32 pt-32 sm:pt-40"
    >
      <h1 className="mb-8 text-2xl font-medium tracking-tight sm:text-3xl">
        {t("summary")}
      </h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        {/* ARTICLES */}
        <ul className="overflow-hidden rounded-[28px]" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          {cart.map((item, index) => (
            <li
              key={`${item.id}-${item.selectedSizeId}`}
              className="flex items-center gap-4 p-4 sm:p-5"
              style={index > 0 ? { borderTop: `1px solid ${LINE}` } : undefined}
            >
              <div className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-2xl bg-neutral-200/60">
                <Image
                  src={item.selectedImageUrl ?? item.product_images?.[0]?.url ?? "/placeholder.png"}
                  alt={item.name}
                  fill
                  sizes="72px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium uppercase tracking-wide">{item.name}</p>

                <p className="mt-1.5 text-xs opacity-60">
                  {t("size")} : {item.selectedSizeLabel}
                  {item.selectedColorName ? ` · ${item.selectedColorName}` : ""}
                </p>

                <p className="mt-1 text-xs opacity-60">
                  {t("quantity")} : {item.quantity}
                </p>
              </div>

              <span className="shrink-0 text-sm font-medium">
                €{(item.price * item.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        {/* TOTAL + PAIEMENT */}
        <div
          className="rounded-[28px] p-6 sm:p-7 lg:sticky lg:top-28"
          style={{ background: CARD, border: `1px solid ${LINE}` }}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-[0.25em] opacity-70">{t("total")}</span>
            <span className="text-2xl font-medium">€{total.toFixed(2)}</span>
          </div>

          {/* code promo */}
          <div className="mt-5">
            {applied ? (
              <div
                className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs"
                style={{ border: `1px solid ${LINE}` }}
              >
                <span className="min-w-0">
                  <span className="font-medium uppercase tracking-wide">{applied.code}</span>
                  <span className="opacity-70">
                    {[applied.discountLabel, applied.freeShipping ? pc.freeDelivery : ""]
                      .filter(Boolean)
                      .map((p) => ` · ${p}`)
                      .join("")}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setApplied(null)}
                  className="shrink-0 cursor-pointer underline underline-offset-4 opacity-70 hover:opacity-100"
                >
                  {pc.remove}
                </button>
              </div>
            ) : (
              <form onSubmit={applyPromo} className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder={pc.placeholder}
                  aria-label={pc.label}
                  maxLength={30}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-11 min-w-0 flex-1 rounded-full bg-transparent px-4 text-sm uppercase outline-none placeholder:normal-case placeholder:opacity-50"
                  style={{ border: `1px solid ${LINE}` }}
                />
                <button
                  type="submit"
                  disabled={promoLoading || !promoInput.trim()}
                  className="h-11 shrink-0 cursor-pointer rounded-full px-5 text-[11px] font-medium uppercase tracking-[0.18em] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ border: `1px solid ${LINE}` }}
                >
                  {promoLoading ? pc.checking : pc.apply}
                </button>
              </form>
            )}
            {promoError && <p className="mt-2 text-xs text-red-500">{promoError}</p>}
          </div>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          <button
            onClick={handleCheckout}
            disabled={loading || userLoading || cart.length === 0}
            className="mt-6 w-full cursor-pointer touch-manipulation rounded-full py-4 text-xs font-medium uppercase tracking-[0.2em] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "var(--foreground)", color: "var(--background)" }}
          >
            {loading
              ? t("redirecting")
              : user || userLoading
              ? t("pay")
              : t("signInToPay")}
          </button>
          <div className="mt-5 text-center">
            <HelpLink />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
