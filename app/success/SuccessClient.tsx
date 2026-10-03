"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

const LINE = "color-mix(in srgb, var(--foreground) 14%, transparent)";
const CARD = "color-mix(in srgb, var(--foreground) 5%, var(--background))";

export default function SuccessClient() {
  const t = useTranslations("Success");
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  // paiement Apple Pay / Google Pay depuis la fiche produit
  const paymentIntentId = searchParams.get("payment_intent");

  const { clearCart } = useCart();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId && !paymentIntentId) {
      setSession(null);
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const res = await fetch("/api/checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paymentIntentId ? { paymentIntentId } : { sessionId }),
        });

        const data = await res.json();

        if (!res.ok) {
          setSession(null);
          return;
        }

        setSession(data.session ?? null);
        clearCart();
      } catch {
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, paymentIntentId, clearCart]);

  if (loading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center text-sm tracking-wide opacity-60">
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
        >
          {t("checking")}
        </motion.span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center px-6 text-center text-sm opacity-70">
        {t("notFound")}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-[100svh] items-center justify-center px-5 pb-24 pt-32"
    >
      <div className="w-full max-w-xl text-center">
        {/* Coche */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.15 }}
          className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          <Check size={28} strokeWidth={2} />
        </motion.div>

        <h1 className="mb-10 text-3xl font-medium tracking-tight sm:text-4xl">
          {t("confirmed")}
        </h1>

        {/* Récapitulatif */}
        <div
          className="rounded-[28px] p-7 text-left sm:p-8"
          style={{ background: CARD, border: `1px solid ${LINE}` }}
        >
          <div className="space-y-4">
            {session.line_items?.data?.map((item: any) => (
              <div key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0 opacity-80">
                  {item.description} × {item.quantity}
                </span>
                <span className="shrink-0 font-medium">
                  €{(item.amount_total / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div
            className="mt-6 flex justify-between pt-6 text-sm font-medium"
            style={{ borderTop: `1px solid ${LINE}` }}
          >
            <span>{t("paidTotal")}</span>
            <span>€{(session.amount_total / 100).toFixed(2)}</span>
          </div>
        </div>

        <Link
          href="/"
          className="mt-10 inline-block rounded-full px-8 py-3.5 text-xs font-medium uppercase tracking-[0.2em] transition active:scale-[0.98]"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          {t("continueShopping")}
        </Link>
      </div>
    </motion.div>
  );
}
