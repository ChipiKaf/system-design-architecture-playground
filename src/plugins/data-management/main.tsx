import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  CanvasStage,
  ConceptPills,
  PluginLayout,
  SideCard,
  SidePanel,
  StageHeader,
  StatBadge,
  useConceptModal,
} from "../../components/plugin-kit";
import { concepts, type ConceptKey } from "./concepts";
import { buildSteps } from "./flow-engine";
import {
  useDataManagementAnimation,
  type Signal,
} from "./useDataManagementAnimation";
import {
  VARIANT_PROFILES,
  type DataManagementState,
} from "./dataManagementSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1080;
const H = 620;

const SURFACE = "#0c182b";
const SURFACE_ALT = "#101f36";
const CONTROL_FILL = "#18172f";
const CONTROL_HOT = "#282653";
const STROKE = "#31445d";
const TEXT = "#f7fbff";
const MUTED = "#8ea3bf";
const HOT_FILL = "#173455";
const STORE_FILL = "#13281d";
const STORE_HOT = "#1a3a29";
const STORE_STROKE = "#3d6a4d";
const WARNING = "#fb7185";

type Builder = ReturnType<typeof viz>;
type HotCheck = (id: string) => boolean;

interface BoxOptions {
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  hotFill?: string;
  stroke?: string;
  hotStroke?: string;
  fontSize?: number;
}

interface ServicePairSpec {
  serviceId: string;
  serviceLabel: string;
  dbId: string;
  dbLabel: string;
  x: number;
  y: number;
}

interface EdgeOptions {
  color?: string;
  width?: number;
  dashed?: boolean;
  label?: string;
}

function addCallout(
  builder: Builder,
  id: string,
  title: string,
  lines: string[],
  accent: string,
  fill = "rgba(8, 18, 34, 0.9)",
) {
  builder.overlay((overlay) => {
    overlay.add(
      "rect",
      {
        x: 70,
        y: 112,
        w: 360,
        h: 96,
        rx: 18,
        ry: 18,
        fill,
        stroke: accent,
        strokeWidth: 1.4,
        opacity: 0.98,
      },
      { key: `callout-${id}` },
    );
    overlay.add(
      "text",
      {
        x: 92,
        y: 140,
        text: title,
        fill: accent,
        fontSize: 12,
        fontWeight: 700,
      },
      { key: `callout-title-${id}` },
    );

    lines.forEach((line, index) => {
      overlay.add(
        "text",
        {
          x: 92,
          y: 162 + index * 18,
          text: line,
          fill: TEXT,
          fontSize: 9,
          fontWeight: 500,
        },
        { key: `callout-line-${id}-${index}` },
      );
    });
  });
}

function drawBox(
  builder: Builder,
  id: string,
  x: number,
  y: number,
  label: string,
  hot: HotCheck,
  options: BoxOptions = {},
) {
  const {
    width = 150,
    height = 50,
    radius = 12,
    fill = SURFACE_ALT,
    hotFill = HOT_FILL,
    stroke = STROKE,
    hotStroke = stroke,
    fontSize = 12,
  } = options;

  builder
    .node(id)
    .at(x, y)
    .rect(width, height, radius)
    .fill(hot(id) ? hotFill : fill)
    .stroke(hot(id) ? hotStroke : stroke, 2)
    .label(label, { fill: TEXT, fontSize, fontWeight: "bold" });
}

function drawDataStore(
  builder: Builder,
  id: string,
  x: number,
  y: number,
  label: string,
  hot: HotCheck,
) {
  drawBox(builder, id, x, y, label, hot, {
    width: 96,
    height: 30,
    radius: 8,
    fill: STORE_FILL,
    hotFill: STORE_HOT,
    stroke: STORE_STROKE,
    hotStroke: "#4ade80",
    fontSize: 9,
  });
}

function drawSharedTable(
  builder: Builder,
  id: string,
  x: number,
  y: number,
  label: string,
  hot: HotCheck,
) {
  drawBox(builder, id, x, y, label, hot, {
    width: 136,
    height: 36,
    radius: 10,
    fill: "#31121d",
    hotFill: "#4a1b2a",
    stroke: "#8d4f63",
    hotStroke: WARNING,
    fontSize: 9,
  });
}

