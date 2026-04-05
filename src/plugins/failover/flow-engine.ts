import type { FailoverState } from "./failoverSlice";

/* ══════════════════════════════════════════════════════════
   Failover Lab — Declarative Flow Engine

   Steps walk the user through normal operation, then
   a primary failure, outage period, secondary promotion,
   recovery, and a summary of tradeoffs.
   ══════════════════════════════════════════════════════════ */

/* ── Token expansion ─────────────────────────────────── */

export function expandToken(token: string, _state: FailoverState): string[] {
  return [token];
}

/* ── Flow Beat ───────────────────────────────────────── */

export interface FlowBeat {
  from: string;
  to: string;
  when?: (s: FailoverState) => boolean;
  duration?: number;
  explain?: string;
}

/* ── Step Definition ─────────────────────────────────── */

export type StepKey =
  | "overview"
  | "clients-to-router"
  | "router-to-primary"
  | "router-to-secondary"
  | "primary-to-db"
  | "replication"
  | "fail-primary"
  | "outage"
  | "promote-secondary"
  | "recovery-reroute"
  | "secondary-serves"
  | "summary";

export interface StepDef {
  key: StepKey;
  label: string;
  when?: (s: FailoverState) => boolean;
  nextButton?: string | ((s: FailoverState) => string);
  nextButtonColor?: string;
  processingText?: string;
  phase?: string | ((s: FailoverState) => string);
  flow?: FlowBeat[];
  delay?: number;
  recalcMetrics?: boolean;
  finalHotZones?: string[];
  explain?: string | ((s: FailoverState) => string);
  action?:
    | "reset"
    | "softReset"
    | "failPrimary"
    | "promoteSecondary"
    | "completeFailover";
}

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  /* 0 ── Overview / reset ─────────────────────────────── */
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Start",
    action: "softReset",
    explain: (s) => {
      const lbl =
        s.strategy === "cold"
          ? "Cold standby is offline — restored from snapshots on failure."
          : s.strategy === "warm"
            ? "Warm standby is running with async replication, ready to promote."
            : s.strategy === "hot"
              ? "Hot standby has synchronous replication — near-instant failover."
              : "Active-active: both servers handle traffic simultaneously.";
      return `${lbl} Step through to see what happens during a failure.`;
    },
  },

  /* 1 ── Clients → Router ─────────────────────────────── */
  {
    key: "clients-to-router",
    label: "Clients → Router",
    phase: "traffic",
    flow: [
      { from: "client-1", to: "router", duration: 700 },
      { from: "client-2", to: "router", duration: 700 },
    ],
    finalHotZones: ["client-1", "client-2", "router"],
    explain: "Clients send requests to the router / load balancer.",
  },

  /* 2 ── Router → Primary ─────────────────────────────── */
  {
    key: "router-to-primary",
    label: "Router → Primary",
    phase: "traffic",
    flow: [{ from: "router", to: "primary", duration: 700 }],
    finalHotZones: ["router", "primary"],
    explain: "The router forwards all traffic to the primary server.",
  },

  /* 3 ── Router → Secondary (active-active only) ─────── */
  {
    key: "router-to-secondary",
    label: "Router → Active-2",
    phase: "traffic",
    when: (s) => s.strategy === "multiPrimary",
    flow: [{ from: "router", to: "secondary", duration: 700 }],
    finalHotZones: ["router", "secondary"],
    explain:
      "In active-active mode the router also sends traffic to the second server.",
  },

  /* 4 ── Primary → DB ─────────────────────────────────── */
  {
    key: "primary-to-db",
    label: "Primary → DB",
    phase: "traffic",
    flow: [{ from: "primary", to: "primary-db", duration: 700 }],
    finalHotZones: ["primary", "primary-db"],
    explain: "The primary server reads and writes data to its database.",
  },

  /* 5 ── Replication ──────────────────────────────────── */
  {
    key: "replication",
    label: "Replication",
    phase: "replication",
    when: (s) => s.replicationMode !== "backup",
    flow: [{ from: "primary-db", to: "secondary-db", duration: 900 }],
    finalHotZones: ["primary-db", "secondary-db"],
    explain: (s) =>
      s.replicationMode === "sync"
        ? "Synchronous replication: every write is confirmed on both databases before acknowledging the client. Zero data loss, but higher write latency."
        : "Asynchronous replication: writes are confirmed on the primary, then replicated in the background. Lower latency but the secondary may lag behind.",
  },

  /* 6 ── Fail Primary ────────────────────────────────── */
  {
    key: "fail-primary",
    label: "⚡ Fail Primary",
    nextButton: "Trigger Failure",
    nextButtonColor: "#dc2626",
    phase: "failure",
    action: "failPrimary",
    delay: 400,
    finalHotZones: ["primary", "primary-db"],
    explain: (s) => {
      const profile =
        s.strategy === "cold"
          ? "Cold standby is offline — it must boot from a backup snapshot."
          : s.strategy === "warm"
            ? "Warm standby is running but needs promotion and routing changes."
            : s.strategy === "hot"
              ? "Hot standby has near-real-time data. Fast promotion possible."
              : "Active-active: the other server is already handling traffic!";
      return `💥 Primary server has crashed! ${profile}`;
    },
  },

  /* 7 ── Outage period ───────────────────────────────── */
  {
    key: "outage",
    label: "Outage Period",
    nextButtonColor: "#f59e0b",
    phase: "outage",
    delay: 600,
    finalHotZones: ["primary"],
    explain: (s) =>
      s.autoFailover
        ? `Automated health checks detected the failure. Starting promotion (RTO ≈ ${s.currentRtoSec}s)...`
        : `Manual intervention needed. An operator must detect the outage and initiate failover (RTO ≈ ${s.currentRtoSec}s).`,
  },

  /* 8 ── Promote Secondary ───────────────────────────── */
  {
    key: "promote-secondary",
    label: "Promote Secondary",
    nextButtonColor: "#7c3aed",
    phase: "promoting",
    action: "promoteSecondary",
    when: (s) => s.strategy !== "multiPrimary",
    flow: [{ from: "secondary-db", to: "secondary", duration: 800 }],
    finalHotZones: ["secondary", "secondary-db"],
    explain: (s) =>
      s.strategy === "cold"
        ? "Restoring secondary from backup snapshots... This takes minutes."
        : s.strategy === "warm"
          ? "Promoting warm standby to primary role and updating routing..."
          : "Hot standby almost ready — minimal promotion delay.",
  },

  /* 9 ── Recovery: reroute traffic ───────────────────── */
  {
    key: "recovery-reroute",
    label: "Reroute Traffic",
    nextButtonColor: "#16a34a",
    phase: "recovered",
    action: "completeFailover",
    flow: [
      { from: "client-1", to: "router", duration: 700 },
      { from: "client-2", to: "router", duration: 700 },
    ],
    finalHotZones: ["client-1", "client-2", "router"],
    explain:
      "Clients continue sending requests. The router detects the new primary.",
  },

  /* 10 ── Secondary now serving ──────────────────────── */
  {
    key: "secondary-serves",
    label: "Secondary Serves",
    nextButtonColor: "#16a34a",
    phase: "recovered",
    flow: [
      { from: "router", to: "secondary", duration: 700 },
      { from: "secondary", to: "secondary-db", duration: 600 },
    ],
    finalHotZones: ["secondary", "secondary-db", "router"],
    explain: (s) =>
      s.lostWrites > 0
        ? `Service restored! But ~${s.lostWrites} writes were lost (RPO ≈ ${s.currentRpoSec}s). Total outage: ~${s.currentRtoSec}s.`
        : `Service restored with zero data loss! Total outage: ~${s.currentRtoSec}s.`,
  },

  /* 11 ── Summary ────────────────────────────────────── */
  {
    key: "summary",
    label: "Tradeoff Summary",
    phase: "summary",
    explain: (s) => {
      const fmt = (n: number) =>
        n >= 3600
          ? `${Math.round(n / 60)}m`
          : n >= 60
            ? `${Math.round(n / 60)}m ${n % 60}s`
            : `${n}s`;
      return (
        `Strategy: ${s.strategy === "multiPrimary" ? "Active-Active" : s.strategy[0].toUpperCase() + s.strategy.slice(1) + " Standby"}. ` +
        `RTO ≈ ${fmt(s.currentRtoSec)} · RPO ≈ ${fmt(s.currentRpoSec)} · ` +
        `Cost: $${s.cost.totalMonthly}/mo · ` +
        `Availability: ${s.availabilityPercent}%. ` +
        `Try a different strategy to compare!`
      );
    },
  },
];

