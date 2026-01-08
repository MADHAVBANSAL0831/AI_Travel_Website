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

    // Fetch user count from auth.users
    const { data: authData } = await supabase.auth.admin.listUsers();
    const totalUsers = authData?.users?.length || 0;

    // Fetch chat count
    const { count: chatCount } = await supabase
      .from("chats")
      .select("*", { count: "exact", head: true });

    // Try to fetch knowledge documents count (might be different table names)
    let knowledgeDocuments = 0;
    
    // Try rag_documents first
    const { count: ragCount } = await supabase
      .from("rag_documents")
      .select("*", { count: "exact", head: true });
    
    if (ragCount !== null) {
      knowledgeDocuments = ragCount;
    } else {
      // Fallback to knowledge_base
      const { count: kbCount } = await supabase
        .from("knowledge_base")
        .select("*", { count: "exact", head: true });
      knowledgeDocuments = kbCount || 0;
    }

    return NextResponse.json({
      totalUsers,
      totalChats: chatCount || 0,
      knowledgeDocuments,
    });

  } catch (error: any) {
    console.error("Admin stats API error:", error);
    return NextResponse.json(
      { 
        totalUsers: 0, 
        totalChats: 0, 
        knowledgeDocuments: 0,
        error: error.message 
      },
      { status: 200 } // Return 200 with zeros instead of error
    );
  }
}

