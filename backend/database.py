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
"""


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Cria a tabela e insere os seeds caso o banco esteja vazio."""
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
