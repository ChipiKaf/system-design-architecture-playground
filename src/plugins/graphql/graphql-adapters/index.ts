export type {
  GraphqlAdapter,
  StatBadgeConfig,
  SceneHelpers,
  VariantProfile,
  VariantColors,
} from "./types";

import type { VariantKey } from "../graphqlSlice";
import type { GraphqlAdapter } from "./types";
import { graphqlApproachAdapter } from "./graphql-approach";
import { restApproachAdapter } from "./rest-approach";

import { queryOpAdapter } from "./query-op";
import { mutationOpAdapter } from "./mutation-op";
import { subscriptionOpAdapter } from "./subscription-op";

/* ── Topic definitions ────────────────────────────────── */

export type TopicKey =
  | "graphql-vs-rest"
  | "queries-vs-mutations-vs-subscriptions";

export interface TopicDef {
  id: TopicKey;
  label: string;
  variants: VariantKey[];
  defaultVariant: VariantKey;
}

export const TOPICS: TopicDef[] = [
  {
    id: "graphql-vs-rest",
    label: "Q1 — GraphQL vs REST",
    variants: ["graphql-approach", "rest-approach"],
    defaultVariant: "graphql-approach",
  },
  {
    id: "queries-vs-mutations-vs-subscriptions",
    label: "Q2 — Queries vs Mutations vs Subscriptions",
    variants: ["query-op", "mutation-op", "subscription-op"],
    defaultVariant: "query-op",
  },
];

/* ── Adapter registry ─────────────────────────────────── */

const ADAPTERS: Record<VariantKey, GraphqlAdapter> = {
  "graphql-approach": graphqlApproachAdapter,
  "rest-approach": restApproachAdapter,
  "query-op": queryOpAdapter,
  "mutation-op": mutationOpAdapter,
  "subscription-op": subscriptionOpAdapter,
};

export function getAdapter(key: VariantKey): GraphqlAdapter {
  return ADAPTERS[key];
}

export const allAdapters: GraphqlAdapter[] = Object.values(ADAPTERS);
