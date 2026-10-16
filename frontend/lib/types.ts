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
  label?: string;
}

export interface WebhookEvent {
  id: number;
  event: string;
  ticket_id: number;
  customer_name: string;
  subject: string;
  status_code: number | null;
  sent_at: string;
}

export interface InboxMetrics {
  total_tickets: number;
  open_tickets: number;
  pending_tickets: number;
  closed_tickets: number;
  closure_rate: number;
  by_priority: { name: string; label: string; count: number }[];
  by_channel: CountItem[];
}

export interface AutomationMetrics {
  webhook_url: string;
  total_events: number;
  recent_events: WebhookEvent[];
}

export interface Metrics {
  inbox?: InboxMetrics;
  automation?: AutomationMetrics;
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
