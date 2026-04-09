export type {
  AngularConstructorVsNgoninitAdapter,
  StatBadgeConfig,
  SceneHelpers,
  VariantProfile,
  VariantColors,
} from "./types";

import type { VariantKey } from "../angularConstructorVsNgoninitSlice";
import type { AngularConstructorVsNgoninitAdapter } from "./types";
import { variantAAdapter } from "./variant-a";
import { variantBAdapter } from "./variant-b";

const ADAPTERS: Record<VariantKey, AngularConstructorVsNgoninitAdapter> = {
  "variant-a": variantAAdapter,
  "variant-b": variantBAdapter,
};

/** Look up the adapter for the given variant key. */
export function getAdapter(key: VariantKey): AngularConstructorVsNgoninitAdapter {
  return ADAPTERS[key];
}

/** All registered adapters (for iteration in controls, etc.). */
export const allAdapters: AngularConstructorVsNgoninitAdapter[] = Object.values(ADAPTERS);
