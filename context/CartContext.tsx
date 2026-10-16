"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { ProductType } from "@/types/product";
import { supabaseClient } from "@/lib/supabaseClient";

type CartItem = ProductType & {
  quantity: number;
  selectedSizeId: string;
  selectedSizeLabel: string;
  // couleur choisie (seulement pour les produits qui en ont plusieurs)
  selectedColorName?: string | null;
  selectedColorHex?: string | null;
  selectedImageUrl?: string | null;
};

export type CartColor = {
  name: string;
  hex: string;
  imageUrl?: string | null;
};

type CartContextType = {
  cart: CartItem[];

  addToCart: (
    product: ProductType,
    sizeId: string,
    sizeLabel: string,
    color?: CartColor | null
  ) => void;

  justAdded: Record<string, boolean>;
  addToCartWithFeedback: (
    product: ProductType,
    sizeId: string,
    sizeLabel: string,
    resetMs?: number,
    color?: CartColor | null
  ) => void;

  removeFromCart: (productId: number, sizeId: string) => void;
  increaseQuantity: (productId: number, sizeId: string) => void;
  decreaseQuantity: (productId: number, sizeId: string) => void;

  clearCart: () => void;

  isCartOpen: boolean;
  setIsCartOpen: (v: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "fysu_cart_v1";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /* -------------------- LOAD (client only) -------------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch (e) {
      console.warn("Cart load failed:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  /* -------------------- SAVE (after hydration) -------------------- */
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn("Cart save failed:", e);
    }
  }, [cart, isHydrated]);

  /* -------------------- SYNC entre appareils (utilisateur connecté) -------------------- */
  const syncReady = useRef(false);
  const loggedIn = useRef(false);

  useEffect(() => {
    if (!isHydrated) return;
    let cancelled = false;

    const pull = async () => {
      try {
        const res = await fetch("/api/cart", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items?: CartItem[] };
        const remote = Array.isArray(data.items) ? data.items : [];
        if (cancelled) return;
        loggedIn.current = true;
        // fusion : une même pièce (id + taille) garde la plus grande quantité
        setCart((local) => {
          const merged = [...local];
          for (const r of remote) {
            const i = merged.findIndex((m) => m.id === r.id && m.selectedSizeId === r.selectedSizeId);
            if (i === -1) merged.push(r);
            else merged[i] = { ...merged[i], quantity: Math.max(merged[i].quantity, r.quantity) };
          }
          return merged;
        });
      } catch {
        /* hors ligne : le panier reste local */
      } finally {
        syncReady.current = true;
      }
    };

    supabaseClient.auth.getSession().then(({ data }) => {
      if (data.session) pull();
      else syncReady.current = true;
    });
    const { data: sub } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") pull();
      if (event === "SIGNED_OUT") loggedIn.current = false;
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated || !syncReady.current || !loggedIn.current) return;
    const t = setTimeout(() => {
      fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [cart, isHydrated]);

  /* -------------------- CART OPS -------------------- */

  const addToCart = (
    product: ProductType,
    sizeId: string,
    sizeLabel: string,
    color?: CartColor | null
  ) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.id === product.id && item.selectedSizeId === sizeId
      );

      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.selectedSizeId === sizeId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          ...product,
          selectedSizeId: sizeId,
          selectedSizeLabel: sizeLabel,
          selectedColorName: color?.name ?? null,
          selectedColorHex: color?.hex ?? null,
          selectedImageUrl: color?.imageUrl ?? null,
          quantity: 1,
        },
      ];
    });
  };

  const addToCartWithFeedback = (
    product: ProductType,
    sizeId: string,
    sizeLabel: string,
    resetMs = 1500,
    color?: CartColor | null
  ) => {
    const key = `${product.id}-${sizeId}`;

    addToCart(product, sizeId, sizeLabel, color);

    setJustAdded((prev) => ({ ...prev, [key]: true }));

    const existingTimer = timersRef.current[key];
    if (existingTimer) clearTimeout(existingTimer);

    timersRef.current[key] = setTimeout(() => {
      setJustAdded((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      delete timersRef.current[key];
    }, resetMs);
  };

  const removeFromCart = (productId: number, sizeId: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.id === productId && item.selectedSizeId === sizeId))
    );
  };

  const increaseQuantity = (productId: number, sizeId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId && item.selectedSizeId === sizeId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQuantity = (productId: number, sizeId: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId && item.selectedSizeId === sizeId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setCart([]);

  const value = useMemo(
    () => ({
      cart,
      addToCart,
      justAdded,
      addToCartWithFeedback,
      removeFromCart,
      increaseQuantity,
      decreaseQuantity,
      clearCart,
      isCartOpen,
      setIsCartOpen,
    }),
    [cart, justAdded, isCartOpen]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
