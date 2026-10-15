import type { Metrics, Priority, Status, Ticket } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Erro ${res.status} ao chamar ${path}`);
  }
  return res.json() as Promise<T>;
}

export const getTickets = (q?: string) =>
  request<Ticket[]>(`/tickets${q ? `?q=${encodeURIComponent(q)}` : ""}`);

export const getTicket = (id: number | string) => request<Ticket>(`/tickets/${id}`);

export const updateTicket = (
  id: number | string,
  changes: Partial<{ status: Status; priority: Priority }>,
) => request<Ticket>(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(changes) });

export const getMetrics = () => request<Metrics>("/metrics");
