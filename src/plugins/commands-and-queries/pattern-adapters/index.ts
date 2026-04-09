export type {
  PatternAdapter,
  PatternProfile,
  SceneHelpers,
  StatBadgeConfig,
} from "./types";

import type { PatternKey } from "../commandsQueriesSlice";
import type { PatternAdapter } from "./types";
import { materializedViewAdapter } from "./materialized-view";
import { cqrsAdapter } from "./cqrs";
import { eventSourcingAdapter } from "./event-sourcing";

const ADAPTERS: Record<PatternKey, PatternAdapter> = {
  "materialized-view": materializedViewAdapter,
  cqrs: cqrsAdapter,
  "event-sourcing": eventSourcingAdapter,
};

export function getAdapter(pattern: PatternKey): PatternAdapter {
  return ADAPTERS[pattern];
}

export const allAdapters: PatternAdapter[] = Object.values(ADAPTERS);
