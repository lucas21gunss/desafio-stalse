"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ChannelTag, PriorityBadge, StatusBadge } from "@/components/Badges";
import { getTicket, updateTicket } from "@/lib/api";
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS, formatDateTime } from "@/lib/labels";
import type { Priority, Status, Ticket } from "@/lib/types";

type Toast = { kind: "success" | "error"; message: string } | null;

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    getTicket(id).then(setTicket).catch((err: Error) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleChange(changes: Partial<{ status: Status; priority: Priority }>) {
    if (!ticket) return;
    setSaving(true);
    try {
      const updated = await updateTicket(ticket.id, changes);
      const triggersWebhook =
        (changes.status === "closed" && ticket.status !== "closed") ||
        (changes.priority === "high" && ticket.priority !== "high");
      setTicket(updated);
      setToast({
        kind: "success",
        message: triggersWebhook ? "Ticket atualizado · webhook enviado ao n8n ⚡" : "Ticket atualizado",
      });
    } catch (err) {
      setToast({ kind: "error", message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <>
        <Link href="/tickets" className="back-link">← Voltar</Link>
        <div className="alert">⚠ {error}</div>
      </>
    );
  }

  if (!ticket) {
    return <div className="card"><div className="skeleton tall" /></div>;
  }

  return (
    <>
      <Link href="/tickets" className="back-link" id="back-to-tickets">← Voltar para tickets</Link>

      <header className="page-header">
        <div>
          <p className="eyebrow">Ticket #{ticket.id}</p>
          <h1>{ticket.subject}</h1>
        </div>
        <div className="header-badges">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </header>

      <div className="detail-grid">
        <section className="card">
          <h2 className="card-title">Mensagem</h2>
          <div className="message">
            <div className="customer">
              <span className="avatar lg">{ticket.customer_name[0]}</span>
              <div>
                <strong>{ticket.customer_name}</strong>
                <p className="muted">{formatDateTime(ticket.created_at)}</p>
              </div>
            </div>
            <p className="message-body">{ticket.description ?? "Sem descrição."}</p>
          </div>

          <dl className="meta">
            <div><dt>Canal</dt><dd><ChannelTag channel={ticket.channel} /></dd></div>
            <div><dt>Criado em</dt><dd>{formatDateTime(ticket.created_at)}</dd></div>
          </dl>
        </section>

        <aside className="card actions">
          <h2 className="card-title">Status</h2>
          <div className="segmented">
            {STATUSES.map((status) => (
              <button
                key={status}
                id={`status-${status}`}
                disabled={saving}
                className={`seg seg-status-${status} ${ticket.status === status ? "active" : ""}`}
                onClick={() => ticket.status !== status && handleChange({ status })}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          <h2 className="card-title">Prioridade</h2>
          <div className="segmented">
            {PRIORITIES.map((priority) => (
              <button
                key={priority}
                id={`priority-${priority}`}
                disabled={saving}
                className={`seg seg-priority-${priority} ${ticket.priority === priority ? "active" : ""}`}
                onClick={() => ticket.priority !== priority && handleChange({ priority })}
              >
                {PRIORITY_LABELS[priority]}
              </button>
            ))}
          </div>

          <p className="hint">
            ⚡ Mudar para <strong>Fechado</strong> ou prioridade <strong>Alta</strong> dispara o
            webhook do n8n e atualiza o Dashboard em tempo real.
          </p>
          <div style={{ marginTop: "14px" }}>
            <Link href="/dashboard" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", fontSize: "0.82rem", borderRadius: "8px" }}>
              📊 Ver impacto no Dashboard →
            </Link>
          </div>
        </aside>
      </div>

      {toast && <div className={`toast toast-${toast.kind}`}>{toast.message}</div>}
    </>
  );
}
