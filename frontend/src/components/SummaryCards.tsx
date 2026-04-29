import { formatMinutes, formatNumber, formatPercent } from "@/lib/flightAnalytics";
import type { SummaryStats } from "@/lib/types";

type SummaryCardsProps = {
  summary: SummaryStats;
};

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: "Flights",
      value: formatNumber(summary.totalFlights),
      detail: `${formatNumber(summary.flightsWithArrivalDelay)} with arrival delay data`,
    },
    {
      label: "Avg arrival delay",
      value: formatMinutes(summary.averageArrivalDelay),
      detail: `${formatNumber(summary.delayedFlights)} delayed more than 15 min`,
    },
    {
      label: "Avg departure delay",
      value: formatMinutes(summary.averageDepartureDelay),
      detail: `${formatNumber(summary.onTimeFlights)} arrived within 15 min`,
    },
    {
      label: "Exceptions",
      value: `${formatNumber(summary.cancelledFlights)} / ${formatNumber(
        summary.divertedFlights,
      )}`,
      detail: `${formatPercent(summary.cancellationRate)} cancelled, then diverted count`,
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          key={card.label}
        >
          <p className="text-sm font-medium text-slate-500">{card.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {card.value}
          </p>
          <p className="mt-2 text-sm text-slate-600">{card.detail}</p>
        </article>
      ))}

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2 xl:col-span-2">
        <p className="section-kicker">Worst averages</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-slate-500">Route</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {summary.worstRoute
                ? `${summary.worstRoute.origin} -> ${summary.worstRoute.destination}`
                : "N/A"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {summary.worstRoute
                ? `${formatMinutes(summary.worstRoute.averageArrivalDelay)} over ${summary.worstRoute.flightCount} flights`
                : "No route data in the current filter."}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Carrier</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {summary.worstCarrier?.carrier ?? "N/A"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {summary.worstCarrier
                ? `${formatMinutes(summary.worstCarrier.averageArrivalDelay)} over ${summary.worstCarrier.flightCount} flights`
                : "No carrier data in the current filter."}
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
