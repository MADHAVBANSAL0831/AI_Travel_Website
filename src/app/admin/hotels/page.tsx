"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Search, Star } from "lucide-react";

interface Hotel {
  id: string;
  name: string;
  location: string;
  rating: number;
  rooms: number;
  pricePerNight: number;
  status: "active" | "inactive";
}

const mockHotels: Hotel[] = [
  { id: "1", name: "Grand Plaza Hotel", location: "New York", rating: 4.5, rooms: 120, pricePerNight: 250, status: "active" },
  { id: "2", name: "Seaside Resort", location: "Miami", rating: 4.8, rooms: 85, pricePerNight: 320, status: "active" },
  { id: "3", name: "Mountain View Lodge", location: "Denver", rating: 4.2, rooms: 45, pricePerNight: 180, status: "active" },
  { id: "4", name: "City Center Inn", location: "Chicago", rating: 4.0, rooms: 60, pricePerNight: 150, status: "inactive" },
];

export default function AdminHotels() {
  const [hotels, setHotels] = useState<Hotel[]>(mockHotels);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredHotels = hotels.filter(
    (hotel) =>
      hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hotel.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search hotels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Hotel
        </Button>
      </div>

      {/* Hotels Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hotels Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Hotel Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Rating</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Rooms</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Price/Night</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHotels.map((hotel) => (
                  <tr key={hotel.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{hotel.name}</td>
                    <td className="py-3 px-4 text-gray-700">{hotel.location}</td>
                    <td className="py-3 px-4 text-gray-700">
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {hotel.rating}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{hotel.rooms}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">${hotel.pricePerNight}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          hotel.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {hotel.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Hotel Modal would go here */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Add New Hotel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Hotel Name</Label>
                <Input id="name" placeholder="Enter hotel name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="Enter location" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rooms">Number of Rooms</Label>
                  <Input id="rooms" type="number" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Night</Label>
                  <Input id="price" type="number" placeholder="0" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowAddModal(false)}>Save Hotel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

