import type { SyncVsEventDrivenState } from "./syncVsEventDrivenSlice";
import { ARCHITECTURE_PROFILES } from "./syncVsEventDrivenSlice";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   Sync vs Event-Driven Lab — Declarative Flow Engine

  Compare four service-interaction stories in one lab:
  sync chains, a service aggregator, EKS discovery, and a
  brokered event-driven path that explicitly contrasts direct
  fan-out, one-to-one queues, and one-to-many pub/sub.
   ══════════════════════════════════════════════════════════ */

export type FlowBeat = GenericFlowBeat<SyncVsEventDrivenState>;
export type StepDef = GenericStepDef<SyncVsEventDrivenState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<SyncVsEventDrivenState>;

const isSyncChain = (state: SyncVsEventDrivenState) =>
  state.architecture === "sync-chain";
const isAggregator = (state: SyncVsEventDrivenState) =>
  state.architecture === "service-aggregator";
const isEksDiscovery = (state: SyncVsEventDrivenState) =>
  state.architecture === "eks-discovery";
const isEventDriven = (state: SyncVsEventDrivenState) =>
  state.architecture === "event-driven";

export function expandToken(
  token: string,
  state: SyncVsEventDrivenState,
): string[] {
  if (token === "$client") return ["client"];
  if (token === "$gateway") return ["gateway"];
  if (token === "$route53") return ["route53"];
  if (token === "$alb") return ["alb"];
  if (token === "$coredns") return ["coredns"];
  if (token === "$command-queue") return ["command-queue"];
  if (token === "$order-service") return ["order-service"];
  if (token === "$event-bus") return ["event-bus"];
  if (token === "$inventory") return ["inventory"];
  if (token === "$shipment") return ["shipment"];
  if (token === "$notification") return ["notification"];
  if (token === "$cart") return ["shopping-cart"];
  if (token === "$aggregator") return ["service-aggregator"];
  if (token === "$registry") return ["service-registry"];
  if (token === "$product-service") return ["product-svc"];
  if (token === "$cart-service") return ["cart-svc"];
  if (token === "$pricing-service") return ["pricing-svc"];
  if (token === "$k8s-services")
    return ["product-svc", "cart-svc", "pricing-svc"];
  if (token === "$service-pods")
    return ["product-pod", "cart-pod", "pricing-pod"];
  if (token === "$product-pod") return ["product-pod"];
  if (token === "$nat-gateway") return ["nat-gateway"];
  if (token === "$external-system") return ["external-system"];
  if (token === "$agg-services") return ["product", "shopping-cart", "pricing"];
  if (token === "$product") return ["product"];
  if (token === "$pricing") return ["pricing"];
  if (token === "$order") return ["order"];
  if (token === "$billing") return ["billing"];
  if (token === "$shipping") return ["shipping"];
  if (token === "$architecture") return [state.architecture];
  return [token];
}

