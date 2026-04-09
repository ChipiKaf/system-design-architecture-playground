import type {
  CommandsQueriesState,
  ProjectionState,
} from "../commandsQueriesSlice";
import type { PatternAdapter } from "./types";
import type { StepKey } from "../flow-engine";

const POS = {
  "client-app": { x: 100, y: 350 },
  "api-gateway": { x: 280, y: 350 },
  "command-api": { x: 492, y: 204 },
  "write-model": { x: 714, y: 204 },
  "message-broker": { x: 944, y: 204 },
  projector: { x: 944, y: 436 },
  "query-api": { x: 492, y: 436 },
  "read-model": { x: 714, y: 436 },
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

const PROJECTION_PHASES = [
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
  return `Materialized view strategically duplicates query data into a local read model while the write side remains the source of truth. Events keep that duplicate synchronized asynchronously, so the query path avoids ${state.syncCallsAvoided} synchronous service calls and returns in about ${state.readLatencyMs}ms. Current projection lag is ${formatLag(state.projectionLagMs)}, so the read side is eventually consistent.`;
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

function readModelLines(projectionState: ProjectionState): string[] {
  if (projectionState === "lagging") {
    return [
      "cart_id | items | total | snapshot",
      "c-2048 | 3 | $124.00 | 1.8s behind",
      "camera -> stale price copy",
      "tripod -> previous snapshot",
    ];
  }

  return [
    "cart_id | items | total | snapshot",
    "c-2048 | 3 | $128.00 | current",
    "camera -> $89.00",
    "tripod -> $39.00",
  ];
}

function calloutFor(state: CommandsQueriesState): {
  title: string;
  lines: string[];
  accent: string;
} {
  if (COMMAND_PHASES.includes(state.phase)) {
    return {
      title: "Command side",
      lines: [
        "The write model remains the source of truth.",
        "The read copy never owns authoritative state.",
      ],
      accent: "#38bdf8",
    };
  }

  if (PROJECTION_PHASES.includes(state.phase)) {
    return {
      title: "Async projection",
      lines: state.staleRisk
        ? [
            "Events refresh the duplicated read copy later.",
            `Current lag: ${formatLag(state.projectionLagMs)}.`,
          ]
        : [
            "Publish/subscribe updates the read copy off-path.",
            `Current lag: ${formatLag(state.projectionLagMs)} and caught up.`,
          ],
      accent: "#f59e0b",
    };
  }

  if (QUERY_PHASES.includes(state.phase)) {
    return {
      title: "Query side",
      lines: state.staleRisk
        ? [
            "Queries hit a local duplicated snapshot.",
            "Freshness is traded for speed while it catches up.",
          ]
        : [
            "Queries read one strategic local copy.",
            "No live fan-out to source services is needed.",
          ],
      accent: "#22c55e",
    };
  }

  return {
    title: "Materialized view",
    lines: [
      "Data is duplicated strategically for read speed.",
      "The write side still owns the source of truth.",
    ],
    accent: "#22c55e",
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
      { key: "materialized-callout-bg" },
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
      { key: "materialized-callout-title" },
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
        { key: `materialized-callout-line-${index}` },
      );
    });
  });
}

function addNodeNotes(
  builder: ReturnType<typeof import("vizcraft").viz>,
  state: CommandsQueriesState,
) {
  const lines = readModelLines(state.projectionState);

  builder.overlay((overlay) => {
    overlay.add(
      "text",
      {
        x: POS["command-api"].x,
        y: POS["command-api"].y + 44,
        text: "validates intent",
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
        y: POS["write-model"].y + 44,
        text: "source of truth",
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
        x: POS["message-broker"].x,
        y: POS["message-broker"].y + 48,
        text: "publish / subscribe",
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
        text: "subscribes to events",
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
        text: "read-only endpoint",
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
        y: POS["read-model"].y - 8,
        text: "strategic duplicate: cart + product + price",
        fill: "#86efac",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "read-model-caption" },
    );

    lines.forEach((line, index) => {
      overlay.add(
        "text",
        {
          x: POS["read-model"].x,
          y: POS["read-model"].y + 10 + index * 16,
          text: line,
          fill: index === 0 ? "#7dd3fc" : "#dbeafe",
          fontSize: index === 0 ? 8 : 7.5,
          fontWeight: index === 0 ? 700 : 600,
          textAnchor: "middle",
        },
        { key: `read-model-line-${index}` },
      );
    });
  });
}

