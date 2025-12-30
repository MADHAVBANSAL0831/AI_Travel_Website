import { NextRequest, NextResponse } from "next/server";
import { travelService } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origin, destination, departureDate, returnDate, passengers, cabinClass } = body;

    if (!origin || !destination || !departureDate || !passengers) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const results = await travelService.searchFlights({
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass,
    });

    // Transform results to a consistent format
    const flights = transformFlightResults(results);

    return NextResponse.json({ flights, source: results.source });
  } catch (error) {
    console.error("Flight search error:", error);
    return NextResponse.json(
      { error: "Failed to search flights" },
      { status: 500 }
    );
  }
}

function transformFlightResults(results: any) {
  if (results.source === "amadeus") {
    return (results.data?.data || []).map((offer: any) => {
      const segment = offer.itineraries?.[0]?.segments?.[0];
      const lastSegment = offer.itineraries?.[0]?.segments?.slice(-1)[0];
      
      return {
        id: offer.id,
        airline: segment?.carrierCode || "Unknown",
        flightNumber: `${segment?.carrierCode}${segment?.number}`,
        departure: {
          airport: segment?.departure?.iataCode,
          time: new Date(segment?.departure?.at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          city: segment?.departure?.iataCode,
        },
        arrival: {
          airport: lastSegment?.arrival?.iataCode,
          time: new Date(lastSegment?.arrival?.at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          city: lastSegment?.arrival?.iataCode,
        },
        duration: offer.itineraries?.[0]?.duration?.replace("PT", "").toLowerCase(),
        stops: (offer.itineraries?.[0]?.segments?.length || 1) - 1,
        price: {
          amount: parseFloat(offer.price?.total || 0),
          currency: offer.price?.currency || "USD",
        },
        cabinClass: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || "ECONOMY",
      };
    });
  }

  // Duffel format
  return (results.data?.data?.offers || []).map((offer: any) => {
    const slice = offer.slices?.[0];
    const segment = slice?.segments?.[0];
    const lastSegment = slice?.segments?.slice(-1)[0];

    return {
      id: offer.id,
      airline: segment?.operating_carrier?.name || "Unknown",
      flightNumber: `${segment?.marketing_carrier?.iata_code}${segment?.marketing_carrier_flight_number}`,
      departure: {
        airport: segment?.origin?.iata_code,
        time: new Date(segment?.departing_at).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        city: segment?.origin?.city_name,
      },
      arrival: {
        airport: lastSegment?.destination?.iata_code,
        time: new Date(lastSegment?.arriving_at).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        city: lastSegment?.destination?.city_name,
      },
      duration: slice?.duration,
      stops: (slice?.segments?.length || 1) - 1,
      price: {
        amount: parseFloat(offer.total_amount || 0),
        currency: offer.total_currency || "USD",
      },
      cabinClass: segment?.passengers?.[0]?.cabin_class_marketing_name || "Economy",
    };
  });
}

