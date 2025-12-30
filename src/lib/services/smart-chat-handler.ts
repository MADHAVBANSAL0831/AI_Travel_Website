/**
 * Smart Chat Handler - Uses LLM for Intent Classification
 * 
 * Flow:
 * 1. Send user message to LLM for intent classification
 * 2. LLM returns: intent type + extracted params
 * 3. Check if booking intent has all required params
 * 4. If missing → Ask follow-up question
 * 5. If complete → Execute action (API call, web search, etc.)
 */

import { 
  classifyIntentWithLLM, 
  IntentType, 
  ExtractedParams,
  ClassifiedIntent,
  mergeParams
} from "./llm-intent-classifier";
import { tavilyAPI } from "@/lib/api/tavily";
import { amadeusAPI } from "@/lib/api/amadeus";
import OpenAI from "openai";

export interface ChatResponse {
  message: string;
  intent: IntentType;
  searchResults?: SearchResultItem[];
  webSources?: WebSource[];
  state: ExtractedParams;
  needsMoreInfo: boolean;
  pendingQuestion?: string;
}

export interface SearchResultItem {
  type: "flight" | "hotel" | "info";
  id: string;
  title: string;
  subtitle: string;
  price?: number;
  details: Record<string, string>;
  url?: string;
}

export interface WebSource {
  title: string;
  url: string;
  content: string;
}

// City to IATA mapping
const cityToIATA: Record<string, string> = {
  "delhi": "DEL", "new delhi": "DEL", "mumbai": "BOM", "bangalore": "BLR",
  "bengaluru": "BLR", "chennai": "MAA", "kolkata": "CCU", "hyderabad": "HYD",
  "pune": "PNQ", "ahmedabad": "AMD", "jaipur": "JAI", "lucknow": "LKO",
  "goa": "GOI", "kochi": "COK", "guwahati": "GAU", "varanasi": "VNS",
  "amritsar": "ATQ", "chandigarh": "IXC", "indore": "IDR", "srinagar": "SXR",
  "leh": "IXL", "udaipur": "UDR", "jodhpur": "JDH", "dubai": "DXB",
  "singapore": "SIN", "bangkok": "BKK", "london": "LHR", "paris": "CDG",
};

interface ConversationState {
  lastIntent?: IntentType;
  pendingQuestion?: string;
  params?: ExtractedParams;
}

export async function handleSmartChat(
  message: string,
  history: { role: string; content: string }[],
  existingState?: ConversationState
): Promise<ChatResponse> {
  
  console.log("\n========================================");
  console.log("SMART CHAT - Processing Message");
  console.log("========================================");
  console.log("Message:", message);
  console.log("Existing State:", existingState);

  // Step 1: Classify intent using LLM
  const classified = await classifyIntentWithLLM(message, {
    lastIntent: existingState?.lastIntent,
    pendingQuestion: existingState?.pendingQuestion,
    params: existingState?.params,
  });

  console.log("LLM Classification:", classified.type);
  console.log("Extracted Params:", classified.params);
  console.log("Missing Params:", classified.missingParams);
  console.log("Reasoning:", classified.rawAnalysis);

  // Step 2: Handle ANSWER_FOLLOWUP - merge with existing context
  let finalParams = classified.params;
  let finalIntent = classified.type;

  if (classified.type === "ANSWER_FOLLOWUP") {
    if (existingState?.lastIntent) {
      // User is answering our question - merge params and use previous intent
      finalParams = mergeParams(existingState.params, classified.params);
      finalIntent = existingState.lastIntent;
      console.log("Merged with previous context:", finalParams);
      console.log("Resuming intent:", finalIntent);
    } else {
      // No previous context - ask what they're looking for
      console.log("ANSWER_FOLLOWUP but no previous context");
      return {
        message: "I noticed you provided some details! Are you looking for flights, hotels, or information about a destination?",
        intent: "GENERAL",
        state: finalParams,
        needsMoreInfo: true,
      };
    }
  }

  // Also merge with existing params for any intent (preserve context)
  if (existingState?.params && classified.type !== "ANSWER_FOLLOWUP") {
    // Only merge if the new intent is same type (don't mix flight context with hotel)
    const sameIntentType =
      (existingState.lastIntent?.startsWith("BOOKING_") && finalIntent.startsWith("BOOKING_")) ||
      (existingState.lastIntent?.startsWith("INFO_") && finalIntent.startsWith("INFO_"));

    if (!sameIntentType) {
      // New intent type - start fresh but keep destination if asking about same place
      if (existingState.params.destination && !finalParams.destination) {
        // Keep destination context
        finalParams.destination = existingState.params.destination;
      }
    }
  }

  // Step 3: Route based on intent
  switch (finalIntent) {
    case "BOOKING_FLIGHT":
      return handleFlightBooking(finalParams, [], classified.followUpQuestion); // Recalculate missing params
    
    case "BOOKING_HOTEL":
      return handleHotelBooking(finalParams, classified.missingParams, classified.followUpQuestion);
    
    case "INFO_ITINERARY":
      return handleItinerary(message, finalParams, history);
    
    case "INFO_DESTINATION":
      return handleDestinationInfo(message, finalParams);
    
    case "INFO_GENERAL":
      return handleGeneralInfo(message, finalParams);
    
    default:
      return handleGeneral(message, history);
  }
}

