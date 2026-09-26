// Thin wrapper around Google Maps Platform's Geocoding and Distance Matrix
// APIs. Both need to be enabled on the API key (GOOGLE_MAPS_API_KEY, set via
// `wrangler secret put`) in the Google Cloud project.

export class GeocodeError extends Error {
  constructor(
    message: string,
    public readonly address: string
  ) {
    super(message);
    this.name = "GeocodeError";
  }
}

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export async function geocodeAddress(address: string, apiKey: string): Promise<GeocodeResult> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Geocoding API request failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    status: string;
    results: Array<{
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };

  if (data.status !== "OK" || data.results.length === 0) {
    throw new GeocodeError(`Could not find that address: "${address}"`, address);
  }

  const top = data.results[0];
  return {
    lat: top.geometry.location.lat,
    lng: top.geometry.location.lng,
    formattedAddress: top.formatted_address,
  };
}

interface DistanceResult {
  distanceMiles: number;
  durationMinutes: number;
}

const METERS_PER_MILE = 1609.344;

// Uses the Routes API (computeRoutes) rather than the legacy Distance Matrix
// API — Google blocks the legacy API on new Cloud projects in favor of this
// one (confirmed via a real REQUEST_DENIED response during implementation:
// "You're calling a legacy API, which is not enabled for your project...
// switch to the Routes API"). Needs the "Routes API" enabled on the key,
// not "Distance Matrix API".
export async function drivingDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  apiKey: string
): Promise<DistanceResult> {
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: "DRIVE",
      units: "IMPERIAL",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Routes API request failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as {
    routes?: Array<{ distanceMeters: number; duration: string }>;
  };

  const route = data.routes?.[0];
  if (!route) {
    throw new Error("Could not calculate driving distance between these addresses.");
  }

  const durationSeconds = Number(route.duration.replace(/s$/, ""));
  return {
    distanceMiles: Math.round((route.distanceMeters / METERS_PER_MILE) * 10) / 10,
    durationMinutes: Math.round(durationSeconds / 60),
  };
}
