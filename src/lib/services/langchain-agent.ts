/**
 * LangChain Agent for Travel Assistant
 * 
 * Uses LangChain with OpenAI for intelligent conversation
 * with tools for flight search, hotel search, and RAG
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { amadeusAPI } from "@/lib/api/amadeus";
import { getPersonalityContext, searchSimilarContent } from "./rag-service";

// Initialize LLM
const llm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Common city to IATA code mapping (for fast lookup)
const cityToIATA: Record<string, string> = {
  // India - Major cities
  "delhi": "DEL", "new delhi": "DEL", "mumbai": "BOM", "bombay": "BOM",
  "bangalore": "BLR", "bengaluru": "BLR", "chennai": "MAA", "kolkata": "CCU",
  "hyderabad": "HYD", "pune": "PNQ", "ahmedabad": "AMD", "jaipur": "JAI",
  "goa": "GOI", "kochi": "COK", "chandigarh": "IXC", "lucknow": "LKO",

  // International hubs
  "new york": "JFK", "london": "LHR", "paris": "CDG", "dubai": "DXB",
  "singapore": "SIN", "bangkok": "BKK", "tokyo": "NRT", "hong kong": "HKG",
  "sydney": "SYD", "los angeles": "LAX", "san francisco": "SFO",
  "washington": "DCA", "washington dc": "DCA", "chicago": "ORD",
};

// Neighborhood to city IATA mapping
const neighborhoodToCity: Record<string, string> = {
  // Bangalore neighborhoods
  "koramangala": "BLR", "indiranagar": "BLR", "whitefield": "BLR", "electronic city": "BLR",
  "hsr layout": "BLR", "jp nagar": "BLR", "jayanagar": "BLR", "marathahalli": "BLR",
  "mg road": "BLR", "brigade road": "BLR", "ulsoor": "BLR", "malleshwaram": "BLR",

  // Mumbai neighborhoods
  "bandra": "BOM", "andheri": "BOM", "juhu": "BOM", "powai": "BOM", "worli": "BOM",
  "colaba": "BOM", "lower parel": "BOM", "goregaon": "BOM", "malad": "BOM",

  // Delhi neighborhoods
  "connaught place": "DEL", "karol bagh": "DEL", "paharganj": "DEL", "dwarka": "DEL",
  "greater kailash": "DEL", "hauz khas": "DEL", "defence colony": "DEL", "lajpat nagar": "DEL",

  // Hyderabad neighborhoods
  "banjara hills": "HYD", "jubilee hills": "HYD", "hitech city": "HYD", "gachibowli": "HYD",
  "madhapur": "HYD", "secunderabad": "HYD", "kukatpally": "HYD",

  // Chennai neighborhoods
  "t nagar": "MAA", "anna nagar": "MAA", "adyar": "MAA", "velachery": "MAA",
  "mylapore": "MAA", "egmore": "MAA", "nungambakkam": "MAA",

  // Pune neighborhoods
  "koregaon park": "PNQ", "viman nagar": "PNQ", "kalyani nagar": "PNQ", "hinjewadi": "PNQ",
  "kothrud": "PNQ", "baner": "PNQ", "aundh": "PNQ",

  // International neighborhoods
  "manhattan": "JFK", "brooklyn": "JFK", "queens": "JFK", "times square": "JFK",
  "downtown": "JFK", "midtown": "JFK",
};

// Cache for dynamically looked up codes
const iataCache: Record<string, string> = {};

/**
 * Get IATA code for a city/neighborhood - uses Amadeus API for unknown locations
 */
async function getIATACode(city: string): Promise<string> {
  const normalized = city.toLowerCase().trim();

  // Check city mapping first
  if (cityToIATA[normalized]) {
    return cityToIATA[normalized];
  }

  // Check neighborhood mapping
  if (neighborhoodToCity[normalized]) {
    console.log(`📍 ${city} is a neighborhood, using city code: ${neighborhoodToCity[normalized]}`);
    return neighborhoodToCity[normalized];
  }

  // Check cache
  if (iataCache[normalized]) {
    return iataCache[normalized];
  }

  // If it's already 3 letters, assume it's an IATA code
  if (city.length === 3 && /^[A-Za-z]+$/.test(city)) {
    return city.toUpperCase();
  }

  // Use Amadeus API to look up the airport code
  try {
    console.log(`🔍 Looking up IATA code for: ${city}`);
    const data = await amadeusAPI.searchLocations(city, "CITY,AIRPORT");
    const locations = (data as any)?.data || [];

    if (locations.length > 0) {
      // Prefer airport codes over city codes
      const airport = locations.find((l: any) => l.subType === "AIRPORT") || locations[0];
      const code = airport.iataCode;

      // Cache the result
      iataCache[normalized] = code;
      console.log(`✅ Found IATA code for ${city}: ${code}`);
      return code;
    }
  } catch (error) {
    console.error(`Failed to lookup IATA for ${city}:`, error);
  }

  console.warn(`⚠️ Could not find IATA code for: ${city}`);
  return city.toUpperCase().slice(0, 3); // Last resort
}

