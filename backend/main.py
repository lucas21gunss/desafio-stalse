"""Mini Inbox API - FastAPI + SQLite."""

import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import database
from notifier import notify_n8n

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


app = FastAPI(title="Mini Inbox API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
    """Devolve as métricas geradas pelo ETL (data/etl.py)."""
    if not METRICS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="metrics.json não encontrado. Rode `python data/etl.py` primeiro.",
        )
    return json.loads(METRICS_PATH.read_text(encoding="utf-8"))
