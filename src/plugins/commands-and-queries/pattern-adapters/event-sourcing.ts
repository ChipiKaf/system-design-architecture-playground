import type { CommandsQueriesState } from "../commandsQueriesSlice";
import type { PatternAdapter } from "./types";
import type { StepKey } from "../flow-engine";

/*
  CQRS + Event Sourcing layout
  ─────────────────────────────
  The write side uses an append-only Event Store instead of a mutable DB.
  Events flow: Client → UI → Command → Event Store → Event Bus → Consumer → Read DB
  An extra "Replay" capability lets the system rebuild read models from scratch.
*/

const POS = {
  "client-app": { x: 80, y: 340 },
  "api-gateway": { x: 230, y: 340 },
  "command-api": { x: 420, y: 170 },
  "write-model": { x: 640, y: 170 },
  "message-broker": { x: 870, y: 308 },
  projector: { x: 870, y: 480 },
  "query-api": { x: 420, y: 480 },
  "read-model": { x: 640, y: 480 },
  replay: { x: 1060, y: 480 },
} as const;

type NodeId = keyof typeof POS;

const ALL_HOT_ZONES: string[] = [
  "client-app",
  "api-gateway",
  "command-api",
  "write-model",
  "message-broker",
  "projector",
  "query-api",
  "read-model",
  "replay",
];

const COMMAND_PHASES = ["command-ingress", "command-route", "command-write"];

const SYNC_PHASES = [
  "event-publish",
  "projection-consume",
  "projection-refresh",
];

const QUERY_PHASES = [
  "query-ingress",
  "query-route",
  "query-read",
  "query-response",
];

