import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create admin Supabase client with service role key (bypasses RLS)
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET() {
  try {
    const supabase = getAdminClient();

    // Try to fetch from profiles table first
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!profilesError && profiles && profiles.length > 0) {
      const customers = profiles.map((p: any) => ({
        id: p.id,
        name: p.first_name && p.last_name 
          ? `${p.first_name} ${p.last_name}` 
          : p.first_name || p.last_name || p.email?.split("@")[0] || "Unknown",
        email: p.email || "N/A",
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        last_sign_in: p.updated_at,
        role: p.role || "user",
      }));

      return NextResponse.json({ customers });
    }

    // Fallback: Get users from auth.users (admin API)
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return NextResponse.json(
        { error: "Failed to fetch users", details: authError.message },
        { status: 500 }
      );
    }

    const customers = (authData?.users || []).map((user: any) => ({
      id: user.id,
      name: user.user_metadata?.full_name || 
            user.user_metadata?.name || 
            user.email?.split("@")[0] || 
            "Unknown",
      email: user.email || "N/A",
      avatar_url: user.user_metadata?.avatar_url,
      created_at: user.created_at,
      last_sign_in: user.last_sign_in_at,
      role: user.user_metadata?.role || "user",
    }));

    return NextResponse.json({ customers });

  } catch (error: any) {
    console.error("Admin customers API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