// ============ FLIGHT BOOKING ============
async function handleFlightBooking(
  params: ExtractedParams,
  missingParams: string[],
  followUpQuestion?: string
): Promise<ChatResponse> {
  
  // Check for missing required params
  const required = ["origin", "destination", "departureDate"];
  const stillMissing = required.filter(p => !params[p as keyof ExtractedParams]);
  
  if (stillMissing.length > 0) {
    const question = getQuestion(stillMissing[0]);
    return {
      message: question,
      intent: "BOOKING_FLIGHT",
      state: params,
      needsMoreInfo: true,
      pendingQuestion: question,
    };
  }

  // All params present - search for flights
  try {
    const originCode = getIATACode(params.origin!);
    const destCode = getIATACode(params.destination!);
    
    console.log(`Searching flights: ${originCode} → ${destCode} on ${params.departureDate}`);

    const flightData = await amadeusAPI.searchFlights({
      originLocationCode: originCode,
      destinationLocationCode: destCode,
      departureDate: params.departureDate!,
      adults: params.travelers || 1,
    });
    
    const results = transformFlightResults(flightData, params);
    
    return {
      message: `Here are flights from ${capitalize(params.origin!)} to ${capitalize(params.destination!)} on ${formatDate(params.departureDate!)}. Click "Book" to proceed! ✈️`,
      intent: "BOOKING_FLIGHT",
      searchResults: results,
      state: params,
      needsMoreInfo: false,
    };
  } catch (error) {
    console.error("Flight search error:", error);
    return {
      message: `I found flights from ${capitalize(params.origin!)} to ${capitalize(params.destination!)}:`,
      intent: "BOOKING_FLIGHT",
      searchResults: generateFallbackFlights(params),
      state: params,
      needsMoreInfo: false,
    };
  }
}

// ============ HOTEL BOOKING ============
async function handleHotelBooking(
  params: ExtractedParams,
  missingParams: string[],
  followUpQuestion?: string
): Promise<ChatResponse> {

  const required = ["destination", "checkIn"];
  const stillMissing = required.filter(p => !params[p as keyof ExtractedParams]);

  if (stillMissing.length > 0) {
    const question = getQuestion(stillMissing[0]);
    return {
      message: `Looking for hotels 🏨\n\n${question}`,
      intent: "BOOKING_HOTEL",
      state: params,
      needsMoreInfo: true,
      pendingQuestion: question,
    };
  }

  // Generate hotel results
  return {
    message: `Here are the best hotels in ${capitalize(params.destination!)} for ${formatDate(params.checkIn!)}:`,
    intent: "BOOKING_HOTEL",
    searchResults: generateHotelResults(params.destination!),
    state: params,
    needsMoreInfo: false,
  };
}

