import { NextRequest, NextResponse } from "next/server";
import { stripeAPI } from "@/lib/api";
import { createServerSupabaseClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = stripeAPI.constructWebhookEvent(
        Buffer.from(body),
        signature
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata?.bookingId;

        if (bookingId) {
          // Update booking status in database
          await supabase
            .from("bookings")
            .update({
              payment_status: "paid",
              payment_id: paymentIntent.id,
              status: "confirmed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId);

          console.log(`Booking ${bookingId} payment confirmed`);
        }
        break;

      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        const failedBookingId = failedPayment.metadata?.bookingId;

        if (failedBookingId) {
          await supabase
            .from("bookings")
            .update({
              payment_status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", failedBookingId);

          console.log(`Booking ${failedBookingId} payment failed`);
        }
        break;

      case "charge.refunded":
        const refund = event.data.object;
        const refundedBookingId = refund.metadata?.bookingId;

        if (refundedBookingId) {
          await supabase
            .from("bookings")
            .update({
              payment_status: "refunded",
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", refundedBookingId);

          console.log(`Booking ${refundedBookingId} refunded`);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

