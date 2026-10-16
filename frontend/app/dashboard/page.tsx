import Link from "next/link";
import BarList from "@/components/BarList";
import { getMetrics } from "@/lib/api";
import { formatDateTime } from "@/lib/labels";
import type { Metrics } from "@/lib/types";

export const dynamic = "force-dynamic";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  return `${MONTHS[Number(m) - 1]}/${year.slice(2)}`;
}

export default async function DashboardPage() {
  let metrics: Metrics;
  try {
    metrics = await getMetrics();
  } catch (err) {
    return (
      <>
        <header className="page-header">
          <div>
            <p className="eyebrow">Métricas</p>
            <h1>Dashboard</h1>
          </div>
        </header>
        <div className="alert">⚠ {(err as Error).message}</div>
      </>
    );
  }

  const { summary, inbox, automation } = metrics;
  const maxMonth = Math.max(...metrics.tickets_by_month.map((m) => m.count), 1);
  const lastDays = metrics.tickets_by_day.slice(-14);
  const maxDay = Math.max(...lastDays.map((d) => d.count), 1);

  // Cards de status em tempo real da caixa de entrada
  const inboxCards = inbox ? [
    { label: "Tickets na Caixa", value: inbox.total_tickets, sub: "Total cadastrado", accent: "violet" },
    { label: "Abertos", value: inbox.open_tickets, sub: "Aguardando ação", accent: "amber" },
    { label: "Pendentes", value: inbox.pending_tickets, sub: "Em andamento", accent: "sky" },
    { label: "Fechados", value: inbox.closed_tickets, sub: `${inbox.closure_rate}% resolvidos`, accent: "emerald" },
  ] : [];

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Gestão Operacional & Analítica</p>
          <h1>Dashboard Integrado</h1>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span className="live-pill">
            <span className="live-dot" /> Sistema Integrado ao Vivo
          </span>
          <Link href="/tickets" className="btn btn-secondary" style={{ padding: "8px 14px", borderRadius: "8px" }}>
            Ver Caixa de Entrada →
          </Link>
        </div>
      </header>

      {/* ================= SEÇÃO 1: CAIXA DE ENTRADA AO VIVO ================= */}
      <div className="section-header" style={{ marginTop: "12px" }}>
        <div className="section-title-group">
          <h2 className="section-heading">Caixa de Entrada em Tempo Real</h2>
          <span className="live-pill">
            <span className="live-dot" /> Sincronizado com os Tickets
          </span>
        </div>
        <p className="muted" style={{ fontSize: "0.82rem" }}>
          Alterações de status e prioridade nos tickets refletem instantaneamente aqui.
        </p>
      </div>

      {inbox && (
        <>
          <div className="stats">
            {inboxCards.map((card, i) => (
              <div key={card.label} className={`card stat stat-${card.accent}`} style={{ animationDelay: `${i * 60}ms` }}>
                <span className="stat-label">{card.label}</span>
                <strong className="stat-value">{card.value}</strong>
                <span className="muted" style={{ fontSize: "0.75rem", marginTop: "4px", display: "block" }}>{card.sub}</span>
              </div>
            ))}
          </div>

          <div className="grid-2">
            <BarList
              title="Tickets da Caixa por Canal"
              items={inbox.by_channel.map((c) => ({ name: c.name.toUpperCase(), count: c.count }))}
            />
            <BarList
              title="Tickets da Caixa por Prioridade"
              items={inbox.by_priority.map((p) => ({ name: p.label, count: p.count }))}
            />
          </div>
        </>
      )}

      {/* ================= SEÇÃO 2: AUTOMAÇÃO N8N & WEBHOOKS ================= */}
      <section className="automation-banner">
        <div className="automation-header">
          <div className="automation-title">
            <div className="automation-icon">⚡</div>
            <div>
              <h3>Automação & Webhooks n8n</h3>
              <p className="muted" style={{ fontSize: "0.8rem", marginTop: "2px" }}>
                Gatilho automático disparado ao fechar tickets ou definir prioridade Alta.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span className="automation-url">{automation?.webhook_url ?? "http://localhost:5678/webhook/ticket-events"}</span>
            <span className="live-pill" style={{ background: "hsl(258 90% 68% / 0.15)", color: "var(--violet)", borderColor: "hsl(258 90% 68% / 0.3)" }}>
              {automation?.total_events ?? 0} eventos disparados
            </span>
          </div>
        </div>

        <div className="events-feed">
          {automation && automation.recent_events && automation.recent_events.length > 0 ? (
            automation.recent_events.map((evt) => (
              <div key={evt.id} className="event-item">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className={`event-badge ${evt.event === "ticket_closed" ? "event-badge-closed" : "event-badge-high"}`}>
                    {evt.event === "ticket_closed" ? "✓ Ticket Fechado" : "⚡ Prioridade Alta"}
                  </span>
                  <Link href={`/tickets/${evt.ticket_id}`} style={{ fontWeight: 600, color: "var(--text)" }}>
                    #{evt.ticket_id} {evt.subject}
                  </Link>
                  <span className="muted">({evt.customer_name})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.78rem" }}>
                  <span className="muted">{evt.sent_at}</span>
                  <span style={{ color: "var(--emerald)", fontWeight: 600 }}>
                    {evt.status_code ? `HTTP ${evt.status_code}` : "Disparado"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="event-empty">
              ⚡ Nenhum webhook disparado ainda. Acesse qualquer ticket e mude para <strong>Fechado</strong> ou prioridade <strong>Alta</strong> para ver o disparo em tempo real.
            </div>
          )}
        </div>
      </section>

      {/* ================= SEÇÃO 3: DADOS HISTÓRICOS DO KAGGLE (ETL) ================= */}
      <div className="section-header" style={{ marginTop: "44px" }}>
        <div className="section-title-group">
          <h2 className="section-heading">Inteligência Analítica · Dataset Kaggle</h2>
          <span className="muted" style={{ fontSize: "0.82rem" }}>
            Processado via pandas ({summary.total_tickets.toLocaleString("pt-BR")} chamados históricos)
          </span>
        </div>
        <p className="muted" style={{ fontSize: "0.78rem" }}>
          Fonte: <a href={metrics.source.url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{metrics.source.name}</a>
        </p>
      </div>

      <div className="stats">
        <div className="card stat stat-violet">
          <span className="stat-label">Total Histórico</span>
          <strong className="stat-value">{summary.total_tickets.toLocaleString("pt-BR")}</strong>
          <span className="muted" style={{ fontSize: "0.75rem", marginTop: "4px", display: "block" }}>Registros no dataset</span>
        </div>
        <div className="card stat stat-sky">
          <span className="stat-label">Satisfação Média</span>
          <strong className="stat-value">{summary.avg_satisfaction != null ? `${summary.avg_satisfaction.toFixed(2)} / 5` : "—"}</strong>
          <span className="muted" style={{ fontSize: "0.75rem", marginTop: "4px", display: "block" }}>Avaliação dos clientes</span>
        </div>
        <div className="card stat stat-emerald">
          <span className="stat-label">Histórico Fechados</span>
          <strong className="stat-value">{summary.closed_tickets.toLocaleString("pt-BR")}</strong>
          <span className="muted" style={{ fontSize: "0.75rem", marginTop: "4px", display: "block" }}>Resolvidos no período</span>
        </div>
        <div className="card stat stat-amber">
          <span className="stat-label">Histórico Abertos</span>
          <strong className="stat-value">{summary.open_tickets.toLocaleString("pt-BR")}</strong>
          <span className="muted" style={{ fontSize: "0.75rem", marginTop: "4px", display: "block" }}>Pendentes no dataset</span>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title">
          Volume de Tickets por Mês <span className="muted">({summary.period_start} → {summary.period_end})</span>
        </h2>
        <div className="column-chart">
          {metrics.tickets_by_month.map((m) => (
            <div key={m.month} className="column" title={`${formatMonth(m.month)}: ${m.count}`}>
              <span className="column-value">{m.count}</span>
              <div className="column-bar" style={{ height: `${(m.count / maxMonth) * 100}%` }} />
              <span className="column-label">{formatMonth(m.month)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Volume Diário <span className="muted">(últimos 14 dias do dataset)</span></h2>
          <table className="table compact">
            <tbody>
              {lastDays.map((d) => (
                <tr key={d.date}>
                  <td className="nowrap muted">{new Date(`${d.date}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                  <td className="full">
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(d.count / maxDay) * 100}%` }} />
                    </div>
                  </td>
                  <td className="right"><strong>{d.count}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <BarList title="Top Tipos de Chamado (Kaggle)" items={metrics.top_ticket_types} />
      </div>

      <div className="grid-3">
        <BarList title="Top Produtos com Chamados" items={metrics.top_products} />
        <BarList title="Canais Históricos" items={metrics.by_channel} />
        <BarList title="Prioridades Históricas" items={metrics.by_priority} />
      </div>
    </>
  );
}
