"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plane,
  Hotel,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react";

const stats = [
  {
    name: "Total Bookings",
    value: "1,234",
    change: "+12%",
    icon: Calendar,
    color: "bg-blue-500",
  },
  {
    name: "Revenue",
    value: "$45,678",
    change: "+8%",
    icon: DollarSign,
    color: "bg-green-500",
  },
  {
    name: "Flight Bookings",
    value: "856",
    change: "+15%",
    icon: Plane,
    color: "bg-purple-500",
  },
  {
    name: "Hotel Bookings",
    value: "378",
    change: "+5%",
    icon: Hotel,
    color: "bg-orange-500",
  },
  {
    name: "Active Users",
    value: "2,456",
    change: "+18%",
    icon: Users,
    color: "bg-pink-500",
  },
  {
    name: "Conversion Rate",
    value: "3.2%",
    change: "+0.5%",
    icon: TrendingUp,
    color: "bg-cyan-500",
  },
];

const recentBookings = [
  { id: "BK001", customer: "John Doe", type: "Flight", amount: "$450", status: "Confirmed" },
  { id: "BK002", customer: "Jane Smith", type: "Hotel", amount: "$320", status: "Pending" },
  { id: "BK003", customer: "Mike Johnson", type: "Flight", amount: "$680", status: "Confirmed" },
  { id: "BK004", customer: "Sarah Wilson", type: "Hotel", amount: "$890", status: "Confirmed" },
  { id: "BK005", customer: "Tom Brown", type: "Flight", amount: "$520", status: "Cancelled" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.name}</p>
                  <p className="text-3xl font-bold mt-1 text-gray-900">{stat.value}</p>
                  <p className="text-sm text-green-600 mt-1">{stat.change} from last month</p>
                </div>
                <div className={`${stat.color} p-4 rounded-full`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Booking ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{booking.id}</td>
                    <td className="py-3 px-4 text-gray-700">{booking.customer}</td>
                    <td className="py-3 px-4 text-gray-700">
                      <span className="flex items-center gap-2">
                        {booking.type === "Flight" ? (
                          <Plane className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Hotel className="h-4 w-4 text-orange-500" />
                        )}
                        {booking.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{booking.amount}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === "Confirmed"
                            ? "bg-green-100 text-green-700"
                            : booking.status === "Pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {booking.status}
                      </span>
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

