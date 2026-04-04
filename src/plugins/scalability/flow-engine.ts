import type { InfraComponents, ScalabilityState } from "./scalabilitySlice";

/* ══════════════════════════════════════════════════════════
   Declarative Flow Engine for Sandbox Plugins
   
   Instead of writing imperative animation code per step,
   define steps and their animation flows as DATA.
   The engine handles token expansion, signal routing,
   hot-zone derivation, and sequential execution.
   ══════════════════════════════════════════════════════════ */

/* ── Token expansion ─────────────────────────────────────
   Use $-prefixed tokens as shorthand for dynamic node sets.
   The engine expands them to actual node IDs at runtime.
   ──────────────────────────────────────────────────────── */

export function expandToken(token: string, state: ScalabilityState): string[] {
  if (token === "$clients") return state.clients.map((c) => c.id);
  if (token === "$servers") {
    const count = 1 + state.components.extraServers;
    return Array.from({ length: count }, (_, i) => `server-${i}`);
  }
  return [token];
}

/* ── Flow Beat ───────────────────────────────────────────
   One animation segment: signals travel from → to.
   Tokens ($clients, $servers) expand to parallel signals.
   ──────────────────────────────────────────────────────── */

export interface FlowBeat {
  from: string;
  to: string;
  /** Only include this beat when the condition is true. */
  when?: (c: InfraComponents) => boolean;
  /** Duration in ms (default: 600). */
  duration?: number;
  /** Explanation shown during this beat. */
  explain?: string;
}

/* ── Step Definition ─────────────────────────────────────
   Declarative config for one step in the visualization.
   ──────────────────────────────────────────────────────── */

export type StepKey =
  | "overview"
  | "send-traffic"
  | "observe-metrics"
  | "db-flow"
  | "lb-distribute"
  | "scale-out"
  | "cache-hits"
  | "summary";

export interface StepDef {
  key: StepKey;
  label: string;
  /** Only include this step when condition is true. */
  when?: (c: InfraComponents) => boolean;
  /** Button text — string, function of components, or auto-derived from next step label. */
  nextButton?: string | ((c: InfraComponents) => string);
  nextButtonColor?: string;
  processingText?: string;

  /** Phase dispatched at step start. */
  phase?: string | ((s: ScalabilityState) => string);
  /** Flow beats to animate in sequence. Hot zones are auto-derived. */
  flow?: FlowBeat[];
  /** Pause in ms after flow (or at start if no flow). */
  delay?: number;
  /** Recalculate metrics (runs before explain, after flow if present). */
  recalcMetrics?: boolean;
  /** Hot zones set after flow completes (default: cleared). */
  finalHotZones?: string[];
  /** Explanation shown after flow completes. */
  explain?: string | ((s: ScalabilityState) => string);
  /** Special action instead of flow. */
  action?: "reset";
}

/* ── Step Configuration ──────────────────────────────────
   This is the single source of truth for all steps.
   To add a new step, just add an entry here.
   ──────────────────────────────────────────────────────── */

