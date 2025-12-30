"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Wifi, Car, Coffee, Dumbbell } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface HotelCardProps {
  hotel: {
    id: string;
    name: string;
    address: string;
    rating: number;
    reviewCount: number;
    images: string[];
    amenities: string[];
    pricePerNight: {
      amount: number;
      currency: string;
    };
  };
  onSelect: (hotelId: string) => void;
}

const amenityIcons: Record<string, React.ReactNode> = {
  wifi: <Wifi className="h-4 w-4" />,
  parking: <Car className="h-4 w-4" />,
  breakfast: <Coffee className="h-4 w-4" />,
  gym: <Dumbbell className="h-4 w-4" />,
};

export function HotelCard({ hotel, onSelect }: HotelCardProps) {
  return (
    <Card className="w-full hover:shadow-lg transition-shadow overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Image */}
        <div className="md:w-64 h-48 md:h-auto bg-gray-200 flex-shrink-0">
          {hotel.images[0] ? (
            <img
              src={hotel.images[0]}
              alt={hotel.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-6 flex-1 flex flex-col">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-xl font-semibold">{hotel.name}</h3>
                <div className="flex items-center gap-1 text-gray-500 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>{hotel.address}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{hotel.rating}</span>
                <span className="text-gray-500 text-sm">
                  ({hotel.reviewCount} reviews)
                </span>
              </div>
            </div>

            {/* Amenities */}
            <div className="flex gap-3 mt-4">
              {hotel.amenities.slice(0, 4).map((amenity) => (
                <div
                  key={amenity}
                  className="flex items-center gap-1 text-gray-600 text-sm"
                >
                  {amenityIcons[amenity.toLowerCase()] || null}
                  <span className="capitalize">{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Price & Book */}
          <div className="flex items-end justify-between mt-4 pt-4 border-t">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(
                  hotel.pricePerNight.amount,
                  hotel.pricePerNight.currency
                )}
              </p>
              <p className="text-sm text-gray-500">per night</p>
            </div>
            <Button onClick={() => onSelect(hotel.id)}>View Details</Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

