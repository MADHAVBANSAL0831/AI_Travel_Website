"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Users, BedDouble } from "lucide-react";

interface HotelSearchProps {
  onSearch: (params: HotelSearchParams) => void;
  isLoading?: boolean;
}

export interface HotelSearchParams {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

export function HotelSearch({ onSearch, isLoading }: HotelSearchProps) {
  const [formData, setFormData] = useState<HotelSearchParams>({
    location: "",
    checkIn: "",
    checkOut: "",
    guests: 2,
    rooms: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(formData);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Destination</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="location"
                placeholder="City, hotel name, or address"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Dates & Guests */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn">Check-in</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="checkIn"
                  type="date"
                  value={formData.checkIn}
                  onChange={(e) =>
                    setFormData({ ...formData, checkIn: e.target.value })
                  }
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkOut">Check-out</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="checkOut"
                  type="date"
                  value={formData.checkOut}
                  onChange={(e) =>
                    setFormData({ ...formData, checkOut: e.target.value })
                  }
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guests">Guests</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="guests"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.guests}
                  onChange={(e) =>
                    setFormData({ ...formData, guests: parseInt(e.target.value) })
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rooms">Rooms</Label>
              <div className="relative">
                <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="rooms"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.rooms}
                  onChange={(e) =>
                    setFormData({ ...formData, rooms: parseInt(e.target.value) })
                  }
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Searching..." : "Search Hotels"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