function drawFlowEdge(
  builder: Builder,
  from: string,
  to: string,
  id: string,
  options: EdgeOptions = {},
) {
  const edge = builder
    .edge(from, to, id)
    .stroke(options.color ?? STROKE, options.width ?? 1.4)
    .arrow(true);

  if (options.dashed) edge.dashed();
  if (options.label) {
    edge.label(options.label, { fill: MUTED, fontSize: 8 });
  }
}

function addSceneHeader(
  builder: Builder,
  title: string,
  subtitle: string,
  accent: string,
) {
  builder.overlay((overlay) => {
    overlay.add(
      "text",
      {
        x: W / 2,
        y: 58,
        text: title,
        fill: TEXT,
        fontSize: 18,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: `header-${title}` },
    );
    overlay.add(
      "text",
      {
        x: W / 2,
        y: 80,
        text: subtitle,
        fill: accent,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
      },
      { key: `header-sub-${title}` },
    );
  });
}

function addBanner(builder: Builder, id: string, text: string, accent: string) {
  builder.overlay((overlay) => {
    overlay.add(
      "rect",
      {
        x: 70,
        y: 554,
        w: 940,
        h: 38,
        rx: 14,
        ry: 14,
        fill: "rgba(8, 18, 34, 0.92)",
        stroke: accent,
        strokeWidth: 1.4,
        opacity: 0.96,
      },
      { key: `banner-${id}` },
    );
    overlay.add(
      "text",
      {
        x: 94,
        y: 578,
        text,
        fill: TEXT,
        fontSize: 10,
        fontWeight: 600,
      },
      { key: `banner-text-${id}` },
    );
  });
}

function drawClientNode(builder: Builder, hot: HotCheck) {
  drawBox(builder, "client-app", 120, 310, "Client App", hot, {
    width: 132,
    height: 56,
    fill: SURFACE,
    hotFill: HOT_FILL,
    stroke: "#4c6a92",
    hotStroke: "#93c5fd",
    fontSize: 13,
  });
}

function drawGatewayNode(
  builder: Builder,
  id: string,
  label: string,
  x: number,
  y: number,
  hot: HotCheck,
  accent: string,
) {
  drawBox(builder, id, x, y, label, hot, {
    width: 150,
    height: 56,
    fill: CONTROL_FILL,
    hotFill: CONTROL_HOT,
    stroke: accent,
    hotStroke: accent,
    fontSize: 13,
  });
}

function drawServicePair(
  builder: Builder,
  hot: HotCheck,
  accent: string,
  spec: ServicePairSpec,
) {
  drawBox(builder, spec.serviceId, spec.x, spec.y, spec.serviceLabel, hot, {
    fill: SURFACE_ALT,
    hotFill: HOT_FILL,
    stroke: accent,
    hotStroke: accent,
    fontSize: 11,
  });
  drawDataStore(builder, spec.dbId, spec.x, spec.y + 58, spec.dbLabel, hot);
  drawFlowEdge(
    builder,
    spec.serviceId,
    spec.dbId,
    `edge-${spec.serviceId}-${spec.dbId}`,
    { dashed: true, color: STROKE },
  );
}

function buildDatabasePerServiceScene(
  builder: Builder,
  hot: HotCheck,
  profile: (typeof VARIANT_PROFILES)["database-per-service"],
) {
  const services: ServicePairSpec[] = [
    {
      serviceId: "svc-catalog",
      serviceLabel: "Catalog",
      dbId: "db-catalog",
      dbLabel: "Catalog DB",
      x: 620,
      y: 190,
    },
    {
      serviceId: "svc-ordering",
      serviceLabel: "Ordering",
      dbId: "db-ordering",
      dbLabel: "Orders DB",
      x: 830,
      y: 190,
    },
    {
      serviceId: "svc-basket",
      serviceLabel: "Basket",
      dbId: "db-basket",
      dbLabel: "Basket DB",
      x: 620,
      y: 390,
    },
    {
      serviceId: "svc-identity",
      serviceLabel: "Identity",
      dbId: "db-identity",
      dbLabel: "Identity DB",
      x: 830,
      y: 390,
    },
  ];

  addSceneHeader(
    builder,
    "Private data ownership",
    "Service APIs expose data; databases stay private",
    profile.color,
  );

  drawClientNode(builder, hot);
  drawGatewayNode(
    builder,
    "api-gateway",
    "API Gateway",
    310,
    310,
    hot,
    profile.color,
  );
  drawFlowEdge(builder, "client-app", "api-gateway", "edge-client-gateway");

  services.forEach((service) => {
    drawServicePair(builder, hot, profile.color, service);
    drawFlowEdge(
      builder,
      "api-gateway",
      service.serviceId,
      `edge-gateway-${service.serviceId}`,
    );
  });

  drawFlowEdge(
    builder,
    "svc-ordering",
    "svc-catalog",
    "edge-ordering-catalog",
    {
      color: "#22c55e",
      dashed: true,
      label: "API only",
    },
  );

  addBanner(
    builder,
    "db-per-service",
    "Implemented: one transition per step from gateway ingress to owned data access.",
    profile.color,
  );
}