// Define Tools
const searchFlightsTool = tool(
  async ({ origin, destination, date, travelers }) => {
    try {
      console.log("🔍 Flight Search Tool Called:");
      console.log("  Origin:", origin);
      console.log("  Destination:", destination);
      console.log("  Date:", date);
      console.log("  Travelers:", travelers);

      const originCode = await getIATACode(origin);
      const destCode = await getIATACode(destination);

      console.log("  Origin Code:", originCode);
      console.log("  Dest Code:", destCode);

      const data = await amadeusAPI.searchFlights({
        originLocationCode: originCode,
        destinationLocationCode: destCode,
        departureDate: date,
        adults: travelers || 1,
      });

      console.log("  Amadeus Response:", JSON.stringify(data).slice(0, 200));

      // Get up to 15 flights for "Load More" functionality
      const offers = (data as any)?.data?.slice(0, 15) || [];
      
      if (offers.length === 0) {
        return JSON.stringify({ found: false, message: "No flights found for this route and date." });
      }

      const flights = offers.map((offer: any) => {
        const seg = offer.itineraries?.[0]?.segments?.[0];
        return {
          airline: seg?.carrierCode || "Unknown",
          flightNumber: `${seg?.carrierCode} ${seg?.number}`,
          departure: seg?.departure?.at?.split("T")[1]?.slice(0, 5) || "N/A",
          arrival: offer.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.at?.split("T")[1]?.slice(0, 5) || "N/A",
          price: `₹${Math.round(parseFloat(offer.price?.total || 0) * 85)}`,
          duration: offer.itineraries?.[0]?.duration?.replace("PT", "") || "N/A",
        };
      });

      return JSON.stringify({ 
        found: true, 
        flights,
        searchParams: { origin: originCode, destination: destCode, date }
      });
    } catch (error) {
      console.error("Flight search error:", error);
      return JSON.stringify({ found: false, error: "Failed to search flights. Please try again." });
    }
  },
  {
    name: "search_flights",
    description: "Search for available flights between two cities on a specific date",
    schema: z.object({
      origin: z.string().describe("Origin city name (e.g., Delhi, Mumbai, London)"),
      destination: z.string().describe("Destination city name"),
      date: z.string().describe("Departure date in YYYY-MM-DD format"),
      travelers: z.number().optional().describe("Number of travelers (default: 1)"),
    }),
  }
);

const searchHotelsTool = tool(
  async ({ city, checkIn, checkOut, guests }) => {
    try {
      const cityCode = await getIATACode(city);

      // Get hotels by city
      const hotelsData = await amadeusAPI.searchHotelsByCity({ cityCode });
      const hotels = ((hotelsData as any)?.data || []).slice(0, 5);

      if (hotels.length === 0) {
        return JSON.stringify({ found: false, message: "No hotels found in this city." });
      }

      const hotelList = hotels.map((hotel: any) => ({
        name: hotel.name || "Unknown Hotel",
        rating: hotel.rating || "N/A",
        address: hotel.address?.lines?.join(", ") || "Address not available",
        hotelId: hotel.hotelId,
      }));

      return JSON.stringify({ 
        found: true, 
        hotels: hotelList,
        searchParams: { city: cityCode, checkIn, checkOut, guests }
      });
    } catch (error) {
      console.error("Hotel search error:", error);
      return JSON.stringify({ found: false, error: "Failed to search hotels. Please try again." });
    }
  },
  {
    name: "search_hotels",
    description: "Search for hotels in a city for specific dates",
    schema: z.object({
      city: z.string().describe("City name to search hotels in"),
      checkIn: z.string().describe("Check-in date in YYYY-MM-DD format"),
      checkOut: z.string().optional().describe("Check-out date in YYYY-MM-DD format"),
      guests: z.number().optional().describe("Number of guests (default: 1)"),
    }),
  }
);

