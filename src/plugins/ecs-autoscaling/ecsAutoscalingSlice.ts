import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/* ── Swappable infra choices ─────────────────────────── */
export type DatabaseChoice = "postgresql" | "mongodb";
export type CiCdChoice = "codepipeline" | "jenkins";
export type OrchestrationChoice = "ecs" | "eks";

/* ── Runtime entities ────────────────────────────────── */
export interface EcsTask {
  id: string;
  cpuPercent: number;
  status: "running" | "provisioning" | "draining";
}

export interface EcsAutoscalingState {
  /* infra toggles */
  database: DatabaseChoice;
  cicd: CiCdChoice;
  orchestration: OrchestrationChoice;

  /* runtime */
  clientCount: number;
  requestsPerSecond: number;
  tasks: EcsTask[];
  desiredCount: number;
  alarmFiring: boolean;
  scalingCooldown: boolean;
  scalingPath: "pending" | "scale-out" | "no-scaling";
  scaleInPath: "pending" | "scale-in" | "no-scale-in";

  /* metrics */
  avgCpu: number;
  targetCpu: number; // scaling threshold (e.g. 70)
  responseTimeMs: number;

  /* ui */
  hotZones: string[];
  explanation: string;
  phase:
    | "overview"
    | "normal"
    | "load-rising"
    | "alarm"
    | "scaling-out"
    | "provisioning"
    | "balanced"
    | "scale-in"
    | "summary";
}

export const initialState: EcsAutoscalingState = {
  database: "postgresql",
  cicd: "codepipeline",
  orchestration: "ecs",

  clientCount: 3,
  requestsPerSecond: 30,
  tasks: [
    { id: "task-1", cpuPercent: 25, status: "running" },
    { id: "task-2", cpuPercent: 22, status: "running" },
  ],
  desiredCount: 2,
  alarmFiring: false,
  scalingCooldown: false,
  scalingPath: "pending",
  scaleInPath: "pending",

  avgCpu: 24,
  targetCpu: 70,
  responseTimeMs: 45,

  hotZones: [],
  explanation:
    "A containerised service running on AWS. Clients hit an Application Load Balancer which spreads traffic across ECS tasks.",
  phase: "overview",
};

const ecsAutoscalingSlice = createSlice({
  name: "ecsAutoscaling",
  initialState,
  reducers: {
    reset: () => initialState,
    patchState(state, action: PayloadAction<Partial<EcsAutoscalingState>>) {
      Object.assign(state, action.payload);
    },
    setDatabase(state, action: PayloadAction<DatabaseChoice>) {
      state.database = action.payload;
      // MongoDB has slightly higher base latency
      state.responseTimeMs =
        action.payload === "mongodb"
          ? Math.round(state.responseTimeMs * 1.15)
          : Math.round(state.responseTimeMs / 1.15);
    },
    setCiCd(state, action: PayloadAction<CiCdChoice>) {
      state.cicd = action.payload;
    },
    setOrchestration(state, action: PayloadAction<OrchestrationChoice>) {
      state.orchestration = action.payload;
    },
    adjustClients(state, action: PayloadAction<number>) {
      const count = Math.max(
        1,
        Math.min(20, state.clientCount + action.payload),
      );
      state.clientCount = count;
      const rps = count * 10;
      state.requestsPerSecond = rps;
      const runningTasks = state.tasks.filter((t) => t.status === "running");
      const taskCount = Math.max(runningTasks.length, 1);
      const baseCpu = Math.min(95, Math.round((rps / (taskCount * 50)) * 100));
      state.avgCpu = baseCpu;
      runningTasks.forEach((t, i) => {
        t.cpuPercent = Math.min(98, baseCpu + (i % 2 === 0 ? 3 : -3));
      });
      const latencyMultiplier = state.database === "mongodb" ? 1.15 : 1;
      state.responseTimeMs = Math.round(
        (20 + (baseCpu / 100) * 400) * latencyMultiplier,
      );
      state.alarmFiring = baseCpu > state.targetCpu;
    },
  },
});

export const {
  reset,
  patchState,
  setDatabase,
  setCiCd,
  setOrchestration,
  adjustClients,
} = ecsAutoscalingSlice.actions;
export default ecsAutoscalingSlice.reducer;
