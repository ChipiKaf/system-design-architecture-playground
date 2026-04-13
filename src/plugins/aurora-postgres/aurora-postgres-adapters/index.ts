export type {
  AuroraPostgresAdapter,
  StatBadgeConfig,
  SceneHelpers,
  VariantProfile,
  VariantColors,
} from "./types";

import type { VariantKey } from "../auroraPostgresSlice";
import type { AuroraPostgresAdapter } from "./types";
import { acidGuaranteesAdapter } from "./acid-guarantees";
import { complexQueriesAdapter } from "./complex-queries";
import { jsonbFlexibilityAdapter } from "./jsonb-flexibility";
import { extensionsEcosystemAdapter } from "./extensions-ecosystem";
import { storageArchitectureAdapter } from "./storage-architecture";
import { readReplicasAdapter } from "./read-replicas";
import { claimsPipelineAdapter } from "./claims-pipeline";
import { policyLifecycleAdapter } from "./policy-lifecycle";

/* ── Topic definitions ────────────────────────────────── */

export type TopicKey =
  | "why-relational"
  | "why-postgresql"
  | "why-aurora"
  | "insurance-schema";

export interface TopicDef {
  id: TopicKey;
  label: string;
  variants: VariantKey[];
  defaultVariant: VariantKey;
}

export const TOPICS: TopicDef[] = [
  {
    id: "why-relational",
    label: "Q1 — Why Relational?",
    variants: ["acid-guarantees", "complex-queries"],
    defaultVariant: "acid-guarantees",
  },
  {
    id: "why-postgresql",
    label: "Q2 — Why PostgreSQL?",
    variants: ["jsonb-flexibility", "extensions-ecosystem"],
    defaultVariant: "jsonb-flexibility",
  },
  {
    id: "why-aurora",
    label: "Q3 — Why Aurora?",
    variants: ["storage-architecture", "read-replicas"],
    defaultVariant: "storage-architecture",
  },
  {
    id: "insurance-schema",
    label: "Q4 — Insurance Schema",
    variants: ["claims-pipeline", "policy-lifecycle"],
    defaultVariant: "claims-pipeline",
  },
];

/* ── Adapter registry ─────────────────────────────────── */

const ADAPTERS: Record<VariantKey, AuroraPostgresAdapter> = {
  "acid-guarantees": acidGuaranteesAdapter,
  "complex-queries": complexQueriesAdapter,
  "jsonb-flexibility": jsonbFlexibilityAdapter,
  "extensions-ecosystem": extensionsEcosystemAdapter,
  "storage-architecture": storageArchitectureAdapter,
  "read-replicas": readReplicasAdapter,
  "claims-pipeline": claimsPipelineAdapter,
  "policy-lifecycle": policyLifecycleAdapter,
};

export function getAdapter(key: VariantKey): AuroraPostgresAdapter {
  return ADAPTERS[key];
}

export const allAdapters: AuroraPostgresAdapter[] = Object.values(ADAPTERS);
