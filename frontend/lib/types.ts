export type Status = "open" | "pending" | "closed";
export type Priority = "low" | "medium" | "high";

export interface Ticket {
  id: number;
  created_at: string;
  customer_name: string;
  channel: string;
  subject: string;
  description: string | null;
  status: Status;
  priority: Priority;
}

export interface CountItem {
  name: string;
  count: number;
}

export interface Metrics {
  generated_at: string;
  source: { name: string; url: string; rows: number };
  summary: {
    total_tickets: number;
    open_tickets: number;
    closed_tickets: number;
    avg_satisfaction: number | null;
    period_start: string;
    period_end: string;
  };
  tickets_by_day: { date: string; count: number }[];
  tickets_by_month: { month: string; count: number }[];
  top_ticket_types: CountItem[];
  top_products: CountItem[];
  by_channel: CountItem[];
  by_priority: CountItem[];
  by_status: CountItem[];
}