function formatLag(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function overviewExplanation(state: CommandsQueriesState): string {
  return `CQRS with Event Sourcing replaces the traditional write database with an append-only Event Store that records every state change as an immutable event. The Event Store becomes the ultimate source of truth. Events are published to an Event Bus, and consumers asynchronously update Read Databases (materialized views) for fast queries. Current sync lag is ${formatLag(state.projectionLagMs)}. Because the Event Store retains the full history, any read model can be rebuilt by replaying events from the beginning.`;
}

function stepHotZones(step: StepKey): string[] {
  switch (step) {
    case "client-command":
    case "client-query":
      return ["client-app", "api-gateway"];
    case "route-command":
      return ["api-gateway", "command-api"];
    case "commit-write":
      return ["command-api", "write-model"];
    case "publish-event":
      return ["write-model", "message-broker"];
    case "project-consume":
      return ["message-broker", "projector"];
    case "refresh-view":
      return ["projector", "read-model"];
    case "route-query":
      return ["api-gateway", "query-api"];
    case "query-read":
      return ["query-api", "read-model"];
    case "return-response":
      return ["client-app", "api-gateway", "query-api", "read-model"];
    case "summary":
    case "overview":
    default:
      return ALL_HOT_ZONES;
  }
}

function calloutFor(state: CommandsQueriesState): {
  title: string;
  lines: string[];
  accent: string;
} {
  if (COMMAND_PHASES.includes(state.phase)) {
    return {
      title: "Command side (Event Sourcing)",
      lines: [
        "Events are appended to the Event Store, never mutated.",
        "Each event is an immutable fact of what happened.",
      ],
      accent: "#f472b6",
    };
  }

  if (SYNC_PHASES.includes(state.phase)) {
    return {
      title: "Event-driven sync",
      lines: state.staleRisk
        ? [
            "Events flow from store to bus to consumers.",
            `Read models lag by ${formatLag(state.projectionLagMs)}.`,
          ]
        : [
            "Events propagate to consumers asynchronously.",
            `Sync lag: ${formatLag(state.projectionLagMs)}, caught up.`,
          ],
      accent: "#f59e0b",
    };
  }

  if (QUERY_PHASES.includes(state.phase)) {
    return {
      title: "Query side (Materialized View)",
      lines: state.staleRisk
        ? [
            "Reads hit the materialized view, but data is behind.",
            "Eventual consistency — the norm with Event Sourcing.",
          ]
        : [
            "Reads hit a denormalized view built from events.",
            "No joins or live fan-out at query time.",
          ],
      accent: "#22c55e",
    };
  }

  return {
    title: "CQRS + Event Sourcing",
    lines: [
      "Event Store is the source of truth (append-only log).",
      "Read models are derived from replaying events.",
    ],
    accent: "#f472b6",
  };
}

function edgeColor(active: boolean, color: string): string {
  return active ? color : "rgba(71, 85, 105, 0.28)";
}

function drawBox(
  builder: ReturnType<typeof import("vizcraft").viz>,
  id: NodeId,
  label: string,
  active: boolean,
  fill: string,
  activeFill: string,
  stroke: string,
  width = 156,
  height = 58,
  radius = 16,
  onClick?: () => void,
) {
  const position = POS[id];
  const node = builder.node(id);

  node
    .at(position.x, position.y)
    .rect(width, height, radius)
    .fill(active ? activeFill : fill)
    .stroke(active ? stroke : "#334155", 2)
    .label(label, {
      fill: "#e2e8f0",
      fontSize: 12,
      fontWeight: "bold",
    });

  if (onClick) {
    node.onClick(onClick);
  }
}

function addFrame(
  builder: ReturnType<typeof import("vizcraft").viz>,
  key: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: string,
  active: boolean,
) {
  builder.overlay((overlay) => {
    overlay.add(
      "rect",
      {
        x,
        y,
        w,
        h,
        rx: 20,
        ry: 20,
        fill: active ? "rgba(15, 23, 42, 0.52)" : "rgba(2, 6, 23, 0.18)",
        stroke: active ? color : "rgba(71, 85, 105, 0.18)",
        strokeWidth: 1.4,
        opacity: 1,
      },
      { key: `${key}-frame` },
    );
    overlay.add(
      "text",
      {
        x: x + 18,
        y: y - 10,
        text: label,
        fill: active ? color : "#64748b",
        fontSize: 10,
        fontWeight: "bold",
      },
      { key: `${key}-label` },
    );
  });
}

function addBadge(
  builder: ReturnType<typeof import("vizcraft").viz>,
  key: string,
  x: number,
  y: number,
  text: string,
  fill: string,
  color: string,
) {
  const width = Math.max(104, text.length * 6.4 + 18);

  builder.overlay((overlay) => {
    overlay.add(
      "rect",
      {
        x,
        y,
        w: width,
        h: 22,
        rx: 11,
        ry: 11,
        fill,
        stroke: color,
        strokeWidth: 1,
        opacity: 0.98,
      },
      { key: `${key}-bg` },
    );
    overlay.add(
      "text",
      {
        x: x + 10,
        y: y + 15,
        text,
        fill: color,
        fontSize: 9,
        fontWeight: "bold",
      },
      { key: `${key}-text` },
    );
  });
}

function addCallout(
  builder: ReturnType<typeof import("vizcraft").viz>,
  state: CommandsQueriesState,
) {
  const callout = calloutFor(state);

  builder.overlay((overlay) => {
    overlay.add(
      "rect",
      {
        x: 32,
        y: 78,
        w: 296,
        h: 92,
        rx: 18,
        ry: 18,
        fill: "rgba(7, 17, 34, 0.92)",
        stroke: callout.accent,
        strokeWidth: 1.2,
        opacity: 0.98,
      },
      { key: "es-callout-bg" },
    );
    overlay.add(
      "text",
      {
        x: 50,
        y: 106,
        text: callout.title,
        fill: callout.accent,
        fontSize: 12,
        fontWeight: 700,
      },
      { key: "es-callout-title" },
    );

    callout.lines.forEach((line, index) => {
      overlay.add(
        "text",
        {
          x: 50,
          y: 130 + index * 18,
          text: line,
          fill: "#dbeafe",
          fontSize: 9,
          fontWeight: 600,
        },
        { key: `es-callout-line-${index}` },
      );
    });
  });
}

function addNodeNotes(
  builder: ReturnType<typeof import("vizcraft").viz>,
  state: CommandsQueriesState,
) {
  builder.overlay((overlay) => {
    /* Command handler note */
    overlay.add(
      "text",
      {
        x: POS["command-api"].x,
        y: POS["command-api"].y + 44,
        text: "validates → generates events",
        fill: "#f9a8d4",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "command-api-note" },
    );

    /* Event Store note */
    overlay.add(
      "text",
      {
        x: POS["write-model"].x,
        y: POS["write-model"].y + 50,
        text: "source of truth (append-only)",
        fill: "#f9a8d4",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "write-model-note" },
    );

    /* Event log sample inside the event store box area */
    const eventLines = ["SCCreated → ItemAdded", "ItemAdded → ItemDeleted"];
    eventLines.forEach((line, idx) => {
      overlay.add(
        "text",
        {
          x: POS["write-model"].x,
          y: POS["write-model"].y - 32 + idx * 14,
          text: line,
          fill: "#fda4af",
          fontSize: 7,
          fontWeight: 600,
          textAnchor: "middle",
        },
        { key: `event-log-line-${idx}` },
      );
    });

    /* Event Bus note */
    overlay.add(
      "text",
      {
        x: POS["message-broker"].x,
        y: POS["message-broker"].y + 46,
        text: "publishes domain events",
        fill: "#fdba74",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "broker-note" },
    );

    /* Consumer note */
    overlay.add(
      "text",
      {
        x: POS.projector.x,
        y: POS.projector.y + 44,
        text: "consumes & updates read DB",
        fill: "#fdba74",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "projector-note" },
    );

    /* Query handler note */
    overlay.add(
      "text",
      {
        x: POS["query-api"].x,
        y: POS["query-api"].y + 44,
        text: "read-only queries",
        fill: "#86efac",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "query-api-note" },
    );

    /* Read model caption */
    overlay.add(
      "text",
      {
        x: POS["read-model"].x,
        y: POS["read-model"].y - 10,
        text: "materialized view (denormalized)",
        fill: "#86efac",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "read-model-caption" },
    );

    /* Replay node note */
    overlay.add(
      "text",
      {
        x: POS.replay.x,
        y: POS.replay.y + 44,
        text: "replay events → rebuild views",
        fill: "#94a3b8",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "replay-note" },
    );

    /* Eventual consistency label */
    overlay.add(
      "text",
      {
        x: 760,
        y: 408,
        text: "Eventual Consistency",
        fill: state.staleRisk ? "#f59e0b" : "#94a3b8",
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "ec-label" },
    );
  });
}

const eventSourcingProfile: PatternAdapter["profile"] = {
  key: "event-sourcing",
  label: "CQRS + Event Sourcing",
  shortLabel: "ES + CQRS",
  color: "#f472b6",
  description:
    "Instead of storing only the current state, Event Sourcing persists every state change as an immutable event in an append-only Event Store. The Event Store becomes the ultimate source of truth. Combined with CQRS, events are published to an Event Bus and consumed to update Read Databases (materialized views) asynchronously.",
  readStrategy:
    "Queries read from materialized views built by consuming events from the Event Store — denormalized, fast, and optimized for the screen contract.",
  writeStrategy:
    "Commands generate new events that are appended to the Event Store. No mutable state — the Event Store is the write model and the source of truth.",
  tradeoff:
    "Full audit log and temporal queries come at the cost of eventual consistency, increased complexity, and the need to manage event schemas and replay infrastructure.",
  bestFor:
    "Domains requiring a full audit trail, temporal queries, and the ability to rebuild any read model by replaying the event history.",
  benefits: [
    "Complete audit log — every change is an immutable event.",
    "Temporal queries — reconstruct state at any point in time.",
    "Read models can be rebuilt from scratch by replaying events.",
    "Natural fit with CQRS — events drive both write and read sides.",
    "Event Store becomes the heart of data persistence.",
  ],
  drawbacks: [
    "Eventual consistency between Event Store and read models.",
    "Increased complexity managing event schemas and versioning.",
    "Replay and projection infrastructure becomes operational overhead.",
    "Short delay before read models reflect the latest state.",
  ],
};

export const eventSourcingAdapter: PatternAdapter = {
  id: "event-sourcing",
  profile: eventSourcingProfile,
  computeMetrics(state) {
    state.readLatencyMs = 20;
    state.writeLatencyMs = 38;
    state.projectionLagMs = state.projectionState === "lagging" ? 2400 : 160;
    state.syncCallsAvoided = 3;
    state.staleRisk = state.projectionState === "lagging";
    state.consistencyModel = state.staleRisk
      ? "Eventual consistency — read models are behind"
      : "Eventual consistency — read models caught up";
  },
  getOverviewHotZones() {
    return ALL_HOT_ZONES;
  },
  getOverviewExplanation(state) {
    return overviewExplanation(state);
  },
  expandToken(token) {
    switch (token) {
      case "$client":
        return ["client-app"];
      case "$gateway":
        return ["api-gateway"];
      case "$command-api":
        return ["command-api"];
      case "$write-model":
        return ["write-model"];
      case "$broker":
        return ["message-broker"];
      case "$projector":
        return ["projector"];
      case "$query-api":
        return ["query-api"];
      case "$read-model":
        return ["read-model"];
      case "$replay":
        return ["replay"];
      default:
        return null;
    }
  },
  getStepFlows(step, state) {
    switch (step) {
      case "client-command":
        return [
          {
            from: "$client",
            to: "$gateway",
            color: "#f472b6",
            duration: 620,
            explain: "The client submits a command to trigger a state change.",
          },
        ];
      case "route-command":
        return [
          {
            from: "$gateway",
            to: "$command-api",
            color: "#f472b6",
            duration: 620,
            explain:
              "The command is routed to the handler for validation and event generation.",
          },
        ];
      case "commit-write":
        return [
          {
            from: "$command-api",
            to: "$write-model",
            color: "#f472b6",
            duration: 620,
            explain:
              "New immutable events are appended to the Event Store — the source of truth.",
          },
        ];
      case "publish-event":
        return [
          {
            from: "$write-model",
            to: "$broker",
            color: "#f59e0b",
            duration: 620,
            explain:
              "Events from the Event Store are published to the Event Bus for downstream consumers.",
          },
        ];
      case "project-consume":
        return [
          {
            from: "$broker",
            to: "$projector",
            color: "#f59e0b",
            duration: 620,
            explain:
              "The event consumer picks up events asynchronously to update read models.",
          },
        ];
      case "refresh-view":
        return [
          {
            from: "$projector",
            to: "$read-model",
            color: state.staleRisk ? "#f59e0b" : "#22c55e",
            duration: 620,
            explain: state.staleRisk
              ? "Read models lag behind — eventual consistency in action."
              : "The consumer updates the materialized view with the latest events.",
          },
        ];
      case "client-query":
        return [
          {
            from: "$client",
            to: "$gateway",
            color: "#22c55e",
            duration: 620,
            explain: "A client query enters for fast read access.",
          },
        ];
      case "route-query":
        return [
          {
            from: "$gateway",
            to: "$query-api",
            color: "#22c55e",
            duration: 620,
            explain:
              "The query is routed to the read handler — no write logic involved.",
          },
        ];
      case "query-read":
        return [
          {
            from: "$query-api",
            to: "$read-model",
            color: state.staleRisk ? "#f59e0b" : "#22c55e",
            duration: 620,
            explain: state.staleRisk
              ? "The query reads from the materialized view, but it's briefly behind."
              : "The query reads from a denormalized view derived from events.",
          },
        ];
      case "return-response":
        return [
          {
            from: "$query-api",
            to: "$client",
            color: state.staleRisk ? "#f59e0b" : "#22c55e",
            duration: 620,
            explain:
              "The response returns from the pre-built read model. The read side scales independently.",
          },
        ];
      case "overview":
      case "summary":
      default:
        return [];
    }
  },
  getStepHotZones(step) {
    return stepHotZones(step);
  },
  getStepExplanation(step, state) {
    switch (step) {
      case "client-command":
        return "The client submits a command to change state. With Event Sourcing, this command will not update a mutable record — instead it will generate new immutable events.";
      case "route-command":
        return "The command handler validates the intent and business rules, then generates one or more domain events describing what happened (e.g. OrderCreated, ProductPriceChanged).";
      case "commit-write":
        return "New events are appended to the Event Store — an immutable, append-only log. The Event Store is the ultimate source of truth. Current state is derived by replaying events, not by reading a mutable row.";
      case "publish-event":
        return "Events from the Event Store are published to the Event Bus to notify other parts of the system. This decouples the write side from all downstream consumers.";
      case "project-consume":
        return "Event consumers subscribe to the bus and pick up events asynchronously. They process events to keep read models (materialized views) up to date — off the command path.";
      case "refresh-view":
        return state.staleRisk
          ? `The read model is still catching up. There is a short delay of ${formatLag(state.projectionLagMs)} before it reflects the latest state — this is the eventual consistency trade-off.`
          : "The consumer updates the materialized view so the next query sees current data. Because sync is async, there is always the possibility of brief staleness.";
      case "client-query":
        return "A query enters the system. Reads are served from materialized views that were built by consuming events — not from the Event Store directly.";
      case "route-query":
        return "The query handler accesses only the read model. No command logic, no Event Store access, no replaying events at query time.";
      case "query-read":
        return state.staleRisk
          ? `The query hits the materialized view, but the data is ${formatLag(state.projectionLagMs)} behind the Event Store. The system will eventually become consistent across all views.`
          : "The query reads from a denormalized materialized view derived from events. Fast and optimized for the query shape.";
      case "return-response":
        return state.staleRisk
          ? "The response still returns quickly from the materialized view. The app and UI must be designed to handle or tolerate this potential short staleness."
          : "The materialized view returns a pre-shaped response. If a view ever gets corrupted or needs a new shape, it can be rebuilt by replaying events from the Event Store.";
      case "summary":
        return `CQRS + Event Sourcing persists every state change as an immutable event in the Event Store (source of truth). Events are published to an Event Bus, and consumers asynchronously update materialized views for fast queries (${state.readLatencyMs}ms reads). The trade-off is eventual consistency (${formatLag(state.projectionLagMs)} lag). The payoff: full audit log, temporal queries, and the ability to replay events to rebuild any read model from scratch.`;
      case "overview":
      default:
        return overviewExplanation(state);
    }
  },
  reorderSteps(steps) {
    return steps;
  },
  relabelStep(step, state) {
    if (step.key === "commit-write") {
      return "Append Events to Event Store";
    }

    if (step.key === "publish-event") {
      return "Publish Events to Bus";
    }

    if (step.key === "project-consume") {
      return "Consumer Receives Events";
    }

    if (step.key === "refresh-view") {
      return state.staleRisk
        ? "Read Model Still Catching Up"
        : "Materialized View Updates";
    }

    if (step.key === "query-read") {
      return state.staleRisk
        ? "Query Reads Stale View"
        : "Query Reads Materialized View";
    }

    return step.label;
  },
  buildScene(builder, state, helpers) {
    const commandActive = COMMAND_PHASES.includes(helpers.phase);
    const syncActive = SYNC_PHASES.includes(helpers.phase);
    const queryActive = QUERY_PHASES.includes(helpers.phase);
    const summaryActive =
      helpers.phase === "summary" || helpers.phase === "overview";

    /* Frames */
    addFrame(
      builder,
      "command-lane",
      308,
      94,
      402,
      130,
      "Command side (Event Sourcing)",
      "#f472b6",
      commandActive || summaryActive,
    );
    addFrame(
      builder,
      "sync-lane",
      780,
      232,
      178,
      310,
      "Event-driven sync",
      "#f59e0b",
      syncActive || summaryActive,
    );
    addFrame(
      builder,
      "query-lane",
      308,
      400,
      402,
      140,
      "Query side (materialized views)",
      "#22c55e",
      queryActive || summaryActive,
    );
    addFrame(
      builder,
      "replay-zone",
      990,
      420,
      160,
      100,
      "Replay",
      "#94a3b8",
      summaryActive,
    );

    /* Nodes */
    drawBox(
      builder,
      "client-app",
      "Client",
      helpers.hot("client-app"),
      "#0f172a",
      "rgba(30, 58, 138, 0.92)",
      "#60a5fa",
      110,
      56,
    );
    drawBox(
      builder,
      "api-gateway",
      "UI / API",
      helpers.hot("api-gateway"),
      "#111827",
      "rgba(30, 41, 59, 0.96)",
      "#cbd5e1",
      130,
      58,
    );
    drawBox(
      builder,
      "command-api",
      "Command Handler",
      helpers.hot("command-api"),
      "#0f172a",
      "rgba(131, 24, 67, 0.88)",
      "#f472b6",
      162,
      58,
      16,
      () => helpers.openConcept("command-model"),
    );
    drawBox(
      builder,
      "write-model",
      "Event Store",
      helpers.hot("write-model"),
      "#1a0a10",
      "rgba(131, 24, 67, 0.88)",
      "#f472b6",
      168,
      68,
      16,
      () => helpers.openConcept("event-sourcing"),
    );
    drawBox(
      builder,
      "message-broker",
      "Event Bus",
      helpers.hot("message-broker"),
      "#201408",
      "rgba(120, 53, 15, 0.96)",
      "#f59e0b",
      154,
      60,
      16,
      () => helpers.openConcept("message-broker"),
    );
    drawBox(
      builder,
      "projector",
      "Event Consumer",
      helpers.hot("projector"),
      "#201408",
      "rgba(120, 53, 15, 0.96)",
      "#f59e0b",
      152,
      58,
      16,
      () => helpers.openConcept("projection"),
    );
    drawBox(
      builder,
      "query-api",
      "Query Handler",
      helpers.hot("query-api"),
      "#0f172a",
      "rgba(20, 83, 45, 0.96)",
      "#22c55e",
      152,
      58,
      16,
      () => helpers.openConcept("query-model"),
    );
    drawBox(
      builder,
      "read-model",
      "Read Database",
      helpers.hot("read-model"),
      "#0f172a",
      "rgba(20, 83, 45, 0.96)",
      state.staleRisk ? "#f59e0b" : "#22c55e",
      172,
      62,
      18,
      () => helpers.openConcept("materialized-view"),
    );
    drawBox(
      builder,
      "replay",
      "Replay",
      summaryActive,
      "#0f172a",
      "rgba(51, 65, 85, 0.72)",
      "#94a3b8",
      110,
      48,
      14,
    );

    /* Edges */
    builder
      .edge("client-app", "api-gateway", "e-client-gateway")
      .stroke(
        edgeColor(
          helpers.hot("client-app") && helpers.hot("api-gateway"),
          queryActive ? "#22c55e" : "#f472b6",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("api-gateway", "command-api", "e-gateway-command")
      .stroke(
        edgeColor(
          helpers.hot("api-gateway") && helpers.hot("command-api"),
          "#f472b6",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("command-api", "write-model", "e-command-write")
      .stroke(
        edgeColor(
          helpers.hot("command-api") && helpers.hot("write-model"),
          "#f472b6",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("write-model", "message-broker", "e-write-broker")
      .stroke(
        edgeColor(
          helpers.hot("write-model") && helpers.hot("message-broker"),
          "#f59e0b",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("message-broker", "projector", "e-broker-projector")
      .stroke(
        edgeColor(
          helpers.hot("message-broker") && helpers.hot("projector"),
          "#f59e0b",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("projector", "read-model", "e-projector-read")
      .stroke(
        edgeColor(
          helpers.hot("projector") && helpers.hot("read-model"),
          state.staleRisk ? "#f59e0b" : "#22c55e",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("api-gateway", "query-api", "e-gateway-query")
      .stroke(
        edgeColor(
          helpers.hot("api-gateway") && helpers.hot("query-api"),
          "#22c55e",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("query-api", "read-model", "e-query-read")
      .stroke(
        edgeColor(
          helpers.hot("query-api") && helpers.hot("read-model"),
          state.staleRisk ? "#f59e0b" : "#22c55e",
        ),
        1.8,
      )
      .arrow(true);

    /* Replay dashed edge (Event Store → Replay) */
    builder
      .edge("write-model", "replay", "e-store-replay")
      .stroke("#94a3b8", 1.4)
      .arrow(true);

    addCallout(builder, state);
    addNodeNotes(builder, state);

    addBadge(
      builder,
      "lag-state",
      540,
      580,
      state.staleRisk
        ? `Lagging: ${formatLag(state.projectionLagMs)} behind`
        : `Sync lag: ${formatLag(state.projectionLagMs)}`,
      state.staleRisk ? "rgba(120, 53, 15, 0.18)" : "rgba(20, 83, 45, 0.16)",
      state.staleRisk ? "#f59e0b" : "#22c55e",
    );
    addBadge(
      builder,
      "immutable-note",
      302,
      580,
      "Append-only: full history retained",
      "rgba(244, 114, 182, 0.12)",
      "#f472b6",
    );
  },
  getStatBadges(state) {
    return [
      {
        label: "Pattern",
        value: eventSourcingProfile.shortLabel,
        color: eventSourcingProfile.color,
      },
      {
        label: "Read",
        value: `${state.readLatencyMs}ms`,
        color: "#22c55e",
      },
      {
        label: "Append",
        value: `${state.writeLatencyMs}ms`,
        color: "#f472b6",
      },
      {
        label: "Sync Lag",
        value: formatLag(state.projectionLagMs),
        color: state.staleRisk ? "#f59e0b" : "#22c55e",
      },
    ];
  },
  softReset() {},
};
