import axios, { AxiosInstance } from "axios";

class AmadeusAPI {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.AMADEUS_API_URL || "https://test.api.amadeus.com",
    });
  }

  private async authenticate(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await axios.post(
      `${process.env.AMADEUS_API_URL}/v1/security/oauth2/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.AMADEUS_CLIENT_ID!,
        client_secret: process.env.AMADEUS_CLIENT_SECRET!,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
    return this.accessToken!;
  }

  private async request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const token = await this.authenticate();
    const response = await this.client.get<T>(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params,
    });
    return response.data;
  }

  // Flight Search
  async searchFlights(params: {
    originLocationCode: string;
    destinationLocationCode: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    travelClass?: string;
    max?: number;
  }) {
    return this.request("/v2/shopping/flight-offers", {
      ...params,
      max: params.max || 20,
      currencyCode: "USD",
    });
  }

  // Flight Price Confirmation
  async confirmFlightPrice(flightOffer: any) {
    const token = await this.authenticate();
    const response = await this.client.post(
      "/v1/shopping/flight-offers/pricing",
      { data: { type: "flight-offers-pricing", flightOffers: [flightOffer] } },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }

  // Hotel Search by City
  async searchHotelsByCity(params: {
    cityCode: string;
    radius?: number;
    radiusUnit?: string;
    hotelSource?: string;
  }) {
    return this.request("/v1/reference-data/locations/hotels/by-city", {
      ...params,
      radius: params.radius || 5,
      radiusUnit: params.radiusUnit || "KM",
      hotelSource: params.hotelSource || "ALL",
    });
  }

  // Hotel Offers
  async getHotelOffers(params: {
    hotelIds: string[];
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    roomQuantity?: number;
  }) {
    return this.request("/v3/shopping/hotel-offers", {
      ...params,
      hotelIds: params.hotelIds.join(","),
      roomQuantity: params.roomQuantity || 1,
      currency: "USD",
    });
  }

  // Airport/City Search
  async searchLocations(keyword: string, subType: string = "CITY,AIRPORT") {
    return this.request("/v1/reference-data/locations", {
      keyword,
      subType,
    });
  }
}

export const amadeusAPI = new AmadeusAPI();

