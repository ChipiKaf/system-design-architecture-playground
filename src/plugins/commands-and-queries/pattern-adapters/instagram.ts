import type { CommandsQueriesState } from "../commandsQueriesSlice";
import type { PatternAdapter } from "./types";
import type { StepKey } from "../flow-engine";

/*
  Instagram Case Study layout
  ────────────────────────────
  Shows how Instagram applies CQRS / polyglot persistence at global scale:
  - Django app servers
  - PostgreSQL (Master → Replicas) for core user data, writes, strong consistency
  - Cassandra (Peer-to-peer) for feeds, activity streams, massive scale reads
  - Memcached for caching hot data
  - RabbitMQ for async task queues
*/

const POS = {
  "client-app": { x: 80, y: 310 },
  "api-gateway": { x: 260, y: 310 },
  "command-api": { x: 480, y: 160 },
  "write-model": { x: 720, y: 160 },
  "message-broker": { x: 960, y: 310 },
  projector: { x: 960, y: 490 },
  "query-api": { x: 480, y: 490 },
  "read-model": { x: 720, y: 490 },
  memcached: { x: 260, y: 490 },
  replica: { x: 720, y: 310 },
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
  "memcached",
  "replica",
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
  return `Instagram applies CQRS and polyglot persistence at global scale. Writes go to PostgreSQL (Master) for strong consistency and data integrity. Reads are served from Cassandra for massive-scale feeds and activity streams, with Memcached caching hot data. RabbitMQ handles async task queues to propagate changes. This architecture serves hundreds of millions of daily active users across multiple data centers with ${formatLag(state.projectionLagMs)} of replication lag.`;
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
      return ["query-api", "read-model", "memcached"];
    case "return-response":
      return [
        "client-app",
        "api-gateway",
        "query-api",
        "read-model",
        "memcached",
      ];
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
      title: "Write path (PostgreSQL Master)",
      lines: [
        "Writes hit PostgreSQL for ACID and data integrity.",
        "Master provides a single source of truth for writes.",
      ],
      accent: "#38bdf8",
    };
  }

  if (SYNC_PHASES.includes(state.phase)) {
    return {
      title: "Async replication (RabbitMQ)",
      lines: state.staleRisk
        ? [
            "RabbitMQ propagates changes to Cassandra async.",
            `Replication lag: ${formatLag(state.projectionLagMs)}.`,
          ]
        : [
            "Changes flow through RabbitMQ to Cassandra.",
            `Replication lag: ${formatLag(state.projectionLagMs)}, caught up.`,
          ],
      accent: "#f59e0b",
    };
  }

  if (QUERY_PHASES.includes(state.phase)) {
    return {
      title: "Read path (Cassandra + Memcached)",
      lines: state.staleRisk
        ? [
            "Reads hit Cassandra/Memcached with AP trade-off.",
            "Availability over immediate consistency.",
          ]
        : [
            "Cassandra delivers massive-scale reads, Memcached caches hot data.",
            "Hundreds of millions of daily queries served.",
          ],
      accent: "#22c55e",
    };
  }

  return {
    title: "Instagram Architecture",
    lines: [
      "Polyglot persistence: different DBs for different jobs.",
      "PostgreSQL writes, Cassandra reads, Memcached caches.",
    ],
    accent: "#e879f9",
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
        y: 68,
        w: 310,
        h: 92,
        rx: 18,
        ry: 18,
        fill: "rgba(7, 17, 34, 0.92)",
        stroke: callout.accent,
        strokeWidth: 1.2,
        opacity: 0.98,
      },
      { key: "ig-callout-bg" },
    );
    overlay.add(
      "text",
      {
        x: 50,
        y: 96,
        text: callout.title,
        fill: callout.accent,
        fontSize: 12,
        fontWeight: 700,
      },
      { key: "ig-callout-title" },
    );

    callout.lines.forEach((line, index) => {
      overlay.add(
        "text",
        {
          x: 50,
          y: 120 + index * 18,
          text: line,
          fill: "#dbeafe",
          fontSize: 9,
          fontWeight: 600,
        },
        { key: `ig-callout-line-${index}` },
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
        text: "Django app server",
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
        y: POS["write-model"].y + 50,
        text: "Master (source of truth)",
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
        x: POS["write-model"].x,
        y: POS["write-model"].y - 36,
        text: "ACID · relational · user data",
        fill: "#94a3b8",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "pg-tech-note" },
    );
    overlay.add(
      "text",
      {
        x: POS.replica.x,
        y: POS.replica.y + 44,
        text: "reads distributed to replicas",
        fill: "#a5b4fc",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "replica-note" },
    );
    overlay.add(
      "text",
      {
        x: POS["message-broker"].x,
        y: POS["message-broker"].y + 46,
        text: "async task queues",
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
        text: "propagates to Cassandra",
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
        text: "feeds, activity, stories",
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
        y: POS["read-model"].y - 10,
        text: "NoSQL · peer-to-peer · eventual consistency",
        fill: "#86efac",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "read-model-caption" },
    );
    overlay.add(
      "text",
      {
        x: POS.memcached.x,
        y: POS.memcached.y + 44,
        text: "caches hot read data",
        fill: "#c4b5fd",
        fontSize: 8,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "memcached-note" },
    );

    /* CAP label */
    overlay.add(
      "text",
      {
        x: 580,
        y: 388,
        text: "CAP: Availability + Partition Tolerance",
        fill: state.staleRisk ? "#f59e0b" : "#94a3b8",
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "cap-label" },
    );

    /* Polyglot persistence label */
    overlay.add(
      "text",
      {
        x: 580,
        y: 408,
        text: "Polyglot Persistence",
        fill: "#e879f9",
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "polyglot-label" },
    );
  });
}

