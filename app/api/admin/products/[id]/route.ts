import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(`
      *,
      product_images (*),
      product_sizes (*),
      product_colors!product_colors_product_id_fkey (*),
      product_info_blocks (*),
      product_suggestions!product_suggestions_product_id_fkey (
        suggested_product_id,
        display_order,
        suggested:products!product_suggestions_suggested_product_id_fkey (
          id,
          name,
          slug
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  /* ================= FORMAT DATA ================= */
  const product = data as any;

  const formatted = {
    ...product,

    product_sizes:
      product.product_sizes
        ?.sort((a: any, b: any) => a.display_order - b.display_order) ?? [],

    product_colors:
      product.product_colors
        ?.sort((a: any, b: any) => a.display_order - b.display_order) ?? [],

    product_info_blocks:
      product.product_info_blocks?.sort(
        (a: any, b: any) => a.display_order - b.display_order
      ) ?? [],

    product_suggestions:
      product.product_suggestions
        ?.sort(
          (a: any, b: any) => a.display_order - b.display_order
        )
        .map((s: any) => s.suggested) ?? [],
  };

  return NextResponse.json(formatted);
}
