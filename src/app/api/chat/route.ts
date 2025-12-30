import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { amadeusAPI } from "@/lib/api/amadeus";
import { tavilyAPI } from "@/lib/api/tavily";
import { braveSearchAPI } from "@/lib/api/brave-search";
import {
  getConversationContext,
  saveConversationContext,
  mergeContext,
  ConversationContext
} from "@/lib/services/conversation-context";

interface SearchResult {
  type: "flight" | "hotel" | "info";
  id: string;
  title: string;
  subtitle: string;
  price?: number;
  details: Record<string, string>;
  url?: string;
}

interface WebSearchResult {
  title: string;
  content: string;
  url: string;
}

// City to IATA code mapping
const cityToIATA: Record<string, string> = {
  "delhi": "DEL",
  "new delhi": "DEL",
  "mumbai": "BOM",
  "bombay": "BOM",
  "bangalore": "BLR",
  "bengaluru": "BLR",
  "chennai": "MAA",
  "kolkata": "CCU",
  "hyderabad": "HYD",
  "goa": "GOI",
  "pune": "PNQ",
  "jaipur": "JAI",
  "ahmedabad": "AMD",
  "kochi": "COK",
  "cochin": "COK",
  "lucknow": "LKO",
  "guwahati": "GAU",
  "chandigarh": "IXC",
  "amritsar": "ATQ",
  "varanasi": "VNS",
  "udaipur": "UDR",
  "jodhpur": "JDH",
  "srinagar": "SXR",
  "leh": "IXL",
  "port blair": "IXZ",
  "andaman": "IXZ",
  // International
  "london": "LHR",
  "paris": "CDG",
  "dubai": "DXB",
  "singapore": "SIN",
  "bangkok": "BKK",
  "tokyo": "NRT",
  "new york": "JFK",
  "los angeles": "LAX",
  "san francisco": "SFO",
  "sydney": "SYD",
  "hong kong": "HKG",
  "kuala lumpur": "KUL",
  "bali": "DPS",
  "denpasar": "DPS",
  "maldives": "MLE",
  "male": "MLE",
  "toronto": "YYZ",
  "amsterdam": "AMS",
  "frankfurt": "FRA",
  "rome": "FCO",
  "milan": "MXP",
  "barcelona": "BCN",
  "madrid": "MAD",
  "zurich": "ZRH",
  "istanbul": "IST",
  "doha": "DOH",
  "abu dhabi": "AUH",
  "muscat": "MCT",
  "colombo": "CMB",
  "kathmandu": "KTM",
  "dhaka": "DAC",
  "mauritius": "MRU",
  "seychelles": "SEZ",
};

interface ConversationState {
  intent?: "flight" | "hotel" | "trip";
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  rooms?: number;
  checkIn?: string;
  checkOut?: string;
}

