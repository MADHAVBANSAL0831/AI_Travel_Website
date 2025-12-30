"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, CreditCard, User, Shield } from "lucide-react";

type Step = "details" | "payment" | "confirmation";

export default function BookingPage() {
  const params = useParams();
  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [isProcessing, setIsProcessing] = useState(false);
  const [guestDetails, setGuestDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const steps = [
    { id: "details", name: "Guest Details", icon: User },
    { id: "payment", name: "Payment", icon: CreditCard },
    { id: "confirmation", name: "Confirmation", icon: Check },
  ];

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Create payment intent
      const response = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 450, // This would come from the booking
          currency: "USD",
          bookingId: params.id,
          bookingType: "flight",
        }),
      });
      
      const data = await response.json();
      
      // In production, you'd use Stripe Elements here
      console.log("Payment intent created:", data);
      
      // Simulate successful payment
      setTimeout(() => {
        setCurrentStep("confirmation");
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      console.error("Payment error:", error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      currentStep === step.id
                        ? "bg-blue-600 text-white"
                        : steps.findIndex((s) => s.id === currentStep) > index
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    <step.icon className="h-6 w-6" />
                  </div>
                  <span className="mt-2 text-sm font-medium">{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 bg-gray-200 mx-4">
                    <div
                      className={`h-full transition-all ${
                        steps.findIndex((s) => s.id === currentStep) > index
                          ? "bg-green-500"
                          : "bg-gray-200"
                      }`}
                      style={{
                        width:
                          steps.findIndex((s) => s.id === currentStep) > index
                            ? "100%"
                            : "0%",
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {currentStep === "details" && (
          <Card>
            <CardHeader>
              <CardTitle>Guest Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={guestDetails.firstName}
                    onChange={(e) => setGuestDetails({ ...guestDetails, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={guestDetails.lastName}
                    onChange={(e) => setGuestDetails({ ...guestDetails, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={guestDetails.email}
                  onChange={(e) => setGuestDetails({ ...guestDetails, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={guestDetails.phone}
                  onChange={(e) => setGuestDetails({ ...guestDetails, phone: e.target.value })}
                  required
                />
              </div>
              <Button className="w-full" onClick={() => setCurrentStep("payment")}>
                Continue to Payment
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === "payment" && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Secure Payment</span>
                </div>
                <p className="text-sm text-gray-500">
                  Your payment is secured with 256-bit SSL encryption
                </p>
              </div>
              {/* Stripe Elements would go here in production */}
              <div className="space-y-2">
                <Label htmlFor="card">Card Number</Label>
                <Input id="card" placeholder="4242 4242 4242 4242" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input id="expiry" placeholder="MM/YY" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="123" />
                </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>$450.00</span>
                </div>
              </div>
              <Button className="w-full" onClick={handlePayment} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Pay Now"}
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === "confirmation" && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
              <p className="text-gray-500 mb-6">
                Your booking reference is <span className="font-semibold">TH-ABC123</span>
              </p>
              <p className="text-sm text-gray-500 mb-8">
                A confirmation email has been sent to {guestDetails.email}
              </p>
              <Button onClick={() => window.location.href = "/"}>Back to Home</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

