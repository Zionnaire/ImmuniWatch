import { LABEL_META, PRIORITY_META } from "../lib/utils";
import type {
  ClassificationLabel,
  HITLPriority,
  HITLStatus,
  AlertSeverity,
} from "../types/api";

export function LabelBadge({ label }: { label: ClassificationLabel }) {
  const meta = LABEL_META[label];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}
    >
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: HITLPriority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}
    >
      {meta.label}
    </span>
  );
}

const STATUS_COLORS: Record<HITLStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  overridden: "bg-blue-100 text-blue-700",
};

export function StatusBadge({ status }: { status: HITLStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[status]}`}
    >
      {status}
    </span>
  );
}

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-orange-100 text-orange-700",
  low: "bg-yellow-100 text-yellow-700",
  info: "bg-blue-100 text-blue-700",
};

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${SEVERITY_COLORS[severity]}`}
    >
      {severity}
    </span>
  );
}
