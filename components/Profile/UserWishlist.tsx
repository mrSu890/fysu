"use client";

import { useEffect, useState } from "react";
import Product from "../Product";
import { useTranslations } from "next-intl";

/* Favoris : la liste de souhaits (la garde-robe, ce sont les pièces déjà achetées). */
export default function Wishlist() {
  const t = useTranslations("Profile");
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/wishlist");
        const json = await res.json();

        if (!res.ok) {
          console.error("Erreur wishlist:", json?.error);
          setWishlist([]);
          return;
        }

        const items = Array.isArray(json?.wishlist) ? json.wishlist : [];
        setWishlist(items);
      } catch (e) {
        console.error("Erreur loadWishlist:", e);
        setWishlist([]);
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, []);

  if (loading) {
    return <p className="text-sm font-light text-foreground/55">{t("loading")}</p>;
  }
  if (wishlist.length === 0) {
    return <p className="border-t border-foreground/15 pt-6 text-sm font-light text-foreground/55">{t("noProducts")}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
      {wishlist.map((w, idx) => (
        <Product key={w?.product_id ?? idx} product={w.products} />
      ))}
    </div>
  );
}