const instagramProfile: PatternAdapter["profile"] = {
  key: "instagram",
  label: "Instagram Case Study",
  shortLabel: "Instagram",
  color: "#e879f9",
  description:
    "Instagram operates at massive global scale with hundreds of millions of daily active users. It uses polyglot persistence — PostgreSQL (relational) for core user data with Master-Replica replication and Cassandra (NoSQL) for massive-scale feeds and activity streams with peer-to-peer architecture. This is CQRS in practice: different database technologies optimized for each side.",
  readStrategy:
    "Reads are served from Cassandra (peer-to-peer, eventual consistency) for feeds, activity streams, and stories. Memcached caches hot data. Extreme horizontal scalability with no single point of failure.",
  writeStrategy:
    "Writes go to PostgreSQL Master with ACID guarantees for strong consistency. User profiles, credentials, relationships, and core metadata are stored here. Replicas handle read overflow.",
  tradeoff:
    "Availability and partition tolerance are prioritized over immediate strong consistency (CAP theorem). Different data demands are matched to different database technologies.",
  bestFor:
    "Global-scale social platforms with billions of interactions, where read and write workloads have fundamentally different characteristics.",
  benefits: [
    "PostgreSQL ensures data integrity for core user data.",
    "Cassandra provides extreme horizontal scalability for feeds.",
    "Memcached delivers sub-millisecond reads for hot data.",
    "Each database technology is chosen for its specific strength.",
    "Multiple data centers serve users worldwide with low latency.",
  ],
  drawbacks: [
    "Eventual consistency for read-heavy Cassandra data.",
    "Operational complexity of managing multiple database technologies.",
    "Replication lag between PostgreSQL Master and Cassandra.",
    "CAP trade-off: availability over immediate consistency.",
  ],
};

