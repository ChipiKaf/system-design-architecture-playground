import React, { useLayoutEffect, useRef, useEffect } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  useConceptModal,
  ConceptPills,
  PluginLayout,
  StageHeader,
  StatBadge,
  SidePanel,
  SideCard,
  CanvasStage,
} from "../../components/plugin-kit";
import type { PillDef } from "../../components/plugin-kit/ConceptPills";
import { concepts, type ConceptKey } from "./concepts";
import {
  useMicroserviceCommAnimation,
  type Signal,
} from "./useMicroserviceCommAnimation";
import {
  VARIANT_PROFILES,
  type MicroserviceCommState,
  type ProtocolKey,
} from "./microserviceCommSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 920;
const H = 540;

/* ── Shared helpers ───────────────────────────────────── */

const COUPLING_COLOR: Record<string, string> = {
  tight: "#ef4444",
  moderate: "#f59e0b",
  loose: "#22c55e",
};

type Builder = ReturnType<typeof viz>;
type HotFn = (zone: string) => boolean;

/** standard dark node */
const darkNode = (
  b: Builder,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  hot: HotFn,
  color: string,
  opts?: { fontSize?: number; labelColor?: string },
) => {
  b.node(id)
    .at(x, y)
    .rect(w, h, 12)
    .fill(hot(id) ? "#1e3a5f" : "#0f172a")
    .stroke(hot(id) ? color : "#334155", 2)
    .label(label, {
      fill: opts?.labelColor ?? "#e2e8f0",
      fontSize: opts?.fontSize ?? 11,
      fontWeight: "bold",
    });
};

/** small AWS service node */
const awsNode = (
  b: Builder,
  id: string,
  x: number,
  y: number,
  label: string,
  hot: HotFn,
  color: string,
) => {
  b.node(id)
    .at(x, y)
    .rect(100, 40, 10)
    .fill(hot(id) ? "#1a2742" : "#0c1222")
    .stroke(hot(id) ? color : "#1e293b", 1.5)
    .label(label, { fill: "#94a3b8", fontSize: 9, fontWeight: "bold" });
};

/** database-shaped node */
const dbNode = (
  b: Builder,
  id: string,
  x: number,
  y: number,
  label: string,
  hot: HotFn,
  color: string,
) => {
  b.node(id)
    .at(x, y)
    .rect(90, 36, 14)
    .fill(hot(id) ? "#1c1917" : "#0a0a0f")
    .stroke(hot(id) ? color : "#292524", 1.5)
    .label(label, { fill: "#a8a29e", fontSize: 9, fontWeight: "bold" });
};

/** broker / queue-shaped node */
const brokerNode = (
  b: Builder,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  hot: HotFn,
  color: string,
) => {
  b.node(id)
    .at(x, y)
    .rect(w, h, 8)
    .fill(hot(id) ? "#2a1a04" : "#1a1a2e")
    .stroke(hot(id) ? color : "#475569", 2)
    .label(label, { fill: color, fontSize: 10, fontWeight: "bold" });
};

/** partition/log node */
const partitionNode = (
  b: Builder,
  id: string,
  x: number,
  y: number,
  label: string,
  hot: HotFn,
  color: string,
) => {
  b.node(id)
    .at(x, y)
    .rect(80, 34, 6)
    .fill(hot(id) ? "#1e1045" : "#0f0a22")
    .stroke(hot(id) ? color : "#312e81", 1.5)
    .label(label, { fill: "#a78bfa", fontSize: 9, fontWeight: "bold" });
};

/* ════════════════════════════════════════════════════════
   Per-Protocol Scene Builders
   ════════════════════════════════════════════════════════ */

function buildHttpRestScene(b: Builder, hot: HotFn, signals: Signal[]) {
  /*  Layout:
      Client → API Gateway → ALB → Order Service → DynamoDB (Order)
                                  ↕ (via ALB)
                                  Product Service → DynamoDB (Product)  */

  darkNode(b, "client", 50, 230, 90, 44, "Client", hot, "#60a5fa");
  awsNode(b, "api-gw", 195, 230, "API Gateway", hot, "#3b82f6");
  awsNode(b, "alb", 345, 230, "ALB", hot, "#3b82f6");
  darkNode(b, "svc-order", 510, 160, 120, 48, "Order Service", hot, "#3b82f6", {
    fontSize: 10,
  });
  darkNode(
    b,
    "svc-product",
    510,
    310,
    120,
    48,
    "Product Service",
    hot,
    "#60a5fa",
    { fontSize: 10 },
  );
  dbNode(b, "dynamo-o", 700, 160, "DynamoDB", hot, "#f59e0b");
  dbNode(b, "dynamo-p", 700, 310, "DynamoDB", hot, "#f59e0b");

  // Main flow edges
  b.edge("client", "api-gw", "e-1")
    .stroke("#475569", 2)
    .arrow(true)
    .label("POST /orders", { fill: "#64748b", fontSize: 8 });
  b.edge("api-gw", "alb", "e-2")
    .stroke("#475569", 2)
    .arrow(true)
    .label("route", { fill: "#64748b", fontSize: 8 });
  b.edge("alb", "svc-order", "e-3")
    .stroke("#475569", 2)
    .arrow(true)
    .label("/orders", { fill: "#64748b", fontSize: 8 });
  b.edge("svc-order", "dynamo-o", "e-4")
    .stroke("#334155", 1.5)
    .arrow(true)
    .dashed();
  b.edge("svc-order", "alb", "e-5")
    .stroke("#334155", 1.5)
    .arrow(true)
    .dashed()
    .label("GET /products", { fill: "#475569", fontSize: 7 });
  b.edge("alb", "svc-product", "e-6")
    .stroke("#475569", 2)
    .arrow(true)
    .label("/products", { fill: "#64748b", fontSize: 8 });
  b.edge("svc-product", "dynamo-p", "e-7")
    .stroke("#334155", 1.5)
    .arrow(true)
    .dashed();
  // Response edges
  b.edge("svc-product", "svc-order", "e-r1")
    .stroke("#1e3a3a", 1)
    .arrow(true)
    .dashed();
  b.edge("svc-order", "alb", "e-r2").stroke("#1e3a3a", 1).arrow(true).dashed();
  b.edge("alb", "api-gw", "e-r3").stroke("#1e3a3a", 1).arrow(true).dashed();
  b.edge("api-gw", "client", "e-r4")
    .stroke("#1e3a3a", 1)
    .arrow(true)
    .dashed()
    .label("response", { fill: "#475569", fontSize: 7 });

  // Overlays
  b.overlay((o) => {
    o.add(
      "rect",
      {
        x: W - 130,
        y: 16,
        w: 110,
        h: 24,
        rx: 8,
        ry: 8,
        fill: "rgba(0,0,0,0.5)",
        stroke: "#3b82f6",
        strokeWidth: 1.5,
        opacity: 1,
      },
      { key: "badge-bg" },
    );
    o.add(
      "text",
      {
        x: W - 75,
        y: 32,
        text: "SYNC · REST",
        fill: "#3b82f6",
        fontSize: 11,
        fontWeight: "bold",
      },
      { key: "badge" },
    );
    o.add(
      "text",
      {
        x: W / 2,
        y: H - 16,
        text: "JSON payload · Path-based routing · Caller blocked per hop",
        fill: "#475569",
        fontSize: 9,
      },
      { key: "footer" },
    );
    // AWS labels
    o.add(
      "text",
      { x: 195, y: 212, text: "☁ Amazon", fill: "#475569", fontSize: 7 },
      { key: "aws-gw" },
    );
    o.add(
      "text",
      { x: 345, y: 212, text: "☁ Amazon", fill: "#475569", fontSize: 7 },
      { key: "aws-alb" },
    );
    o.add(
      "text",
      { x: 510, y: 138, text: "ECS Fargate", fill: "#334155", fontSize: 7 },
      { key: "aws-ecs1" },
    );
    o.add(
      "text",
      { x: 510, y: 288, text: "ECS Fargate", fill: "#334155", fontSize: 7 },
      { key: "aws-ecs2" },
    );
    // Signals
    signals.forEach((sig) => {
      const { id, colorClass, ...params } = sig;
      o.add("signal", params as SignalOverlayParams, {
        key: id,
        className: colorClass,
      });
    });
  });
}

