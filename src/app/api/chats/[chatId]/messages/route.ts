import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

// Helper to verify chat ownership
async function verifyChatOwnership(chatId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: chat } = await supabase
    .from("chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", userId)
    .single();
  return !!chat;
}

// GET - List all messages for a chat
// Optimized: Uses index on chat_id and created_at
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

    // Verify user owns this chat
    const isOwner = await verifyChatOwnership(chatId, user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const supabase = await createSupabaseServerClient();

    // Fetch messages ordered by creation time
    // Uses idx_messages_chat_id and idx_messages_created_at indexes
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST - Create a new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;

    // Verify user owns this chat
    const isOwner = await verifyChatOwnership(chatId, user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { role, content, metadata, search_results } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: "Role and content are required" },
        { status: 400 }
      );
    }

    const { data: newMessage, error } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        role,
        content,
        metadata: metadata || {},
        search_results: search_results || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating message:", error);
      return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
    }

    // Update chat's updated_at timestamp
    await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId);

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}

// DELETE - Delete all messages for a chat
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

    // Verify user owns this chat
    const isOwner = await verifyChatOwnership(chatId, user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("chat_id", chatId);

    if (error) {
      console.error("Error deleting messages:", error);
      return NextResponse.json({ error: "Failed to delete messages" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting messages:", error);
    return NextResponse.json({ error: "Failed to delete messages" }, { status: 500 });
  }
}
