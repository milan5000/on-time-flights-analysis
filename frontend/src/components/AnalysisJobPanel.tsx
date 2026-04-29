import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";

import { createJob, fetchJobResult, resultImageUrl } from "@/lib/api";
import { formatMinutes, formatNumber } from "@/lib/flightAnalytics";
import type { FilterOptions, Job, JobResult } from "@/lib/types";

type AnalysisJobPanelProps = {
  options: FilterOptions;
};

const finishedStatuses = new Set(["FINISHED -- SUCCESS", "FINISHED -- ERROR"]);

export function AnalysisJobPanel({ options }: AnalysisJobPanelProps) {
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [date, setDate] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [result, setResult] = useState<JobResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!job || finishedStatuses.has(job.status)) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const nextResult = await fetchJobResult(job.id);
        setResult(nextResult);
        setJob((current) =>
          current ? { ...current, status: nextResult.status } : current,
        );
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed to poll job result.");
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [job]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const created = await createJob({
        origin: origin.trim().toUpperCase(),
        dest: dest.trim().toUpperCase(),
        date: date.trim(),
      });
      setJob(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create analysis job.");
    } finally {
      setSubmitting(false);
    }
  }

  const successfulResult = result && "result" in result ? result.result : null;
  const pendingMessage = result && "message" in result ? result.message : null;
  const imageSrc =
    successfulResult && job ? `${resultImageUrl(job.id)}?v=${job.end_time ?? job.status}` : null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="section-kicker">Backend Analysis</p>
          <h2 className="section-title">Run an origin-destination job</h2>
          <p className="mt-2 text-sm text-slate-600">
            Submit the same query shape handled by FastAPI and the Redis worker. The
            dashboard polls the job result route and shows the generated heatmap image once
            the worker finishes.
          </p>

          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <label className="field-label">
              Origin
              <input
                className="field-input"
                list="job-origins"
                maxLength={3}
                placeholder="AUS"
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
              />
              <datalist id="job-origins">
                {options.origins.map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
            </label>

            <label className="field-label">
              Destination
              <input
                className="field-input"
                list="job-destinations"
                maxLength={3}
                placeholder="DFW"
                value={dest}
                onChange={(event) => setDest(event.target.value)}
              />
              <datalist id="job-destinations">
                {options.destinations.map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
            </label>

            <label className="field-label">
              Date
              <input
                className="field-input"
                list="job-dates"
                placeholder="1/6/2025"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              <datalist id="job-dates">
                {options.dates.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </label>

            <button className="button-primary w-fit" disabled={submitting} type="submit">
              {submitting ? "Submitting..." : "Run backend job"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl bg-slate-50 p-4">
          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : job ? (
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Job {job.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{job.status}</p>
                </div>
                {!finishedStatuses.has(job.status) && (
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                    Polling
                  </span>
                )}
              </div>

              {successfulResult ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MiniMetric
                      label="Flights"
                      value={formatNumber(successfulResult.summary.total_flights)}
                    />
                    <MiniMetric
                      label="Avg dep"
                      value={formatMinutes(successfulResult.summary.avg_departure_delay)}
                    />
                    <MiniMetric
                      label="Avg arr"
                      value={formatMinutes(successfulResult.summary.avg_arrival_delay)}
                    />
                  </div>
                  {imageSrc && (
                    <Image
                      alt="Backend-generated heatmap for the selected analysis job"
                      className="w-full rounded-2xl border border-slate-200 bg-white"
                      height={420}
                      src={imageSrc}
                      unoptimized
                      width={900}
                    />
                  )}
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-600">
                  {pendingMessage ??
                    "Waiting for the worker to process the query. The frontend does not start Docker or the backend service."}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Run a query to compare the client-side dashboard with the backend worker
              summary and heatmap.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
