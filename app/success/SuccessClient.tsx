"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import ReceiptPrinter from "@/components/ReceiptPrinter";
import { buildReceipt, receiptLang, type ReceiptData } from "@/lib/receipt";

export default function SuccessClient() {
  const t = useTranslations("Success");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  // paiement Apple Pay / Google Pay depuis la fiche produit
  const paymentIntentId = searchParams.get("payment_intent");

  const { clearCart } = useCart();

  const [session, setSession] = useState<any>(null);
  const [serverReceipt, setServerReceipt] = useState<ReceiptData | null>(null);
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
        setServerReceipt(data.receipt ?? null);
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

  const receipt: ReceiptData = serverReceipt ?? buildReceipt(session)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-[100svh] flex-col items-center px-5 pb-28 pt-32"
    >
      <h1 className="mb-10 text-center text-3xl font-medium tracking-tight sm:text-4xl">
        {t("confirmed")}
      </h1>

      <ReceiptPrinter
        receipt={receipt}
        lang={receiptLang(locale)}
        locale={locale}
        continueLabel={t("continueShopping")}
      />
    </motion.div>
  );
}
