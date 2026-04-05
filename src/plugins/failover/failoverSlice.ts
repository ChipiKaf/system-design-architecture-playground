import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/* ── Types ───────────────────────────────────────────── */

export type FailoverStrategy = "cold" | "warm" | "hot" | "multiPrimary";
export type ReplicationMode = "backup" | "async" | "sync";
export type NodeRole = "primary" | "secondary";
export type NodeStatus = "up" | "down" | "recovering" | "promoting";

export interface NodeState {
  id: string;
  role: NodeRole;
  status: NodeStatus;
  servingTraffic: boolean;
  acceptsWrites: boolean;
  dataVersion: number;
  lagSeconds: number;
}

export interface CostBreakdown {
  primaryHourly: number;
  standbyHourly: number;
  replicationHourly: number;
  monitoringHourly: number;
  totalHourly: number;
  totalMonthly: number;
}

export interface FailoverState {
  strategy: FailoverStrategy;
  replicationMode: ReplicationMode;
  autoFailover: boolean;
  healthCheckIntervalSec: number;
  nodes: NodeState[];

  /* derived metrics */
  currentRtoSec: number;
  currentRpoSec: number;
  cost: CostBreakdown;
  complexityScore: number;
  availabilityPercent: number;

  /* write simulation */
  writeCounter: number;
  replicationLagWrites: number;
  lostWrites: number;

  /* event log */
  eventLog: string[];

  /* UI / animation state */
  hotZones: string[];
  explanation: string;
  phase: string;
  failureActive: boolean;
  failoverInProgress: boolean;
  outageDurationSec: number;

  /* system profile */
  systemProfile: SystemProfileKey;
}

/* ── Strategy profiles ───────────────────────────────── */

interface StrategyProfile {
  label: string;
  detectionDelaySec: number;
  promotionDelaySec: number;
  routingDelaySec: number;
  defaultReplication: ReplicationMode;
  standbyCostRatio: number;
  replicationCost: number;
  monitoringCost: number;
  complexity: number;
  baseAvailability: number;
  standbyInitialStatus: NodeStatus;
  standbyServesTraffic: boolean;
  standbyAcceptsWrites: boolean;
}

export const STRATEGY_PROFILES: Record<FailoverStrategy, StrategyProfile> = {
  cold: {
    label: "Cold Standby",
    detectionDelaySec: 30,
    promotionDelaySec: 120,
    routingDelaySec: 60,
    defaultReplication: "backup",
    standbyCostRatio: 0.1,
    replicationCost: 0.002,
    monitoringCost: 0,
    complexity: 1,
    baseAvailability: 95.0,
    standbyInitialStatus: "down",
    standbyServesTraffic: false,
    standbyAcceptsWrites: false,
  },
  warm: {
    label: "Warm Standby",
    detectionDelaySec: 15,
    promotionDelaySec: 30,
    routingDelaySec: 10,
    defaultReplication: "async",
    standbyCostRatio: 0.6,
    replicationCost: 0.005,
    monitoringCost: 0.003,
    complexity: 2,
    baseAvailability: 99.0,
    standbyInitialStatus: "up",
    standbyServesTraffic: false,
    standbyAcceptsWrites: false,
  },
  hot: {
    label: "Hot Standby",
    detectionDelaySec: 5,
    promotionDelaySec: 5,
    routingDelaySec: 2,
    defaultReplication: "sync",
    standbyCostRatio: 1.0,
    replicationCost: 0.008,
    monitoringCost: 0.005,
    complexity: 4,
    baseAvailability: 99.95,
    standbyInitialStatus: "up",
    standbyServesTraffic: false,
    standbyAcceptsWrites: false,
  },
  multiPrimary: {
    label: "Active-Active",
    detectionDelaySec: 2,
    promotionDelaySec: 0,
    routingDelaySec: 1,
    defaultReplication: "sync",
    standbyCostRatio: 1.0,
    replicationCost: 0.012,
    monitoringCost: 0.008,
    complexity: 5,
    baseAvailability: 99.99,
    standbyInitialStatus: "up",
    standbyServesTraffic: true,
    standbyAcceptsWrites: true,
  },
};

export const STRATEGY_ORDER: FailoverStrategy[] = [
  "cold",
  "warm",
  "hot",
  "multiPrimary",
];

/* ── System profiles ─────────────────────────────────── */

export type SystemProfileKey =
  | "none"
  | "ecommerce"
  | "banking"
  | "gaming"
  | "fintech"
  | "api-gateway";