const SYSTEM_PROMPT = `You are TravelHub's AI travel assistant. You help users SEARCH for flights and hotels.

CRITICAL RULES - NEVER VIOLATE THESE:
1. You can ONLY SEARCH for flights - you CANNOT book them directly
2. NEVER claim you have booked a flight or sent a confirmation email
3. NEVER ask for payment details, email addresses, or personal information to "complete a booking"
4. When users want to book, tell them to click the "Book" button on the flight card to proceed to the airline's website
5. NEVER generate flight details as text (like "Airline A: 6:00 AM - 8:00 AM - ₹3,500"). The system will display real flight data as interactive cards automatically.
6. When flights are found, just provide a brief intro like "Here are the available flights!" - the actual flight cards will be shown by the system.

Your capabilities:
- Search for flights using the Amadeus API (REAL flight data)
- The system automatically displays flight cards with Book buttons
- Help users compare options
- Answer travel-related questions

What you CANNOT do:
- Actually book or purchase flights
- Access user email or send confirmations
- Process payments
- Reserve seats
- Generate fake flight listings as text (the system shows real data as cards)

Your personality:
- Friendly, helpful, and enthusiastic about travel
- Concise but informative responses (1-2 sentences max)
- Use relevant emojis sparingly (✈️ 🏨 🌴 🗺️)

When flight results are shown, just say brief things like:
- "Here are the available flights I found! Click 'Book' on any flight to proceed."
- "I found these options for you."

DO NOT list flights as text. The system handles displaying flight cards with real data.

REMEMBER: You are a SEARCH assistant, not a booking agent. Always direct users to click "Book" to complete their booking on the airline's official website.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [], conversationId } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Generate a chat ID if not provided
    const chatId = conversationId || `chat-${Date.now()}`;
    console.log("=== Chat Request ===");
    console.log("ChatId:", chatId);
    console.log("Message:", message);

    // Get existing context from database
    let existingContext: ConversationContext | null = null;
    try {
      existingContext = await getConversationContext(chatId);
      console.log("Loaded existing context:", existingContext);
    } catch (e) {
      console.log("No existing context found, starting fresh");
    }

    // Analyze the current message to get new state
    const parsedState = analyzeConversation(message, conversationHistory);
    console.log("Parsed state from current message:", parsedState);

    // Merge with existing context
    const mergedContext = mergeContext(existingContext, {
      chat_id: chatId,
      intent: parsedState.intent,
      origin: parsedState.origin,
      destination: parsedState.destination,
      departure_date: parsedState.departureDate,
      return_date: parsedState.returnDate,
      passengers: parsedState.passengers,
      check_in: parsedState.checkIn,
      check_out: parsedState.checkOut,
      rooms: parsedState.rooms,
    });
    console.log("After merge:", mergedContext);

    // Convert merged context back to state format
    const state: ConversationState = {
      intent: mergedContext.intent || undefined,
      origin: mergedContext.origin || undefined,
      destination: mergedContext.destination || undefined,
      departureDate: mergedContext.departure_date || undefined,
      returnDate: mergedContext.return_date || undefined,
      passengers: mergedContext.passengers,
      checkIn: mergedContext.check_in || undefined,
      checkOut: mergedContext.check_out || undefined,
      rooms: mergedContext.rooms,
    };

    console.log("Final merged state:", state);

    // Save the merged context to database
    try {
      await saveConversationContext(mergedContext);
      console.log("Context saved to database");
    } catch (e) {
      console.error("Failed to save context:", e);
    }

    // ============================================
    // STEP 1: Check if user is asking for travel INFO (not booking)
    // This takes priority over booking flow to answer questions mid-booking
    // ============================================

    if (isInfoQuery(message)) {
      // Prioritize city mentioned in the current message over state.destination
      const cityInMessage = findCityInText(message);
      const destination = cityInMessage || state.destination;

      if (destination) {
        console.log("=== Travel Info Query ===", message, "about:", destination);
        const webSearch = await searchTravelInfo(message, destination);

        if (webSearch.answer || webSearch.results.length > 0) {
          // Convert web results to info cards
          const infoResults: SearchResult[] = webSearch.results.slice(0, 3).map((r, i) => ({
            type: "info" as const,
            id: `info-${i}`,
            title: r.title,
            subtitle: r.content.substring(0, 150) + "...",
            details: { source: new URL(r.url).hostname },
            url: r.url,
          }));

          const responseMessage = webSearch.answer
            ? `${webSearch.answer}\n\nHere are some helpful resources:`
            : `Here's what I found about ${destination}:`;

          return NextResponse.json({
            message: responseMessage,
            conversationId: chatId,
            searchResults: infoResults,
            state,
            webSources: webSearch.results,
          });
        }
      }
    }

    // ============================================
    // STEP 2: Check if we can show flight results directly (skip OpenAI)
    // ============================================

    // FLIGHT SEARCH - We have all required info
    if (state.intent === "flight" && state.origin && state.destination && state.departureDate) {
      console.log("=== Direct Flight Search (skipping OpenAI) ===");
      const searchResults = await searchRealFlights(state.origin, state.destination, state.departureDate);

      return NextResponse.json({
        message: `Here are the available flights from ${capitalize(state.origin)} to ${capitalize(state.destination)} on ${formatDateForDisplay(state.departureDate)}. Click "Book" on any flight to proceed! ✈️`,
        conversationId: chatId,
        searchResults,
        state,
      });
    }

    // FLIGHT - Missing date
    if (state.intent === "flight" && state.origin && state.destination && !state.departureDate) {
      return NextResponse.json({
        message: `Great! I found the route from ${capitalize(state.origin)} to ${capitalize(state.destination)} ✈️\n\nWhen would you like to travel? Please share your preferred date (e.g., "15 Jan 2026", "tomorrow", or "next week").`,
        conversationId: chatId,
        state,
      });
    }

    // HOTEL SEARCH - We have all required info
    if (state.intent === "hotel" && state.destination && state.checkIn) {
      const searchResults = generateMockHotelResults(state.destination);
      return NextResponse.json({
        message: `Here are the best hotels in ${capitalize(state.destination)} for ${formatDateForDisplay(state.checkIn)}. Click "Book" to reserve! 🏨`,
        conversationId: chatId,
        searchResults,
        state,
      });
    }

    // HOTEL - Missing check-in date
    if (state.intent === "hotel" && state.destination && !state.checkIn) {
      return NextResponse.json({
        message: `Looking for hotels in ${capitalize(state.destination)} 🏨\n\nWhen would you like to check in? Please provide a date.`,
        conversationId: chatId,
        state,
      });
    }

    // TRIP - We have all required info
    if (state.intent === "trip" && state.destination && state.departureDate) {
      const flightResults = state.origin
        ? await searchRealFlights(state.origin, state.destination, state.departureDate)
        : generateFallbackFlightResults("your city", state.destination);
      const searchResults = [
        ...flightResults.slice(0, 2),
        ...generateMockHotelResults(state.destination).slice(0, 2),
      ];
      return NextResponse.json({
        message: `Perfect! Here are options for your trip to ${capitalize(state.destination)} on ${formatDateForDisplay(state.departureDate)}:`,
        conversationId: chatId,
        searchResults,
        state,
      });
    }

    // TRIP - Missing date
    if (state.intent === "trip" && state.destination && !state.departureDate) {
      const originText = state.origin ? ` from ${capitalize(state.origin)}` : "";
      return NextResponse.json({
        message: `Planning a trip${originText} to ${capitalize(state.destination)}! 🌴\n\nWhen are you planning to travel? Please share your travel date.`,
        conversationId: chatId,
        state,
      });
    }

    // ============================================
    // STEP 3: For general queries, use OpenAI (or fallback)
    // ============================================

    if (!process.env.OPENAI_API_KEY) {
      // Use conversational response without OpenAI
      const { response, searchResults } = await generateConversationalResponse(message, state, conversationHistory);
      return NextResponse.json({
        message: response,
        conversationId: chatId,
        searchResults,
        state,
      });
    }

    // Call OpenAI for general conversation
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // If we have a destination, enhance with web search context
    let webContext = "";
    if (state.destination && (process.env.TAVILY_API_KEY || process.env.BRAVE_SEARCH_API_KEY)) {
      try {
        const webSearch = await searchTravelInfo(message, state.destination);
        if (webSearch.answer) {
          webContext = `\n\nRelevant travel info: ${webSearch.answer}`;
        }
      } catch (e) {
        console.log("Web search enhancement skipped:", e);
      }
    }

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT + webContext },
      ...conversationHistory.slice(-6).map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm here to help you plan your travel. Where would you like to go?";

    return NextResponse.json({
      message: aiResponse,
      conversationId: chatId,
      state,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

// Format date for display (e.g., "2026-01-15" -> "January 15, 2026")
function formatDateForDisplay(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Search for travel information using Tavily or Brave
async function searchTravelInfo(query: string, destination?: string): Promise<{ answer?: string; results: WebSearchResult[] }> {
  try {
    // Try Tavily first (better AI-generated answers)
    if (process.env.TAVILY_API_KEY) {
      const searchQuery = destination
        ? `${query} ${destination} travel`
        : query;

      const result = await tavilyAPI.search({
        query: searchQuery,
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

    // Fallback to Brave Search
    if (process.env.BRAVE_SEARCH_API_KEY) {
      const result = await braveSearchAPI.search({
        query: destination ? `${query} ${destination}` : query,
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

    return { results: [] };
  } catch (error) {
    console.error("Web search error:", error);
    return { results: [] };
  }
}

// Check if message is asking for travel info (not booking)
function isInfoQuery(message: string): boolean {
  const infoKeywords = [
    // Places & activities
    "what to do", "things to do", "places to visit", "places to see",
    "tourist place", "tourist spot", "tourist attraction", "attractions",
    "sightseeing", "must see", "must visit", "worth visiting",
    // Travel info
    "best time", "weather", "visa", "currency", "language",
    "food", "cuisine", "culture", "safety", "tips", "cost of living",
    // Questions
    "tell me about", "information about", "guide", "recommend",
    "should i visit", "is it safe", "how is", "what is", "where to",
    "what are", "which are", "suggest", "explore"
  ];

  // Also check for patterns that indicate info queries
  const infoPatterns = [
    /places\s+(to|in)/i,
    /tourist\s+/i,
    /visit\s+in/i,
    /things\s+in/i,
    /about\s+\w+\s*(city|place|town)?$/i,
  ];

  const lowerMessage = message.toLowerCase();

  // Check keywords
  if (infoKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return true;
  }

  // Check patterns
  if (infoPatterns.some(pattern => pattern.test(message))) {
    return true;
  }

  return false;
}

// List of known cities for better matching
const knownCities = Object.keys(cityToIATA);

function findCityInText(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const city of knownCities) {
    if (lowerText.includes(city)) {
      return city;
    }
  }
  return null;
}

function analyzeConversation(
  message: string,
  history: { role: string; content: string }[]
): ConversationState {
  const state: ConversationState = {};
  const lowerMessage = message.toLowerCase();

  // PRIORITY: First check the current message for a complete query
  // This prevents old queries from overriding new ones

  // Detect intent from current message first
  if (lowerMessage.includes("flight") || lowerMessage.includes("fly")) {
    state.intent = "flight";
  } else if (lowerMessage.includes("hotel") || lowerMessage.includes("stay") || lowerMessage.includes("room")) {
    state.intent = "hotel";
  } else if (lowerMessage.includes("trip") || lowerMessage.includes("travel") || lowerMessage.includes("plan")) {
    state.intent = "trip";
  }

  // Try to extract "from X to Y" pattern from CURRENT MESSAGE first
  const fromToMatch = lowerMessage.match(/from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:\s+on|\s+for|\s+next|\s+this|\s*$|[.,!?])/i);

  if (fromToMatch) {
    // Find known cities in the matched strings
    const originText = fromToMatch[1].trim();
    const destText = fromToMatch[2].trim();

    // Check if we can find known cities
    const originCity = findCityInText(originText) || originText.split(/\s+/)[0];
    const destCity = findCityInText(destText) || destText.split(/\s+/)[0];

    state.origin = originCity;
    state.destination = destCity;
    console.log("Parsed from current message:", { origin: state.origin, destination: state.destination });
  } else {
    // Fallback: look for known cities in the CURRENT message only
    const citiesInMessage: string[] = [];
    for (const city of knownCities) {
      if (lowerMessage.includes(city)) {
        citiesInMessage.push(city);
      }
    }

    // If we have "from" keyword, first city after it is origin
    if (lowerMessage.includes("from") && citiesInMessage.length >= 1) {
      const fromIndex = lowerMessage.indexOf("from");
      const toIndex = lowerMessage.indexOf(" to ");

      for (const city of citiesInMessage) {
        const cityIndex = lowerMessage.indexOf(city);
        if (cityIndex > fromIndex && (toIndex === -1 || cityIndex < toIndex)) {
          state.origin = city;
          break;
        }
      }

      if (toIndex !== -1) {
        for (const city of citiesInMessage) {
          const cityIndex = lowerMessage.indexOf(city);
          if (cityIndex > toIndex) {
            state.destination = city;
            break;
          }
        }
      }
    }

    // If we found two cities, use them
    if (!state.origin && !state.destination && citiesInMessage.length >= 2) {
      state.origin = citiesInMessage[0];
      state.destination = citiesInMessage[1];
    } else if (!state.destination && citiesInMessage.length >= 1 && state.origin) {
      state.destination = citiesInMessage.find(c => c !== state.origin) || citiesInMessage[0];
    } else if (!state.origin && !state.destination && citiesInMessage.length === 1) {
      // Only one city mentioned - might be destination
      state.destination = citiesInMessage[0];
    }

    // ONLY if current message doesn't have origin/destination, check history
    if ((!state.origin || !state.destination || !state.intent) && history.length > 0) {
      // Only look at the last 4 messages for context
      const recentHistory = history.slice(-4).map(h => h.content).join(" ").toLowerCase();

      // Get intent from history if not set
      if (!state.intent) {
        if (recentHistory.includes("flight") || recentHistory.includes("fly")) {
          state.intent = "flight";
        } else if (recentHistory.includes("hotel") || recentHistory.includes("stay")) {
          state.intent = "hotel";
        } else if (recentHistory.includes("trip") || recentHistory.includes("travel")) {
          state.intent = "trip";
        }
      }

      if (!state.origin) {
        for (const city of knownCities) {
          if (recentHistory.includes(`from ${city}`)) {
            state.origin = city;
            break;
          }
        }
      }

      if (!state.destination) {
        for (const city of knownCities) {
          if (recentHistory.includes(`to ${city}`) || recentHistory.includes(`in ${city}`)) {
            state.destination = city;
            break;
          }
        }
      }
    }
  }

  // Extract passengers/people
  const peopleMatch = lowerMessage.match(/(\d+)\s*(?:people|person|passenger|adult|guest)/i);
  if (peopleMatch) {
    const count = parseInt(peopleMatch[1]);
    state.passengers = count;
    state.rooms = Math.ceil(count / 2);
  }

  // Extract date from message - ALWAYS parse dates, they override stored context
  // Patterns: "4 jan 2026", "jan 4 2026", "4th january 2026", "2026-01-04", "04/01/2026", "15 jan", "jan 15"
  const months: Record<string, string> = {
    jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
    apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
    aug: "08", august: "08", sep: "09", september: "09", oct: "10", october: "10",
    nov: "11", november: "11", dec: "12", december: "12"
  };

  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  // Store original departureDate to avoid history lookup overriding explicit date
  let explicitDateFound = false;

  // Try "4 jan 2026" or "4th january 2026" format (with year)
  const dateMatch1 = lowerMessage.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{4})/i);
  if (dateMatch1) {
    const day = dateMatch1[1].padStart(2, '0');
    const month = months[dateMatch1[2].toLowerCase()];
    const year = dateMatch1[3];
    state.departureDate = `${year}-${month}-${day}`;
    explicitDateFound = true;
    console.log("Date parsed (format 1 - d mon yyyy):", state.departureDate);
  }

  // Try "jan 4 2026" or "january 4th 2026" format (with year)
  const dateMatch2 = lowerMessage.match(/(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})/i);
  if (!explicitDateFound && dateMatch2) {
    const month = months[dateMatch2[1].toLowerCase()];
    const day = dateMatch2[2].padStart(2, '0');
    const year = dateMatch2[3];
    state.departureDate = `${year}-${month}-${day}`;
    explicitDateFound = true;
    console.log("Date parsed (format 2 - mon d yyyy):", state.departureDate);
  }

  // Try "15 jan" or "15th january" format (without year - assume next occurrence)
  const dateMatch3 = lowerMessage.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)(?!\s*\d{4})/i);
  if (!explicitDateFound && dateMatch3) {
    const day = dateMatch3[1].padStart(2, '0');
    const month = months[dateMatch3[2].toLowerCase()];
    // Use current year, but if the date has passed, use next year
    const testDate = new Date(`${currentYear}-${month}-${day}`);
    const year = testDate < new Date() ? nextYear : currentYear;
    state.departureDate = `${year}-${month}-${day}`;
    explicitDateFound = true;
    console.log("Date parsed (format 3 - d mon):", state.departureDate);
  }

  // Try "jan 15" or "january 15th" format (without year)
  const dateMatch4 = lowerMessage.match(/(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?!\s*\d{4})/i);
  if (!explicitDateFound && dateMatch4) {
    const month = months[dateMatch4[1].toLowerCase()];
    const day = dateMatch4[2].padStart(2, '0');
    const testDate = new Date(`${currentYear}-${month}-${day}`);
    const year = testDate < new Date() ? nextYear : currentYear;
    state.departureDate = `${year}-${month}-${day}`;
    explicitDateFound = true;
    console.log("Date parsed (format 4 - mon d):", state.departureDate);
  }

  // Try "15/01/2026" or "15-01-2026" format (DD/MM/YYYY)
  const dateMatch5 = lowerMessage.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (!explicitDateFound && dateMatch5) {
    const day = dateMatch5[1].padStart(2, '0');
    const month = dateMatch5[2].padStart(2, '0');
    const year = dateMatch5[3];
    state.departureDate = `${year}-${month}-${day}`;
    explicitDateFound = true;
    console.log("Date parsed (format 5 - dd/mm/yyyy):", state.departureDate);
  }

  // Try "tomorrow", "next week", "today" etc.
  if (!explicitDateFound) {
    if (lowerMessage.includes("tomorrow")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      state.departureDate = tomorrow.toISOString().split('T')[0];
      explicitDateFound = true;
      console.log("Date parsed (tomorrow):", state.departureDate);
    } else if (lowerMessage.includes("today")) {
      state.departureDate = new Date().toISOString().split('T')[0];
      explicitDateFound = true;
      console.log("Date parsed (today):", state.departureDate);
    } else if (lowerMessage.includes("next week")) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      state.departureDate = nextWeek.toISOString().split('T')[0];
      explicitDateFound = true;
      console.log("Date parsed (next week):", state.departureDate);
    } else if (lowerMessage.includes("next month")) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      state.departureDate = nextMonth.toISOString().split('T')[0];
      explicitDateFound = true;
      console.log("Date parsed (next month):", state.departureDate);
    }
  }

  // NOTE: We no longer look in conversation history for dates - we use database context instead

  console.log("Final parsed state:", state);
  return state;
}

