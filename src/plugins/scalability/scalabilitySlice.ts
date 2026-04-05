import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/* ══════════════════════════════════════════════════════════
   Server Instance Profiles — AWS-style sizing
   ══════════════════════════════════════════════════════════ */

export type ServerSize =
  | "t3.small"
  | "t3.medium"
  | "t3.large"
  | "m6i.large"
  | "m6i.xlarge"
  | "m6i.2xlarge";

export interface ServerProfile {
  instanceType: ServerSize;
  vcpu: number;
  ramGiB: number;
  baselineRps: number;
  hourlyUsd: number;
}

export const SERVER_PROFILES: Record<ServerSize, ServerProfile> = {
  "t3.small": {
    instanceType: "t3.small",
    vcpu: 2,
    ramGiB: 2,
    baselineRps: 40,
    hourlyUsd: 0.0208,
  },
  "t3.medium": {
    instanceType: "t3.medium",
    vcpu: 2,
    ramGiB: 4,
    baselineRps: 60,
    hourlyUsd: 0.0416,
  },
  "t3.large": {
    instanceType: "t3.large",
    vcpu: 2,
    ramGiB: 8,
    baselineRps: 90,
    hourlyUsd: 0.0832,
  },
  "m6i.large": {
    instanceType: "m6i.large",
    vcpu: 2,
    ramGiB: 8,
    baselineRps: 120,
    hourlyUsd: 0.096,
  },
  "m6i.xlarge": {
    instanceType: "m6i.xlarge",
    vcpu: 4,
    ramGiB: 16,
    baselineRps: 200,
    hourlyUsd: 0.192,
  },
  "m6i.2xlarge": {
    instanceType: "m6i.2xlarge",
    vcpu: 8,
    ramGiB: 32,
    baselineRps: 350,
    hourlyUsd: 0.384,
  },
};

export const INSTANCE_ORDER: ServerSize[] = [
  "t3.small",
  "t3.medium",
  "t3.large",
  "m6i.large",
  "m6i.xlarge",
  "m6i.2xlarge",
];

/* ── Server node ─────────────────────────────────────── */
export interface ServerNode {
  id: string;
  profile: ServerProfile;
  cpuPercent: number;
  healthy: boolean;
}

function createServer(id: string, size: ServerSize = "t3.medium"): ServerNode {
  return {
    id,
    profile: { ...SERVER_PROFILES[size] },
    cpuPercent: 0,
    healthy: true,
  };
}

/* ── Addable infrastructure components ───────────────── */
export interface InfraComponents {
  database: boolean;
  loadBalancer: boolean;
  cache: boolean;
}

export type ComponentName = keyof InfraComponents | "server";

/** Which components require which prerequisites. */
const PREREQUISITES: Partial<Record<ComponentName, ComponentName[]>> = {
  cache: ["database"],
  server: ["loadBalancer"],
};

/** Which components cascade-remove when toggled off. */
const CASCADE_REMOVE: Partial<Record<ComponentName, ComponentName[]>> = {
  database: ["cache"],
  loadBalancer: ["server"],
};

/* ── Client model ────────────────────────────────────── */
export interface ClientNode {
  id: string;
  type: "desktop" | "mobile";
}

/* ══════════════════════════════════════════════════════════
   Pricing Model — AWS-style On-Demand (us-east-1)
   ══════════════════════════════════════════════════════════ */

export interface CostBreakdown {
  ec2Hourly: number;
  albHourly: number;
  dbHourly: number;
  cacheHourly: number;
  totalHourly: number;
  totalMonthly: number;
  costPer100Rps: number;
}

const ALB_BASE_HOURLY = 0.0225;
const ALB_LCU_FACTOR = 0.00008;
const DB_HOURLY = 0.018; // db.t3.micro
const CACHE_HOURLY = 0.017; // cache.t4g.micro
const HOURS_PER_MONTH = 730;

function computeCost(
  servers: ServerNode[],
  components: InfraComponents,
  rps: number,
): CostBreakdown {
  const ec2Hourly = servers.reduce((sum, s) => sum + s.profile.hourlyUsd, 0);
  const albHourly = components.loadBalancer
    ? ALB_BASE_HOURLY + rps * ALB_LCU_FACTOR
    : 0;
  const dbHourly = components.database ? DB_HOURLY : 0;
  const cacheHourly = components.cache ? CACHE_HOURLY : 0;
  const totalHourly = ec2Hourly + albHourly + dbHourly + cacheHourly;
  const totalMonthly = totalHourly * HOURS_PER_MONTH;
  const costPer100Rps = rps > 0 ? (totalHourly / rps) * 100 : 0;
  return {
    ec2Hourly,
    albHourly,
    dbHourly,
    cacheHourly,
    totalHourly,
    totalMonthly,
    costPer100Rps,
  };
}