function buildGrpcScene(b: Builder, hot: HotFn, signals: Signal[]) {
  /*  Layout:
      Client → ALB (gRPC) → App Mesh Proxy → Order Service
                                           ↕ (stream)
                                           Product Service
      Cloud Map (top-right)  ·  .proto contract (center)  */

  darkNode(b, "client", 50, 260, 90, 44, "Client", hot, "#22c55e");
  awsNode(b, "alb-grpc", 200, 260, "ALB (gRPC)", hot, "#22c55e");
  darkNode(b, "mesh-proxy", 365, 260, 110, 44, "App Mesh", hot, "#14b8a6", {
    fontSize: 10,
    labelColor: "#5eead4",
  });
  darkNode(b, "svc-order", 540, 180, 120, 48, "Order Service", hot, "#22c55e", {
    fontSize: 10,
  });
  darkNode(
    b,
    "svc-product",
    540,
    340,
    120,
    48,
    "Product Service",
    hot,
    "#86efac",
    { fontSize: 10 },
  );
  awsNode(b, "cloud-map", 730, 110, "Cloud Map", hot, "#14b8a6");
  // Proto contract node
  b.node("proto-contract")
    .at(730, 260)
    .rect(100, 44, 6)
    .fill(hot("proto-contract") ? "#1a2e1a" : "#0a1a0a")
    .stroke(hot("proto-contract") ? "#22c55e" : "#1e3a1e", 2)
    .label(".proto", { fill: "#4ade80", fontSize: 11, fontWeight: "bold" });

  // Edges
  b.edge("client", "cloud-map", "e-disc")
    .stroke("#14b8a6", 1.5)
    .arrow(true)
    .dashed()
    .label("discover", { fill: "#5eead4", fontSize: 7 });
  b.edge("client", "alb-grpc", "e-1")
    .stroke("#475569", 2)
    .arrow(true)
    .label("HTTP/2", { fill: "#64748b", fontSize: 8 });
  b.edge("alb-grpc", "mesh-proxy", "e-2")
    .stroke("#475569", 2)
    .arrow(true)
    .label("gRPC", { fill: "#64748b", fontSize: 8 });
  b.edge("mesh-proxy", "svc-order", "e-3")
    .stroke("#475569", 2)
    .arrow(true)
    .label("mTLS", { fill: "#64748b", fontSize: 8 });
  b.edge("svc-order", "mesh-proxy", "e-4")
    .stroke("#334155", 1.5)
    .arrow(true)
    .dashed();
  b.edge("mesh-proxy", "svc-product", "e-5")
    .stroke("#475569", 2)
    .arrow(true)
    .label("stream", { fill: "#64748b", fontSize: 8 });
  // Proto references
  b.edge("svc-order", "proto-contract", "e-proto1")
    .stroke("#1e3a1e", 1)
    .arrow(true)
    .dashed();
  b.edge("svc-product", "proto-contract", "e-proto2")
    .stroke("#1e3a1e", 1)
    .arrow(true)
    .dashed();
  // Response
  b.edge("svc-product", "svc-order", "e-r1")
    .stroke("#1e3a3a", 1)
    .arrow(true)
    .dashed();
  b.edge("svc-order", "alb-grpc", "e-r2")
    .stroke("#1e3a3a", 1)
    .arrow(true)
    .dashed();
  b.edge("alb-grpc", "client", "e-r3")
    .stroke("#1e3a3a", 1)
    .arrow(true)
    .dashed()
    .label("protobuf", { fill: "#475569", fontSize: 7 });

  b.overlay((o) => {
    o.add(
      "rect",
      {
        x: W - 130,
        y: 16,
        w: 110,
        h: 24,
        rx: 8,
        ry: 8,
        fill: "rgba(0,0,0,0.5)",
        stroke: "#22c55e",
        strokeWidth: 1.5,
        opacity: 1,
      },
      { key: "badge-bg" },
    );
    o.add(
      "text",
      {
        x: W - 75,
        y: 32,
        text: "SYNC · gRPC",
        fill: "#22c55e",
        fontSize: 11,
        fontWeight: "bold",
      },
      { key: "badge" },
    );
    o.add(
      "text",
      {
        x: W / 2,
        y: H - 16,
        text: "Binary Protobuf · HTTP/2 multiplexing · Bidirectional streaming",
        fill: "#475569",
        fontSize: 9,
      },
      { key: "footer" },
    );
    o.add(
      "text",
      {
        x: 365,
        y: 238,
        text: "☁ AWS App Mesh (Envoy)",
        fill: "#334155",
        fontSize: 7,
      },
      { key: "aws-mesh" },
    );
    o.add(
      "text",
      { x: 540, y: 158, text: "ECS Fargate", fill: "#334155", fontSize: 7 },
      { key: "aws-ecs1" },
    );
    o.add(
      "text",
      { x: 540, y: 318, text: "ECS Fargate", fill: "#334155", fontSize: 7 },
      { key: "aws-ecs2" },
    );
    signals.forEach((sig) => {
      const { id, colorClass, ...params } = sig;
      o.add("signal", params as SignalOverlayParams, {
        key: id,
        className: colorClass,
      });
    });
  });
}

