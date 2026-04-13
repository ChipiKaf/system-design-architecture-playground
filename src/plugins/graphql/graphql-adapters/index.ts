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

import { sqlJoinResolverAdapter } from "./sql-join-resolver";
import { naiveResolversAdapter } from "./naive-resolvers";
import { dataloaderBatchingAdapter } from "./dataloader-batching";

/* ── Topic definitions ────────────────────────────────── */

export type TopicKey =
  | "graphql-vs-rest"
  | "queries-vs-mutations-vs-subscriptions"
  | "resolvers-data-fetching";

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
  {
    id: "resolvers-data-fetching",
    label: "Q3 — How GraphQL Fetches Data",
    variants: ["sql-join-resolver", "naive-resolvers", "dataloader-batching"],
    defaultVariant: "naive-resolvers",
  },
];

/* ── Adapter registry ─────────────────────────────────── */

const ADAPTERS: Record<VariantKey, GraphqlAdapter> = {
  "graphql-approach": graphqlApproachAdapter,
  "rest-approach": restApproachAdapter,
  "query-op": queryOpAdapter,
  "mutation-op": mutationOpAdapter,
  "subscription-op": subscriptionOpAdapter,
  "sql-join-resolver": sqlJoinResolverAdapter,
  "naive-resolvers": naiveResolversAdapter,
  "dataloader-batching": dataloaderBatchingAdapter,
};

export function getAdapter(key: VariantKey): GraphqlAdapter {
  return ADAPTERS[key];
}

export const allAdapters: GraphqlAdapter[] = Object.values(ADAPTERS);
