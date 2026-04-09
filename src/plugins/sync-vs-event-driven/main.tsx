import React, { useEffect, useLayoutEffect, useRef } from "react";
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
import {
  useSyncVsEventDrivenAnimation,
  type Signal,
} from "./useSyncVsEventDrivenAnimation";
import {
  ARCHITECTURE_PROFILES,
  type ArchitectureKey,
  type SyncVsEventDrivenState,
} from "./syncVsEventDrivenSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 980;
const H = 620;

type NodeId =
  | "client"
  | "gateway"
  | "command-queue"
  | "order-service"
  | "event-bus"
  | "inventory"
  | "shipment"
  | "notification"
  | "shopping-cart"
  | "product"
  | "pricing"
  | "order"
  | "billing"
  | "shipping"
  | "service-aggregator"
  | "service-registry"
  | "route53"
  | "alb"
  | "coredns"
  | "product-svc"
  | "cart-svc"
  | "pricing-svc"
  | "product-pod"
  | "cart-pod"
  | "pricing-pod"
  | "nat-gateway"
  | "external-system";

type PositionMap = Partial<Record<NodeId, { x: number; y: number }>>;
type StageStats = {
  latencyMs: number;
  chainHops: number;
  blockedServices: number;
  wastePct: number;
};
type MetricItem = {
  label: string;
  rowLabel: string;
  value: React.ReactNode;
  color: string;
};

const CHAIN_POS: PositionMap = {
  client: { x: 70, y: 320 },
  gateway: { x: 220, y: 320 },
  "shopping-cart": { x: 390, y: 320 },
  product: { x: 620, y: 170 },
  pricing: { x: 620, y: 470 },
  order: { x: 740, y: 320 },
  billing: { x: 900, y: 170 },
  shipping: { x: 900, y: 470 },
};

const AGG_POS: PositionMap = {
  client: { x: 70, y: 330 },
  gateway: { x: 240, y: 330 },
  "service-aggregator": { x: 450, y: 170 },
  "service-registry": { x: 430, y: 500 },
  product: { x: 740, y: 190 },
  "shopping-cart": { x: 740, y: 360 },
  pricing: { x: 740, y: 520 },
};

const EVENT_POS: PositionMap = {
  client: { x: 70, y: 310 },
  gateway: { x: 240, y: 310 },
  "command-queue": { x: 420, y: 210 },
  "order-service": { x: 420, y: 430 },
  "event-bus": { x: 620, y: 310 },
  inventory: { x: 860, y: 170 },
  shipment: { x: 860, y: 310 },
  notification: { x: 860, y: 450 },
};

const EKS_POS: PositionMap = {
  client: { x: 52, y: 310 },
  route53: { x: 162, y: 120 },
  alb: { x: 240, y: 310 },
  gateway: { x: 420, y: 310 },
  coredns: { x: 430, y: 120 },
  "product-svc": { x: 650, y: 170 },
  "cart-svc": { x: 650, y: 310 },
  "pricing-svc": { x: 650, y: 450 },
  "product-pod": { x: 860, y: 170 },
  "cart-pod": { x: 860, y: 310 },
  "pricing-pod": { x: 860, y: 450 },
  "nat-gateway": { x: 650, y: 550 },
  "external-system": { x: 860, y: 550 },
};

const EVENT_DIRECT_PHASES = [
  "evt-direct-order",
  "evt-no-broker-inventory",
  "evt-no-broker-shipping",
  "evt-no-broker-notification",
  "evt-no-broker-tradeoff",
];

const EVENT_QUEUE_PHASES = [
  "evt-queue-intro",
  "evt-queue-command",
  "evt-client-ack",
  "evt-command-consume",
];

const EVENT_PUBSUB_PHASES = [
  "evt-pubsub-intro",
  "evt-event-publish",
  "evt-buffered",
  "evt-inventory",
  "evt-shipping",
  "evt-notification",
  "evt-broker-benefits",
  "evt-tradeoff",
  "summary",
];

const EVENT_ALL_NODES: NodeId[] = [
  "client",
  "gateway",
  "command-queue",
  "order-service",
  "event-bus",
  "inventory",
  "shipment",
  "notification",
];

const getEventSection = (
  phase: string,
): "need" | "direct" | "queue" | "pubsub" => {
  if (EVENT_DIRECT_PHASES.includes(phase)) return "direct";
  if (EVENT_QUEUE_PHASES.includes(phase)) return "queue";
  if (EVENT_PUBSUB_PHASES.includes(phase)) return "pubsub";
  return "need";
};

const getEventFocusNodes = (phase: string): NodeId[] => {
  if (["evt-broker-benefits", "evt-tradeoff", "summary"].includes(phase)) {
    return EVENT_ALL_NODES;
  }

  switch (getEventSection(phase)) {
    case "direct":
      return [
        "client",
        "gateway",
        "order-service",
        "inventory",
        "shipment",
        "notification",
      ];
    case "queue":
      return ["client", "gateway", "command-queue", "order-service"];
    case "pubsub":
      return [
        "order-service",
        "event-bus",
        "inventory",
        "shipment",
        "notification",
      ];
    default:
      return EVENT_ALL_NODES;
  }
};