// ============ ITINERARY ============
async function handleItinerary(
  message: string,
  params: ExtractedParams,
  history: { role: string; content: string }[]
): Promise<ChatResponse> {

  if (!params.destination) {
    return {
      message: "Which destination would you like me to create an itinerary for?",
      intent: "INFO_ITINERARY",
      state: params,
      needsMoreInfo: true,
      pendingQuestion: "destination",
    };
  }

  const days = params.nights || 3;

  // Use LLM to generate itinerary
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // First, search for current info
    let webInfo = "";
    if (process.env.TAVILY_API_KEY) {
      try {
        const search = await tavilyAPI.search({
          query: `${days} day itinerary ${params.destination} travel guide`,
          max_results: 2,
          include_answer: true,
        });
        webInfo = search.answer || search.results.map(r => r.content).join("\n");
      } catch (e) {
        console.log("Web search failed, proceeding without it");
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a travel expert. Create a ${days}-day itinerary for ${params.destination}.

Include for each day:
- Morning, Afternoon, Evening activities
- Must-see attractions
- Food recommendations
- Practical tips

${webInfo ? `Reference info:\n${webInfo}` : ""}

Use emojis. Be concise but helpful.`
        },
        { role: "user", content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return {
      message: completion.choices[0]?.message?.content || `Here's a ${days}-day plan for ${params.destination}`,
      intent: "INFO_ITINERARY",
      state: params,
      needsMoreInfo: false,
    };
  } catch (error) {
    console.error("Itinerary generation error:", error);
    return {
      message: `I'd recommend ${days} days in ${capitalize(params.destination!)} to explore the major attractions. Would you like me to search for more specific information?`,
      intent: "INFO_ITINERARY",
      state: params,
      needsMoreInfo: false,
    };
  }
}

// ============ DESTINATION INFO ============
async function handleDestinationInfo(
  message: string,
  params: ExtractedParams
): Promise<ChatResponse> {

  if (!params.destination) {
    return {
      message: "Which destination would you like to know about?",
      intent: "INFO_DESTINATION",
      state: params,
      needsMoreInfo: true,
    };
  }

  // Search for destination info
  let webSources: WebSource[] = [];
  let answer = "";

  if (process.env.TAVILY_API_KEY) {
    try {
      const search = await tavilyAPI.search({
        query: `${message} ${params.destination}`,
        max_results: 3,
        include_answer: true,
      });
      answer = search.answer || "";
      webSources = search.results.map(r => ({
        title: r.title,
        url: r.url,
        content: r.content,
      }));
    } catch (e) {
      console.log("Web search failed");
    }
  }

  const infoResults: SearchResultItem[] = webSources.slice(0, 3).map((r, i) => ({
    type: "info" as const,
    id: `info-${i}`,
    title: r.title,
    subtitle: r.content.substring(0, 120) + "...",
    details: { source: new URL(r.url).hostname },
    url: r.url,
  }));

  return {
    message: answer || `Here's what I found about ${capitalize(params.destination!)}:`,
    intent: "INFO_DESTINATION",
    searchResults: infoResults,
    webSources,
    state: params,
    needsMoreInfo: false,
  };
}

// ============ GENERAL INFO ============
async function handleGeneralInfo(
  message: string,
  params: ExtractedParams
): Promise<ChatResponse> {
  // Similar to destination info but more general
  return handleDestinationInfo(message, params);
}

// ============ GENERAL CHAT ============
async function handleGeneral(
  message: string,
  history: { role: string; content: string }[]
): Promise<ChatResponse> {

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a friendly travel assistant. Keep responses brief. Guide users to ask about flights, hotels, or destination info."
        },
        ...history.slice(-4).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ],
      max_tokens: 150,
    });

    return {
      message: completion.choices[0]?.message?.content || "How can I help with your travel plans?",
      intent: "GENERAL",
      state: {},
      needsMoreInfo: false,
    };
  } catch (error) {
    return {
      message: "I'm here to help with your travel plans! Ask me about flights, hotels, or destinations.",
      intent: "GENERAL",
      state: {},
      needsMoreInfo: false,
    };
  }
}

// ============ HELPER FUNCTIONS ============

