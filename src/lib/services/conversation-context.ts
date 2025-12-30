import { createServerSupabaseClient } from "@/lib/supabase/client";

export interface ConversationContext {
  id?: string;
  chat_id: string;
  user_id?: string | null;
  intent?: "flight" | "hotel" | "trip" | null;
  origin?: string | null;
  destination?: string | null;
  departure_date?: string | null;
  return_date?: string | null;
  passengers?: number;
  check_in?: string | null;
  check_out?: string | null;
  rooms?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get conversation context from database
 */
export async function getConversationContext(chatId: string): Promise<ConversationContext | null> {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("conversation_context")
      .select("*")
      .eq("chat_id", chatId)
      .single();

    if (error) {
      // If no context found, return null (not an error)
      if (error.code === "PGRST116") {
        console.log(`No existing context for chat ${chatId}`);
        return null;
      }
      console.error("Error fetching conversation context:", error);
      return null;
    }

    console.log(`Loaded context for chat ${chatId}:`, data);
    return data as ConversationContext;
  } catch (e) {
    console.error("Exception getting conversation context:", e);
    return null;
  }
}

/**
 * Save or update conversation context
 */
export async function saveConversationContext(
  context: ConversationContext
): Promise<ConversationContext | null> {
  try {
    const supabase = createServerSupabaseClient();

    // Prepare the data - ensure dates are in proper format or null
    const upsertData = {
      chat_id: context.chat_id,
      user_id: context.user_id || null,
      intent: context.intent || null,
      origin: context.origin || null,
      destination: context.destination || null,
      departure_date: context.departure_date || null,
      return_date: context.return_date || null,
      passengers: context.passengers || 1,
      check_in: context.check_in || null,
      check_out: context.check_out || null,
      rooms: context.rooms || 1,
      metadata: context.metadata || {},
    };

    console.log("Saving context:", upsertData);

    // Upsert - insert or update based on chat_id
    const { data, error } = await supabase
      .from("conversation_context")
      .upsert(upsertData, { onConflict: "chat_id" })
      .select()
      .single();

    if (error) {
      console.error("Error saving conversation context:", error);
      return null;
    }

    console.log("Context saved successfully:", data);
    return data as ConversationContext;
  } catch (e) {
    console.error("Exception saving conversation context:", e);
    return null;
  }
}

/**
 * Merge new context with existing context
 * New values override old ones, but null/undefined values don't clear existing ones
 */
export function mergeContext(
  existing: ConversationContext | null,
  newContext: Partial<ConversationContext>
): ConversationContext {
  if (!existing) {
    return {
      chat_id: newContext.chat_id || "",
      ...newContext,
    } as ConversationContext;
  }

  return {
    ...existing,
    // Only override if new value is truthy
    intent: newContext.intent || existing.intent,
    origin: newContext.origin || existing.origin,
    destination: newContext.destination || existing.destination,
    departure_date: newContext.departure_date || existing.departure_date,
    return_date: newContext.return_date || existing.return_date,
    passengers: newContext.passengers || existing.passengers,
    check_in: newContext.check_in || existing.check_in,
    check_out: newContext.check_out || existing.check_out,
    rooms: newContext.rooms || existing.rooms,
    metadata: { ...existing.metadata, ...newContext.metadata },
  };
}

/**
 * Delete conversation context
 */
export async function deleteConversationContext(chatId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  
  const { error } = await supabase
    .from("conversation_context")
    .delete()
    .eq("chat_id", chatId);

  if (error) {
    console.error("Error deleting conversation context:", error);
    return false;
  }

  return true;
}