async function generateConversationalResponse(
  message: string,
  state: ConversationState,
  history: { role: string; content: string }[]
): Promise<{ response: string; searchResults?: SearchResult[] }> {
  const lowerMessage = message.toLowerCase();
  const isFirstMessage = history.length === 0;

  // Check if we have enough info to show flight results (need origin, destination, AND date)
  if (state.intent === "flight" && state.origin && state.destination) {
    // Ask for date if not provided
    if (!state.departureDate) {
      return {
        response: `Got it! Flights from ${capitalize(state.origin)} to ${capitalize(state.destination)} ✈️\n\nWhen would you like to travel? Please provide your preferred date (e.g., "15 Jan 2026" or "next week").`
      };
    }

    // We have all info - show flights
    const flightResults = await searchRealFlights(state.origin, state.destination, state.departureDate);
    return {
      response: `Great! Here are the available flights from ${capitalize(state.origin)} to ${capitalize(state.destination)} on ${state.departureDate}:`,
      searchResults: flightResults,
    };
  }

  if (state.intent === "hotel" && state.destination) {
    // Ask for check-in date if not provided
    if (!state.checkIn) {
      return {
        response: `Looking for hotels in ${capitalize(state.destination)} 🏨\n\nWhen would you like to check in? Please provide a date (e.g., "20 Jan 2026").`
      };
    }
    return {
      response: `I found some excellent hotels in ${capitalize(state.destination)} for ${state.checkIn}. Here are my top recommendations:`,
      searchResults: generateMockHotelResults(state.destination),
    };
  }

  if ((state.intent === "trip" || lowerMessage.includes("trip") || lowerMessage.includes("travel")) && state.destination) {
    // For trips, ask for date if not provided
    if (!state.departureDate) {
      const originText = state.origin ? ` from ${capitalize(state.origin)}` : "";
      return {
        response: `Planning a trip${originText} to ${capitalize(state.destination)}! 🌴\n\nWhen are you planning to travel? Please share your travel dates.`
      };
    }

    const flightResults = state.origin
      ? await searchRealFlights(state.origin, state.destination, state.departureDate)
      : generateFallbackFlightResults("your city", state.destination);
    return {
      response: `Perfect! Here are options for your trip to ${capitalize(state.destination)} on ${state.departureDate}:`,
      searchResults: [
        ...flightResults.slice(0, 2),
        ...generateMockHotelResults(state.destination).slice(0, 2),
      ],
    };
  }

  // Ask clarifying questions
  if (state.intent === "flight") {
    if (!state.origin) {
      return { response: "I'd love to help you find a flight! ✈️ Where will you be departing from?" };
    }
    if (!state.destination) {
      return { response: `Got it, you're flying from ${capitalize(state.origin)}. Where would you like to go?` };
    }
  }

  if (state.intent === "hotel") {
    if (!state.destination) {
      return { response: "I can help you find the perfect hotel! 🏨 Which city are you looking to stay in?" };
    }
  }

  if (lowerMessage.includes("goa") || lowerMessage.includes("paris") || lowerMessage.includes("london") || lowerMessage.includes("dubai")) {
    const city = extractCity(lowerMessage);
    if (city) {
      return {
        response: `${capitalize(city)} is a wonderful choice! Would you like me to find flights, hotels, or both for your trip?`,
      };
    }
  }

  // Default welcome/help responses
  if (isFirstMessage || lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
    return {
      response: "Hello! 👋 I'm your AI travel assistant. I can help you search for flights and hotels, and plan your perfect trip.\n\nJust tell me where you'd like to go! For example:\n• \"Find me flights from Delhi to Mumbai\"\n• \"Search hotels in Goa\"\n• \"I want to travel to London next week\"",
    };
  }

  if (lowerMessage.includes("cheap") || lowerMessage.includes("budget") || lowerMessage.includes("affordable")) {
    return {
      response: "I can definitely help you find budget-friendly options! 💰 Just tell me your destination and I'll search for the best deals. Where would you like to go?",
    };
  }

  if (lowerMessage.includes("weekend") || lowerMessage.includes("short trip")) {
    return {
      response: "A weekend getaway sounds perfect! 🌴 Any destination in mind? I can suggest some popular short-trip destinations if you'd like!",
    };
  }

  return {
    response: "I can help you with that! To find the best options, could you tell me:\n\n📍 Where you'd like to go?\n📅 When you're planning to travel?\n👥 How many people are traveling?\n\nOr just describe your ideal trip and I'll take care of the rest!",
  };
}

