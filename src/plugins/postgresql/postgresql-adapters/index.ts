export type {
  PostgresqlAdapter,
  StatBadgeConfig,
  SceneHelpers,
  StrategyNotes,
  VariantProfile,
  VariantColors,
} from "./types";

import type { VariantKey } from "../postgresqlSlice";
import type { PostgresqlAdapter } from "./types";
import { brinAdapter } from "./brin";
import { btreeAdapter } from "./btree";
import { ginAdapter } from "./gin";
import { gistAdapter } from "./gist";
import { hashAdapter } from "./hash";

/* ── Topic definitions ────────────────────────────────── */

export type TopicKey = "indexing-strategies";

export interface TopicDef {
  id: TopicKey;
  label: string;
  variants: VariantKey[];
  defaultVariant: VariantKey;
}

export const TOPICS: TopicDef[] = [
  {
    id: "indexing-strategies",
    label: "Q1 — Indexing Strategies",
    variants: ["btree", "gin", "gist", "brin", "hash"],
    defaultVariant: "btree",
  },
];

/* ── Adapter registry ─────────────────────────────────── */

const ADAPTERS: Record<VariantKey, PostgresqlAdapter> = {
  btree: btreeAdapter,
  gin: ginAdapter,
  gist: gistAdapter,
  brin: brinAdapter,
  hash: hashAdapter,
};

export function getAdapter(key: VariantKey): PostgresqlAdapter {
  return ADAPTERS[key];
}

export const allAdapters: PostgresqlAdapter[] = Object.values(ADAPTERS);
