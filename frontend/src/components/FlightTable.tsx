import { useMemo, useState } from "react";

import { formatMinutes } from "@/lib/flightAnalytics";
import type { Flight } from "@/lib/types";

type SortKey = "route" | "carrier" | "departure" | "arrivalDelay";

type FlightTableProps = {
  flights: Flight[];
};

export function FlightTable({ flights }: FlightTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("arrivalDelay");

  const visibleFlights = useMemo(() => {
    return [...flights].sort((a, b) => compareFlights(a, b, sortKey)).slice(0, 75);
  }, [flights, sortKey]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">Records</p>
          <h2 className="section-title">Flight sample</h2>
          <p className="mt-2 text-sm text-slate-500">
            Showing up to 75 records from the current filter.
          </p>
        </div>
        <label className="field-label w-full sm:w-52">
          Sort by
          <select
            className="field-input"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
          >
            <option value="arrivalDelay">Arrival delay</option>
            <option value="departure">Departure time</option>
            <option value="route">Route</option>
            <option value="carrier">Carrier</option>
          </select>
        </label>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Carrier</th>
              <th className="px-3 py-2 font-semibold">Route</th>
              <th className="px-3 py-2 font-semibold">Scheduled</th>
              <th className="px-3 py-2 font-semibold">Dep delay</th>
              <th className="px-3 py-2 font-semibold">Arr delay</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleFlights.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>
                  No flights match the current filters.
                </td>
              </tr>
            ) : (
              visibleFlights.map((flight, index) => (
                <tr
                  className="hover:bg-slate-50"
                  key={`${flight.ORIGIN}-${flight.DEST}-${flight.CRS_DEP_TIME}-${index}`}
                >
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {(flight.FL_DATE ?? "").split(" ")[0] || "N/A"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">
                    {flight.MKT_UNIQUE_CARRIER ?? "N/A"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                    {flight.ORIGIN ?? "?"} to {flight.DEST ?? "?"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {formatClock(flight.CRS_DEP_TIME)} to {formatClock(flight.CRS_ARR_TIME)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {formatMinutes(flight.DEP_DELAY)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">
                    {formatMinutes(flight.ARR_DELAY)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {flight.CANCELLED ? "Cancelled" : flight.DIVERTED ? "Diverted" : "Completed"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function compareFlights(a: Flight, b: Flight, key: SortKey): number {
  if (key === "arrivalDelay") {
    return (b.ARR_DELAY ?? -Infinity) - (a.ARR_DELAY ?? -Infinity);
  }
  if (key === "departure") {
    return (a.CRS_DEP_TIME ?? "").localeCompare(b.CRS_DEP_TIME ?? "");
  }
  if (key === "carrier") {
    return (a.MKT_UNIQUE_CARRIER ?? "").localeCompare(b.MKT_UNIQUE_CARRIER ?? "");
  }

  return `${a.ORIGIN ?? ""}-${a.DEST ?? ""}`.localeCompare(
    `${b.ORIGIN ?? ""}-${b.DEST ?? ""}`,
  );
}

function formatClock(value: string | null): string {
  const padded = (value ?? "").padStart(4, "0");
  if (padded.length !== 4) {
    return "N/A";
  }

  return `${padded.slice(0, 2)}:${padded.slice(2)}`;
}
