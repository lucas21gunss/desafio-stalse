"""Notificação para o n8n quando um ticket vira status=closed ou priority=high."""

import logging
import os
from datetime import datetime, timezone

import httpx
import database

logger = logging.getLogger("notifier")

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/ticket-events")


def detect_events(before: dict, after: dict) -> list[str]:
    """Retorna os eventos disparados pela mudança (só transições, não reenvia se já era assim)."""
    events = []
    if after["status"] == "closed" and before["status"] != "closed":
        events.append("ticket_closed")
    if after["priority"] == "high" and before["priority"] != "high":
        events.append("ticket_high_priority")
    return events


def build_payload(event: str, before: dict, after: dict) -> dict:
    return {
        "event": event,
        "ticket": after,
        "changes": {
            field: {"from": before[field], "to": after[field]}
            for field in ("status", "priority")
            if before[field] != after[field]
        },
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }


def notify_n8n(before: dict, after: dict) -> None:
    for event in detect_events(before, after):
        payload = build_payload(event, before, after)
        status_code = None
        try:
            response = httpx.post(N8N_WEBHOOK_URL, json=payload, timeout=5)
            status_code = response.status_code
            logger.info("Webhook %s enviado -> HTTP %s", event, status_code)
        except httpx.HTTPError as exc:
            # O n8n fora do ar não quebra a API, mas registramos para o dashboard.
            logger.warning("Falha ao enviar webhook %s: %s", event, exc)
        finally:
            try:
                database.log_webhook_event(event, after, status_code, payload)
            except Exception as e:
                logger.error("Erro ao registrar evento de webhook: %s", e)