const searchKnowledgeTool = tool(
  async ({ query }) => {
    try {
      const chunks = await searchSimilarContent(query, { limit: 3, threshold: 0.6 });
      
      if (chunks.length === 0) {
        return JSON.stringify({ found: false });
      }

      return JSON.stringify({
        found: true,
        context: chunks.map(c => c.content).join("\n\n"),
      });
    } catch (error) {
      return JSON.stringify({ found: false });
    }
  },
  {
    name: "search_knowledge",
    description: "Search the knowledge base for relevant information about travel, policies, or FAQs",
    schema: z.object({
      query: z.string().describe("Search query for the knowledge base"),
    }),
  }
);

// All available tools
const tools = [searchFlightsTool, searchHotelsTool, searchKnowledgeTool];

// Bind tools to LLM
const llmWithTools = llm.bindTools(tools);

export interface AgentResponse {
  message: string;
  toolCalls?: Array<{
    name: string;
    result: any;
  }>;
  searchResults?: any[];
}

/**
 * Run the LangChain agent
 */
export async function runAgent(
  userMessage: string,
  history: Array<{ role: string; content: string }> = []
): Promise<AgentResponse> {
  try {
    // Get personality context from RAG
    let personalityContext = "";
    try {
      personalityContext = await getPersonalityContext(userMessage);
      console.log("RAG Personality Context:", personalityContext ? personalityContext.slice(0, 200) + "..." : "NONE");
    } catch (e) {
      console.log("No personality context available:", e);
    }

    // Build system message - RAG personality takes priority if available
    let systemPrompt: string;

    if (personalityContext && personalityContext.length > 50) {
      // Use RAG-defined personality as primary identity
      systemPrompt = `${personalityContext}

ADDITIONAL CAPABILITIES:
- You can search for flights between cities
- You can search for hotels in cities
- You can help users book travel
- Format prices in INR (₹)
- Today's date is ${new Date().toISOString().split("T")[0]}

When users want to search flights/hotels, use the available tools.
When presenting search results, format them nicely with emojis.`;
    } else {
      // Default fallback personality
      systemPrompt = `You are a friendly and helpful AI travel assistant. Your goal is to help users plan trips, find flights, book hotels, and provide travel advice.

Guidelines:
- Be conversational and friendly
- When users want to search flights/hotels, use the available tools
- Ask clarifying questions if information is missing (origin, destination, dates)
- Provide helpful travel tips when relevant
- Format prices in INR (₹)
- Today's date is ${new Date().toISOString().split("T")[0]}

When presenting search results, format them nicely with emojis.`;
    }

    console.log("System Prompt (first 300 chars):", systemPrompt.slice(0, 300));

    // Convert history to LangChain messages
    const messages: (SystemMessage | HumanMessage | AIMessage)[] = [
      new SystemMessage(systemPrompt),
    ];

    for (const msg of history.slice(-10)) {
      if (msg.role === "user") {
        messages.push(new HumanMessage(msg.content));
      } else if (msg.role === "assistant") {
        messages.push(new AIMessage(msg.content));
      }
    }

    messages.push(new HumanMessage(userMessage));

    // First LLM call
    const response = await llmWithTools.invoke(messages);

    const toolCalls: Array<{ name: string; result: any }> = [];
    let searchResults: any[] = [];

    // Check if there are tool calls
    if (response.tool_calls && response.tool_calls.length > 0) {
      for (const toolCall of response.tool_calls) {
        const toolName = toolCall.name;
        const toolArgs = toolCall.args;

        // Execute the tool
        let result: string;
        if (toolName === "search_flights") {
          const toolResult = await searchFlightsTool.invoke(toolArgs as any);
          result = typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult);
        } else if (toolName === "search_hotels") {
          const toolResult = await searchHotelsTool.invoke(toolArgs as any);
          result = typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult);
        } else if (toolName === "search_knowledge") {
          const toolResult = await searchKnowledgeTool.invoke(toolArgs as any);
          result = typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult);
        } else {
          result = JSON.stringify({ error: "Unknown tool" });
        }

        const parsedResult = JSON.parse(result);
        toolCalls.push({ name: toolName, result: parsedResult });

        // Convert to search results format for UI
        if (toolName === "search_flights" && parsedResult.found && parsedResult.flights) {
          searchResults = parsedResult.flights.map((f: any, i: number) => ({
            type: "flight",
            id: `flight-${i}`,
            title: `${parsedResult.searchParams.origin} → ${parsedResult.searchParams.destination}`,
            subtitle: f.airline,
            price: parseInt(f.price.replace(/[₹,]/g, "")),
            details: {
              departure: f.departure,
              arrival: f.arrival,
              duration: f.duration,
              flightNumber: f.flightNumber,
              originCode: parsedResult.searchParams.origin,
              destinationCode: parsedResult.searchParams.destination,
              date: parsedResult.searchParams.date,
              airlineCode: f.airline,
              airlineName: f.airline,
            },
          }));
        }

        // Convert hotel results to search result cards
        if (toolName === "search_hotels" && parsedResult.found && parsedResult.hotels) {
          const hotelResults = parsedResult.hotels.map((h: any, i: number) => ({
            type: "hotel",
            id: `hotel-${i}`,
            title: h.name,
            subtitle: h.address,
            price: h.price ? parseInt(h.price) : null,
            url: `https://www.google.com/travel/hotels?q=${encodeURIComponent(h.name + " " + parsedResult.searchParams.city)}`,
            details: {
              hotelId: h.hotelId,
              rating: h.rating,
              city: parsedResult.searchParams.city,
              checkIn: parsedResult.searchParams.checkIn,
              checkOut: parsedResult.searchParams.checkOut,
              guests: parsedResult.searchParams.guests,
            },
          }));
          searchResults = [...searchResults, ...hotelResults];
        }
      }

      // Second LLM call with tool results
      const flightToolCall = toolCalls.find(tc => tc.name === "search_flights");
      const hotelToolCall = toolCalls.find(tc => tc.name === "search_hotels");
      const hasFlights = flightToolCall?.result?.found === true;
      const hasHotels = hotelToolCall?.result?.found === true;
      const flightCount = flightToolCall?.result?.flights?.length || 0;
      const hotelCount = hotelToolCall?.result?.hotels?.length || 0;

      // Check for no results found
      const noFlightsFound = flightToolCall && !hasFlights;
      const noHotelsFound = hotelToolCall && !hasHotels;

      // Create a summary for the LLM instead of full results
      let resultsSummary = "";
      let noResultsMessage = "";

      if (hasFlights) {
        const searchParams = flightToolCall?.result?.searchParams;
        resultsSummary += `Found ${flightCount} flights from ${searchParams?.origin} to ${searchParams?.destination} on ${searchParams?.date}. `;
      }
      if (hasHotels) {
        const searchParams = hotelToolCall?.result?.searchParams;
        resultsSummary += `Found ${hotelCount} hotels in ${searchParams?.city}. `;
      }
      if (noFlightsFound) {
        noResultsMessage += `No flights were found for this route. This could be because: 1) The airport is too small with limited service, 2) No flights on this date, or 3) Try nearby major airports. `;
      }
      if (noHotelsFound) {
        noResultsMessage += `No hotels were found in this location. `;
      }

      messages.push(new AIMessage(response.content as string || "Let me search for that..."));

      // Different prompt based on whether results were found
      if (resultsSummary) {
        messages.push(new HumanMessage(`Search completed: ${resultsSummary}

IMPORTANT: The results are being displayed as interactive cards below your message.
DO NOT list the individual flights/hotels in your response - they will appear as visual cards.
Just write a brief, friendly message acknowledging the search results are shown below.
Example: "Here are the available flights! Click 'Book' on any option to proceed. ✈️"`));
      } else if (noResultsMessage) {
        messages.push(new HumanMessage(`Search completed but NO RESULTS found: ${noResultsMessage}

Please inform the user apologetically that no results were found. Suggest alternatives like:
- Try searching from a nearby major city/airport
- Try different dates
- The route might not have direct flights

Be helpful and offer to search again with different parameters.`));
      }

      const finalResponse = await llm.invoke(messages);

      return {
        message: finalResponse.content as string,
        toolCalls,
        searchResults: searchResults.length > 0 ? searchResults : undefined,
      };
    }

    return {
      message: response.content as string,
    };

  } catch (error) {
    console.error("Agent error:", error);
    return {
      message: "I apologize, but I encountered an error. Please try again or rephrase your request.",
    };
  }
}

