import { getAirportByIata } from "airport-data-js";
import type { AirportLocation } from "./types";

const cache = new Map<string, AirportLocation | null>();

export async function resolveAirportLocations(
  codes: string[],
): Promise<Map<string, AirportLocation>> {
  const uniqueCodes = Array.from(
    new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean)),
  );

  const locations = await Promise.all(
    uniqueCodes.map(async (code) => [code, await resolveAirportLocation(code)] as const),
  );

  return new Map(
    locations.filter((entry): entry is readonly [string, AirportLocation] => {
      return entry[1] !== null;
    }),
  );
}

async function resolveAirportLocation(code: string): Promise<AirportLocation | null> {
  if (cache.has(code)) {
    return cache.get(code) ?? null;
  }

  try {
    const [airport] = await getAirportByIata(code);
    const latitude = Number(airport?.latitude);
    const longitude = Number(airport?.longitude);

    if (!airport || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      cache.set(code, null);
      return null;
    }

    const location = {
      code,
      name: airport.airport,
      latitude,
      longitude,
    };
    cache.set(code, location);
    return location;
  } catch {
    cache.set(code, null);
    return null;
  }
}
