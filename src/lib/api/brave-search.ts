import axios, { AxiosInstance } from "axios";

class BraveSearchAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "https://api.search.brave.com/res/v1",
      headers: {
        "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
        Accept: "application/json",
      },
    });
  }

  // Web Search
  async search(params: {
    query: string;
    count?: number;
    offset?: number;
    safesearch?: "off" | "moderate" | "strict";
    freshness?: "pd" | "pw" | "pm" | "py";
  }) {
    const response = await this.client.get("/web/search", {
      params: {
        q: params.query,
        count: params.count || 10,
        offset: params.offset || 0,
        safesearch: params.safesearch || "moderate",
        freshness: params.freshness,
      },
    });

    return response.data;
  }

  // Search for Travel Destinations
  async searchDestinations(destination: string) {
    return this.search({
      query: `${destination} travel guide things to do attractions`,
      count: 10,
    });
  }

  // Search for Hotel Reviews
  async searchHotelReviews(hotelName: string, location: string) {
    return this.search({
      query: `${hotelName} ${location} hotel reviews ratings`,
      count: 10,
      freshness: "pm", // Past month
    });
  }

  // Search for Flight Deals
  async searchFlightDeals(origin: string, destination: string) {
    return this.search({
      query: `cheap flights from ${origin} to ${destination} deals`,
      count: 10,
      freshness: "pw", // Past week
    });
  }

  // Search for Local Attractions
  async searchLocalAttractions(location: string) {
    return this.search({
      query: `${location} best attractions restaurants activities`,
      count: 15,
    });
  }
}

export const braveSearchAPI = new BraveSearchAPI();

