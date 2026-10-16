"""Mini Inbox API - FastAPI + SQLite."""

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import database
from notifier import N8N_WEBHOOK_URL, notify_n8n

logging.basicConfig(level=logging.INFO)

METRICS_PATH = Path(__file__).resolve().parent.parent / "data" / "processed" / "metrics.json"

Status = Literal["open", "pending", "closed"]
Priority = Literal["low", "medium", "high"]


class Ticket(BaseModel):
    id: int
    created_at: str
    customer_name: str
    channel: str
    subject: str
    description: str | None = None
    status: Status
    priority: Priority


class TicketUpdate(BaseModel):
    status: Status | None = None
    priority: Priority | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.init_db()
    yield


app = FastAPI(title="Mini Inbox API", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/tickets", response_model=list[Ticket])
def list_tickets(q: str | None = None):
    """Lista os tickets. `q` é uma busca opcional por texto."""
    return database.list_tickets(q)


@app.get("/tickets/{ticket_id}", response_model=Ticket)
def get_ticket(ticket_id: int):
    ticket = database.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    return ticket


@app.patch("/tickets/{ticket_id}", response_model=Ticket)
def update_ticket(ticket_id: int, payload: TicketUpdate, background_tasks: BackgroundTasks):
    """Altera status e/ou priority. Dispara webhook no n8n se virar closed ou high."""
    before = database.get_ticket(ticket_id)
    if not before:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")

    changes = payload.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(status_code=400, detail="Informe status e/ou priority")

    after = database.update_ticket(ticket_id, changes)
    background_tasks.add_task(notify_n8n, before, after)
    return after


@app.get("/metrics")
def get_metrics():
    """
    Devolve as métricas do sistema:
    - `inbox`: Métricas em tempo real calculadas do banco SQLite de tickets
    - `automation`: Status e últimos webhooks disparados para o n8n
    - `summary`, `tickets_by_month`, etc.: Métricas históricas geradas pelo ETL (data/etl.py)
    """
    if not METRICS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="metrics.json não encontrado. Rode `python data/etl.py` primeiro.",
        )
    metrics_data = json.loads(METRICS_PATH.read_text(encoding="utf-8"))

    # Métricas ao vivo da caixa de entrada e do n8n
    inbox_stats = database.get_inbox_metrics()
    automation_stats = {
        "webhook_url": N8N_WEBHOOK_URL,
        "total_events": database.count_webhook_events(),
        "recent_events": database.get_recent_webhook_events(10),
    }

    metrics_data["inbox"] = inbox_stats
    metrics_data["automation"] = automation_stats

    return metrics_data


@app.get("/automation/events")
def list_automation_events():
    """Retorna o histórico de eventos de automação enviados para o n8n."""
    return {
        "total": database.count_webhook_events(),
        "events": database.get_recent_webhook_events(20),
    }
