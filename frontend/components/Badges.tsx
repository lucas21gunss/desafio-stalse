import { CHANNEL_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { Priority, Status } from "@/lib/types";

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-status-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`badge badge-priority-${priority}`}>
      <span className="dot" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function ChannelTag({ channel }: { channel: string }) {
  return <span className="channel-tag">{CHANNEL_LABELS[channel] ?? channel}</span>;
}
