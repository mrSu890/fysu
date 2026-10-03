export const runtime = "nodejs";

import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

type CartLine = {
  productId: string;
  sizeId: string;
  sizeLabel: string;
  quantity: number;
};

function parseCart(raw: string | undefined | null): CartLine[] {
  try {
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Invalid metadata.cart JSON:", e);
  }
  return [];
}

// 🔥 Décrémentation du stock par couleur et par taille (une ligne = une couleur + une taille)
// puis création des lignes de commande (avec le nom de la couleur à expédier)
async function takeStockAndBuildItems(cart: CartLine[]) {
  const supabase = supabaseAdmin;
  const colorNameBySize = new Map<string, string>();

  for (const item of cart) {
    const { data: sizeRow, error: fetchError } = await supabase
      .from("product_sizes")
      .select("stock, color_id")
      .eq("id", item.sizeId)
      .single();

    if (fetchError || !sizeRow) {
      console.error("Size not found:", item.sizeId);
      continue;
    }

    // nom de la couleur, pour que la commande dise quoi expédier
    if (sizeRow.color_id) {
      const { data: colorRow } = await supabase
        .from("product_colors")
        .select("name")
        .eq("id", sizeRow.color_id)
        .maybeSingle();

      if (colorRow?.name) colorNameBySize.set(item.sizeId, colorRow.name);
    }

    const newStock = sizeRow.stock - item.quantity;

    if (newStock < 0) {
      console.error("Stock négatif détecté pour size:", item.sizeId);
      continue;
    }

    await supabase.from("product_sizes").update({ stock: newStock }).eq("id", item.sizeId);
  }

  return cart.map((i) => {
    const colorName = colorNameBySize.get(i.sizeId);
    return {
      product_id: Number(i.productId),
      size_id: i.sizeId,
      // la couleur est ajoutée à la taille pour qu'elle s'affiche dans l'admin des commandes
      size_label: colorName ? `${i.sizeLabel} · ${colorName}` : i.sizeLabel,
      color_name: colorName ?? null,
      quantity: i.quantity,
    };
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  /* ---------- Paiement par le panier (page Stripe) ---------- */
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const supabase = supabaseAdmin;

    // 🔒 Anti-duplicate
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true });
    }

    const cartFromMetadata = parseCart(session.metadata?.cart);

    // ⚠️ Sécurité : userId obligatoire
    if (!session.metadata?.userId) {
      console.error("Missing userId in metadata");
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const items = await takeStockAndBuildItems(cartFromMetadata);
    const shipping = session.customer_details;

    const { error } = await supabase.from("orders").insert({
      id: crypto.randomUUID(),
      user_id: session.metadata.userId,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent,
      email: shipping?.email ?? session.customer_email,
      total: session.amount_total,
      currency: session.currency,
      status: "paid",
      shipping_data: shipping,
      items,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  /* ---------- Paiement Apple Pay / Google Pay depuis la fiche produit ---------- */
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;

    // les paiements du panier sont gérés plus haut : on ne traite que ceux de l'Apple Pay express
    if (intent.metadata?.source !== "express") {
      return NextResponse.json({ received: true });
    }

    const supabase = supabaseAdmin;

    // 🔒 Anti-duplicate
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent", intent.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true });
    }

    if (!intent.metadata?.userId) {
      console.error("Missing userId in express metadata");
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const items = await takeStockAndBuildItems(parseCart(intent.metadata.cart));

    const shipping = {
      name: intent.shipping?.name ?? null,
      phone: intent.shipping?.phone ?? (intent.metadata.phone || null),
      email: intent.metadata.email || intent.receipt_email || null,
      address: intent.shipping?.address ?? null,
    };

    const { error } = await supabase.from("orders").insert({
      id: crypto.randomUUID(),
      user_id: intent.metadata.userId,
      // même colonne que pour les paiements du panier : l'identifiant du paiement fait office d'identifiant unique
      stripe_session_id: intent.id,
      stripe_payment_intent: intent.id,
      email: shipping.email,
      total: intent.amount,
      currency: intent.currency,
      status: "paid",
      shipping_data: shipping,
      items,
    });

    if (error) {
      console.error("Supabase insert error (express):", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
