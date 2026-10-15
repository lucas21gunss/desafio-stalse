import type { Priority, Status } from "./types";

export const STATUS_LABELS: Record<Status, string> = {
  open: "Aberto",
  pending: "Pendente",
  closed: "Fechado",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export const CHANNEL_LABELS: Record<string, string> = {
  email: "E-mail",
  chat: "Chat",
  whatsapp: "WhatsApp",
  phone: "Telefone",
};

export const STATUSES = Object.keys(STATUS_LABELS) as Status[];
export const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
