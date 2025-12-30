import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, getAuthenticatedUser } from "@/lib/supabase/server";

// GET - List all chats for the authenticated user
// Optimized: Uses index on user_id and created_at, limits results
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch chats for this user, ordered by most recent
    // Uses idx_chats_user_id and idx_chats_created_at indexes
    const { data: chats, error, count } = await supabase
      .from("chats")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching chats:", error);
      return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
    }

    return NextResponse.json({
      chats: chats || [],
      hasMore: (count || 0) > offset + limit,
      total: count
    });
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
  }
}

// POST - Create a new chat for the authenticated user
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { title = "New Chat" } = body;

    // Ensure user profile exists (required for foreign key)
    // Use admin client to bypass RLS for profile check/creation
    let adminClient;
    try {
      adminClient = createSupabaseAdminClient();
    } catch {
      // If no service role key, fall back to regular client
      adminClient = supabase;
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      // Create profile if it doesn't exist (using admin to bypass RLS)
      const { error: profileError } = await adminClient
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email || "",
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
      }
    }

    console.log("Creating chat for user:", user.id, "with title:", title);

    const { data: newChat, error } = await supabase
      .from("chats")
      .insert({
        user_id: user.id,
        title: title.slice(0, 100), // Limit title length
        visibility: "private",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating chat:", error.message, error.details, error.hint);
      return NextResponse.json({ error: "Failed to create chat", details: error.message }, { status: 500 });
    }

    console.log("Chat created successfully:", newChat?.id);
    return NextResponse.json(newChat, { status: 201 });
  } catch (error) {
    console.error("Unexpected error creating chat:", error);
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
  }
}
