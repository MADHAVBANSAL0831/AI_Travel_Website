/**
 * Chat Handler - Routes messages based on classified intent
 * 
 * Flow:
 * 1. Classify intent
 * 2. Validate required parameters
 * 3. If params missing → Ask follow-up question
 * 4. If params complete → Execute action (search flights, web search, etc.)
 */

import { classifyIntent, ClassifiedIntent, IntentType, ExtractedParams } from "./intent-classifier";
import { tavilyAPI } from "@/lib/api/tavily";
import { braveSearchAPI } from "@/lib/api/brave-search";
import { amadeusAPI } from "@/lib/api/amadeus";
import OpenAI from "openai";

export interface ChatResponse {
  message: string;
  intent: IntentType;
  searchResults?: SearchResultItem[];
  webSources?: WebSource[];
  state: ExtractedParams;
  needsMoreInfo: boolean;
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
  "delhi": "DEL", "new delhi": "DEL", "mumbai": "BOM", "bombay": "BOM",
  "bangalore": "BLR", "bengaluru": "BLR", "chennai": "MAA", "madras": "MAA",
  "kolkata": "CCU", "calcutta": "CCU", "hyderabad": "HYD", "pune": "PNQ",
  "ahmedabad": "AMD", "jaipur": "JAI", "lucknow": "LKO", "goa": "GOI",
  "kochi": "COK", "cochin": "COK", "guwahati": "GAU", "varanasi": "VNS",
  "amritsar": "ATQ", "chandigarh": "IXC", "indore": "IDR", "bhopal": "BHO",
  "nagpur": "NAG", "patna": "PAT", "ranchi": "IXR", "srinagar": "SXR",
  "leh": "IXL", "dehradun": "DED", "agra": "AGR", "udaipur": "UDR",
  "jodhpur": "JDH", "dubai": "DXB", "singapore": "SIN", "bangkok": "BKK",
  "london": "LHR", "paris": "CDG", "new york": "JFK", "tokyo": "NRT",
};

export async function handleChatMessage(
  message: string,
  conversationHistory: { role: string; content: string }[],
  existingContext?: ExtractedParams
): Promise<ChatResponse> {
  
  // Step 1: Classify the intent
  const classified = classifyIntent(message, existingContext);
  console.log("=== Intent Classification ===");
  console.log("Intent:", classified.type);
  console.log("Params:", classified.params);
  console.log("Missing:", classified.missingParams);
  
  // Step 2: Route based on intent
  switch (classified.type) {
    case "BOOKING_FLIGHT":
      return handleFlightBooking(classified, conversationHistory);
    
    case "BOOKING_HOTEL":
      return handleHotelBooking(classified, conversationHistory);
    
    case "BOOKING_TRIP":
      return handleTripBooking(classified, conversationHistory);
    
    case "INFO_DESTINATION":
    case "INFO_GENERAL":
      return handleInfoQuery(message, classified, conversationHistory);
    
    case "INFO_ITINERARY":
      return handleItineraryRequest(message, classified, conversationHistory);
    
    case "GENERAL":
    default:
      return handleGeneralChat(message, classified, conversationHistory);
  }
}

