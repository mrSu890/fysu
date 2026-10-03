import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";
import { validateCheckoutCart } from "@/lib/payments";
import { shippingFeeCents } from "@/lib/shipping";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const ALL_STRIPE_ALLOWED_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  "AC","AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ",
  "CA","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CV","CW","CY","CZ",
  "DE","DJ","DK","DM","DO","DZ",
  "EC","EE","EG","EH","ER","ES","ET",
  "FI","FJ","FK","FO","FR",
  "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY",
  "HK","HN","HR","HT","HU",
  "ID","IE","IL","IM","IN","IO","IQ","IS","IT",
  "JE","JM","JO","JP",
  "KE","KG","KH","KI","KM","KN","KR","KW","KY","KZ",
  "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MF","MG","MK","ML","MM","MN","MO","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ",
  "NA","NC","NE","NG","NI","NL","NO","NP","NR","NU","NZ",
  "OM",
  "PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PY",
  "QA",
  "RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SZ",
  "TA","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
  "UA","UG","US","UY","UZ",
  "VA","VC","VE","VG","VN","VU",
  "WF","WS",
  "XK",
  "YE","YT",
  "ZA","ZM","ZW","ZZ",
];

/* ---------- Apple Pay / Google Pay depuis la fiche produit (POST /api/checkout?express=1) ---------- */

type ExpressBody = {
  cart?: unknown;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  shipping?: {
    name?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    };
  };
};

async function expressCheckout(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json()) as ExpressBody;
  const validated = await validateCheckoutCart(body.cart);

  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: validated.status });
  }

  // le prix est toujours recalculé ici, jamais pris du navigateur
  const subtotal = validated.items.reduce((sum, i) => sum + i.unitAmount * i.quantity, 0);
  const fee = shippingFeeCents(subtotal);
  const total = subtotal + fee;

  const addr = body.shipping?.address;
  if (!addr?.line1 || !addr.country) {
    return NextResponse.json({ error: "Missing shipping address" }, { status: 400 });
  }

  const cart = validated.items.map((item) => ({
    productId: item.productId,
    sizeId: item.sizeId,
    sizeLabel: item.sizeLabel,
    quantity: item.quantity,
  }));

  // résumé court pour la page de confirmation (les valeurs de metadata sont limitées à 500 caractères)
  const lines = validated.items.map((item) => ({
    d: `${item.productName} - size ${item.sizeLabel}`.slice(0, 60),
    q: item.quantity,
    a: item.unitAmount * item.quantity,
  }));
  if (fee > 0) lines.push({ d: "Delivery", q: 1, a: fee });

  const intent = await stripe.paymentIntents.create({
    amount: total,
    currency: "eur",
    payment_method_types: ["card"],
    receipt_email: body.email ?? user.email ?? undefined,
    description: "FYSU order (express checkout)",
    shipping: {
      name: body.shipping?.name || body.name || "Customer",
      phone: body.phone ?? undefined,
      address: {
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        city: addr.city ?? undefined,
        state: addr.state ?? undefined,
        postal_code: addr.postal_code ?? undefined,
        country: addr.country,
      },
    },
    metadata: {
      source: "express",
      userId: user.id,
      cart: JSON.stringify(cart),
      lines: JSON.stringify(lines).slice(0, 490),
      email: body.email ?? user.email ?? "",
      phone: body.phone ?? "",
    },
  });

  return NextResponse.json({ clientSecret: intent.client_secret, id: intent.id });
}

export async function POST(req: Request) {
  try {
    if (new URL(req.url).searchParams.get("express")) {
      return await expressCheckout(req);
    }

    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { cart } = await req.json();
    const validatedCart = await validateCheckoutCart(cart);

    if (!validatedCart.ok) {
      return NextResponse.json(
        { error: validatedCart.error },
        { status: validatedCart.status }
      );
    }

    const line_items = validatedCart.items.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: `${item.productName} - size ${item.sizeLabel}`,
        },
        unit_amount: item.unitAmount,
      },
      quantity: item.quantity,
    }));

    // livraison : gratuite dès 150 €, sinon 5 € (voir lib/shipping.ts)
    const subtotal = validatedCart.items.reduce((sum, i) => sum + i.unitAmount * i.quantity, 0);
    const fee = shippingFeeCents(subtotal);

    const simplifiedCart = validatedCart.items.map((item) => ({
      productId: item.productId,
      sizeId: item.sizeId,
      sizeLabel: item.sizeLabel,
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      customer_email: user.email ?? undefined,

      line_items,

      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: fee, currency: "eur" },
            display_name: fee === 0 ? "Free delivery" : "Standard delivery",
          },
        },
      ],

      // codes promo (ex. réduction gagnée aux jeux d'arcade)
      allow_promotion_codes: true,

      shipping_address_collection: {
        allowed_countries: ALL_STRIPE_ALLOWED_COUNTRIES,
      },

      phone_number_collection: {
        enabled: true,
      },

      billing_address_collection: "auto",

      metadata: {
        userId: user.id,
        cart: JSON.stringify(simplifiedCart),
      },

      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout`,
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error("Stripe error:", error);
    return NextResponse.json(
      { error: "Checkout failed" },
      { status: 500 }
    );
  }
}
