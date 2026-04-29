import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, GeometryObject } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import statesAtlas from "us-atlas/states-10m.json";

import { delayColor, formatMinutes } from "@/lib/flightAnalytics";
import type { AirportLocation, RouteSummary } from "@/lib/types";

type DelayMapProps = {
  routes: RouteSummary[];
  locations: Map<string, AirportLocation>;
  loadingLocations: boolean;
};

const width = 960;
const height = 560;
const topology = statesAtlas as unknown as Topology<{ states: GeometryCollection }>;
const states = feature(topology, topology.objects.states) as FeatureCollection<GeometryObject>;
const projection = geoAlbersUsa().fitSize([width, height], states);
const path = geoPath(projection);

export function DelayMap({ routes, locations, loadingLocations }: DelayMapProps) {
  const drawableRoutes = routes
    .slice(0, 80)
    .map((route) => {
      const origin = locations.get(route.origin);
      const destination = locations.get(route.destination);
      const originPoint = origin ? projection([origin.longitude, origin.latitude]) : null;
      const destinationPoint = destination
        ? projection([destination.longitude, destination.latitude])
        : null;

      if (!origin || !destination || !originPoint || !destinationPoint) {
        return null;
      }

      return { route, origin, destination, originPoint, destinationPoint };
    })
    .filter((route): route is NonNullable<typeof route> => route !== null);

  const missingRoutes = Math.max(0, Math.min(routes.length, 80) - drawableRoutes.length);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">Route Map</p>
          <h2 className="section-title">Average arrival delay by route</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
          <span className="legend-pill bg-green-600 text-white">Early</span>
          <span className="legend-pill bg-yellow-600 text-white">Minor</span>
          <span className="legend-pill bg-orange-600 text-white">Delayed</span>
          <span className="legend-pill bg-red-600 text-white">Severe</span>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
        <svg
          aria-label="US map showing flight routes colored by average arrival delay"
          className="h-auto w-full"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <rect fill="#f8fafc" height={height} width={width} />
          {states.features.map((state, index) => (
            <path
              d={path(state) ?? undefined}
              fill="#e2e8f0"
              key={`${state.id ?? "state"}-${index}`}
              stroke="#ffffff"
              strokeWidth={1}
            />
          ))}
          {drawableRoutes.toReversed().map(({ route, originPoint, destinationPoint }) => (
            <g key={route.key}>
              <line
                stroke={delayColor(route.averageArrivalDelay)}
                strokeLinecap="round"
                strokeOpacity={0.78}
                strokeWidth={Math.min(8, 1.5 + Math.sqrt(route.flightCount))}
                x1={originPoint[0]}
                x2={destinationPoint[0]}
                y1={originPoint[1]}
                y2={destinationPoint[1]}
              >
                <title>
                  {route.origin} to {route.destination}:{" "}
                  {formatMinutes(route.averageArrivalDelay)} across {route.flightCount} flights
                </title>
              </line>
              <circle cx={originPoint[0]} cy={originPoint[1]} fill="#0f172a" r={3} />
              <circle cx={destinationPoint[0]} cy={destinationPoint[1]} fill="#0f172a" r={3} />
            </g>
          ))}
        </svg>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {loadingLocations
          ? "Resolving airport coordinates..."
          : drawableRoutes.length === 0
            ? "No drawable routes for the current filters. Try broadening the filters or loading data."
            : `Showing ${drawableRoutes.length} route${drawableRoutes.length === 1 ? "" : "s"} on the map.`}
        {missingRoutes > 0
          ? ` ${missingRoutes} route${missingRoutes === 1 ? "" : "s"} could not be mapped because an airport coordinate was unavailable.`
          : ""}
      </p>
    </section>
  );
}
