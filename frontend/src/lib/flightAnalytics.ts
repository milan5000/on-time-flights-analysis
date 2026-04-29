import type {
  CarrierSummary,
  DelayCause,
  FilterOptions,
  Flight,
  FlightFilters,
  RouteSummary,
  SummaryStats,
  TimeDelaySummary,
} from "./types";

const DAY_NAMES: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

const DELAY_CAUSES: Array<{ key: DelayCause["key"]; label: string }> = [
  { key: "CARRIER_DELAY", label: "Carrier" },
  { key: "WEATHER_DELAY", label: "Weather" },
  { key: "NAS_DELAY", label: "NAS" },
  { key: "SECURITY_DELAY", label: "Security" },
  { key: "LATE_AIRCRAFT_DELAY", label: "Late aircraft" },
];

export const emptyFilters: FlightFilters = {
  date: "",
  carrier: "",
  origin: "",
  destination: "",
  minDelay: "",
  maxDelay: "",
};

export function normalizeAirportCode(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

export function dateOnly(value: string | null | undefined): string {
  return (value ?? "").trim().split(" ")[0] ?? "";
}

export function average(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => Number.isFinite(value));
  if (numeric.length === 0) {
    return null;
  }

  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

export function formatMinutes(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }

  const rounded = Math.round(value);
  if (rounded > 0) {
    return `+${rounded} min`;
  }

  return `${rounded} min`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }

  return `${Math.round(value * 10) / 10}%`;
}

export function isCancelled(flight: Flight): boolean {
  return (flight.CANCELLED ?? 0) !== 0;
}

export function isDiverted(flight: Flight): boolean {
  return (flight.DIVERTED ?? 0) !== 0;
}

export function getFilterOptions(flights: Flight[]): FilterOptions {
  return {
    dates: uniqueSorted(flights.map((flight) => dateOnly(flight.FL_DATE))),
    carriers: uniqueSorted(flights.map((flight) => flight.MKT_UNIQUE_CARRIER)),
    origins: uniqueSorted(flights.map((flight) => flight.ORIGIN)),
    destinations: uniqueSorted(flights.map((flight) => flight.DEST)),
  };
}

export function applyFlightFilters(
  flights: Flight[],
  filters: FlightFilters,
): Flight[] {
  const minDelay = filters.minDelay === "" ? null : Number(filters.minDelay);
  const maxDelay = filters.maxDelay === "" ? null : Number(filters.maxDelay);

  return flights.filter((flight) => {
    if (filters.date && dateOnly(flight.FL_DATE) !== filters.date) {
      return false;
    }

    if (filters.carrier && flight.MKT_UNIQUE_CARRIER !== filters.carrier) {
      return false;
    }

    if (filters.origin && flight.ORIGIN !== filters.origin) {
      return false;
    }

    if (filters.destination && flight.DEST !== filters.destination) {
      return false;
    }

    if (minDelay != null || maxDelay != null) {
      const delay = flight.ARR_DELAY;
      if (delay == null) {
        return false;
      }
      if (minDelay != null && delay < minDelay) {
        return false;
      }
      if (maxDelay != null && delay > maxDelay) {
        return false;
      }
    }

    return true;
  });
}

export function summarizeFlights(flights: Flight[]): SummaryStats {
  const routes = aggregateRoutes(flights);
  const carriers = aggregateCarriers(flights);
  const flightsWithArrivalDelay = flights.filter((flight) => flight.ARR_DELAY != null);
  const cancelledFlights = flights.filter(isCancelled).length;

  return {
    totalFlights: flights.length,
    flightsWithArrivalDelay: flightsWithArrivalDelay.length,
    averageDepartureDelay: average(flights.map((flight) => flight.DEP_DELAY)),
    averageArrivalDelay: average(flights.map((flight) => flight.ARR_DELAY)),
    cancelledFlights,
    divertedFlights: flights.filter(isDiverted).length,
    delayedFlights: flights.filter((flight) => (flight.ARR_DELAY ?? -Infinity) > 15)
      .length,
    onTimeFlights: flights.filter((flight) => {
      return flight.ARR_DELAY != null && flight.ARR_DELAY <= 15;
    }).length,
    cancellationRate: flights.length > 0 ? (cancelledFlights / flights.length) * 100 : 0,
    worstRoute: routes[0] ?? null,
    worstCarrier: carriers[0] ?? null,
  };
}

