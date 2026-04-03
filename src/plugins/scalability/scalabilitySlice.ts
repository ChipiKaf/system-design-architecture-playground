import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/* ── Addable infrastructure components ───────────────── */
export interface InfraComponents {
  database: boolean;
  loadBalancer: boolean;
  cache: boolean;
  extraServers: number; // 0 = just the primary server
}

export type ComponentName = keyof InfraComponents;

/** Which components require which prerequisites. */
const PREREQUISITES: Partial<Record<ComponentName, ComponentName[]>> = {
  cache: ["database"],
  extraServers: ["loadBalancer"],
};

/** Which components cascade-remove when toggled off. */
const CASCADE_REMOVE: Partial<Record<ComponentName, ComponentName[]>> = {
  database: ["cache"],
  loadBalancer: ["extraServers"],
};

/* ── Client model ────────────────────────────────────── */
export interface ClientNode {
  id: string;
  type: "desktop" | "mobile";
}

/* ── State shape ─────────────────────────────────────── */
export interface ScalabilityState {
  components: InfraComponents;
  clients: ClientNode[];

  /* derived metrics (recomputed by computeMetrics) */
  requestsPerSecond: number;
  maxCapacity: number;
  throughput: number;
  droppedRequests: number;
  responseTimeMs: number;
  serverCpuPercent: number;
  serverHealthy: boolean;

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
function getMaxCapacity(c: InfraComponents): number {
  let cap = 60; // solo server
  if (c.database) cap = 100; // separated DB frees CPU
  if (c.loadBalancer) cap += 40; // LB overhead, enables multi-server
  cap += c.extraServers * 50; // each extra server adds 50
  if (c.cache) cap = Math.round(cap * 1.3); // cache boosts 30%
  return cap;
}

export function computeMetrics(state: ScalabilityState) {
  const rps = state.clients.length * 10;
  state.requestsPerSecond = rps;
  state.maxCapacity = getMaxCapacity(state.components);

  const totalServers = 1 + state.components.extraServers;
  const effectiveCpu = Math.min(
    99,
    Math.round((rps / state.maxCapacity) * 100),
  );
  state.serverCpuPercent = effectiveCpu;
  state.throughput = Math.min(rps, state.maxCapacity);
  state.droppedRequests = Math.max(0, rps - state.maxCapacity);

  // Response time: base latency + load curve, DB hop adds 5ms, cache saves 15ms
  let baseLatency = 20;
  if (state.components.database) baseLatency += 5;
  if (state.components.cache) baseLatency -= 15;
  state.responseTimeMs = Math.max(
    5,
    Math.round(baseLatency + (effectiveCpu / 100) * (400 / totalServers)),
  );

  state.serverHealthy = effectiveCpu < 95;
}

/* ── Helpers for explanations ────────────────────────── */
function describeArch(c: InfraComponents): string {
  const parts: string[] = ["HTTP Server"];
  if (c.database) parts.push("Database");
  if (c.loadBalancer) parts.push("Load Balancer");
  if (c.extraServers > 0) parts.push(`${c.extraServers} extra server(s)`);
  if (c.cache) parts.push("Cache");
  return parts.join(" + ");
}

export const initialState: ScalabilityState = {
  components: {
    database: false,
    loadBalancer: false,
    cache: false,
    extraServers: 0,
  },
  clients: defaultClients,

  requestsPerSecond: 30,
  maxCapacity: 60,
  throughput: 30,
  droppedRequests: 0,
  responseTimeMs: 45,
  serverCpuPercent: 50,
  serverHealthy: true,

  hotZones: [],
  explanation:
    "A single HTTP server. It handles everything — requests and data. Add components to evolve the architecture.",
  phase: "overview",
};

// Initialise the metrics from the initial component set
computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const scalabilitySlice = createSlice({
  name: "scalability",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState, clients: [...initialState.clients] };
      computeMetrics(s);
      return s;
    },
    patchState(state, action: PayloadAction<Partial<ScalabilityState>>) {
      Object.assign(state, action.payload);
    },

    /* ── Component toggles ─────────────────────────── */
    addComponent(state, action: PayloadAction<ComponentName>) {
      const name = action.payload;

      // Check prerequisites
      const prereqs = PREREQUISITES[name];
      if (prereqs?.some((p) => !state.components[p])) return;

      if (name === "extraServers") {
        if (state.components.extraServers >= 4) return;
        state.components.extraServers += 1;
      } else {
        if (state.components[name]) return; // already added
        (state.components[name] as boolean) = true;
      }

      computeMetrics(state);
      state.explanation = `Added! Architecture is now: ${describeArch(state.components)}. Max capacity: ~${state.maxCapacity} rps.`;
    },

    removeComponent(state, action: PayloadAction<ComponentName>) {
      const name = action.payload;

      if (name === "extraServers") {
        if (state.components.extraServers <= 0) return;
        state.components.extraServers -= 1;
      } else {
        if (!state.components[name]) return;
        (state.components[name] as boolean) = false;
      }

      // Cascade removals
      const cascades = CASCADE_REMOVE[name];
      if (cascades) {
        for (const dep of cascades) {
          if (dep === "extraServers") {
            state.components.extraServers = 0;
          } else {
            (state.components[dep] as boolean) = false;
          }
        }
      }

      computeMetrics(state);
      state.explanation = `Removed. Architecture is now: ${describeArch(state.components)}. Max capacity: ~${state.maxCapacity} rps.`;
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
  addComponent,
  removeComponent,
  addClient,
  removeClient,
  recalcMetrics,
} = scalabilitySlice.actions;
export default scalabilitySlice.reducer;