export interface SystemProfile {
  key: SystemProfileKey;
  label: string;
  icon: string;
  rtoPriority: "low" | "medium" | "high" | "critical";
  rpoPriority: "low" | "medium" | "high" | "critical";
  recommendedStrategy: FailoverStrategy;
  recommendedReplication: ReplicationMode;
  recommendedAutoFailover: boolean;
  tagline: string;
  rtoReason: string;
  rpoReason: string;
  examples: string[];
}

export const SYSTEM_PROFILES: Record<SystemProfileKey, SystemProfile> = {
  none: {
    key: "none",
    label: "No Profile",
    icon: "⚙",
    rtoPriority: "medium",
    rpoPriority: "medium",
    recommendedStrategy: "cold",
    recommendedReplication: "backup",
    recommendedAutoFailover: false,
    tagline: "Manual configuration — choose your own strategy.",
    rtoReason: "",
    rpoReason: "",
    examples: [],
  },
  ecommerce: {
    key: "ecommerce",
    label: "E-commerce",
    icon: "🛒",
    rtoPriority: "high",
    rpoPriority: "medium",
    recommendedStrategy: "warm",
    recommendedReplication: "async",
    recommendedAutoFailover: true,
    tagline: "Downtime = lost revenue. A few lost cart updates are acceptable.",
    rtoReason:
      "Every second down, users leave. Revenue is lost instantly. Fast recovery is the priority.",
    rpoReason:
      "Losing a few cart updates is tolerable — users can re-add items. Async replication is fine.",
    examples: ["Amazon storefront", "Shopify checkout", "Product catalog API"],
  },
  banking: {
    key: "banking",
    label: "Banking / Ledger",
    icon: "🏦",
    rtoPriority: "medium",
    rpoPriority: "critical",
    recommendedStrategy: "hot",
    recommendedReplication: "sync",
    recommendedAutoFailover: true,
    tagline: "Losing a transaction means money disappears. Correctness first.",
    rtoReason:
      "Brief downtime is acceptable — users understand maintenance windows. The system must return in exact state.",
    rpoReason:
      "Losing even one transaction is unacceptable. Synchronous replication guarantees zero data loss, even at the cost of write latency.",
    examples: ["Core banking ledger", "Payment processor", "Accounting / ERP"],
  },
  gaming: {
    key: "gaming",
    label: "Online Gaming",
    icon: "🎮",
    rtoPriority: "critical",
    rpoPriority: "low",
    recommendedStrategy: "hot",
    recommendedReplication: "async",
    recommendedAutoFailover: true,
    tagline:
      "Players leave immediately on downtime. A few seconds of game state lost is fine.",
    rtoReason:
      "Player experience is destroyed by downtime. Every second offline = player churn. Near-instant failover is essential.",
    rpoReason:
      "Losing the last 1–2 seconds of match state is acceptable. Players will reconnect. Async replication keeps writes fast.",
    examples: [
      "Multiplayer game server",
      "Matchmaking service",
      "Leaderboard API",
    ],
  },
  fintech: {
    key: "fintech",
    label: "Fintech / Real-time",
    icon: "💰",
    rtoPriority: "critical",
    rpoPriority: "critical",
    recommendedStrategy: "multiPrimary",
    recommendedReplication: "sync",
    recommendedAutoFailover: true,
    tagline: "Both uptime AND data integrity are non-negotiable.",
    rtoReason:
      "Real-time payments can't tolerate any downtime. Users expect instant responses 24/7.",
    rpoReason:
      "Every transaction must be durable. Losing a payment record has legal and financial consequences.",
    examples: [
      "Stripe / Adyen",
      "Real-time trading platform",
      "Crypto exchange",
    ],
  },
  "api-gateway": {
    key: "api-gateway",
    label: "API Gateway",
    icon: "📡",
    rtoPriority: "critical",
    rpoPriority: "low",
    recommendedStrategy: "hot",
    recommendedReplication: "async",
    recommendedAutoFailover: true,
    tagline:
      "Often stateless — uptime is everything, data loss rarely applies.",
    rtoReason:
      "Everything depends on the gateway. If it's down, the entire system is down. Must recover in seconds.",
    rpoReason:
      "Gateways are mostly stateless (no writes). RPO is not meaningful — there's nothing to lose.",
    examples: ["Auth service", "Rate limiter", "Edge router / CDN entry"],
  },
};

export const SYSTEM_PROFILE_ORDER: SystemProfileKey[] = [
  "none",
  "ecommerce",
  "banking",
  "gaming",
  "fintech",
  "api-gateway",
];

/* ── Replication lag model ───────────────────────────── */

