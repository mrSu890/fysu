"use client";

import { ProductType } from "@/types/product";
import { useCart, type CartColor } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import ExpressPay from "@/components/ExpressPay";
import { useTranslations } from "next-intl";

type Props = {
  product: ProductType;
  selectedSizeId: string | null;
  selectedSizeLabel: string | null;
  // "available" = « Ajouter au panier », "preorder" = « Précommander »
  mode?: "available" | "preorder";
  // couleur choisie (null si le produit n'a qu'une couleur)
  color?: CartColor | null;
  className?: string;
};

export default function AddToCartButton({
  product,
  selectedSizeId,
  selectedSizeLabel,
  mode = "preorder",
  color = null,
  className,
}: Props) {
  const t = useTranslations("Product");
  const { addToCartWithFeedback, justAdded, setIsCartOpen } = useCart();

  // clé unique produit + taille
  const key = selectedSizeId ? `${product.id}-${selectedSizeId}` : `${product.id}`;
  const isAdded = !!justAdded[key];

  return (
    <div className={`w-full space-y-3 ${className || ""}`}>
      {/* Apple Pay / Google Pay : vrai bouton Stripe, paiement direct depuis la fiche */}
      <ExpressPay product={product} selectedSizeId={selectedSizeId} />

      {/* Bouton d'achat : « Ajouter au panier » ou « Précommander » selon le mode */}
      <motion.button
        type="button"
        disabled={isAdded}
        onClick={() => {
          if (!selectedSizeId || !selectedSizeLabel) {
            alert(t("selectSize"));
            return;
          }

          addToCartWithFeedback(product, selectedSizeId, selectedSizeLabel, 1500, color);
          setIsCartOpen(true);
        }}
        data-no-green
        className={`
          w-full
          bg-[#4eac6c]
          px-4
          py-4
          text-left
          text-base
          font-bold
          text-black
          transition-[filter] duration-300
          hover:brightness-95
          disabled:cursor-not-allowed
          cursor-pointer
          relative
          overflow-hidden
        `}
      >
        <div className="relative flex items-center justify-between gap-3">
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
          <span className="shrink-0">€{Number(product.price).toFixed(2).replace(".", ",")}</span>
        </div>
      </motion.button>
    </div>
  );
}
