/**
 * Streaming Chat API v3 - For low-latency voice mode with tool calling
 *
 * Uses LangChain streaming agent to:
 * - Stream response chunks immediately for low-latency TTS
 * - Support tool calling for flight/hotel search
 * - Display search result cards in voice mode
 */

import { NextRequest } from "next/server";
import { runAgentStream } from "@/lib/services/langchain-agent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("\n========================================");
    console.log("STREAMING CHAT API v3 - LangChain Agent");
    console.log("========================================");
    console.log("Message:", message);

    // Create a ReadableStream that sends chunks from the agent
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Run the streaming agent
          for await (const event of runAgentStream(message, history)) {
            if (event.type === 'chunk' && event.content) {
              // Send text chunk
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: event.content })}\n\n`));
            } else if (event.type === 'searchResults' && event.searchResults) {
              // Send search results
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'searchResults', searchResults: event.searchResults })}\n\n`));
            } else if (event.type === 'done') {
              // Stream complete
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Streaming chat error:", error);
    return new Response(JSON.stringify({ error: "Failed to process message" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

