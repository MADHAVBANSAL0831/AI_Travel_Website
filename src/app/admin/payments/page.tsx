"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, CreditCard, DollarSign, TrendingUp, RefreshCw } from "lucide-react";

interface Payment {
  id: string;
  transactionId: string;
  bookingRef: string;
  customer: string;
  amount: number;
  method: "card" | "paypal" | "crypto";
  status: "completed" | "pending" | "failed" | "refunded";
  date: string;
}

const mockPayments: Payment[] = [
  { id: "1", transactionId: "TXN-001", bookingRef: "TH-FL-001", customer: "John Doe", amount: 450, method: "card", status: "completed", date: "2024-01-15" },
  { id: "2", transactionId: "TXN-002", bookingRef: "TH-HT-002", customer: "Jane Smith", amount: 750, method: "paypal", status: "pending", date: "2024-01-14" },
  { id: "3", transactionId: "TXN-003", bookingRef: "TH-FL-003", customer: "Mike Johnson", amount: 1200, method: "card", status: "completed", date: "2024-01-13" },
  { id: "4", transactionId: "TXN-004", bookingRef: "TH-HT-004", customer: "Sarah Wilson", amount: 1600, method: "crypto", status: "completed", date: "2024-01-10" },
  { id: "5", transactionId: "TXN-005", bookingRef: "TH-FL-005", customer: "Tom Brown", amount: 890, method: "card", status: "refunded", date: "2024-01-08" },
];

const stats = [
  { name: "Total Revenue", value: "$45,678", icon: DollarSign, color: "bg-green-500" },
  { name: "Transactions", value: "234", icon: CreditCard, color: "bg-blue-500" },
  { name: "Avg. Transaction", value: "$195", icon: TrendingUp, color: "bg-purple-500" },
  { name: "Refunds", value: "$1,234", icon: RefreshCw, color: "bg-orange-500" },
];

export default function AdminPayments() {
  const [payments] = useState<Payment[]>(mockPayments);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPayments = payments.filter(
    (payment) =>
      payment.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "failed": return "bg-red-100 text-red-700";
      case "refunded": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Transaction ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Booking</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Method</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{payment.transactionId}</td>
                    <td className="py-3 px-4 text-gray-700">{payment.bookingRef}</td>
                    <td className="py-3 px-4 text-gray-700">{payment.customer}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">${payment.amount}</td>
                    <td className="py-3 px-4 text-gray-700 capitalize">{payment.method}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{payment.date}</td>
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

