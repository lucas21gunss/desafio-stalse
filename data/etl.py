"""
ETL simples: Kaggle "Customer Support Ticket Dataset" -> data/processed/metrics.json

Uso:
    python data/etl.py

Dataset: https://www.kaggle.com/datasets/suraj520/customer-support-ticket-dataset
Coloque o CSV em data/raw/customer_support_tickets.csv
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent
RAW_PATH = DATA_DIR / "raw" / "customer_support_tickets.csv"
OUTPUT_PATH = DATA_DIR / "processed" / "metrics.json"

SOURCE = {
    "name": "Customer Support Ticket Dataset (Kaggle)",
    "url": "https://www.kaggle.com/datasets/suraj520/customer-support-ticket-dataset",
}

# Colunas do CSV original -> nomes mais simples
COLUMNS = {
    "Ticket ID": "ticket_id",
    "Date of Purchase": "purchase_date",
    "Product Purchased": "product",
    "Ticket Type": "ticket_type",
    "Ticket Status": "status",
    "Ticket Priority": "priority",
    "Ticket Channel": "channel",
    "Customer Satisfaction Rating": "satisfaction",
}


# ---------- Extract ----------
def extract(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"CSV não encontrado em {path}. Baixe o dataset do Kaggle (ver README).")
    return pd.read_csv(path)


# ---------- Transform ----------
def transform(df: pd.DataFrame) -> pd.DataFrame:
    df = df[list(COLUMNS)].rename(columns=COLUMNS)
    df["purchase_date"] = pd.to_datetime(df["purchase_date"], errors="coerce")
    return df.dropna(subset=["purchase_date"])


def count_by(df: pd.DataFrame, column: str, top: int | None = None) -> list[dict]:
    counts = df[column].value_counts()
    if top:
        counts = counts.head(top)
    return [{"name": str(name), "count": int(count)} for name, count in counts.items()]


def build_metrics(df: pd.DataFrame) -> dict:
    by_day = df.groupby(df["purchase_date"].dt.date).size()
    by_month = df.groupby(df["purchase_date"].dt.to_period("M")).size()
    closed = int((df["status"] == "Closed").sum())
    avg_satisfaction = df["satisfaction"].mean()

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": {**SOURCE, "rows": int(len(df))},
        "summary": {
            "total_tickets": int(len(df)),
            "open_tickets": int(len(df) - closed),  # Open + Pending Customer Response
            "closed_tickets": closed,
            "avg_satisfaction": round(float(avg_satisfaction), 2) if pd.notna(avg_satisfaction) else None,
            "period_start": df["purchase_date"].min().date().isoformat(),
            "period_end": df["purchase_date"].max().date().isoformat(),
        },
        "tickets_by_day": [{"date": day.isoformat(), "count": int(c)} for day, c in by_day.items()],
        "tickets_by_month": [{"month": str(month), "count": int(c)} for month, c in by_month.items()],
        "top_ticket_types": count_by(df, "ticket_type"),
        "top_products": count_by(df, "product", top=5),
        "by_channel": count_by(df, "channel"),
        "by_priority": count_by(df, "priority"),
        "by_status": count_by(df, "status"),
    }


# ---------- Load ----------
def load(metrics: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    raw = extract(RAW_PATH)
    df = transform(raw)
    metrics = build_metrics(df)
    load(metrics, OUTPUT_PATH)
    print(f"✔ {len(df)} linhas processadas -> {OUTPUT_PATH.relative_to(DATA_DIR.parent)}")


if __name__ == "__main__":
    main()
