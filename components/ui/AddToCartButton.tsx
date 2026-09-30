"use client";

import { ProductType } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  product: ProductType;
  selectedSizeId: string | null;
  selectedSizeLabel: string | null;
  // "available" = « Ajouter au panier », "preorder" = « Précommander »
  mode?: "available" | "preorder";
  className?: string;
};

export default function AddToCartButton({
  product,
  selectedSizeId,
  selectedSizeLabel,
  mode = "preorder",
  className,
}: Props) {
  const t = useTranslations("Product");
  const { addToCartWithFeedback, justAdded, setIsCartOpen } = useCart();
  const [applePayOpen, setApplePayOpen] = useState(false);

  // clé unique produit + taille
  const key = selectedSizeId ? `${product.id}-${selectedSizeId}` : `${product.id}`;
  const isAdded = !!justAdded[key];

  return (
    <div className={`w-full space-y-3 ${className || ""}`}>
      {/* Apple Pay button */}
      <button
        type="button"
        onClick={() => setApplePayOpen(true)}
        className="
          w-full
          bg-white border
          text-black
          py-3
          text-md
          font-semibold
          tracking-wide
          transition-colors duration-300
          hover:bg-neutral-200 cursor-pointer
          rounded-none
          flex items-center justify-center
        "
        aria-label="Apple Pay"
      >
        <span className="flex items-center gap-1">
          <span className="text-base leading-none"></span>
          <span>Pay</span>
        </span>
      </button>

      {/* Popup */}
      <AnimatePresence>
        {applePayOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => setApplePayOpen(false)}
              aria-label={t("closeApplePay")}
            />

            {/* Modal */}
            <motion.div
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              initial={{ y: 16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <button
                type="button"
                onClick={() => setApplePayOpen(false)}
                className="absolute right-4 top-4 rounded-full p-2 hover:bg-neutral-100"
                aria-label={t("closeApplePay")}
              >
                <X size={18} />
              </button>

              <h3 className="text-lg font-semibold mb-2">Apple Pay</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {t("applePayInfo")}
              </p>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setApplePayOpen(false)}
                  className="px-4 py-2 text-sm rounded-full border border-neutral-300 hover:bg-neutral-50"
                >
                  {t("gotIt")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bouton d'achat : « Ajouter au panier » ou « Précommander » selon le mode */}
      <motion.button
        type="button"
        disabled={isAdded}
        onClick={() => {
          if (!selectedSizeId || !selectedSizeLabel) {
            alert(t("selectSize"));
            return;
          }

          addToCartWithFeedback(product, selectedSizeId, selectedSizeLabel, 1500);
          setIsCartOpen(true);
        }}
        className={`
          w-full
          bg-black
          text-white
          py-3
          text-sm
          font-medium
          tracking-wide
          transition-colors duration-300
          hover:bg-neutral-800
          disabled:cursor-not-allowed
          cursor-pointer
          disabled:bg-black
          relative
          overflow-hidden
        `}
      >
        <div className="relative flex items-center justify-center gap-2">
          <AnimatePresence mode="wait">
            {isAdded ? (
              <motion.div
                key="added"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2"
              >
                <Check size={16} />
                <span>{t("addedToBasket")}</span>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
              >
                {mode === "available" ? t("addToCart") : t("preorder")}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button>
    </div>
  );
}
