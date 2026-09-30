import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = supabaseAdmin;
  const { id } = await params;
  try {
    const { error } = await supabase
      .from("collectionPages")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Erreur suppression collectionPage" }), { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = supabaseAdmin;
  const { id } = await params;

  try {
    const body = await req.json();
    const { title, hero_image, visible } = body;

    // Seuls les champs envoyés sont modifiés
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updatePayload.title = title;
    if (hero_image !== undefined) updatePayload.hero_image = hero_image;
    if (visible !== undefined) updatePayload.visible = visible;

    const { data, error } = await supabase
      .from("collectionPages")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Erreur modification collectionPage" }),
      { status: 500 }
    );
  }
}