export function aggregateRoutes(flights: Flight[]): RouteSummary[] {
  const grouped = new Map<string, Flight[]>();

  for (const flight of flights) {
    const origin = normalizeAirportCode(flight.ORIGIN);
    const destination = normalizeAirportCode(flight.DEST);
    if (!origin || !destination) {
      continue;
    }

    const key = `${origin}-${destination}`;
    grouped.set(key, [...(grouped.get(key) ?? []), flight]);
  }

  return Array.from(grouped.entries())
    .map(([key, routeFlights]) => {
      const [origin, destination] = key.split("-");
      return {
        key,
        origin,
        destination,
        originCity: routeFlights[0]?.ORIGIN_CITY_NAME ?? null,
        destinationCity: routeFlights[0]?.DEST_CITY_NAME ?? null,
        flightCount: routeFlights.length,
        averageArrivalDelay: average(routeFlights.map((flight) => flight.ARR_DELAY)),
        averageDepartureDelay: average(routeFlights.map((flight) => flight.DEP_DELAY)),
      };
    })
    .sort(compareByAverageDelay);
}

export function aggregateCarriers(flights: Flight[]): CarrierSummary[] {
  const grouped = new Map<string, Flight[]>();

  for (const flight of flights) {
    const carrier = flight.MKT_UNIQUE_CARRIER;
    if (!carrier) {
      continue;
    }
    grouped.set(carrier, [...(grouped.get(carrier) ?? []), flight]);
  }

  return Array.from(grouped.entries())
    .map(([carrier, carrierFlights]) => ({
      carrier,
      flightCount: carrierFlights.length,
      averageArrivalDelay: average(carrierFlights.map((flight) => flight.ARR_DELAY)),
    }))
    .sort(compareByAverageDelay);
}

export function getDelayCauseBreakdown(flights: Flight[]): DelayCause[] {
  return DELAY_CAUSES.map(({ key, label }) => ({
    key,
    label,
    totalMinutes: flights.reduce((sum, flight) => sum + Math.max(0, flight[key] ?? 0), 0),
  })).sort((a, b) => b.totalMinutes - a.totalMinutes);
}

export function getHourlyDelaySummary(flights: Flight[]): TimeDelaySummary[] {
  const grouped = new Map<string, Flight[]>();

  for (const flight of flights) {
    const hour = (flight.CRS_DEP_TIME ?? "").padStart(4, "0").slice(0, 2);
    if (!hour || Number.isNaN(Number(hour))) {
      continue;
    }
    grouped.set(hour, [...(grouped.get(hour) ?? []), flight]);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([hour, hourFlights]) => ({
      label: `${hour}:00`,
      flightCount: hourFlights.length,
      averageArrivalDelay: average(hourFlights.map((flight) => flight.ARR_DELAY)),
    }));
}

export function getDayDelaySummary(flights: Flight[]): TimeDelaySummary[] {
  const grouped = new Map<number, Flight[]>();

  for (const flight of flights) {
    if (flight.DAY_OF_WEEK == null) {
      continue;
    }
    grouped.set(flight.DAY_OF_WEEK, [...(grouped.get(flight.DAY_OF_WEEK) ?? []), flight]);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, dayFlights]) => ({
      label: DAY_NAMES[day] ?? String(day),
      flightCount: dayFlights.length,
      averageArrivalDelay: average(dayFlights.map((flight) => flight.ARR_DELAY)),
    }));
}

export function delayColor(delay: number | null | undefined): string {
  if (delay == null) {
    return "#94a3b8";
  }
  if (delay <= -10) {
    return "#16a34a";
  }
  if (delay <= 0) {
    return "#65a30d";
  }
  if (delay <= 15) {
    return "#ca8a04";
  }
  if (delay <= 60) {
    return "#ea580c";
  }
  return "#dc2626";
}

export function delayLabel(delay: number | null | undefined): string {
  if (delay == null) {
    return "No delay data";
  }
  if (delay <= 0) {
    return "Early or on time";
  }
  if (delay <= 15) {
    return "Minor delay";
  }
  if (delay <= 60) {
    return "Delayed";
  }
  return "Severe delay";
}

export function getAirportCodes(flights: Flight[]): string[] {
  return uniqueSorted([
    ...flights.map((flight) => flight.ORIGIN),
    ...flights.map((flight) => flight.DEST),
  ]);
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => (value ?? "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}

function compareByAverageDelay<
  T extends { averageArrivalDelay: number | null; flightCount: number },
>(a: T, b: T): number {
  const delayDelta = (b.averageArrivalDelay ?? -Infinity) - (a.averageArrivalDelay ?? -Infinity);
  if (delayDelta !== 0) {
    return delayDelta;
  }

  return b.flightCount - a.flightCount;
}
