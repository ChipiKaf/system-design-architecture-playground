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

function deployTargetNode(s: ServiceEvolutionState): string {
  if (s.variant === "monolith") return "app";
  if (s.variant === "modular-monolith") return "app";
  return targetNode(s);
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
  if (token === "$cicd") return ["cicd"];
  if (token === "$deploy-window") return ["deploy-window"];
  if (token === "$deploy-standby") return ["deploy-standby"];
  if (token === "$deploy-target") return [deployTargetNode(state)];
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
  | "acid-atomicity"
  | "acid-consistency"
  | "acid-isolation"
  | "acid-durability"
  | "prepare-deploy"
  | "deploy-offline"
  | "deploy-live"
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
    nextButton: (s) =>
      s.variant === "monolith"
        ? "Trace ACID transaction →"
        : s.variant === "modular-monolith"
          ? "Prepare deploy →"
          : "Deploy a change →",
    action: "resetRun",
    explain: (s) => VARIANT_PROFILES[s.variant].description,
  },

  {
    key: "acid-atomicity",
    when: (s) => s.variant === "monolith",
    label: "Atomicity",
    processingText: "Opening local transaction...",
    phase: "transaction",
    nextButton: "Check consistency →",
    flow: [
      {
        from: "$client",
        to: "$gateway",
        duration: 320,
        explain:
          "A checkout request enters the monolith. One thread can keep the whole transaction in one process.",
        color: "#38bdf8",
      },
      {
        from: "$gateway",
        to: "ui",
        duration: 320,
        color: "#38bdf8",
        explain:
          "The request enters the controller layer and keeps one local transaction context.",
      },
      {
        from: "ui",
        to: "cart",
        duration: 260,
        color: "#38bdf8",
      },
      {
        from: "cart",
        to: "checkout",
        duration: 280,
        color: "#38bdf8",
      },
      {
        from: "checkout",
        to: "payments",
        duration: 320,
        color: "#38bdf8",
        explain:
          "Cart, Checkout, and Payments all participate in one in-process unit of work before anything commits.",
      },
    ],
    finalHotZones: [
      "gateway",
      "app",
      "ui",
      "cart",
      "checkout",
      "payments",
      "db",
      "tx-atomicity",
      "tx-route",
    ],
    explain:
      "Atomicity: the monolith can stage cart, order, and payment changes inside one in-process transaction. If any part fails, none of it commits.",
  },

  {
    key: "acid-consistency",
    when: (s) => s.variant === "monolith",
    label: "Consistency",
    processingText: "Validating invariants...",
    phase: "transaction",
    nextButton: "Protect isolation →",
    flow: [
      {
        from: "cart",
        to: "checkout",
        duration: 320,
        explain:
          "The same call stack can validate totals, stock, and order rules before commit.",
        color: "#22c55e",
      },
      {
        from: "checkout",
        to: "payments",
        duration: 320,
        color: "#22c55e",
        explain:
          "Payment authorization and order invariants are checked inside the same transaction boundary.",
      },
    ],
    finalHotZones: [
      "app",
      "ui",
      "cart",
      "checkout",
      "payments",
      "db",
      "tx-consistency",
      "tx-route",
      "tx-invariants",
    ],
    explain:
      "Consistency: one local transaction can enforce invariants like valid totals, reserved stock, and an authorized payment before any row becomes visible.",
  },

  {
    key: "acid-isolation",
    when: (s) => s.variant === "monolith",
    label: "Isolation",
    processingText: "Holding locks...",
    phase: "transaction",
    nextButton: "Commit durably →",
    flow: [
      {
        from: "$client",
        to: "$gateway",
        duration: 320,
        explain:
          "A second request arrives while the first transaction is still open.",
        color: "#fbbf24",
      },
    ],
    finalHotZones: [
      "gateway",
      "app",
      "checkout",
      "payments",
      "db",
      "tx-isolation",
      "tx-route",
      "tx-locks",
      "tx-queue",
    ],
    explain:
      "Isolation: other requests wait instead of seeing half-written Cart or Payment state. With one process and one shared database, that local coordination is straightforward.",
  },

  {
    key: "acid-durability",
    when: (s) => s.variant === "monolith",
    label: "Durability",
    processingText: "Committing transaction...",
    phase: "transaction",
    nextButton: "Prepare deploy →",
    flow: [
      {
        from: "payments",
        to: "$dbs",
        duration: 420,
        explain:
          "The transaction commits once to the shared database, turning staged changes into durable state.",
        color: "#4ade80",
      },
    ],
    finalHotZones: [
      "app",
      "ui",
      "cart",
      "checkout",
      "payments",
      "db",
      "tx-durability",
      "tx-route",
      "tx-committed",
    ],
    explain:
      "Durability: once the local commit lands in the shared DB, the order survives process restarts. This is the convenience monoliths give you before service boundaries complicate coordination.",
  },

  {
    key: "prepare-deploy",
    when: (s) => s.variant === "monolith" || s.variant === "modular-monolith",
    label: "Prepare Deploy",
    processingText: "Preparing release...",
    phase: "deploy",
    nextButton: (s) =>
      s.variant === "modular-monolith"
        ? "Take backend offline →"
        : "Take app offline →",
    flow: (s) => [
      {
        from: "$cicd",
        to: "$deploy-window",
        duration: 500,
        explain:
          s.variant === "modular-monolith"
            ? "CI/CD prepares a backend release. Catalog and Ordering are the touched modules, but the whole monolith still ships as one unit."
            : "CI/CD prepares a full-app deployment. The code change is mostly in UI and Cart, but the monolith still ships as one unit.",
        color: "#60a5fa",
      },
    ],
    finalHotZones: (s) =>
      s.variant === "modular-monolith"
        ? [
            "cicd",
            "deploy-window",
            "app",
            "db",
            "mod-0",
            "mod-1",
            "schema-0",
            "schema-1",
            "deploy-prep",
          ]
        : ["cicd", "deploy-window", "ui", "cart", "deploy-prep"],
    explain: (s) =>
      s.variant === "modular-monolith"
        ? "The pipeline is ready, and the touched modules are highlighted, but the release still ships as one backend."
        : "The pipeline is ready, and UI plus Cart are the changed areas. But because this is one deployable unit, the release process still targets the whole application.",
  },

  {
    key: "deploy-offline",
    when: (s) => s.variant === "monolith" || s.variant === "modular-monolith",
    label: "Take Monolith Offline",
    processingText: "Draining traffic...",
    phase: "deploy",
    nextButton: (s) =>
      s.variant === "modular-monolith"
        ? "Bring copy online →"
        : "Bring replacement online →",
    flow: (s) => [
      {
        from: "$deploy-window",
        to: "$deploy-target",
        duration: 650,
        explain:
          s.variant === "modular-monolith"
            ? "Traffic drains away from the live backend, and the whole modular monolith goes offline for replacement."
            : "Traffic drains away from the live monolith, and the whole application goes offline for replacement.",
        color: "#ef4444",
      },
    ],
    finalHotZones: (s) =>
      s.variant === "modular-monolith"
        ? [
            "deploy-window",
            "app",
            "db",
            "mod-0",
            "mod-1",
            "schema-0",
            "schema-1",
            "deploy-offline",
          ]
        : ["deploy-window", "app", "ui", "cart", "deploy-offline"],
    explain: (s) =>
      s.variant === "modular-monolith"
        ? "Even though the release mostly touches Catalog and Ordering, the modular monolith still has to go offline as a whole because there is only one deployment unit."
        : "Even though the release mostly touches UI and Cart, the monolith has to go offline as a whole because there is only one deployment unit.",
  },

  {
    key: "deploy-live",
    when: (s) => s.variant === "monolith" || s.variant === "modular-monolith",
    label: "Replacement Comes Online",
    processingText: "Cutting over...",
    phase: "deploy",
    nextButton: "Spike traffic →",
    flow: (s) => [
      {
        from: "$deploy-window",
        to: "$deploy-standby",
        duration: 650,
        explain:
          s.variant === "modular-monolith"
            ? "CI/CD brings up an identical replacement copy, then cuts traffic over to the new backend."
            : "CI/CD brings up an identical replacement copy and cuts traffic over to the new version.",
        color: "#60a5fa",
      },
    ],
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "modular-monolith"
        ? [
            "cicd",
            "app",
            "deploy-standby",
            "db",
            "mod-0",
            "mod-1",
            "schema-0",
            "schema-1",
            "deploy-live",
          ]
        : ["cicd", "app", "deploy-standby", "ui", "cart", "deploy-live"],
    explain: (s) =>
      s.variant === "modular-monolith"
        ? `Deploy time: ~${s.deployTimeS}s. Catalog and Ordering were the touched modules, but the whole backend still had to be replaced before it could come back online.`
        : `Deploy time: ~${s.deployTimeS}s. UI and Cart were the changed parts, but the entire application still had to be replaced before it could come back online.`,
  },

  /* 1 — Deploy a change
     Client → gateway → impacted unit ($target token).
     Monolith: whole "app" node; micro/serverless: single unit.
  */
  {
    key: "deploy-change",
    when: (s) => s.variant !== "monolith" && s.variant !== "modular-monolith",
    label: "Deploy a Change",
    processingText: "Deploying...",
    phase: "deploy",
    nextButton: "Spike traffic →",
    flow: (s) =>
      s.variant === "monolith"
        ? [
            {
              from: "$cicd",
              to: "$deploy-window",
              duration: 450,
              explain:
                "CI/CD starts the release, drains traffic, and takes the current monolith offline.",
              color: "#60a5fa",
            },
            {
              from: "$deploy-window",
              to: "$deploy-standby",
              duration: 650,
              explain:
                "The pipeline brings up an identical replacement copy with the new code.",
              color: "#60a5fa",
            },
            {
              from: "$deploy-standby",
              to: "$target",
              duration: 700,
              color: "#60a5fa",
              explain:
                "Traffic cuts over to the replacement, and the new version takes the old slot.",
            },
          ]
        : [
            {
              from: "$cicd",
              to: "$deploy-window",
              duration: 450,
              explain:
                "CI/CD starts the rollout and prepares the new release for cutover.",
              color: "#60a5fa",
            },
            {
              from: "$deploy-window",
              to: "$target",
              duration: 700,
              color: (current) => VARIANT_PROFILES[current.variant].color,
              explain:
                "The change rolls out to the impacted deployment unit, without involving the client path.",
            },
          ],
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "modular-monolith"
        ? ["cicd", targetNode(s), targetSchema(s), "db"]
        : ["cicd", targetNode(s)],
    explain: (s) =>
      `Deploy time: ~${s.deployTimeS}s. ${
        s.variant === "monolith"
          ? "CI/CD redeployed the entire application as one unit, so the old copy went offline before an identical replacement could take over."
          : s.variant === "modular-monolith"
            ? "One module changed, but the full backend still redeployed because it remains a single deploy unit despite the cleaner module boundaries."
            : s.variant === "serverless"
              ? "CI/CD swapped one function-sized unit, so the client path never needed a full-app outage."
              : "CI/CD rolled only the impacted service, so the rest of the system stayed untouched."
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
