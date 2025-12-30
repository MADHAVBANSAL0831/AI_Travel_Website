import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

// GET - Get a specific chat (only if owned by user)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;
    const supabase = await createSupabaseServerClient();

    // RLS ensures user can only access their own chats
    const { data: chat, error } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .single();

    if (error || !chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json({ error: "Failed to fetch chat" }, { status: 500 });
  }
}

// PATCH - Update a chat (title, visibility)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { title, visibility } = body;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title) updates.title = title.slice(0, 100);
    if (visibility) updates.visibility = visibility;

    // RLS ensures user can only update their own chats
    const { data: updatedChat, error } = await supabase
      .from("chats")
      .update(updates)
      .eq("id", chatId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !updatedChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("Error updating chat:", error);
    return NextResponse.json({ error: "Failed to update chat" }, { status: 500 });
  }
}

// DELETE - Delete a chat and all its messages (CASCADE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;
    const supabase = await createSupabaseServerClient();

    // RLS ensures user can only delete their own chats
    // Messages are automatically deleted via CASCADE
    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting chat:", error);
      return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
  }
}
