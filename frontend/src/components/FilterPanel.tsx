import type { FilterOptions, FlightFilters } from "@/lib/types";

type FilterPanelProps = {
  filters: FlightFilters;
  options: FilterOptions;
  resultCount: number;
  totalCount: number;
  onChange: (filters: FlightFilters) => void;
};

export function FilterPanel({
  filters,
  options,
  resultCount,
  totalCount,
  onChange,
}: FilterPanelProps) {
  function update<K extends keyof FlightFilters>(key: K, value: FlightFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">Explore</p>
          <h2 className="section-title">Filter flights</h2>
        </div>
        <p className="text-sm text-slate-500">
          Showing {resultCount.toLocaleString()} of {totalCount.toLocaleString()} records
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="field-label">
          Date
          <select
            className="field-input"
            value={filters.date}
            onChange={(event) => update("date", event.target.value)}
          >
            <option value="">All dates</option>
            {options.dates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          Carrier
          <select
            className="field-input"
            value={filters.carrier}
            onChange={(event) => update("carrier", event.target.value)}
          >
            <option value="">All carriers</option>
            {options.carriers.map((carrier) => (
              <option key={carrier} value={carrier}>
                {carrier}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          Origin
          <select
            className="field-input"
            value={filters.origin}
            onChange={(event) => update("origin", event.target.value)}
          >
            <option value="">All origins</option>
            {options.origins.map((origin) => (
              <option key={origin} value={origin}>
                {origin}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          Destination
          <select
            className="field-input"
            value={filters.destination}
            onChange={(event) => update("destination", event.target.value)}
          >
            <option value="">All destinations</option>
            {options.destinations.map((destination) => (
              <option key={destination} value={destination}>
                {destination}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          Min delay
          <input
            className="field-input"
            inputMode="numeric"
            placeholder="-30"
            type="number"
            value={filters.minDelay}
            onChange={(event) => update("minDelay", event.target.value)}
          />
        </label>

        <label className="field-label">
          Max delay
          <input
            className="field-input"
            inputMode="numeric"
            placeholder="120"
            type="number"
            value={filters.maxDelay}
            onChange={(event) => update("maxDelay", event.target.value)}
          />
        </label>
      </div>

      <button className="mt-4 text-sm font-semibold text-sky-700" onClick={() => onChange({
        carrier: "",
        date: "",
        destination: "",
        maxDelay: "",
        minDelay: "",
        origin: "",
      })}>
        Reset filters
      </button>
    </section>
  );
}
