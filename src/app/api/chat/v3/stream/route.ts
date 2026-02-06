/**
 * Streaming Chat API v3 - For low-latency voice mode
 * 
 * Uses OpenAI streaming to send response chunks immediately
 * This allows TTS to start on the first sentence while LLM generates the rest
 */

import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getPersonalityContext } from "@/lib/services/rag-service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Get personality context (quick lookup)
    let systemPrompt = `You are TravelHub AI, a friendly and efficient travel assistant.
Keep responses concise and conversational for voice interaction.
Aim for 1-3 sentences when possible. Be helpful but brief.`;

    try {
      const personality = await getPersonalityContext(message);
      if (personality && personality.length > 50) {
        systemPrompt = personality + "\n\nKeep responses concise for voice interaction.";
      }
    } catch {
      // Use default prompt
    }

    // Build messages
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 200, // Shorter for voice
      temperature: 0.7,
      stream: true,
    });

    // Create a ReadableStream that sends chunks
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              // Send as SSE format
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
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