/* ── Build active steps from config ──────────────────── */

export interface TaggedStep {
  key: StepKey;
  label: string;
  autoAdvance?: boolean;
  nextButtonText?: string;
  nextButtonColor?: string;
  processingText?: string;
}

export function buildSteps(state: FailoverState): TaggedStep[] {
  const active = STEPS.filter((s) => !s.when || s.when(state));

  return active.map((step, i) => {
    const nextStep = active[i + 1];
    let nextButtonText: string | undefined;
    if (typeof step.nextButton === "function") {
      nextButtonText = step.nextButton(state);
    } else if (typeof step.nextButton === "string") {
      nextButtonText = step.nextButton;
    } else if (nextStep) {
      nextButtonText = nextStep.label;
    }

    return {
      key: step.key,
      label: step.label,
      autoAdvance: false,
      nextButtonText,
      nextButtonColor: step.nextButtonColor,
      processingText: step.processingText,
    };
  });
}

/* ── Flow Executor ───────────────────────────────────── */

export interface FlowExecutorDeps {
  animateParallel: (
    pairs: { from: string; to: string }[],
    duration: number,
  ) => Promise<void>;
  patch: (p: Partial<FailoverState>) => void;
  getState: () => FailoverState;
  cancelled: () => boolean;
}

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  const state = deps.getState();
  const activeBeats = beats.filter((b) => !b.when || b.when(state));

  for (const beat of activeBeats) {
    if (deps.cancelled()) return;

    const st = deps.getState();
    const froms = expandToken(beat.from, st);
    const tos = expandToken(beat.to, st);

    const pairs: { from: string; to: string }[] = [];
    for (const f of froms) {
      for (const t of tos) {
        pairs.push({ from: f, to: t });
      }
    }

    const hotZones = [...new Set([...froms, ...tos])];
    const update: Partial<FailoverState> = { hotZones };
    if (beat.explain) update.explanation = beat.explain;
    deps.patch(update);

    await deps.animateParallel(pairs, beat.duration ?? 600);
  }
}
