"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  Brain,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalChats: 0,
    knowledgeDocuments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch stats from API
        const response = await fetch("/api/admin/stats");
        const data = await response.json();

        if (response.ok) {
          setStats({
            totalUsers: data.totalUsers || 0,
            totalChats: data.totalChats || 0,
            knowledgeDocuments: data.knowledgeDocuments || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const dashboardStats = [
    {
      name: "Total Users",
      value: loading ? "..." : stats.totalUsers.toLocaleString(),
      icon: Users,
      color: "bg-blue-500",
      href: "/admin/customers",
    },
    {
      name: "Total Conversations",
      value: loading ? "..." : stats.totalChats.toLocaleString(),
      icon: MessageSquare,
      color: "bg-purple-500",
      href: "/",
    },
    {
      name: "Knowledge Documents",
      value: loading ? "..." : stats.knowledgeDocuments.toLocaleString(),
      icon: Brain,
      color: "bg-green-500",
      href: "/admin/knowledge",
    },
    {
      name: "AI Response Rate",
      value: "99.2%",
      icon: TrendingUp,
      color: "bg-cyan-500",
      href: "#",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-2">Welcome to TravelHub Admin</h1>
          <p className="text-blue-100 mb-4">
            Manage your AI travel assistant, view customer data, and update your knowledge base.
          </p>
          <Link href="/">
            <Button variant="secondary" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Go to Chat
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat) => (
          <Link key={stat.name} href={stat.href} className="block h-full">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full bg-white">
              <CardContent className="p-6 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex flex-col justify-center">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-3xl font-bold mt-1 text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-4 rounded-full flex-shrink-0`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/customers">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 text-gray-700 hover:text-gray-900 border-gray-300">
                <Users className="h-6 w-6" />
                <span>View Customers</span>
              </Button>
            </Link>
            <Link href="/admin/knowledge">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 text-gray-700 hover:text-gray-900 border-gray-300">
                <Brain className="h-6 w-6" />
                <span>Manage Knowledge Base</span>
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 text-gray-700 hover:text-gray-900 border-gray-300">
                <MessageSquare className="h-6 w-6" />
                <span>Test Chat Assistant</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

