import type { AuroraPostgresState } from "./auroraPostgresSlice";
import { getAdapter, type TopicKey } from "./aurora-postgres-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   Aurora PostgreSQL Lab — Declarative Flow Engine

   Each adapter beat becomes its own button-gated step so
   the user advances one signal at a time.
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<AuroraPostgresState>;
export type StepDef = GenericStepDef<AuroraPostgresState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<AuroraPostgresState>;

/* ── Token expansion (delegates to adapter) ──────────── */

export function expandToken(token: string, state: AuroraPostgresState): string[] {
  const adapter = getAdapter(state.variant);
  const expanded = adapter.expandToken(token, state);
  return expanded ?? [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey = string;

/* ── Topic guards ────────────────────────────────────── */

const topicGuard =
  (t: TopicKey) =>
  (s: AuroraPostgresState) =>
    s.topic === t;

/* ── Helper: generate per-beat steps for a topic ─────── */

function beatStepsForTopic(
  topic: TopicKey,
  maxBeats: number,
  processingText: string,
  buttonColor: string,
): StepDef[] {
  const when = topicGuard(topic);
  const steps: StepDef[] = [];

  for (let i = 0; i < maxBeats; i++) {
    steps.push({
      key: `beat-${topic}-${i}`,
      label: `Step ${i + 1}`,
      when: (s) => {
        if (!when(s)) return false;
        const beats = getAdapter(s.variant).getFlowBeats(s);
        return i < beats.length;
      },
      processingText,
      nextButtonColor: buttonColor,
      phase: "processing",
      flow: (s) => {
        const beats = getAdapter(s.variant).getFlowBeats(s);
        return i < beats.length ? [beats[i]] : [];
      },
      recalcMetrics: true,
      explain: (s) => {
        const beats = getAdapter(s.variant).getFlowBeats(s);
        if (i < beats.length && beats[i].explain) return beats[i].explain!;
        return getAdapter(s.variant).profile.description;
      },
    });
  }

  return steps;
}

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  /* ── Overview (all topics) ─── */
  {
    key: "overview",
    label: "Overview",
    nextButton: "Begin →",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label} selected. Step through to explore.`;
    },
  },

  /* ── Q1 — Why Relational (max 6 beats) ─── */
  ...beatStepsForTopic("why-relational", 6, "Processing…", "#4ade80"),
  {
    key: "why-relational-summary",
    label: "Summary",
    when: topicGuard("why-relational"),
    phase: "summary",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label} complete. Insurance demands ACID — try the other variant.`;
    },
  },

  /* ── Q2 — Why PostgreSQL (max 6 beats) ─── */
  ...beatStepsForTopic("why-postgresql", 6, "Querying…", "#60a5fa"),
  {
    key: "why-postgresql-summary",
    label: "Summary",
    when: topicGuard("why-postgresql"),
    phase: "summary",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label} complete. PostgreSQL's flexibility + extensions make it ideal for insurance.`;
    },
  },

  /* ── Q3 — Why Aurora (max 7 beats) ─── */
  ...beatStepsForTopic("why-aurora", 7, "Replicating…", "#f59e0b"),
  {
    key: "why-aurora-summary",
    label: "Summary",
    when: topicGuard("why-aurora"),
    phase: "summary",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label} complete. Aurora gives you PostgreSQL compatibility with cloud-native durability.`;
    },
  },

  /* ── Q4 — Insurance Schema (max 7 beats) ─── */
  ...beatStepsForTopic("insurance-schema", 7, "Transitioning…", "#a78bfa"),
  {
    key: "insurance-schema-summary",
    label: "Summary",
    when: topicGuard("insurance-schema"),
    phase: "summary",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label} complete. Every state change is auditable — that's why relational wins here.`;
    },
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: AuroraPostgresState): TaggedStep[] {
  const labels = getAdapter(state.variant).getStepLabels();
  return genericBuildSteps(STEPS, state, {
    relabel: (step) => {
      const m = step.key.match(/^beat-[^-]+-[^-]+-(\d+)$/);
      if (m) {
        const idx = Number(m[1]);
        return idx < labels.length ? labels[idx] : step.label;
      }
      return step.label;
    },
  });
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