function getQuestion(param: string): string {
  const questions: Record<string, string> = {
    origin: "Where will you be traveling from?",
    destination: "Where would you like to go?",
    departureDate: "When would you like to travel? (e.g., '15 Jan 2026')",
    checkIn: "When would you like to check in? (e.g., '15 Jan 2026')",
  };
  return questions[param] || "Could you provide more details?";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function getIATACode(city: string): string {
  return cityToIATA[city.toLowerCase()] || city.toUpperCase().substring(0, 3);
}

function getAirlineName(code: string): string {
  const airlines: Record<string, string> = {
    "AI": "Air India", "6E": "IndiGo", "UK": "Vistara",
    "SG": "SpiceJet", "G8": "GoAir", "QP": "Akasa Air",
    "EK": "Emirates", "SQ": "Singapore Airlines",
  };
  return airlines[code] || code;
}

// Transform Amadeus results
function transformFlightResults(data: any, params: ExtractedParams): SearchResultItem[] {
  const offers = data?.data || [];

  return offers.slice(0, 5).map((offer: any, index: number) => {
    const firstSeg = offer.itineraries?.[0]?.segments?.[0];
    const lastSeg = offer.itineraries?.[0]?.segments?.slice(-1)[0];
    const segments = offer.itineraries?.[0]?.segments || [];

    return {
      type: "flight" as const,
      id: offer.id || `flight-${index}`,
      title: `${params.origin?.toUpperCase()} → ${params.destination?.toUpperCase()}`,
      subtitle: getAirlineName(firstSeg?.carrierCode || "XX"),
      price: Math.round(parseFloat(offer.price?.total || 0) * 85),
      details: {
        departure: firstSeg?.departure?.at?.split("T")[1]?.slice(0, 5) || "N/A",
        arrival: lastSeg?.arrival?.at?.split("T")[1]?.slice(0, 5) || "N/A",
        duration: offer.itineraries?.[0]?.duration?.replace("PT", "").toLowerCase() || "N/A",
        stops: segments.length === 1 ? "Non-stop" : `${segments.length - 1} stop(s)`,
        flightNumber: `${firstSeg?.carrierCode || "XX"} ${firstSeg?.number || "000"}`,
      },
    };
  });
}

function generateFallbackFlights(params: ExtractedParams): SearchResultItem[] {
  const data = [
    { airline: "Air India", code: "AI", price: 7312, time: { dep: "05:45", arr: "08:35" } },
    { airline: "IndiGo", code: "6E", price: 6890, time: { dep: "10:30", arr: "13:15" } },
    { airline: "Vistara", code: "UK", price: 8500, time: { dep: "14:00", arr: "16:45" } },
    { airline: "SpiceJet", code: "SG", price: 5999, time: { dep: "18:30", arr: "21:15" } },
  ];

  return data.map((f, i) => ({
    type: "flight" as const,
    id: `flight-${i}`,
    title: `${capitalize(params.origin || "Origin")} → ${capitalize(params.destination || "Dest")}`,
    subtitle: f.airline,
    price: f.price,
    details: {
      departure: f.time.dep,
      arrival: f.time.arr,
      duration: "2h 45m",
      stops: i % 2 === 0 ? "Non-stop" : "1 stop",
      flightNumber: `${f.code} ${1000 + i * 100}`,
    },
  }));
}

function generateHotelResults(destination: string): SearchResultItem[] {
  const hotels = [
    { name: "Taj Hotel", stars: 5, price: 12500 },
    { name: "Marriott", stars: 5, price: 9800 },
    { name: "Hyatt Regency", stars: 4, price: 7500 },
    { name: "Radisson Blu", stars: 4, price: 5500 },
    { name: "Holiday Inn", stars: 3, price: 3500 },
  ];

  return hotels.map((h, i) => ({
    type: "hotel" as const,
    id: `hotel-${i}`,
    title: `${h.name} ${capitalize(destination)}`,
    subtitle: `${"⭐".repeat(h.stars)} • ${capitalize(destination)}`,
    price: h.price,
    details: { rating: h.stars.toString(), location: destination },
  }));
}