const getStageStats = (
  architecture: ArchitectureKey,
  phase: string,
): StageStats => {
  if (architecture === "event-driven") {
    switch (phase) {
      case "evt-need":
        return { latencyMs: 0, chainHops: 0, blockedServices: 0, wastePct: 0 };
      case "evt-client-request":
        return { latencyMs: 20, chainHops: 1, blockedServices: 0, wastePct: 0 };
      case "evt-direct-order":
        return { latencyMs: 90, chainHops: 2, blockedServices: 1, wastePct: 0 };
      case "evt-no-broker-inventory":
        return {
          latencyMs: 160,
          chainHops: 3,
          blockedServices: 3,
          wastePct: 0,
        };
      case "evt-no-broker-shipping":
        return {
          latencyMs: 240,
          chainHops: 4,
          blockedServices: 3,
          wastePct: 0,
        };
      case "evt-no-broker-notification":
      case "evt-no-broker-tradeoff":
        return {
          latencyMs: 320,
          chainHops: 5,
          blockedServices: 3,
          wastePct: 0,
        };
      case "evt-queue-intro":
        return { latencyMs: 55, chainHops: 2, blockedServices: 1, wastePct: 1 };
      case "evt-queue-command":
        return { latencyMs: 40, chainHops: 2, blockedServices: 1, wastePct: 1 };
      case "evt-client-ack":
        return { latencyMs: 55, chainHops: 2, blockedServices: 1, wastePct: 1 };
      case "evt-command-consume":
        return { latencyMs: 55, chainHops: 2, blockedServices: 1, wastePct: 0 };
      case "evt-pubsub-intro":
        return { latencyMs: 55, chainHops: 2, blockedServices: 1, wastePct: 1 };
      case "evt-event-publish":
        return { latencyMs: 55, chainHops: 2, blockedServices: 1, wastePct: 1 };
      case "evt-buffered":
        return { latencyMs: 55, chainHops: 2, blockedServices: 1, wastePct: 1 };
      case "evt-inventory":
      case "evt-shipping":
      case "evt-notification":
        return { latencyMs: 55, chainHops: 2, blockedServices: 3, wastePct: 1 };
      case "evt-broker-benefits":
      case "evt-tradeoff":
      case "summary":
        return { latencyMs: 55, chainHops: 2, blockedServices: 3, wastePct: 1 };
      default:
        return { latencyMs: 0, chainHops: 0, blockedServices: 0, wastePct: 0 };
    }
  }

  if (architecture === "eks-discovery") {
    switch (phase) {
      case "eks-context":
        return { latencyMs: 0, chainHops: 0, blockedServices: 0, wastePct: 0 };
      case "eks-public-dns":
        return { latencyMs: 1, chainHops: 1, blockedServices: 1, wastePct: 0 };
      case "eks-edge-entry":
        return { latencyMs: 2, chainHops: 2, blockedServices: 2, wastePct: 0 };
      case "eks-ingress-hop":
        return { latencyMs: 3, chainHops: 3, blockedServices: 3, wastePct: 0 };
      case "eks-service-dns":
        return { latencyMs: 4, chainHops: 4, blockedServices: 4, wastePct: 0 };
      case "eks-service-route":
        return { latencyMs: 5, chainHops: 5, blockedServices: 4, wastePct: 0 };
      case "eks-endpoints":
        return { latencyMs: 6, chainHops: 6, blockedServices: 5, wastePct: 0 };
      case "eks-egress-prep":
        return { latencyMs: 6, chainHops: 7, blockedServices: 5, wastePct: 1 };
      case "eks-egress-outbound":
        return { latencyMs: 6, chainHops: 7, blockedServices: 5, wastePct: 2 };
      case "eks-ops":
      case "summary":
        return { latencyMs: 6, chainHops: 7, blockedServices: 6, wastePct: 2 };
      default:
        return { latencyMs: 0, chainHops: 0, blockedServices: 0, wastePct: 0 };
    }
  }

  if (architecture === "service-aggregator") {
    switch (phase) {
      case "agg-fit":
        return { latencyMs: 0, chainHops: 0, blockedServices: 0, wastePct: 0 };
      case "agg-scenario":
        return { latencyMs: 0, chainHops: 0, blockedServices: 0, wastePct: 0 };
      case "agg-client-request":
        return { latencyMs: 20, chainHops: 1, blockedServices: 0, wastePct: 4 };
      case "agg-gateway-forward":
        return { latencyMs: 50, chainHops: 2, blockedServices: 1, wastePct: 8 };
      case "agg-discovery":
        return {
          latencyMs: 80,
          chainHops: 2,
          blockedServices: 1,
          wastePct: 12,
        };
      case "agg-dispatch":
        return {
          latencyMs: 140,
          chainHops: 3,
          blockedServices: 2,
          wastePct: 18,
        };
      case "agg-collect":
        return {
          latencyMs: 190,
          chainHops: 4,
          blockedServices: 2,
          wastePct: 24,
        };
      case "agg-merge":
        return {
          latencyMs: 210,
          chainHops: 4,
          blockedServices: 2,
          wastePct: 28,
        };
      case "agg-return":
        return {
          latencyMs: 220,
          chainHops: 5,
          blockedServices: 1,
          wastePct: 30,
        };
      case "agg-tradeoff":
      case "summary":
        return {
          latencyMs: 220,
          chainHops: 5,
          blockedServices: 2,
          wastePct: 34,
        };
      default:
        return { latencyMs: 0, chainHops: 0, blockedServices: 0, wastePct: 0 };
    }
  }

  switch (phase) {
    case "sync-fit":
      return { latencyMs: 0, chainHops: 0, blockedServices: 0, wastePct: 0 };
    case "scenario":
      return { latencyMs: 0, chainHops: 0, blockedServices: 0, wastePct: 0 };
    case "client-request":
      return { latencyMs: 20, chainHops: 1, blockedServices: 0, wastePct: 4 };
    case "gateway-forward":
      return { latencyMs: 60, chainHops: 2, blockedServices: 1, wastePct: 10 };
    case "query-product":
      return { latencyMs: 150, chainHops: 3, blockedServices: 2, wastePct: 24 };
    case "query-pricing":
      return { latencyMs: 240, chainHops: 4, blockedServices: 2, wastePct: 34 };
    case "query-order":
      return { latencyMs: 330, chainHops: 5, blockedServices: 3, wastePct: 48 };
    case "query-billing":
      return { latencyMs: 430, chainHops: 6, blockedServices: 4, wastePct: 64 };
    case "query-shipping":
      return { latencyMs: 540, chainHops: 7, blockedServices: 5, wastePct: 78 };
    case "bottleneck":
      return { latencyMs: 540, chainHops: 7, blockedServices: 5, wastePct: 82 };
    case "tight-coupling":
      return { latencyMs: 540, chainHops: 7, blockedServices: 5, wastePct: 82 };
    case "waste":
    case "summary":
      return { latencyMs: 540, chainHops: 7, blockedServices: 6, wastePct: 82 };
    default:
      return { latencyMs: 0, chainHops: 0, blockedServices: 0, wastePct: 0 };
  }
};

const getWaitingNodes = (
  architecture: ArchitectureKey,
  phase: string,
): NodeId[] => {
  if (architecture === "event-driven") {
    return [];
  }

  if (architecture === "eks-discovery") {
    return [];
  }

  if (architecture === "service-aggregator") {
    switch (phase) {
      case "agg-gateway-forward":
        return ["gateway"];
      case "agg-discovery":
      case "agg-dispatch":
      case "agg-collect":
      case "agg-merge":
      case "agg-tradeoff":
      case "summary":
        return ["gateway", "service-aggregator"];
      default:
        return [];
    }
  }

  switch (phase) {
    case "gateway-forward":
      return ["gateway"];
    case "query-product":
    case "query-pricing":
    case "query-order":
      return ["gateway", "shopping-cart"];
    case "query-billing":
    case "query-shipping":
    case "bottleneck":
    case "tight-coupling":
    case "waste":
    case "summary":
      return ["gateway", "shopping-cart", "order"];
    default:
      return [];
  }
};

