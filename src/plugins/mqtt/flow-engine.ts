import type { MqttState } from "./mqttSlice";

/* ══════════════════════════════════════════════════════════
   MQTT Declarative Flow Engine

   Steps and flows defined as data. The executor walks beats,
   expands tokens, and animates signals between nodes.
   ══════════════════════════════════════════════════════════ */

/* ── Token expansion ─────────────────────────────────── */

export function expandToken(token: string, state: MqttState): string[] {
  if (token === "$publisher") return ["publisher"];
  if (token === "$broker") return ["broker"];
  if (token === "$matchedSubs") return state.matchedSubscriberIds;
  if (token === "$allSubs") return state.subscribers.map((s) => s.id);
  return [token];
}

/* ── Flow Beat ───────────────────────────────────────── */

export interface FlowBeat {
  from: string;
  to: string;
  when?: (s: MqttState) => boolean;
  duration?: number;
  explain?: string;
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  | "overview"
  | "connect"
  | "subscribe"
  | "publish-to-broker"
  | "broker-match"
  | "broker-deliver"
  | "qos-ack"
  | "summary";

/* ── Step Definition ─────────────────────────────────── */

export interface StepDef {
  key: StepKey;
  label: string;
  when?: (s: MqttState) => boolean;
  nextButton?: string | ((s: MqttState) => string);
  nextButtonColor?: string;
  processingText?: string;
  phase?: string | ((s: MqttState) => string);
  flow?: FlowBeat[];
  delay?: number;
  recalcMetrics?: boolean;
  finalHotZones?: string[];
  explain?: string | ((s: MqttState) => string);
  action?: "reset";
}

/* ── STEPS — single source of truth ──────────────────── */

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Overview",
    nextButton: "Connect Clients",
    action: "reset",
    explain:
      "MQTT uses a publish/subscribe model. A broker sits between publishers and subscribers, routing messages by topic. Configure a topic and subscriptions, then step through to see how it works.",
  },

  {
    key: "connect",
    label: "Connect to Broker",
    processingText: "Connecting...",
    phase: "connect",
    flow: [
      {
        from: "$publisher",
        to: "$broker",
        duration: 600,
        explain:
          "Publisher opens a TCP connection to the broker (CONNECT packet).",
      },
      {
        from: "$allSubs",
        to: "$broker",
        duration: 600,
        explain:
          "Subscribers connect to the broker. The broker sends CONNACK to each.",
      },
    ],
    finalHotZones: ["broker"],
    explain:
      "All clients are now connected. The broker maintains a persistent session for each client.",
  },

  {
    key: "subscribe",
    label: "Subscribe to Topics",
    processingText: "Subscribing...",
    phase: "subscribe",
    flow: [
      {
        from: "$allSubs",
        to: "$broker",
        duration: 700,
        explain:
          "Each subscriber sends a SUBSCRIBE packet with its topic filter. The broker registers the subscription.",
      },
    ],
    finalHotZones: ["broker"],
    explain: (s) => {
      const patterns = s.subscribers
        .map((sub) => `${sub.label}: "${sub.pattern}"`)
        .join(", ");
      return `Subscriptions registered: ${patterns}. The broker will now match incoming publishes against these filters.`;
    },
  },

  {
    key: "publish-to-broker",
    label: "Publish Message",
    processingText: "Publishing...",
    phase: "publish",
    flow: [
      {
        from: "$publisher",
        to: "$broker",
        duration: 600,
        explain: (s) =>
          `Publisher sends a PUBLISH packet on topic "${s.publishTopic}" (QoS ${s.qos}).`,
      } as FlowBeat & { explain: string | ((s: MqttState) => string) },
    ],
    recalcMetrics: true,
    finalHotZones: ["broker"],
    explain: (s) =>
      `Broker received the message on topic "${s.publishTopic}". Now it checks its subscription table for matching filters.`,
  },

  {
    key: "broker-match",
    label: "Topic Matching",
    phase: "matching",
    delay: 800,
    recalcMetrics: true,
    finalHotZones: ["broker"],
    explain: (s) => {
      const matched = s.subscribers.filter((sub) =>
        s.matchedSubscriberIds.includes(sub.id),
      );
      const unmatched = s.subscribers.filter(
        (sub) => !s.matchedSubscriberIds.includes(sub.id),
      );
      let msg = `Topic "${s.publishTopic}" — `;
      if (matched.length > 0) {
        msg += `matches: ${matched.map((m) => `${m.label} ("${m.pattern}")`).join(", ")}. `;
      } else {
        msg += "no subscribers match! Message is discarded. ";
      }
      if (unmatched.length > 0) {
        msg += `No match: ${unmatched.map((m) => `${m.label} ("${m.pattern}")`).join(", ")}.`;
      }
      return msg;
    },
  },

  {
    key: "broker-deliver",
    label: "Deliver to Subscribers",
    when: (s) => s.matchedSubscriberIds.length > 0,
    processingText: "Delivering...",
    phase: "deliver",
    flow: [
      {
        from: "$broker",
        to: "$matchedSubs",
        duration: 700,
        explain: "Broker forwards the message to all matching subscribers.",
      },
    ],
    finalHotZones: [],
    explain: (s) => {
      const n = s.matchedSubscriberIds.length;
      return `Message delivered to ${n} subscriber${n !== 1 ? "s" : ""}. Each receives the payload along with the topic name.`;
    },
  },

  {
    key: "qos-ack",
    label: "QoS Acknowledgement",
    when: (s) => s.qos > 0,
    processingText: "Acknowledging...",
    phase: "qos-ack",
    flow: [
      {
        from: "$matchedSubs",
        to: "$broker",
        duration: 500,
        when: (s) => s.qos >= 1 && s.matchedSubscriberIds.length > 0,
        explain: (s) =>
          s.qos === 1
            ? "QoS 1: Subscribers send PUBACK to broker — at-least-once delivery guaranteed."
            : "QoS 2 (step 1): Subscribers send PUBREC to broker.",
      } as FlowBeat & { explain: string | ((s: MqttState) => string) },
      {
        from: "$broker",
        to: "$publisher",
        duration: 500,
        when: (s) => s.qos >= 1,
        explain: (s) =>
          s.qos === 1
            ? "Broker sends PUBACK to publisher — message confirmed."
            : "QoS 2 (step 2): Broker sends PUBREL to publisher, then PUBCOMP completes the handshake. Exactly-once delivery.",
      } as FlowBeat & { explain: string | ((s: MqttState) => string) },
    ],
    finalHotZones: ["publisher"],
    explain: (s) =>
      s.qos === 1
        ? "QoS 1 complete: at-least-once delivery. The message may be delivered more than once if an ACK is lost."
        : "QoS 2 complete: exactly-once delivery via the 4-step handshake (PUBLISH → PUBREC → PUBREL → PUBCOMP).",
  },

  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    explain: (s) => {
      const n = s.matchedSubscriberIds.length;
      return `Published to "${s.publishTopic}" (QoS ${s.qos}${s.retained ? ", retained" : ""}). ${n} subscriber${n !== 1 ? "s" : ""} received the message. Try changing the topic, wildcard patterns, or QoS level and replay!`;
    },
  },
];

