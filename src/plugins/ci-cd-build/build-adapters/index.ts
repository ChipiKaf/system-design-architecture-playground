export type {
  BuildAdapter,
  StatBadgeConfig,
  SceneHelpers,
  ToolProfile,
} from "./types";

import type { ToolType } from "../ciCdBuildSlice";
import type { BuildAdapter } from "./types";
import { nxAdapter } from "./nx";
import { turborepoAdapter } from "./turborepo";

const ADAPTERS: Record<ToolType, BuildAdapter> = {
  nx: nxAdapter,
  turborepo: turborepoAdapter,
};

/** Look up the adapter for the given build tool. */
export function getAdapter(toolType: ToolType): BuildAdapter {
  return ADAPTERS[toolType];
}

/** All registered adapters (for iteration in controls, etc.). */
export const allAdapters: BuildAdapter[] = Object.values(ADAPTERS);