const getInsights = (
  architecture: ArchitectureKey,
  phase: string,
): string[] => {
  if (architecture === "event-driven") {
    switch (phase) {
      case "evt-need":
        return [
          "Use this when one request triggers follow-up work that does not need to finish before the client gets an acknowledgement.",
          "Order workflows are a good fit because payment, stock, shipping, and notifications usually do not all belong on one blocking request path.",
        ];
      case "evt-client-request":
        return [
          "Event-driven systems still keep a thin synchronous edge for validation and admission.",
          "The long-running follow-up work is what moves off the critical path.",
        ];
      case "evt-direct-order":
        return [
          "This is the brokerless version: the producer side is still handing work directly to the order service.",
          "Nothing is buffered yet, so the request path is still tightly attached to downstream delivery decisions.",
        ];
      case "evt-no-broker-inventory":
      case "evt-no-broker-shipping":
      case "evt-no-broker-notification":
        return [
          "Without a broker, the producer must know every interested downstream consumer directly.",
          "Each extra consumer adds more producer-side coupling, retry logic, and failure handling.",
        ];
      case "evt-no-broker-tradeoff":
        return [
          "Direct fan-out without a broker removes the intermediary, but it pushes coupling and delivery responsibility back into the producer.",
          "That is why teams introduce a broker: to decouple publisher logic from consumer membership and availability.",
        ];
      case "evt-queue-intro":
      case "evt-queue-command":
        return [
          "A queue is one-to-one async communication: one command, one consumer, later.",
          "Use it when one service should own the work, but not necessarily inline on the request thread.",
        ];
      case "evt-client-ack":
        return [
          "The client is released after durable enqueue, not after every side-effect finishes.",
          "That is the core latency win compared with a deep synchronous chain.",
        ];
      case "evt-command-consume":
        return [
          "Order Service can process when capacity is available.",
          "Gateway and client do not need to stay connected while this happens.",
        ];
      case "evt-pubsub-intro":
        return [
          "After the command is handled, the next need changes: many services should react to one business event.",
          "That is the moment to switch from a queue model to pub/sub.",
        ];
      case "evt-event-publish":
        return [
          "Commands are often point-to-point; domain events are usually one-to-many.",
          "Publishing an event decouples Order from the services that react to it.",
        ];
      case "evt-buffered":
        return [
          "The broker can persist the event until subscribers are ready.",
          "Producer and consumers no longer need to be simultaneously available.",
        ];
      case "evt-inventory":
      case "evt-shipping":
        return [
          "Subscribers react independently at their own pace.",
          "A slow consumer no longer stretches the client-facing request path.",
        ];
      case "evt-notification":
        return [
          "New subscribers can react to existing events without changing the producer.",
          "This is the key pub/sub decoupling advantage over hardwired service calls.",
        ];
      case "evt-broker-benefits":
        return [
          "The broker gives you two reusable shapes: one-to-one queues and one-to-many topics.",
          "The producer now depends on the broker, not on every consumer endpoint directly.",
        ];
      case "evt-tradeoff":
      case "summary":
        return [
          "Use a short synchronous edge for immediate admission, queues for one owner, and pub/sub for fan-out reactions.",
          "The cost is eventual consistency plus operational needs like idempotency, retries, dead-letter queues, and tracing.",
        ];
      default:
        return [
          "Event-driven handoff shortens the blocking path seen by the client.",
          "Queues and topics let work continue after the synchronous request is already complete.",
        ];
    }
  }

  if (architecture === "eks-discovery") {
    switch (phase) {
      case "eks-context":
        return [
          "Pods are disposable and IPs change, so stable service names matter more than instance addresses.",
          "AWS plus Kubernetes together provide both the public edge path and the internal discovery path.",
        ];
      case "eks-public-dns":
        return [
          "Clients usually know only the public DNS name.",
          "Route 53 is the first discovery layer for external traffic.",
        ];
      case "eks-edge-entry":
        return [
          "The public hostname resolves to an ALB or NLB fronting the cluster.",
          "AWS Load Balancer Controller keeps this edge resource aligned with Kubernetes config.",
        ];
      case "eks-ingress-hop":
        return [
          "Ingress or gateway logic handles TLS, host and path routing, and often auth.",
          "This edge layer is distinct from internal service discovery.",
        ];
      case "eks-service-dns":
        return [
          "Inside EKS, callers ask DNS for Service names rather than discovering pods themselves.",
          "CoreDNS is a critical control-plane dependency in the serving path.",
        ];
      case "eks-service-route":
        return [
          "Gateways and services call stable Service names such as Product or Pricing.",
          "ClusterIP Services give callers a stable target even when pods churn.",
        ];
      case "eks-endpoints":
        return [
          "EndpointSlices and readiness determine which pods are actually discoverable.",
          "The platform picks healthy backends; callers do not track pod membership themselves.",
        ];
      case "eks-egress-prep":
      case "eks-egress-outbound":
        return [
          "Internal service discovery does not automatically solve external connectivity.",
          "Outbound paths depend on NAT, VPC endpoints, PrivateLink, DNS, IAM, and security rules.",
        ];
      case "eks-ops":
      case "summary":
        return [
          "Kubernetes discovery replaces hardcoded service locations with stable names and health-driven routing.",
          "The operational burden shifts to ingress, DNS, readiness, controllers, and VPC design.",
        ];
      default:
        return [
          "EKS uses built-in service discovery through Services and DNS.",
          "AWS handles the public edge and much of the surrounding network plumbing.",
        ];
    }
  }

  if (architecture === "service-aggregator") {
    switch (phase) {
      case "agg-fit":
        return [
          "Use an aggregator when the client still wants one synchronous response but you no longer want domain services composing data through each other.",
          "It is a dedicated composition boundary, not a general replacement for every service-to-service interaction.",
        ];
      case "agg-scenario":
        return [
          "A composite request can be handled by a dedicated aggregator instead of forcing domain services to call each other.",
          "The aggregator is optimized for a specific client query or operation.",
        ];
      case "agg-client-request":
        return [
          "The client still makes one request.",
          "The composition logic is moving to a dedicated edge or backend service.",
        ];
      case "agg-gateway-forward":
        return [
          "Gateway forwards to a dedicated aggregator instead of a domain service.",
          "Business services no longer need to chain through each other for this query.",
        ];
      case "agg-discovery":
        return [
          "Services are dynamic, so the aggregator needs discovery rather than hardcoded IPs.",
          "Registry becomes part of the runtime dependency path.",
        ];
      case "agg-dispatch":
        return [
          "Aggregator fans out directly to the services it needs.",
          "Inter-service chaining is reduced, but the aggregator is now the orchestrator.",
        ];
      case "agg-collect":
        return [
          "Responses return to one dedicated composition point.",
          "Waiting still exists, but it is concentrated in the aggregator layer instead of leaking across the domain graph.",
        ];
      case "agg-merge":
        return [
          "Aggregator combines the partial results into one coherent structure.",
          "Client-side orchestration is removed.",
        ];
      case "agg-return":
        return [
          "The client gets one structured response.",
          "Chattiness is reduced at the edge.",
        ];
      case "agg-tradeoff":
      case "summary":
        return [
          "Better than deep service-to-service chains, but still synchronous.",
          "Aggregator and registry become critical dependencies and coordination points.",
        ];
      default:
        return [
          "Service Aggregator centralizes composition.",
          "It still waits synchronously on downstream replies.",
        ];
    }
  }

  switch (phase) {
    case "sync-fit":
      return [
        "Synchronous chains are easiest to justify when the call graph is shallow and the client truly needs one immediate response.",
        "The problem begins when a simple request silently expands into many downstream dependencies.",
      ];
    case "scenario":
      return [
        "One user view now depends on multiple internal services.",
        "Some service has to orchestrate the whole response path.",
      ];
    case "client-request":
      return [
        "The client still sees a single request.",
        "The real problem is hidden inside the backend call graph.",
      ];
    case "gateway-forward":
      return [
        "Gateway is already waiting on ShoppingCart.",
        "Response time now depends on whatever happens downstream.",
      ];
    case "query-product":
    case "query-pricing":
      return [
        "ShoppingCart is blocked while waiting on another service.",
        "Latency is now additive instead of isolated to one hop.",
      ];
    case "query-order":
      return [
        "ShoppingCart now depends on Product, Pricing, and Order APIs.",
        "The chain is growing deeper, not wider.",
      ];
    case "query-billing":
    case "query-shipping":
      return [
        "Blocking has propagated upward through multiple services.",
        "Any timeout or failure now stalls the whole request.",
      ];
    case "bottleneck":
      return [
        "ShoppingCart is the hot fan-in path for every request.",
        "Order becomes a second bottleneck deeper in the chain.",
      ];
    case "tight-coupling":
      return [
        "Upstream services now know downstream contracts and timeouts.",
        "Schema changes ripple across multiple deployments.",
      ];
    case "waste":
      return [
        "Workers and sockets stay busy while waiting on downstream responses.",
        "Capacity is wasted on blocked waiting rather than useful work.",
      ];
    case "summary":
      return [
        "Latency, bottlenecks, coupling, and waste all compound together.",
        "This is exactly the pressure that motivates event-driven alternatives.",
      ];
    default:
      return [
        "We start with a blocking synchronous chain.",
        "That is the pressure the event-driven lane is meant to relieve.",
      ];
  }
};

const getMetricMeta = (
  architecture: ArchitectureKey,
  phase: string,
  stageStats: StageStats,
): { panelLabel: string; items: MetricItem[] } => {
  if (architecture === "event-driven") {
    const isDirect = EVENT_DIRECT_PHASES.includes(phase);
    const isQueue = EVENT_QUEUE_PHASES.includes(phase);
    const isPubSub = EVENT_PUBSUB_PHASES.includes(phase);

    const producerDependsOn = isDirect
      ? "3 services"
      : isQueue
        ? "1 queue"
        : isPubSub
          ? "1 broker"
          : "edge only";

    const retention = isDirect
      ? "none"
      : isQueue
        ? "queue"
        : isPubSub
          ? "topic"
          : "not yet";

    const reactionShape = isDirect
      ? "direct calls"
      : isQueue
        ? "one owner"
        : isPubSub
          ? "many reactions"
          : "background work";

    return {
      panelLabel: "EDA Snapshot",
      items: [
        {
          label: "Response",
          rowLabel: "Client-visible response",
          value: phase === "evt-need" ? "pending" : `${stageStats.latencyMs}ms`,
          color: isDirect ? "#ef4444" : "#22c55e",
        },
        {
          label: "Depends On",
          rowLabel: "Producer depends on",
          value: producerDependsOn,
          color: isDirect ? "#ef4444" : "#38bdf8",
        },
        {
          label: "Buffered",
          rowLabel: "Durable retention",
          value: retention,
          color: retention === "none" ? "#94a3b8" : "#f59e0b",
        },
        {
          label: "Shape",
          rowLabel: "Best for",
          value: reactionShape,
          color: isPubSub ? "#22c55e" : isQueue ? "#38bdf8" : "#f97316",
        },
      ],
    };
  }

  if (architecture === "eks-discovery") {
    return {
      panelLabel: "Discovery Snapshot",
      items: [
        {
          label: "Edge Layers",
          rowLabel: "Edge layers traversed",
          value: stageStats.chainHops,
          color: "#38bdf8",
        },
        {
          label: "Lookup Steps",
          rowLabel: "DNS and routing steps",
          value: stageStats.latencyMs,
          color: "#f97316",
        },
        {
          label: "Control Points",
          rowLabel: "Control points in path",
          value: stageStats.blockedServices,
          color: "#fbbf24",
        },
        {
          label: "External Paths",
          rowLabel: "External dependency paths",
          value: stageStats.wastePct,
          color: "#a78bfa",
        },
      ],
    };
  }

  return {
    panelLabel: "Pressure Snapshot",
    items: [
      {
        label: "Internal Hops",
        rowLabel: "Internal hops",
        value: stageStats.chainHops,
        color: stageStats.chainHops >= 5 ? "#ef4444" : "#60a5fa",
      },
      {
        label: "Latency",
        rowLabel: "Accumulated latency",
        value: `${stageStats.latencyMs}ms`,
        color: "#f97316",
      },
      {
        label: "Blocked",
        rowLabel: "Blocking services",
        value: stageStats.blockedServices,
        color: stageStats.blockedServices >= 4 ? "#ef4444" : "#fbbf24",
      },
      {
        label: "Waste",
        rowLabel: "Wasted capacity",
        value: `${stageStats.wastePct}%`,
        color: stageStats.wastePct >= 60 ? "#22c55e" : "#94a3b8",
      },
    ],
  };
};

