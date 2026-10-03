import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

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
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (intent.metadata?.userId !== user.id || intent.metadata?.source !== "express") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      let lines: { d: string; q: number; a: number }[] = [];
      try {
        lines = JSON.parse(intent.metadata.lines || "[]");
      } catch {}

      return NextResponse.json({
        session: {
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

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    if (session.metadata?.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ session });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