function buildGraphqlScene(b: Builder, hot: HotFn, signals: Signal[]) {
  /*  Layout:
      Client → AppSync (single endpoint) ─┬→ Resolver A (λ) → DynamoDB A
                                           └→ Resolver B (λ) → DynamoDB B
      Cognito (top-right auth)  */

  darkNode(b, "client", 50, 260, 90, 44, "Client", hot, "#e535ab");
  // AppSync — larger, central
  b.node("appsync")
    .at(260, 260)
    .rect(140, 56, 12)
    .fill(hot("appsync") ? "#3b0f2e" : "#1a0a16")
    .stroke(hot("appsync") ? "#e535ab" : "#4a1942", 2)
    .label("AppSync", { fill: "#f0abfc", fontSize: 13, fontWeight: "bold" });

  awsNode(b, "cognito", 260, 110, "Cognito", hot, "#f59e0b");
  // Resolvers
  darkNode(b, "resolver-a", 490, 175, 110, 40, "λ Order", hot, "#e535ab", {
    fontSize: 10,
  });
  darkNode(b, "resolver-b", 490, 345, 110, 40, "λ Product", hot, "#f0abfc", {
    fontSize: 10,
  });
  dbNode(b, "dynamo-a", 680, 175, "DynamoDB", hot, "#f59e0b");
  dbNode(b, "dynamo-b", 680, 345, "DynamoDB", hot, "#f59e0b");

  // Edges
  b.edge("client", "appsync", "e-1")
    .stroke("#475569", 2)
    .arrow(true)
    .label("query { order { product } }", { fill: "#94a3b8", fontSize: 8 });
  b.edge("appsync", "cognito", "e-auth")
    .stroke("#f59e0b", 1.5)
    .arrow(true)
    .dashed()
    .label("JWT", { fill: "#fbbf24", fontSize: 7 });
  b.edge("appsync", "resolver-a", "e-2")
    .stroke("#e535ab", 2)
    .arrow(true)
    .label("resolve order", { fill: "#f0abfc", fontSize: 8 });
  b.edge("appsync", "resolver-b", "e-3")
    .stroke("#e535ab", 2)
    .arrow(true)
    .label("resolve product", { fill: "#f0abfc", fontSize: 8 });
  b.edge("resolver-a", "dynamo-a", "e-4")
    .stroke("#334155", 1.5)
    .arrow(true)
    .dashed();
  b.edge("resolver-b", "dynamo-b", "e-5")
    .stroke("#334155", 1.5)
    .arrow(true)
    .dashed();
  // Responses
  b.edge("resolver-a", "appsync", "e-r1")
    .stroke("#1e3a3a", 1)
    .arrow(true)
    .dashed();
  b.edge("resolver-b", "appsync", "e-r2")
    .stroke("#1e3a3a", 1)
    .arrow(true)
    .dashed();
  b.edge("appsync", "client", "e-r3")
    .stroke("#1e3a3a", 1)
    .arrow(true)
    .dashed()
    .label("{ data: ... }", { fill: "#475569", fontSize: 7 });

  b.overlay((o) => {
    o.add(
      "rect",
      {
        x: W - 140,
        y: 16,
        w: 120,
        h: 24,
        rx: 8,
        ry: 8,
        fill: "rgba(0,0,0,0.5)",
        stroke: "#e535ab",
        strokeWidth: 1.5,
        opacity: 1,
      },
      { key: "badge-bg" },
    );
    o.add(
      "text",
      {
        x: W - 80,
        y: 32,
        text: "SYNC · GraphQL",
        fill: "#e535ab",
        fontSize: 11,
        fontWeight: "bold",
      },
      { key: "badge" },
    );
    o.add(
      "text",
      {
        x: W / 2,
        y: H - 16,
        text: "Single endpoint · Parallel resolvers · Client-shaped response",
        fill: "#475569",
        fontSize: 9,
      },
      { key: "footer" },
    );
    o.add(
      "text",
      { x: 260, y: 238, text: "☁ AWS AppSync", fill: "#334155", fontSize: 7 },
      { key: "aws-as" },
    );
    o.add(
      "text",
      { x: 490, y: 160, text: "☁ Lambda", fill: "#334155", fontSize: 7 },
      { key: "aws-l1" },
    );
    o.add(
      "text",
      { x: 490, y: 330, text: "☁ Lambda", fill: "#334155", fontSize: 7 },
      { key: "aws-l2" },
    );
    signals.forEach((sig) => {
      const { id, colorClass, ...params } = sig;
      o.add("signal", params as SignalOverlayParams, {
        key: id,
        className: colorClass,
      });
    });
  });
}

