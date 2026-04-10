import type { StructuresState, VariantKey } from "../structuresSlice";
import type { FlowBeat } from "../flow-engine";

/* ── Static metadata ───────────────────────────────────── */

export interface VariantProfile {
  label: string;
  description: string;
}

export interface VariantColors {
  fill: string;
  stroke: string;
}

/* ── Scene rendering ───────────────────────────────────── */

export interface SceneHelpers {
  hot: (zone: string) => boolean;
  phase: string;
}

export interface StatBadgeConfig {
  label: string;
  value: string | number;
  color: string;
}

/* ── Notes for sidebar display ─────────────────────────── */

export interface StructureNotes {
  summary: string;
  keyRule: string;
}

/* ── Sidebar table row data ────────────────────────────── */

export interface TableRow {
  cells: string[];
  isNew?: boolean; // highlight row just added at this step
  isHighlight?: boolean; // highlight row matching a query result
}

export interface SidebarTable {
  columns: string[];
  rows: TableRow[];
}

/* ── The adapter interface ─────────────────────────────── */

export interface StructuresAdapter {
  id: VariantKey;
  profile: VariantProfile;
  colors: VariantColors;
  notes: StructureNotes;
  computeMetrics(state: StructuresState): void;
  expandToken(token: string, state: StructuresState): string[] | null;
  getFlowBeats(state: StructuresState): FlowBeat[];
  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    state: StructuresState,
    helpers: SceneHelpers,
  ): void;
  getStatBadges(state: StructuresState): StatBadgeConfig[];
  getTableData(state: StructuresState): SidebarTable | null;
  softReset(state: StructuresState): void;
}