export const instagramAdapter: PatternAdapter = {
  id: "instagram",
  profile: instagramProfile,
  computeMetrics(state) {
    state.readLatencyMs = 12;
    state.writeLatencyMs = 48;
    state.projectionLagMs = state.projectionState === "lagging" ? 3200 : 280;
    state.syncCallsAvoided = 4;
    state.staleRisk = state.projectionState === "lagging";
    state.consistencyModel = state.staleRisk
      ? "Eventual consistency — Cassandra lagging behind PostgreSQL"
      : "Eventual consistency — Cassandra caught up";
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
      case "$memcached":
        return ["memcached"];
      case "$replica":
        return ["replica"];
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
            explain:
              "A user action (post, like, follow) triggers a write request.",
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
              "Django routes the write to the appropriate handler for validation.",
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
              "PostgreSQL Master commits with ACID guarantees — the single source of truth for writes.",
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
              "After commit, a task is queued in RabbitMQ to propagate the change to Cassandra.",
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
              "The async worker picks up the task to update the Cassandra read model.",
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
              ? "Cassandra is still catching up — eventual consistency in action across data centers."
              : "Cassandra is updated. Feeds and activity streams reflect the latest state.",
          },
        ];
      case "client-query":
        return [
          {
            from: "$client",
            to: "$gateway",
            color: "#22c55e",
            duration: 620,
            explain: "A user opens their feed — a high-volume read request.",
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
              "Django routes the query to the read path — Cassandra and Memcached.",
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
              ? "Cassandra serves the feed, but some data may be briefly behind PostgreSQL."
              : "Cassandra serves the feed with extreme horizontal scalability. Memcached caches hot items.",
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
              "The response returns to the user. Billions of interactions served daily across data centers.",
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
        return "A user action (posting a photo, liking, following) enters the system. Instagram handles hundreds of millions of daily active users, so the write path must be robust and consistent.";
      case "route-command":
        return "Django application servers route the write to the correct handler. Business logic and validation happen here before anything is committed.";
      case "commit-write":
        return "PostgreSQL Master commits the change with ACID guarantees and relational integrity. Core user data (profiles, credentials, relationships) lives here — the single source of truth for writes. Master-Replica architecture means all writes go to the Master.";
      case "publish-event":
        return "After the PostgreSQL commit, RabbitMQ queues an async task to propagate the change. This decouples the fast write path from the slower cross-datacenter replication to Cassandra.";
      case "project-consume":
        return "Async workers consume the task from RabbitMQ and prepare the update for Cassandra. This happens off the original write request path, keeping writes fast.";
      case "refresh-view":
        return state.staleRisk
          ? `Cassandra is ${formatLag(state.projectionLagMs)} behind PostgreSQL. The peer-to-peer architecture prioritizes availability and partition tolerance (AP) — eventual consistency is the accepted trade-off at this scale.`
          : "Cassandra is updated. Its peer-to-peer (masterless) architecture means every node can handle reads and writes, providing extreme horizontal scalability and fault tolerance.";
      case "client-query":
        return "A user opens Instagram — feed, stories, activity. Reads are much higher volume than writes at this scale. Low latency is critical for user experience.";
      case "route-query":
        return "Django routes the query to the read path. Feed data comes from Cassandra, with Memcached caching the hottest data for sub-millisecond responses.";
      case "query-read":
        return state.staleRisk
          ? `Cassandra serves the feed at massive scale, but data is ${formatLag(state.projectionLagMs)} behind the write side. Users connect to the nearest data center for low latency — availability is prioritized over immediate consistency.`
          : "Cassandra serves feeds and activity streams with extreme scalability. Built-in sharding and no single point of failure. Memcached sits in front for the most-requested data.";
      case "return-response":
        return state.staleRisk
          ? "The feed loads fast even with stale data. Instagram's UI is designed to tolerate brief inconsistency — the CAP theorem trade-off in practice."
          : "Billions of interactions served daily. Different database technologies matched to different data demands — PostgreSQL for integrity, Cassandra for scale, Memcached for speed.";
      case "summary":
        return `Instagram's architecture is polyglot persistence + CQRS in practice. PostgreSQL Master handles writes with ACID (${state.writeLatencyMs}ms). Cassandra serves massive-scale reads (${state.readLatencyMs}ms). RabbitMQ propagates changes asynchronously (${formatLag(state.projectionLagMs)} lag). Memcached caches hot data. The CAP trade-off: availability and partition tolerance over immediate consistency. Multiple data centers worldwide serve hundreds of millions of daily active users.`;
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
      return "PostgreSQL Master Commits";
    }

    if (step.key === "publish-event") {
      return "Queue Task in RabbitMQ";
    }

    if (step.key === "project-consume") {
      return "Worker Consumes Task";
    }

    if (step.key === "refresh-view") {
      return state.staleRisk
        ? "Cassandra Still Catching Up"
        : "Cassandra Updated";
    }

    if (step.key === "query-read") {
      return state.staleRisk
        ? "Read Stale Feed Data"
        : "Read from Cassandra + Cache";
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
      "write-lane",
      370,
      86,
      440,
      130,
      "PostgreSQL (writes · ACID)",
      "#38bdf8",
      commandActive || summaryActive,
    );
    addFrame(
      builder,
      "sync-lane",
      860,
      238,
      196,
      310,
      "RabbitMQ (async)",
      "#f59e0b",
      syncActive || summaryActive,
    );
    addFrame(
      builder,
      "read-lane",
      370,
      416,
      440,
      140,
      "Cassandra (reads · NoSQL)",
      "#22c55e",
      queryActive || summaryActive,
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
      "Django",
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
      "Write Handler",
      helpers.hot("command-api"),
      "#0f172a",
      "rgba(14, 116, 144, 0.92)",
      "#38bdf8",
      158,
      58,
      16,
      () => helpers.openConcept("command-model"),
    );
    drawBox(
      builder,
      "write-model",
      "PostgreSQL Master",
      helpers.hot("write-model"),
      "#0f172a",
      "rgba(14, 116, 144, 0.92)",
      "#38bdf8",
      178,
      64,
      16,
      () => helpers.openConcept("instagram-postgres"),
    );
    drawBox(
      builder,
      "replica",
      "PG Replicas",
      helpers.hot("replica"),
      "#0f172a",
      "rgba(55, 48, 163, 0.72)",
      "#a5b4fc",
      140,
      48,
      14,
      () => helpers.openConcept("instagram-postgres"),
    );
    drawBox(
      builder,
      "message-broker",
      "RabbitMQ",
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
      "Async Worker",
      helpers.hot("projector"),
      "#201408",
      "rgba(120, 53, 15, 0.96)",
      "#f59e0b",
      148,
      58,
      16,
      () => helpers.openConcept("projection"),
    );
    drawBox(
      builder,
      "query-api",
      "Read Handler",
      helpers.hot("query-api"),
      "#0f172a",
      "rgba(20, 83, 45, 0.96)",
      "#22c55e",
      152,
      58,
      16,
      () => helpers.openConcept("instagram-cassandra"),
    );
    drawBox(
      builder,
      "read-model",
      "Cassandra",
      helpers.hot("read-model"),
      "#0f172a",
      "rgba(20, 83, 45, 0.96)",
      state.staleRisk ? "#f59e0b" : "#22c55e",
      166,
      64,
      18,
      () => helpers.openConcept("instagram-cassandra"),
    );
    drawBox(
      builder,
      "memcached",
      "Memcached",
      helpers.hot("memcached"),
      "#0f172a",
      "rgba(88, 28, 135, 0.72)",
      "#c4b5fd",
      140,
      50,
      14,
      () => helpers.openConcept("instagram-cache"),
    );

    /* Edges */
    builder
      .edge("client-app", "api-gateway", "e-client-gw")
      .stroke(
        edgeColor(
          helpers.hot("client-app") && helpers.hot("api-gateway"),
          queryActive ? "#22c55e" : "#38bdf8",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("api-gateway", "command-api", "e-gw-cmd")
      .stroke(
        edgeColor(
          helpers.hot("api-gateway") && helpers.hot("command-api"),
          "#38bdf8",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("command-api", "write-model", "e-cmd-pg")
      .stroke(
        edgeColor(
          helpers.hot("command-api") && helpers.hot("write-model"),
          "#38bdf8",
        ),
        1.8,
      )
      .arrow(true);

    /* Master → Replicas */
    builder
      .edge("write-model", "replica", "e-pg-replica")
      .stroke("#a5b4fc", 1.4)
      .arrow(true);

    /* Master → RabbitMQ */
    builder
      .edge("write-model", "message-broker", "e-pg-rmq")
      .stroke(
        edgeColor(
          helpers.hot("write-model") && helpers.hot("message-broker"),
          "#f59e0b",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("message-broker", "projector", "e-rmq-worker")
      .stroke(
        edgeColor(
          helpers.hot("message-broker") && helpers.hot("projector"),
          "#f59e0b",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("projector", "read-model", "e-worker-cass")
      .stroke(
        edgeColor(
          helpers.hot("projector") && helpers.hot("read-model"),
          state.staleRisk ? "#f59e0b" : "#22c55e",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("api-gateway", "query-api", "e-gw-query")
      .stroke(
        edgeColor(
          helpers.hot("api-gateway") && helpers.hot("query-api"),
          "#22c55e",
        ),
        1.8,
      )
      .arrow(true);

    builder
      .edge("query-api", "read-model", "e-query-cass")
      .stroke(
        edgeColor(
          helpers.hot("query-api") && helpers.hot("read-model"),
          state.staleRisk ? "#f59e0b" : "#22c55e",
        ),
        1.8,
      )
      .arrow(true);

    /* Query handler → Memcached */
    builder
      .edge("query-api", "memcached", "e-query-mc")
      .stroke(
        edgeColor(
          helpers.hot("query-api") && helpers.hot("memcached"),
          "#c4b5fd",
        ),
        1.4,
      )
      .arrow(true);

    addCallout(builder, state);
    addNodeNotes(builder, state);

    addBadge(
      builder,
      "lag-state",
      560,
      590,
      state.staleRisk
        ? `Replication lag: ${formatLag(state.projectionLagMs)}`
        : `Sync lag: ${formatLag(state.projectionLagMs)}`,
      state.staleRisk ? "rgba(120, 53, 15, 0.18)" : "rgba(20, 83, 45, 0.16)",
      state.staleRisk ? "#f59e0b" : "#22c55e",
    );
    addBadge(
      builder,
      "scale-note",
      310,
      590,
      "100M+ daily users · multiple DCs",
      "rgba(232, 121, 249, 0.12)",
      "#e879f9",
    );
  },
  getStatBadges(state) {
    return [
      {
        label: "Pattern",
        value: instagramProfile.shortLabel,
        color: instagramProfile.color,
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
        label: "Repl Lag",
        value: formatLag(state.projectionLagMs),
        color: state.staleRisk ? "#f59e0b" : "#22c55e",
      },
    ];
  },
  softReset() {},
};