function buildAmqpScene(b: Builder, hot: HotFn, signals: Signal[]) {
  /*  Layout:
      Client → Producer → Exchange ─┬→ Queue A → Consumer A
                                     └→ Queue B → Consumer B
      DLQ (bottom) — for failed messages  */

  darkNode(b, "client", 40, 220, 90, 44, "Client", hot, "#60a5fa");
  darkNode(b, "svc-producer", 185, 220, 110, 44, "Producer", hot, "#f59e0b", {
    fontSize: 11,
  });
  // Exchange — distinctive shape
  brokerNode(b, "exchange", 360, 220, 120, 52, "Exchange", hot, "#f59e0b");
  // Queues
  b.node("queue-a")
    .at(540, 145)
    .rect(100, 38, 6)
    .fill(hot("queue-a") ? "#2a1a04" : "#151520")
    .stroke(hot("queue-a") ? "#fbbf24" : "#3f3f46", 1.5)
    .label("Queue A", { fill: "#fcd34d", fontSize: 9, fontWeight: "bold" });
  b.node("queue-b")
    .at(540, 295)
    .rect(100, 38, 6)
    .fill(hot("queue-b") ? "#2a1a04" : "#151520")
    .stroke(hot("queue-b") ? "#fbbf24" : "#3f3f46", 1.5)
    .label("Queue B", { fill: "#fcd34d", fontSize: 9, fontWeight: "bold" });
  // Consumers
  darkNode(b, "consumer-a", 710, 145, 110, 40, "Notification", hot, "#22c55e", {
    fontSize: 10,
  });
  darkNode(b, "consumer-b", 710, 295, 110, 40, "Fulfillment", hot, "#22c55e", {
    fontSize: 10,
  });
  // DLQ
  b.node("dlq")
    .at(540, 420)
    .rect(100, 36, 6)
    .fill(hot("dlq") ? "#3b0f0f" : "#1a0a0a")
    .stroke(hot("dlq") ? "#ef4444" : "#7f1d1d", 2)
    .label("DLQ", { fill: "#fca5a5", fontSize: 10, fontWeight: "bold" });

  // Edges
  b.edge("client", "svc-producer", "e-1")
    .stroke("#475569", 2)
    .arrow(true)
    .label("order", { fill: "#64748b", fontSize: 8 });
  b.edge("svc-producer", "exchange", "e-2")
    .stroke("#f59e0b", 2)
    .arrow(true)
    .label("publish", { fill: "#fbbf24", fontSize: 8 });
  b.edge("svc-producer", "client", "e-ack")
    .stroke("#22c55e", 1.5)
    .arrow(true)
    .dashed()
    .label("ack", { fill: "#4ade80", fontSize: 7 });
  b.edge("exchange", "queue-a", "e-3")
    .stroke("#f59e0b", 2)
    .arrow(true)
    .label("order.*", { fill: "#fbbf24", fontSize: 7 });
  b.edge("exchange", "queue-b", "e-4")
    .stroke("#f59e0b", 2)
    .arrow(true)
    .label("order.*", { fill: "#fbbf24", fontSize: 7 });
  b.edge("queue-a", "consumer-a", "e-5")
    .stroke("#475569", 2)
    .arrow(true)
    .label("pull", { fill: "#64748b", fontSize: 8 });
  b.edge("queue-b", "consumer-b", "e-6")
    .stroke("#475569", 2)
    .arrow(true)
    .label("pull", { fill: "#64748b", fontSize: 8 });
  b.edge("queue-a", "dlq", "e-dlq")
    .stroke("#ef4444", 1.5)
    .arrow(true)
    .dashed()
    .label("max retries", { fill: "#f87171", fontSize: 7 });

  b.overlay((o) => {
    o.add(
      "rect",
      {
        x: W - 135,
        y: 16,
        w: 115,
        h: 24,
        rx: 8,
        ry: 8,
        fill: "rgba(0,0,0,0.5)",
        stroke: "#f59e0b",
        strokeWidth: 1.5,
        opacity: 1,
      },
      { key: "badge-bg" },
    );
    o.add(
      "text",
      {
        x: W - 78,
        y: 32,
        text: "ASYNC · AMQP",
        fill: "#f59e0b",
        fontSize: 11,
        fontWeight: "bold",
      },
      { key: "badge" },
    );
    o.add(
      "text",
      {
        x: W / 2,
        y: H - 16,
        text: "Exchange routing · Dead-letter queues · Fire-and-forget",
        fill: "#475569",
        fontSize: 9,
      },
      { key: "footer" },
    );
    o.add(
      "text",
      {
        x: 360,
        y: 198,
        text: "☁ Amazon MQ (RabbitMQ)",
        fill: "#334155",
        fontSize: 7,
      },
      { key: "aws-mq" },
    );
    o.add(
      "text",
      { x: 185, y: 198, text: "ECS Fargate", fill: "#334155", fontSize: 7 },
      { key: "aws-prod" },
    );
    o.add(
      "text",
      { x: 710, y: 128, text: "ECS Fargate", fill: "#334155", fontSize: 7 },
      { key: "aws-c1" },
    );
    o.add(
      "text",
      { x: 710, y: 278, text: "ECS Fargate", fill: "#334155", fontSize: 7 },
      { key: "aws-c2" },
    );
    o.add(
      "text",
      { x: 540, y: 404, text: "☁ SQS", fill: "#7f1d1d", fontSize: 7 },
      { key: "aws-dlq" },
    );
    signals.forEach((sig) => {
      const { id, colorClass, ...params } = sig;
      o.add("signal", params as SignalOverlayParams, {
        key: id,
        className: colorClass,
      });
    });
  });
}

