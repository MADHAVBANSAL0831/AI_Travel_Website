/**
 * Intent Classification System for Travel Chatbot
 * 
 * This module analyzes user messages to determine:
 * 1. What the user wants (intent)
 * 2. What parameters are available
 * 3. What parameters are missing
 */

export type IntentType = 
  | "BOOKING_FLIGHT"
  | "BOOKING_HOTEL"
  | "BOOKING_TRIP"      // Combined flight + hotel
  | "INFO_DESTINATION"  // Places to visit, attractions
  | "INFO_ITINERARY"    // Plan my trip, itinerary
  | "INFO_GENERAL"      // Weather, visa, currency, etc.
  | "GENERAL";          // Greetings, thanks, chitchat

export interface ClassifiedIntent {
  type: IntentType;
  confidence: number;
  params: ExtractedParams;
  missingParams: string[];
  followUpQuestion?: string;
}

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

// Intent patterns with priorities (higher = more specific)
const INTENT_PATTERNS: { type: IntentType; patterns: RegExp[]; priority: number }[] = [
  // BOOKING intents (highest priority when explicit)
  {
    type: "BOOKING_FLIGHT",
    patterns: [
      /\b(book|find|search|get|show|gave)\s*(me\s*)?(a\s*)?(flights?|airfare|plane)/i,
      /\bflights?\s+(from|to)\b/i,
      /\b(fly|flying)\s+(from|to)\b/i,
      /\bfrom\s+\w+\s+to\s+\w+/i,  // "from X to Y" pattern
    ],
    priority: 10,
  },
  {
    type: "BOOKING_HOTEL",
    patterns: [
      /\b(book|find|search|get|show)\s*(me\s*)?(a\s*)?(hotels?|rooms?|stay|accommodation)/i,
      /\bhotels?\s+(in|at|near)\b/i,
      /\bstay\s+(in|at)\b/i,
      /\bwhere\s+to\s+stay\b/i,
    ],
    priority: 10,
  },
  {
    type: "BOOKING_TRIP",
    patterns: [
      /\b(plan|book|arrange)\s*(my|a)?\s*trip\b/i,
      /\btrip\s+to\b/i,
      /\bgoing\s+to\s+\w+\s+(on|next|this)/i,
    ],
    priority: 8,
  },
  // INFO intents
  {
    type: "INFO_ITINERARY",
    patterns: [
      /\bitinerary\b/i,
      /\b(plan|prepare|create|make)\s*(me\s*)?(a\s*)?(trip|travel)\s*(plan)?/i,
      /\b(\d+)\s*(day|days|night|nights)\s*(trip|plan|itinerary)?\s*(in|to|for)?\b/i,
      /\bwhat\s+to\s+do\s+for\s+\d+\s+days\b/i,
    ],
    priority: 9,
  },
  {
    type: "INFO_DESTINATION",
    patterns: [
      /\b(places?|spots?|attractions?|things?)\s+(to\s+)?(visit|see|do|explore)\b/i,
      /\btourist\s+(places?|spots?|attractions?)\b/i,
      /\bsightseeing\b/i,
      /\bmust\s+(see|visit)\b/i,
      /\bwhat\s+(to\s+do|are\s+the)\s+(in|at)\b/i,
      /\bbest\s+(places?|things?|attractions?)\b/i,
    ],
    priority: 9,
  },
  {
    type: "INFO_GENERAL",
    patterns: [
      /\b(weather|climate|temperature)\s+(in|at|for)?\b/i,
      /\b(visa|passport)\s+(for|to|requirements?)?\b/i,
      /\b(currency|money|exchange\s+rate)\b/i,
      /\b(safety|safe|dangerous)\b/i,
      /\b(best\s+time)\s+(to\s+visit)?\b/i,
      /\b(food|cuisine|restaurants?)\s+(in|at)?\b/i,
      /\b(culture|customs|traditions?)\b/i,
      /\bhow\s+is\b/i,
      /\btell\s+me\s+about\b/i,
    ],
    priority: 7,
  },
  // GENERAL (lowest priority - fallback)
  {
    type: "GENERAL",
    patterns: [
      /\b(hi|hello|hey|greetings)\b/i,
      /\b(thanks?|thank\s+you|thx)\b/i,
      /\bhow\s+are\s+you\b/i,
      /\b(bye|goodbye|see\s+you)\b/i,
      /\b(ok|okay|sure|great|nice)\b/i,
    ],
    priority: 1,
  },
];

// Required parameters for each booking intent
const REQUIRED_PARAMS: Record<string, string[]> = {
  BOOKING_FLIGHT: ["origin", "destination", "departureDate"],
  BOOKING_HOTEL: ["destination", "checkIn"],
  BOOKING_TRIP: ["destination", "departureDate"],
};

// Follow-up questions for missing parameters
const MISSING_PARAM_QUESTIONS: Record<string, string> = {
  origin: "Where will you be traveling from?",
  destination: "Where would you like to go?",
  departureDate: "When would you like to travel? (e.g., '15 Jan 2026', 'tomorrow', 'next week')",
  checkIn: "When would you like to check in?",
  returnDate: "When would you like to return? (or is this a one-way trip?)",
};

