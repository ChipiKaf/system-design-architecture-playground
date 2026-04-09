import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "sync-request-response"
  | "chain-query"
  | "async-communication"
  | "brokerless-fanout"
  | "message-broker"
  | "point-to-point-queue"
  | "pub-sub-topic"
  | "eventual-consistency"
  | "service-aggregator"
  | "service-registry"
  | "eks-discovery"
  | "k8s-service-dns"
  | "aws-ingress"
  | "pod-networking"
  | "external-egress"
  | "bottleneck"
  | "tight-coupling"
  | "wasted-resources";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "sync-request-response": {
    title: "Synchronous Request/Response",
    subtitle: "Each service blocks while it waits for the next one to reply",
    accentColor: "#ef4444",
    sections: [
      {
        title: "How it works",
        accent: "#ef4444",
        content: (
          <>
            <p>
              In synchronous service-to-service communication, one service makes
              a request to another and waits for the response before it can
              continue. That waiting time is part of the critical path.
            </p>
            <p style={{ marginTop: 8 }}>
              This model is easy to understand when there is only one hop, but
              once the call graph grows, upstream services spend more and more
              time blocked on downstream dependencies.
            </p>
          </>
        ),
      },
    ],
  },
  "chain-query": {
    title: "Chained Query Problem",
    subtitle: "One user request turns into a long blocking dependency chain",
    accentColor: "#f97316",
    sections: [
      {
        title: "Why it happens",
        accent: "#f97316",
        content: (
          <>
            <p>
              Composite views like Order Details often need data from multiple
              services. A common but risky approach is to let one service call
              the others synchronously, one after another, to build the full
              response.
            </p>
            <p style={{ marginTop: 8 }}>
              The problem is that latency becomes additive. Every hop introduces
              another network round-trip, another timeout risk, and another
              point where the whole request can stall.
            </p>
          </>
        ),
      },
    ],
  },
  "async-communication": {
    title: "Asynchronous Communication",
    subtitle:
      "A service hands work off and does not wait for every downstream step to finish immediately",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Core idea",
        accent: "#22c55e",
        content: (
          <>
            <p>
              In asynchronous communication, the producer sends a command or an
              event and then continues. It does not sit blocked while every
              downstream service completes its work.
            </p>
            <p style={{ marginTop: 8 }}>
              This is especially useful when the follow-up work is long-running,
              fan-out in nature, or does not need to be part of the client's
              immediate response path.
            </p>
          </>
        ),
      },
      {
        title: "What changes compared with sync calls",
        accent: "#38bdf8",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>The client path can end earlier after durable acceptance</li>
            <li>Slow consumers no longer stretch one blocking request chain</li>
            <li>Work can be buffered and retried independently</li>
            <li>Services react later instead of being called inline</li>
          </ul>
        ),
      },
      {
        title: "When to use it",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>One request triggers slow follow-up tasks that can finish later</li>
            <li>Exactly one service should own a command, but not inline on the request thread</li>
            <li>One business event should trigger many independent reactions</li>
            <li>Consumers may be slow or temporarily unavailable and need buffering</li>
          </ul>
        ),
      },
    ],
  },
  "brokerless-fanout": {
    title: "Direct Fan-Out Without a Broker",
    subtitle:
      "The producer notifies every downstream service itself instead of handing delivery to a broker",
    accentColor: "#ef4444",
    sections: [
      {
        title: "What it looks like",
        accent: "#ef4444",
        content: (
          <>
            <p>
              After completing its own work, the producer directly calls every
              interested downstream service itself. For example, Order Service
              might call Inventory, Shipment, and Notification one by one.
            </p>
            <p style={{ marginTop: 8 }}>
              That can look simpler at first because there is no intermediary,
              but the producer now owns subscriber knowledge and delivery logic.
            </p>
          </>
        ),
      },
      {
        title: "Why teams outgrow it",
        accent: "#f97316",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>The producer must know every subscriber endpoint directly</li>
            <li>Adding a new consumer means changing the producer again</li>
            <li>Retries, timeouts, and backpressure stay embedded in producer code</li>
            <li>There is no shared durable buffer if a consumer is unavailable</li>
          </ul>
        ),
      },
      {
        title: "What the broker fixes",
        accent: "#38bdf8",
        content: (
          <p>
            A broker lets the producer hand delivery off once. From there, a
            queue can route work to one owner or a topic can fan the event out
            to many subscribers, without coupling the producer to every
            consumer directly.
          </p>
        ),
      },
    ],
  },
  "message-broker": {
    title: "Message Broker and Event Bus",
    subtitle:
      "The intermediary that receives, stores, and forwards commands or events",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "Why it exists",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              A message broker sits between producers and consumers. It accepts
              messages, stores them durably, and delivers them when the right
              consumer is ready.
            </p>
            <p style={{ marginTop: 8 }}>
              That means producers and consumers do not need direct knowledge of
              each other and do not need to be available at the exact same
              instant.
            </p>
          </>
        ),
      },
      {
        title: "What it commonly provides",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Durable storage while consumers are busy or offline</li>
            <li>Retries and dead-letter handling for failed processing</li>
            <li>Different messaging patterns like queues and topics</li>
            <li>Loose coupling between producers and consumers</li>
          </ul>
        ),
      },
    ],
  },
  "point-to-point-queue": {
    title: "Point-to-Point Queue",
    subtitle:
      "One message is intended for one processing owner",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Queue model",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              A queue is a one-to-one asynchronous pattern. A producer sends a
              command message, and one consumer or worker is responsible for
              processing that message.
            </p>
            <p style={{ marginTop: 8 }}>
              This is a good fit for delegated tasks such as
              <strong> CreateOrder </strong>
              or
              <strong> GenerateInvoice </strong>
              where one owner should handle the work.
            </p>
          </>
        ),
      },
      {
        title: "Why it helps",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Removes long-running work from the request thread</li>
            <li>Lets workers process later when capacity is available</li>
            <li>Buffers bursts instead of forcing immediate downstream calls</li>
            <li>Keeps the responsibility clear: one command, one owner</li>
          </ul>
        ),
      },
    ],
  },
  "pub-sub-topic": {
    title: "Publish / Subscribe Topic",
    subtitle:
      "One event can be consumed by many interested services independently",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Topic model",
        accent: "#22c55e",
        content: (
          <>
            <p>
              In publish/subscribe, one producer publishes an event and many
              consumers can subscribe to it. The producer does not need to know
              who all the subscribers are.
            </p>
            <p style={{ marginTop: 8 }}>
              This is the classic one-to-many event-driven pattern: Inventory,
              Shipping, Notification, Analytics, and other services can all
              react to the same business event independently.
            </p>
          </>
        ),
      },
      {
        title: "Why teams use it",
        accent: "#38bdf8",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Add a new subscriber without changing the producer</li>
            <li>Let multiple services process the same state change in parallel</li>
            <li>Reduce hardwired producer-to-consumer dependencies</li>
            <li>Keep business reactions independent and separately scalable</li>
          </ul>
        ),
      },
    ],
  },
  "eventual-consistency": {
    title: "Eventual Consistency",
    subtitle:
      "The system converges over time instead of every service being updated in one immediate request",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Why it appears",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              Once work moves behind queues and events, not every dependent
              service finishes at the exact same millisecond. Some consumers may
              process later than others, so the system becomes consistent over
              time rather than instantly.
            </p>
            <p style={{ marginTop: 8 }}>
              That is often an acceptable trade when the benefit is lower client
              latency, better resilience, and looser coupling.
            </p>
          </>
        ),
      },
      {
        title: "What engineers must add",
        accent: "#ef4444",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Idempotent consumers so retries do not create duplicate side-effects</li>
            <li>Retries and dead-letter queues for failures</li>
            <li>Tracing and correlation IDs to follow one business flow</li>
            <li>UI and business rules that tolerate in-flight updates</li>
          </ul>
        ),
      },
    ],
  },
  "service-aggregator": {
    title: "Service Aggregator Pattern",
    subtitle:
      "A dedicated service combines multiple backend calls into one client-focused response",
    accentColor: "#f97316",
    sections: [
      {
        title: "What it does",
        accent: "#f97316",
        content: (
          <>
            <p>
              A Service Aggregator receives a single composite request, dispatches
              calls to the internal services it needs, and combines the results
              into one coherent structure before responding.
            </p>
            <p style={{ marginTop: 8 }}>
              This reduces client-side orchestration and also prevents core domain
              services from forming long synchronous call chains through each
              other.
            </p>
          </>
        ),
      },
      {
        title: "Why it helps",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Receives one composite request for a specific client query</li>
            <li>Dispatches requests to multiple internal microservices</li>
            <li>Combines results into one structured response</li>
            <li>Reduces chatty frontend or gateway orchestration</li>
            <li>Reduces inter-service chaining inside the domain layer</li>
          </ul>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#ef4444",
        content: (
          <p>
            The aggregator is still synchronous. It can become a hotspot, and it
            now owns multiple downstream contracts plus timeout, retry, and
            fallback policy for the services it composes.
          </p>
        ),
      },
    ],
  },
  "service-registry": {
    title: "Service Registry Pattern",
    subtitle:
      "How gateways and aggregators find the current location of services in dynamic environments",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "Why it exists",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              Services are independently deployed, scaled up and down dynamically,
              and their IP addresses or ports are not fixed. That means a gateway
              or aggregator cannot safely hardcode where Product or Pricing live.
            </p>
            <p style={{ marginTop: 8 }}>
              A service registry stores the current healthy endpoints so callers
              can resolve the right destination at runtime.
            </p>
          </>
        ),
      },
      {
        title: "What the registry solves",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Find current network locations for dynamic services</li>
            <li>Avoid hardcoded IPs and ports</li>
            <li>Support elastic scale-up and scale-down</li>
            <li>Let gateways and aggregators discover healthy instances</li>
          </ul>
        ),
      },
      {
        title: "Two common discovery styles",
        accent: "#f97316",
        content: (
          <>
            <p>
              Client-side discovery means the caller asks the registry for healthy
              instances and then chooses one. Server-side discovery means the
              caller sends traffic to a stable frontend, proxy, or virtual IP,
              and the platform chooses a healthy backend instance.
            </p>
            <p style={{ marginTop: 8 }}>
              Kubernetes usually behaves more like built-in server-side discovery:
              callers resolve a stable Service name, then the Service and its
              EndpointSlices route traffic to healthy pods.
            </p>
          </>
        ),
      },
      {
        title: "What this looks like in Kubernetes",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              In Kubernetes, you usually do not run a custom registry like Eureka
              just to find pods. The built-in registry is the combination of
              Service objects, DNS via CoreDNS, and healthy endpoint tracking via
              EndpointSlices and readiness probes.
            </p>
            <p style={{ marginTop: 8 }}>
              That means your gateway or aggregator normally calls
              <strong> service DNS names </strong>
              rather than storing or querying pod IPs directly.
            </p>
          </>
        ),
      },
    ],
  },
  "eks-discovery": {
    title: "AWS EKS Service Discovery",
    subtitle:
      "How public traffic enters the cluster and how internal callers find stable service names",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "The full request path",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              A common AWS setup is: external client → Route 53 → ALB or NLB →
              Ingress or API gateway in EKS → internal Kubernetes Service →
              healthy pod. That gives you a stable public entry point and stable
              internal service names even though pods are constantly changing.
            </p>
            <p style={{ marginTop: 8 }}>
              The key idea is that callers should know names like
              <strong> api.shop.example.com </strong>
              or
              <strong> product.default.svc.cluster.local </strong>
              rather than any node IP or pod IP.
            </p>
          </>
        ),
      },
      {
        title: "Important setup pieces",
        accent: "#f97316",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>EKS cluster with worker nodes or Fargate profiles in a VPC</li>
            <li>AWS VPC CNI so pods receive routable VPC IPs</li>
            <li>CoreDNS and kube-proxy running reliably in the cluster</li>
            <li>AWS Load Balancer Controller with IAM and tagged subnets</li>
            <li>Ingress or Gateway API resources for public entry</li>
            <li>Service objects, selectors, and readiness probes for internal discovery</li>
            <li>Route 53 and ACM for public DNS and TLS certificates</li>
          </ul>
        ),
      },
      {
        title: "What discovery solves and what it does not",
        accent: "#22c55e",
        content: (
          <>
            <p>
              Discovery solves the <strong>where is the service?</strong>
              problem. It does not solve API compatibility, authorization,
              retries, circuit breaking, schema versioning, or idempotency.
            </p>
            <p style={{ marginTop: 8 }}>
              In practice, teams need discovery plus edge routing, health checks,
              auth, observability, and usually some resiliency policy at the
              gateway or client library layer.
            </p>
          </>
        ),
      },
    ],
  },
  "k8s-service-dns": {
    title: "Kubernetes Service DNS",
    subtitle:
      "Stable DNS names and ClusterIP Services hide constantly changing pod endpoints",
    accentColor: "#0ea5e9",
    sections: [
      {
        title: "Service names are the contract",
        accent: "#0ea5e9",
        content: (
          <>
            <p>
              In Kubernetes, callers usually reach a workload through a Service,
              not by talking directly to pods. A Service gets a stable DNS name
              and usually a stable ClusterIP virtual address.
            </p>
            <p style={{ marginTop: 8 }}>
              Example names include:
              <strong> product </strong>
              within the same namespace,
              <strong> product.default </strong>
              across namespace-aware callers, or the full name
              <strong> product.default.svc.cluster.local </strong>.
            </p>
          </>
        ),
      },
      {
        title: "CoreDNS and EndpointSlices",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              CoreDNS resolves the Service name to the Service destination.
              EndpointSlices then tell the platform which pod IPs currently back
              that Service.
            </p>
            <p style={{ marginTop: 8 }}>
              Readiness probes matter because only ready pods should appear as
              eligible endpoints. Without good readiness configuration, discovery
              may still send traffic to a pod that has started but is not ready
              to serve.
            </p>
          </>
        ),
      },
    ],
  },
  "aws-ingress": {
    title: "Route 53, ALB, and Ingress",
    subtitle:
      "How external clients reach Kubernetes workloads on AWS",
    accentColor: "#f97316",
    sections: [
      {
        title: "Public edge on AWS",
        accent: "#f97316",
        content: (
          <>
            <p>
              External clients usually hit a public DNS name in Route 53. That
              record targets an ALB or NLB that fronts the Kubernetes entry
              layer.
            </p>
            <p style={{ marginTop: 8 }}>
              ALB is typically used for HTTP and HTTPS with host and path-based
              routing. NLB is typically used for lower-level TCP or UDP traffic
              or when you need very direct load balancing behavior.
            </p>
          </>
        ),
      },
      {
        title: "What you usually configure",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>AWS Load Balancer Controller using IAM roles for service accounts</li>
            <li>Tagged public and private subnets so the controller knows where to place load balancers</li>
            <li>Ingress or Gateway API resources that describe routes and target Services</li>
            <li>ACM certificates if TLS terminates on the ALB</li>
            <li>Security group rules that allow ALB to reach the cluster targets</li>
          </ul>
        ),
      },
    ],
  },
  "pod-networking": {
    title: "Pod Networking in EKS",
    subtitle:
      "How Kubernetes Services, pod IPs, and VPC networking work together",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Pod IPs in EKS",
        accent: "#22c55e",
        content: (
          <>
            <p>
              With the standard AWS VPC CNI, pods receive IP addresses from the
              VPC subnets. That means pods are first-class network endpoints in
              the VPC, even though callers still should not depend on those IPs
              directly.
            </p>
            <p style={{ marginTop: 8 }}>
              Services and DNS provide stability on top of this, while kube-proxy
              or the cluster dataplane applies the rules that translate Service
              traffic to the current healthy pod endpoints.
            </p>
          </>
        ),
      },
      {
        title: "Operational implications",
        accent: "#38bdf8",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Plan subnet IP capacity carefully because pods consume IPs</li>
            <li>Understand how security groups apply to nodes and optionally to pods</li>
            <li>Use readiness probes so only healthy pods receive traffic</li>
            <li>Watch CoreDNS and kube-proxy because they are part of the serving path</li>
          </ul>
        ),
      },
    ],
  },
  "external-egress": {
    title: "External Egress from EKS",
    subtitle:
      "Internal discovery is only half the story when pods need RDS, AWS services, or public APIs",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Common outbound patterns",
        accent: "#a78bfa",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Private RDS or internal services over VPC routing and security groups</li>
            <li>S3, SQS, DynamoDB, and similar services over VPC endpoints when possible</li>
            <li>Third-party public APIs through a NAT gateway from private subnets</li>
            <li>PrivateLink for private service exposure across VPC boundaries when needed</li>
          </ul>
        ),
      },
      {
        title: "Things teams often forget",
        accent: "#ef4444",
        content: (
          <>
            <p>
              Outbound communication is not just a route-table problem. You also
              need DNS resolution, IAM, TLS trust, security groups, network
              policy, and a decision about whether the dependency should be
              private, public, or exposed through a managed endpoint.
            </p>
            <p style={{ marginTop: 8 }}>
              Discovery tells you where an internal service lives. It does not
              automatically make external dependencies secure, private, or
              highly available.
            </p>
          </>
        ),
      },
    ],
  },
  bottleneck: {
    title: "Bottlenecks in Sync Chains",
    subtitle: "Hot services absorb all fan-in pressure from the composite path",
    accentColor: "#e11d48",
    sections: [
      {
        title: "What becomes the bottleneck",
        accent: "#e11d48",
        content: (
          <>
            <p>
              In a synchronous chain, one or two services usually become the hot
              path through which every composite request must pass. In this
              walkthrough, ShoppingCart becomes the first bottleneck and Order
              becomes a second one deeper in the graph.
            </p>
            <p style={{ marginTop: 8 }}>
              Even if Product or Billing are healthy, the bottleneck service can
              still cap throughput for the whole user journey.
            </p>
          </>
        ),
      },
    ],
  },
  "tight-coupling": {
    title: "Tight Coupling",
    subtitle:
      "Upstream services must understand downstream contracts and failures",
    accentColor: "#a855f7",
    sections: [
      {
        title: "Why coupling gets worse",
        accent: "#a855f7",
        content: (
          <>
            <p>
              ShoppingCart must know how to call Product, Pricing, and Order.
              Order must know how to call Billing and Shipping. That means URLs,
              timeouts, retries, DTOs, and failure modes leak across service
              boundaries.
            </p>
            <p style={{ marginTop: 8 }}>
              A downstream schema or API change can now ripple through multiple
              upstream services, forcing coordinated deployments.
            </p>
          </>
        ),
      },
    ],
  },
  "wasted-resources": {
    title: "Wasted Resources",
    subtitle:
      "Blocked workers and open connections consume capacity without useful work",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Where the waste comes from",
        accent: "#22c55e",
        content: (
          <>
            <p>
              While ShoppingCart waits on Order, and Order waits on Billing or
              Shipping, their workers, memory, and connection pools remain tied
              up. Those services are occupied, but not actively making progress.
            </p>
            <p style={{ marginTop: 8 }}>
              That means throughput can collapse long before CPU is saturated,
              because the system is wasting capacity on blocked waiting rather
              than useful work.
            </p>
          </>
        ),
      },
    ],
  },
};
