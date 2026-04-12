export type {
  InsuranceDesignAdapter,
  StatBadgeConfig,
  SceneHelpers,
  VariantProfile,
  VariantColors,
} from "./types";

import type { VariantKey } from "../insuranceDesignSlice";
import type { InsuranceDesignAdapter } from "./types";
import { aiClaimsAutomationAdapter } from "./ai-claims-automation";
import { aiRiskScoringAdapter } from "./ai-risk-scoring";
import { aiFraudDetectionAdapter } from "./ai-fraud-detection";
import { aiLlmPlatformAdapter } from "./ai-llm-platform";
import { aiLlmPlatformAltAdapter } from "./ai-llm-platform-alt";

/* ── Topic definitions ────────────────────────────────── */

export type TopicKey = "ai-system";

export interface TopicDef {
  id: TopicKey;
  label: string;
  variants: VariantKey[];
  defaultVariant: VariantKey;
}

export const TOPICS: TopicDef[] = [
  {
    id: "ai-system",
    label: "AI System",
    variants: [
      "ai-claims-automation",
      "ai-risk-scoring",
      "ai-fraud-detection",
      "ai-llm-platform",
      "ai-llm-platform-alt",
    ],
    defaultVariant: "ai-claims-automation",
  },
];

/* ── Adapter registry ─────────────────────────────────── */

const ADAPTERS: Record<VariantKey, InsuranceDesignAdapter> = {
  "ai-claims-automation": aiClaimsAutomationAdapter,
  "ai-risk-scoring": aiRiskScoringAdapter,
  "ai-fraud-detection": aiFraudDetectionAdapter,
  "ai-llm-platform": aiLlmPlatformAdapter,
  "ai-llm-platform-alt": aiLlmPlatformAltAdapter,
};

export function getAdapter(key: VariantKey): InsuranceDesignAdapter {
  return ADAPTERS[key];
}

export const allAdapters: InsuranceDesignAdapter[] = Object.values(ADAPTERS);
