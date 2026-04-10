export type {
  StructuresAdapter,
  StatBadgeConfig,
  SceneHelpers,
  StructureNotes,
  VariantProfile,
  VariantColors,
} from "./types";

import type { VariantKey } from "../structuresSlice";
import type { StructuresAdapter } from "./types";
import { btreeStructAdapter } from "./btree-struct";
import { ginStructAdapter } from "./gin-struct";
import { gistStructAdapter } from "./gist-struct";

/* ── Topic definitions ────────────────────────────────── */

export type TopicKey = "index-structures";

export interface TopicDef {
  id: TopicKey;
  label: string;
  variants: VariantKey[];
  defaultVariant: VariantKey;
}

export const TOPICS: TopicDef[] = [
  {
    id: "index-structures",
    label: "Q1 — Index Structures",
    variants: ["btree-struct", "gin-struct", "gist-struct"],
    defaultVariant: "btree-struct",
  },
];

/* ── Adapter registry ─────────────────────────────────── */

const ADAPTERS: Record<VariantKey, StructuresAdapter> = {
  "btree-struct": btreeStructAdapter,
  "gin-struct": ginStructAdapter,
  "gist-struct": gistStructAdapter,
};

export function getAdapter(key: VariantKey): StructuresAdapter {
  return ADAPTERS[key];
}

export const allAdapters: StructuresAdapter[] = Object.values(ADAPTERS);