function buildMqttScene(b: Builder, hot: HotFn, signals: Signal[]) {
  /*  Layout — 3 devices on the left, each with its own X.509 cert:
      Temp Sensor    ─┐
      Pressure Sensor ┤──→ AWS IoT Core ──→ IoT Rules ──→ Lambda ──→ Timestream
      GPS Tracker    ─┘                          │             │
                                                 │             └──→ SQS DLQ
                                                 │
                              ┌──────── Device Shadow ─────────┐
                              │  reported  │  desired  │ delta │
                              └────────────────────────────────┘
                                               ↑
                                          Ops / Backend                      */

  /* ── 3 IoT devices ───────────────────────────────── */
  darkNode(b, "device-temp", 30, 120, 110, 40, "Temp Sensor", hot, "#a78bfa", {
    fontSize: 9,
  });
  darkNode(
    b,
    "device-pressure",
    30,
    220,
    110,
    40,
    "Pressure Sensor",
    hot,
    "#a78bfa",
    { fontSize: 9 },
  );
  darkNode(b, "device-gps", 30, 320, 110, 40, "GPS Tracker", hot, "#a78bfa", {
    fontSize: 9,
  });

  /* ── Core cloud path ─────────────────────────────── */
  brokerNode(b, "iot-core", 220, 218, 132, 56, "AWS IoT Core", hot, "#a78bfa");
  awsNode(b, "iot-rules", 430, 80, "IoT Rules", hot, "#f59e0b");
  awsNode(b, "lambda-ingest", 600, 80, "Lambda", hot, "#f59e0b");
  awsNode(b, "timestream", 780, 80, "Timestream", hot, "#22c55e");

  /* ── Dead-letter queue for failed messages ───────── */
  darkNode(b, "sqs-dlq", 600, 170, 100, 36, "SQS DLQ", hot, "#ef4444", {
    fontSize: 9,
  });

  /* ── Device Shadow area (expanded) ───────────────── */
  darkNode(
    b,
    "device-shadow",
    410,
    350,
    200,
    90,
    "Device Shadow",
    hot,
    "#60a5fa",
    { fontSize: 11 },
  );

  /* ── Ops / Backend ───────────────────────────────── */
  darkNode(b, "ops-app", 710, 370, 130, 46, "Ops / Backend", hot, "#60a5fa", {
    fontSize: 10,
  });

  /* ── Device → IoT Core edges (each device has its own cert) ── */
  b.edge("device-temp", "iot-core", "e-mqtt-conn-temp")
    .stroke("#a78bfa", 2)
    .arrow(true)
    .label("MQTT/TLS", { fill: "#c4b5fd", fontSize: 7 });
  b.edge("device-pressure", "iot-core", "e-mqtt-conn-pressure")
    .stroke("#a78bfa", 2)
    .arrow(true)
    .label("MQTT/TLS", { fill: "#c4b5fd", fontSize: 7 });
  b.edge("device-gps", "iot-core", "e-mqtt-conn-gps")
    .stroke("#a78bfa", 2)
    .arrow(true)
    .label("MQTT/TLS", { fill: "#c4b5fd", fontSize: 7 });

  /* ── Telemetry processing path ───────────────────── */
  b.edge("iot-core", "iot-rules", "e-mqtt-rules")
    .stroke("#f59e0b", 1.8)
    .arrow(true)
    .label("telemetry topic (readings)", { fill: "#fbbf24", fontSize: 7 });
  b.edge("iot-rules", "lambda-ingest", "e-mqtt-lambda")
    .stroke("#f59e0b", 1.8)
    .arrow(true)
    .label("rule action", { fill: "#fbbf24", fontSize: 7 });
  b.edge("lambda-ingest", "timestream", "e-mqtt-store")
    .stroke("#22c55e", 1.8)
    .arrow(true)
    .label("store telemetry (readings)", { fill: "#4ade80", fontSize: 7 });

  /* ── Failed message → DLQ ────────────────────────── */
  b.edge("lambda-ingest", "sqs-dlq", "e-mqtt-dlq")
    .stroke("#ef4444", 1.5)
    .arrow(true)
    .dashed()
    .label("failed → retry queue", { fill: "#fca5a5", fontSize: 7 });

  /* ── Shadow edges ────────────────────────────────── */
  b.edge("iot-core", "device-shadow", "e-mqtt-shadow-report")
    .stroke("#60a5fa", 1.6)
    .arrow(true)
    .label("reported state (device says this)", {
      fill: "#93c5fd",
      fontSize: 7,
    });
  b.edge("ops-app", "device-shadow", "e-mqtt-shadow-desired")
    .stroke("#60a5fa", 1.6)
    .arrow(true)
    .label("desired state (cloud wants this)", {
      fill: "#93c5fd",
      fontSize: 7,
    });
  b.edge("device-shadow", "iot-core", "e-mqtt-delta")
    .stroke("#60a5fa", 1.5)
    .arrow(true)
    .dashed()
    .label("delta (what still needs to change)", {
      fill: "#93c5fd",
      fontSize: 7,
    });

  /* ── Downlink back to a device ───────────────────── */
  b.edge("iot-core", "device-temp", "e-mqtt-downlink")
    .stroke("#22c55e", 1.5)
    .arrow(true)
    .dashed()
    .label("command / delta", { fill: "#4ade80", fontSize: 7 });

  /* ── Overlays ────────────────────────────────────── */
  b.overlay((o) => {
    o.add(
      "rect",
      {
        x: W - 132,
        y: 16,
        w: 112,
        h: 24,
        rx: 8,
        ry: 8,
        fill: "rgba(0,0,0,0.5)",
        stroke: "#a78bfa",
        strokeWidth: 1.5,
        opacity: 1,
      },
      { key: "badge-bg" },
    );
    o.add(
      "text",
      {
        x: W - 76,
        y: 32,
        text: "ASYNC · MQTT",
        fill: "#a78bfa",
        fontSize: 11,
        fontWeight: "bold",
      },
      { key: "badge" },
    );
    o.add(
      "text",
      {
        x: W / 2,
        y: H - 16,
        text: "MQTT/TLS (encrypted MQTT) · IoT Rules · DLQ (dead-letter queue) · Device Shadow (last state only) · cloud-to-device",
        fill: "#475569",
        fontSize: 8,
      },
      { key: "footer" },
    );

    /* ── Per-device X.509 cert labels ─────────────── */
    o.add(
      "text",
      {
        x: 30,
        y: 108,
        text: "🔑 X.509 cert A",
        fill: "#c4b5fd",
        fontSize: 7,
      },
      { key: "cert-temp" },
    );
    o.add(
      "text",
      {
        x: 30,
        y: 208,
        text: "🔑 X.509 cert B",
        fill: "#c4b5fd",
        fontSize: 7,
      },
      { key: "cert-pressure" },
    );
    o.add(
      "text",
      {
        x: 30,
        y: 308,
        text: "🔑 X.509 cert C",
        fill: "#c4b5fd",
        fontSize: 7,
      },
      { key: "cert-gps" },
    );
    o.add(
      "text",
      {
        x: 85,
        y: 370,
        text: "each device has its own\ncert (ID card) + IoT policy (rules)",
        fill: "#a78bfa",
        fontSize: 7,
      },
      { key: "cert-note" },
    );

    /* ── IoT Core label ──────────────────────────── */
    o.add(
      "text",
      {
        x: 220,
        y: 198,
        text: "☁ AWS IoT Core endpoint",
        fill: "#334155",
        fontSize: 7,
      },
      { key: "aws-iot-core" },
    );

    /* ── Rules / processing annotations ──────────── */
    o.add(
      "text",
      {
        x: 430,
        y: 62,
        text: "IoT Rule (if this topic matches, send it here)",
        fill: "#fbbf24",
        fontSize: 7,
      },
      { key: "mqtt-rules-note" },
    );
    o.add(
      "text",
      {
        x: 600,
        y: 200,
        text: "⚠ failed after retries →\nmessage preserved, not lost",
        fill: "#fca5a5",
        fontSize: 7,
      },
      { key: "dlq-note" },
    );

    /* ── Device Shadow detail overlays ───────────── */
    o.add(
      "rect",
      {
        x: 414,
        y: 370,
        w: 88,
        h: 56,
        rx: 4,
        ry: 4,
        fill: "rgba(96,165,250,0.08)",
        stroke: "#60a5fa",
        strokeWidth: 0.8,
        opacity: 1,
      },
      { key: "shadow-reported-bg" },
    );
    o.add(
      "text",
      {
        x: 458,
        y: 382,
        text: "reported (device)",
        fill: "#93c5fd",
        fontSize: 7,
        fontWeight: "bold",
      },
      { key: "shadow-reported-title" },
    );
    o.add(
      "text",
      {
        x: 458,
        y: 396,
        text: '{ "temp": 22 }',
        fill: "#64748b",
        fontSize: 7,
      },
      { key: "shadow-reported-val" },
    );
    o.add(
      "text",
      {
        x: 458,
        y: 410,
        text: "latest only — no history",
        fill: "#475569",
        fontSize: 6,
      },
      { key: "shadow-reported-note" },
    );

    o.add(
      "rect",
      {
        x: 510,
        y: 370,
        w: 88,
        h: 56,
        rx: 4,
        ry: 4,
        fill: "rgba(96,165,250,0.08)",
        stroke: "#60a5fa",
        strokeWidth: 0.8,
        opacity: 1,
      },
      { key: "shadow-desired-bg" },
    );
    o.add(
      "text",
      {
        x: 554,
        y: 382,
        text: "desired (cloud)",
        fill: "#93c5fd",
        fontSize: 7,
        fontWeight: "bold",
      },
      { key: "shadow-desired-title" },
    );
    o.add(
      "text",
      {
        x: 554,
        y: 396,
        text: '{ "temp": 20 }',
        fill: "#64748b",
        fontSize: 7,
      },
      { key: "shadow-desired-val" },
    );
    o.add(
      "text",
      {
        x: 554,
        y: 410,
        text: "overwrites previous",
        fill: "#475569",
        fontSize: 6,
      },
      { key: "shadow-desired-note" },
    );

    o.add(
      "text",
      {
        x: 510,
        y: 434,
        text: 'delta → { "temp": 20 }  (what still needs to change)',
        fill: "#fbbf24",
        fontSize: 7,
        fontWeight: "bold",
      },
      { key: "shadow-delta-val" },
    );
    o.add(
      "text",
      {
        x: 510,
        y: 448,
        text: "⚠ Shadow stores LAST STATE only — it is NOT a history log",
        fill: "#f87171",
        fontSize: 7,
      },
      { key: "shadow-not-history" },
    );

    /* ── Ops / Backend annotation ────────────────── */
    o.add(
      "text",
      {
        x: 710,
        y: 356,
        text: "backend writes desired state (wanted settings)",
        fill: "#93c5fd",
        fontSize: 7,
      },
      { key: "mqtt-backend-note" },
    );

    signals.forEach((sig) => {
      const { id, colorClass, ...params } = sig;
      o.add("signal", params as SignalOverlayParams, {
        key: id,
        className: colorClass,
      });
    });
  });
}

