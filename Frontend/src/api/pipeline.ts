// Changes vs. original:
//   • Connector.status: added 'not_integrated' — the backend now returns this for
//     Twitter/Facebook/YouTube instead of 'down', distinguishing planned Phase 2
//     connectors from live ones that have actually failed
//   • Connector.note: optional field carrying the Phase 2 explanation string
//   • KafkaHealth.enabled: added so the frontend can show a Phase 2 banner
//     instead of an empty topics table when Kafka is disabled

import { api } from './client';
import type { RecentFeedResponse } from '../types/api';

export interface Connector {
  name:         string;
  platform:     string;
  status:       'active' | 'degraded' | 'waiting' | 'down' | 'not_integrated';
  eventsPerMin: number;
  lastEventAt:  string;
  errorRate:    number;
  note?:        string;  // e.g. "Phase 2 — REST connector not yet wired"
}

export interface KafkaHealth {
  enabled:      boolean;  // false when KAFKA_ENABLED=false in .env
  eventsPerSec: number;
  kafkaLagMs:   number;
  dedupRate:    number;
  topics:       Array<{ name: string; partitions: number; lag: number }>;
}

export const pipelineApi = {
  getConnectors: () =>
    api.get<Connector[]>('/pipeline/connectors').then((r) => r.data),

  getKafkaHealth: () =>
    api.get<KafkaHealth>('/pipeline/kafka').then((r) => r.data),

  getRecentFeed: () =>
    api.get<RecentFeedResponse>('/pipeline/recent').then((r) => r.data),
};