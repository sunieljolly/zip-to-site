import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Use service-role client here — no cookie context in webhooks
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription | Stripe.Checkout.Session;

    let customerId: string | null = null;
    let status = "active";
    let plan = "pro";

    if (event.type === "checkout.session.completed") {
      const session = subscription as Stripe.Checkout.Session;
      customerId = typeof session.customer === "string" ? session.customer : null;
    } else {
      const sub = subscription as Stripe.Subscription;
      customerId = typeof sub.customer === "string" ? sub.customer : null;
      status = sub.status;
      plan = sub.status === "active" ? "pro" : "free";
    }

    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      const email = (customer as Stripe.Customer).email;
      if (email) {
        await supabaseAdmin
          .from("subscriptions")
          .upsert({ user_email: email, plan, status }, { onConflict: "user_email" });
      }
    }
  }

  return NextResponse.json({ received: true });
}
