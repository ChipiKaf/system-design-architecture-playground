import type { ServiceEvolutionState } from "./serviceEvolutionSlice";
import { VARIANT_PROFILES } from "./serviceEvolutionSlice";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   ServiceEvolution Lab — Declarative Flow Engine

   Three "moments of truth" reveal the trade-offs:
   1. Deploy a change  → deploy granularity
   2. Traffic spike    → scale-out speed
   3. Inject a fault   → blast radius / fault isolation
   ══════════════════════════════════════════════════════════ */

export type FlowBeat = GenericFlowBeat<ServiceEvolutionState>;
export type StepDef = GenericStepDef<ServiceEvolutionState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<ServiceEvolutionState>;

/* ── Node naming helpers ─────────────────────────────── */

function serviceNodes(s: ServiceEvolutionState): string[] {
  const count = VARIANT_PROFILES[s.variant].serviceCount;
  if (s.variant === "serverless")
    return Array.from({ length: count }, (_, i) => `fn-${i}`);
  if (s.variant === "monolith") return ["app"];
  if (s.variant === "modular-monolith")
    return Array.from({ length: count }, (_, i) => `mod-${i}`);
  return Array.from({ length: count }, (_, i) => `svc-${i}`);
}

function dbNodes(s: ServiceEvolutionState): string[] {
  const count = VARIANT_PROFILES[s.variant].dbCount;
  if (count === 0) return [];
  if (s.variant === "monolith") return ["db"];
  if (s.variant === "modular-monolith") return ["db"];
  return Array.from({ length: count }, (_, i) => `db-${i}`);
}

function targetNode(s: ServiceEvolutionState): string {
  if (s.variant === "monolith") return "app";
  if (s.variant === "modular-monolith") return "mod-0";
  if (s.variant === "serverless") return "fn-0";
  return "svc-0";
}

function targetSchema(s: ServiceEvolutionState): string {
  if (s.variant === "modular-monolith") return "schema-0";
  return "db";
}

function faultTarget(s: ServiceEvolutionState): string {
  if (s.variant === "monolith") return "app";
  if (s.variant === "modular-monolith") return "mod-1";
  if (s.variant === "serverless") return "fn-2";
  return "svc-1";
}

function faultSchema(s: ServiceEvolutionState): string {
  if (s.variant === "modular-monolith") return "schema-1";
  return "db";
}

function faultCascade(s: ServiceEvolutionState): string {
  if (s.variant === "monolith") return "db";
  if (s.variant === "modular-monolith") return "db";
  return "svc-0";
}

/* ── Token expansion ─────────────────────────────────── */

