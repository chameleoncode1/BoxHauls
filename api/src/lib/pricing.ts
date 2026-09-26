// Real-money-shaped port of src/lib/mockPricing.ts's calculatePrice() formula,
// operating in integer cents (Worker `vars` are strings, so parse once at the
// call site) to avoid floating-point drift. Same shape of breakdown the
// widget already renders, just with a real distance behind it.

export interface PricingConfigCents {
  baseFareCents: number;
  perMileCents: number;
  helperFeeCents: number;
  heavyFeeCents: number;
}

export interface PriceBreakdownCents {
  distanceMiles: number;
  baseFareCents: number;
  mileageCents: number;
  helperCents: number;
  heavyCents: number;
  totalCents: number;
}

export function calculatePriceCents(
  config: PricingConfigCents,
  distanceMiles: number,
  opts: { helper: boolean; heavy: boolean }
): PriceBreakdownCents {
  const mileageCents = Math.round(distanceMiles * config.perMileCents);
  const helperCents = opts.helper ? config.helperFeeCents : 0;
  const heavyCents = opts.heavy ? config.heavyFeeCents : 0;
  const totalCents = config.baseFareCents + mileageCents + helperCents + heavyCents;
  return {
    distanceMiles,
    baseFareCents: config.baseFareCents,
    mileageCents,
    helperCents,
    heavyCents,
    totalCents,
  };
}
