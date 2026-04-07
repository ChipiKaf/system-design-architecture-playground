import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/* ── Topic tree structure ────────────────────────────── */

export const BUILDINGS = ["B1", "B2"] as const;
export const FLOORS = ["F1", "F2"] as const;
export const ROOMS = ["R1", "R2"] as const;

export type Building = (typeof BUILDINGS)[number];
export type Floor = (typeof FLOORS)[number];
export type Room = (typeof ROOMS)[number];

/** All concrete topic paths in the tree. */
export const ALL_TOPICS: string[] = BUILDINGS.flatMap((b) =>
  FLOORS.flatMap((f) => ROOMS.map((r) => `${b}/${f}/${r}`)),
);

/* ── Wildcard helpers ────────────────────────────────── */

/**
 * Match a concrete topic against a subscription pattern.
 * Supports MQTT wildcards: `+` (single-level) and `#` (multi-level).
 */
export function topicMatches(pattern: string, topic: string): boolean {
  const patParts = pattern.split("/");
  const topParts = topic.split("/");

  for (let i = 0; i < patParts.length; i++) {
    if (patParts[i] === "#") return true;
    if (i >= topParts.length) return false;
    if (patParts[i] !== "+" && patParts[i] !== topParts[i]) return false;
  }
  return patParts.length === topParts.length;
}

/* ── Subscriber model ────────────────────────────────── */

export interface Subscriber {
  id: string;
  label: string;
  pattern: string;
  color: string;
}

const DEFAULT_SUBSCRIBERS: Subscriber[] = [
  { id: "sub-1", label: "Sub 1", pattern: "B1/F1/R1", color: "#22c55e" },
  { id: "sub-2", label: "Sub 2", pattern: "B1/+/R1", color: "#3b82f6" },
  { id: "sub-3", label: "Sub 3", pattern: "#", color: "#f59e0b" },
];

/* ── QoS model ───────────────────────────────────────── */

export type QoSLevel = 0 | 1 | 2;

/* ── State shape ─────────────────────────────────────── */

export interface MqttState {
  publishTopic: string;
  subscribers: Subscriber[];
  qos: QoSLevel;
  retained: boolean;
  matchedSubscriberIds: string[];
  messagesSent: number;
  messagesDelivered: number;
  hotZones: string[];
  explanation: string;
  phase: string;
}

/* ── Compute which subscribers match ─────────────────── */

function computeMatches(state: MqttState) {
  state.matchedSubscriberIds = state.subscribers
    .filter((s) => topicMatches(s.pattern, state.publishTopic))
    .map((s) => s.id);
}

export const initialState: MqttState = {
  publishTopic: "B1/F1/R1",
  subscribers: DEFAULT_SUBSCRIBERS,
  qos: 0,
  retained: false,
  matchedSubscriberIds: [],
  messagesSent: 0,
  messagesDelivered: 0,
  hotZones: [],
  explanation:
    "Welcome to MQTT! Choose a topic to publish and see how the broker routes messages to matching subscribers.",
  phase: "overview",
};
computeMatches(initialState);

/* ── Slice ───────────────────────────────────────────── */

const mqttSlice = createSlice({
  name: "mqtt",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState, subscribers: [...DEFAULT_SUBSCRIBERS] };
      computeMatches(s);
      return s;
    },
    patchState(state, action: PayloadAction<Partial<MqttState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMatches(state);
    },
    setPublishTopic(state, action: PayloadAction<string>) {
      state.publishTopic = action.payload;
      computeMatches(state);
    },
    setQoS(state, action: PayloadAction<QoSLevel>) {
      state.qos = action.payload;
    },
    toggleRetained(state) {
      state.retained = !state.retained;
    },
    setSubscriberPattern(
      state,
      action: PayloadAction<{ id: string; pattern: string }>,
    ) {
      const sub = state.subscribers.find((s) => s.id === action.payload.id);
      if (sub) {
        sub.pattern = action.payload.pattern;
        computeMatches(state);
      }
    },
    addSubscriber(state) {
      if (state.subscribers.length >= 6) return;
      const colors = [
        "#ec4899",
        "#8b5cf6",
        "#14b8a6",
        "#ef4444",
        "#6366f1",
        "#84cc16",
      ];
      const color = colors[state.subscribers.length % colors.length];
      const id = `sub-${state.subscribers.length + 1}`;
      state.subscribers.push({
        id,
        label: `Sub ${state.subscribers.length + 1}`,
        pattern: ALL_TOPICS[state.subscribers.length % ALL_TOPICS.length],
        color,
      });
      computeMatches(state);
    },
    removeSubscriber(state) {
      if (state.subscribers.length <= 1) return;
      state.subscribers.pop();
      computeMatches(state);
    },
    incrementMessages(state) {
      state.messagesSent += 1;
      state.messagesDelivered += state.matchedSubscriberIds.length;
    },
  },
});

export const {
  reset,
  patchState,
  recalcMetrics,
  setPublishTopic,
  setQoS,
  toggleRetained,
  setSubscriberPattern,
  addSubscriber,
  removeSubscriber,
  incrementMessages,
} = mqttSlice.actions;
export default mqttSlice.reducer;
