import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAvailabilityId, isBuyable } from "@/lib/availability";

type RawCartItem = {
  id?: number;
  quantity?: number;
  selectedSizeId?: string;
};

type CheckoutProductRow = {
  id: number;
  name: string;
  price: number;
  availability: string | null;
  product_sizes: {
    id: string;
    size: string;
    stock: number;
    is_active: boolean;
    color_id: string | null;
  }[];
};

export type ValidatedCheckoutItem = {
  productId: number;
  productName: string;
  unitAmount: number;
  quantity: number;
  sizeId: string;
  sizeLabel: string;
};

export async function validateCheckoutCart(cart: unknown): Promise<{
  ok: true;
  items: ValidatedCheckoutItem[];
} | {
  ok: false;
  status: number;
  error: string;
}> {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { ok: false, status: 400, error: "Cart is empty" };
  }

  const rawItems = cart as RawCartItem[];

  const normalized = rawItems.map((item) => ({
    productId: Number(item?.id),
    quantity: Number(item?.quantity),
    sizeId: typeof item?.selectedSizeId === "string" ? item.selectedSizeId : "",
  }));

  const hasInvalidInput = normalized.some(
    (item) =>
      !Number.isInteger(item.productId) ||
      item.productId <= 0 ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      item.quantity > 20 ||
      !item.sizeId
  );

  if (hasInvalidInput) {
    return { ok: false, status: 400, error: "Invalid cart payload" };
  }

  const productIds = Array.from(new Set(normalized.map((item) => item.productId)));

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(`
      id,
      name,
      price,
      availability,
      product_sizes (
        id,
        size,
        stock,
        is_active,
        color_id
      )
    `)
    .in("id", productIds);

  if (error) {
    console.error("Checkout product validation error:", error);
    return { ok: false, status: 500, error: "Unable to validate cart" };
  }

  // Couleurs des produits du panier (pour afficher "Produit – Couleur" sur la page de paiement)
  const { data: colorRows } = await supabaseAdmin
    .from("product_colors")
    .select("id, product_id, name")
    .in("product_id", productIds);

  const colorNames = new Map<string, string>();
  const colorCount = new Map<number, number>();
  for (const c of (colorRows ?? []) as { id: string; product_id: number; name: string }[]) {
    colorNames.set(c.id, c.name);
    colorCount.set(c.product_id, (colorCount.get(c.product_id) ?? 0) + 1);
  }

  const products = new Map<number, CheckoutProductRow>(
    ((data ?? []) as CheckoutProductRow[]).map((product) => [product.id, product])
  );

  const validatedItems: ValidatedCheckoutItem[] = [];

  for (const item of normalized) {
    const product = products.get(item.productId);

    if (!product) {
      return { ok: false, status: 400, error: "A product in your cart no longer exists" };
    }

    // Produit "me prévenir", "devis", "à venir" ou "épuisé" : pas d'achat possible
    const mode = isAvailabilityId(product.availability) ? product.availability : "available";
    if (!isBuyable(mode)) {
      return { ok: false, status: 400, error: `${product.name} is not available for purchase` };
    }

    const size = product.product_sizes?.find((entry) => entry.id === item.sizeId);

    if (!size) {
      return { ok: false, status: 400, error: `Size unavailable for ${product.name}` };
    }

    if (!size.is_active) {
      return { ok: false, status: 400, error: `Size ${size.size} is no longer available for ${product.name}` };
    }

    if (size.stock < item.quantity) {
      return { ok: false, status: 400, error: `Only ${size.stock} left for ${product.name} (${size.size})` };
    }

    // On ajoute la couleur au nom seulement si le produit en a plusieurs
    const colorName = size.color_id ? colorNames.get(size.color_id) : undefined;
    const showColor = !!colorName && (colorCount.get(product.id) ?? 0) > 1;

    validatedItems.push({
      productId: product.id,
      productName: showColor ? `${product.name} – ${colorName}` : product.name,
      unitAmount: Math.round(product.price * 100),
      quantity: item.quantity,
      sizeId: size.id,
      sizeLabel: size.size,
    });
  }

  return {
    ok: true,
    items: validatedItems,
  };
}