const materializedViewProfile: PatternAdapter["profile"] = {
  key: "materialized-view",
  label: "Materialized View",
  shortLabel: "Mat View",
  color: "#22c55e",
  description:
    "Precompute and strategically duplicate a local read model so composite queries stay inside one service boundary instead of fanning out across microservices at request time.",
  readStrategy:
    "Queries hit one denormalized local copy that already contains the shape the client needs.",
  writeStrategy:
    "Commands still update the authoritative write model first. That write side remains the source of truth, then publishes events for projection.",
  tradeoff:
    "Read latency drops sharply, but freshness becomes eventual because the duplicated view is refreshed asynchronously.",
  bestFor:
    "Read-heavy microservice views that repeatedly stitch the same cross-service data together.",
  benefits: [
    "Keeps the query path local and predictable.",
    "Removes live fan-out from the read path.",
    "Lets the read model use a shape optimized for the screen or API contract.",
    "Makes strategic data duplication explicit instead of hidden in the request path.",
  ],
  drawbacks: [
    "Read freshness depends on projector lag.",
    "The local read copy is not authoritative and can be stale.",
    "Projection logic and replay become operational concerns.",
    "The system now has to reason about eventual consistency explicitly.",
  ],
};

export const materializedViewAdapter: PatternAdapter = {
  id: "materialized-view",
  profile: materializedViewProfile,
  computeMetrics(state) {
    state.readLatencyMs = 26;
    state.writeLatencyMs = 54;
    state.projectionLagMs = state.projectionState === "lagging" ? 1800 : 180;
    state.syncCallsAvoided = 2;
    state.staleRisk = state.projectionState === "lagging";
    state.consistencyModel = state.staleRisk
      ? "Eventual consistency - view is behind"
      : "Eventual consistency - view caught up";
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
            explain: "The client submits a command through the edge path.",
          },
        ];
      case "route-command":
        return [
          {
            from: "$gateway",
            to: "$command-api",
            color: "#38bdf8",
            duration: 620,
            explain: "Gateway routes the command to the write-side API.",
          },
        ];
      case "commit-write":
        return [
          {
            from: "$command-api",
            to: "$write-model",
            color: "#38bdf8",
            duration: 620,
            explain: "The authoritative write model commits the change.",
          },
        ];
      case "publish-event":
        return [
          {
            from: "$write-model",
            to: "$broker",
            color: "#f59e0b",
            duration: 620,
            explain: "The write side emits an event after the commit.",
          },
        ];
      case "project-consume":
        return [
          {
            from: "$broker",
            to: "$projector",
            color: "#f59e0b",
            duration: 620,
            explain: "The projector consumes the change off the request path.",
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
              ? "The projector is still catching up, so freshness trails the write side."
              : "The projector refreshes the local query view.",
          },
        ];
      case "client-query":
        return [
          {
            from: "$client",
            to: "$gateway",
            color: "#22c55e",
            duration: 620,
            explain: "A client query enters through the same gateway.",
          },
        ];
      case "route-query":
        return [
          {
            from: "$gateway",
            to: "$query-api",
            color: "#22c55e",
            duration: 620,
            explain: "Gateway routes the query to the read-side API.",
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
              ? "The query still reads locally, but the snapshot is behind."
              : "The query reads one local denormalized view.",
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
              "The prebuilt response returns without live cross-service joins.",
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
        return "The command path starts at the edge like any normal request, but only the write side is allowed to change authoritative state.";
      case "route-command":
        return "Gateway routes the command to the write API. The command side owns invariants and the source-of-truth model.";
      case "commit-write":
        return "The source-of-truth write model commits the state change first. The materialized view is not updated inline in the same request path.";
      case "publish-event":
        return "After the authoritative write succeeds, the write side publishes an event so the duplicated read model can be synchronized asynchronously.";
      case "project-consume":
        return "The projector consumes the event separately from the client request. This keeps synchronization off the write path while preserving write-side ownership of the truth.";
      case "refresh-view":
        return state.staleRisk
          ? `The duplicated read model is still catching up. Queries remain fast, but the local copy can lag the write side by about ${formatLag(state.projectionLagMs)}.`
          : "The projector refreshes the denormalized read model so the next query can stay entirely local without touching the source-of-truth write side.";
      case "client-query":
        return "A query starts with the same client and gateway, but it will now follow the read lane instead of touching the write model.";
      case "route-query":
        return "Gateway routes the query to the read-side API. No command logic or invariant checks are needed here.";
      case "query-read":
        return state.staleRisk
          ? `The query hits one local duplicated view and returns quickly, but that snapshot is ${formatLag(state.projectionLagMs)} behind the write side.`
          : "The query reads one local denormalized copy, so no live fan-out to other services is needed on the request path.";
      case "return-response":
        return state.staleRisk
          ? "The response still returns immediately from the local view, but freshness is only eventual until the projection catches up."
          : "Gateway returns one denormalized response from the local view. The read path stays fast because the expensive stitching already happened earlier.";
      case "summary":
        return `Materialized view strategically duplicates data for the read path while keeping the write side authoritative. The query side avoids ${state.syncCallsAvoided} synchronous service calls, reads in about ${state.readLatencyMs}ms, and currently carries ${formatLag(state.projectionLagMs)} of projection lag because synchronization happens asynchronously.`;
      case "overview":
      default:
        return overviewExplanation(state);
    }
  },
  reorderSteps(steps) {
    return steps;
  },
  relabelStep(step, state) {
    if (step.key === "refresh-view" && state.staleRisk) {
      return "Projection Still Catching Up";
    }

    if (step.key === "query-read" && state.staleRisk) {
      return "Query Reads Lagging View";
    }

    return step.label;
  },
  buildScene(builder, state, helpers) {
    const commandActive = COMMAND_PHASES.includes(helpers.phase);
    const projectionActive = PROJECTION_PHASES.includes(helpers.phase);
    const queryActive = QUERY_PHASES.includes(helpers.phase);
    const summaryActive =
      helpers.phase === "summary" || helpers.phase === "overview";

    addFrame(
      builder,
      "command-lane",
      378,
      128,
      406,
      118,
      "Command side",
      "#38bdf8",
      commandActive || summaryActive,
    );
    addFrame(
      builder,
      "projection-lane",
      862,
      128,
      164,
      340,
      "Async projection",
      "#f59e0b",
      projectionActive || summaryActive,
    );
    addFrame(
      builder,
      "query-lane",
      378,
      360,
      406,
      128,
      "Query side",
      "#22c55e",
      queryActive || summaryActive,
    );

    drawBox(
      builder,
      "client-app",
      "Client App",
      helpers.hot("client-app"),
      "#0f172a",
      "rgba(30, 58, 138, 0.92)",
      "#60a5fa",
      134,
      56,
    );
    drawBox(
      builder,
      "api-gateway",
      "API Gateway",
      helpers.hot("api-gateway"),
      "#111827",
      "rgba(30, 41, 59, 0.96)",
      "#cbd5e1",
      150,
      58,
    );
    drawBox(
      builder,
      "command-api",
      "Command API",
      helpers.hot("command-api"),
      "#0f172a",
      "rgba(14, 116, 144, 0.92)",
      "#38bdf8",
      156,
      58,
      16,
      () => helpers.openConcept("command-model"),
    );
    drawBox(
      builder,
      "write-model",
      "Write Model",
      helpers.hot("write-model"),
      "#0f172a",
      "rgba(14, 116, 144, 0.92)",
      "#38bdf8",
      162,
      62,
      16,
      () => helpers.openConcept("command-model"),
    );
    drawBox(
      builder,
      "message-broker",
      "Message Broker",
      helpers.hot("message-broker"),
      "#201408",
      "rgba(120, 53, 15, 0.96)",
      "#f59e0b",
      164,
      64,
      16,
      () => helpers.openConcept("message-broker"),
    );
    drawBox(
      builder,
      "projector",
      "Projector",
      helpers.hot("projector"),
      "#201408",
      "rgba(120, 53, 15, 0.96)",
      "#f59e0b",
      140,
      58,
      16,
      () => helpers.openConcept("projection"),
    );
    drawBox(
      builder,
      "query-api",
      "Query API",
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
      "Materialized View",
      helpers.hot("read-model"),
      "#0f172a",
      "rgba(20, 83, 45, 0.96)",
      state.staleRisk ? "#f59e0b" : "#22c55e",
      190,
      104,
      18,
      () => helpers.openConcept("materialized-view"),
    );

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
      548,
      state.staleRisk
        ? `Lagging: ${formatLag(state.projectionLagMs)} behind`
        : `Projection lag: ${formatLag(state.projectionLagMs)}`,
      state.staleRisk ? "rgba(120, 53, 15, 0.18)" : "rgba(20, 83, 45, 0.16)",
      state.staleRisk ? "#f59e0b" : "#22c55e",
    );
    addBadge(
      builder,
      "fanout-removed",
      382,
      548,
      "Read path removes live fan-out",
      "rgba(14, 165, 233, 0.12)",
      "#38bdf8",
    );
  },
  getStatBadges(state) {
    return [
      {
        label: "Pattern",
        value: materializedViewProfile.shortLabel,
        color: materializedViewProfile.color,
      },
      {
        label: "Read",
        value: `${state.readLatencyMs}ms`,
        color: "#22c55e",
      },
      {
        label: "Lag",
        value: formatLag(state.projectionLagMs),
        color: state.staleRisk ? "#f59e0b" : "#22c55e",
      },
      {
        label: "Sync Calls Avoided",
        value: state.syncCallsAvoided,
        color: "#38bdf8",
      },
    ];
  },
  softReset() {},
};