// Handle flight booking intent
async function handleFlightBooking(
  classified: ClassifiedIntent,
  _history: { role: string; content: string }[]
): Promise<ChatResponse> {
  const { params, missingParams, followUpQuestion } = classified;
  
  // Check if we have all required params
  if (missingParams.length > 0) {
    return {
      message: followUpQuestion || `I need more information to find flights. ${getMissingParamMessage(missingParams[0])}`,
      intent: "BOOKING_FLIGHT",
      state: params,
      needsMoreInfo: true,
    };
  }
  
  // All params present - search for flights
  try {
    const originCode = cityToIATA[params.origin!.toLowerCase()] || params.origin!.toUpperCase();
    const destCode = cityToIATA[params.destination!.toLowerCase()] || params.destination!.toUpperCase();
    
    console.log(`Searching flights: ${originCode} → ${destCode} on ${params.departureDate}`);
    
    const flightData = await amadeusAPI.searchFlights({
      origin: originCode,
      destination: destCode,
      departureDate: params.departureDate!,
      adults: params.travelers || 1,
    });
    
    const searchResults = transformFlightResults(flightData, params);
    
    return {
      message: `Here are the available flights from ${capitalize(params.origin!)} to ${capitalize(params.destination!)} on ${formatDisplayDate(params.departureDate!)}. Click "Book" on any flight to proceed! ✈️`,
      intent: "BOOKING_FLIGHT",
      searchResults,
      state: params,
      needsMoreInfo: false,
    };
  } catch (error) {
    console.error("Flight search error:", error);
    // Return fallback results
    return {
      message: `I found some flight options from ${capitalize(params.origin!)} to ${capitalize(params.destination!)}:`,
      intent: "BOOKING_FLIGHT",
      searchResults: generateFallbackFlights(params),
      state: params,
      needsMoreInfo: false,
    };
  }
}

// Handle hotel booking intent
async function handleHotelBooking(
  classified: ClassifiedIntent,
  _history: { role: string; content: string }[]
): Promise<ChatResponse> {
  const { params, missingParams, followUpQuestion } = classified;
  
  if (missingParams.length > 0) {
    return {
      message: followUpQuestion || `I need more information to find hotels. ${getMissingParamMessage(missingParams[0])}`,
      intent: "BOOKING_HOTEL",
      state: params,
      needsMoreInfo: true,
    };
  }

  // Generate hotel results
  const searchResults = generateHotelResults(params.destination!);

  return {
    message: `Here are the best hotels in ${capitalize(params.destination!)}. Click "Book" to reserve! 🏨`,
    intent: "BOOKING_HOTEL",
    searchResults,
    state: params,
    needsMoreInfo: false,
  };
}

// Handle trip booking (flights + hotels)
async function handleTripBooking(
  classified: ClassifiedIntent,
  history: { role: string; content: string }[]
): Promise<ChatResponse> {
  const { params, missingParams, followUpQuestion } = classified;

  if (missingParams.length > 0) {
    return {
      message: followUpQuestion || `Let's plan your trip! ${getMissingParamMessage(missingParams[0])}`,
      intent: "BOOKING_TRIP",
      state: params,
      needsMoreInfo: true,
    };
  }

  // Get both flights and hotels
  const flightResponse = await handleFlightBooking(classified, history);
  const hotelResults = generateHotelResults(params.destination!);

  const combinedResults = [
    ...(flightResponse.searchResults || []).slice(0, 3),
    ...hotelResults.slice(0, 2),
  ];

  return {
    message: `Here are options for your trip to ${capitalize(params.destination!)}:`,
    intent: "BOOKING_TRIP",
    searchResults: combinedResults,
    state: params,
    needsMoreInfo: false,
  };
}

// Handle info/destination queries
async function handleInfoQuery(
  message: string,
  classified: ClassifiedIntent,
  _history: { role: string; content: string }[]
): Promise<ChatResponse> {
  const destination = classified.params.destination;

  if (!destination) {
    return {
      message: "Which destination would you like to know about?",
      intent: classified.type,
      state: classified.params,
      needsMoreInfo: true,
    };
  }

  // Search for info using Tavily or Brave
  const webSearch = await searchWeb(message, destination);

  const infoResults: SearchResultItem[] = webSearch.results.slice(0, 3).map((r, i) => ({
    type: "info" as const,
    id: `info-${i}`,
    title: r.title,
    subtitle: r.content.substring(0, 150) + "...",
    details: { source: new URL(r.url).hostname },
    url: r.url,
  }));

  const responseMessage = webSearch.answer
    ? `${webSearch.answer}\n\nHere are some helpful resources:`
    : `Here's what I found about ${capitalize(destination)}:`;

  return {
    message: responseMessage,
    intent: classified.type,
    searchResults: infoResults,
    webSources: webSearch.results,
    state: classified.params,
    needsMoreInfo: false,
  };
}