function getReplicationLag(
  mode: ReplicationMode,
  strategy: FailoverStrategy,
): { lagSec: number; lagWrites: number } {
  switch (mode) {
    case "backup":
      return { lagSec: 3600, lagWrites: 50 };
    case "async":
      return {
        lagSec: strategy === "hot" ? 1 : 5,
        lagWrites: strategy === "hot" ? 1 : 8,
      };
    case "sync":
      return { lagSec: 0, lagWrites: 0 };
  }
}

/* ── Cost model ──────────────────────────────────────── */

const PRIMARY_HOURLY = 0.0208;

function computeCost(
  strategy: FailoverStrategy,
  autoFailover: boolean,
): CostBreakdown {
  const profile = STRATEGY_PROFILES[strategy];
  const primaryHourly = PRIMARY_HOURLY;
  const standbyHourly = PRIMARY_HOURLY * profile.standbyCostRatio;
  const replicationHourly = profile.replicationCost;
  const monitoringHourly = profile.monitoringCost + (autoFailover ? 0.004 : 0);
  const totalHourly =
    primaryHourly + standbyHourly + replicationHourly + monitoringHourly;
  return {
    primaryHourly,
    standbyHourly,
    replicationHourly,
    monitoringHourly,
    totalHourly,
    totalMonthly: Math.round(totalHourly * 730 * 100) / 100,
  };
}

/* ── Metrics ─────────────────────────────────────────── */

export function computeMetrics(state: FailoverState): void {
  const profile = STRATEGY_PROFILES[state.strategy];
  const lag = getReplicationLag(state.replicationMode, state.strategy);

  let rto =
    profile.detectionDelaySec +
    profile.promotionDelaySec +
    profile.routingDelaySec;
  if (state.autoFailover) {
    rto = Math.max(rto * 0.5, profile.detectionDelaySec + 2);
  }
  state.currentRtoSec = Math.round(rto);
  state.currentRpoSec = lag.lagSec;
  state.replicationLagWrites = lag.lagWrites;

  state.cost = computeCost(state.strategy, state.autoFailover);
  state.complexityScore = profile.complexity + (state.autoFailover ? 1 : 0);
  state.availabilityPercent = state.autoFailover
    ? Math.min(profile.baseAvailability + 0.5, 99.999)
    : profile.baseAvailability;

  // Sync node states when not in failure
  if (!state.failureActive && !state.failoverInProgress) {
    const primary = state.nodes.find((n) => n.id === "primary");
    const secondary = state.nodes.find((n) => n.id === "secondary");
    if (primary) {
      primary.status = "up";
      primary.role = "primary";
      primary.servingTraffic = true;
      primary.acceptsWrites = true;
      primary.lagSeconds = 0;
    }
    if (secondary) {
      secondary.status = profile.standbyInitialStatus;
      secondary.role = "secondary";
      secondary.servingTraffic = profile.standbyServesTraffic;
      secondary.acceptsWrites = profile.standbyAcceptsWrites;
      secondary.lagSeconds = lag.lagSec;
    }
  }
}

/* ── Build nodes ─────────────────────────────────────── */

function createNodes(strategy: FailoverStrategy): NodeState[] {
  const profile = STRATEGY_PROFILES[strategy];
  const lag = getReplicationLag(profile.defaultReplication, strategy);
  return [
    {
      id: "primary",
      role: "primary",
      status: "up",
      servingTraffic: true,
      acceptsWrites: true,
      dataVersion: 100,
      lagSeconds: 0,
    },
    {
      id: "secondary",
      role: "secondary",
      status: profile.standbyInitialStatus,
      servingTraffic: profile.standbyServesTraffic,
      acceptsWrites: profile.standbyAcceptsWrites,
      dataVersion: 100 - lag.lagWrites,
      lagSeconds: lag.lagSec,
    },
  ];
}

/* ── Initial state ───────────────────────────────────── */