/* ── State shape ─────────────────────────────────────── */
export interface ScalabilityState {
  servers: ServerNode[];
  components: InfraComponents;
  clients: ClientNode[];

  /* derived metrics (recomputed by computeMetrics) */
  requestsPerSecond: number;
  maxCapacity: number;
  throughput: number;
  droppedRequests: number;
  responseTimeMs: number;
  serverCpuPercent: number; // average across servers
  serverHealthy: boolean;
  cost: CostBreakdown;

  /* ui */
  hotZones: string[];
  explanation: string;
  phase: string;
}

const defaultClients: ClientNode[] = [
  { id: "client-1", type: "desktop" },
  { id: "client-2", type: "mobile" },
  { id: "client-3", type: "desktop" },
];

/* ── Capacity model ──────────────────────────────────── */
function getMaxCapacity(
  servers: ServerNode[],
  components: InfraComponents,
): number {
  // App-tier capacity = sum of each server's baseline rps
  const appCapacity = servers.reduce(
    (sum, s) => sum + s.profile.baselineRps,
    0,
  );

  // Cache multiplier
  const cacheBoost = components.cache ? 1.25 : 1;

  // Data-tier capacity:
  //  - No DB: each server handles data in-process. ~55% of total compute
  //    goes to data ops (disk, serialization), leaving the rest for requests.
  //    Scaling up ANY server helps because more compute = more headroom.
  //  - With DB: separate tier. DB has its own capacity: base 300 + 50/server.
  //  - With DB + cache: cache offloads reads, so cacheBoost lifts app side.
  const dbCap = components.database
    ? 300 + servers.length * 50
    : Math.round(appCapacity * 0.55);

  return Math.round(Math.min(appCapacity * cacheBoost, dbCap));
}

export function computeMetrics(state: ScalabilityState) {
  const rps = state.clients.length * 10;
  state.requestsPerSecond = rps;
  state.maxCapacity = getMaxCapacity(state.servers, state.components);

  const totalServers = state.servers.length;
  state.throughput = Math.min(rps, state.maxCapacity);
  state.droppedRequests = Math.max(0, rps - state.maxCapacity);

  // Per-server CPU: load distributed across servers
  const rpsPerServer = totalServers > 0 ? rps / totalServers : rps;
  for (const server of state.servers) {
    const cap = server.profile.baselineRps;
    server.cpuPercent = Math.min(99, Math.round((rpsPerServer / cap) * 100));
    server.healthy = server.cpuPercent < 95;
  }

  // Average CPU for backwards compat
  const avgCpu =
    totalServers > 0
      ? Math.round(
          state.servers.reduce((s, sv) => s + sv.cpuPercent, 0) / totalServers,
        )
      : 0;
  state.serverCpuPercent = avgCpu;
  state.serverHealthy = state.servers.every((s) => s.healthy);

  // Response time: base latency + load curve
  let baseLatency = 20;
  if (state.components.database) baseLatency += 5;
  if (state.components.cache) baseLatency -= 15;
  state.responseTimeMs = Math.max(
    5,
    Math.round(baseLatency + (avgCpu / 100) * (400 / totalServers)),
  );

  // Cost
  state.cost = computeCost(state.servers, state.components, rps);
}

/* ── Helpers for explanations ────────────────────────── */
function describeArch(
  servers: ServerNode[],
  components: InfraComponents,
): string {
  const parts: string[] = [];
  if (servers.length === 1) {
    parts.push(`Server (${servers[0].profile.instanceType})`);
  } else {
    parts.push(
      `${servers.length} servers (${servers.map((s) => s.profile.instanceType).join(", ")})`,
    );
  }
  if (components.database) parts.push("Database");
  if (components.loadBalancer) parts.push("Load Balancer");
  if (components.cache) parts.push("Cache");
  return parts.join(" + ");
}

export const initialState: ScalabilityState = {
  servers: [createServer("server-0", "t3.medium")],
  components: {
    database: false,
    loadBalancer: false,
    cache: false,
  },
  clients: defaultClients,

  requestsPerSecond: 30,
  maxCapacity: 60,
  throughput: 30,
  droppedRequests: 0,
  responseTimeMs: 45,
  serverCpuPercent: 50,
  serverHealthy: true,
  cost: {
    ec2Hourly: 0,
    albHourly: 0,
    dbHourly: 0,
    cacheHourly: 0,
    totalHourly: 0,
    totalMonthly: 0,
    costPer100Rps: 0,
  },

  hotZones: [],
  explanation:
    "A single HTTP server (t3.medium). It handles everything — requests and data. Scale it up, add servers, or add infrastructure to evolve the architecture.",
  phase: "overview",
};

