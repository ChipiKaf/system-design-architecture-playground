import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "api-gateway"
  | "gateway-routing"
  | "gateway-aggregation"
  | "gateway-offloading"
  | "bff-pattern";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  /* ── API Gateway ────────────────────────────────────── */
  "api-gateway": {
    title: "API Gateway Pattern",
    subtitle:
      "A single entry-point that sits between clients and the microservices ecosystem",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What it is",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              An API Gateway is a <strong>reverse proxy</strong> that acts as the
              single point of entry for all client requests to backend
              microservices. It sits between the client applications (web,
              mobile) and the microservices ecosystem.
            </p>
            <p style={{ marginTop: 8 }}>
              Similar to the <strong>Facade pattern</strong> in object-oriented
              design — but for distributed systems. The gateway abstracts the
              internal architecture from external consumers.
            </p>
          </>
        ),
      },
      {
        title: "Key Responsibilities",
        accent: "#3b82f6",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Route requests to appropriate backend services</li>
            <li>Aggregate responses from multiple services</li>
            <li>Handle cross-cutting concerns (auth, SSL, rate limiting)</li>
            <li>Protocol translation (e.g. REST to gRPC internally)</li>
            <li>API versioning and blue/green deployment support</li>
            <li>Request/response transformation</li>
          </ul>
        ),
      },
      {
        title: "Common Implementations",
        accent: "#94a3b8",
        content: (
          <p>
            <strong>Kong</strong>, <strong>AWS API Gateway</strong>,{" "}
            <strong>NGINX</strong>, <strong>Envoy</strong>,{" "}
            <strong>Spring Cloud Gateway</strong>, <strong>Ocelot (.NET)</strong>
            . Most support declarative route configuration and plugin
            architectures for extensibility.
          </p>
        ),
      },
    ],
    aside: (
      <div style={{ fontSize: 11, color: "#94a3b8" }}>
        <p style={{ fontWeight: 600, color: "#60a5fa" }}>Design Consideration</p>
        <p style={{ marginTop: 4 }}>
          The gateway is a single point of failure. Always deploy it as a
          highly-available cluster with health checks and auto-scaling.
        </p>
      </div>
    ),
  },

  /* ── Gateway Routing ────────────────────────────────── */
  "gateway-routing": {
    title: "Gateway Routing Pattern",
    subtitle: "Route requests to the right service by path, header, or method",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "How it works",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              The client calls a <strong>single gateway endpoint</strong>. The
              gateway intelligently routes the request to the appropriate
              downstream service based on the URL path, HTTP headers, method, or
              query parameters.
            </p>
            <p style={{ marginTop: 8 }}>
              For example, <code>/api/products/123</code> is routed to the
              Catalog service at{" "}
              <code>http://catalog-service/products/123</code>. The client never
              needs to know the internal service address.
            </p>
          </>
        ),
      },
      {
        title: "Benefits",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>
              <strong>Decoupling:</strong> clients don't need to know service
              addresses or paths
            </li>
            <li>
              <strong>Simple endpoints:</strong> one base URL for all APIs
            </li>
            <li>
              <strong>Versioning:</strong> route <code>/v1/</code> and{" "}
              <code>/v2/</code> to different service versions
            </li>
            <li>
              <strong>Blue/green deploys:</strong> shift traffic between service
              versions at the gateway level
            </li>
          </ul>
        ),
      },
      {
        title: "Layer 7 Routing",
        accent: "#94a3b8",
        content: (
          <p>
            Gateway routing operates at <strong>Layer 7</strong> (application
            layer) of the OSI model. Unlike a Layer 4 load balancer that only
            sees TCP/IP, the gateway can inspect HTTP paths, headers, cookies,
            and body content to make routing decisions.
          </p>
        ),
      },
    ],
  },

  /* ── Gateway Aggregation ────────────────────────────── */
  "gateway-aggregation": {
    title: "Gateway Aggregation Pattern",
    subtitle:
      "Consolidate multiple backend calls into a single client response",
    accentColor: "#22c55e",
    sections: [
      {
        title: "How it works",
        accent: "#22c55e",
        content: (
          <>
            <p>
              The client makes <strong>one request</strong> (e.g.{" "}
              <code>/eshop/dashboard</code>). The gateway dispatches{" "}
              <strong>multiple individual requests</strong> to the relevant
              backend microservices in parallel.
            </p>
            <p style={{ marginTop: 8 }}>
              It then <strong>aggregates</strong> all responses into a single,
              consolidated response and sends it back to the client. The
              client sees one payload with data from Customer, ShoppingCart,
              Discount, and Order services.
            </p>
          </>
        ),
      },
      {
        title: "When to use",
        accent: "#3b82f6",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Dashboard pages that need data from many services</li>
            <li>Mobile clients where minimising round-trips matters</li>
            <li>Composite APIs that join data from multiple domains</li>
            <li>
              When the client is on a high-latency network (fewer round-trips =
              faster UX)
            </li>
          </ul>
        ),
      },
      {
        title: "Partial Failure Handling",
        accent: "#f59e0b",
        content: (
          <p>
            What if one of the four services is slow or down? The gateway must
            decide: wait and timeout, return partial data, or use cached/default
            values. A common strategy is to set a per-service timeout and return
            partial responses with a{" "}
            <code>206 Partial Content</code> status or a{" "}
            <code>degraded</code> flag.
          </p>
        ),
      },
    ],
  },

  /* ── Gateway Offloading ─────────────────────────────── */
  "gateway-offloading": {
    title: "Gateway Offloading Pattern",
    subtitle:
      "Move cross-cutting concerns from services to the gateway",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What it offloads",
        accent: "#f59e0b",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>
              <strong>SSL Termination:</strong> decrypt HTTPS at the gateway;
              internal traffic can be plain HTTP
            </li>
            <li>
              <strong>Authentication & Authorization:</strong> verify tokens and
              user identities before requests reach services
            </li>
            <li>
              <strong>Rate Limiting & Throttling:</strong> protect backend
              services from traffic spikes
            </li>
            <li>
              <strong>Response Caching:</strong> cache common responses to reduce
              backend load
            </li>
            <li>
              <strong>Request Logging, Tracing & Correlation:</strong>{" "}
              centralised observability
            </li>
            <li>
              <strong>IP Allowlisting/Denylisting:</strong> block bad actors at
              the edge
            </li>
          </ul>
        ),
      },
      {
        title: "Why offload?",
        accent: "#22c55e",
        content: (
          <>
            <p>
              Without offloading, every microservice must independently implement
              auth, SSL, logging, and rate limiting. That means duplicated code,
              inconsistent enforcement, and harder security audits.
            </p>
            <p style={{ marginTop: 8 }}>
              Centralising these concerns at the gateway means services stay
              focused on business logic and security policy changes apply
              uniformly with a single configuration update.
            </p>
          </>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#ef4444",
        content: (
          <p>
            The gateway becomes a <strong>critical dependency</strong>. Every
            offloaded concern adds processing time to every request. If the
            gateway goes down, all services become unreachable. Use circuit
            breakers, redundancy, and health checks to mitigate.
          </p>
        ),
      },
    ],
    aside: (
      <div style={{ fontSize: 11, color: "#94a3b8" }}>
        <p style={{ fontWeight: 600, color: "#f59e0b" }}>Common Stack</p>
        <p style={{ marginTop: 4 }}>
          Envoy + OAuth2 Proxy + Redis (rate limiting) + Jaeger (tracing) is a
          popular open-source offloading stack for Kubernetes deployments.
        </p>
      </div>
    ),
  },

  /* ── Backends for Frontends ───────────────────────── */
  "bff-pattern": {
    title: "Backends for Frontends (BFF)",
    subtitle:
      "A specialized backend or API gateway per frontend experience",
    accentColor: "#ec4899",
    sections: [
      {
        title: "Why BFF exists",
        accent: "#ec4899",
        content: (
          <>
            <p>
              Different frontend applications often have very different UI and
              data consumption requirements. A web app may need a rich,
              aggregated dashboard payload, while a mobile app may need a
              smaller, latency-sensitive response with fewer fields.
            </p>
            <p style={{ marginTop: 8 }}>
              If every client hits one generic API, the burden of reshaping,
              filtering, and orchestrating data often leaks into the client.
              BFF moves that frontend-specific composition back to the server.
            </p>
          </>
        ),
      },
      {
        title: "How it works",
        accent: "#3b82f6",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Web frontend calls a dedicated Web BFF</li>
            <li>Mobile frontend calls a dedicated Mobile BFF</li>
            <li>Desktop frontend can have its own Desktop BFF too</li>
            <li>Each BFF composes data from core microservices differently</li>
            <li>Each BFF can expose a contract optimized for its UI/UX</li>
          </ul>
        ),
      },
      {
        title: "Benefits",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>
              <strong>Tailored data & experience:</strong> each client gets data
              formatted exactly as it needs
            </li>
            <li>
              <strong>Reduced client-side logic:</strong> aggregation,
              transformation, and some presentation logic leave the client
            </li>
            <li>
              <strong>Independent evolution:</strong> Web BFF and Mobile BFF can
              change without impacting each other
            </li>
            <li>
              <strong>Avoids a "God" API gateway:</strong> the edge layer stays
              specialized instead of trying to satisfy everyone
            </li>
          </ul>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#f59e0b",
        content: (
          <p>
            BFF adds more edge services to build and operate. Some orchestration
            or validation logic may be duplicated across BFFs. Use it when
            frontend requirements are truly divergent; otherwise, a single
            gateway may remain simpler.
          </p>
        ),
      },
    ],
    aside: (
      <div style={{ fontSize: 11, color: "#94a3b8" }}>
        <p style={{ fontWeight: 600, color: "#ec4899" }}>Rule of Thumb</p>
        <p style={{ marginTop: 4 }}>
          Use BFF when web, mobile, and desktop teams need to move quickly and
          ship meaningfully different experiences from the same core services.
        </p>
      </div>
    ),
  },
};
