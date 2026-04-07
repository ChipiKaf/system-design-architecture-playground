import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "monolith"
  | "macroservices"
  | "microservices"
  | "serverless"
  | "tradeoffs";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  monolith: {
    title: "Monolithic Architecture",
    subtitle: "Single codebase · one deployment unit · one shared database",
    accentColor: "#94a3b8",
    sections: [
      {
        title: "What it is",
        accent: "#94a3b8",
        content: (
          <p>
            A monolith packages every feature — UI, business logic, data access
            — into a single deployable artifact. There is one process, one
            connection pool, and one release lifecycle.
          </p>
        ),
      },
      {
        title: "Why it's a good starting point",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Simple to develop: straightforward call stacks, easy to debug locally</li>
            <li>Simple to deploy: one artifact, one pipeline</li>
            <li>Strong consistency: in-process transactions are trivial</li>
            <li>Low operational overhead: no service discovery, no inter-service latency</li>
          </ul>
        ),
      },
      {
        title: "Where it breaks down",
        accent: "#ef4444",
        content: (
          <ul>
            <li><strong>Deploy granularity</strong> — a one-line bug fix requires redeploys of the entire app</li>
            <li><strong>Scale independently</strong> — you can't scale only the hot path; you must clone everything</li>
            <li><strong>Blast radius</strong> — a crash in one module can (and often does) take the whole app down</li>
            <li><strong>Team coupling</strong> — as the team grows, merges conflict and deployments block each other</li>
          </ul>
        ),
      },
      {
        title: "When to choose it",
        accent: "#60a5fa",
        content: (
          <p>
            Early-stage startups, small teams (&lt;5 engineers), POCs, simple
            applications with predictable load, or anywhere strong consistency
            is non-negotiable and distributed transactions would add more
            complexity than the monolith removes.
          </p>
        ),
      },
    ],
  },

  macroservices: {
    title: "Macroservices (Modular Monolith)",
    subtitle: "A few coarse-grained services · some shared infra",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What it is",
        accent: "#60a5fa",
        content: (
          <p>
            The monolith is split along large domain boundaries (e.g. Orders,
            Users, Payments) into a handful of services. Each service may own
            its own DB or share one with a peer. Think of it as a halfway house
            between monolith and microservices.
          </p>
        ),
      },
      {
        title: "Advantages",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Independent deployments per domain without the full overhead of microservices</li>
            <li>Smaller teams can own a whole service end-to-end</li>
            <li>Partial fault isolation — a crash in Orders doesn't necessarily kill Users</li>
            <li>Easier to reason about than hundreds of tiny services</li>
          </ul>
        ),
      },
      {
        title: "Risks",
        accent: "#ef4444",
        content: (
          <ul>
            <li>Without strict API contracts, services tend to couple via shared DBs — "distributed monolith"</li>
            <li>Synchronous inter-service calls create cascading failure paths</li>
            <li>Deploy granularity is still coarse: a shared-DB change may require co-ordinated deploys</li>
          </ul>
        ),
      },
    ],
  },

  microservices: {
    title: "Microservices",
    subtitle: "Many small independent services · each owns its data",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What it is",
        accent: "#a78bfa",
        content: (
          <p>
            Each business capability (Auth, Catalog, Orders, …) runs as its
            own fully independent service with its own database. Services
            communicate via lightweight protocols: REST, gRPC, or async
            messaging.
          </p>
        ),
      },
      {
        title: "Core benefits",
        accent: "#22c55e",
        content: (
          <ul>
            <li><strong>Independent scaling</strong> — scale only the tier that's hot</li>
            <li><strong>Fault isolation</strong> — a crash in one service doesn't cascade</li>
            <li><strong>Polyglot freedom</strong> — each service can use the best language/DB for the job</li>
            <li><strong>Small teams</strong> — Conway's Law: small services → small autonomous teams</li>
          </ul>
        ),
      },
      {
        title: "The hidden costs",
        accent: "#f59e0b",
        content: (
          <ul>
            <li><strong>Operational complexity</strong> — you now run N services, N pipelines, N monitoring dashboards</li>
            <li><strong>Distributed systems problems</strong> — network partitions, eventual consistency, distributed tracing</li>
            <li><strong>Slow startup</strong> — onboarding a new engineer means understanding dozens of repos and contracts</li>
            <li><strong>Data ownership</strong> — cross-service joins require orchestration (Saga, API composition)</li>
          </ul>
        ),
      },
    ],
  },

  serverless: {
    title: "Serverless (Nanoservices)",
    subtitle: "Individual functions · event-driven · zero idle cost",
    accentColor: "#34d399",
    sections: [
      {
        title: "What it is",
        accent: "#34d399",
        content: (
          <p>
            Serverless functions (AWS Lambda, GCP Cloud Functions, Azure
            Functions) are the extreme end of decomposition. Each function
            handles one event type. The platform manages provisioning,
            scaling, and availability automatically.
          </p>
        ),
      },
      {
        title: "Strengths",
        accent: "#22c55e",
        content: (
          <ul>
            <li><strong>Infinite scale</strong> — the platform handles thousands of concurrent invocations</li>
            <li><strong>Pay-per-invocation</strong> — zero cost at idle, scales to zero automatically</li>
            <li><strong>Total fault isolation</strong> — one failing function cannot take down another</li>
            <li><strong>Fastest deploys</strong> — seconds from code push to live</li>
          </ul>
        ),
      },
      {
        title: "Limitations",
        accent: "#ef4444",
        content: (
          <ul>
            <li><strong>Cold starts</strong> — first invocation after idle can add 200ms–2s of latency</li>
            <li><strong>Observability</strong> — tracing a request across 50 functions is hard without proper tooling</li>
            <li><strong>Vendor lock-in</strong> — functions are deeply coupled to the cloud platform's event model</li>
            <li><strong>Stateless constraint</strong> — persistent connections (WebSockets, DB pools) require workarounds</li>
            <li><strong>Local dev</strong> — simulating an event-driven mesh locally is non-trivial</li>
          </ul>
        ),
      },
    ],
  },

  tradeoffs: {
    title: "Choosing the Right Architecture",
    subtitle: "There is no universally correct answer — only context-appropriate ones",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "The three axes that matter",
        accent: "#fbbf24",
        content: (
          <ol>
            <li>
              <strong>Deploy granularity</strong> — how much of the system must
              redeploy for a single change? (Monolith: 100% → Serverless: &lt;1%)
            </li>
            <li>
              <strong>Blast radius</strong> — what fraction of users are affected
              when one component fails? (Monolith: 100% → Serverless: &lt;1%)
            </li>
            <li>
              <strong>Operational cost</strong> — how many moving parts must you
              operate, monitor, and maintain? Complexity grows fast beyond the monolith.
            </li>
          </ol>
        ),
      },
      {
        title: "Decision heuristic",
        accent: "#60a5fa",
        content: (
          <ul>
            <li>0–5 engineers, early product: <strong>Monolith</strong></li>
            <li>5–20 engineers, clear domain boundaries: <strong>Macroservices</strong></li>
            <li>20+ engineers, high scale, strong DevOps culture: <strong>Microservices</strong></li>
            <li>Event-driven workloads, bursty traffic, pay-per-use economics: <strong>Serverless</strong></li>
          </ul>
        ),
      },
      {
        title: "The Distributed Monolith anti-pattern",
        accent: "#ef4444",
        content: (
          <p>
            Splitting code into services while keeping a shared database or
            tight synchronous coupling gives you none of the benefits of
            microservices and all of the costs. The key move is{" "}
            <em>each service owns its data</em>.
          </p>
        ),
      },
    ],
  },
};