export type StepKey =
  | "overview"
  | "sync-fit"
  | "aggregator-fit"
  | "composite-view"
  | "event-scenario"
  | "event-client-gateway"
  | "event-direct-order"
  | "event-direct-inventory"
  | "event-direct-shipping"
  | "event-direct-notification"
  | "event-direct-tradeoff"
  | "event-queue-intro"
  | "event-gateway-queue"
  | "event-client-ack"
  | "event-queue-order"
  | "event-pubsub-intro"
  | "event-order-publish"
  | "event-broker-store"
  | "event-inventory-consume"
  | "event-shipping-consume"
  | "event-notification-consume"
  | "event-broker-benefits"
  | "event-tradeoff"
  | "client-gateway"
  | "gateway-cart"
  | "aggregator-request"
  | "gateway-aggregator"
  | "discover-services"
  | "dispatch-services"
  | "collect-services"
  | "aggregate-results"
  | "aggregator-return"
  | "aggregator-tradeoff"
  | "eks-context"
  | "route53-lookup"
  | "alb-entry"
  | "ingress-gateway"
  | "cluster-dns"
  | "service-routing"
  | "ready-endpoints"
  | "pod-egress"
  | "external-egress"
  | "eks-ops"
  | "call-product"
  | "call-pricing"
  | "call-order"
  | "call-billing"
  | "call-shipping"
  | "bottleneck"
  | "tight-coupling"
  | "wasted-resources"
  | "summary";

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: (state) =>
      state.architecture === "service-aggregator"
        ? "When Aggregator Helps"
        : state.architecture === "event-driven"
          ? "When We'd Need Async"
          : state.architecture === "eks-discovery"
            ? "Dynamic Platform"
            : "When Sync Fits",
    action: "resetRun",
    explain: (state) => {
      const profile = ARCHITECTURE_PROFILES[state.architecture];
      return `${profile.label}: ${profile.description}`;
    },
  },
  {
    key: "sync-fit",
    label: "When Sync Fits",
    when: isSyncChain,
    phase: "sync-fit",
    finalHotZones: ["gateway", "shopping-cart", "product"],
    delay: 350,
    explain:
      "Start with synchronous calls when the client truly needs one immediate response, the dependency graph is still shallow, and only a small number of services are on the request path.",
  },
  {
    key: "composite-view",
    label: "Where Sync Gets Risky",
    when: isSyncChain,
    phase: "scenario",
    finalHotZones: [
      "gateway",
      "shopping-cart",
      "product",
      "pricing",
      "order",
      "billing",
      "shipping",
    ],
    delay: 350,
    explain:
      "An Order Details screen now needs Product, Pricing, Order, Billing, and Shipping together. Once one service tries to assemble all of that inline, the shallow synchronous model starts to break down.",
  },
  {
    key: "aggregator-fit",
    label: "When Aggregator Helps",
    when: isAggregator,
    phase: "agg-fit",
    finalHotZones: [
      "gateway",
      "service-aggregator",
      "product",
      "shopping-cart",
      "pricing",
    ],
    delay: 350,
    explain:
      "Use an aggregator when the client still needs one synchronous composite response, but you want composition to happen in a dedicated edge service instead of forcing domain services to call each other.",
  },
  {
    key: "aggregator-request",
    label: "Dedicated Composition Layer",
    when: isAggregator,
    phase: "agg-scenario",
    finalHotZones: [
      "gateway",
      "service-aggregator",
      "service-registry",
      "product",
      "shopping-cart",
      "pricing",
    ],
    delay: 350,
    explain:
      "A Service Aggregator receives one composite request for a specific client query, then coordinates the backend calls needed to produce one coherent response.",
  },
  {
    key: "client-gateway",
    label: "Client → Gateway",
    when: isSyncChain,
    phase: "client-request",
    processingText: "Sending request…",
    flow: [
      {
        from: "$client",
        to: "$gateway",
        duration: 500,
        explain:
          "The client sends one synchronous request to the gateway for the composite view.",
      },
    ],
    finalHotZones: ["gateway"],
    explain:
      "So far this looks simple, but the gateway cannot respond until the entire downstream chain is complete.",
  },
  {
    key: "client-gateway",
    label: "Client → Gateway",
    when: isAggregator,
    phase: "agg-client-request",
    processingText: "Sending request…",
    flow: [
      {
        from: "$client",
        to: "$gateway",
        duration: 500,
        explain:
          "The client still sends one request to the gateway, but this time the gateway forwards to a dedicated aggregator instead of a regular domain service.",
      },
    ],
    finalHotZones: ["gateway"],
    explain:
      "The client sees one request. Internally, a dedicated aggregation layer will now orchestrate the backend calls.",
  },
  {
    key: "gateway-cart",
    label: "Gateway → ShoppingCart",
    when: isSyncChain,
    phase: "gateway-forward",
    processingText: "Forwarding…",
    flow: [
      {
        from: "$gateway",
        to: "$cart",
        duration: 550,
        color: "#ef4444",
        explain:
          "Gateway forwards the request to ShoppingCart, the service now responsible for building the view.",
      },
    ],
    finalHotZones: ["gateway", "shopping-cart"],
    explain:
      "ShoppingCart becomes the first fan-in service. It cannot finish until it has synchronously queried the rest of the graph.",
  },
  {
    key: "gateway-aggregator",
    label: "Gateway → Aggregator",
    when: isAggregator,
    phase: "agg-gateway-forward",
    processingText: "Forwarding…",
    flow: [
      {
        from: "$gateway",
        to: "$aggregator",
        duration: 550,
        color: "#f97316",
        explain:
          "Gateway forwards the composite request to the Service Aggregator, a dedicated backend built for this query.",
      },
    ],
    finalHotZones: ["gateway", "service-aggregator"],
    explain:
      "Unlike the sync chain, Product, ShoppingCart, and Pricing do not call each other. The aggregator owns the orchestration instead.",
  },
  {
    key: "discover-services",
    label: "Find Service Endpoints",
    when: isAggregator,
    phase: "agg-discovery",
    processingText: "Looking up services…",
    flow: [
      {
        from: "$aggregator",
        to: "$registry",
        duration: 500,
        color: "#38bdf8",
        explain:
          "Because services scale up, down, and move around, the aggregator asks a Service Registry for the current network locations it needs.",
      },
    ],
    finalHotZones: ["service-aggregator", "service-registry"],
    explain:
      "In a dynamic environment, IPs and ports are not fixed. Aggregators and gateways often need service discovery to reliably find healthy instances.",
  },
  {
    key: "dispatch-services",
    label: "Dispatch to Services",
    when: isAggregator,
    phase: "agg-dispatch",
    processingText: "Dispatching…",
    flow: [
      {
        from: "$aggregator",
        to: "$agg-services",
        duration: 650,
        color: "#f97316",
        explain:
          "The aggregator fans out to Product, ShoppingCart, and Pricing for the data required by this client query.",
      },
    ],
    finalHotZones: [
      "service-aggregator",
      "product",
      "shopping-cart",
      "pricing",
    ],
    explain:
      "This keeps core business services from chaining through one another. The orchestration is centralized in one dedicated place.",
  },
  {
    key: "collect-services",
    label: "Collect Responses",
    when: isAggregator,
    phase: "agg-collect",
    processingText: "Collecting…",
    flow: [
      {
        from: "$agg-services",
        to: "$aggregator",
        duration: 650,
        color: "#f97316",
        explain:
          "The called services send their results back to the aggregator, which now holds all the raw pieces needed for the response.",
      },
    ],
    finalHotZones: ["service-aggregator"],
    explain:
      "The aggregator still waits synchronously here, but the waiting is concentrated in one edge service instead of leaking as inter-service chains across the domain.",
  },
  {
    key: "aggregate-results",
    label: "Combine Structured Response",
    when: isAggregator,
    phase: "agg-merge",
    finalHotZones: ["service-aggregator"],
    delay: 400,
    explain:
      "The aggregator combines the partial results into one single coherent data structure tailored for the client query.",
  },
  {
    key: "aggregator-return",
    label: "Return Single Response",
    when: isAggregator,
    phase: "agg-return",
    processingText: "Returning…",
    flow: [
      {
        from: "$gateway",
        to: "$client",
        duration: 500,
        color: "#f97316",
        explain:
          "Gateway returns one structured payload to the client. The client does not need to orchestrate or merge backend data itself.",
      },
    ],
    finalHotZones: ["client"],
    explain:
      "Chattiness is reduced at the client edge: one request in, one structured response out.",
  },
  {
    key: "aggregator-tradeoff",
    label: "Aggregator Trade-offs",
    when: isAggregator,
    phase: "agg-tradeoff",
    finalHotZones: ["service-aggregator", "service-registry"],
    delay: 400,
    explain:
      "Service Aggregator reduces deep inter-service chaining, but the aggregator itself becomes a synchronous orchestration hotspot and depends on service discovery plus multiple downstream contracts.",
  },
  {
    key: "event-scenario",
    label: "When We'd Need Async",
    when: isEventDriven,
    phase: "evt-need",
    finalHotZones: [
      "gateway",
      "command-queue",
      "order-service",
      "event-bus",
      "inventory",
      "shipment",
      "notification",
    ],
    delay: 350,
    explain:
      "Use event-driven handoff when one request triggers follow-up work that is long-running, independent, or does not need to finish before the client gets an acknowledgement. Order creation is a good fit because Inventory, Shipping, and Notification can continue later.",
  },
  {
    key: "event-client-gateway",
    label: "Client → Gateway",
    when: isEventDriven,
    phase: "evt-client-request",
    processingText: "Sending request…",
    flow: [
      {
        from: "$client",
        to: "$gateway",
        duration: 500,
        explain:
          "The client still starts with a small synchronous edge request so the platform can validate and accept the order intent.",
      },
    ],
    finalHotZones: ["client", "gateway"],
    explain:
      "Event-driven systems still keep a thin synchronous edge for auth, validation, and admission. The long-running follow-up work is what should move off the critical path.",
  },
  {
    key: "event-direct-order",
    label: "Gateway → Order Service",
    when: isEventDriven,
    phase: "evt-direct-order",
    processingText: "Calling Order…",
    flow: [
      {
        from: "$gateway",
        to: "$order-service",
        duration: 550,
        color: "#ef4444",
        explain:
          "Without a broker, the gateway hands the request directly to Order Service, and Order now owns every downstream delivery itself.",
      },
    ],
    finalHotZones: ["gateway", "order-service"],
    explain:
      "This is the brokerless version. There is no queue and no event bus yet, so the producer side is still directly responsible for notifying every interested service.",
  },
  {
    key: "event-direct-inventory",
    label: "Order → Inventory (No Broker)",
    when: isEventDriven,
    phase: "evt-no-broker-inventory",
    processingText: "Direct notify…",
    flow: [
      {
        from: "$order-service",
        to: "$inventory",
        duration: 550,
        color: "#ef4444",
        explain:
          "Order Service directly calls Inventory. That means the producer must know that Inventory is one of the interested downstream consumers.",
      },
    ],
    finalHotZones: ["order-service", "inventory"],
    explain:
      "With no broker in the middle, the producer owns subscriber knowledge and delivery logic itself.",
  },
  {
    key: "event-direct-shipping",
    label: "Order → Shipment (No Broker)",
    when: isEventDriven,
    phase: "evt-no-broker-shipping",
    processingText: "Direct notify…",
    flow: [
      {
        from: "$order-service",
        to: "$shipment",
        duration: 550,
        color: "#ef4444",
        explain:
          "Order Service now directly calls Shipment too. Every additional subscriber increases producer-side coupling and delivery work.",
      },
    ],
    finalHotZones: ["order-service", "shipment"],
    explain:
      "Adding one more interested service means changing the producer again. The fan-out responsibility is still hardwired into Order Service.",
  },
  {
    key: "event-direct-notification",
    label: "Order → Notification (No Broker)",
    when: isEventDriven,
    phase: "evt-no-broker-notification",
    processingText: "Direct notify…",
    flow: [
      {
        from: "$order-service",
        to: "$notification",
        duration: 550,
        color: "#ef4444",
        explain:
          "Order Service directly calls Notification as well. The producer now has to know every subscriber endpoint, timeout, and retry policy itself.",
      },
    ],
    finalHotZones: ["order-service", "notification"],
    explain:
      "This is the main brokerless problem: one producer is now coupled to every consumer it needs to notify.",
  },
  {
    key: "event-direct-tradeoff",
    label: "Why No Broker Hurts",
    when: isEventDriven,
    phase: "evt-no-broker-tradeoff",
    finalHotZones: ["order-service", "inventory", "shipment", "notification"],
    delay: 400,
    explain:
      "Without a broker, Order Service knows every subscriber, has no shared buffer when one is unavailable, and must own retry, timeout, and failure policy itself. Adding a new consumer means changing the producer.",
  },
  {
    key: "event-queue-intro",
    label: "One-to-One Queue",
    when: isEventDriven,
    phase: "evt-queue-intro",
    finalHotZones: ["gateway", "command-queue", "order-service"],
    delay: 350,
    explain:
      "Use a queue when exactly one service should own a command. CreateOrder is a good example: one Order Service instance should process it, but it does not have to happen inline on the client request thread.",
  },
  {
    key: "event-gateway-queue",
    label: "Gateway → Command Queue",
    when: isEventDriven,
    phase: "evt-queue-command",
    processingText: "Enqueueing command…",
    flow: [
      {
        from: "$gateway",
        to: "$command-queue",
        duration: 550,
        color: "#f59e0b",
        explain:
          "Gateway writes a CreateOrder command to a single-receiver queue instead of synchronously calling Inventory, Shipping, and Notification inline.",
      },
    ],
    finalHotZones: ["gateway", "command-queue"],
    explain:
      "This is the one-to-one model: the queue holds the command until one Order Service consumer is ready to own it.",
  },
  {
    key: "event-client-ack",
    label: "Gateway → Client Ack",
    when: isEventDriven,
    phase: "evt-client-ack",
    processingText: "Returning 202…",
    flow: [
      {
        from: "$gateway",
        to: "$client",
        duration: 500,
        color: "#22c55e",
        explain:
          "Once the command is durably accepted by the queue, the gateway can return an immediate acknowledgement without waiting for every downstream task to finish.",
      },
    ],
    finalHotZones: ["gateway", "client", "command-queue"],
    explain:
      "The client is released early because the command is durably handed off. Downstream work can continue later without keeping the request open.",
  },
  {
    key: "event-queue-order",
    label: "Queue → Order Service",
    when: isEventDriven,
    phase: "evt-command-consume",
    processingText: "Dequeuing command…",
    flow: [
      {
        from: "$command-queue",
        to: "$order-service",
        duration: 550,
        color: "#38bdf8",
        explain:
          "One Order Service consumer takes the queued command. This is the single-receiver queue model: exactly one consumer handles this command message.",
      },
    ],
    finalHotZones: ["command-queue", "order-service"],
    explain:
      "The command can wait in the queue until Order Service is ready. Gateway and client do not need to stay blocked while that happens.",
  },
  {
    key: "event-pubsub-intro",
    label: "One-to-Many Pub/Sub",
    when: isEventDriven,
    phase: "evt-pubsub-intro",
    finalHotZones: [
      "order-service",
      "event-bus",
      "inventory",
      "shipment",
      "notification",
    ],
    delay: 350,
    explain:
      "After Order Service records the order, the next need is different: multiple services should react independently. That is where pub/sub fits better than a one-to-one queue.",
  },
  {
    key: "event-order-publish",
    label: "Order → Event Bus",
    when: isEventDriven,
    phase: "evt-event-publish",
    processingText: "Publishing event…",
    flow: [
      {
        from: "$order-service",
        to: "$event-bus",
        duration: 550,
        color: "#22c55e",
        explain:
          "After the order is recorded, Order publishes an OrderCreated event to the event bus so other services can react independently.",
      },
    ],
    finalHotZones: ["order-service", "event-bus"],
    explain:
      "This is the handoff from one-to-one command processing to one-to-many event distribution.",
  },
  {
    key: "event-broker-store",
    label: "Broker Persists Event",
    when: isEventDriven,
    phase: "evt-buffered",
    finalHotZones: ["event-bus"],
    delay: 400,
    explain:
      "The broker stores the event durably until each subscriber is ready. Producers and consumers no longer need to be available at the exact same moment.",
  },
  {
    key: "event-inventory-consume",
    label: "Event Bus → Inventory",
    when: isEventDriven,
    phase: "evt-inventory",
    processingText: "Inventory reacts…",
    flow: [
      {
        from: "$event-bus",
        to: "$inventory",
        duration: 550,
        color: "#22c55e",
        explain:
          "Inventory subscribes to OrderCreated and reserves stock without any synchronous callback to Order or Gateway.",
      },
    ],
    finalHotZones: ["event-bus", "inventory"],
    explain:
      "Inventory processes the event on its own timeline. If it is slow, the order edge path is still already complete.",
  },
  {
    key: "event-shipping-consume",
    label: "Event Bus → Shipping",
    when: isEventDriven,
    phase: "evt-shipping",
    processingText: "Shipping reacts…",
    flow: [
      {
        from: "$event-bus",
        to: "$shipment",
        duration: 550,
        color: "#22c55e",
        explain:
          "Shipping independently receives the same OrderCreated event and starts fulfillment work without being orchestrated through a deep service chain.",
      },
    ],
    finalHotZones: ["event-bus", "shipment"],
    explain:
      "This is the publish/subscribe model: one event fan-outs to another interested consumer with no extra coupling back to the producer.",
  },
  {
    key: "event-notification-consume",
    label: "Event Bus → Notification",
    when: isEventDriven,
    phase: "evt-notification",
    processingText: "Notification reacts…",
    flow: [
      {
        from: "$event-bus",
        to: "$notification",
        duration: 550,
        color: "#22c55e",
        explain:
          "Notification also subscribes to the same event and sends customer updates. Order Service did not need to change to support this extra subscriber.",
      },
    ],
    finalHotZones: ["event-bus", "notification"],
    explain:
      "Adding another subscriber is usually a consumer-side change, not a producer-side rewrite. That is one of the biggest decoupling wins in event-driven systems.",
  },
  {
    key: "event-broker-benefits",
    label: "Why The Broker Helps",
    when: isEventDriven,
    phase: "evt-broker-benefits",
    finalHotZones: [
      "command-queue",
      "order-service",
      "event-bus",
      "inventory",
      "shipment",
      "notification",
    ],
    delay: 400,
    explain:
      "The broker separates two jobs clearly: queues delegate work to one owner, topics fan events out to many subscribers. Producers now depend on the broker, not on every consumer directly, and the broker can buffer delivery when consumers are slow or temporarily down.",
  },
  {
    key: "event-tradeoff",
    label: "EDA Trade-offs",
    when: isEventDriven,
    phase: "evt-tradeoff",
    finalHotZones: [
      "command-queue",
      "order-service",
      "event-bus",
      "inventory",
      "shipment",
      "notification",
    ],
    delay: 400,
    explain:
      "The request path is shorter and the system is more decoupled, but correctness now depends on durable messaging, idempotent consumers, tracing, and accepting eventual consistency between services.",
  },
  {
    key: "eks-context",
    label: "Dynamic Platform",
    when: isEksDiscovery,
    phase: "eks-context",
    finalHotZones: [
      "route53",
      "alb",
      "gateway",
      "coredns",
      "product-svc",
      "cart-svc",
      "pricing-svc",
      "product-pod",
      "cart-pod",
      "pricing-pod",
      "nat-gateway",
      "external-system",
    ],
    delay: 350,
    explain:
      "In AWS EKS, pods scale, restart, and move. Clients and services should rely on stable DNS names and managed entry points, not on pod IP addresses.",
  },
  {
    key: "route53-lookup",
    label: "Client Resolves Public DNS",
    when: isEksDiscovery,
    phase: "eks-public-dns",
    processingText: "Resolving DNS…",
    flow: [
      {
        from: "$client",
        to: "$route53",
        duration: 500,
        color: "#38bdf8",
        explain:
          "The external client first resolves a public hostname such as api.shop.example.com in Route 53.",
      },
    ],
    finalHotZones: ["client", "route53"],
    explain:
      "Public clients generally know only a DNS name. Route 53 acts as the public registry for the application entry point, not for individual Kubernetes pods.",
  },
  {
    key: "alb-entry",
    label: "Route 53 → ALB",
    when: isEksDiscovery,
    phase: "eks-edge-entry",
    processingText: "Resolving edge target…",
    flow: [
      {
        from: "$route53",
        to: "$alb",
        duration: 500,
        color: "#38bdf8",
        explain:
          "Route 53 resolves the public name to an ALB or NLB that fronts the EKS application entry point.",
      },
    ],
    finalHotZones: ["route53", "alb"],
    explain:
      "On AWS, the AWS Load Balancer Controller usually creates and updates this load balancer from Kubernetes Ingress or Gateway API resources.",
  },
  {
    key: "ingress-gateway",
    label: "ALB → Ingress / Gateway",
    when: isEksDiscovery,
    phase: "eks-ingress-hop",
    processingText: "Forwarding into EKS…",
    flow: [
      {
        from: "$alb",
        to: "$gateway",
        duration: 550,
        color: "#f97316",
        explain:
          "The ALB forwards traffic into the cluster to an ingress controller, API gateway, or gateway-backed Service.",
      },
    ],
    finalHotZones: ["alb", "gateway"],
    explain:
      "TLS termination, host and path routing, coarse auth, and edge rate limiting often happen at this layer before traffic reaches internal services.",
  },
  {
    key: "cluster-dns",
    label: "Resolve Service DNS",
    when: isEksDiscovery,
    phase: "eks-service-dns",
    processingText: "Looking up service name…",
    flow: [
      {
        from: "$gateway",
        to: "$coredns",
        duration: 500,
        color: "#38bdf8",
        explain:
          "Inside the cluster, the gateway asks CoreDNS to resolve a stable name such as product.default.svc.cluster.local.",
      },
    ],
    finalHotZones: ["gateway", "coredns", "product-svc"],
    explain:
      "Kubernetes provides built-in service discovery. Callers usually resolve a Service name, not a pod IP, and CoreDNS returns the stable Service destination.",
  },
  {
    key: "service-routing",
    label: "Call Kubernetes Services",
    when: isEksDiscovery,
    phase: "eks-service-route",
    processingText: "Calling internal services…",
    flow: [
      {
        from: "$gateway",
        to: "$k8s-services",
        duration: 650,
        color: "#f97316",
        explain:
          "After name resolution, the gateway calls Product, ShoppingCart, and Pricing through their stable Kubernetes Service names and ClusterIP destinations.",
      },
    ],
    finalHotZones: ["gateway", "product-svc", "cart-svc", "pricing-svc"],
    explain:
      "The Service object gives each workload a stable virtual IP and DNS name even though the backing pods can be replaced at any time.",
  },
  {
    key: "ready-endpoints",
    label: "Route to Healthy Pods",
    when: isEksDiscovery,
    phase: "eks-endpoints",
    processingText: "Selecting ready pods…",
    flow: [
      {
        from: "$k8s-services",
        to: "$service-pods",
        duration: 650,
        color: "#84cc16",
        explain:
          "Service selectors, readiness probes, EndpointSlices, and kube-proxy steer each request to a healthy pod behind the Service.",
      },
    ],
    finalHotZones: [
      "product-svc",
      "cart-svc",
      "pricing-svc",
      "product-pod",
      "cart-pod",
      "pricing-pod",
    ],
    explain:
      "In EKS, pods usually get VPC-routable IPs from the AWS VPC CNI. The Services layer hides that churn and exposes only stable names to callers.",
  },
  {
    key: "pod-egress",
    label: "Pod Leaves Cluster Path",
    when: isEksDiscovery,
    phase: "eks-egress-prep",
    processingText: "Preparing outbound path…",
    flow: [
      {
        from: "$product-pod",
        to: "$nat-gateway",
        duration: 450,
        color: "#a78bfa",
        explain:
          "If a pod needs to reach a public API, traffic often leaves private subnets through a NAT gateway. For AWS-managed services, VPC endpoints or PrivateLink are often better.",
      },
    ],
    finalHotZones: ["product-pod", "nat-gateway"],
    explain:
      "Internal discovery handles service-to-service traffic inside the cluster. Reaching RDS, SQS, S3, or partner APIs adds a different set of AWS networking and security concerns.",
  },
  {
    key: "external-egress",
    label: "Reach External System",
    when: isEksDiscovery,
    phase: "eks-egress-outbound",
    processingText: "Calling external system…",
    flow: [
      {
        from: "$nat-gateway",
        to: "$external-system",
        duration: 450,
        color: "#a78bfa",
        explain:
          "The outbound path reaches an AWS-managed service or a third-party API. This path depends on route tables, security groups, IAM, DNS, and whether you use NAT, PrivateLink, or a VPC endpoint.",
      },
    ],
    finalHotZones: ["nat-gateway", "external-system"],
    explain:
      "Internal discovery and external connectivity are separate concerns. Kubernetes solves the first; AWS networking and security design solve the second.",
  },
  {
    key: "eks-ops",
    label: "Important Setup Points",
    when: isEksDiscovery,
    phase: "eks-ops",
    finalHotZones: [
      "route53",
      "alb",
      "gateway",
      "coredns",
      "product-svc",
      "product-pod",
      "nat-gateway",
      "external-system",
    ],
    delay: 400,
    explain:
      "The important setup pieces are public DNS, AWS Load Balancer Controller, Ingress or Gateway resources, CoreDNS, Service selectors, readiness probes, VPC CNI, and a deliberate egress design for AWS services or third-party systems.",
  },
  {
    key: "call-product",
    label: "Query Product",
    when: isSyncChain,
    phase: "query-product",
    processingText: "Calling Product…",
    flow: [
      {
        from: "$cart",
        to: "$product",
        duration: 550,
        color: "#84cc16",
        explain:
          "ShoppingCart blocks while synchronously calling Product for item details.",
      },
    ],
    finalHotZones: ["shopping-cart", "product"],
    explain:
      "One dependency is already enough to add latency. ShoppingCart is now waiting, so its worker and connection remain occupied.",
  },
  {
    key: "call-pricing",
    label: "Query Pricing",
    when: isSyncChain,
    phase: "query-pricing",
    processingText: "Calling Pricing…",
    flow: [
      {
        from: "$cart",
        to: "$pricing",
        duration: 550,
        color: "#84cc16",
        explain:
          "After Product returns, ShoppingCart makes another synchronous call to Pricing.",
      },
    ],
    finalHotZones: ["shopping-cart", "pricing"],
    explain:
      "The view still cannot return. More sequential hops mean more accumulated latency and more time spent waiting on the network.",
  },
  {
    key: "call-order",
    label: "Query Order",
    when: isSyncChain,
    phase: "query-order",
    processingText: "Calling Order…",
    flow: [
      {
        from: "$cart",
        to: "$order",
        duration: 550,
        color: "#a78bfa",
        explain:
          "ShoppingCart now synchronously calls Order for order-state data.",
      },
    ],
    finalHotZones: ["shopping-cart", "order"],
    explain:
      "The chain is no longer shallow. ShoppingCart now depends directly on three services and passes the latency problem downstream.",
  },
  {
    key: "call-billing",
    label: "Order → Billing",
    when: isSyncChain,
    phase: "query-billing",
    processingText: "Calling Billing…",
    flow: [
      {
        from: "$order",
        to: "$billing",
        duration: 550,
        color: "#a78bfa",
        explain:
          "Order is also blocked now while it calls Billing to enrich the response.",
      },
    ],
    finalHotZones: ["shopping-cart", "order", "billing"],
    explain:
      "Blocking propagates upward. Gateway waits on ShoppingCart. ShoppingCart waits on Order. Order waits on Billing. Latency stacks across the whole chain.",
  },
  {
    key: "call-shipping",
    label: "Order → Shipping",
    when: isSyncChain,
    phase: "query-shipping",
    processingText: "Calling Shipping…",
    flow: [
      {
        from: "$order",
        to: "$shipping",
        duration: 550,
        color: "#a78bfa",
        explain:
          "Order must make yet another synchronous call to Shipping before the upstream path can continue.",
      },
    ],
    finalHotZones: ["shopping-cart", "order", "shipping"],
    explain:
      "This is the chained query problem: a single user request turns into a long blocking cascade of synchronous calls that all have to succeed in sequence.",
  },
  {
    key: "bottleneck",
    label: "Bottleneck Forms",
    when: isSyncChain,
    phase: "bottleneck",
    finalHotZones: ["gateway", "shopping-cart", "order"],
    delay: 400,
    explain:
      "ShoppingCart becomes the bottleneck because every composite request funnels through it. Order becomes a secondary bottleneck because it fans out again to Billing and Shipping.",
  },
  {
    key: "tight-coupling",
    label: "Tight Coupling Appears",
    when: isSyncChain,
    phase: "tight-coupling",
    finalHotZones: [
      "shopping-cart",
      "product",
      "pricing",
      "order",
      "billing",
      "shipping",
    ],
    delay: 400,
    explain:
      "ShoppingCart now knows how to call Product, Pricing, and Order. Order knows how to call Billing and Shipping. Any contract, timeout, or schema change ripples through the call graph.",
  },
  {
    key: "wasted-resources",
    label: "Wasted Resources",
    when: isSyncChain,
    phase: "waste",
    finalHotZones: ["gateway", "shopping-cart", "order"],
    delay: 400,
    explain:
      "While downstream calls are in flight, upstream workers, connection pools, and memory stay occupied but do no useful work. Throughput drops even before CPUs are fully busy.",
  },
  {
    key: "summary",
    label: "Summary",
    finalHotZones: (state) =>
      state.architecture === "sync-chain"
        ? [
            "gateway",
            "shopping-cart",
            "product",
            "pricing",
            "order",
            "billing",
            "shipping",
          ]
        : state.architecture === "service-aggregator"
          ? [
              "gateway",
              "service-aggregator",
              "service-registry",
              "product",
              "shopping-cart",
              "pricing",
            ]
          : state.architecture === "eks-discovery"
            ? [
                "route53",
                "alb",
                "gateway",
                "coredns",
                "product-svc",
                "cart-svc",
                "pricing-svc",
                "product-pod",
                "cart-pod",
                "pricing-pod",
                "nat-gateway",
                "external-system",
              ]
            : [
                "gateway",
                "command-queue",
                "order-service",
                "event-bus",
                "inventory",
                "shipment",
                "notification",
              ],
    phase: "summary",
    explain: (state) =>
      state.architecture === "sync-chain"
        ? "Synchronous chain queries increase latency, concentrate traffic on a few hot services, tightly couple internal APIs, and waste capacity while services wait on one another."
        : state.architecture === "service-aggregator"
          ? "Service Aggregator shortens the synchronous call graph and centralizes composition, reducing inter-service chaining. But it still blocks while waiting on downstream services and introduces aggregator and registry dependencies."
          : state.architecture === "eks-discovery"
            ? "In AWS EKS, service discovery is mostly built into Kubernetes: Route 53 and ALB or NLB handle the public edge, CoreDNS resolves stable Service names, and Services plus EndpointSlices route traffic to healthy pods. The hard part shifts from finding pod IPs to correctly configuring ingress, health checks, VPC networking, and external egress."
            : "Event-driven design is easiest to understand as three pieces: without a broker the producer becomes tightly coupled to every subscriber, queues solve one-to-one delegated work, and pub/sub topics solve one-to-many reactions. The trade is operational complexity and eventual consistency in exchange for buffered work and looser coupling.",
  },
];

export function buildSteps(state: SyncVsEventDrivenState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