export const initialState: FailoverState = {
  strategy: "cold",
  replicationMode: "backup",
  autoFailover: false,
  healthCheckIntervalSec: 30,
  nodes: createNodes("cold"),

  currentRtoSec: 210,
  currentRpoSec: 3600,
  cost: computeCost("cold", false),
  complexityScore: 1,
  availabilityPercent: 95.0,

  writeCounter: 100,
  replicationLagWrites: 50,
  lostWrites: 0,

  eventLog: [],

  hotZones: [],
  explanation:
    "A primary server with a cold standby. The backup is offline, restored from periodic snapshots. Choose a strategy or a system profile, then step through the animation to see what happens during a failure.",
  phase: "overview",
  failureActive: false,
  failoverInProgress: false,
  outageDurationSec: 0,

  systemProfile: "none",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */

const failoverSlice = createSlice({
  name: "failover",
  initialState,
  reducers: {
    reset: () => {
      const s: FailoverState = {
        ...initialState,
        nodes: createNodes("cold"),
        eventLog: [],
        cost: { ...initialState.cost },
      };
      computeMetrics(s);
      return s;
    },

    softReset: (state) => {
      state.hotZones = [];
      state.phase = "overview";
      state.failureActive = false;
      state.failoverInProgress = false;
      state.outageDurationSec = 0;
      state.lostWrites = 0;
      state.eventLog = [];
      state.nodes = createNodes(state.strategy);
      state.writeCounter = 100;
      state.explanation =
        "System healthy. Step through the animation to see the failover process.";
      computeMetrics(state);
    },

    patchState(state, action: PayloadAction<Partial<FailoverState>>) {
      Object.assign(state, action.payload);
    },

    setStrategy(state, action: PayloadAction<FailoverStrategy>) {
      const prev = state.strategy;
      state.strategy = action.payload;
      state.replicationMode =
        STRATEGY_PROFILES[action.payload].defaultReplication;
      state.nodes = createNodes(action.payload);
      state.failureActive = false;
      state.failoverInProgress = false;
      state.outageDurationSec = 0;
      state.lostWrites = 0;
      state.writeCounter = 100;
      state.eventLog = [];
      computeMetrics(state);
      state.explanation = `Switched from ${STRATEGY_PROFILES[prev].label} to ${STRATEGY_PROFILES[action.payload].label}.`;
    },

    setReplicationMode(state, action: PayloadAction<ReplicationMode>) {
      state.replicationMode = action.payload;
      computeMetrics(state);
    },

    toggleAutoFailover(state) {
      state.autoFailover = !state.autoFailover;
      computeMetrics(state);
    },

    failPrimary(state) {
      const primary = state.nodes.find((n) => n.id === "primary");
      if (!primary || primary.status === "down") return;

      primary.status = "down";
      primary.servingTraffic = false;
      primary.acceptsWrites = false;
      state.failureActive = true;

      const lag = getReplicationLag(state.replicationMode, state.strategy);
      state.lostWrites = lag.lagWrites;
      state.replicationLagWrites = lag.lagWrites;

      state.writeCounter += 10;
      const secondary = state.nodes.find((n) => n.id === "secondary");
      if (secondary) {
        secondary.dataVersion = state.writeCounter - lag.lagWrites;
      }

      state.eventLog = [
        "⚠ Primary server failed!",
        ...(lag.lagWrites > 0
          ? [`📉 ~${lag.lagWrites} writes at risk (replication lag)`]
          : []),
      ];
    },

    promoteSecondary(state) {
      const secondary = state.nodes.find((n) => n.id === "secondary");
      if (!secondary) return;
      secondary.status = "promoting";
      state.failoverInProgress = true;
      state.eventLog.push("🔄 Promoting secondary to primary...");
    },

    completeFailover(state) {
      const secondary = state.nodes.find((n) => n.id === "secondary");
      if (!secondary) return;

      secondary.status = "up";
      secondary.servingTraffic = true;
      secondary.acceptsWrites = true;
      secondary.role = "primary";

      state.failoverInProgress = false;
      state.failureActive = false;
      state.outageDurationSec = state.currentRtoSec;

      state.eventLog.push("✅ Failover complete — secondary is now primary");
      if (state.lostWrites > 0) {
        state.eventLog.push(
          `❌ ${state.lostWrites} writes lost (RPO = ${state.currentRpoSec}s)`,
        );
      } else {
        state.eventLog.push("✅ Zero data loss (synchronous replication)");
      }
    },

    recalcMetrics(state) {
      computeMetrics(state);
    },

    setSystemProfile(state, action: PayloadAction<SystemProfileKey>) {
      const profile = SYSTEM_PROFILES[action.payload];
      state.systemProfile = action.payload;
      if (action.payload === "none") return;
      // Apply recommended configuration
      state.strategy = profile.recommendedStrategy;
      state.replicationMode = profile.recommendedReplication;
      state.autoFailover = profile.recommendedAutoFailover;
      state.nodes = createNodes(profile.recommendedStrategy);
      state.failureActive = false;
      state.failoverInProgress = false;
      state.outageDurationSec = 0;
      state.lostWrites = 0;
      state.writeCounter = 100;
      state.eventLog = [];
      computeMetrics(state);
      state.explanation = `${profile.icon} ${profile.label}: ${profile.tagline}`;
    },
  },
});

export const {
  reset,
  softReset,
  patchState,
  setStrategy,
  setReplicationMode,
  toggleAutoFailover,
  failPrimary,
  promoteSecondary,
  completeFailover,
  recalcMetrics,
  setSystemProfile,
} = failoverSlice.actions;

export default failoverSlice.reducer;
