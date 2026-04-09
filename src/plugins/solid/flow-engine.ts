import type { SolidState } from "./solidSlice";
import { getAdapter } from "./solid-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   SOLID Principles Lab — Declarative Flow Engine
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<SolidState>;
export type StepDef = GenericStepDef<SolidState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<SolidState>;

/* ── Token expansion (delegates to adapter) ──────────── */

export function expandToken(token: string, state: SolidState): string[] {
  const adapter = getAdapter(state.variant);
  const expanded = adapter.expandToken(token, state);
  return expanded ?? [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  | "overview"
  | "show-violation"
  | "highlight-problem"
  | "refactor"
  | "show-improvement"
  | "summary";

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Principle Overview",
    nextButton: "Show Violation",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.acronym}: ${adapter.profile.description}`;
    },
  },
  {
    key: "show-violation",
    label: "Code Smell",
    processingText: "Examining…",
    nextButtonColor: "#ef4444",
    phase: "violation",
    flow: (s) => getAdapter(s.variant).getFlowBeats(s),
    recalcMetrics: true,
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      const beats = adapter.getFlowBeats(s);
      return (
        beats[0]?.explain ?? `Observe the ${adapter.profile.acronym} violation.`
      );
    },
  },
  {
    key: "highlight-problem",
    label: "Why It Hurts",
    nextButtonColor: "#f59e0b",
    delay: 400,
    phase: "problem",
    recalcMetrics: true,
    explain: (s) => {
      const a = getAdapter(s.variant);
      return (
        {
          srp: "Multiple reasons to change — a bug fix in email logic may break authentication.",
          ocp: "Adding a new payment method requires modifying the existing switch statement.",
          lsp: "Square overriding setWidth() silently breaks code that expects Rectangle behavior.",
          isp: "Robot is forced to implement eat() — an operation it cannot perform.",
          dip: "Swapping MySQL for MongoDB requires rewriting OrderService.",
        }[s.variant] ?? `This violates ${a.profile.acronym}.`
      );
    },
  },
  {
    key: "refactor",
    label: "Apply Principle",
    processingText: "Refactoring…",
    nextButtonColor: "#22c55e",
    phase: "refactored",
    delay: 600,
    recalcMetrics: true,
    explain: (s) => {
      const a = getAdapter(s.variant);
      return (
        {
          srp: "Split into AuthService, EmailService, UserRepo — each with one reason to change.",
          ocp: "Introduce a PayStrategy interface — new methods implement it, core stays closed.",
          lsp: "Replace inheritance with a Shape abstraction — Rectangle and Circle are true substitutes.",
          isp: "Segregate into IWorkable and IFeedable — Robot only implements what it can do.",
          dip: "Introduce IRepository abstraction — OrderService depends on the contract, not the concrete DB.",
        }[s.variant] ?? `${a.profile.acronym} applied.`
      );
    },
    finalHotZones: (s) => {
      return (
        {
          srp: ["auth-svc", "email-svc", "user-repo"],
          ocp: ["iface", "credit-card", "paypal", "crypto"],
          lsp: ["iface", "rectangle", "circle"],
          isp: ["i-workable", "i-feedable", "robot"],
          dip: ["i-repo", "mysql-repo", "mongo-repo"],
        }[s.variant] ?? []
      );
    },
  },
  {
    key: "show-improvement",
    label: "Metrics Improved",
    nextButtonColor: "#14b8a6",
    phase: "refactored",
    recalcMetrics: (s) => {
      // After refactoring, improve the metrics
      s.coupling = Math.max(2, s.coupling - 5);
      s.flexibility = Math.min(9, s.flexibility + 5);
      s.classCount += 2;
    },
    delay: 400,
    explain: (s) =>
      `Coupling dropped to ${s.coupling}/10, flexibility rose to ${s.flexibility}/10 with ${s.classCount} focused classes.`,
  },
  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    explain: (s) => {
      const a = getAdapter(s.variant);
      return `${a.profile.acronym} complete. Try another principle or replay to compare.`;
    },
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: SolidState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
