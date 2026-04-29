export type Flight = {
  DAY_OF_WEEK: number | null;
  FL_DATE: string | null;
  MKT_UNIQUE_CARRIER: string | null;
  ORIGIN_AIRPORT_ID: number | null;
  ORIGIN_AIRPORT_SEQ_ID: number | null;
  ORIGIN_CITY_MARKET_ID: number | null;
  ORIGIN: string | null;
  ORIGIN_CITY_NAME: string | null;
  DEST_AIRPORT_ID: number | null;
  DEST_AIRPORT_SEQ_ID: number | null;
  DEST_CITY_MARKET_ID: number | null;
  DEST: string | null;
  DEST_CITY_NAME: string | null;
  CRS_DEP_TIME: string | null;
  DEP_DELAY: number | null;
  CRS_ARR_TIME: string | null;
  ARR_DELAY: number | null;
  CANCELLED: number | null;
  DIVERTED: number | null;
  CARRIER_DELAY: number | null;
  WEATHER_DELAY: number | null;
  NAS_DELAY: number | null;
  SECURITY_DELAY: number | null;
  LATE_AIRCRAFT_DELAY: number | null;
};

export type LoadDataResponse = {
  message: string;
  data_loaded: number;
};

export type DeleteDataResponse = {
  message: string;
};

export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "FINISHED -- ERROR"
  | "FINISHED -- SUCCESS"
  | string;

export type Job = {
  id: string;
  status: JobStatus;
  origin: string | null;
  dest: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
};

export type JobInput = {
  origin: string;
  dest: string;
  date: string;
};

export type BackendSummary = {
  total_flights: number;
  avg_departure_delay: number | null;
  avg_arrival_delay: number | null;
  cancelled_flights: number;
  diverted_flights: number;
};

export type BackendAnalysis = {
  filter: {
    origin: string | null;
    dest: string | null;
    date: string | null;
  };
  summary: BackendSummary;
  flights: Flight[];
  all_days_flights: Flight[];
};

export type JobResultPending = {
  job_id: string;
  status: JobStatus;
  message: string;
};

export type JobResultSuccess = {
  job_id: string;
  status: JobStatus;
  result: BackendAnalysis;
};

export type JobResult = JobResultPending | JobResultSuccess;

export type FlightFilters = {
  date: string;
  carrier: string;
  origin: string;
  destination: string;
  minDelay: string;
  maxDelay: string;
};

export type FilterOptions = {
  dates: string[];
  carriers: string[];
  origins: string[];
  destinations: string[];
};

export type SummaryStats = {
  totalFlights: number;
  flightsWithArrivalDelay: number;
  averageDepartureDelay: number | null;
  averageArrivalDelay: number | null;
  cancelledFlights: number;
  divertedFlights: number;
  delayedFlights: number;
  onTimeFlights: number;
  cancellationRate: number;
  worstRoute: RouteSummary | null;
  worstCarrier: CarrierSummary | null;
};

export type RouteSummary = {
  key: string;
  origin: string;
  destination: string;
  originCity: string | null;
  destinationCity: string | null;
  flightCount: number;
  averageArrivalDelay: number | null;
  averageDepartureDelay: number | null;
};

export type CarrierSummary = {
  carrier: string;
  flightCount: number;
  averageArrivalDelay: number | null;
};

export type DelayCause = {
  key: keyof Pick<
    Flight,
    | "CARRIER_DELAY"
    | "WEATHER_DELAY"
    | "NAS_DELAY"
    | "SECURITY_DELAY"
    | "LATE_AIRCRAFT_DELAY"
  >;
  label: string;
  totalMinutes: number;
};

export type TimeDelaySummary = {
  label: string;
  flightCount: number;
  averageArrivalDelay: number | null;
};

export type AirportLocation = {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
};
