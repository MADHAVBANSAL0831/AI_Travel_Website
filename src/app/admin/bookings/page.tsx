"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Plane, Hotel, Download } from "lucide-react";

interface Booking {
  id: string;
  reference: string;
  customer: string;
  email: string;
  type: "flight" | "hotel";
  details: string;
  amount: number;
  status: "confirmed" | "pending" | "cancelled" | "completed";
  date: string;
}

const mockBookings: Booking[] = [
  { id: "1", reference: "TH-FL-001", customer: "John Doe", email: "john@example.com", type: "flight", details: "NYC → LON", amount: 450, status: "confirmed", date: "2024-01-15" },
  { id: "2", reference: "TH-HT-002", customer: "Jane Smith", email: "jane@example.com", type: "hotel", details: "Grand Plaza, 3 nights", amount: 750, status: "pending", date: "2024-01-14" },
  { id: "3", reference: "TH-FL-003", customer: "Mike Johnson", email: "mike@example.com", type: "flight", details: "LAX → TYO", amount: 1200, status: "confirmed", date: "2024-01-13" },
  { id: "4", reference: "TH-HT-004", customer: "Sarah Wilson", email: "sarah@example.com", type: "hotel", details: "Seaside Resort, 5 nights", amount: 1600, status: "completed", date: "2024-01-10" },
  { id: "5", reference: "TH-FL-005", customer: "Tom Brown", email: "tom@example.com", type: "flight", details: "SFO → PAR", amount: 890, status: "cancelled", date: "2024-01-08" },
];

export default function AdminBookings() {
  const [bookings] = useState<Booking[]>(mockBookings);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "flight" | "hotel">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || booking.type === filterType;
    const matchesStatus = filterStatus === "all" || booking.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "cancelled": return "bg-red-100 text-red-700";
      case "completed": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="h-10 px-3 rounded-lg border border-gray-300"
        >
          <option value="all">All Types</option>
          <option value="flight">Flights</option>
          <option value="hotel">Hotels</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 px-3 rounded-lg border border-gray-300"
        >
          <option value="all">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Button variant="outline" className="ml-auto">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Reference</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Details</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{booking.reference}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{booking.customer}</p>
                        <p className="text-sm text-gray-500">{booking.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      <span className="flex items-center gap-2">
                        {booking.type === "flight" ? (
                          <Plane className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Hotel className="h-4 w-4 text-orange-500" />
                        )}
                        {booking.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{booking.details}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">${booking.amount}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{booking.date}</td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