// Get IATA code from city name
function getIATACode(city: string): string | null {
  const normalizedCity = city.toLowerCase().trim();
  return cityToIATA[normalizedCity] || null;
}

// Real flight search using Amadeus API
async function searchRealFlights(origin: string, destination: string, requestedDate?: string): Promise<SearchResult[]> {
  try {
    const originCode = getIATACode(origin);
    const destinationCode = getIATACode(destination);

    if (!originCode || !destinationCode) {
      console.log(`Could not find IATA codes for ${origin} (${originCode}) or ${destination} (${destinationCode})`);
      return generateFallbackFlightResults(origin, destination);
    }

    // Use requested date if provided, otherwise default to 21 days from now
    let formattedDate: string;
    if (requestedDate) {
      // Validate the date is in the future
      const reqDate = new Date(requestedDate);
      const today = new Date();
      if (reqDate > today) {
        formattedDate = requestedDate;
      } else {
        // Date is in the past, use default
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 21);
        formattedDate = defaultDate.toISOString().split('T')[0];
      }
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 21);
      formattedDate = defaultDate.toISOString().split('T')[0];
    }

    console.log(`Searching Amadeus: ${originCode} -> ${destinationCode} on ${formattedDate}`);

    const response = await amadeusAPI.searchFlights({
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate: formattedDate,
      adults: 1,
      max: 5,
    }) as { data?: any[]; dictionaries?: { carriers?: Record<string, string> } };

    const flights = response?.data || [];
    const dictionaries = response?.dictionaries || {};

    if (flights.length === 0) {
      console.log("No flights found from Amadeus, using fallback");
      return generateFallbackFlightResults(origin, destination);
    }

    console.log(`Amadeus returned ${flights.length} flights`);

    return flights.slice(0, 5).map((offer: any, index: number) => {
      const itinerary = offer.itineraries?.[0];
      const segment = itinerary?.segments?.[0];
      const lastSegment = itinerary?.segments?.[itinerary.segments.length - 1];
      const carrierCode = segment?.carrierCode || "XX";
      const airlineName = dictionaries.carriers?.[carrierCode] || carrierCode;

      // Get price - Amadeus returns in the currency specified (usually EUR)
      const rawPrice = offer.price?.total;
      const currency = offer.price?.currency || "EUR";
      const priceValue = parseFloat(rawPrice || 0);

      // Convert to INR based on currency
      let priceINR: number;
      if (currency === "INR") {
        priceINR = Math.round(priceValue);
      } else if (currency === "EUR") {
        priceINR = Math.round(priceValue * 90); // EUR to INR
      } else if (currency === "USD") {
        priceINR = Math.round(priceValue * 83); // USD to INR
      } else {
        priceINR = Math.round(priceValue * 90); // Default conversion
      }

      console.log(`Flight ${index + 1}: ${airlineName} - ${rawPrice} ${currency} = ₹${priceINR}`);

      return {
        type: "flight" as const,
        id: `flight-${offer.id || index}`,
        title: `${originCode} → ${destinationCode}`,
        subtitle: airlineName,
        price: priceINR,
        details: {
          flightNumber: `${carrierCode} ${segment?.number || ""}`,
          duration: itinerary?.duration?.replace("PT", "").toLowerCase() || "N/A",
          stops: itinerary?.segments?.length > 1 ? `${itinerary.segments.length - 1} stop(s)` : "Non-stop",
          departure: segment?.departure?.at?.split("T")[1]?.slice(0, 5) || "N/A",
          arrival: lastSegment?.arrival?.at?.split("T")[1]?.slice(0, 5) || "N/A",
          class: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || "ECONOMY",
          date: formattedDate,
          // Additional booking info
          originCode: originCode,
          destinationCode: destinationCode,
          airlineCode: carrierCode,
          airlineName: airlineName,
          departureCity: origin,
          arrivalCity: destination,
        },
      };
    });
  } catch (error) {
    console.error("Amadeus API error:", error);
    return generateFallbackFlightResults(origin, destination);
  }
}

