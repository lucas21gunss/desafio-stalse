"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ChannelTag, PriorityBadge, StatusBadge } from "@/components/Badges";
import { getTickets } from "@/lib/api";
import { STATUS_LABELS, STATUSES, formatDateTime } from "@/lib/labels";
import type { Status, Ticket } from "@/lib/types";

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTickets()
      .then(setTickets)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((t) => {
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesText =
        !term ||
        [t.customer_name, t.subject, t.channel, t.description ?? ""].some((field) =>
          field.toLowerCase().includes(term),
        );
      return matchesStatus && matchesText;
    });
  }, [tickets, search, statusFilter]);

  const countByStatus = (status: Status) => tickets.filter((t) => t.status === status).length;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Caixa de entrada</p>
          <h1>Tickets</h1>
        </div>
        <div className="search">
          <span className="search-icon">⌕</span>
          <input
            id="ticket-search"
            type="search"
            placeholder="Buscar por cliente, assunto, canal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="filters">
        <button
          id="filter-all"
          className={`chip ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          Todos <span>{tickets.length}</span>
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            id={`filter-${status}`}
            className={`chip ${statusFilter === status ? "active" : ""}`}
            onClick={() => setStatusFilter(status)}
          >
            {STATUS_LABELS[status]} <span>{countByStatus(status)}</span>
          </button>
        ))}
      </div>

      {error && <div className="alert">⚠ {error} — o backend está rodando em :8000?</div>}

      <div className="card table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Criado em</th>
              <th>Cliente</th>
              <th>Canal</th>
              <th>Assunto</th>
              <th>Status</th>
              <th>Prioridade</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan={6}>
                    <div className="skeleton" />
                  </td>
                </tr>
              ))}

            {!loading &&
              filtered.map((ticket, index) => (
                <tr
                  key={ticket.id}
                  id={`ticket-row-${ticket.id}`}
                  className="row-link"
                  style={{ animationDelay: `${index * 25}ms` }}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                >
                  <td className="muted nowrap">{formatDateTime(ticket.created_at)}</td>
                  <td>
                    <div className="customer">
                      <span className="avatar">{ticket.customer_name[0]}</span>
                      {ticket.customer_name}
                    </div>
                  </td>
                  <td>
                    <ChannelTag channel={ticket.channel} />
                  </td>
                  <td className="subject">{ticket.subject}</td>
                  <td>
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td>
                    <PriorityBadge priority={ticket.priority} />
                  </td>
                </tr>
              ))}

            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  Nenhum ticket encontrado para “{search}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
