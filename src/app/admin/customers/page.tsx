"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Mail, Phone } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  joinedDate: string;
  status: "active" | "inactive";
}

const mockCustomers: Customer[] = [
  { id: "1", name: "John Doe", email: "john@example.com", phone: "+1 234 567 890", totalBookings: 5, totalSpent: 2450, joinedDate: "2024-01-01", status: "active" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", phone: "+1 234 567 891", totalBookings: 3, totalSpent: 1890, joinedDate: "2024-01-05", status: "active" },
  { id: "3", name: "Mike Johnson", email: "mike@example.com", phone: "+1 234 567 892", totalBookings: 8, totalSpent: 5670, joinedDate: "2023-12-15", status: "active" },
  { id: "4", name: "Sarah Wilson", email: "sarah@example.com", phone: "+1 234 567 893", totalBookings: 2, totalSpent: 980, joinedDate: "2024-01-10", status: "inactive" },
];

export default function AdminCustomers() {
  const [customers] = useState<Customer[]>(mockCustomers);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Bookings</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Total Spent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Joined</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                          {customer.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{customer.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Mail className="h-3 w-3 text-gray-400" />
                          {customer.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {customer.phone}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{customer.totalBookings}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">${customer.totalSpent.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-700">{customer.joinedDate}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          customer.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {customer.status}
                      </span>
                    </td>
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

