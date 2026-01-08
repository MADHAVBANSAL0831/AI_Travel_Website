/**
 * Chat API v3 - LangChain Agent with RAG
 * 
 * Uses LangChain for intelligent conversation with:
 * - Tool calling for flight/hotel search
 * - RAG for personality and knowledge retrieval
 * - Conversation memory
 */

import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/services/langchain-agent";
import {
  getConversationContext,
  saveConversationContext,
} from "@/lib/services/conversation-context";

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
    console.log("CHAT API v3 - LangChain Agent");
    console.log("========================================");
    console.log("Message:", message);
    console.log("Conversation ID:", conversationId);

    // Generate or use existing conversation ID
    const chatId = conversationId || `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Run the LangChain agent
    const agentResponse = await runAgent(message, history);

    console.log("Agent Response:", agentResponse.message.slice(0, 200) + "...");
    console.log("Tool Calls:", agentResponse.toolCalls?.map(t => t.name) || "None");

    // Save conversation context if we have search results
    if (agentResponse.searchResults && agentResponse.searchResults.length > 0) {
      try {
        const firstResult = agentResponse.searchResults[0];
        if (firstResult.type === "flight") {
          await saveConversationContext({
            chat_id: chatId,
            intent: "flight",
            origin: firstResult.details?.originCode,
            destination: firstResult.details?.destinationCode,
            departure_date: firstResult.details?.date,
            metadata: { lastSearch: "flights" },
          });
        }
      } catch (e) {
        console.log("Failed to save context:", e);
      }
    }

    // Format response
    const response = {
      message: agentResponse.message,
      conversationId: chatId,
      intent: agentResponse.toolCalls?.some(t => t.name === "search_flights") 
        ? "BOOKING_FLIGHT" 
        : agentResponse.toolCalls?.some(t => t.name === "search_hotels")
          ? "BOOKING_HOTEL"
          : "GENERAL",
      searchResults: agentResponse.searchResults,
      toolsUsed: agentResponse.toolCalls?.map(t => t.name) || [],
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Chat API v3 error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process message",
        message: "I apologize, but something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}

