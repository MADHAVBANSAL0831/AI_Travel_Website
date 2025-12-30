import { NextRequest, NextResponse } from "next/server";
import { travelService } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location, checkIn, checkOut, guests, rooms } = body;

    if (!location || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Convert location to city code (in production, you'd use a lookup)
    const cityCode = location.toUpperCase().slice(0, 3);

    const results = await travelService.searchHotels({
      cityCode,
      checkIn,
      checkOut,
      guests: guests || 2,
      rooms: rooms || 1,
    });

    // Transform results to a consistent format
    const hotels = transformHotelResults(results);

    return NextResponse.json({ hotels });
  } catch (error) {
    console.error("Hotel search error:", error);
    return NextResponse.json(
      { error: "Failed to search hotels" },
      { status: 500 }
    );
  }
}

function transformHotelResults(results: any) {
  return (results.data?.data || []).map((hotel: any) => {
    const offer = hotel.offers?.[0];
    
    return {
      id: hotel.hotel?.hotelId || hotel.hotelId,
      name: hotel.hotel?.name || "Unknown Hotel",
      address: hotel.hotel?.address?.lines?.join(", ") || "",
      city: hotel.hotel?.address?.cityName || "",
      rating: hotel.hotel?.rating || 4,
      reviewCount: Math.floor(Math.random() * 500) + 50, // Amadeus doesn't provide this
      images: [], // Would need separate API call for images
      amenities: extractAmenities(hotel.hotel?.amenities || []),
      pricePerNight: {
        amount: parseFloat(offer?.price?.total || 0),
        currency: offer?.price?.currency || "USD",
      },
      coordinates: {
        lat: hotel.hotel?.latitude || 0,
        lng: hotel.hotel?.longitude || 0,
      },
    };
  });
}

function extractAmenities(amenities: string[]) {
  const amenityMap: Record<string, string> = {
    WIFI: "WiFi",
    SWIMMING_POOL: "Pool",
    FITNESS_CENTER: "Gym",
    RESTAURANT: "Restaurant",
    PARKING: "Parking",
    SPA: "Spa",
    AIR_CONDITIONING: "AC",
    ROOM_SERVICE: "Room Service",
  };

  return amenities
    .slice(0, 6)
    .map((a) => amenityMap[a] || a)
    .filter(Boolean);
}

