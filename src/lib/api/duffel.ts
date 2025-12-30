import axios, { AxiosInstance } from "axios";

class DuffelAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.DUFFEL_API_URL || "https://api.duffel.com",
      headers: {
        Authorization: `Bearer ${process.env.DUFFEL_ACCESS_TOKEN}`,
        "Duffel-Version": "v1",
        "Content-Type": "application/json",
      },
    });
  }

  // Create Offer Request (Search Flights)
  async searchFlights(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: { type: "adult" | "child" | "infant_without_seat" }[];
    cabinClass?: "economy" | "premium_economy" | "business" | "first";
  }) {
    const slices = [
      {
        origin: params.origin,
        destination: params.destination,
        departure_date: params.departureDate,
      },
    ];

    if (params.returnDate) {
      slices.push({
        origin: params.destination,
        destination: params.origin,
        departure_date: params.returnDate,
      });
    }

    const response = await this.client.post("/air/offer_requests", {
      data: {
        slices,
        passengers: params.passengers,
        cabin_class: params.cabinClass || "economy",
      },
    });

    return response.data;
  }

  // Get Offer Details
  async getOffer(offerId: string) {
    const response = await this.client.get(`/air/offers/${offerId}`);
    return response.data;
  }

  // Create Order (Book Flight)
  async createOrder(params: {
    selectedOffers: string[];
    passengers: {
      id: string;
      given_name: string;
      family_name: string;
      born_on: string;
      email: string;
      phone_number: string;
      gender: "m" | "f";
    }[];
    payments: {
      type: "balance";
      amount: string;
      currency: string;
    }[];
  }) {
    const response = await this.client.post("/air/orders", {
      data: {
        type: "instant",
        selected_offers: params.selectedOffers,
        passengers: params.passengers,
        payments: params.payments,
      },
    });

    return response.data;
  }

  // Get Order
  async getOrder(orderId: string) {
    const response = await this.client.get(`/air/orders/${orderId}`);
    return response.data;
  }

  // Cancel Order
  async cancelOrder(orderId: string) {
    const response = await this.client.post(`/air/orders/${orderId}/actions/cancel`);
    return response.data;
  }

  // Get Airlines
  async getAirlines() {
    const response = await this.client.get("/air/airlines");
    return response.data;
  }

  // Get Airports
  async searchAirports(query: string) {
    const response = await this.client.get("/places/suggestions", {
      params: { query },
    });
    return response.data;
  }
}

export const duffelAPI = new DuffelAPI();

