import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";
import { makeNumber, type ReceiptData } from "@/lib/receipt";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

// « VISA *4242 », « APPLE PAY (VISA *4242) », « BANCONTACT »… (jamais le numéro complet de la carte)
function methodLabel(pm: any): string | null {
  if (!pm) return null;
  if (pm.type === "card" && pm.card) {
    const base = `${String(pm.card.brand || "card").toUpperCase()} *${pm.card.last4}`;
    const wallet = pm.card.wallet?.type;
    if (wallet === "apple_pay") return `APPLE PAY (${base})`;
    if (wallet === "google_pay") return `GOOGLE PAY (${base})`;
    return base;
  }
  const names: Record<string, string> = {
    bancontact: "BANCONTACT",
    ideal: "IDEAL",
    paypal: "PAYPAL",
    link: "LINK",
    klarna: "KLARNA",
    sepa_debit: "SEPA DEBIT",
  };
  return names[pm.type] ?? (String(pm.type || "").toUpperCase() || null);
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { sessionId, paymentIntentId } = await req.json();

    // Paiement Apple Pay / Google Pay depuis la fiche produit : on reconstruit le même récapitulatif
    if (paymentIntentId) {
      let intent: any;
      try {
        intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["payment_method"] });
      } catch {
        intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      }

      if (intent.metadata?.userId !== user.id || intent.metadata?.source !== "express") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      let lines: { d: string; q: number; a: number }[] = [];
      try {
        lines = JSON.parse(intent.metadata.lines || "[]");
      } catch {}

      const createdMs = Number(intent.created) * 1000;
      const lineSum = lines.reduce((sum, l) => sum + Number(l.a || 0), 0);
      const pmObj = intent.payment_method && typeof intent.payment_method === "object" ? intent.payment_method : null;
      const receipt: ReceiptData = {
        number: makeNumber(createdMs, intent.id),
        created: createdMs,
        currency: String(intent.currency || "eur"),
        lines: lines.map((l) => ({ d: String(l.d), q: Number(l.q), a: Number(l.a) })),
        shipping: null,
        other: Math.max(0, Number(intent.amount) - lineSum),
        discount: 0,
        tax: 0,
        total: Number(intent.amount),
        method: methodLabel(pmObj),
        name: null,
      };

      return NextResponse.json({
        receipt,
        session: {
          id: intent.id,
          created: intent.created,
          currency: intent.currency,
          amount_total: intent.amount,
          line_items: {
            data: lines.map((l, i) => ({
              id: `${intent.id}-${i}`,
              description: l.d,
              quantity: l.q,
              amount_total: l.a,
            })),
          },
        },
      });
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session ID" },
        { status: 400 }
      );
    }

    let session: any;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent.payment_method"],
      });
    } catch {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items"],
      });
    }

    if (session.metadata?.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // reçu : uniquement ce qui s'affiche (jamais de numéro de carte complet)
    const pi = session.payment_intent && typeof session.payment_intent === "object" ? session.payment_intent : null;
    const pm = pi?.payment_method && typeof pi.payment_method === "object" ? pi.payment_method : null;
    const createdMs = Number(session.created) * 1000;
    const receipt: ReceiptData = {
      number: makeNumber(createdMs, String(session.id)),
      created: createdMs,
      currency: String(session.currency || "eur"),
      lines: (session.line_items?.data ?? []).map((i: any) => ({
        d: String(i.description ?? ""),
        q: Number(i.quantity ?? 1),
        a: Number(i.amount_subtotal ?? i.amount_total ?? 0),
      })),
      shipping: session.shipping_cost ? Number(session.shipping_cost.amount_total ?? 0) : null,
      other: 0,
      discount: Number(session.total_details?.amount_discount ?? 0),
      tax: Number(session.total_details?.amount_tax ?? 0),
      total: Number(session.amount_total ?? 0),
      method: methodLabel(pm),
      name: session.customer_details?.name ?? null,
    };

    // on ne renvoie pas l'objet paiement complet au navigateur
    const safeSession = { ...session, payment_intent: pi ? pi.id : session.payment_intent };
    return NextResponse.json({ session: safeSession, receipt });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
