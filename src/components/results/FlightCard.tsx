"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane, Clock, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface FlightCardProps {
  flight: {
    id: string;
    airline: string;
    flightNumber: string;
    departure: {
      airport: string;
      time: string;
      city: string;
    };
    arrival: {
      airport: string;
      time: string;
      city: string;
    };
    duration: string;
    stops: number;
    price: {
      amount: number;
      currency: string;
    };
    cabinClass: string;
  };
  onSelect: (flightId: string) => void;
}

export function FlightCard({ flight, onSelect }: FlightCardProps) {
  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Airline Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Plane className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold">{flight.airline}</p>
              <p className="text-sm text-gray-500">{flight.flightNumber}</p>
            </div>
          </div>

          {/* Flight Times */}
          <div className="flex items-center gap-4 flex-1 justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold">{flight.departure.time}</p>
              <p className="text-sm text-gray-500">{flight.departure.airport}</p>
              <p className="text-xs text-gray-400">{flight.departure.city}</p>
            </div>

            <div className="flex flex-col items-center flex-1 max-w-[200px]">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{flight.duration}</span>
              </div>
              <div className="relative w-full h-px bg-gray-300 my-2">
                <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500">
                {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
              </p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold">{flight.arrival.time}</p>
              <p className="text-sm text-gray-500">{flight.arrival.airport}</p>
              <p className="text-xs text-gray-400">{flight.arrival.city}</p>
            </div>
          </div>

          {/* Price & Book */}
          <div className="text-center md:text-right">
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(flight.price.amount, flight.price.currency)}
            </p>
            <p className="text-sm text-gray-500 mb-2">{flight.cabinClass}</p>
            <Button onClick={() => onSelect(flight.id)}>Select</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

