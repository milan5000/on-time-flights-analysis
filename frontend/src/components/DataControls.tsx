import type { LoadDataResponse } from "@/lib/types";

type DataControlsProps = {
  flightCount: number;
  loading: boolean;
  actionPending: boolean;
  message: string | null;
  error: string | null;
  onRefresh: () => void;
  onLoadData: () => void;
  onDeleteData: () => void;
  lastLoad: LoadDataResponse | null;
};

export function DataControls({
  flightCount,
  loading,
  actionPending,
  message,
  error,
  onRefresh,
  onLoadData,
  onDeleteData,
  lastLoad,
}: DataControlsProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Backend Data
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {loading ? "Checking Redis..." : `${flightCount.toLocaleString()} flights loaded`}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Use the FastAPI `/data` route to load, refresh, or clear the Redis-backed
            flight records that power this dashboard.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="button-secondary" disabled={actionPending} onClick={onRefresh}>
            Refresh
          </button>
          <button className="button-primary" disabled={actionPending} onClick={onLoadData}>
            Load Data
          </button>
          <button className="button-danger" disabled={actionPending} onClick={onDeleteData}>
            Clear Redis
          </button>
        </div>
      </div>

      {(message || error || lastLoad) && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
          {error ? (
            <p className="font-medium text-red-700">{error}</p>
          ) : (
            <p className="font-medium text-slate-700">
              {message ?? `${lastLoad?.message} (${lastLoad?.data_loaded ?? 0} records)`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