function buildSharedDatabaseScene(
  builder: Builder,
  hot: HotCheck,
  profile: (typeof VARIANT_PROFILES)["shared-database"],
  phase: string,
) {
  const services = [
    { id: "svc-catalog", label: "Catalog", x: 560, y: 170 },
    { id: "svc-basket", label: "Basket", x: 560, y: 310 },
    { id: "svc-ordering", label: "Ordering", x: 560, y: 450 },
  ];

  addSceneHeader(
    builder,
    "One database, many owners",
    "Simple joins now, schema coupling later",
    profile.color,
  );

  drawClientNode(builder, hot);
  drawGatewayNode(
    builder,
    "api-gateway",
    "API Gateway",
    310,
    310,
    hot,
    profile.color,
  );
  drawFlowEdge(builder, "client-app", "api-gateway", "edge-client-shared");

  drawBox(builder, "db-shared", 890, 310, "", hot, {
    width: 250,
    height: 312,
    fill: "#2a1120",
    hotFill: "#3b1829",
    stroke: "#7f1d1d",
    hotStroke: WARNING,
  });

  drawSharedTable(builder, "table-catalog", 890, 220, "catalog.*", hot);
  drawSharedTable(builder, "table-basket", 890, 310, "basket.*", hot);
  drawSharedTable(builder, "table-orders", 890, 400, "orders.*", hot);

  builder.overlay((overlay) => {
    overlay.add(
      "text",
      {
        x: 890,
        y: 154,
        text: "Shared PostgreSQL",
        fill: TEXT,
        fontSize: 14,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "shared-db-title" },
    );
    overlay.add(
      "text",
      {
        x: 890,
        y: 172,
        text: "One schema becomes the real contract",
        fill: MUTED,
        fontSize: 9,
        fontWeight: 600,
        textAnchor: "middle",
      },
      { key: "shared-db-subtitle" },
    );
    overlay.add(
      "rect",
      {
        x: 940,
        y: 104,
        w: 112,
        h: 32,
        rx: 12,
        ry: 12,
        fill: "rgba(88, 22, 40, 0.94)",
        stroke: WARNING,
        strokeWidth: 1.2,
      },
      { key: "shared-db-badge" },
    );
    overlay.add(
      "text",
      {
        x: 996,
        y: 124,
        text: "Anti-pattern",
        fill: "#fecdd3",
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "shared-db-badge-text" },
    );
  });

  services.forEach((service) => {
    drawBox(builder, service.id, service.x, service.y, service.label, hot, {
      stroke: profile.color,
      hotStroke: profile.color,
      fontSize: 11,
    });
    drawFlowEdge(
      builder,
      "api-gateway",
      service.id,
      `edge-shared-gw-${service.id}`,
    );
  });

  drawFlowEdge(builder, "svc-catalog", "table-catalog", "edge-catalog-table", {
    color: profile.color,
  });
  drawFlowEdge(builder, "svc-basket", "table-basket", "edge-basket-table", {
    color: "#4ade80",
  });
  drawFlowEdge(
    builder,
    "svc-basket",
    "table-catalog",
    "edge-basket-catalog-table",
    {
      color: "#f59e0b",
      dashed: true,
      label: "direct join",
    },
  );
  drawFlowEdge(builder, "svc-basket", "svc-ordering", "edge-basket-ordering", {
    color: profile.color,
    dashed: true,
    label: "handoff",
  });
  drawFlowEdge(builder, "svc-ordering", "table-orders", "edge-ordering-table", {
    color: "#4ade80",
  });

  addBanner(
    builder,
    "shared-db",
    "Implemented: follow the convenience first, then the coupling and failure ripple one transition at a time.",
    profile.color,
  );

  switch (phase) {
    case "shared-local-read":
      addCallout(
        builder,
        "shared-local-read",
        "Why Teams Accept It",
        [
          "Basket reads shared rows directly.",
          "Simple local queries feel fast and productive.",
        ],
        "#4ade80",
      );
      break;
    case "shared-direct-join":
      addCallout(
        builder,
        "shared-direct-join",
        "Boundary Violation",
        [
          "Basket joins Catalog tables with no API hop.",
          "Now Basket depends on Catalog's schema details.",
        ],
        "#f59e0b",
        "rgba(55, 32, 10, 0.94)",
      );
      break;
    case "shared-handoff":
      addCallout(
        builder,
        "shared-handoff",
        "Looks Decoupled, Isn't",
        [
          "Ordering is a separate service in code.",
          "The real contract is still the shared schema underneath.",
        ],
        profile.color,
      );
      break;
    case "shared-shared-write":
      addCallout(
        builder,
        "shared-write",
        "Short-Term Benefit",
        [
          "Ordering writes into the same database.",
          "One ACID transaction is easy across shared tables.",
        ],
        "#4ade80",
      );
      break;
    case "shared-schema-coupling":
      addCallout(
        builder,
        "shared-schema-coupling",
        "Schema Coupling",
        [
          "Ordering changes the orders table.",
          "Basket's SQL and release now need to move too.",
        ],
        WARNING,
        "rgba(63, 18, 29, 0.96)",
      );
      break;
    case "shared-outage-catalog":
      addCallout(
        builder,
        "shared-outage-catalog",
        "Single Point of Failure",
        [
          "The shared DB is unhealthy.",
          "Catalog stalls even though its service code is fine.",
        ],
        WARNING,
        "rgba(63, 18, 29, 0.96)",
      );
      break;
    case "shared-outage-ordering":
      addCallout(
        builder,
        "shared-outage-ordering",
        "Failure Ripple",
        [
          "Ordering stalls too.",
          "One database outage becomes a multi-service outage.",
        ],
        WARNING,
        "rgba(63, 18, 29, 0.96)",
      );
      break;
    default:
      addCallout(
        builder,
        "shared-overview",
        "Why It Is Tempting",
        [
          "One schema makes joins and transactions feel easy.",
          "That convenience turns the database into the real coupling point.",
        ],
        profile.color,
      );
      break;
  }
}

