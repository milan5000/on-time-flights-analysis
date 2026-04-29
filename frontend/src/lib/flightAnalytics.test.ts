import { describe, expect, test } from "bun:test";

import {
  aggregateRoutes,
  applyFlightFilters,
  average,
  dateOnly,
  delayColor,
  getDelayCauseBreakdown,
  summarizeFlights,
} from "./flightAnalytics";
import type { Flight } from "./types";

const baseFlight: Flight = {
  DAY_OF_WEEK: 1,
  FL_DATE: "1/6/2025 12:00:00 AM",
  MKT_UNIQUE_CARRIER: "AA",
  ORIGIN_AIRPORT_ID: 10423,
  ORIGIN_AIRPORT_SEQ_ID: 1042302,
  ORIGIN_CITY_MARKET_ID: 30423,
  ORIGIN: "AUS",
  ORIGIN_CITY_NAME: "Austin, TX",
  DEST_AIRPORT_ID: 11298,
  DEST_AIRPORT_SEQ_ID: 1129806,
  DEST_CITY_MARKET_ID: 30194,
  DEST: "DFW",
  DEST_CITY_NAME: "Dallas/Fort Worth, TX",
  CRS_DEP_TIME: "0800",
  DEP_DELAY: 10,
  CRS_ARR_TIME: "0915",
  ARR_DELAY: 20,
  CANCELLED: 0,
  DIVERTED: 0,
  CARRIER_DELAY: 10,
  WEATHER_DELAY: 0,
  NAS_DELAY: 5,
  SECURITY_DELAY: 0,
  LATE_AIRCRAFT_DELAY: 5,
};

function flight(overrides: Partial<Flight>): Flight {
  return { ...baseFlight, ...overrides };
}

describe("flightAnalytics", () => {
  test("averages numeric values and skips nulls", () => {
    expect(average([10, null, undefined, -5, 25])).toBe(10);
    expect(average([null, undefined])).toBeNull();
  });

  test("normalizes backend date strings to date-only values", () => {
    expect(dateOnly("1/6/2025 12:00:00 AM")).toBe("1/6/2025");
    expect(dateOnly(null)).toBe("");
  });

  test("filters flights by date, carrier, route, and delay range", () => {
    const flights = [
      baseFlight,
      flight({ ARR_DELAY: -10, DEST: "CLT" }),
      flight({ FL_DATE: "1/7/2025 12:00:00 AM", MKT_UNIQUE_CARRIER: "DL" }),
    ];

    const filtered = applyFlightFilters(flights, {
      carrier: "AA",
      date: "1/6/2025",
      destination: "DFW",
      maxDelay: "30",
      minDelay: "15",
      origin: "AUS",
    });

    expect(filtered).toEqual([baseFlight]);
  });

  test("summarizes delays, cancellations, diversions, and worst route", () => {
    const flights = [
      baseFlight,
      flight({ ARR_DELAY: 40, CANCELLED: 1, DEP_DELAY: null }),
      flight({ ARR_DELAY: null, DEST: "CLT", DIVERTED: 1 }),
    ];

    const summary = summarizeFlights(flights);

    expect(summary.totalFlights).toBe(3);
    expect(summary.averageArrivalDelay).toBe(30);
    expect(summary.cancelledFlights).toBe(1);
    expect(summary.divertedFlights).toBe(1);
    expect(summary.worstRoute?.key).toBe("AUS-DFW");
  });

  test("aggregates routes with average arrival delay", () => {
    const routes = aggregateRoutes([
      baseFlight,
      flight({ ARR_DELAY: 60 }),
      flight({ ARR_DELAY: 5, DEST: "CLT" }),
    ]);

    expect(routes[0]).toMatchObject({
      key: "AUS-DFW",
      flightCount: 2,
      averageArrivalDelay: 40,
    });
  });

  test("sums delay causes using positive minutes only", () => {
    const causes = getDelayCauseBreakdown([
      baseFlight,
      flight({ CARRIER_DELAY: 20, NAS_DELAY: null, LATE_AIRCRAFT_DELAY: -5 }),
    ]);

    expect(causes[0]).toMatchObject({ key: "CARRIER_DELAY", totalMinutes: 30 });
  });

  test("maps delay ranges to green through red colors", () => {
    expect(delayColor(-20)).toBe("#16a34a");
    expect(delayColor(10)).toBe("#ca8a04");
    expect(delayColor(90)).toBe("#dc2626");
    expect(delayColor(null)).toBe("#94a3b8");
  });
});
