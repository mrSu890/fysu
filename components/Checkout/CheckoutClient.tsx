"use client";

import { useCart } from "@/context/CartContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const LINE = "color-mix(in srgb, var(--foreground) 14%, transparent)";
const CARD = "color-mix(in srgb, var(--foreground) 5%, var(--background))";

export default function CheckoutClient() {
  const t = useTranslations("Checkout");
  const { cart } = useCart();
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  if (userLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <video
          src="/videos/fysu_loader.mov"
          autoPlay
          loop
          muted
          playsInline
          className="w-[70vw] max-w-[520px] h-auto object-contain"
        />
      </div>
    );
  }

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

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="mt-6 w-full cursor-pointer touch-manipulation rounded-full py-4 text-xs font-medium uppercase tracking-[0.2em] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "var(--foreground)", color: "var(--background)" }}
          >
            {loading
              ? t("redirecting")
              : user
              ? t("pay")
              : t("signInToPay")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