function buildApiCompositionScene(
  builder: Builder,
  hot: HotCheck,
  profile: (typeof VARIANT_PROFILES)["api-composition"],
) {
  const services: ServicePairSpec[] = [
    {
      serviceId: "svc-catalog",
      serviceLabel: "Catalog",
      dbId: "db-catalog",
      dbLabel: "Catalog DB",
      x: 660,
      y: 180,
    },
    {
      serviceId: "svc-ordering",
      serviceLabel: "Ordering",
      dbId: "db-ordering",
      dbLabel: "Orders DB",
      x: 840,
      y: 180,
    },
    {
      serviceId: "svc-basket",
      serviceLabel: "Basket",
      dbId: "db-basket",
      dbLabel: "Basket DB",
      x: 750,
      y: 400,
    },
  ];

  addSceneHeader(
    builder,
    "Compose read models at request time",
    "A composer fans out and stitches one client response",
    profile.color,
  );

  drawClientNode(builder, hot);
  drawGatewayNode(
    builder,
    "api-composer",
    "API Composer",
    320,
    310,
    hot,
    profile.color,
  );
  drawFlowEdge(builder, "client-app", "api-composer", "edge-client-composer");

  services.forEach((service) => {
    drawServicePair(builder, hot, profile.color, service);
    drawFlowEdge(
      builder,
      "api-composer",
      service.serviceId,
      `edge-composer-${service.serviceId}`,
      { dashed: true, color: profile.color },
    );
  });

  addBanner(
    builder,
    "api-composition",
    "Placeholder: request-time fan-out and stitching flow still needs step-by-step animation.",
    profile.color,
  );
}

