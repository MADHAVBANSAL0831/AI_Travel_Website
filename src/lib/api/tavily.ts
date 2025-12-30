import axios from "axios";

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  favicon?: string;
}

interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  response_time: number;
}

interface TavilySearchParams {
  query: string;
  search_depth?: "basic" | "advanced";
  topic?: "general" | "news";
  max_results?: number;
  include_answer?: boolean;
  include_images?: boolean;
  include_raw_content?: boolean;
}

class TavilyAPI {
  private apiKey: string;
  private baseURL = "https://api.tavily.com";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY || "";
  }

  /**
   * Search the web using Tavily API
   * Great for travel research, destination info, travel tips, etc.
   */
  async search(params: TavilySearchParams): Promise<TavilySearchResponse> {
    if (!this.apiKey) {
      throw new Error("Tavily API key not configured");
    }

    try {
      const response = await axios.post<TavilySearchResponse>(
        `${this.baseURL}/search`,
        {
          api_key: this.apiKey,
          query: params.query,
          search_depth: params.search_depth || "basic",
          topic: params.topic || "general",
          max_results: params.max_results || 5,
          include_answer: params.include_answer ?? true,
          include_images: params.include_images ?? false,
          include_raw_content: params.include_raw_content ?? false,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: unknown }; message?: string };
      console.error("Tavily search error:", axiosError.response?.data || axiosError.message);
      throw error;
    }
  }

  /**
   * Search for travel-specific information
   */
  async searchTravel(destination: string, topic?: string): Promise<TavilySearchResponse> {
    const query = topic
      ? `${topic} in ${destination} travel guide`
      : `${destination} travel guide best places to visit`;

    return this.search({
      query,
      search_depth: "advanced",
      max_results: 5,
      include_answer: true,
    });
  }

  /**
   * Get travel news for a destination
   */
  async getTravelNews(destination: string): Promise<TavilySearchResponse> {
    return this.search({
      query: `${destination} travel news updates 2024`,
      topic: "news",
      max_results: 5,
      include_answer: true,
    });
  }
}

// Export singleton instance
export const tavilyAPI = new TavilyAPI();
export { TavilyAPI };
export type { TavilySearchResponse, TavilySearchResult };

