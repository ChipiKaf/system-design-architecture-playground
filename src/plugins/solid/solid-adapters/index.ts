export type {
  SolidAdapter,
  StatBadgeConfig,
  SceneHelpers,
  VariantProfile,
  VariantColors,
} from "./types";

import type { VariantKey } from "../solidSlice";
import type { SolidAdapter } from "./types";
import { srpAdapter } from "./srp";
import { ocpAdapter } from "./ocp";
import { lspAdapter } from "./lsp";
import { ispAdapter } from "./isp";
import { dipAdapter } from "./dip";

const ADAPTERS: Record<VariantKey, SolidAdapter> = {
  srp: srpAdapter,
  ocp: ocpAdapter,
  lsp: lspAdapter,
  isp: ispAdapter,
  dip: dipAdapter,
};

export function getAdapter(key: VariantKey): SolidAdapter {
  return ADAPTERS[key];
}

export const allAdapters: SolidAdapter[] = Object.values(ADAPTERS);
