import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isRowKind } from "@/lib/rowTypes";

export const runtime = "nodejs";

/* ------------------------------------------------ */
/* -------------------- GET ----------------------- */
/* ------------------------------------------------ */

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("sections")
      .select(`
        id,
        title,
        slug,
        row_type,
        display_order,
        is_active,
        created_at,

        section_products (
          display_order,
          product:products (
            id,
            name,
            slug,
            price
          )
        ),

        section_pages (
          pages (
            id,
            title,
            slug
          )
        )
      `)
      .order("display_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("GET SECTIONS ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------ */
/* -------------------- CREATE -------------------- */
/* ------------------------------------------------ */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      title,
      slug,
      row_type = null,
      display_order = 0,
      is_active = true,
      product_ids = [],
      page_ids = [],
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    /* 1️⃣ Create section */
    const { data: section, error: sectionError } = await supabaseAdmin
      .from("sections")
      .insert({
        title,
        slug,
        row_type: isRowKind(row_type) ? row_type : null,
        display_order,
        is_active,
      })
      .select()
      .single();

    if (sectionError || !section) throw sectionError;

    /* 2️⃣ Insert product relations */
    if (product_ids.length > 0) {
      const productLinks = product_ids.map(
        (product_id: number, index: number) => ({
          section_id: section.id,
          product_id,
          display_order: index,
        })
      );

      const { error: productError } = await supabaseAdmin
        .from("section_products")
        .insert(productLinks);

      if (productError) throw productError;
    }

    /* 3️⃣ Insert page relations */
    if (page_ids.length > 0) {
      const pageLinks = page_ids.map((page_id: string) => ({
        section_id: section.id,
        page_id,
      }));

      const { error: pageError } = await supabaseAdmin
        .from("section_pages")
        .insert(pageLinks);

      if (pageError) throw pageError;
    }

    return NextResponse.json({ success: true, section }, { status: 201 });
  } catch (err: any) {
    console.error("CREATE SECTION ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------ */
/* -------------------- UPDATE -------------------- */
/* ------------------------------------------------ */

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const {
      id,
      title,
      slug,
      row_type,
      display_order,
      is_active,
      product_ids = [],
      page_ids = [],
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Section id is required" },
        { status: 400 }
      );
    }

    /* 1️⃣ Update section */
    const { error: updateError } = await supabaseAdmin
      .from("sections")
      .update({
        title,
        slug,
        ...(row_type !== undefined ? { row_type: isRowKind(row_type) ? row_type : null } : {}),
        display_order,
        is_active,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    /* 2️⃣ Reset product relations */
    await supabaseAdmin
      .from("section_products")
      .delete()
      .eq("section_id", id);

    if (product_ids.length > 0) {
      const productLinks = product_ids.map(
        (product_id: number, index: number) => ({
          section_id: id,
          product_id,
          display_order: index,
        })
      );

      await supabaseAdmin
        .from("section_products")
        .insert(productLinks);
    }

    /* 3️⃣ Reset page relations */
    await supabaseAdmin
      .from("section_pages")
      .delete()
      .eq("section_id", id);

    if (page_ids.length > 0) {
      const pageLinks = page_ids.map((page_id: string) => ({
        section_id: id,
        page_id,
      }));

      await supabaseAdmin
        .from("section_pages")
        .insert(pageLinks);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("UPDATE SECTION ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------ */
/* -------------------- DELETE -------------------- */
/* ------------------------------------------------ */

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Section id required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("sections")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE SECTION ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
