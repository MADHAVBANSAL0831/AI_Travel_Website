import { NextRequest, NextResponse } from "next/server";
import { tavilyAPI } from "@/lib/api/tavily";
import { braveSearchAPI } from "@/lib/api/brave-search";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, type = "general", destination, provider = "tavily" } = body;

    if (!query && !destination) {
      return NextResponse.json(
        { error: "Query or destination is required" },
        { status: 400 }
      );
    }

    const searchQuery = query || destination;

    // Use Tavily as primary, Brave as fallback
    if (provider === "tavily" || provider === "auto") {
      try {
        let result;
        
        switch (type) {
          case "travel":
            result = await tavilyAPI.searchTravel(searchQuery);
            break;
          case "news":
            result = await tavilyAPI.getTravelNews(searchQuery);
            break;
          default:
            result = await tavilyAPI.search({
              query: searchQuery,
              max_results: 5,
              include_answer: true,
            });
        }

        return NextResponse.json({
          provider: "tavily",
          query: result.query,
          answer: result.answer,
          results: result.results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            score: r.score,
          })),
          response_time: result.response_time,
        });
      } catch (tavilyError) {
        console.error("Tavily error, falling back to Brave:", tavilyError);
        // Fall through to Brave
      }
    }

    // Use Brave Search
    try {
      let result;
      
      switch (type) {
        case "travel":
          result = await braveSearchAPI.searchDestinations(searchQuery);
          break;
        case "hotels":
          result = await braveSearchAPI.searchHotelReviews(searchQuery, "");
          break;
        case "attractions":
          result = await braveSearchAPI.searchLocalAttractions(searchQuery);
          break;
        default:
          result = await braveSearchAPI.search({ query: searchQuery, count: 5 });
      }

      return NextResponse.json({
        provider: "brave",
        query: result.query?.original || searchQuery,
        results: result.web?.results?.map((r: { title: string; url: string; description: string }) => ({
          title: r.title,
          url: r.url,
          content: r.description,
        })) || [],
      });
    } catch (braveError) {
      console.error("Brave search error:", braveError);
      return NextResponse.json(
        { error: "Search failed with all providers" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to process search request" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || searchParams.get("query");
  const type = searchParams.get("type") || "general";
  const provider = searchParams.get("provider") || "tavily";

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  // Reuse POST logic
  const mockRequest = {
    json: async () => ({ query, type, provider }),
  } as NextRequest;

  return POST(mockRequest);
}

