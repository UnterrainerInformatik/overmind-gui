export type AggregateOp = 'sum' | 'avg'

export interface PerApplianceSelection {
  applianceId: number;
  paths: string[];
}

export type SelectionShape =
  | { applianceIds: number[]; paths: string[] }
  | { perAppliance: PerApplianceSelection[] }

export interface TransportSpec {
  minInterval: number;
  selection: SelectionShape;
  aggregate?: { op: AggregateOp };
}

export interface ValueTriple {
  applianceId: number;
  path: string;
  value: unknown;
  representsGroups?: number[];
}

export interface ValuesPayload {
  values: ValueTriple[];
  ts: string;
}

export interface AggregatePayload {
  aggregate: {
    op: AggregateOp;
    value: number | null;
    sampleCount: number;
    totalCount: number;
  };
  ts: string;
}

export type TransportUpdate = ValuesPayload | AggregatePayload

export type TransportCallback = (payload: TransportUpdate) => void

export interface Handle {
  id: string;
}

export type SubscriptionSpec = TransportSpec

export interface SubscriptionAggregate {
  value: number | null;
  sampleCount: number;
  totalCount: number;
}

export interface Subscription {
  values: Record<string, unknown> | null;
  aggregate: SubscriptionAggregate | null;
  ts: string | null;
  connected: boolean;
  stale: boolean;
  error: Error | null;
  close: () => void;
}

export type HttpPost = (
  url: string,
  body: unknown,
  headers: Record<string, string>
) => Promise<{ data: unknown }>

export interface ReactivityAdapter {
  observable<T extends object>(obj: T): T;
  set<T extends object>(obj: T, key: string, value: unknown): void;
}

export interface SseClientConfig {
  buildSseUrl: () => string;
  buildRegisterUrl: () => string;
  buildDeregisterUrl: () => string;
  authHeader?: () => Record<string, string>;
  httpPost: HttpPost;
  reactivity?: ReactivityAdapter;
  debug?: boolean;
  reconnectDelayMs?: number;
}