export function expandToken(
  token: string,
  state: ServiceEvolutionState,
): string[] {
  if (token === "$services") return serviceNodes(state);
  if (token === "$dbs") return dbNodes(state);
  if (token === "$client") return ["client"];
  if (token === "$gateway") return ["gateway"];
  if (token === "$target") return [targetNode(state)];
  if (token === "$fault-target") return [faultTarget(state)];
  if (token === "$fault-cascade") return [faultCascade(state)];
  return [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  | "overview"
  | "deploy-change"
  | "traffic-spike"
  | "inject-fault"
  | "fault-spread"
  | "recovery"
  | "summary";

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  /* 0 — Overview */
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Deploy a change →",
    action: "resetRun",
    explain: (s) => VARIANT_PROFILES[s.variant].description,
  },

  /* 1 — Deploy a change
     Client → gateway → impacted unit ($target token).
     Monolith: whole "app" node; micro/serverless: single unit.
  */
  {
    key: "deploy-change",
    label: "Deploy a Change",
    processingText: "Deploying...",
    phase: "deploy",
    nextButton: "Spike traffic →",
    flow: [
      {
        from: "$client",
        to: "$gateway",
        duration: 500,
        explain: "Developer pushes a code change through CI/CD.",
        color: "#60a5fa",
      },
      {
        from: "$gateway",
        to: "$target",
        duration: 700,
        color: (s) => VARIANT_PROFILES[s.variant].color,
        explain: "Change rolls out to the impacted deployment unit.",
      },
    ],
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "modular-monolith"
        ? ["gateway", targetNode(s), targetSchema(s), "db"]
        : ["gateway", targetNode(s)],
    explain: (s) =>
      `Deploy time: ~${s.deployTimeS}s. ${
        s.variant === "monolith"
          ? "The entire application was offline during the window."
          : s.variant === "modular-monolith"
            ? "One module changed, and it owns its own schema, but the whole backend still redeployed because it remains a single deploy unit."
            : "Only one tiny unit swapped — zero blast radius on other services."
      }`,
  },

  /* 2 — Traffic spike
     Client → gateway fans out to all $services.
     The number of branches visually shows granularity.
  */
  {
    key: "traffic-spike",
    label: "Traffic Spike (10×)",
    processingText: "Scaling...",
    phase: "scale-event",
    nextButton: "Inject fault →",
    flow: [
      {
        from: "$client",
        to: "$gateway",
        duration: 400,
        explain: "Traffic spikes 10× — demand exceeds original capacity.",
        color: "#fbbf24",
      },
      {
        from: "$gateway",
        to: "$services",
        duration: 800,
        color: "#fbbf24",
        explain: "Demand fans out. How much can scale independently?",
      },
    ],
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "modular-monolith"
        ? ["gateway", "app", "db", ...serviceNodes(s)]
        : ["gateway", ...serviceNodes(s)],
    explain: (s) =>
      `Scale-out latency: ~${s.scaleLatencyS}s. ${
        s.variant === "monolith"
          ? "Vertical scale only — can't scale one feature without scaling everything."
          : s.variant === "modular-monolith"
            ? "Modules and schemas are cleaner, but the single backend instance is still the bottleneck under heavy traffic."
            : s.variant === "serverless"
              ? "Auto-elastic scale in seconds — no pre-provisioning required."
              : "Each service scales its own replicas independently."
      }`,
  },

  /* 3 — Inject fault
     Red signal hits $fault-target. Where does the damage stop?
  */
  {
    key: "inject-fault",
    label: "Inject a Fault",
    processingText: "Crashing...",
    phase: "fault",
    nextButton: (s) =>
      s.variant === "monolith" || s.variant === "modular-monolith"
        ? "See cascade →"
        : "Recovery →",
    flow: [
      {
        from: "$client",
        to: "$gateway",
        duration: 400,
        explain: "A bad request triggers a runtime fault.",
        color: "#ef4444",
      },
      {
        from: "$gateway",
        to: "$fault-target",
        duration: 600,
        explain: "The fault lands in one bounded unit first.",
        color: "#ef4444",
      },
    ],
    finalHotZones: (s) =>
      s.variant === "modular-monolith"
        ? [faultTarget(s), faultSchema(s), "db"]
        : [faultTarget(s)],
    explain: (s) => {
      const pct = s.blastRadius;
      if (s.variant === "monolith")
        return `100% blast radius — the entire application is down. Every user affected.`;
      if (s.variant === "modular-monolith")
        return `≈${pct}% blast radius. Modules help structure the code, but shared process and shared DB still let faults escape.`;
      if (s.variant === "serverless")
        return `≈${pct}% blast radius. One function fails; all other functions keep serving.`;
      return `≈${pct}% blast radius — only this service is impacted, others stay healthy.`;
    },
  },

  /* 4 — Fault propagation (monolith + modular-monolith only)
     The cascade reveals why process boundaries matter.
  */
  {
    key: "fault-spread",
    label: "Fault Propagation",
    when: (s) => s.variant === "monolith" || s.variant === "modular-monolith",
    phase: "fault",
    nextButton: "Recovery →",
    flow: [
      {
        from: "$fault-target",
        to: "$fault-cascade",
        duration: 700,
        explain: "Without a hard boundary, the fault cascades upstream.",
        color: "#ef4444",
      },
    ],
    finalHotZones: (s) =>
      s.variant === "modular-monolith"
        ? [faultTarget(s), faultSchema(s), faultCascade(s)]
        : [faultTarget(s), faultCascade(s)],
    explain: (s) =>
      s.variant === "monolith"
        ? "No fault boundary inside a monolith — the DB connection pool crashes with the app."
        : "Strong module boundaries help the codebase, but shared runtime and shared data still allow cascading failures.",
  },

  /* 5 — Recovery */
  {
    key: "recovery",
    label: "Recovery",
    phase: "recovery",
    delay: 400,
    nextButton: "Summary →",
    finalHotZones: [],
    explain: (s) => {
      if (s.variant === "monolith")
        return `Full app restart — ~${s.deployTimeS}s before traffic resumes. Every user experienced the outage.`;
      if (s.variant === "modular-monolith")
        return `Recovery is cleaner because ownership is clearer, but the full backend still restarts in ~${s.deployTimeS}s.`;
      if (s.variant === "serverless")
        return `Failed function replaced automatically in ~${s.scaleLatencyS}s. Most users never noticed.`;
      return `Impacted service(s) restart independently in ~${s.deployTimeS}s — ~${s.blastRadius}% of surface affected.`;
    },
  },

  /* 6 — Summary */
  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    finalHotZones: [],
    explain: (s) => {
      const p = VARIANT_PROFILES[s.variant];
      return (
        `${p.label} (${p.accentText}) · Deploy: ~${s.deployTimeS}s · ` +
        `Scale: ~${s.scaleLatencyS}s · Blast radius: ~${s.blastRadius}%. ` +
        `Switch architecture and replay to compare!`
      );
    },
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: ServiceEvolutionState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
