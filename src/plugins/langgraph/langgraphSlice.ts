import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/* ──────────────────────────────────────────────────────────
 *  Simulated LangGraph execution state
 *
 *  `graphData` mirrors the StateGraph annotation —
 *  the single state object that flows through every node.
 *
 *  `visual*` fields drive the SVG scene (which nodes glow, etc.)
 * ────────────────────────────────────────────────────────── */

export interface TaskItem {
  id: string;
  name: string;
  status: "pending" | "running" | "done";
}

/** A snapshot of what a single node returned (its partial state update). */
export interface NodePatch {
  nodeId: string;
  nodeLabel: string;
  patch: Record<string, string>;
  /** ms timestamp so we can order them */
  ts: number;
}

export interface GraphData {
  input: string;
  classification: string | null;
  route: "simple" | "complex" | null;
  analysis: string | null;
  tasks: TaskItem[];
  results: Record<string, string>;
  interrupted: boolean;
  approved: boolean;
}

export interface LanggraphState {
  graphData: GraphData;
  activeNodes: string[];
  completedNodes: string[];
  /** Keys in graphData that changed most recently (for highlight) */
  changedKeys: string[];
  /** Patches returned by parallel task nodes (for channel inspector) */
  nodePatches: NodePatch[];
  /** Interactive toggle: how should results be reduced? */
  channelMode: "merge" | "replace";
  phase:
    | "idle"
    | "classifying"
    | "routing"
    | "branching"
    | "planning"
    | "fanning-out"
    | "executing"
    | "merging"
    | "interrupted"
    | "resuming"
    | "complete";
}

export const initialState: LanggraphState = {
  graphData: {
    input: "Build a blog platform with user auth, posts, and comments",
    classification: null,
    route: null,
    analysis: null,
    tasks: [],
    results: {},
    interrupted: false,
    approved: false,
  },
  activeNodes: [],
  completedNodes: [],
  changedKeys: [],
  nodePatches: [],
  channelMode: "merge",
  phase: "idle",
};

const langgraphSlice = createSlice({
  name: "langgraph",
  initialState,
  reducers: {
    reset: () => initialState,

    setPhase(state, action: PayloadAction<LanggraphState["phase"]>) {
      state.phase = action.payload;
    },

    activateNode(state, action: PayloadAction<string>) {
      if (!state.activeNodes.includes(action.payload)) {
        state.activeNodes.push(action.payload);
      }
    },

    completeNode(state, action: PayloadAction<string>) {
      state.activeNodes = state.activeNodes.filter((n) => n !== action.payload);
      if (!state.completedNodes.includes(action.payload)) {
        state.completedNodes.push(action.payload);
      }
    },

    deactivateNode(state, action: PayloadAction<string>) {
      state.activeNodes = state.activeNodes.filter((n) => n !== action.payload);
    },

    /** Merge partial updates into graphData, track changed keys */
    updateGraphData(state, action: PayloadAction<Partial<GraphData>>) {
      const keys = Object.keys(action.payload) as (keyof GraphData)[];
      state.changedKeys = keys;
      for (const k of keys) {
        (state.graphData as any)[k] = (action.payload as any)[k];
      }
    },

    /** Merge a single task result (simulates merge-reducer behaviour) */
    mergeTaskResult(
      state,
      action: PayloadAction<{ taskId: string; result: string }>,
    ) {
      const { taskId, result } = action.payload;
      state.graphData.results[taskId] = result;
      const task = state.graphData.tasks.find((t) => t.id === taskId);
      if (task) task.status = "done";
      state.changedKeys = ["results"];
    },

    setTaskRunning(state, action: PayloadAction<string>) {
      const task = state.graphData.tasks.find((t) => t.id === action.payload);
      if (task) task.status = "running";
    },

    clearHighlights(state) {
      state.changedKeys = [];
    },

    /** Record what a parallel node returned (for channel inspector). */
    addNodePatch(state, action: PayloadAction<NodePatch>) {
      state.nodePatches.push(action.payload);
    },

    /** Toggle the interactive channel mode (merge vs replace). */
    setChannelMode(state, action: PayloadAction<"merge" | "replace">) {
      state.channelMode = action.payload;
    },
  },
});

export const {
  reset,
  setPhase,
  activateNode,
  completeNode,
  deactivateNode,
  updateGraphData,
  mergeTaskResult,
  setTaskRunning,
  clearHighlights,
  addNodePatch,
  setChannelMode,
} = langgraphSlice.actions;

export default langgraphSlice.reducer;