function buildCqrsScene(
  builder: Builder,
  hot: HotCheck,
  profile: (typeof VARIANT_PROFILES)["cqrs"],
) {
  addSceneHeader(
    builder,
    "Separate write intent from read views",
    "Commands update the write side; queries hit projections",
    profile.color,
  );

  drawClientNode(builder, hot);
  drawBox(builder, "command-api", 320, 220, "Command API", hot, {
    fill: CONTROL_FILL,
    hotFill: CONTROL_HOT,
    stroke: profile.color,
    hotStroke: profile.color,
  });
  drawBox(builder, "query-api", 320, 400, "Query API", hot, {
    fill: CONTROL_FILL,
    hotFill: CONTROL_HOT,
    stroke: profile.color,
    hotStroke: profile.color,
  });
  drawBox(builder, "write-model", 560, 220, "Write Model", hot, {
    stroke: profile.color,
    hotStroke: profile.color,
  });
  drawBox(builder, "event-bus", 790, 220, "Event Bus", hot, {
    fill: "#2b2211",
    hotFill: "#453317",
    stroke: "#a16207",
    hotStroke: "#fbbf24",
  });
  drawBox(builder, "projection-worker", 560, 400, "Projector", hot, {
    fill: CONTROL_FILL,
    hotFill: CONTROL_HOT,
    stroke: "#38bdf8",
    hotStroke: "#38bdf8",
  });
  drawBox(builder, "read-model", 790, 400, "Read Model", hot, {
    fill: STORE_FILL,
    hotFill: STORE_HOT,
    stroke: STORE_STROKE,
    hotStroke: "#4ade80",
  });

  drawFlowEdge(builder, "client-app", "command-api", "edge-client-command");
  drawFlowEdge(builder, "client-app", "query-api", "edge-client-query");
  drawFlowEdge(builder, "command-api", "write-model", "edge-command-write");
  drawFlowEdge(builder, "write-model", "event-bus", "edge-write-event");
  drawFlowEdge(
    builder,
    "event-bus",
    "projection-worker",
    "edge-event-projector",
  );
  drawFlowEdge(
    builder,
    "projection-worker",
    "read-model",
    "edge-projector-read",
  );
  drawFlowEdge(builder, "query-api", "read-model", "edge-query-read", {
    dashed: true,
  });

  addBanner(
    builder,
    "cqrs",
    "Placeholder: write/read split is shown, but projection lag walkthrough still needs implementation.",
    profile.color,
  );
}

function buildEventSourcingScene(
  builder: Builder,
  hot: HotCheck,
  profile: (typeof VARIANT_PROFILES)["event-sourcing"],
) {
  addSceneHeader(
    builder,
    "The event log is the source of truth",
    "State is rebuilt from facts and projected into read models",
    profile.color,
  );

  drawClientNode(builder, hot);
  drawBox(builder, "command-service", 320, 310, "Command Service", hot, {
    stroke: profile.color,
    hotStroke: profile.color,
  });
  drawBox(builder, "event-store", 600, 190, "Event Store", hot, {
    width: 180,
    fill: "#2b2211",
    hotFill: "#453317",
    stroke: profile.color,
    hotStroke: profile.color,
  });
  drawBox(builder, "projection-worker", 600, 430, "Projection Worker", hot, {
    fill: CONTROL_FILL,
    hotFill: CONTROL_HOT,
    stroke: "#38bdf8",
    hotStroke: "#38bdf8",
  });
  drawBox(builder, "analytics-view", 860, 190, "Replay Consumer", hot, {
    stroke: profile.color,
    hotStroke: profile.color,
  });
  drawBox(builder, "read-model", 860, 430, "Read Model", hot, {
    fill: STORE_FILL,
    hotFill: STORE_HOT,
    stroke: STORE_STROKE,
    hotStroke: "#4ade80",
  });

  drawFlowEdge(
    builder,
    "client-app",
    "command-service",
    "edge-client-command-service",
  );
  drawFlowEdge(
    builder,
    "command-service",
    "event-store",
    "edge-command-event-store",
  );
  drawFlowEdge(
    builder,
    "event-store",
    "projection-worker",
    "edge-event-projector-worker",
  );
  drawFlowEdge(
    builder,
    "projection-worker",
    "read-model",
    "edge-worker-read-model",
  );
  drawFlowEdge(
    builder,
    "event-store",
    "analytics-view",
    "edge-event-analytics",
    {
      dashed: true,
    },
  );

  addBanner(
    builder,
    "event-sourcing",
    "Placeholder: replay, projection, and rebuild steps still need one-transition-at-a-time animation.",
    profile.color,
  );
}

