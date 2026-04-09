import type { CommandsQueriesState } from "../commandsQueriesSlice";
import type { PatternAdapter } from "./types";
import type { StepKey } from "../flow-engine";

const POS = {
  "client-app": { x: 100, y: 340 },
  "api-gateway": { x: 280, y: 340 },
  "command-api": { x: 492, y: 190 },
  "write-model": { x: 714, y: 190 },
  "message-broker": { x: 944, y: 190 },
  projector: { x: 944, y: 460 },
  "query-api": { x: 492, y: 460 },
  "read-model": { x: 714, y: 460 },
} as const;

const ALL_HOT_ZONES = [
  "client-app",
  "api-gateway",
  "command-api",
  "write-model",
  "message-broker",
  "projector",
  "query-api",
  "read-model",
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
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return `${ms}ms`;
}

function overviewExplanation(state: CommandsQueriesState): string {
  return `CQRS separates commands that change state from queries that read state. The write database enforces ACID consistency and business rules while the read database uses a denormalized schema optimized for fast queries. An event bus synchronizes them asynchronously, so the read side currently carries ${formatLag(state.projectionLagMs)} of lag. A single model optimized for one side is suboptimal for the other — this separation lets each scale and optimize independently.`;
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
      title: "Command side (writes)",
      lines: [
        "Writes need strong consistency (ACID) and business logic.",
        "Commands may be less frequent but are more complex.",
      ],
      accent: "#38bdf8",
    };
  }

  if (SYNC_PHASES.includes(state.phase)) {
    return {
      title: "Event-driven sync",
      lines: state.staleRisk
        ? [
            "Async sync avoids negating CQRS scaling benefits.",
            `Current lag: ${formatLag(state.projectionLagMs)}.`,
          ]
        : [
            "Events decouple the write side from read-side updates.",
            `Sync lag: ${formatLag(state.projectionLagMs)}, caught up.`,
          ],
      accent: "#f59e0b",
    };
  }

  if (QUERY_PHASES.includes(state.phase)) {
    return {
      title: "Query side (reads)",
      lines: state.staleRisk
        ? [
            "Queries hit the optimized read store.",
            "The read model briefly lags the write side.",
          ]
        : [
            "Queries read from a denormalized optimized schema.",
            "No expensive joins needed at query time.",
          ],
      accent: "#22c55e",
    };
  }

  return {
    title: "CQRS",
    lines: [
      "Separate data models for commands and queries.",
      "Each side scales and optimizes independently.",
    ],
    accent: "#818cf8",
  };
}

function edgeColor(active: boolean, color: string): string {
  return active ? color : "rgba(71, 85, 105, 0.28)";
}

function drawBox(
  builder: ReturnType<typeof import("vizcraft").viz>,
  id: keyof typeof POS,
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
        x: 42,
        y: 88,
        w: 288,
        h: 92,
        rx: 18,
        ry: 18,
        fill: "rgba(7, 17, 34, 0.92)",
        stroke: callout.accent,
        strokeWidth: 1.2,
        opacity: 0.98,
      },
      { key: "cqrs-callout-bg" },
    );
    overlay.add(
      "text",
      {
        x: 60,
        y: 116,
        text: callout.title,
        fill: callout.accent,
        fontSize: 12,
        fontWeight: 700,
      },
      { key: "cqrs-callout-title" },
    );

    callout.lines.forEach((line, index) => {
      overlay.add(
        "text",
        {
          x: 60,
          y: 140 + index * 18,
          text: line,
          fill: "#dbeafe",
          fontSize: 9,
          fontWeight: 600,
        },
        { key: `cqrs-callout-line-${index}` },
      );
    });
  });
}

