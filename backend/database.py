"""Camada de acesso ao SQLite (sqlite3 da stdlib, sem ORM)."""

import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "db.sqlite"
SEEDS_PATH = BASE_DIR / "seeds" / "tickets.json"

SCHEMA = """
CREATE TABLE IF NOT EXISTS tickets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at    TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    channel       TEXT NOT NULL,
    subject       TEXT NOT NULL,
    description   TEXT,
    status        TEXT NOT NULL DEFAULT 'open',
    priority      TEXT NOT NULL DEFAULT 'medium'
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    event         TEXT NOT NULL,
    ticket_id     INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    subject       TEXT NOT NULL,
    status_code   INTEGER,
    payload       TEXT NOT NULL,
    sent_at       TEXT NOT NULL
);
"""


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Cria as tabelas e insere os seeds caso o banco esteja vazio."""
    with get_connection() as conn:
        conn.executescript(SCHEMA)
        count = conn.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]
        if count == 0:
            seed_tickets(conn)


def seed_tickets(conn: sqlite3.Connection) -> None:
    tickets = json.loads(SEEDS_PATH.read_text(encoding="utf-8"))
    conn.executemany(
        """
        INSERT INTO tickets (created_at, customer_name, channel, subject, description, status, priority)
        VALUES (:created_at, :customer_name, :channel, :subject, :description, :status, :priority)
        """,
        tickets,
    )


def list_tickets(search: str | None = None) -> list[dict]:
    query = "SELECT * FROM tickets"
    params: list[str] = []
    if search:
        query += " WHERE customer_name LIKE ? OR subject LIKE ? OR description LIKE ? OR channel LIKE ?"
        params = [f"%{search}%"] * 4
    query += " ORDER BY created_at DESC"
    with get_connection() as conn:
        return [dict(row) for row in conn.execute(query, params).fetchall()]


def get_ticket(ticket_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        return dict(row) if row else None


def update_ticket(ticket_id: int, fields: dict) -> dict | None:
    """Atualiza apenas as colunas permitidas (status / priority)."""
    allowed = {k: v for k, v in fields.items() if k in ("status", "priority")}
    if allowed:
        assignments = ", ".join(f"{column} = ?" for column in allowed)
        with get_connection() as conn:
            conn.execute(
                f"UPDATE tickets SET {assignments} WHERE id = ?",
                [*allowed.values(), ticket_id],
            )
    return get_ticket(ticket_id)


def log_webhook_event(event: str, ticket: dict, status_code: int | None, payload: dict) -> None:
    """Registra histórico de webhooks disparados para o n8n."""
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO webhook_events (event, ticket_id, customer_name, subject, status_code, payload, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                event,
                ticket.get("id", 0),
                ticket.get("customer_name", ""),
                ticket.get("subject", ""),
                status_code,
                json.dumps(payload, ensure_ascii=False),
            ),
        )


def get_recent_webhook_events(limit: int = 10) -> list[dict]:
    """Retorna os últimos eventos enviados para o n8n."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, event, ticket_id, customer_name, subject, status_code, sent_at
            FROM webhook_events
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def count_webhook_events() -> int:
    with get_connection() as conn:
        return conn.execute("SELECT COUNT(*) FROM webhook_events").fetchone()[0]


def get_inbox_metrics() -> dict:
    """Calcula métricas em tempo real diretamente da tabela de tickets."""
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]
        open_count = conn.execute("SELECT COUNT(*) FROM tickets WHERE status = 'open'").fetchone()[0]
        pending_count = conn.execute("SELECT COUNT(*) FROM tickets WHERE status = 'pending'").fetchone()[0]
        closed_count = conn.execute("SELECT COUNT(*) FROM tickets WHERE status = 'closed'").fetchone()[0]

        by_priority = [
            {"name": "high", "label": "Alta", "count": conn.execute("SELECT COUNT(*) FROM tickets WHERE priority = 'high'").fetchone()[0]},
            {"name": "medium", "label": "Média", "count": conn.execute("SELECT COUNT(*) FROM tickets WHERE priority = 'medium'").fetchone()[0]},
            {"name": "low", "label": "Baixa", "count": conn.execute("SELECT COUNT(*) FROM tickets WHERE priority = 'low'").fetchone()[0]},
        ]

        channel_rows = conn.execute(
            "SELECT channel, COUNT(*) as count FROM tickets GROUP BY channel ORDER BY count DESC"
        ).fetchall()
        by_channel = [{"name": r["channel"], "count": r["count"]} for r in channel_rows]

        closure_rate = round((closed_count / total * 100), 1) if total > 0 else 0.0

        return {
            "total_tickets": total,
            "open_tickets": open_count,
            "pending_tickets": pending_count,
            "closed_tickets": closed_count,
            "closure_rate": closure_rate,
            "by_priority": by_priority,
            "by_channel": by_channel,
        }
