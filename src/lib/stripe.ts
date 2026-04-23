import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export const PLANS = {
  free: {
    name: "Free",
    maxSites: 1,
    customDomains: false,
  },
  pro: {
    name: "Pro",
    maxSites: 10,
    customDomains: true,
  },
} as const;
