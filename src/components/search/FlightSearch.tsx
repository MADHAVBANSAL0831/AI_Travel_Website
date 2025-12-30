"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, ArrowRightLeft, Calendar, Users } from "lucide-react";

interface FlightSearchProps {
  onSearch: (params: FlightSearchParams) => void;
  isLoading?: boolean;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  tripType: "one-way" | "round-trip";
  cabinClass: string;
}

export function FlightSearch({ onSearch, isLoading }: FlightSearchProps) {
  const [tripType, setTripType] = useState<"one-way" | "round-trip">("round-trip");
  const [formData, setFormData] = useState<FlightSearchParams>({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    passengers: 1,
    tripType: "round-trip",
    cabinClass: "ECONOMY",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ ...formData, tripType });
  };

  const swapLocations = () => {
    setFormData((prev) => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }));
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Trip Type Toggle */}
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setTripType("round-trip")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tripType === "round-trip"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Round Trip
            </button>
            <button
              type="button"
              onClick={() => setTripType("one-way")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tripType === "one-way"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              One Way
            </button>
          </div>

          {/* Origin & Destination */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="origin">From</Label>
              <div className="relative">
                <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="origin"
                  placeholder="City or Airport"
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value.toUpperCase() })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={swapLocations} className="mb-0.5">
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-2">
              <Label htmlFor="destination">To</Label>
              <div className="relative">
                <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 rotate-90" />
                <Input
                  id="destination"
                  placeholder="City or Airport"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value.toUpperCase() })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Dates & Passengers */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departure">Departure</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="departure"
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            {tripType === "round-trip" && (
              <div className="space-y-2">
                <Label htmlFor="return">Return</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="return"
                    type="date"
                    value={formData.returnDate}
                    onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="passengers">Passengers</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="passengers"
                  type="number"
                  min="1"
                  max="9"
                  value={formData.passengers}
                  onChange={(e) => setFormData({ ...formData, passengers: parseInt(e.target.value) })}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cabin">Cabin Class</Label>
              <select
                id="cabin"
                value={formData.cabinClass}
                onChange={(e) => setFormData({ ...formData, cabinClass: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="ECONOMY">Economy</option>
                <option value="PREMIUM_ECONOMY">Premium Economy</option>
                <option value="BUSINESS">Business</option>
                <option value="FIRST">First Class</option>
              </select>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Searching..." : "Search Flights"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

