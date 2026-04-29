import type {
  DeleteDataResponse,
  Flight,
  Job,
  JobInput,
  JobResult,
  LoadDataResponse,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string; message?: string };
    return body.detail ?? body.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }

  return (await response.json()) as T;
}

export function fetchFlights(): Promise<Flight[]> {
  return requestJson<Flight[]>("/api/data", { cache: "no-store" });
}

export function loadFlightData(): Promise<LoadDataResponse> {
  return requestJson<LoadDataResponse>("/api/data", { method: "POST" });
}

export function deleteFlightData(): Promise<DeleteDataResponse> {
  return requestJson<DeleteDataResponse>("/api/data", { method: "DELETE" });
}

export function createJob(input: JobInput): Promise<Job> {
  return requestJson<Job>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchJob(jobId: string): Promise<Job> {
  return requestJson<Job>(`/api/jobs/${encodeURIComponent(jobId)}`, {
    cache: "no-store",
  });
}

export function fetchJobResult(jobId: string): Promise<JobResult> {
  return requestJson<JobResult>(`/api/results/${encodeURIComponent(jobId)}`, {
    cache: "no-store",
  });
}

export function resultImageUrl(jobId: string): string {
  return `/api/results/${encodeURIComponent(jobId)}/image`;
}
