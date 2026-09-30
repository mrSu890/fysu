import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await supabaseServer();

  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_images (*),
        product_sizes (*)
      `)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Erreur Supabase :", error);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la récupération des produits" }),
        { status: 500 }
      );
    }

    if (!data) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    const formatted = data.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      details: product.details,
      size_fit: product.size_fit,
      slug: product.slug,
      gender: product.gender,
      price: product.price,
      createdAt: product.createdAt,
      availability: product.availability ?? "available",
      release_date: product.release_date ?? null,
      product_sizes: (product.product_sizes ?? []).map((s: any) => ({
        stock: s.stock,
        is_active: s.is_active,
      })),
    
      thumbnail_url: product.product_images?.[0]?.url ?? null,
    
      product_images: product.product_images ?? [],
    }));

    return new Response(JSON.stringify(formatted), { status: 200 });

  } catch (err) {
    console.error("Erreur serveur :", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500 }
    );
  }
}
