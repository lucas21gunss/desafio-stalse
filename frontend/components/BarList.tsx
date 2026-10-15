import type { CountItem } from "@/lib/types";

interface BarListProps {
  title: string;
  items: CountItem[];
  labels?: Record<string, string>;
}

/** Lista de barras horizontais (ranking simples, sem lib de gráficos). */
export default function BarList({ title, items, labels }: BarListProps) {
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <section className="card">
      <h2 className="card-title">{title}</h2>
      <ul className="bar-list">
        {items.map((item, index) => (
          <li key={item.name} style={{ animationDelay: `${index * 60}ms` }}>
            <div className="bar-list-label">
              <span>{labels?.[item.name] ?? item.name}</span>
              <strong>{item.count.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
