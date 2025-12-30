// ============================================
// UNIFIED API EXPORTS
// ============================================

export { amadeusAPI } from "./amadeus";
export { duffelAPI } from "./duffel";
export { stripeAPI, stripe } from "./stripe";
export { difyAPI } from "./dify";
export { elevenLabsAPI } from "./elevenlabs";
export { twilioAPI } from "./twilio";
export { braveSearchAPI } from "./brave-search";

// ============================================
// UNIFIED TRAVEL SERVICE
// ============================================

import { amadeusAPI } from "./amadeus";
import { duffelAPI } from "./duffel";

export const travelService = {
  // Search Flights (uses Amadeus as primary, Duffel as backup)
  async searchFlights(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    cabinClass?: string;
  }) {
    try {
      // Try Amadeus first
      const result = await amadeusAPI.searchFlights({
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        adults: params.passengers,
        travelClass: params.cabinClass,
      });
      return { source: "amadeus", data: result };
    } catch (error) {
      // Fallback to Duffel
      console.log("Amadeus failed, falling back to Duffel");
      const passengers = Array(params.passengers).fill({ type: "adult" as const });
      const result = await duffelAPI.searchFlights({
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        passengers,
        cabinClass: params.cabinClass?.toLowerCase() as any,
      });
      return { source: "duffel", data: result };
    }
  },

  // Search Hotels
  async searchHotels(params: {
    cityCode: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    rooms?: number;
  }) {
    // Get hotels in the city
    const hotels = await amadeusAPI.searchHotelsByCity({
      cityCode: params.cityCode,
    }) as { data?: { hotelId: string }[] };

    // Get offers for the hotels
    const hotelIds = hotels?.data?.slice(0, 20).map((h) => h.hotelId) || [];
    
    if (hotelIds.length === 0) {
      return { data: [] };
    }

    const offers = await amadeusAPI.getHotelOffers({
      hotelIds,
      checkInDate: params.checkIn,
      checkOutDate: params.checkOut,
      adults: params.guests,
      roomQuantity: params.rooms,
    });

    return offers;
  },

  // Search Locations
  async searchLocations(keyword: string) {
    return amadeusAPI.searchLocations(keyword);
  },
};