function buildSagaScene(
  builder: Builder,
  hot: HotCheck,
  profile: (typeof VARIANT_PROFILES)["saga"],
) {
  addSceneHeader(
    builder,
    "Coordinate local transactions with a workflow",
    "The orchestrator drives forward steps and compensations",
    profile.color,
  );

  drawClientNode(builder, hot);
  drawServicePair(builder, hot, profile.color, {
    serviceId: "svc-ordering",
    serviceLabel: "Order Service",
    dbId: "db-ordering",
    dbLabel: "Orders DB",
    x: 300,
    y: 310,
  });
  drawBox(builder, "saga-orchestrator", 540, 310, "Saga Orchestrator", hot, {
    fill: CONTROL_FILL,
    hotFill: CONTROL_HOT,
    stroke: profile.color,
    hotStroke: profile.color,
    width: 172,
  });

  const participants: ServicePairSpec[] = [
    {
      serviceId: "svc-payment",
      serviceLabel: "Payment",
      dbId: "db-payment",
      dbLabel: "Payment DB",
      x: 840,
      y: 170,
    },
    {
      serviceId: "svc-inventory",
      serviceLabel: "Inventory",
      dbId: "db-inventory",
      dbLabel: "Inventory DB",
      x: 840,
      y: 310,
    },
    {
      serviceId: "svc-shipping",
      serviceLabel: "Shipping",
      dbId: "db-shipping",
      dbLabel: "Shipping DB",
      x: 840,
      y: 450,
    },
  ];

  drawFlowEdge(builder, "client-app", "svc-ordering", "edge-client-order-svc");
  drawFlowEdge(builder, "svc-ordering", "saga-orchestrator", "edge-order-saga");

  participants.forEach((participant) => {
    drawServicePair(builder, hot, profile.color, participant);
    drawFlowEdge(
      builder,
      "saga-orchestrator",
      participant.serviceId,
      `edge-saga-${participant.serviceId}`,
      { dashed: true, color: profile.color },
    );
  });

  addBanner(
    builder,
    "saga",
    "Placeholder: compensating steps and failure branches still need detailed walkthrough animation.",
    profile.color,
  );
}

function buildSceneForVariant(
  builder: Builder,
  hot: HotCheck,
  variant: DataManagementState["variant"],
  phase: DataManagementState["phase"],
) {
  switch (variant) {
    case "database-per-service":
      buildDatabasePerServiceScene(builder, hot, VARIANT_PROFILES[variant]);
      break;
    case "shared-database":
      buildSharedDatabaseScene(builder, hot, VARIANT_PROFILES[variant], phase);
      break;
    case "api-composition":
      buildApiCompositionScene(builder, hot, VARIANT_PROFILES[variant]);
      break;
    case "cqrs":
      buildCqrsScene(builder, hot, VARIANT_PROFILES[variant]);
      break;
    case "event-sourcing":
      buildEventSourcingScene(builder, hot, VARIANT_PROFILES[variant]);
      break;
    case "saga":
      buildSagaScene(builder, hot, VARIANT_PROFILES[variant]);
      break;
  }
}

const DataManagementVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, signals } = useDataManagementAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const state = runtime as DataManagementState;
  const { explanation, hotZones, phase, variant } = state;
  const profile = VARIANT_PROFILES[variant];
  const walkthroughSteps = buildSteps(state);
  const statusLabel =
    profile.status === "implemented" ? "Implemented" : "Placeholder";
  const coverageText =
    profile.status === "implemented"
      ? variant === "shared-database"
        ? "This anti-pattern now has a full walkthrough. Each step isolates one convenience, one shortcut, or one failure ripple."
        : "This pattern has a full step-by-step walkthrough. Each step advances one request or one data handoff."
      : profile.placeholderNote;

  const scene = useMemo(() => {
    const builder = viz().view(W, H);
    const isHot = (zone: string) => hotZones.includes(zone);

    buildSceneForVariant(builder, isHot, variant, phase);

    if (signals.length > 0) {
      builder.overlay((overlay) => {
        signals.forEach((signal: Signal) => {
          const { id, colorClass, ...params } = signal;
          overlay.add("signal", params as SignalOverlayParams, {
            key: id,
            className: colorClass,
          });
        });
      });
    }

    return builder;
  }, [hotZones, phase, signals, variant]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 0.92,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
    const unsubscribe = pzRef.current?.onChange((next) => {
      viewportRef.current = next;
    });
    return () => {
      unsubscribe?.();
    };
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  const pills = [
    {
      key: "database-per-service",
      label: "DB per Service",
      color: "#7dd3fc",
      borderColor: "#38bdf8",
    },
    {
      key: "shared-database",
      label: "Shared DB",
      color: "#fda4af",
      borderColor: "#fb7185",
    },
    {
      key: "api-composition",
      label: "API Composition",
      color: "#5eead4",
      borderColor: "#14b8a6",
    },
    {
      key: "cqrs",
      label: "CQRS",
      color: "#bef264",
      borderColor: "#84cc16",
    },
    {
      key: "event-sourcing",
      label: "Event Sourcing",
      color: "#fcd34d",
      borderColor: "#f59e0b",
    },
    {
      key: "saga",
      label: "Saga",
      color: "#c4b5fd",
      borderColor: "#818cf8",
    },
  ];

  const rootClass = [
    "data-management-root",
    `data-management-phase--${phase}`,
  ].join(" ");

  return (
    <div className={rootClass}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="data-management-stage">
            <StageHeader
              title="Microservice Data Management"
              subtitle={`${profile.label} | ${profile.accentText}`}
            >
              <StatBadge
                label="Pattern"
                value={profile.shortLabel}
                color={profile.color}
              />
              <StatBadge
                label="Stores"
                value={state.dataStoreCount}
                color="#4ade80"
              />
              <StatBadge
                label="Boundary"
                value={`${state.ownershipStrength}/5`}
                color="#38bdf8"
              />
              <StatBadge
                label="Workflow Cost"
                value={`${state.coordinationCost}/5`}
                color="#f59e0b"
              />
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>

            <SideCard label="Active Pattern" variant="info">
              <div className="data-management-profile">
                <div className="data-management-profile__row">
                  <p
                    className="data-management-profile__title"
                    style={{ color: profile.color }}
                  >
                    {profile.label}
                  </p>
                  <span
                    className={`data-management-profile__status data-management-profile__status--${profile.status}`}
                  >
                    {statusLabel}
                  </span>
                </div>
                <p className="data-management-profile__accent">
                  {profile.accentText}
                </p>
                <p>{profile.description}</p>
              </div>
            </SideCard>

            <SideCard label="Data Contract">
              <dl className="data-management-facts">
                <div className="data-management-facts__item">
                  <dt>Ownership</dt>
                  <dd>{profile.dataOwnership}</dd>
                </div>
                <div className="data-management-facts__item">
                  <dt>Reads</dt>
                  <dd>{profile.readPattern}</dd>
                </div>
                <div className="data-management-facts__item">
                  <dt>Writes</dt>
                  <dd>{profile.writePattern}</dd>
                </div>
                <div className="data-management-facts__item">
                  <dt>Transactions</dt>
                  <dd>{profile.transactionPattern}</dd>
                </div>
              </dl>
            </SideCard>

            {(profile.benefits?.length ||
              profile.drawbacks?.length ||
              profile.decisionRule) && (
              <SideCard label="Trade-offs" variant="info">
                <div className="data-management-tradeoffs">
                  {profile.benefits?.length ? (
                    <div className="data-management-tradeoffs__section">
                      <p className="data-management-tradeoffs__heading">
                        Benefits
                      </p>
                      <ul className="data-management-tradeoffs__list">
                        {profile.benefits.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {profile.drawbacks?.length ? (
                    <div className="data-management-tradeoffs__section data-management-tradeoffs__section--risk">
                      <p className="data-management-tradeoffs__heading">
                        Drawbacks
                      </p>
                      <ul className="data-management-tradeoffs__list">
                        {profile.drawbacks.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {profile.decisionRule ? (
                    <p className="data-management-tradeoffs__decision">
                      {profile.decisionRule}
                    </p>
                  ) : null}
                </div>
              </SideCard>
            )}

            <SideCard label="Walkthrough">
              <ol className="data-management-steps">
                {walkthroughSteps.map((step, index) => (
                  <li key={step.key}>
                    <span className="data-management-steps__index">
                      {index + 1}
                    </span>
                    <span>{step.label}</span>
                  </li>
                ))}
              </ol>
            </SideCard>

            <SideCard label="Coverage" variant="info">
              <p>{coverageText}</p>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default DataManagementVisualization;
