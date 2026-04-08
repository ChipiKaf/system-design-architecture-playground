import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "decomposition"
  | "business-capability"
  | "subdomain-ddd"
  | "size-based"
  | "coupling"
  | "db-per-service"
  | "domain-analysis"
  | "strangler-fig"
  | "fulfillment"
  | "eval-checklist";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  decomposition: {
    title: "Decomposing a Monolith",
    subtitle: "Strategies for splitting one codebase into independent services",
    accentColor: "#818cf8",
    sections: [
      {
        title: "The problem",
        accent: "#ef4444",
        content: (
          <>
            <p>
              A monolith works well early on: one codebase, one database, one
              deploy. But as teams and features grow, it becomes a bottleneck —
              a change in one area requires redeploying the entire system, and
              any team touching the codebase creates merge conflicts with every
              other team.
            </p>
          </>
        ),
      },
      {
        title: "The four questions to ask",
        accent: "#818cf8",
        content: (
          <ul>
            <li>
              Are these services <strong>truly independent</strong>?
            </li>
            <li>
              Do they encapsulate a{" "}
              <strong>coherent set of responsibilities</strong>?
            </li>
            <li>
              Do their boundaries align with our{" "}
              <strong>business domain and team structures</strong>?
            </li>
            <li>
              Are they an <strong>appropriate size</strong>?
            </li>
          </ul>
        ),
      },
      {
        title: "The goal: Cohesion & Loose Coupling",
        accent: "#34d399",
        content: (
          <>
            <p>
              <strong>Highly cohesive:</strong> each service implements a small
              set of strongly related functions — it does one thing well.
            </p>
            <p style={{ marginTop: 6 }}>
              <strong>Loosely coupled:</strong> services interact with each
              other only through well-defined, stable APIs, hiding internal
              implementation details.
            </p>
          </>
        ),
      },
    ],
  },

  "business-capability": {
    title: "Decompose by Business Capability",
    subtitle: "Services map to what the business does",
    accentColor: "#818cf8",
    sections: [
      {
        title: "What is a business capability?",
        accent: "#818cf8",
        content: (
          <p>
            A <strong>business capability</strong> is something a business does
            to generate value — for example, Product Catalog, Ordering,
            Inventory, or Delivery. It describes the <em>what</em>, not the{" "}
            <em>how</em>.
          </p>
        ),
      },
      {
        title: "Why this strategy works",
        accent: "#34d399",
        content: (
          <>
            <p>
              Capabilities are <strong>stable</strong> over time — they change
              much less frequently than internal processes. By aligning service
              boundaries to capabilities, you get boundaries that rarely need to
              be redrawn.
            </p>
            <p style={{ marginTop: 6 }}>
              Identified by analysing the organisation's{" "}
              <strong>purpose, structure, and business processes</strong>.
            </p>
          </>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>✓ Stable, business-aligned boundaries</li>
            <li>✓ Teams map naturally to capabilities</li>
            <li>⚠ Requires business domain knowledge upfront</li>
            <li>
              ⚠ Two capabilities can still share concepts (e.g. "product"
              appears in Catalog and Ordering)
            </li>
          </ul>
        ),
      },
    ],
  },

  "subdomain-ddd": {
    title: "Decompose by Subdomain (DDD)",
    subtitle: "Each Bounded Context becomes a service",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "What is Domain-Driven Design?",
        accent: "#38bdf8",
        content: (
          <p>
            <strong>Domain-Driven Design (DDD)</strong> focuses on modelling the
            application's <em>problem space</em> — the business domain. A domain
            consists of multiple <strong>Subdomains</strong>, each with its own
            model and language (<em>Ubiquitous Language</em>) within a{" "}
            <strong>Bounded Context</strong>.
          </p>
        ),
      },
      {
        title: "Bounded Contexts → Services",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              Services are defined around Bounded Contexts. Within each context,
              the same word might mean something completely different — a
              "product" in the Catalog context (description, images) is
              different from a "product" in the Ordering context (price, SKU,
              quantity).
            </p>
            <p style={{ marginTop: 6 }}>
              Forcing these two meanings into one shared model leads to
              coupling. DDD says: keep them separate, with explicit translation
              at the boundary.
            </p>
          </>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>✓ Minimal concept leakage across services</li>
            <li>✓ Each team owns a clear, coherent model</li>
            <li>
              ⚠ Requires deep domain modelling upfront (Event Storming, etc.)
            </li>
            <li>⚠ Higher initial design investment than other strategies</li>
          </ul>
        ),
      },
    ],
  },

  "size-based": {
    title: "Decompose by Size",
    subtitle: "Services sized to fit a single team",
    accentColor: "#fb923c",
    sections: [
      {
        title: "The two-pizza rule",
        accent: "#fb923c",
        content: (
          <p>
            Amazon's famous heuristic: if you can't feed a team with two pizzas,
            the service is too large. Each service should be owned by a team
            small enough to deploy, test, and operate it independently.
          </p>
        ),
      },
      {
        title: "When to use it",
        accent: "#34d399",
        content: (
          <p>
            Useful when you don't yet have well-understood business capabilities
            or domain models, but you know a codebase is too large for one team
            to manage. It's often used as a <strong>pragmatic first cut</strong>{" "}
            that can be refined later.
          </p>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>✓ Easy to reason about team ownership</li>
            <li>✓ Low up-front domain analysis needed</li>
            <li>⚠ Boundaries may not align with domain concepts</li>
            <li>⚠ Higher risk of chatty communication between services</li>
            <li>
              ⚠ May need to be redrawn as the domain becomes better understood
            </li>
          </ul>
        ),
      },
    ],
  },

  coupling: {
    title: "Coupling & Cohesion",
    subtitle: "The two forces that shape service quality",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Loose Coupling",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              <strong>Tightly coupled</strong> services are a major problem in
              microservices: a change in Service A forces a change in Service B,
              which forces a change in Service C — negating the independence
              that microservices are meant to provide.
            </p>
            <p style={{ marginTop: 6 }}>
              Achieve loose coupling by exposing only a stable public API and
              hiding all internal implementation — including the database
              schema.
            </p>
          </>
        ),
      },
      {
        title: "High Cohesion",
        accent: "#34d399",
        content: (
          <p>
            A service should be <strong>highly cohesive</strong> — everything
            inside it exists for one purpose. If you find yourself frequently
            changing two different parts of a service together, they probably
            belong in the same service. If two services are frequently changed
            together, they may be too separate.
          </p>
        ),
      },
      {
        title: "The Distributed Monolith anti-pattern",
        accent: "#ef4444",
        content: (
          <p>
            When services are{" "}
            <strong>loosely cohesive and tightly coupled</strong>, you get the
            worst of both worlds: the operational complexity of microservices
            with the deployment coupling of a monolith. Every deploy requires
            coordinating multiple services at once. This is the Distributed
            Monolith anti-pattern — often caused by cutting services along
            technical layers rather than domain boundaries.
          </p>
        ),
      },
    ],
  },

  "db-per-service": {
    title: "Database-per-Service",
    subtitle: "Each service owns its private data",
    accentColor: "#c084fc",
    sections: [
      {
        title: "The core rule",
        accent: "#c084fc",
        content: (
          <ul>
            <li>
              Each service has its <strong>own private database</strong>
            </li>
            <li>
              Other services <strong>cannot access it directly</strong>
            </li>
            <li>
              Data is shared only through <strong>APIs or events</strong>
            </li>
            <li>
              Each service chooses the{" "}
              <strong>database type that fits its access patterns</strong>
            </li>
          </ul>
        ),
      },
      {
        title: "Polyglot persistence",
        accent: "#34d399",
        content: (
          <>
            <p>
              Because every service owns its database, each can pick the right
              storage technology for its needs:
            </p>
            <ul style={{ marginTop: 6 }}>
              <li>
                <strong>Catalog</strong> — NoSQL Document (flexible product
                schemas, rich queries)
              </li>
              <li>
                <strong>Basket</strong> — NoSQL Key-Value (fast session
                read/write)
              </li>
              <li>
                <strong>Ordering</strong> — Relational (transactional integrity)
              </li>
              <li>
                <strong>Identity</strong> — Relational (ACID user records)
              </li>
            </ul>
          </>
        ),
      },
      {
        title: "Why this matters",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              If services share a database, you can't deploy, scale, or evolve
              them independently — a schema change for one service breaks
              others. The database becomes the hidden coupling point.
            </p>
            <p style={{ marginTop: 6, color: "#fbbf24" }}>
              The trade-off: cross-service joins become API calls or
              event-driven aggregation. Distributed transactions require
              patterns like Saga or Two-Phase Commit. Operations complexity
              increases.
            </p>
          </>
        ),
      },
    ],
  },

  "domain-analysis": {
    title: "Domain Analysis",
    subtitle: "Finding service boundaries through nouns and verbs",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Nouns and Verbs",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              Start by writing <strong>user stories</strong> for the system.
              Extract the <strong>nouns</strong> (domain objects) and{" "}
              <strong>verbs</strong> (actions) from each story.
            </p>
            <p style={{ marginTop: 6 }}>
              <strong>Core Nouns:</strong> Product/Catalog, Shopping Cart, Cart
              Item, Order
            </p>
            <p>
              <strong>Extended Nouns:</strong> Customer, Order Details,
              Supplier, User Account, Address, Brand, Category
            </p>
          </>
        ),
      },
      {
        title: "Key Verbs",
        accent: "#818cf8",
        content: (
          <ul>
            <li>
              <strong>list</strong>, <strong>filter</strong> — product browsing
            </li>
            <li>
              <strong>add</strong>, <strong>put</strong> — shopping cart
              operations
            </li>
            <li>
              <strong>checkout</strong>, <strong>pay</strong> — order creation
            </li>
            <li>
              <strong>ship</strong>, <strong>notify</strong> — fulfilment
            </li>
            <li>
              <strong>login</strong>, <strong>register</strong> — identity
            </li>
          </ul>
        ),
      },
      {
        title: "From nouns to services",
        accent: "#34d399",
        content: (
          <p>
            Nouns that cluster together (high cohesion) and have minimal
            interaction with other clusters (low coupling) become candidate
            service boundaries. Each cluster maps to one microservice.
          </p>
        ),
      },
    ],
  },

  "strangler-fig": {
    title: "Strangler Fig Pattern",
    subtitle: "Incrementally migrating from monolith to microservices",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "The metaphor",
        accent: "#f59e0b",
        content: (
          <p>
            Inspired by <strong>strangler fig vines</strong> that grow around
            and eventually replace old trees. A pattern for incrementally
            migrating a legacy monolithic system to microservices.
          </p>
        ),
      },
      {
        title: "How it works",
        accent: "#818cf8",
        content: (
          <ul>
            <li>
              Gradually create <strong>new microservices</strong> around the
              edges of the monolith
            </li>
            <li>
              A <strong>routing facade</strong> (Strangler Facade) intercepts
              requests, sending them to either the new microservice or the old
              monolith
            </li>
            <li>
              Over time, more functionality is moved to new services and the{" "}
              <strong>monolith is "strangled" out</strong>
            </li>
          </ul>
        ),
      },
      {
        title: "Why not a big-bang rewrite?",
        accent: "#ef4444",
        content: (
          <p>
            Big-bang rewrites are risky — they require feature parity before
            release, the old system can't evolve in parallel, and you discover
            missing requirements too late. The Strangler Fig pattern lets you
            migrate <strong>one service at a time</strong>, validate each
            extraction, and roll back if something goes wrong.
          </p>
        ),
      },
    ],
  },

  fulfillment: {
    title: "Order Fulfillment Process",
    subtitle: "Cross-service orchestration in microservices",
    accentColor: "#fb923c",
    sections: [
      {
        title: "The flow",
        accent: "#fb923c",
        content: (
          <ul>
            <li>
              <strong>1. Create Order</strong> — Ordering service initiates
            </li>
            <li>
              <strong>2. Validate Payment</strong> — Payment service verifies
            </li>
            <li>
              <strong>3. Update Inventory</strong> — Inventory service reserves
              stock
            </li>
            <li>
              <strong>4. Shipment</strong> — Shipping service arranges delivery
            </li>
            <li>
              <strong>5. Notify</strong> — Notification service alerts customer
            </li>
            <li>
              <strong>6. Complete Order</strong> — Ordering service finalises
            </li>
          </ul>
        ),
      },
      {
        title: "Saga pattern",
        accent: "#34d399",
        content: (
          <p>
            Since microservices can't share a distributed transaction, the{" "}
            <strong>Saga pattern</strong> coordinates the multi-step process.
            Each service completes its local transaction and publishes an event
            or calls the next step. If any step fails, compensating transactions
            undo the previous steps.
          </p>
        ),
      },
      {
        title: "Choreography vs Orchestration",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              <strong>Choreography:</strong> Each service listens for events and
              reacts — no central coordinator. Simple but harder to trace.
            </p>
            <p style={{ marginTop: 6 }}>
              <strong>Orchestration:</strong> A central orchestrator drives the
              flow — easier to trace but creates a single point of coordination.
            </p>
          </>
        ),
      },
    ],
  },

  "eval-checklist": {
    title: "Decomposition Checklist",
    subtitle: "Evaluating your microservice boundaries",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Quality criteria",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              <strong>Single Responsibility</strong> — does each service do one
              thing well?
            </li>
            <li>
              <strong>Appropriate Size</strong> — not mini-monoliths, not
              nanoservices?
            </li>
            <li>
              <strong>Communication Patterns</strong> — is inter-service chatter
              minimised?
            </li>
            <li>
              <strong>Data Ownership</strong> — does each service own its data?
            </li>
          </ul>
        ),
      },
      {
        title: "Deployment & team criteria",
        accent: "#818cf8",
        content: (
          <ul>
            <li>
              <strong>Independent Deployability</strong> — deploy without
              redeploying other services?
            </li>
            <li>
              <strong>Team Autonomy</strong> — can a small team independently
              develop, test, and deploy?
            </li>
            <li>
              <strong>Business Alignment</strong> — do boundaries match business
              capabilities or domain subdomains?
            </li>
          </ul>
        ),
      },
      {
        title: "Red flags",
        accent: "#ef4444",
        content: (
          <p>
            If two services are constantly talking, they should probably be one.
            If a service can't be deployed without redeploying others, you have
            a <strong>distributed monolith</strong>.
          </p>
        ),
      },
    ],
  },
};
