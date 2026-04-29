"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AnalysisJobPanel } from "@/components/AnalysisJobPanel";
import { DataControls } from "@/components/DataControls";
import { DelayBreakdown } from "@/components/DelayBreakdown";
import { DelayMap } from "@/components/DelayMap";
import { FilterPanel } from "@/components/FilterPanel";
import { FlightTable } from "@/components/FlightTable";
import { SummaryCards } from "@/components/SummaryCards";
import { deleteFlightData, fetchFlights, loadFlightData } from "@/lib/api";
import { resolveAirportLocations } from "@/lib/airportLocations";
import {
  aggregateRoutes,
  applyFlightFilters,
  emptyFilters,
  getAirportCodes,
  getDayDelaySummary,
  getDelayCauseBreakdown,
  getFilterOptions,
  getHourlyDelaySummary,
  summarizeFlights,
} from "@/lib/flightAnalytics";
import type { AirportLocation, Flight, FlightFilters, LoadDataResponse } from "@/lib/types";

export default function Home() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [filters, setFilters] = useState<FlightFilters>(emptyFilters);
  const [airportLocations, setAirportLocations] = useState<Map<string, AirportLocation>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLoad, setLastLoad] = useState<LoadDataResponse | null>(null);

  const refresh = useCallback(async (nextMessage = "Flight records refreshed.") => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchFlights();
      setFlights(data);
      setMessage(nextMessage);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to reach the backend data endpoint.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh("Connected to the backend data endpoint.");
  }, [refresh]);

  const filterOptions = useMemo(() => getFilterOptions(flights), [flights]);
  const filteredFlights = useMemo(
    () => applyFlightFilters(flights, filters),
    [flights, filters],
  );
  const summary = useMemo(() => summarizeFlights(filteredFlights), [filteredFlights]);
  const routes = useMemo(() => aggregateRoutes(filteredFlights), [filteredFlights]);
  const delayCauses = useMemo(
    () => getDelayCauseBreakdown(filteredFlights),
    [filteredFlights],
  );
  const hourlySummary = useMemo(
    () => getHourlyDelaySummary(filteredFlights),
    [filteredFlights],
  );
  const daySummary = useMemo(() => getDayDelaySummary(filteredFlights), [filteredFlights]);
  const airportCodes = useMemo(() => getAirportCodes(filteredFlights), [filteredFlights]);
  const airportCodeKey = airportCodes.join("|");

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      if (airportCodes.length === 0) {
        setAirportLocations(new Map());
        return;
      }

      setLoadingLocations(true);
      const locations = await resolveAirportLocations(airportCodes);
      if (active) {
        setAirportLocations(locations);
        setLoadingLocations(false);
      }
    }

    void loadLocations();

    return () => {
      active = false;
    };
  }, [airportCodeKey, airportCodes]);

  async function handleLoadData() {
    setActionPending(true);
    setError(null);

    try {
      const response = await loadFlightData();
      setLastLoad(response);
      await refresh(`${response.message} (${response.data_loaded.toLocaleString()} records).`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load data.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleDeleteData() {
    const shouldDelete = window.confirm(
      "Clear all flight records from the backend Redis data store?",
    );
    if (!shouldDelete) {
      return;
    }

    setActionPending(true);
    setError(null);

    try {
      const response = await deleteFlightData();
      setFlights([]);
      setLastLoad(null);
      setMessage(response.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to clear data.");
    } finally {
      setActionPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-300">
            On-Time Flights Analysis
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Explore historical US flight delays from the FastAPI analysis backend.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Load records from Redis, narrow the dataset by route or date, inspect
                delay patterns, and run the backend worker analysis without leaving the
                dashboard.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-sm text-slate-300">Current filter</p>
              <p className="mt-2 text-2xl font-semibold">
                {filteredFlights.length.toLocaleString()} flights
              </p>
              <p className="mt-2 text-sm text-slate-300">
                {filters.date || "All dates"} · {filters.origin || "All origins"} to{" "}
                {filters.destination || "all destinations"}
              </p>
            </div>
          </div>
        </header>

        <DataControls
          actionPending={actionPending}
          error={error}
          flightCount={flights.length}
          lastLoad={lastLoad}
          loading={loading}
          message={message}
          onDeleteData={handleDeleteData}
          onLoadData={handleLoadData}
          onRefresh={() => void refresh()}
        />

        <FilterPanel
          filters={filters}
          options={filterOptions}
          resultCount={filteredFlights.length}
          totalCount={flights.length}
          onChange={setFilters}
        />

        {flights.length === 0 && !loading ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">No flight data loaded</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Start the backend separately, then use Load Data to call POST /data. Once
              Redis has records, the dashboard will populate automatically.
            </p>
          </section>
        ) : (
          <>
            <SummaryCards summary={summary} />
            <DelayMap
              loadingLocations={loadingLocations}
              locations={airportLocations}
              routes={routes}
            />
            <DelayBreakdown causes={delayCauses} days={daySummary} hourly={hourlySummary} />
            <AnalysisJobPanel options={filterOptions} />
            <FlightTable flights={filteredFlights} />
          </>
        )}
      </div>
    </main>
  );
}
