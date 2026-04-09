export type {
  PatternAdapter,
  PatternColors,
  PatternProfile,
  StatBadgeConfig,
  SceneHelpers,
} from "./types";

import type { PatternKey } from "../distributedTransactionsSlice";
import type { PatternAdapter } from "./types";
import { sagaAdapter } from "./saga";
import { outboxAdapter } from "./outbox";

const ADAPTERS: Record<PatternKey, PatternAdapter> = {
  saga: sagaAdapter,
  outbox: outboxAdapter,
};

export function getAdapter(pattern: PatternKey): PatternAdapter {
  return ADAPTERS[pattern];
}

export const allAdapters: PatternAdapter[] = Object.values(ADAPTERS);