export const STEPS: StepDef[] = [
  /* ─── 1. Overview ─────────────────────────────────────
     Reset state, show the architecture at rest.          */
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Send Traffic",
    action: "reset",
  },

  /* ─── 2. Send Traffic ─────────────────────────────────
     ONLY delivers traffic to the server layer.
     Does NOT include DB, LB, or cache — those get their
     own dedicated steps so nothing is repeated.          */
  {
    key: "send-traffic",
    label: "Send Traffic",
    processingText: "Sending...",
    nextButtonColor: "#2563eb",
    when: (c) => !c.loadBalancer,
    phase: "traffic",
    flow: [
      {
        from: "$clients",
        to: "cloud",
        duration: 700,
        explain: "Clients send requests through the internet.",
      },
      {
        from: "cloud",
        to: "server-0",
        duration: 600,
        explain: "Requests arrive at the server.",
      },
    ],
    recalcMetrics: true,
    explain: (s) =>
      `Traffic flowing. ${s.requestsPerSecond} rps demand, ${s.maxCapacity} capacity. CPU at ${s.serverCpuPercent}%.`,
  },

  /* ─── 4. Load Balancer Distributes ────────────────────
     Unique flow: cloud → LB → all servers.
     NOT shown in send-traffic (which only hit server-0). */
  {
    key: "lb-distribute",
    label: "Load Balancer Distributes",
    when: (c) => c.loadBalancer,
    processingText: "Routing...",
    nextButtonColor: "#8b5cf6",
    phase: "lb-distribute",
    flow: [
      {
        from: "cloud",
        to: "lb",
        duration: 500,
        explain: "Incoming requests hit the load balancer first.",
      },
      {
        from: "lb",
        to: "$servers",
        duration: 700,
        explain: "Load balancer fans out across all servers using round-robin.",
      },
    ],
    explain: (s) =>
      `Load balanced across ${1 + s.components.extraServers} server(s). Max capacity: ~${s.maxCapacity} rps.`,
  },
  /* ─── 3. Observe Metrics ──────────────────────────────
     No animation — pause and read the numbers.           */
  {
    key: "observe-metrics",
    label: "Observe Metrics",
    // when: (c) => !c.loadBalancer,
    nextButtonColor: "#2563eb",
    recalcMetrics: true,
    delay: 500,
    phase: (s) => (s.droppedRequests > 0 ? "overloaded" : "stable"),
    finalHotZones: ["server-0"],
    explain: (s) =>
      s.droppedRequests > 0
        ? `Overloaded! ${s.droppedRequests} requests dropped. CPU at ${s.serverCpuPercent}%. This server is a single point of failure.`
        : `Stable at ${s.throughput} rps, CPU ${s.serverCpuPercent}%. Try adding more clients or components to test limits.`,
  },
  /* ─── 5. Cache Hits ───────────────────────────────────
     Unique flow: servers ↔ cache.
     NOT shown in send-traffic.                           */
  {
    key: "cache-hits",
    label: "Cache Boosts Throughput",
    when: (c) => c.cache,
    nextButtonColor: "#f97316",
    phase: "cache-hits",
    flow: [
      {
        from: "$servers",
        to: "cache",
        duration: 500,
        explain: "Servers check the cache for recent data.",
      },
      {
        from: "cache",
        to: "$servers",
        duration: 400,
        explain: "Cache hit — fast response, no DB round-trip needed.",
      },
    ],
    explain: (s) =>
      `Cache boosted throughput to ~${s.maxCapacity} rps. Response time: ${s.responseTimeMs}ms.`,
  },
  /* ─── 6. Server ↔ Database ────────────────────────────
     Unique flow: servers ↔ DB.
     NOT shown in send-traffic.                           */
  {
    key: "db-flow",
    label: "Server ↔ Database",
    when: (c) => c.database,
    processingText: "Querying...",
    nextButtonColor: "#22c55e",
    phase: "db-flow",
    flow: [
      {
        from: "$servers",
        to: "database",
        duration: 700,
        explain:
          "Each server queries the database independently. Separating DB lets each tier scale on its own.",
      },
      {
        from: "database",
        to: "$servers",
        duration: 700,
        explain: "Database responds to all servers.",
      },
    ],
    explain: (s) =>
      `Database responds to ${1 + s.components.extraServers} server(s). Max capacity: ~${s.maxCapacity} rps.`,
  },

  /* ─── 7. Horizontal Scale-Out ─────────────────────────
     No animation — explanation of capacity gain.         */
  {
    key: "scale-out",
    label: "Horizontal Scale-Out",
    when: (c) => c.extraServers > 0,
    nextButtonColor: "#14b8a6",
    phase: "scale-out",
    delay: 600,
    finalHotZones: ["lb", "server-0"],
    explain: (s) =>
      `${s.components.extraServers} extra server(s) added. Each handles ~50 additional rps. Total capacity: ~${s.maxCapacity} rps.`,
  },

  /* ─── 8. Summary ──────────────────────────────────────
     Recap of all active components and total capacity.   */
  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    explain: (s) => {
      const parts: string[] = [];
      if (s.components.database) parts.push("separated database");
      if (s.components.loadBalancer) parts.push("load balancer");
      if (s.components.extraServers > 0)
        parts.push(`${s.components.extraServers} extra server(s)`);
      if (s.components.cache) parts.push("cache");
      const desc =
        parts.length > 0
          ? `With ${parts.join(", ")}, max capacity is ~${s.maxCapacity} rps.`
          : "Solo server with no scaling. Max capacity: ~60 rps.";
      return `${desc} Try adding or removing components and replaying.`;
    },
  },
];

/* ── Build active steps from config ──────────────────────
   Filters by `when`, auto-derives nextButtonText from the
   next active step's label when not explicitly set.
   ──────────────────────────────────────────────────────── */

export interface TaggedStep {
  key: StepKey;
  label: string;
  autoAdvance?: boolean;
  nextButtonText?: string;
  nextButtonColor?: string;
  processingText?: string;
}

export function buildSteps(state: ScalabilityState): TaggedStep[] {
  const { components: c } = state;
  const active = STEPS.filter((s) => !s.when || s.when(c));

  return active.map((step, i) => {
    const nextStep = active[i + 1];

    // Resolve nextButton: explicit string/function, or auto-derive from next step label
    let nextButtonText: string | undefined;
    if (typeof step.nextButton === "function") {
      nextButtonText = step.nextButton(c);
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

/* ── Flow Executor ───────────────────────────────────────
   Walks a list of FlowBeats, expands tokens, builds
   parallel signal pairs, auto-sets hot zones, and
   dispatches explanation updates. Fully generic.
   ──────────────────────────────────────────────────────── */

export interface FlowExecutorDeps {
  animateParallel: (
    pairs: { from: string; to: string }[],
    duration: number,
  ) => Promise<void>;
  patch: (p: Partial<ScalabilityState>) => void;
  getState: () => ScalabilityState;
  cancelled: () => boolean;
}

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  const components = deps.getState().components;
  const activeBeats = beats.filter((b) => !b.when || b.when(components));

  for (const beat of activeBeats) {
    if (deps.cancelled()) return;

    const state = deps.getState();
    const froms = expandToken(beat.from, state);
    const tos = expandToken(beat.to, state);

    // Cartesian product → parallel signal pairs
    const pairs: { from: string; to: string }[] = [];
    for (const f of froms) {
      for (const t of tos) {
        pairs.push({ from: f, to: t });
      }
    }

    // Auto-derive hot zones from participants
    const hotZones = [...new Set([...froms, ...tos])];

    const update: Partial<ScalabilityState> = { hotZones };
    if (beat.explain) update.explanation = beat.explain;
    deps.patch(update);

    await deps.animateParallel(pairs, beat.duration ?? 600);
  }
}