// Initialise the metrics from the initial state
computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const scalabilitySlice = createSlice({
  name: "scalability",
  initialState,
  reducers: {
    reset: () => {
      const s: ScalabilityState = {
        ...initialState,
        servers: [createServer("server-0", "t3.medium")],
        clients: [...initialState.clients],
        cost: { ...initialState.cost },
      };
      computeMetrics(s);
      return s;
    },
    patchState(state, action: PayloadAction<Partial<ScalabilityState>>) {
      Object.assign(state, action.payload);
    },

    /* ── Vertical scaling ──────────────────────────── */
    scaleServerUp(state, action: PayloadAction<string>) {
      const server = state.servers.find((s) => s.id === action.payload);
      if (!server) return;
      const idx = INSTANCE_ORDER.indexOf(server.profile.instanceType);
      if (idx >= INSTANCE_ORDER.length - 1) return;
      const nextSize = INSTANCE_ORDER[idx + 1];
      server.profile = { ...SERVER_PROFILES[nextSize] };
      computeMetrics(state);
      state.explanation = `Scaled up ${server.id} to ${nextSize}. Capacity: ~${server.profile.baselineRps} rps. Architecture: ${describeArch(state.servers, state.components)}.`;
    },

    scaleServerDown(state, action: PayloadAction<string>) {
      const server = state.servers.find((s) => s.id === action.payload);
      if (!server) return;
      const idx = INSTANCE_ORDER.indexOf(server.profile.instanceType);
      if (idx <= 0) return;
      const prevSize = INSTANCE_ORDER[idx - 1];
      server.profile = { ...SERVER_PROFILES[prevSize] };
      computeMetrics(state);
      state.explanation = `Scaled down ${server.id} to ${prevSize}. Capacity: ~${server.profile.baselineRps} rps. Architecture: ${describeArch(state.servers, state.components)}.`;
    },

    /* ── Horizontal scaling ────────────────────────── */
    addServer(state) {
      if (!state.components.loadBalancer) return;
      if (state.servers.length >= 5) return;
      const id = `server-${state.servers.length}`;
      state.servers.push(createServer(id, "t3.medium"));
      computeMetrics(state);
      state.explanation = `Added ${id}. Total: ${state.servers.length} servers. Max capacity: ~${state.maxCapacity} rps.`;
    },

    removeServer(state) {
      if (state.servers.length <= 1) return;
      state.servers.pop();
      computeMetrics(state);
      state.explanation = `Removed a server. Total: ${state.servers.length} server(s). Max capacity: ~${state.maxCapacity} rps.`;
    },

    /* ── Component toggles ─────────────────────────── */
    addComponent(state, action: PayloadAction<ComponentName>) {
      const name = action.payload;
      if (name === "server") return; // use addServer instead

      // Check prerequisites
      const prereqs = PREREQUISITES[name];
      if (
        prereqs?.some((p) => {
          if (p === "server") return state.servers.length <= 1;
          return !state.components[p];
        })
      )
        return;

      if (state.components[name]) return; // already added
      (state.components[name] as boolean) = true;

      computeMetrics(state);
      state.explanation = `Added! Architecture is now: ${describeArch(state.servers, state.components)}. Max capacity: ~${state.maxCapacity} rps.`;
    },

    removeComponent(state, action: PayloadAction<ComponentName>) {
      const name = action.payload;
      if (name === "server") return; // use removeServer instead

      if (!state.components[name]) return;
      (state.components[name] as boolean) = false;

      // Cascade removals
      const cascades = CASCADE_REMOVE[name];
      if (cascades) {
        for (const dep of cascades) {
          if (dep === "server") {
            // Remove all extra servers, keep server-0
            while (state.servers.length > 1) state.servers.pop();
          } else {
            (state.components[dep] as boolean) = false;
          }
        }
      }

      computeMetrics(state);
      state.explanation = `Removed. Architecture is now: ${describeArch(state.servers, state.components)}. Max capacity: ~${state.maxCapacity} rps.`;
    },

    /* ── Client controls ───────────────────────────── */
    addClient(state) {
      if (state.clients.length >= 12) return;
      const id = `client-${Date.now()}`;
      const type = state.clients.length % 2 === 0 ? "desktop" : "mobile";
      state.clients.push({ id, type });
      computeMetrics(state);
    },
    removeClient(state) {
      if (state.clients.length <= 1) return;
      state.clients.pop();
      computeMetrics(state);
    },

    recalcMetrics(state) {
      computeMetrics(state);
    },
  },
});

export const {
  reset,
  patchState,
  scaleServerUp,
  scaleServerDown,
  addServer,
  removeServer,
  addComponent,
  removeComponent,
  addClient,
  removeClient,
  recalcMetrics,
} = scalabilitySlice.actions;
export default scalabilitySlice.reducer;
