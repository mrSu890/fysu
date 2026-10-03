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
