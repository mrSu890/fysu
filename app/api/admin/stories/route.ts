import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* ===================================================== */
/* GET - List all stories (admin)                       */
/* ===================================================== */

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("stories")
    .select("*, story_items(*), story_page_links(*)")

  if (error) {
    console.error("GET stories error:", error);
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(data);
}

/* ===================================================== */
/* POST - Create story                                  */
/* ===================================================== */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      cover_url,
      is_active,
      items = [],
      targets = [],
    } = body;

    /* -------- CREATE STORY -------- */

    const { data: story, error: storyError } =
      await supabaseAdmin
        .from("stories")
        .insert({
          title,
          cover_url,
          is_active,
        })
        .select()
        .single();

    if (storyError || !story) {
      console.error("Story insert error:", storyError);
      return NextResponse.json(
        { error: storyError },
        { status: 500 }
      );
    }

    /* -------- INSERT ITEMS -------- */

    if (items.length > 0) {
      const formattedItems = items.map(
        (item: any, index: number) => ({
          story_id: story.id,
          type: item.type,
          media_url: item.media_url,
          duration: Number(item.duration) > 0 ? Number(item.duration) : item.type === "video" ? 8 : 5,
          order_index: index,
        })
      );

      const { error: itemsError } =
        await supabaseAdmin
          .from("story_items")
          .insert(formattedItems);

      if (itemsError) {
        console.error("Story items error:", itemsError);
      }
    }

    /* -------- INSERT TARGET LINKS -------- */

    if (targets.length > 0) {
      const formattedTargets = targets
        .map((target: any) => {
          if (target.type === "page") {
            return {
              story_id: story.id,
              page_id: target.id,
            };
          }

          if (target.type === "collection") {
            return {
              story_id: story.id,
              collection_page_id: target.id,
            };
          }

          return null;
        })
        .filter(Boolean);

      if (formattedTargets.length > 0) {
        const { error: linkError } =
          await supabaseAdmin
            .from("story_page_links")
            .insert(formattedTargets);

        if (linkError) {
          console.error("Story links error:", linkError);
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("POST crash:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ===================================================== */
/* PUT - Update story                                   */
/* ===================================================== */

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const {
      id,
      title,
      cover_url,
      is_active,
      items = [],
      targets = [],
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing story id" },
        { status: 400 }
      );
    }

    /* -------- UPDATE STORY -------- */

    const { error: storyError } =
      await supabaseAdmin
        .from("stories")
        .update({
          title,
          cover_url,
          is_active,
        })
        .eq("id", id);

    if (storyError) {
      console.error("Story update error:", storyError);
      return NextResponse.json(
        { error: storyError },
        { status: 500 }
      );
    }

    /* -------- RESET ITEMS -------- */

    await supabaseAdmin
      .from("story_items")
      .delete()
      .eq("story_id", id);

    if (items.length > 0) {
      const formattedItems = items.map(
        (item: any, index: number) => ({
          story_id: id,
          type: item.type,
          media_url: item.media_url,
          duration: Number(item.duration) > 0 ? Number(item.duration) : item.type === "video" ? 8 : 5,
          order_index: index,
        })
      );

      await supabaseAdmin
        .from("story_items")
        .insert(formattedItems);
    }

    /* -------- RESET LINKS -------- */

    await supabaseAdmin
      .from("story_page_links")
      .delete()
      .eq("story_id", id);

    if (targets.length > 0) {
      const formattedTargets = targets
        .map((target: any) => {
          if (target.type === "page") {
            return {
              story_id: id,
              page_id: target.id,
            };
          }

          if (target.type === "collection") {
            return {
              story_id: id,
              collection_page_id: target.id,
            };
          }

          return null;
        })
        .filter(Boolean);

      if (formattedTargets.length > 0) {
        await supabaseAdmin
          .from("story_page_links")
          .insert(formattedTargets);
      }
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("PUT crash:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ===================================================== */
/* DELETE - Remove story                                */
/* ===================================================== */

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("stories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("DELETE crash:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}