import { NextRequest, NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/?auth=required", request.url));
  }

  if (!isStripeConfigured()) {
    return NextResponse.redirect(new URL("/settings?billing=not_configured", request.url));
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.redirect(new URL("/settings?billing=db_required", request.url));
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.redirect(new URL("/settings?billing=not_configured", request.url));
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.stripeCustomerId) {
      return NextResponse.redirect(new URL("/settings?billing=no_customer", request.url));
    }

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/settings`,
    });

    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error("Billing portal session creation failed:", error);
    return NextResponse.redirect(new URL("/settings?billing=error", request.url));
  }
}