export function classifyIntent(
  message: string,
  existingContext?: ExtractedParams
): ClassifiedIntent {
  const lowerMessage = message.toLowerCase();
  
  // Find matching intents with their priorities
  const matches: { type: IntentType; priority: number }[] = [];
  
  for (const intent of INTENT_PATTERNS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(message)) {
        matches.push({ type: intent.type, priority: intent.priority });
        break; // Only count each intent type once
      }
    }
  }
  
  // Sort by priority (highest first)
  matches.sort((a, b) => b.priority - a.priority);
  
  // Get the highest priority intent, default to GENERAL
  const detectedIntent = matches.length > 0 ? matches[0].type : "GENERAL";
  const confidence = matches.length > 0 ? Math.min(matches[0].priority / 10, 1) : 0.3;

  // Extract parameters from message
  const extractedParams = extractParams(message);

  // Merge with existing context
  const mergedParams: ExtractedParams = {
    ...existingContext,
    ...extractedParams,
  };

  // Check for missing required parameters
  const requiredParams = REQUIRED_PARAMS[detectedIntent] || [];
  const missingParams = requiredParams.filter(
    param => !mergedParams[param as keyof ExtractedParams]
  );

  // Generate follow-up question if params are missing
  const followUpQuestion = missingParams.length > 0
    ? MISSING_PARAM_QUESTIONS[missingParams[0]]
    : undefined;

  return {
    type: detectedIntent,
    confidence,
    params: mergedParams,
    missingParams,
    followUpQuestion,
  };
}

// City to IATA code mapping (subset for extraction)
const CITY_NAMES = [
  "delhi", "new delhi", "mumbai", "bombay", "bangalore", "bengaluru",
  "chennai", "madras", "kolkata", "calcutta", "hyderabad", "pune",
  "ahmedabad", "jaipur", "lucknow", "goa", "kochi", "cochin",
  "thiruvananthapuram", "trivandrum", "guwahati", "varanasi",
  "amritsar", "chandigarh", "indore", "bhopal", "nagpur", "patna",
  "ranchi", "srinagar", "leh", "ladakh", "manali", "shimla",
  "darjeeling", "gangtok", "rishikesh", "dehradun", "agra",
  "udaipur", "jodhpur", "jaisalmer", "mysore", "ooty", "coorg",
  "pondicherry", "andaman", "lakshadweep",
  // International
  "dubai", "singapore", "bangkok", "london", "paris", "new york",
  "tokyo", "sydney", "hong kong", "kuala lumpur", "bali", "maldives",
  "mauritius", "sri lanka", "colombo", "kathmandu", "bhutan", "thimphu"
];

function extractParams(message: string): ExtractedParams {
  const params: ExtractedParams = {};
  const lowerMessage = message.toLowerCase();

  // Extract origin and destination from "from X to Y" pattern
  const fromToMatch = message.match(/from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+)/i);
  if (fromToMatch) {
    const origin = findCity(fromToMatch[1]);
    const destination = findCity(fromToMatch[2]);
    if (origin) params.origin = origin;
    if (destination) params.destination = destination;
  }

  // Extract destination from "to X" or "in X" patterns (if not already set)
  if (!params.destination) {
    const toMatch = message.match(/(?:to|in|visit|visiting)\s+([a-zA-Z\s]+?)(?:\s+on|\s+for|\s+from|$|\.|\?)/i);
    if (toMatch) {
      const destination = findCity(toMatch[1]);
      if (destination) params.destination = destination;
    }
  }

  // If still no destination, look for any city mention
  if (!params.destination && !params.origin) {
    for (const city of CITY_NAMES) {
      if (lowerMessage.includes(city)) {
        params.destination = city;
        break;
      }
    }
  }

  // Extract date
  const datePatterns = [
    // Specific dates: "5 jan", "jan 5", "5th january", "january 5th"
    /(\d{1,2})(?:st|nd|rd|th)?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d{4})?/i,
    /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})?/i,
    // Relative dates
    /\b(tomorrow|today|next\s+week|next\s+month)\b/i,
    // YYYY-MM-DD format
    /(\d{4})-(\d{2})-(\d{2})/,
  ];

  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      params.departureDate = parseDateFromMatch(match);
      break;
    }
  }

  // Extract number of days for itinerary
  const daysMatch = message.match(/(\d+)\s*(day|days|night|nights)/i);
  if (daysMatch) {
    params.nights = parseInt(daysMatch[1]);
  }

  // Extract travelers count
  const travelersMatch = message.match(/(\d+)\s*(person|people|traveler|travelers|passenger|passengers|adult|adults)/i);
  if (travelersMatch) {
    params.travelers = parseInt(travelersMatch[1]);
  }

  return params;
}

function findCity(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  for (const city of CITY_NAMES) {
    if (lowerText.includes(city) || lowerText === city) {
      return city;
    }
  }
  return null;
}

function parseDateFromMatch(match: RegExpMatchArray): string {
  const fullMatch = match[0].toLowerCase();

  // Handle relative dates
  if (fullMatch.includes("tomorrow")) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(tomorrow);
  }
  if (fullMatch.includes("today")) {
    return formatDate(new Date());
  }
  if (fullMatch.includes("next week")) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return formatDate(nextWeek);
  }
  if (fullMatch.includes("next month")) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return formatDate(nextMonth);
  }

  // Parse specific dates
  const monthMap: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
    nov: 10, november: 10, dec: 11, december: 11,
  };

  // Try to extract day, month, year
  let day: number | undefined;
  let month: number | undefined;
  let year = new Date().getFullYear();

  // Look for month name
  for (const [monthName, monthNum] of Object.entries(monthMap)) {
    if (fullMatch.includes(monthName)) {
      month = monthNum;
      break;
    }
  }

  // Look for day number
  const dayMatch = fullMatch.match(/\b(\d{1,2})\b/);
  if (dayMatch) {
    day = parseInt(dayMatch[1]);
  }

  // Look for year
  const yearMatch = fullMatch.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
  }

  if (day !== undefined && month !== undefined) {
    const date = new Date(year, month, day);
    // If date is in the past, assume next year
    if (date < new Date()) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return formatDate(date);
  }

  return fullMatch; // Return as-is if can't parse
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Export for testing
export { extractParams, findCity };

