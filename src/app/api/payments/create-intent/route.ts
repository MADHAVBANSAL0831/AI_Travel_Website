import { NextRequest, NextResponse } from "next/server";
import { stripeAPI } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency = "USD", bookingId, bookingType } = body;

    if (!amount || !bookingId) {
      return NextResponse.json(
        { error: "Amount and bookingId are required" },
        { status: 400 }
      );
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const paymentIntent = await stripeAPI.createPaymentIntent({
      amount,
      currency,
      metadata: {
        bookingId,
        bookingType,
      },
    });

    return NextResponse.json(paymentIntent);
  } catch (error) {
    console.error("Payment intent error:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}

