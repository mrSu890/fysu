import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Enregistre la liste (ordonnée) des produits d'une collection. Une liste vide est acceptée.
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = supabaseAdmin;
  const { id } = await context.params;

  try {
    const body = await req.json().catch(() => null);

    if (!body || !Array.isArray(body.productIds)) {
      return new Response(
        JSON.stringify({ error: "productIds manquant ou invalide" }),
        { status: 400 }
      );
    }

    // On garde l'ordre choisi, sans doublons
    const productIds: number[] = Array.from(
      new Set(
        body.productIds
          .map((value: any) => Number(value))
          .filter((value: number) => Number.isInteger(value))
      )
    ) as number[];

    const { error } = await supabase
      .from("collectionPages")
      .update({
        products: productIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Update error:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("POST /collectionPages/products failed:", err);
    return new Response(
      JSON.stringify({ error: "Erreur mise à jour produits" }),
      { status: 500 }
    );
  }
}