function buildKafkaScene(b: Builder, hot: HotFn, signals: Signal[]) {
  /*  Layout:
      Client → Producer → ┌ Partition 0 ┐
                           │ Partition 1 │ → CG: Analytics
                           └ Partition 2 ┘ → CG: Search
      S3 Archive (bottom-right)  */

  darkNode(b, "client", 40, 245, 90, 44, "Client", hot, "#60a5fa");
  darkNode(b, "svc-producer", 185, 245, 110, 44, "Producer", hot, "#8b5cf6", {
    fontSize: 11,
  });
  // Topic partitions — stacked vertically
  partitionNode(b, "topic-p0", 380, 155, "P0", hot, "#8b5cf6");
  partitionNode(b, "topic-p1", 380, 245, "P1", hot, "#8b5cf6");
  partitionNode(b, "topic-p2", 380, 335, "P2", hot, "#8b5cf6");
  // Consumer groups
  darkNode(
    b,
    "cg-analytics",
    580,
    175,
    120,
    44,
    "CG: Analytics",
    hot,
    "#c4b5fd",
    { fontSize: 10 },
  );
  darkNode(b, "cg-search", 580, 315, 120, 44, "CG: Search", hot, "#a78bfa", {
    fontSize: 10,
  });
  // S3 archive
  b.node("s3-archive")
    .at(750, 400)
    .rect(100, 38, 8)
    .fill(hot("s3-archive") ? "#172554" : "#0c1222")
    .stroke(hot("s3-archive") ? "#60a5fa" : "#1e3a5f", 2)
    .label("S3 Archive", { fill: "#93c5fd", fontSize: 9, fontWeight: "bold" });

  // Edges
  b.edge("client", "svc-producer", "e-1")
    .stroke("#475569", 2)
    .arrow(true)
    .label("event", { fill: "#64748b", fontSize: 8 });
  b.edge("svc-producer", "topic-p0", "e-2").stroke("#8b5cf6", 2).arrow(true);
  b.edge("svc-producer", "topic-p1", "e-3")
    .stroke("#8b5cf6", 2)
    .arrow(true)
    .label("append", { fill: "#a78bfa", fontSize: 8 });
  b.edge("svc-producer", "topic-p2", "e-4").stroke("#8b5cf6", 2).arrow(true);
  b.edge("svc-producer", "client", "e-ack")
    .stroke("#22c55e", 1.5)
    .arrow(true)
    .dashed()
    .label("ack", { fill: "#4ade80", fontSize: 7 });
  // Consumer group reads
  b.edge("topic-p0", "cg-analytics", "e-5")
    .stroke("#c4b5fd", 1.5)
    .arrow(true)
    .label("read", { fill: "#c4b5fd", fontSize: 7 });
  b.edge("topic-p1", "cg-analytics", "e-6").stroke("#c4b5fd", 1.5).arrow(true);
  b.edge("topic-p1", "cg-search", "e-7")
    .stroke("#a78bfa", 1.5)
    .arrow(true)
    .label("read", { fill: "#a78bfa", fontSize: 7 });
  b.edge("topic-p2", "cg-search", "e-8").stroke("#a78bfa", 1.5).arrow(true);
  b.edge("topic-p2", "s3-archive", "e-s3")
    .stroke("#60a5fa", 1.5)
    .arrow(true)
    .dashed()
    .label("sink", { fill: "#60a5fa", fontSize: 7 });

  b.overlay((o) => {
    o.add(
      "rect",
      {
        x: W - 130,
        y: 16,
        w: 110,
        h: 24,
        rx: 8,
        ry: 8,
        fill: "rgba(0,0,0,0.5)",
        stroke: "#8b5cf6",
        strokeWidth: 1.5,
        opacity: 1,
      },
      { key: "badge-bg" },
    );
    o.add(
      "text",
      {
        x: W - 75,
        y: 32,
        text: "ASYNC · Kafka",
        fill: "#8b5cf6",
        fontSize: 11,
        fontWeight: "bold",
      },
      { key: "badge" },
    );
    // Topic label
    o.add(
      "rect",
      {
        x: 342,
        y: 122,
        w: 76,
        h: 18,
        rx: 4,
        ry: 4,
        fill: "#1e1045",
        stroke: "#4c1d95",
        strokeWidth: 1,
        opacity: 1,
      },
      { key: "topic-bg" },
    );
    o.add(
      "text",
      {
        x: 380,
        y: 134,
        text: "orders-topic",
        fill: "#a78bfa",
        fontSize: 8,
        fontWeight: "bold",
      },
      { key: "topic-label" },
    );
    o.add(
      "text",
      {
        x: W / 2,
        y: H - 16,
        text: "Append-only log · Consumer groups · Replayable events · MSK",
        fill: "#475569",
        fontSize: 9,
      },
      { key: "footer" },
    );
    o.add(
      "text",
      { x: 185, y: 223, text: "ECS Fargate", fill: "#334155", fontSize: 7 },
      { key: "aws-prod" },
    );
    o.add(
      "text",
      { x: 380, y: 380, text: "☁ Amazon MSK", fill: "#334155", fontSize: 8 },
      { key: "aws-msk" },
    );
    o.add(
      "text",
      { x: 580, y: 158, text: "Lambda / ECS", fill: "#334155", fontSize: 7 },
      { key: "aws-cg1" },
    );
    o.add(
      "text",
      { x: 580, y: 298, text: "Lambda / ECS", fill: "#334155", fontSize: 7 },
      { key: "aws-cg2" },
    );
    o.add(
      "text",
      { x: 750, y: 385, text: "☁ MSK Connect", fill: "#334155", fontSize: 7 },
      { key: "aws-s3" },
    );
    signals.forEach((sig) => {
      const { id, colorClass, ...params } = sig;
      o.add("signal", params as SignalOverlayParams, {
        key: id,
        className: colorClass,
      });
    });
  });
}