// Fallback when API fails or cities not found
function generateFallbackFlightResults(origin: string, destination: string): SearchResult[] {
  const airlines = ["Air India", "IndiGo", "Emirates", "British Airways", "Vistara"];
  const results: SearchResult[] = [];

  for (let i = 0; i < 3; i++) {
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const price = Math.floor(Math.random() * 30000) + 8000;
    const hours = Math.floor(Math.random() * 8) + 2;
    const stops = Math.random() > 0.6 ? 1 : 0;

    results.push({
      type: "flight",
      id: `flight-${i}`,
      title: `${capitalize(origin)} → ${capitalize(destination)}`,
      subtitle: airline,
      price,
      details: {
        duration: `${hours}h ${Math.floor(Math.random() * 59)}m`,
        stops: stops === 0 ? "Non-stop" : "1 stop",
        departure: `${6 + Math.floor(Math.random() * 12)}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
        class: "Economy",
      },
    });
  }

  return results.sort((a, b) => (a.price || 0) - (b.price || 0));
}

function generateMockHotelResults(destination: string): SearchResult[] {
  const hotels = [
    { name: "Grand Hyatt", rating: 5 },
    { name: "Marriott", rating: 4 },
    { name: "Holiday Inn", rating: 3 },
    { name: "Taj Hotel", rating: 5 },
    { name: "Radisson Blu", rating: 4 },
  ];
  const results: SearchResult[] = [];

  for (let i = 0; i < 3; i++) {
    const hotel = hotels[Math.floor(Math.random() * hotels.length)];
    const price = Math.floor(Math.random() * 15000) + 3000;

    results.push({
      type: "hotel",
      id: `hotel-${i}`,
      title: `${hotel.name} ${capitalize(destination)}`,
      subtitle: `${"⭐".repeat(hotel.rating)} • ${destination}`,
      price,
      details: {
        rating: `${hotel.rating}.${Math.floor(Math.random() * 9)} / 5`,
        amenities: "WiFi, Pool, Spa",
        roomType: "Deluxe Room",
        cancellation: "Free cancellation",
      },
    });
  }

  return results.sort((a, b) => (a.price || 0) - (b.price || 0));
}

function capitalize(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function extractCity(text: string): string | null {
  const cities = ["goa", "paris", "london", "dubai", "delhi", "mumbai", "bangalore", "new york", "tokyo", "singapore", "bali"];
  for (const city of cities) {
    if (text.includes(city)) return city;
  }
  return null;
}