function addNodeNotes(
  builder: ReturnType<typeof import("vizcraft").viz>,
  state: CommandsQueriesState,
) {
  builder.overlay((overlay) => {
    overlay.add(
      "text",
      {
        x: POS["command-api"].x,
        y: POS["command-api"].y + 44,
        text: "validates & enforces rules",
        fill: "#7dd3fc",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "command-api-note" },
    );
    overlay.add(
      "text",
      {
        x: POS["write-model"].x,
        y: POS["write-model"].y + 46,
        text: "source of truth (ACID)",
        fill: "#7dd3fc",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "write-model-note" },
    );
    overlay.add(
      "text",
      {
        x: POS["write-model"].x + 10,
        y: POS["write-model"].y - 42,
        text: "Tables or Event Sourcing",
        fill: "#94a3b8",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "write-model-tech-note" },
    );
    overlay.add(
      "text",
      {
        x: POS["message-broker"].x,
        y: POS["message-broker"].y + 48,
        text: "publishes change events",
        fill: "#fdba74",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "broker-note" },
    );
    overlay.add(
      "text",
      {
        x: POS.projector.x,
        y: POS.projector.y + 44,
        text: "subscribes & updates read DB",
        fill: "#fdba74",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "projector-note" },
    );
    overlay.add(
      "text",
      {
        x: POS["query-api"].x,
        y: POS["query-api"].y + 44,
        text: "read-only, high volume",
        fill: "#86efac",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "query-api-note" },
    );
    overlay.add(
      "text",
      {
        x: POS["read-model"].x,
        y: POS["read-model"].y - 60,
        text: "optimized read model (denormalized)",
        fill: "#86efac",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "read-model-caption" },
    );

    /* read-side schema sample */
    const writeLines = ["── Write (normalized) ──", "product | price | stock"];
    const readLines = state.staleRisk
      ? ["── Read (behind) ──", "display | $85.00 stale | Electronics"]
      : ["── Read (denormalized) ──", "display | $89.00 | Electronics | ★4.2"];

    [...writeLines, ...readLines].forEach((line, index) => {
      const isHeading = line.startsWith("──");
      overlay.add(
        "text",
        {
          x: POS["read-model"].x,
          y: POS["read-model"].y - 42 + index * 16,
          text: line,
          fill: isHeading ? "#818cf8" : "#dbeafe",
          fontSize: isHeading ? 8 : 7.5,
          fontWeight: isHeading ? 700 : 600,
          textAnchor: "middle",
        },
        { key: `read-schema-line-${index}` },
      );
    });

    /* eventual consistency label between lanes */
    overlay.add(
      "text",
      {
        x: 810,
        y: 340,
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

const cqrsProfile: PatternAdapter["profile"] = {
  key: "cqrs",
  label: "CQRS",
  shortLabel: "CQRS",
  color: "#818cf8",
  description:
    "Separate operations that change state (Commands) from operations that read state (Queries). Each side uses a different data model, and potentially a different data store, optimized independently for performance, scalability, and security.",
  readStrategy:
    "Queries read from an optimized read database with a denormalized schema designed for fast retrieval — no expensive joins at query time.",
  writeStrategy:
    "Commands go through the write database with ACID consistency, business logic validation, and invariant enforcement. The write side is the source of truth.",
  tradeoff:
    "Independent scaling and optimized data models at the cost of increased complexity, eventual consistency, and synchronization logic between read and write sides.",
  bestFor:
    "Systems where reads and writes have very different performance profiles, volumes, and scaling requirements.",
  benefits: [
    "Independent scaling of read and write tiers.",
    "Optimized data models for each responsibility.",
    "Improved query performance with denormalized reads.",
    "Increased security with separate read/write access controls.",
    "Simpler logic on each side of the boundary.",
  ],
  drawbacks: [
    "Increased overall system complexity from maintaining two models.",
    "Eventual consistency between read and write sides.",
    "Code duplication across command and query handlers.",
    "Synchronization logic must be designed and maintained.",
  ],
};

export const cqrsAdapter: PatternAdapter = {
  id: "cqrs",
  profile: cqrsProfile,
  computeMetrics(state) {
    state.readLatencyMs = 18;
    state.writeLatencyMs = 72;
    state.projectionLagMs = state.projectionState === "lagging" ? 2200 : 200;
    state.syncCallsAvoided = 3;
    state.staleRisk = state.projectionState === "lagging";
    state.consistencyModel = state.staleRisk
      ? "Eventual consistency — read side is behind"
      : "Eventual consistency — read side caught up";
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
            color: "#38bdf8",
            duration: 620,
            explain: "The client submits a command to change state.",
          },
        ];
      case "route-command":
        return [
          {
            from: "$gateway",
            to: "$command-api",
            color: "#38bdf8",
            duration: 620,
            explain:
              "API layer routes the command to the write-side handler for validation.",
          },
        ];
      case "commit-write":
        return [
          {
            from: "$command-api",
            to: "$write-model",
            color: "#38bdf8",
            duration: 620,
            explain:
              "The write database commits with ACID guarantees — source of truth.",
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
              "After commit, an event describing the change is published to the event bus.",
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
              "The event consumer picks up the change event asynchronously.",
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
              ? "The read database is still catching up — eventual consistency in action."
              : "The event consumer updates the read database to reflect the change.",
          },
        ];
      case "client-query":
        return [
          {
            from: "$client",
            to: "$gateway",
            color: "#22c55e",
            duration: 620,
            explain:
              "A client sends a query — reads are high-volume and need low latency.",
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
              "API layer routes the query to the read-side handler. No write logic needed.",
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
              ? "The query hits the optimized read database, but the data is briefly behind."
              : "The query reads from the denormalized optimized schema — no joins needed.",
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
              "The response returns from the pre-optimized read model. The read side scales independently.",
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
        return "The command path starts at the client. Write operations need strong consistency (ACID), business logic validation, and invariant enforcement — requirements very different from reads.";
      case "route-command":
        return "The API layer routes the command to the write-side handler. This handler is responsible for validation and enforcement, not read concerns.";
      case "commit-write":
        return "The write database commits with ACID guarantees. This is the source of truth — it owns the authoritative state. The read side is not updated inline.";
      case "publish-event":
        return "After the commit, the write side publishes an event to the event bus describing what changed. This decouples the write side from any read-side concerns. Direct synchronous updates would negate key CQRS benefits.";
      case "project-consume":
        return "The event consumer picks up the change event asynchronously. This happens off the original command request path, keeping the two sides decoupled.";
      case "refresh-view":
        return state.staleRisk
          ? `The read database is still catching up. There is a brief period of ${formatLag(state.projectionLagMs)} where the read model does not yet reflect the latest writes — this is the fundamental eventual consistency trade-off.`
          : "The event consumer updates the read database so the next query sees the latest state. Because sync is asynchronous, there is always the possibility of brief staleness.";
      case "client-query":
        return "A query enters the system. Reads are much higher volume than writes and need low latency. They may require joining data from multiple entities — a very different profile from writes.";
      case "route-query":
        return "The API layer routes the query to the read-side handler. No command logic, invariant checks, or ACID concerns are needed here.";
      case "query-read":
        return state.staleRisk
          ? `The query hits the optimized read database, but the data is ${formatLag(state.projectionLagMs)} behind the write side. The app and UI must be designed to tolerate this potential staleness.`
          : "The query reads from a denormalized schema optimized purely for retrieval. No expensive joins, no write-side complexity — just fast reads.";
      case "return-response":
        return state.staleRisk
          ? "The response returns quickly from the optimized read store, but freshness is only eventual. This is the fundamental trade-off for achieving scalability and decoupling."
          : "The response returns from the pre-optimized read model. Independent scaling means the read tier handles high query volumes without impacting write performance.";
      case "summary":
        return `CQRS separates the command and query responsibilities so each side can use a data model optimized for its own job. The write side maintains ACID consistency for ${state.writeLatencyMs}ms writes while the read side delivers ${state.readLatencyMs}ms denormalized results. The trade-off is eventual consistency (currently ${formatLag(state.projectionLagMs)} of lag) and the complexity of maintaining two models with event-driven synchronization.`;
      case "overview":
      default:
        return overviewExplanation(state);
    }
  },
  reorderSteps(steps) {
    return steps;
  },
  relabelStep(step, state) {
    if (step.key === "publish-event") {
      return "Publish Change Event";
    }

    if (step.key === "project-consume") {
      return "Event Consumer Receives";
    }

    if (step.key === "refresh-view") {
      return state.staleRisk
        ? "Read DB Still Catching Up"
        : "Read Database Updates";
    }

    if (step.key === "query-read") {
      return state.staleRisk
        ? "Query Reads Stale Data"
        : "Query Reads Optimized Schema";
    }

    if (step.key === "commit-write") {
      return "Write DB Commits (ACID)";
    }

    return step.label;
  },
  buildScene(builder, state, helpers) {
    const commandActive = COMMAND_PHASES.includes(helpers.phase);
    const syncActive = SYNC_PHASES.includes(helpers.phase);
    const queryActive = QUERY_PHASES.includes(helpers.phase);
    const summaryActive =
      helpers.phase === "summary" || helpers.phase === "overview";

    addFrame(
      builder,
      "command-lane",
      378,
      114,
      410,
      124,
      "Command side (writes)",
      "#38bdf8",
      commandActive || summaryActive,
    );
    addFrame(
      builder,
      "sync-lane",
      862,
      114,
      170,
      398,
      "Event-driven sync",
      "#f59e0b",
      syncActive || summaryActive,
    );
    addFrame(
      builder,
      "query-lane",
      378,
      378,
      410,
      152,
      "Query side (reads)",
      "#22c55e",
      queryActive || summaryActive,
    );

    drawBox(
      builder,
      "client-app",
      "Client",
      helpers.hot("client-app"),
      "#0f172a",
      "rgba(30, 58, 138, 0.92)",
      "#60a5fa",
      120,
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
      140,
      58,
    );
    drawBox(
      builder,
      "command-api",
      "Command Handler",
      helpers.hot("command-api"),
      "#0f172a",
      "rgba(14, 116, 144, 0.92)",
      "#38bdf8",
      162,
      58,
      16,
      () => helpers.openConcept("command-model"),
    );
    drawBox(
      builder,
      "write-model",
      "Write Database",
      helpers.hot("write-model"),
      "#0f172a",
      "rgba(14, 116, 144, 0.92)",
      "#38bdf8",
      168,
      62,
      16,
      () => helpers.openConcept("command-model"),
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
      64,
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
      156,
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
      180,
      62,
      18,
      () => helpers.openConcept("query-model"),
    );

    /* edges */
    builder
      .edge("client-app", "api-gateway", "e-client-gateway")
      .stroke(
        edgeColor(
          helpers.hot("client-app") && helpers.hot("api-gateway"),
          queryActive ? "#22c55e" : "#38bdf8",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("api-gateway", "command-api", "e-gateway-command")
      .stroke(
        edgeColor(
          helpers.hot("api-gateway") && helpers.hot("command-api"),
          "#38bdf8",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("command-api", "write-model", "e-command-write")
      .stroke(
        edgeColor(
          helpers.hot("command-api") && helpers.hot("write-model"),
          "#38bdf8",
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

    addCallout(builder, state);
    addNodeNotes(builder, state);

    addBadge(
      builder,
      "lag-state",
      606,
      568,
      state.staleRisk
        ? `Lagging: ${formatLag(state.projectionLagMs)} behind`
        : `Sync lag: ${formatLag(state.projectionLagMs)}`,
      state.staleRisk ? "rgba(120, 53, 15, 0.18)" : "rgba(20, 83, 45, 0.16)",
      state.staleRisk ? "#f59e0b" : "#22c55e",
    );
    addBadge(
      builder,
      "scaling-note",
      382,
      568,
      "Independent read / write scaling",
      "rgba(129, 140, 248, 0.12)",
      "#818cf8",
    );
  },
  getStatBadges(state) {
    return [
      {
        label: "Pattern",
        value: cqrsProfile.shortLabel,
        color: cqrsProfile.color,
      },
      {
        label: "Read",
        value: `${state.readLatencyMs}ms`,
        color: "#22c55e",
      },
      {
        label: "Write",
        value: `${state.writeLatencyMs}ms`,
        color: "#38bdf8",
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