const getSetupNotes = (
  architecture: ArchitectureKey,
  phase: string,
): string[] => {
  if (architecture === "event-driven") {
    switch (phase) {
      case "evt-direct-order":
      case "evt-no-broker-inventory":
      case "evt-no-broker-shipping":
      case "evt-no-broker-notification":
      case "evt-no-broker-tradeoff":
        return [
          "Without a broker, the producer must own subscriber discovery, retries, timeouts, and failure policy itself.",
          "If one consumer is unavailable there is no shared durable buffer unless you build that retention layer yourself.",
        ];
      case "evt-queue-intro":
      case "evt-queue-command":
      case "evt-client-ack":
        return [
          "Durably write the command before acknowledging the client.",
          "Use a queue for single-receiver task delegation, not for broad fan-out.",
        ];
      case "evt-command-consume":
      case "evt-pubsub-intro":
      case "evt-event-publish":
      case "evt-buffered":
        return [
          "Persist the order state and publish the event atomically, usually with an outbox or equivalent reliability pattern.",
          "Make the worker idempotent because retries and redelivery are normal in asynchronous systems.",
        ];
      case "evt-inventory":
      case "evt-shipping":
      case "evt-notification":
      case "evt-broker-benefits":
        return [
          "Each consumer should own retries, timeout policy, and dead-letter handling independently.",
          "Carry a trace or correlation ID through the command and event path so timelines remain observable.",
        ];
      case "evt-tradeoff":
      case "summary":
        return [
          "Choose commands for one owner and events for fan-out reactions.",
          "Design for eventual consistency, idempotency, retries, dead-letter queues, and end-to-end tracing from day one.",
        ];
      default:
        return [
          "Keep the synchronous edge small, then move slow or fan-out work behind durable messaging.",
        ];
    }
  }

  if (architecture !== "eks-discovery") {
    return [];
  }

  switch (phase) {
    case "eks-context":
      return [
        "Run EKS in a VPC with enough subnet IP capacity for pods.",
        "Keep CoreDNS, kube-proxy, and the AWS VPC CNI healthy because they are part of the serving path.",
      ];
    case "eks-public-dns":
    case "eks-edge-entry":
      return [
        "Create public DNS records in Route 53 for the application hostname.",
        "Install AWS Load Balancer Controller with IAM roles for service accounts and correctly tagged subnets.",
      ];
    case "eks-ingress-hop":
      return [
        "Use Ingress or Gateway API resources to define host and path routing.",
        "Decide where TLS terminates and make sure ACM certificates and security group rules match that design.",
      ];
    case "eks-service-dns":
      return [
        "Call services by DNS name such as product.default.svc.cluster.local, not by pod IP.",
        "Run enough CoreDNS replicas and watch DNS latency because name resolution is now on the request path.",
      ];
    case "eks-service-route":
    case "eks-endpoints":
      return [
        "Service selectors and labels must match the intended pods.",
        "Readiness probes and EndpointSlices determine which pods are allowed to receive traffic.",
      ];
    case "eks-egress-prep":
    case "eks-egress-outbound":
      return [
        "Use NAT gateway for public internet egress from private subnets or prefer VPC endpoints and PrivateLink for AWS services.",
        "External communication also depends on route tables, security groups, IAM, and DNS resolution.",
      ];
    case "eks-ops":
    case "summary":
      return [
        "Think in layers: Route 53, ALB or NLB, ingress or gateway, CoreDNS, Service, EndpointSlice, pod, then egress path.",
        "Discovery solves service location. You still need auth, retries, timeouts, observability, and contract management separately.",
      ];
    default:
      return [
        "Kubernetes gives you built-in discovery, but AWS still defines the public edge and outbound connectivity story.",
      ];
  }
};

const getSetupLabel = (architecture: ArchitectureKey): string => {
  if (architecture === "eks-discovery") {
    return "AWS + Kubernetes Setup";
  }

  if (architecture === "event-driven") {
    return "Async Design Notes";
  }

  return "Implementation Notes";
};

const getRelationText = (architecture: ArchitectureKey): string => {
  if (architecture === "event-driven") {
    return "This lane now separates three decisions clearly: direct fan-out without a broker keeps the producer coupled to every consumer, queues solve one-to-one delegated work, and pub/sub topics solve one-to-many reactions after a business event.";
  }

  if (architecture === "eks-discovery") {
    return "This lane explains how a gateway or aggregator actually finds services on EKS: public DNS and load balancing at the edge, built-in service discovery inside the cluster, and separate networking for outbound dependencies.";
  }

  if (architecture === "service-aggregator") {
    return "On Kubernetes, the registry behind this pattern is often not a custom registry database at all. It is usually Kubernetes Services, CoreDNS, EndpointSlices, and readiness-based routing.";
  }

  return "The next major comparison remains the event-driven lane. That will show how queues, brokers, and asynchronous work change the pressure profile compared with the synchronous paths here.";
};

const getUseCases = (architecture: ArchitectureKey): string[] => {
  if (architecture === "sync-chain") {
    return [
      "The client genuinely needs one immediate response right now.",
      "Only a small number of services are involved and the call graph is still shallow.",
      "Immediate consistency on the active path matters more than loose coupling.",
      "The team can tolerate tighter runtime coupling between services for a simpler request/response model.",
    ];
  }

  if (architecture === "service-aggregator") {
    return [
      "One client screen or query needs a single composed response from several services.",
      "You want composition to happen in one edge service instead of in domain-to-domain chains.",
      "The client still needs a synchronous response, but orchestration should be centralized.",
      "You can accept one more edge dependency in exchange for a cleaner domain graph.",
    ];
  }

  if (architecture !== "event-driven") {
    return [];
  }

  return [
    "One request triggers follow-up work that can finish after the client already has an acknowledgement.",
    "Exactly one service should own a command later, instead of doing it inline on the request thread.",
    "One business event should trigger many independent reactions such as Inventory, Shipping, and Notification.",
    "Consumers may be slower or temporarily unavailable, and you need buffering instead of direct producer-to-consumer coupling.",
  ];
};

const SyncVsEventDrivenVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, signals } =
    useSyncVsEventDrivenAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as SyncVsEventDrivenState;
  const { explanation, hotZones, phase, architecture } = st;
  const profile = ARCHITECTURE_PROFILES[architecture];
  const stageStats = getStageStats(architecture, phase);
  const waitingNodes = getWaitingNodes(architecture, phase);
  const insights = getInsights(architecture, phase);
  const metricMeta = getMetricMeta(architecture, phase, stageStats);
  const setupNotes = getSetupNotes(architecture, phase);
  const setupLabel = getSetupLabel(architecture);
  const relationText = getRelationText(architecture);
  const useCases = getUseCases(architecture);

  const hot = (zone: string) => hotZones.includes(zone);

  const scene = (() => {
    const b = viz().view(W, H);

    const pos =
      architecture === "event-driven"
        ? EVENT_POS
        : architecture === "service-aggregator"
          ? AGG_POS
          : architecture === "eks-discovery"
            ? EKS_POS
            : CHAIN_POS;
    const isEventDirectPhase =
      architecture === "event-driven" && EVENT_DIRECT_PHASES.includes(phase);
    const eventMutedNodes =
      architecture === "event-driven"
        ? EVENT_ALL_NODES.filter(
            (id) => !getEventFocusNodes(phase).includes(id),
          )
        : [];
    const isWaiting = (id: NodeId) => waitingNodes.includes(id);
    const drawNode = (
      id: NodeId,
      label: string,
      tone: "neutral" | "red" | "green" | "violet" | "blue" | "orange",
      width = 136,
      height = 56,
    ) => {
      const p = pos[id];
      if (!p) return;
      const isMutedAlternative =
        architecture === "event-driven" && eventMutedNodes.includes(id);

      const baseStroke =
        tone === "red"
          ? "#f87171"
          : tone === "green"
            ? "#84cc16"
            : tone === "violet"
              ? "#c084fc"
              : tone === "blue"
                ? "#38bdf8"
                : tone === "orange"
                  ? "#fb923c"
                  : "#cbd5e1";
      const hotFill =
        tone === "red"
          ? "rgba(127, 29, 29, 0.95)"
          : tone === "green"
            ? "rgba(54, 83, 20, 0.95)"
            : tone === "violet"
              ? "rgba(76, 29, 149, 0.9)"
              : tone === "blue"
                ? "rgba(12, 74, 110, 0.95)"
                : tone === "orange"
                  ? "rgba(124, 45, 18, 0.95)"
                  : "rgba(30, 58, 95, 0.95)";

      b.node(id)
        .at(p.x, p.y)
        .rect(width, height, 14)
        .fill(
          hot(id) || isWaiting(id)
            ? hotFill
            : isMutedAlternative
              ? "rgba(2, 6, 23, 0.36)"
              : "#0f172a",
        )
        .stroke(
          hot(id) || isWaiting(id)
            ? baseStroke
            : isMutedAlternative
              ? "rgba(71, 85, 105, 0.18)"
              : "#334155",
          2,
        )
        .label(label, {
          fill: isMutedAlternative ? "#64748b" : "#e2e8f0",
          fontSize: 12,
          fontWeight: "bold",
        });
    };

    drawNode("client", "Client", "neutral", 110, 52);

    if (architecture === "event-driven") {
      const eventSection = getEventSection(phase);
      const queueStroke =
        eventSection === "queue" ||
        phase === "evt-need" ||
        ["evt-broker-benefits", "evt-tradeoff", "summary"].includes(phase)
          ? "#f59e0b"
          : eventSection === "pubsub"
            ? "rgba(245, 158, 11, 0.22)"
            : "rgba(71, 85, 105, 0.18)";
      const queueLabel =
        eventSection === "queue" ||
        phase === "evt-need" ||
        ["evt-broker-benefits", "evt-tradeoff", "summary"].includes(phase)
          ? "#fbbf24"
          : "#64748b";
      const queueWorkerStroke =
        eventSection === "queue" ||
        phase === "evt-need" ||
        ["evt-broker-benefits", "evt-tradeoff", "summary"].includes(phase)
          ? "#38bdf8"
          : eventSection === "pubsub"
            ? "rgba(56, 189, 248, 0.22)"
            : "rgba(71, 85, 105, 0.18)";
      const queueWorkerLabel =
        eventSection === "queue" ||
        phase === "evt-need" ||
        ["evt-broker-benefits", "evt-tradeoff", "summary"].includes(phase)
          ? "#7dd3fc"
          : "#64748b";
      const pubSubStroke =
        eventSection === "pubsub" || phase === "evt-need"
          ? "#22c55e"
          : "rgba(71, 85, 105, 0.18)";
      const pubSubLabel =
        eventSection === "pubsub" || phase === "evt-need"
          ? "#86efac"
          : "#64748b";

      drawNode("gateway", "Gateway", "neutral", 128, 54);
      drawNode("command-queue", "Command Queue", "blue", 154, 54);
      drawNode("order-service", "Order Service", "orange", 148, 56);
      drawNode("event-bus", "Event Bus", "blue", 144, 54);
      drawNode("inventory", "Inventory", "green", 132, 52);
      drawNode("shipment", "Shipment", "green", 132, 52);
      drawNode("notification", "Notification", "green", 148, 54);

      b.edge("client", "gateway", "e-client-gateway")
        .stroke("#64748b", 2)
        .arrow(true)
        .label("HTTPS", { fill: "#94a3b8", fontSize: 8 });

      b.edge("gateway", "command-queue", "e-gateway-command-queue")
        .stroke(queueStroke, 2)
        .arrow(true)
        .label("CreateOrder", { fill: queueLabel, fontSize: 8 });

      if (isEventDirectPhase) {
        b.edge("gateway", "order-service", "e-gateway-order-service")
          .stroke("#ef4444", 2)
          .arrow(true)
          .label("direct create", { fill: "#fecaca", fontSize: 8 });

        b.edge("order-service", "inventory", "e-order-inventory-direct")
          .stroke("#ef4444", 1.8)
          .arrow(true)
          .dashed()
          .label("direct notify", { fill: "#fecaca", fontSize: 8 });

        b.edge("order-service", "shipment", "e-order-shipment-direct")
          .stroke("#ef4444", 1.8)
          .arrow(true)
          .dashed()
          .label("direct notify", { fill: "#fecaca", fontSize: 8 });

        b.edge("order-service", "notification", "e-order-notification-direct")
          .stroke("#ef4444", 1.8)
          .arrow(true)
          .dashed()
          .label("direct notify", { fill: "#fecaca", fontSize: 8 });
      }

      b.edge("command-queue", "order-service", "e-command-queue-order")
        .stroke(queueWorkerStroke, 1.8)
        .arrow(true)
        .label("1 worker", { fill: queueWorkerLabel, fontSize: 8 });

      b.edge("order-service", "event-bus", "e-order-event-bus")
        .stroke(pubSubStroke, 1.9)
        .arrow(true)
        .label("OrderCreated", { fill: pubSubLabel, fontSize: 8 });

      b.edge("event-bus", "inventory", "e-event-bus-inventory")
        .stroke(pubSubStroke, 1.7)
        .arrow(true)
        .label("reserve stock", { fill: pubSubLabel, fontSize: 8 });

      b.edge("event-bus", "shipment", "e-event-bus-shipment")
        .stroke(pubSubStroke, 1.7)
        .arrow(true)
        .label("prepare shipment", { fill: pubSubLabel, fontSize: 8 });

      b.edge("event-bus", "notification", "e-event-bus-notification")
        .stroke(pubSubStroke, 1.7)
        .arrow(true)
        .label("notify customer", { fill: pubSubLabel, fontSize: 8 });
    } else if (architecture === "eks-discovery") {
      drawNode("route53", "Route 53", "blue", 118, 50);
      drawNode("alb", "ALB / NLB", "blue", 128, 54);
      drawNode("gateway", "Ingress / Gateway", "orange", 154, 56);
      drawNode("coredns", "CoreDNS", "blue", 120, 50);
      drawNode("product-svc", "Product Service", "green", 144, 54);
      drawNode("cart-svc", "Cart Service", "green", 144, 54);
      drawNode("pricing-svc", "Pricing Service", "green", 144, 54);
      drawNode("product-pod", "Product Pod", "green", 130, 50);
      drawNode("cart-pod", "Cart Pod", "green", 130, 50);
      drawNode("pricing-pod", "Pricing Pod", "green", 130, 50);
      drawNode("nat-gateway", "NAT / VPCE", "violet", 132, 50);
      drawNode("external-system", "AWS / External", "violet", 142, 52);

      b.edge("client", "route53", "e-client-route53")
        .stroke("#38bdf8", 1.7)
        .arrow(true)
        .dashed()
        .label("DNS", { fill: "#7dd3fc", fontSize: 8 });

      b.edge("route53", "alb", "e-route53-alb")
        .stroke("#38bdf8", 1.7)
        .arrow(true)
        .dashed()
        .label("ALIAS", { fill: "#7dd3fc", fontSize: 8 });

      b.edge("alb", "gateway", "e-alb-gateway")
        .stroke("#f97316", 2)
        .arrow(true)
        .label("HTTPS", { fill: "#fdba74", fontSize: 8 });

      b.edge("gateway", "coredns", "e-gateway-coredns")
        .stroke("#38bdf8", 1.7)
        .arrow(true)
        .dashed()
        .label("svc lookup", { fill: "#7dd3fc", fontSize: 8 });

      b.edge("gateway", "product-svc", "e-gateway-product-svc")
        .stroke("#f97316", 1.8)
        .arrow(true)
        .label("product", { fill: "#fdba74", fontSize: 8 });

      b.edge("gateway", "cart-svc", "e-gateway-cart-svc")
        .stroke("#f97316", 1.8)
        .arrow(true)
        .label("cart", { fill: "#fdba74", fontSize: 8 });

      b.edge("gateway", "pricing-svc", "e-gateway-pricing-svc")
        .stroke("#f97316", 1.8)
        .arrow(true)
        .label("pricing", { fill: "#fdba74", fontSize: 8 });

      b.edge("product-svc", "product-pod", "e-product-svc-pod")
        .stroke("#84cc16", 1.6)
        .arrow(true)
        .label("ready endpoint", { fill: "#bef264", fontSize: 7 });

      b.edge("cart-svc", "cart-pod", "e-cart-svc-pod")
        .stroke("#84cc16", 1.6)
        .arrow(true)
        .label("ready endpoint", { fill: "#bef264", fontSize: 7 });

      b.edge("pricing-svc", "pricing-pod", "e-pricing-svc-pod")
        .stroke("#84cc16", 1.6)
        .arrow(true)
        .label("ready endpoint", { fill: "#bef264", fontSize: 7 });

      b.edge("product-pod", "nat-gateway", "e-pod-nat")
        .stroke("#a78bfa", 1.7)
        .arrow(true)
        .dashed()
        .label("egress", { fill: "#ddd6fe", fontSize: 8 });

      b.edge("nat-gateway", "external-system", "e-nat-external")
        .stroke("#a78bfa", 1.7)
        .arrow(true)
        .dashed()
        .label("AWS / SaaS", { fill: "#ddd6fe", fontSize: 8 });
    } else if (architecture === "service-aggregator") {
      drawNode("gateway", "Gateway", "neutral", 128, 54);
      drawNode("service-aggregator", "Service Aggregator", "red", 156, 56);
      drawNode("service-registry", "Service Registry", "blue", 148, 54);
      drawNode("product", "Product", "green", 132, 52);
      drawNode("shopping-cart", "ShoppingCart", "green", 150, 56);
      drawNode("pricing", "Pricing", "green", 132, 52);

      b.edge("client", "gateway", "e-client-gateway")
        .stroke("#64748b", 2)
        .arrow(true)
        .label("HTTP", { fill: "#94a3b8", fontSize: 8 });

      b.edge("gateway", "service-aggregator", "e-gateway-agg")
        .stroke("#f97316", 2)
        .arrow(true)
        .label("1 AddItem", { fill: "#f97316", fontSize: 9 });

      b.edge("service-aggregator", "product", "e-agg-product")
        .stroke("#84cc16", 1.8)
        .arrow(true)
        .label("2 GetProduct", { fill: "#84cc16", fontSize: 8 });

      b.edge("service-aggregator", "shopping-cart", "e-agg-cart")
        .stroke("#84cc16", 1.8)
        .arrow(true)
        .label("3 GetSC", { fill: "#84cc16", fontSize: 8 });

      b.edge("service-aggregator", "pricing", "e-agg-pricing")
        .stroke("#84cc16", 1.8)
        .arrow(true)
        .label("4 GetPrice", { fill: "#84cc16", fontSize: 8 });

      b.edge("service-aggregator", "service-registry", "e-agg-registry")
        .stroke("#38bdf8", 1.8)
        .arrow(true)
        .dashed()
        .label("Get IPs", { fill: "#38bdf8", fontSize: 8 });

      ["product", "shopping-cart", "pricing"].forEach((serviceId, index) => {
        b.edge(serviceId, "service-registry", `e-register-${index}`)
          .stroke("rgba(248, 113, 113, 0.55)", 1.1)
          .arrow(true)
          .dashed();
      });
    } else {
      drawNode("gateway", "Gateway", "neutral", 128, 54);
      drawNode("shopping-cart", "ShoppingCart", "red", 150, 56);
      drawNode("product", "Product", "green", 130, 52);
      drawNode("pricing", "Pricing", "green", 130, 52);
      drawNode("order", "Order", "violet", 126, 52);
      drawNode("billing", "Billing", "violet", 130, 52);
      drawNode("shipping", "Shipping", "violet", 130, 52);

      b.edge("client", "gateway", "e-client-gateway")
        .stroke("#64748b", 2)
        .arrow(true)
        .label("HTTP", { fill: "#94a3b8", fontSize: 8 });

      b.edge("gateway", "shopping-cart", "e-gateway-cart")
        .stroke("#f97316", 2)
        .arrow(true)
        .label("1 OrderView", { fill: "#f97316", fontSize: 9 });

      b.edge("shopping-cart", "product", "e-cart-product")
        .stroke("#84cc16", 1.8)
        .arrow(true)
        .label("2 GetProduct", { fill: "#84cc16", fontSize: 8 });

      b.edge("shopping-cart", "pricing", "e-cart-pricing")
        .stroke("#84cc16", 1.8)
        .arrow(true)
        .label("3 GetPrice", { fill: "#84cc16", fontSize: 8 });

      b.edge("shopping-cart", "order", "e-cart-order")
        .stroke("#c084fc", 1.8)
        .arrow(true)
        .label("4 GetOrder", { fill: "#c084fc", fontSize: 8 });

      b.edge("order", "billing", "e-order-billing")
        .stroke("#c084fc", 1.8)
        .arrow(true)
        .label("5 GetBilling", { fill: "#c084fc", fontSize: 8 });

      b.edge("order", "shipping", "e-order-shipping")
        .stroke("#c084fc", 1.8)
        .arrow(true)
        .label("6 GetShipping", { fill: "#c084fc", fontSize: 8 });
    }

    b.overlay((o) => {
      o.add(
        "text",
        {
          x: W / 2,
          y: 28,
          text:
            architecture === "event-driven"
              ? "Event-Driven Handoff Pattern"
              : architecture === "eks-discovery"
                ? "AWS EKS Service Discovery"
                : architecture === "service-aggregator"
                  ? "Service Aggregator Pattern"
                  : "Service-to-Service Chained Sync Queries",
          fill: profile.color,
          fontSize: 15,
          fontWeight: "bold",
        },
        { key: "lab-title" },
      );

      if (architecture === "event-driven") {
        o.add(
          "rect",
          {
            x: 326,
            y: 110,
            w: 380,
            h: 270,
            rx: 20,
            ry: 20,
            fill: "rgba(8, 47, 73, 0.08)",
            stroke: "rgba(34, 197, 94, 0.36)",
            strokeWidth: 1.2,
            opacity: 1,
          },
          { key: "event-broker-boundary" },
        );
        o.add(
          "text",
          {
            x: 516,
            y: 100,
            text: "Message Broker",
            fill: "#86efac",
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "event-broker-boundary-label" },
        );

        if (phase === "evt-need") {
          o.add(
            "text",
            {
              x: 300,
              y: 74,
              text: "Use async when follow-up work should not block the client",
              fill: "#86efac",
              fontSize: 12,
              fontWeight: "bold",
            },
            { key: "event-scenario-title" },
          );
        }

        if (EVENT_DIRECT_PHASES.includes(phase)) {
          o.add(
            "text",
            {
              x: 520,
              y: 250,
              text: "NO BROKER",
              fill: "rgba(239, 68, 68, 0.9)",
              fontSize: 26,
              fontWeight: "bold",
            },
            { key: "event-no-broker-banner" },
          );
        }

        if (EVENT_QUEUE_PHASES.includes(phase)) {
          o.add(
            "rect",
            {
              x: 332,
              y: 168,
              w: 180,
              h: 320,
              rx: 18,
              ry: 18,
              fill: "rgba(14, 165, 233, 0.05)",
              stroke: "rgba(56, 189, 248, 0.35)",
              strokeWidth: 1.2,
              opacity: 1,
            },
            { key: "event-queue-focus-box" },
          );
        }

        if (EVENT_PUBSUB_PHASES.includes(phase)) {
          o.add(
            "rect",
            {
              x: 546,
              y: 122,
              w: 388,
              h: 390,
              rx: 18,
              ry: 18,
              fill: "rgba(34, 197, 94, 0.04)",
              stroke: "rgba(34, 197, 94, 0.28)",
              strokeWidth: 1.2,
              opacity: 1,
            },
            { key: "event-pubsub-focus-box" },
          );
        }

        if (isEventDirectPhase) {
          o.add(
            "text",
            {
              x: 650,
              y: 82,
              text: "No broker: producer calls each subscriber directly",
              fill: "#fecaca",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "event-direct-note" },
          );
          o.add(
            "text",
            {
              x: 402,
              y: 520,
              text: "Producer owns subscriber list, retries, and failure handling",
              fill: "#fecaca",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "event-direct-tradeoff-note" },
          );
        }

        if (
          [
            "evt-queue-intro",
            "evt-queue-command",
            "evt-client-ack",
            "evt-command-consume",
            "evt-broker-benefits",
            "evt-tradeoff",
            "summary",
          ].includes(phase)
        ) {
          o.add(
            "text",
            {
              x: EVENT_POS["command-queue"]!.x + 4,
              y: EVENT_POS["command-queue"]!.y - 42,
              text: "One-to-one queue for one owner",
              fill: "#7dd3fc",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "event-queue-note" },
          );
        }

        if (
          [
            "evt-pubsub-intro",
            "evt-event-publish",
            "evt-buffered",
            "evt-inventory",
            "evt-shipping",
            "evt-notification",
            "evt-broker-benefits",
            "evt-tradeoff",
            "summary",
          ].includes(phase)
        ) {
          o.add(
            "text",
            {
              x: EVENT_POS["event-bus"]!.x + 8,
              y: EVENT_POS["event-bus"]!.y - 42,
              text: "One-to-many topic / pub-sub",
              fill: "#86efac",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "event-topic-note" },
          );
        }

        if (phase === "evt-client-ack") {
          o.add(
            "text",
            {
              x: 168,
              y: 256,
              text: "202 Accepted after durable enqueue",
              fill: "#86efac",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "event-ack-note" },
          );
        }

        if (phase === "evt-buffered") {
          o.add(
            "text",
            {
              x: 574,
              y: 390,
              text: "Stored until each subscriber is ready",
              fill: "#86efac",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "event-buffered-note" },
          );
        }

        if (
          [
            "evt-notification",
            "evt-broker-benefits",
            "evt-tradeoff",
            "summary",
          ].includes(phase)
        ) {
          o.add(
            "text",
            {
              x: 788,
              y: 510,
              text: "New subscriber, no producer change",
              fill: "#86efac",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "event-new-subscriber-note" },
          );
        }

        if (
          ["evt-broker-benefits", "evt-tradeoff", "summary"].includes(phase)
        ) {
          o.add(
            "text",
            {
              x: 542,
              y: 530,
              text: "Queue for commands, topic for reactions",
              fill: "#bbf7d0",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "event-broker-benefits-note" },
          );
        }

        if (["evt-tradeoff", "summary"].includes(phase)) {
          o.add(
            "text",
            {
              x: 342,
              y: 540,
              text: "Needs idempotency, retries, DLQ, tracing",
              fill: "#bbf7d0",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "event-tradeoff-note" },
          );
        }
      } else if (architecture === "eks-discovery") {
        o.add(
          "rect",
          {
            x: 332,
            y: 78,
            w: 586,
            h: 420,
            rx: 20,
            ry: 20,
            fill: "rgba(8, 47, 73, 0.08)",
            stroke: "rgba(56, 189, 248, 0.36)",
            strokeWidth: 1.2,
            opacity: 1,
          },
          { key: "eks-boundary" },
        );
        o.add(
          "text",
          {
            x: 625,
            y: 96,
            text: "EKS Cluster / Private Subnets",
            fill: "#7dd3fc",
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "eks-boundary-label" },
        );

        if (phase === "eks-context") {
          o.add(
            "text",
            {
              x: 395,
              y: 62,
              text: "Public edge outside the cluster, built-in discovery inside it",
              fill: "#7dd3fc",
              fontSize: 11,
              fontWeight: "bold",
            },
            { key: "eks-context-title" },
          );
        }

        if (phase === "eks-public-dns") {
          o.add(
            "text",
            {
              x: EKS_POS.route53!.x + 20,
              y: EKS_POS.route53!.y - 40,
              text: "api.shop.example.com",
              fill: "#7dd3fc",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "route53-hostname" },
          );
        }

        if (phase === "eks-edge-entry") {
          o.add(
            "text",
            {
              x: EKS_POS.alb!.x + 34,
              y: EKS_POS.alb!.y - 40,
              text: "Provisioned by AWS Load Balancer Controller",
              fill: "#fdba74",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "alb-controller-note" },
          );
        }

        if (phase === "eks-ingress-hop") {
          o.add(
            "text",
            {
              x: EKS_POS.gateway!.x + 28,
              y: EKS_POS.gateway!.y - 42,
              text: "TLS, auth, host and path routing",
              fill: "#fdba74",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "gateway-note" },
          );
        }

        if (phase === "eks-service-dns") {
          o.add(
            "text",
            {
              x: 515,
              y: 210,
              text: "product.default.svc.cluster.local",
              fill: "#7dd3fc",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "service-dns-name" },
          );
        }

        if (phase === "eks-service-route") {
          o.add(
            "text",
            {
              x: 640,
              y: 128,
              text: "Stable Service names and ClusterIP targets",
              fill: "#bef264",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "service-route-note" },
          );
        }

        if (phase === "eks-endpoints") {
          o.add(
            "text",
            {
              x: 792,
              y: 128,
              text: "Only ready pods become endpoints",
              fill: "#bef264",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "endpoint-note" },
          );
        }

        if (
          [
            "eks-egress-prep",
            "eks-egress-outbound",
            "eks-ops",
            "summary",
          ].includes(phase)
        ) {
          o.add(
            "text",
            {
              x: 648,
              y: 592,
              text: "NAT Gateway, VPC Endpoint, or PrivateLink",
              fill: "#ddd6fe",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "egress-note" },
          );
        }

        if (["eks-ops", "summary"].includes(phase)) {
          o.add(
            "text",
            {
              x: 250,
              y: 248,
              text: "IRSA, subnet tags, ACM, security groups",
              fill: "#fed7aa",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "ops-edge-note" },
          );
          o.add(
            "text",
            {
              x: 610,
              y: 502,
              text: "Service selectors, readiness, EndpointSlices",
              fill: "#bef264",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "ops-service-note" },
          );
          o.add(
            "text",
            {
              x: 814,
              y: 494,
              text: "Pod IPs come from the VPC CNI",
              fill: "#7dd3fc",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "ops-pod-note" },
          );
        }
      } else if (architecture === "service-aggregator") {
        if (phase === "agg-fit") {
          o.add(
            "text",
            {
              x: 292,
              y: 76,
              text: "Keep one synchronous response, but centralize composition at the edge",
              fill: "#fdba74",
              fontSize: 12,
              fontWeight: "bold",
            },
            { key: "agg-fit-title" },
          );
        }

        if (phase === "agg-scenario") {
          o.add(
            "text",
            {
              x: 330,
              y: 76,
              text: "One composite request, one structured response",
              fill: "#fdba74",
              fontSize: 12,
              fontWeight: "bold",
            },
            { key: "agg-scenario-title" },
          );
        }

        if (["agg-discovery", "agg-tradeoff", "summary"].includes(phase)) {
          o.add(
            "text",
            {
              x: AGG_POS["service-registry"]!.x - 12,
              y: AGG_POS["service-registry"]!.y - 48,
              text: "Dynamic IPs / ports",
              fill: "#7dd3fc",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "registry-note" },
          );
        }

        if (
          ["agg-merge", "agg-return", "agg-tradeoff", "summary"].includes(phase)
        ) {
          o.add(
            "text",
            {
              x: AGG_POS["service-aggregator"]!.x + 14,
              y: AGG_POS["service-aggregator"]!.y - 42,
              text: "Combine into one coherent structure",
              fill: "#fdba74",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "agg-merge-note" },
          );
        }

        if (["agg-tradeoff", "summary"].includes(phase)) {
          o.add(
            "text",
            {
              x: AGG_POS["service-aggregator"]!.x + 18,
              y: AGG_POS["service-aggregator"]!.y + 88,
              text: "Owns Product / Cart / Pricing contracts",
              fill: "#fed7aa",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "agg-coupling-note" },
          );
          o.add(
            "text",
            {
              x: AGG_POS["service-aggregator"]!.x + 30,
              y: AGG_POS["service-aggregator"]!.y + 104,
              text: "Aggregation hotspot",
              fill: "#fecaca",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "agg-hotspot-note" },
          );
        }
      } else {
        if (phase === "sync-fit") {
          o.add(
            "text",
            {
              x: 250,
              y: 74,
              text: "Sync feels fine while the response path is still shallow and immediate",
              fill: "#fb7185",
              fontSize: 12,
              fontWeight: "bold",
            },
            { key: "sync-fit-title" },
          );
        }

        if (phase === "scenario") {
          o.add(
            "text",
            {
              x: 290,
              y: 74,
              text: "Order Details view needs data from many services",
              fill: "#fb7185",
              fontSize: 12,
              fontWeight: "bold",
            },
            { key: "scenario-title" },
          );
        }

        if (
          ["bottleneck", "tight-coupling", "waste", "summary"].includes(phase)
        ) {
          const cartPos = CHAIN_POS["shopping-cart"]!;
          const orderPos = CHAIN_POS.order!;

          o.add(
            "rect",
            {
              x: cartPos.x - 20,
              y: cartPos.y + 72,
              w: 88,
              h: 24,
              rx: 8,
              ry: 8,
              fill: "rgba(239, 68, 68, 0.12)",
              stroke: "#ef4444",
              strokeWidth: 1,
              opacity: 1,
            },
            { key: "cart-queue-box" },
          );
          o.add(
            "text",
            {
              x: cartPos.x + 24,
              y: cartPos.y + 88,
              text: "Queue growing",
              fill: "#fecaca",
              fontSize: 9,
              fontWeight: "bold",
            },
            { key: "cart-queue-text" },
          );

          o.add(
            "rect",
            {
              x: orderPos.x + 6,
              y: orderPos.y + 72,
              w: 88,
              h: 24,
              rx: 8,
              ry: 8,
              fill: "rgba(239, 68, 68, 0.12)",
              stroke: "#ef4444",
              strokeWidth: 1,
              opacity: 1,
            },
            { key: "order-queue-box" },
          );
          o.add(
            "text",
            {
              x: orderPos.x + 50,
              y: orderPos.y + 88,
              text: "Fan-in hotspot",
              fill: "#fecaca",
              fontSize: 9,
              fontWeight: "bold",
            },
            { key: "order-queue-text" },
          );
        }

        if (["tight-coupling", "waste", "summary"].includes(phase)) {
          o.add(
            "text",
            {
              x: 410,
              y: 112,
              text: "Knows Product / Pricing / Order APIs",
              fill: "#d8b4fe",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "cart-coupling" },
          );
          o.add(
            "text",
            {
              x: 760,
              y: 112,
              text: "Knows Billing / Shipping APIs",
              fill: "#d8b4fe",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: "order-coupling" },
          );
        }

        if (["waste", "summary"].includes(phase)) {
          const wasteNodes: Array<{ id: NodeId; text: string }> = [
            { id: "gateway", text: "blocked worker" },
            { id: "shopping-cart", text: "open socket + thread" },
            { id: "order", text: "idle waiting" },
          ];

          wasteNodes.forEach(({ id, text }) => {
            const p = CHAIN_POS[id]!;
            o.add(
              "rect",
              {
                x: p.x - 4,
                y: p.y + 102,
                w: 100,
                h: 22,
                rx: 8,
                ry: 8,
                fill: "rgba(34, 197, 94, 0.12)",
                stroke: "#22c55e",
                strokeWidth: 1,
                opacity: 1,
              },
              { key: `waste-box-${id}` },
            );
            o.add(
              "text",
              {
                x: p.x + 46,
                y: p.y + 117,
                text,
                fill: "#bbf7d0",
                fontSize: 9,
                fontWeight: "bold",
              },
              { key: `waste-text-${id}` },
            );
          });
        }
      }

      waitingNodes.forEach((nodeId) => {
        const p = pos[nodeId];
        if (!p) return;

        o.add(
          "rect",
          {
            x: p.x + 20,
            y: p.y - 26,
            w: 66,
            h: 18,
            rx: 9,
            ry: 9,
            fill: "rgba(239, 68, 68, 0.16)",
            stroke: "#ef4444",
            strokeWidth: 1,
            opacity: 1,
          },
          { key: `wait-box-${nodeId}` },
        );
        o.add(
          "text",
          {
            x: p.x + 53,
            y: p.y - 13,
            text: "WAITING",
            fill: "#fecaca",
            fontSize: 8,
            fontWeight: "bold",
          },
          { key: `wait-text-${nodeId}` },
        );
      });

      if (signals.length > 0) {
        signals.forEach((sig: Signal) => {
          const { id, colorClass, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, {
            key: id,
            className: colorClass,
          });
        });
      }
    });

    return b;
  })();

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
    const unsub = pzRef.current?.onChange((state) => {
      viewportRef.current = state;
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

  const pills =
    architecture === "event-driven"
      ? [
          {
            key: "async-communication" as ConceptKey,
            label: "When To Use",
            color: "#86efac",
            borderColor: "#22c55e",
          },
          {
            key: "brokerless-fanout" as ConceptKey,
            label: "No Broker",
            color: "#fecaca",
            borderColor: "#ef4444",
          },
          {
            key: "point-to-point-queue" as ConceptKey,
            label: "Queue",
            color: "#fde68a",
            borderColor: "#f59e0b",
          },
          {
            key: "message-broker" as ConceptKey,
            label: "Broker",
            color: "#7dd3fc",
            borderColor: "#38bdf8",
          },
          {
            key: "pub-sub-topic" as ConceptKey,
            label: "Pub/Sub",
            color: "#bbf7d0",
            borderColor: "#22c55e",
          },
          {
            key: "eventual-consistency" as ConceptKey,
            label: "Consistency",
            color: "#ddd6fe",
            borderColor: "#a78bfa",
          },
        ]
      : architecture === "eks-discovery"
        ? [
            {
              key: "eks-discovery" as ConceptKey,
              label: "EKS Discovery",
              color: "#7dd3fc",
              borderColor: "#38bdf8",
            },
            {
              key: "service-registry" as ConceptKey,
              label: "Registry",
              color: "#7dd3fc",
              borderColor: "#38bdf8",
            },
            {
              key: "k8s-service-dns" as ConceptKey,
              label: "Service DNS",
              color: "#7dd3fc",
              borderColor: "#0ea5e9",
            },
            {
              key: "aws-ingress" as ConceptKey,
              label: "AWS Ingress",
              color: "#fdba74",
              borderColor: "#f97316",
            },
            {
              key: "pod-networking" as ConceptKey,
              label: "Pod Networking",
              color: "#86efac",
              borderColor: "#22c55e",
            },
            {
              key: "external-egress" as ConceptKey,
              label: "External Egress",
              color: "#ddd6fe",
              borderColor: "#a78bfa",
            },
          ]
        : architecture === "service-aggregator"
          ? [
              {
                key: "sync-request-response" as ConceptKey,
                label: "Sync Calls",
                color: "#fca5a5",
                borderColor: "#ef4444",
              },
              {
                key: "service-aggregator" as ConceptKey,
                label: "Aggregator",
                color: "#fdba74",
                borderColor: "#f97316",
              },
              {
                key: "service-registry" as ConceptKey,
                label: "Registry",
                color: "#7dd3fc",
                borderColor: "#38bdf8",
              },
            ]
          : [
              {
                key: "sync-request-response" as ConceptKey,
                label: "Sync Calls",
                color: "#fca5a5",
                borderColor: "#ef4444",
              },
              {
                key: "chain-query" as ConceptKey,
                label: "Chain Query",
                color: "#fdba74",
                borderColor: "#f97316",
              },
              {
                key: "bottleneck" as ConceptKey,
                label: "Bottleneck",
                color: "#fca5a5",
                borderColor: "#e11d48",
              },
              {
                key: "tight-coupling" as ConceptKey,
                label: "Coupling",
                color: "#d8b4fe",
                borderColor: "#a855f7",
              },
              {
                key: "wasted-resources" as ConceptKey,
                label: "Waste",
                color: "#86efac",
                borderColor: "#22c55e",
              },
            ];

  return (
    <div
      className={`sync-vs-event-driven-root sync-vs-event-driven-phase--${phase}`}
    >
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="sync-vs-event-driven-stage">
            <StageHeader
              title="Service Interaction Lab"
              subtitle={profile.label}
            >
              <StatBadge
                label="Scenario"
                value={profile.shortLabel}
                color={profile.color}
              />
              {metricMeta.items.map((item) => (
                <StatBadge
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  color={item.color}
                />
              ))}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
            {useCases.length > 0 ? (
              <SideCard label="Use This When" variant="info">
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    fontSize: 12,
                    color: "#cbd5e1",
                  }}
                >
                  {useCases.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </SideCard>
            ) : null}
            <SideCard label={metricMeta.panelLabel} variant="info">
              <div style={{ display: "grid", gap: 8 }}>
                {metricMeta.items.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "#94a3b8" }}>{item.rowLabel}</span>
                    <strong style={{ color: item.color }}>{item.value}</strong>
                  </div>
                ))}
              </div>
            </SideCard>
            <SideCard label="Key Takeaways" variant="info">
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 12,
                  color: "#cbd5e1",
                }}
              >
                {insights.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </SideCard>
            <SideCard label="Scenario Profile" variant="info">
              <p
                style={{
                  color: profile.color,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                {profile.label}
              </p>
              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                {profile.description}
              </p>
              <div style={{ marginBottom: 8 }}>
                <span
                  style={{ color: "#22c55e", fontWeight: 600, fontSize: 11 }}
                >
                  Strengths
                </span>
                <ul
                  style={{
                    margin: "4px 0 0 14px",
                    fontSize: 11,
                    color: "#cbd5e1",
                  }}
                >
                  {profile.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span
                  style={{ color: "#ef4444", fontWeight: 600, fontSize: 11 }}
                >
                  Weaknesses
                </span>
                <ul
                  style={{
                    margin: "4px 0 0 14px",
                    fontSize: 11,
                    color: "#cbd5e1",
                  }}
                >
                  {profile.weaknesses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </SideCard>
            {setupNotes.length > 0 ? (
              <SideCard label={setupLabel} variant="info">
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    fontSize: 12,
                    color: "#cbd5e1",
                  }}
                >
                  {setupNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </SideCard>
            ) : null}
            <SideCard label="Where This Fits" variant="info">
              <p style={{ fontSize: 12, color: "#94a3b8" }}>{relationText}</p>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default SyncVsEventDrivenVisualization;
