import { Hono } from "hono";
import { geocodeAddress, drivingDistance, GeocodeError } from "../lib/geocode";
import { calculatePriceCents } from "../lib/pricing";
import type { Env } from "../index";

export const quoteRoute = new Hono<{ Bindings: Env }>();

interface QuoteRequestBody {
  pickup?: string;
  dropoff?: string;
  tier?: string;
  helper?: boolean;
  heavy?: boolean;
}

quoteRoute.post("/quote", async (c) => {
  let body: QuoteRequestBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body." }, 400);
  }

  const { pickup, dropoff, helper, heavy } = body;
  if (!pickup?.trim() || !dropoff?.trim()) {
    return c.json({ error: "Both pickup and dropoff addresses are required." }, 400);
  }

  const apiKey = c.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return c.json({ error: "Pricing is temporarily unavailable." }, 503);
  }

  try {
    const [pickupGeo, dropoffGeo] = await Promise.all([
      geocodeAddress(pickup, apiKey),
      geocodeAddress(dropoff, apiKey),
    ]);

    const { distanceMiles, durationMinutes } = await drivingDistance(
      { lat: pickupGeo.lat, lng: pickupGeo.lng },
      { lat: dropoffGeo.lat, lng: dropoffGeo.lng },
      apiKey
    );

    const breakdown = calculatePriceCents(
      {
        baseFareCents: Number(c.env.BASE_FARE_CENTS),
        perMileCents: Number(c.env.PER_MILE_CENTS),
        helperFeeCents: Number(c.env.HELPER_FEE_CENTS),
        heavyFeeCents: Number(c.env.HEAVY_FEE_CENTS),
      },
      distanceMiles,
      { helper: Boolean(helper), heavy: Boolean(heavy) }
    );

    return c.json({
      distanceMiles,
      durationMinutes,
      pickupFormattedAddress: pickupGeo.formattedAddress,
      dropoffFormattedAddress: dropoffGeo.formattedAddress,
      breakdown: {
        baseFare: breakdown.baseFareCents / 100,
        mileageCost: breakdown.mileageCents / 100,
        helperCost: breakdown.helperCents / 100,
        heavyCost: breakdown.heavyCents / 100,
        total: breakdown.totalCents / 100,
      },
    });
  } catch (err) {
    if (err instanceof GeocodeError) {
      return c.json({ error: err.message, field: err.address === pickup ? "pickup" : "dropoff" }, 400);
    }
    console.error("quote error:", err);
    return c.json({ error: "Could not calculate a price for these addresses. Please try again." }, 502);
  }
});