/* ── Tagged step for Shell ───────────────────────────── */

export interface TaggedStep {
  key: StepKey;
  label: string;
  autoAdvance?: boolean;
  nextButtonText?: string;
  nextButtonColor?: string;
  processingText?: string;
}

export function buildSteps(state: MqttState): TaggedStep[] {
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
  patch: (p: Partial<MqttState>) => void;
  getState: () => MqttState;
  cancelled: () => boolean;
}

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  for (const beat of beats) {
    if (deps.cancelled()) return;

    const state = deps.getState();
    if (beat.when && !beat.when(state)) continue;

    const froms = expandToken(beat.from, state);
    const tos = expandToken(beat.to, state);

    const pairs: { from: string; to: string }[] = [];
    for (const f of froms) {
      for (const t of tos) {
        if (f !== t) pairs.push({ from: f, to: t });
      }
    }
    if (pairs.length === 0) continue;

    const hotZones = [...new Set([...froms, ...tos])];
    const update: Partial<MqttState> = { hotZones };
    if (beat.explain) {
      update.explanation =
        typeof beat.explain === "function"
          ? (beat.explain as (s: MqttState) => string)(state)
          : beat.explain;
    }
    deps.patch(update);

    await deps.animateParallel(pairs, beat.duration ?? 600);
  }
}
