/**
 * Chat API v2 - Smart LLM-Based Intent Classification
 *
 * Flow:
 * 1. Receive message
 * 2. Get conversation context from DB
 * 3. Send to LLM to understand intent (not regex!)
 * 4. Route to appropriate handler
 * 5. Save updated context
 * 6. Return response
 */

import { NextRequest, NextResponse } from "next/server";
import { handleSmartChat, ChatResponse } from "@/lib/services/smart-chat-handler";
import {
  getConversationContext,
  saveConversationContext,
  ConversationContext
} from "@/lib/services/conversation-context";
import { ExtractedParams, IntentType } from "@/lib/services/llm-intent-classifier";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId, history = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    console.log("\n========================================");
    console.log("CHAT API v2 - New Request");
    console.log("========================================");
    console.log("Message:", message);
    console.log("Conversation ID:", conversationId);

    // Generate or use existing conversation ID
    const chatId = conversationId || `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get existing context from database
    let existingState: {
      lastIntent?: IntentType;
      pendingQuestion?: string;
      params?: ExtractedParams;
    } = {};

    if (conversationId) {
      try {
        const dbContext = await getConversationContext(conversationId);
        if (dbContext) {
          const metadata = dbContext.metadata as { pendingQuestion?: string } | undefined;
          existingState = {
            lastIntent: mapDbIntentToType(dbContext.intent || null),
            pendingQuestion: metadata?.pendingQuestion,
            params: {
              origin: dbContext.origin || undefined,
              destination: dbContext.destination || undefined,
              departureDate: dbContext.departure_date || undefined,
              returnDate: dbContext.return_date || undefined,
              travelers: dbContext.passengers || undefined,
              checkIn: dbContext.check_in || undefined,
              checkOut: dbContext.check_out || undefined,
            },
          };
          console.log("Loaded existing state:", existingState);
        }
      } catch (e) {
        console.log("Error loading context:", e);
      }
    }

    // Process message through SMART chat handler (uses LLM!)
    const response: ChatResponse = await handleSmartChat(
      message,
      history,
      existingState
    );

    console.log("Response intent:", response.intent);
    console.log("Needs more info:", response.needsMoreInfo);

    // Save updated context to database
    try {
      const contextToSave: ConversationContext = {
        chat_id: chatId,
        user_id: null, // Allow null for anonymous users
        intent: mapIntentToDbFormat(response.intent) as "flight" | "hotel" | "trip" | null,
        origin: response.state.origin || null,
        destination: response.state.destination || null,
        departure_date: response.state.departureDate || null,
        return_date: response.state.returnDate || null,
        passengers: response.state.travelers || 1,
        check_in: response.state.checkIn || null,
        check_out: response.state.checkOut || null,
        rooms: 1,
        metadata: { pendingQuestion: response.pendingQuestion },
      };
      
      await saveConversationContext(contextToSave);
      console.log("Context saved successfully");
    } catch (e) {
      console.error("Failed to save context:", e);
    }

    // Return response
    return NextResponse.json({
      message: response.message,
      conversationId: chatId,
      intent: response.intent,
      searchResults: response.searchResults,
      webSources: response.webSources,
      state: response.state,
      needsMoreInfo: response.needsMoreInfo,
    });

  } catch (error) {
    console.error("Chat API v2 error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

// Map intent types to database format
function mapIntentToDbFormat(intent: string): string {
  const mapping: Record<string, string> = {
    "BOOKING_FLIGHT": "flight",
    "BOOKING_HOTEL": "hotel",
    "BOOKING_TRIP": "trip",
    "INFO_DESTINATION": "info",
    "INFO_ITINERARY": "itinerary",
    "INFO_GENERAL": "info",
    "GENERAL": "general",
  };
  return mapping[intent] || "general";
}

// Map database intent back to IntentType
function mapDbIntentToType(dbIntent: string | null): IntentType | undefined {
  if (!dbIntent) return undefined;
  const mapping: Record<string, IntentType> = {
    "flight": "BOOKING_FLIGHT",
    "hotel": "BOOKING_HOTEL",
    "trip": "BOOKING_FLIGHT",
    "info": "INFO_DESTINATION",
    "itinerary": "INFO_ITINERARY",
    "general": "GENERAL",
  };
  return mapping[dbIntent];
}

export async function GET() {
  return NextResponse.json({
    version: "2.0",
    description: "Chat API with Intent Classification",
    endpoints: {
      POST: {
        body: {
          message: "string (required)",
          conversationId: "string (optional)",
          history: "array of {role, content} (optional)",
        },
      },
    },
  });
}

