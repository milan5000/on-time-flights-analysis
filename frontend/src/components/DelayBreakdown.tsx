import { delayColor, formatMinutes, formatNumber } from "@/lib/flightAnalytics";
import type { DelayCause, TimeDelaySummary } from "@/lib/types";

type DelayBreakdownProps = {
  causes: DelayCause[];
  hourly: TimeDelaySummary[];
  days: TimeDelaySummary[];
};

export function DelayBreakdown({ causes, hourly, days }: DelayBreakdownProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <DelayCauseCard causes={causes} />
      <TimeSummaryCard summaries={hourly.slice(0, 12)} title="Departure hour" />
      <TimeSummaryCard summaries={days} title="Day of week" />
    </section>
  );
}

function DelayCauseCard({ causes }: { causes: DelayCause[] }) {
  const max = Math.max(1, ...causes.map((cause) => cause.totalMinutes));

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="section-kicker">Delay Causes</p>
      <h2 className="section-title">Minutes by reason</h2>
      <div className="mt-5 space-y-4">
        {causes.map((cause) => (
          <div key={cause.key}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">{cause.label}</span>
              <span className="text-slate-500">{formatNumber(cause.totalMinutes)} min</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-sky-600"
                style={{ width: `${(cause.totalMinutes / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function TimeSummaryCard({
  summaries,
  title,
}: {
  summaries: TimeDelaySummary[];
  title: string;
}) {
  const max = Math.max(
    1,
    ...summaries.map((summary) => Math.max(0, summary.averageArrivalDelay ?? 0)),
  );

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="section-kicker">Average Arrival Delay</p>
      <h2 className="section-title">{title}</h2>
      <div className="mt-5 space-y-3">
        {summaries.length === 0 ? (
          <p className="text-sm text-slate-500">No delay data for this filter.</p>
        ) : (
          summaries.map((summary) => {
            const delay = summary.averageArrivalDelay ?? 0;
            return (
              <div
                className="grid grid-cols-[4rem_1fr_5rem] items-center gap-3 text-sm"
                key={summary.label}
              >
                <span className="font-medium text-slate-700">{summary.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: delayColor(summary.averageArrivalDelay),
                      width: `${Math.max(8, (Math.max(0, delay) / max) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-right text-slate-500">
                  {formatMinutes(summary.averageArrivalDelay)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