// Handle itinerary requests using LLM
async function handleItineraryRequest(
  message: string,
  classified: ClassifiedIntent,
  history: { role: string; content: string }[]
): Promise<ChatResponse> {
  const { destination, nights } = classified.params;

  if (!destination) {
    return {
      message: "Which destination would you like me to plan an itinerary for?",
      intent: "INFO_ITINERARY",
      state: classified.params,
      needsMoreInfo: true,
    };
  }

  // Get web info to enhance LLM response
  const webSearch = await searchWeb(`${nights || 3} day itinerary ${destination}`, destination);

  // Use LLM to generate itinerary
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const systemPrompt = `You are a travel expert. Create a detailed ${nights || 3}-day itinerary for ${destination}.

Include:
- Day-by-day breakdown with morning, afternoon, evening activities
- Must-see attractions
- Restaurant recommendations
- Practical tips

${webSearch.answer ? `Use this info: ${webSearch.answer}` : ""}

Keep it concise but informative. Use emojis for visual appeal.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const itinerary = completion.choices[0]?.message?.content || "";

      // Also include web sources
      const infoResults: SearchResultItem[] = webSearch.results.slice(0, 2).map((r, i) => ({
        type: "info" as const,
        id: `info-${i}`,
        title: r.title,
        subtitle: r.content.substring(0, 100) + "...",
        details: { source: new URL(r.url).hostname },
        url: r.url,
      }));

      return {
        message: itinerary,
        intent: "INFO_ITINERARY",
        searchResults: infoResults.length > 0 ? infoResults : undefined,
        webSources: webSearch.results,
        state: classified.params,
        needsMoreInfo: false,
      };
    } catch (error) {
      console.error("OpenAI error:", error);
    }
  }

  // Fallback without LLM
  return handleInfoQuery(message, classified, history);
}

// Handle general chat
async function handleGeneralChat(
  message: string,
  classified: ClassifiedIntent,
  history: { role: string; content: string }[]
): Promise<ChatResponse> {

  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a friendly travel assistant. Keep responses brief and helpful. If the user seems to want to book travel or get destination info, guide them to ask about specific destinations, flights, or hotels."
          },
          ...history.slice(-4).map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: message },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      return {
        message: completion.choices[0]?.message?.content || "How can I help you with your travel plans today?",
        intent: "GENERAL",
        state: classified.params,
        needsMoreInfo: false,
      };
    } catch (error) {
      console.error("OpenAI error:", error);
    }
  }

  // Fallback response
  return {
    message: "I'm here to help with your travel plans! You can ask me to find flights, hotels, or get information about destinations. Where would you like to go?",
    intent: "GENERAL",
    state: classified.params,
    needsMoreInfo: false,
  };
}

// ============================================
// Helper Functions
// ============================================

function getMissingParamMessage(param: string): string {
  const messages: Record<string, string> = {
    origin: "Where will you be traveling from?",
    destination: "Where would you like to go?",
    departureDate: "When would you like to travel?",
    checkIn: "When would you like to check in?",
  };
  return messages[param] || "Could you provide more details?";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatDisplayDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

// Web search helper
async function searchWeb(query: string, destination: string): Promise<{ answer?: string; results: WebSource[] }> {
  try {
    // Try Tavily first
    if (process.env.TAVILY_API_KEY) {
      const result = await tavilyAPI.search({
        query: `${query} ${destination} travel`,
        max_results: 3,
        include_answer: true,
        search_depth: "basic",
      });

      return {
        answer: result.answer,
        results: result.results.map(r => ({
          title: r.title,
          content: r.content,
          url: r.url,
        })),
      };
    }

    // Fallback to Brave
    if (process.env.BRAVE_SEARCH_API_KEY) {
      const result = await braveSearchAPI.search({
        query: `${query} ${destination}`,
        count: 3
      });

      return {
        results: result.web?.results?.map((r: { title: string; url: string; description: string }) => ({
          title: r.title,
          content: r.description,
          url: r.url,
        })) || [],
      };
    }
  } catch (error) {
    console.error("Web search error:", error);
  }

  return { results: [] };
}

// Transform Amadeus flight results
function transformFlightResults(data: any, params: ExtractedParams): SearchResultItem[] {
  const offers = data?.data || [];

  return offers.slice(0, 5).map((offer: any, index: number) => {
    const firstSegment = offer.itineraries?.[0]?.segments?.[0];
    const lastSegment = offer.itineraries?.[0]?.segments?.slice(-1)[0];
    const segments = offer.itineraries?.[0]?.segments || [];

    const departure = firstSegment?.departure?.at?.split("T")[1]?.slice(0, 5) || "N/A";
    const arrival = lastSegment?.arrival?.at?.split("T")[1]?.slice(0, 5) || "N/A";
    const carrier = firstSegment?.carrierCode || "XX";
    const flightNum = firstSegment?.number || "000";

    // Calculate duration
    const duration = offer.itineraries?.[0]?.duration?.replace("PT", "").toLowerCase() || "N/A";
    const stops = segments.length - 1;

    return {
      type: "flight" as const,
      id: offer.id || `flight-${index}`,
      title: `${params.origin?.toUpperCase()} → ${params.destination?.toUpperCase()}`,
      subtitle: getAirlineName(carrier),
      price: Math.round(parseFloat(offer.price?.total || 0) * 85), // Convert to INR
      details: {
        departure,
        arrival,
        duration: duration.replace("h", "h ").replace("m", "m"),
        stops: stops === 0 ? "Non-stop" : `${stops} stop(s)`,
        flightNumber: `${carrier} ${flightNum}`,
        origin: firstSegment?.departure?.iataCode || "",
        destination: lastSegment?.arrival?.iataCode || "",
      },
    };
  });
}

function getAirlineName(code: string): string {
  const airlines: Record<string, string> = {
    "AI": "Air India", "6E": "IndiGo", "UK": "Vistara",
    "SG": "SpiceJet", "G8": "GoAir", "IX": "Air India Express",
    "QP": "Akasa Air", "EK": "Emirates", "EY": "Etihad",
    "QR": "Qatar Airways", "SQ": "Singapore Airlines",
    "TG": "Thai Airways", "BA": "British Airways",
  };
  return airlines[code] || code;
}

// Generate fallback flight results
function generateFallbackFlights(params: ExtractedParams): SearchResultItem[] {
  const prices = [9055, 9313, 10798, 12500, 14200];
  const times = [
    { dep: "06:15", arr: "09:20" },
    { dep: "10:30", arr: "13:45" },
    { dep: "14:00", arr: "17:15" },
    { dep: "18:30", arr: "21:45" },
    { dep: "21:00", arr: "00:15" },
  ];

  return prices.map((price, i) => ({
    type: "flight" as const,
    id: `fallback-flight-${i}`,
    title: `${capitalize(params.origin || "DEL")} → ${capitalize(params.destination || "BLR")}`,
    subtitle: ["Air India", "IndiGo", "Vistara", "SpiceJet", "Akasa Air"][i],
    price,
    details: {
      departure: times[i].dep,
      arrival: times[i].arr,
      duration: "2h 30m",
      stops: i % 2 === 0 ? "Non-stop" : "1 stop",
      flightNumber: `${["AI", "6E", "UK", "SG", "QP"][i]} ${1000 + i * 123}`,
    },
  }));
}

// Generate hotel results
function generateHotelResults(destination: string): SearchResultItem[] {
  const hotels = [
    { name: "Taj Hotel", rating: 5, price: 12500 },
    { name: "Marriott", rating: 5, price: 9800 },
    { name: "Hyatt Regency", rating: 4, price: 7500 },
    { name: "Radisson Blu", rating: 4, price: 5500 },
    { name: "Holiday Inn", rating: 3, price: 3500 },
  ];

  return hotels.map((hotel, i) => ({
    type: "hotel" as const,
    id: `hotel-${i}`,
    title: `${hotel.name} ${capitalize(destination)}`,
    subtitle: `${"⭐".repeat(hotel.rating)} • ${destination}`,
    price: hotel.price,
    details: {
      rating: hotel.rating.toString(),
      location: destination,
    },
  }));
}
