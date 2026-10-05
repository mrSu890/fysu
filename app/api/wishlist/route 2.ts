import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Ajouter un produit à la wishlist
export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    // Récupérer user connecté via Supabase session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "productId requis" },
        { status: 400 }
      );
    }

    // Insert
    const { error } = await supabase
      .from("wishlist")
      .insert({
        user_id: user.id,
        product_id: productId,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}

// Récupérer les produits likés
export async function GET() {
  try {
    const supabase = await supabaseServer();

    // User connecté
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Jointure avec products
    const { data, error } = await supabase
      .from("wishlist")
      .select(`
        product_id,
        products (
          id,
          name,
          slug,
          price,
          is_hidden,
          product_images ( url )
        )
      `)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // les produits masqués dans l'admin ne s'affichent plus dans la liste de souhaits
    const visible = (data ?? []).filter((w: any) => {
      const p = Array.isArray(w.products) ? w.products[0] : w.products
      return p && !p.is_hidden
    })
    return NextResponse.json({ wishlist: visible });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json(
        { error: "productId requis" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", Number(productId));

    if (error) {
      console.error("DELETE ERROR:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE CRASH:", err);
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}