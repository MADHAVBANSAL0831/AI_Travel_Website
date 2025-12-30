/**
 * LLM-Based Intent Classification
 * 
 * Uses OpenAI to understand user intent instead of regex patterns.
 * This handles typos, natural language variations, and context much better.
 */

import OpenAI from "openai";

export type IntentType = 
  | "BOOKING_FLIGHT"
  | "BOOKING_HOTEL"
  | "INFO_ITINERARY"
  | "INFO_DESTINATION"
  | "INFO_GENERAL"
  | "ANSWER_FOLLOWUP"  // User answering a follow-up question
  | "GENERAL";

export interface ExtractedParams {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  travelers?: number;
  cabinClass?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
}

export interface ClassifiedIntent {
  type: IntentType;
  params: ExtractedParams;
  missingParams: string[];
  followUpQuestion?: string;
  rawAnalysis?: string;
}

interface PreviousContext {
  lastIntent?: string;
  pendingQuestion?: string;
  params?: ExtractedParams;
}

const CLASSIFICATION_PROMPT = `You are a travel assistant intent classifier. Analyze the user's message and determine what they want.

PREVIOUS CONTEXT (if any):
{{CONTEXT}}

USER MESSAGE: "{{MESSAGE}}"

Respond in this exact JSON format:
{
  "intent": "BOOKING_FLIGHT" | "BOOKING_HOTEL" | "INFO_ITINERARY" | "INFO_DESTINATION" | "INFO_GENERAL" | "ANSWER_FOLLOWUP" | "GENERAL",
  "isBookingRequest": true/false,
  "params": {
    "origin": "city name or null",
    "destination": "city name or null", 
    "departureDate": "YYYY-MM-DD or null",
    "checkIn": "YYYY-MM-DD or null",
    "travelers": number or null,
    "nights": number or null
  },
  "reasoning": "brief explanation"
}

RULES:
1. BOOKING_FLIGHT = User explicitly wants to BOOK/FIND/SEARCH for flights
2. BOOKING_HOTEL = User explicitly wants to BOOK/FIND/SEARCH for hotels  
3. INFO_ITINERARY = User wants a travel PLAN/ITINERARY/SCHEDULE (NOT booking)
4. INFO_DESTINATION = User asking about places to visit, attractions, things to do
5. INFO_GENERAL = User asking about weather, visa, currency, tips, etc.
6. ANSWER_FOLLOWUP = User is answering a question we asked (e.g., providing a date when asked)
7. GENERAL = Greetings, thanks, or unclear intent

IMPORTANT:
- "make me an itinerary" or "travel plan" = INFO_ITINERARY (NOT booking!)
- "places to visit in X" = INFO_DESTINATION
- "flights from X to Y" = BOOKING_FLIGHT
- If user just says a date/city (like "8 jan" or "delhi"), check context to understand what they're answering

Parse dates relative to today: {{TODAY}}`;

export async function classifyIntentWithLLM(
  message: string,
  previousContext?: PreviousContext
): Promise<ClassifiedIntent> {
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // Build context string
  let contextStr = "None";
  if (previousContext) {
    const parts = [];
    if (previousContext.lastIntent) parts.push(`Last intent: ${previousContext.lastIntent}`);
    if (previousContext.pendingQuestion) parts.push(`We asked: "${previousContext.pendingQuestion}"`);
    if (previousContext.params) {
      const p = previousContext.params;
      if (p.origin) parts.push(`Origin: ${p.origin}`);
      if (p.destination) parts.push(`Destination: ${p.destination}`);
      if (p.departureDate) parts.push(`Date: ${p.departureDate}`);
    }
    if (parts.length > 0) contextStr = parts.join(", ");
  }
  
  const today = new Date().toISOString().split("T")[0];
  const prompt = CLASSIFICATION_PROMPT
    .replace("{{CONTEXT}}", contextStr)
    .replace("{{MESSAGE}}", message)
    .replace("{{TODAY}}", today);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a precise intent classifier. Always respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.1, // Low temperature for consistent classification
    });

    const responseText = completion.choices[0]?.message?.content || "";
    console.log("LLM Classification Response:", responseText);
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // Determine missing params based on intent
    const missingParams = getMissingParams(analysis.intent, analysis.params);
    const followUpQuestion = missingParams.length > 0 
      ? getFollowUpQuestion(missingParams[0], analysis.intent)
      : undefined;

    return {
      type: analysis.intent as IntentType,
      params: {
        origin: analysis.params?.origin || undefined,
        destination: analysis.params?.destination || undefined,
        departureDate: analysis.params?.departureDate || undefined,
        checkIn: analysis.params?.checkIn || undefined,
        travelers: analysis.params?.travelers || undefined,
        nights: analysis.params?.nights || undefined,
      },
      missingParams,
      followUpQuestion,
      rawAnalysis: analysis.reasoning,
    };

  } catch (error) {
    console.error("LLM classification error:", error);
    // Fallback to basic classification
    return fallbackClassify(message);
  }
}

function getMissingParams(intent: IntentType, params: any): string[] {
  const missing: string[] = [];

  if (intent === "BOOKING_FLIGHT") {
    if (!params?.origin) missing.push("origin");
    if (!params?.destination) missing.push("destination");
    if (!params?.departureDate) missing.push("departureDate");
  } else if (intent === "BOOKING_HOTEL") {
    if (!params?.destination) missing.push("destination");
    if (!params?.checkIn) missing.push("checkIn");
  }

  return missing;
}

function getFollowUpQuestion(param: string, intent: IntentType): string {
  const questions: Record<string, string> = {
    origin: "Where will you be traveling from?",
    destination: intent === "BOOKING_HOTEL"
      ? "Which city would you like to stay in?"
      : "Where would you like to go?",
    departureDate: "When would you like to travel? (e.g., '15 Jan 2026')",
    checkIn: "When would you like to check in?",
  };
  return questions[param] || "Could you provide more details?";
}

// Fallback classification when LLM fails
function fallbackClassify(message: string): ClassifiedIntent {
  const lower = message.toLowerCase();

  let type: IntentType = "GENERAL";

  if (/\b(flight|fly|flying|flights)\b/i.test(message)) {
    type = "BOOKING_FLIGHT";
  } else if (/\b(hotel|stay|accommodation|room)\b/i.test(message)) {
    type = "BOOKING_HOTEL";
  } else if (/\b(itinerary|itinary|travel plan|day plan)\b/i.test(message)) {
    type = "INFO_ITINERARY";
  } else if (/\b(places?|visit|attractions?|things to do)\b/i.test(message)) {
    type = "INFO_DESTINATION";
  }

  return {
    type,
    params: {},
    missingParams: [],
  };
}

// Export for merging context
export function mergeParams(
  existing: ExtractedParams | undefined,
  newParams: ExtractedParams
): ExtractedParams {
  return {
    origin: newParams.origin || existing?.origin,
    destination: newParams.destination || existing?.destination,
    departureDate: newParams.departureDate || existing?.departureDate,
    returnDate: newParams.returnDate || existing?.returnDate,
    travelers: newParams.travelers || existing?.travelers,
    checkIn: newParams.checkIn || existing?.checkIn,
    checkOut: newParams.checkOut || existing?.checkOut,
    nights: newParams.nights || existing?.nights,
  };
}

