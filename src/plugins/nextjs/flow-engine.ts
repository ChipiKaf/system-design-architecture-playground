import type { NextjsState } from "./nextjsSlice";
import { getAdapter, type TopicKey } from "./nextjs-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   Nextjs Lab — Declarative Flow Engine

   Each adapter beat becomes its own button-gated step so
   the user advances one signal at a time.
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<NextjsState>;
export type StepDef = GenericStepDef<NextjsState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<NextjsState>;

/* ── Token expansion (delegates to adapter) ──────────── */

export function expandToken(token: string, state: NextjsState): string[] {
  const adapter = getAdapter(state.variant);
  const expanded = adapter.expandToken(token, state);
  return expanded ?? [token];
}

/* ── Step keys ───────────────────────────────────────────
   Dynamic: "beat-{topic}-{index}" for each adapter beat.
   We use a branded string type so the rest of the engine
   stays fully typed while allowing N beats per variant.   */

export type StepKey = string;

/* ── Topic guards ────────────────────────────────────── */

const topicGuard = (t: TopicKey) => (s: NextjsState) => s.topic === t;

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

  /* ── Q1 — Rendering (max 10 beats) ─── */
  ...beatStepsForTopic("rendering", 10, "Rendering…", "#4ade80"),
  {
    key: "rendering-summary",
    label: "Summary",
    when: topicGuard("rendering"),
    phase: "summary",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label} complete. Try another rendering strategy or switch topics.`;
    },
  },

  /* ── Q2 — Components (max 6 beats) ─── */
  ...beatStepsForTopic("components", 6, "Rendering…", "#60a5fa"),
  {
    key: "components-summary",
    label: "Summary",
    when: topicGuard("components"),
    phase: "summary",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label} complete. Compare with the other component type.`;
    },
  },

  /* ── Q3 — Routing (max 5 beats) ─── */
  ...beatStepsForTopic("routing", 5, "Routing…", "#a78bfa"),
  {
    key: "routing-summary",
    label: "Summary",
    when: topicGuard("routing"),
    phase: "summary",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label} complete. Try the other routing pattern.`;
    },
  },

  /* ── Q4 — Data Flow (max 6 beats) ─── */
  ...beatStepsForTopic("data-flow", 6, "Fetching…", "#f59e0b"),
  {
    key: "data-flow-summary",
    label: "Summary",
    when: topicGuard("data-flow"),
    phase: "summary",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label} complete. Compare fetching vs caching patterns.`;
    },
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: NextjsState): TaggedStep[] {
  const labels = getAdapter(state.variant).getStepLabels();
  return genericBuildSteps(STEPS, state, {
    relabel: (step) => {
      const m = step.key.match(/^beat-[^-]+-(\d+)$/);
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