/** Dispatch to the correct scene builder */
const SCENE_BUILDERS: Record<
  ProtocolKey,
  (b: Builder, hot: HotFn, signals: Signal[]) => void
> = {
  "http-rest": buildHttpRestScene,
  grpc: buildGrpcScene,
  graphql: buildGraphqlScene,
  amqp: buildAmqpScene,
  mqtt: buildMqttScene,
  kafka: buildKafkaScene,
};

/* ════════════════════════════════════════════════════════
   Main Visualization Component
   ════════════════════════════════════════════════════════ */

const MicroserviceCommVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, signals } =
    useMicroserviceCommAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as MicroserviceCommState;
  const { explanation, hotZones, phase, variant } = st;
  const profile = VARIANT_PROFILES[variant];
  const isAsync = profile.commType === "async";
  const hot = (zone: string) => hotZones.includes(zone);
  const apiSurfaceSummary =
    variant === "mqtt"
      ? "Device-facing async protocol: each device keeps its own MQTT/TLS connection (encrypted MQTT) to AWS IoT Core, authenticated by its own X.509 certificate (digital ID card). The cloud routes messages via IoT Rules, stores telemetry in Timestream, and if processing fails a Dead-Letter Queue (DLQ) preserves the message. Device Shadow keeps the last known state (not history) so the cloud can send commands even when a device is offline."
      : isAsync
        ? "Async messaging removes the request/response split: producers publish and continue immediately while consumers process later."
        : variant === "grpc"
          ? "Backend API: gRPC is optimized for service-to-service traffic where payload size and latency matter."
          : variant === "graphql"
            ? "Public API: GraphQL exposes one client-facing endpoint and fans out internally through resolvers."
            : "Public API: REST is the usual edge-facing choice for client apps, with API Gateway as the front door.";
  const mqttSetupNotes =
    variant === "mqtt"
      ? [
          "Each device gets its own X.509 certificate (digital ID card) and IoT policy (permission rules). No two devices share a certificate — if one is compromised you revoke just that one.",
          "Devices connect to AWS IoT Core over MQTT/TLS (encrypted MQTT) on port 8883.",
          "Telemetry means readings or status updates from the device, such as temperature, battery, pressure, or location.",
          "IoT Rules (routing rules) forward telemetry to Lambda, Timestream, SQS, etc. without the device knowing those systems.",
          "If Lambda fails to process a message, configure an SQS Dead-Letter Queue (DLQ) so the message is saved for later inspection instead of being lost.",
          "Device Shadow stores ONLY the last state — it is not a history log. It has two sections: 'reported' (from the device) and 'desired' (from the cloud). AWS computes the delta (the difference) automatically.",
          "If you need history of readings over time, store telemetry in Timestream or S3 — shadow is only for current state.",
        ]
      : null;
  const mqttPlainEnglishTerms =
    variant === "mqtt"
      ? [
          "X.509 certificate: the device's digital ID card — each device gets its own.",
          "IoT policy: the permission rules for what the device may publish or subscribe to.",
          "Telemetry: the readings or status updates sent by the device.",
          "Topic: the named message channel a device publishes to or listens on.",
          "MQTT/TLS: MQTT sent over an encrypted connection.",
          "AWS IoT Core: the managed message hub devices connect to.",
          "Thing identity: the AWS record that represents one device.",
          "Dead-Letter Queue (DLQ): a safety-net queue where failed messages go instead of being lost.",
          "Device Shadow: stores ONLY the last state (not history) — has 'reported' and 'desired' sections.",
          "Reported state: the latest state the device says it has (e.g. {\"temp\": 22}).",
          "Desired state: the state the cloud wants the device to reach (e.g. {\"temp\": 20}).",
          "Delta: the difference between desired and reported — what still needs to change.",
          "Timestream: a database for measurements collected over time (the actual history).",
        ]
      : null;

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);
    SCENE_BUILDERS[variant](b, hot, signals);
    return b;
  })();

  /* ── Mount / destroy VizCraft scene ─────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
    const unsub = pzRef.current?.onChange((s) => {
      viewportRef.current = s;
    });
    return () => {
      unsub?.();
    };
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  /* ── Pill definitions ───────────────────────────────── */
  const pills: PillDef[] = [
    {
      key: "sync-vs-async",
      label: "Sync vs Async",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "public-vs-backend-api",
      label: "Public vs Backend",
      color: "#bae6fd",
      borderColor: "#60a5fa",
    },
    {
      key: "api-gateway",
      label: "API Gateway",
      color: "#dbeafe",
      borderColor: "#3b82f6",
    },
    {
      key: "http-rest",
      label: "HTTP/REST",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    { key: "grpc", label: "gRPC", color: "#86efac", borderColor: "#22c55e" },
    {
      key: "graphql",
      label: "GraphQL",
      color: "#f0abfc",
      borderColor: "#e535ab",
    },
    { key: "amqp", label: "AMQP", color: "#fcd34d", borderColor: "#f59e0b" },
    { key: "mqtt", label: "MQTT", color: "#c4b5fd", borderColor: "#a78bfa" },
    { key: "kafka", label: "Kafka", color: "#c4b5fd", borderColor: "#8b5cf6" },
    {
      key: "iot-core",
      label: "IoT Core",
      color: "#ddd6fe",
      borderColor: "#a78bfa",
    },
    {
      key: "device-shadow",
      label: "Device Shadow",
      color: "#93c5fd",
      borderColor: "#60a5fa",
    },
    {
      key: "dead-letter-queue",
      label: "DLQ",
      color: "#fca5a5",
      borderColor: "#ef4444",
    },
    {
      key: "temporal-coupling",
      label: "Coupling",
      color: "#fca5a5",
      borderColor: "#ef4444",
    },
    {
      key: "serialization",
      label: "Serialization",
      color: "#f9a8d4",
      borderColor: "#ec4899",
    },
    {
      key: "service-discovery",
      label: "Discovery",
      color: "#5eead4",
      borderColor: "#14b8a6",
    },
  ];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`microservice-comm-root microservice-comm-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="microservice-comm-stage">
            <StageHeader
              title="Microservice Communication"
              subtitle={profile.label}
            >
              <StatBadge
                label="Protocol"
                value={profile.label}
                color={profile.color}
              />
              <StatBadge
                label="Type"
                value={isAsync ? "Async" : "Sync"}
                color={isAsync ? "#f59e0b" : "#3b82f6"}
              />
              <StatBadge
                label="Latency"
                value={`${st.latencyMs}ms`}
                color="#e2e8f0"
              />
              <StatBadge
                label="Throughput"
                value={`${st.throughputRps.toLocaleString()} rps`}
                color="#e2e8f0"
              />
              <StatBadge
                label="Coupling"
                value={st.coupling}
                color={COUPLING_COLOR[st.coupling]}
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
            <SideCard label="Communication Surface" variant="info">
              <p style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                {apiSurfaceSummary}
              </p>
            </SideCard>
            <SideCard label={`${profile.label} Profile`} variant="info">
              <p
                style={{
                  color: profile.color,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                {profile.label}
              </p>
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "#94a3b8",
                  marginBottom: 8,
                }}
              >
                {profile.description}
              </p>
              <div style={{ fontSize: "0.72rem" }}>
                <p
                  style={{ fontWeight: 600, color: "#22c55e", marginBottom: 2 }}
                >
                  Strengths:
                </p>
                <ul style={{ margin: "0 0 8px 12px", color: "#cbd5e1" }}>
                  {profile.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p
                  style={{ fontWeight: 600, color: "#ef4444", marginBottom: 2 }}
                >
                  Trade-offs:
                </p>
                <ul style={{ margin: "0 0 0 12px", color: "#cbd5e1" }}>
                  {profile.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </SideCard>
            <SideCard label="AWS Services" variant="info">
              <div style={{ fontSize: "0.72rem" }}>
                {profile.awsServices.map((aws, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <span style={{ color: profile.color, fontWeight: 600 }}>
                      {aws.name}
                    </span>
                    <span style={{ color: "#64748b" }}> — {aws.role}</span>
                  </div>
                ))}
              </div>
            </SideCard>
            {mqttPlainEnglishTerms ? (
              <SideCard label="Plain-English Terms" variant="info">
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 16,
                    color: "#cbd5e1",
                    fontSize: "0.72rem",
                  }}
                >
                  {mqttPlainEnglishTerms.map((term) => (
                    <li key={term}>{term}</li>
                  ))}
                </ul>
              </SideCard>
            ) : null}
            {mqttSetupNotes ? (
              <SideCard label="AWS IoT Setup" variant="info">
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 16,
                    color: "#cbd5e1",
                    fontSize: "0.72rem",
                  }}
                >
                  {mqttSetupNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </SideCard>
            ) : null}
            <SideCard label="Metrics" variant="info">
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#cbd5e1",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 4,
                }}
              >
                <span>Format:</span>
                <span style={{ fontWeight: 600 }}>{profile.format}</span>
                <span>Payload:</span>
                <span style={{ fontWeight: 600 }}>{st.payloadSize}</span>
                <span>Caller blocked:</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: st.callerBlocked ? "#ef4444" : "#22c55e",
                  }}
                >
                  {st.callerBlocked ? "Yes" : "No"}
                </span>
                <span>Replayable:</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: st.replayable ? "#22c55e" : "#94a3b8",
                  }}
                >
                  {st.replayable ? "Yes" : "No"}
                </span>
                <span>Discovery needed:</span>
                <span style={{ fontWeight: 600 }}>
                  {st.serviceDiscovery ? "Yes" : "Broker handles"}
                </span>
              </div>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default MicroserviceCommVisualization;
