import Stripe from "stripe";

// Initialize Stripe only if API key is available
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    })
  : null;

export const stripeAPI = {
  // Create Payment Intent
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    metadata?: Record<string, string>;
  }) {
    if (!stripe) throw new Error("Stripe is not configured");

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: params.currency.toLowerCase(),
      metadata: params.metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  },

  // Confirm Payment
  async confirmPayment(paymentIntentId: string) {
    if (!stripe) throw new Error("Stripe is not configured");
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  },

  // Create Checkout Session
  async createCheckoutSession(params: {
    lineItems: {
      name: string;
      description: string;
      amount: number;
      currency: string;
      quantity: number;
    }[];
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    if (!stripe) throw new Error("Stripe is not configured");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: params.lineItems.map((item) => ({
        price_data: {
          currency: item.currency.toLowerCase(),
          product_data: {
            name: item.name,
            description: item.description,
          },
          unit_amount: Math.round(item.amount * 100),
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  },

  // Create Refund
  async createRefund(paymentIntentId: string, amount?: number) {
    if (!stripe) throw new Error("Stripe is not configured");

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return refund;
  },

  // Get Customer
  async getOrCreateCustomer(email: string, name: string) {
    if (!stripe) throw new Error("Stripe is not configured");

    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length > 0) {
      return customers.data[0];
    }

    return stripe.customers.create({ email, name });
  },

  // Webhook Handler
  constructWebhookEvent(payload: Buffer, signature: string) {
    if (!stripe) throw new Error("Stripe is not configured");

    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  },
};

export { stripe };

