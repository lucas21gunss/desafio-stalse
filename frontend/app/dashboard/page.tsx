import BarList from "@/components/BarList";
import { getMetrics } from "@/lib/api";
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

  const { summary } = metrics;
  const maxMonth = Math.max(...metrics.tickets_by_month.map((m) => m.count), 1);
  const lastDays = metrics.tickets_by_day.slice(-14);
  const maxDay = Math.max(...lastDays.map((d) => d.count), 1);

  const cards = [
    { label: "Total de tickets", value: summary.total_tickets.toLocaleString("pt-BR"), accent: "violet" },
    { label: "Abertos", value: summary.open_tickets.toLocaleString("pt-BR"), accent: "amber" },
    { label: "Fechados", value: summary.closed_tickets.toLocaleString("pt-BR"), accent: "emerald" },
    {
      label: "Satisfação média",
      value: summary.avg_satisfaction != null ? `${summary.avg_satisfaction.toFixed(2)} / 5` : "—",
      accent: "sky",
    },
  ];

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Métricas · Kaggle</p>
          <h1>Dashboard</h1>
        </div>
        <p className="muted source">
          Fonte:{" "}
          <a href={metrics.source.url} target="_blank" rel="noreferrer">
            {metrics.source.name}
          </a>
          <br />
          Gerado em {new Date(metrics.generated_at).toLocaleString("pt-BR")}
        </p>
      </header>

      <div className="stats">
        {cards.map((card, i) => (
          <div key={card.label} className={`card stat stat-${card.accent}`} style={{ animationDelay: `${i * 70}ms` }}>
            <span className="stat-label">{card.label}</span>
            <strong className="stat-value">{card.value}</strong>
          </div>
        ))}
      </div>

      <section className="card">
        <h2 className="card-title">
          Tickets por mês <span className="muted">({summary.period_start} → {summary.period_end})</span>
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
          <h2 className="card-title">Tickets por dia <span className="muted">(últimos 14 dias do dataset)</span></h2>
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
        <BarList title="Top tipos de ticket" items={metrics.top_ticket_types} />
      </div>

      <div className="grid-3">
        <BarList title="Top produtos" items={metrics.top_products} />
        <BarList title="Por canal" items={metrics.by_channel} />
        <BarList title="Por prioridade" items={metrics.by_priority} />
      </div>
    </>
  );
}
