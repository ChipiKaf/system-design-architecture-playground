import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "monolith"
  | "modular-monolith"
  | "microservices"
  | "serverless"
  | "tradeoffs"
  | "when-to-migrate";

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
            <li>
              Simple to develop: straightforward call stacks, easy to debug
              locally
            </li>
            <li>Simple to deploy: one artifact, one pipeline</li>
            <li>Strong consistency: in-process transactions are trivial</li>
            <li>
              Low operational overhead: no service discovery, no inter-service
              latency
            </li>
          </ul>
        ),
      },
      {
        title: "Where it breaks down",
        accent: "#ef4444",
        content: (
          <ul>
            <li>
              <strong>Deploy granularity</strong> — a one-line bug fix requires
              redeploys of the entire app
            </li>
            <li>
              <strong>Scale independently</strong> — you can't scale only the
              hot path; you must clone everything
            </li>
            <li>
              <strong>Blast radius</strong> — a crash in one module can (and
              often does) take the whole app down
            </li>
            <li>
              <strong>Team coupling</strong> — as the team grows, merges
              conflict and deployments block each other
            </li>
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

  "modular-monolith": {
    title: "Modular Monolith",
    subtitle: "One backend · multiple bounded modules · single deploy unit",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What it is",
        accent: "#60a5fa",
        content: (
          <p>
            A modular monolith keeps a single deployable backend, but organizes
            the code as a collection of independent, interchangeable, loosely
            coupled modules. Each module owns a business capability such as
            Catalog, Ordering, Basket, or Identity.
          </p>
        ),
      },
      {
        title: "Advantages",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              Clear interfaces between modules improve code organization and
              onboarding
            </li>
            <li>
              Teams can own modules without introducing network calls between
              them
            </li>
            <li>
              Testing and refactoring get easier because boundaries are explicit
            </li>
            <li>
              It prepares the codebase for future extraction into microservices
              if needed
            </li>
          </ul>
        ),
      },
      {
        title: "What 'Separate Schema' means",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Separate schema means each module owns tables under its own
              namespace inside the same physical database instance. For example,
              the Catalog module writes to <strong>catalog.*</strong>, Ordering
              writes to <strong>ordering.*</strong>, and Basket writes to
              <strong> basket.*</strong>.
            </p>
            <p style={{ marginTop: 8 }}>
              It sits between two extremes: it is stronger isolation than a
              single shared public schema, but lighter-weight than provisioning
              a totally separate database per module. It improves ownership and
              makes coupling more visible, but it does not give runtime fault
              isolation the way separate services do.
            </p>
          </>
        ),
      },
      {
        title: "Limits",
        accent: "#ef4444",
        content: (
          <ul>
            <li>
              It is still deployed as a single unit, so one module change
              redeploys the whole backend
            </li>
            <li>
              It still scales as one application process or pod, not per module
            </li>
            <li>
              Weak discipline leads to leaky abstractions and tight coupling
              between modules
            </li>
            <li>
              Shared resources like one RDBMS can still create wide blast radius
              at runtime
            </li>
          </ul>
        ),
      },
      {
        title: "When it fits best",
        accent: "#38bdf8",
        content: (
          <p>
            Use it when the team has outgrown a tangled monolith but does not
            yet need the operational complexity of microservices. It is often
            the highest-leverage middle ground for a growing product.
          </p>
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
            Each business capability (Auth, Catalog, Orders, …) runs as its own
            fully independent service with its own private database. Other
            services should not reach into that database directly; they go
            through the owning service via REST, gRPC, or async messaging.
          </p>
        ),
      },
      {
        title: "Database-per-service pattern",
        accent: "#c084fc",
        content: (
          <ul>
            <li>
              <strong>Each service owns its private data store</strong> — the
              Orders service owns order data, the Catalog service owns product
              data, and so on.
            </li>
            <li>
              <strong>No direct cross-service DB access</strong> — another
              service should not connect to the Orders database and run SQL
              against it.
            </li>
            <li>
              <strong>Data is exposed through APIs or events</strong> — the
              owning service defines the contract, which preserves autonomy and
              prevents hidden coupling.
            </li>
            <li>
              <strong>Ownership is explicit</strong> — when a schema changes,
              one team is accountable and other teams consume the public
              contract instead of internal tables.
            </li>
          </ul>
        ),
      },
      {
        title: "Why teams use it",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              <strong>Loose coupling and service autonomy</strong> — service
              boundaries are reinforced by data boundaries, not just code
              boundaries
            </li>
            <li>
              <strong>Independent schema evolution</strong> — one team can
              change its internal tables without forcing every other service to
              coordinate
            </li>
            <li>
              <strong>Independent scalability</strong> — hot services can scale
              their compute and data store separately from the rest of the
              system
            </li>
            <li>
              <strong>Improved fault isolation</strong> — a bad schema change or
              datastore outage is more likely to stay within one service
            </li>
            <li>
              <strong>Clear ownership</strong> — teams know which service owns
              which data, which reduces accidental coupling
            </li>
          </ul>
        ),
      },
      {
        title: "Polyglot persistence",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              Database-per-service also enables{" "}
              <strong>polyglot persistence</strong>: different services can use
              different data stores when their access patterns are different.
            </p>
            <p style={{ marginTop: 8 }}>
              For example, Catalog might use a document database, Basket might
              use a key-value store, and Ordering might stay on an RDBMS.
              Microservices do not require this, but they make it possible
              because each service owns its own data model.
            </p>
          </>
        ),
      },
      {
        title: "What gets harder",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>
              <strong>Joining data across services</strong> — you can no longer
              write one big SQL join across the whole business domain
            </li>
            <li>
              <strong>Distributed transactions and consistency</strong> — one
              business action may span multiple services, so you need sagas,
              outboxes, retries, and eventual consistency patterns
            </li>
            <li>
              <strong>Operational complexity</strong> — you now run N services,
              N pipelines, N dashboards, and more cross-service failure modes
            </li>
            <li>
              <strong>Tracing and debugging</strong> — following one request
              across services and events is much harder than stepping through a
              monolith
            </li>
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
            handles one event type. The platform manages provisioning, scaling,
            and availability automatically.
          </p>
        ),
      },
      {
        title: "Strengths",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              <strong>Infinite scale</strong> — the platform handles thousands
              of concurrent invocations
            </li>
            <li>
              <strong>Pay-per-invocation</strong> — zero cost at idle, scales to
              zero automatically
            </li>
            <li>
              <strong>Total fault isolation</strong> — one failing function
              cannot take down another
            </li>
            <li>
              <strong>Fastest deploys</strong> — seconds from code push to live
            </li>
          </ul>
        ),
      },
      {
        title: "Limitations",
        accent: "#ef4444",
        content: (
          <ul>
            <li>
              <strong>Cold starts</strong> — first invocation after idle can add
              200ms–2s of latency
            </li>
            <li>
              <strong>Observability</strong> — tracing a request across 50
              functions is hard without proper tooling
            </li>
            <li>
              <strong>Vendor lock-in</strong> — functions are deeply coupled to
              the cloud platform's event model
            </li>
            <li>
              <strong>Stateless constraint</strong> — persistent connections
              (WebSockets, DB pools) require workarounds
            </li>
            <li>
              <strong>Local dev</strong> — simulating an event-driven mesh
              locally is non-trivial
            </li>
          </ul>
        ),
      },
    ],
  },

  "when-to-migrate": {
    title: "When to Move to the Next Architecture",
    subtitle:
      "Concrete signals that tell you it's time to evolve — and when it's too early",
    accentColor: "#f472b6",
    sections: [
      {
        title: "Monolith → Modular Monolith",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              The monolith itself is a great starting point. You should only
              restructure when you feel real pain — not because a blog post said
              so.
            </p>
            <p style={{ marginTop: 8 }}>
              <strong>Move when you see:</strong>
            </p>
            <ul>
              <li>
                <strong>Merge conflicts across teams</strong> — different teams
                step on each other's code because there are no clear ownership
                boundaries.
              </li>
              <li>
                <strong>Fear-driven deployments</strong> — a tiny change in one
                area breaks something unrelated, and nobody wants to deploy on
                Friday.
              </li>
              <li>
                <strong>Unclear code ownership</strong> — no one knows who owns
                the payment logic vs. catalog logic, and PRs constantly touch
                shared files.
              </li>
              <li>
                <strong>Growing team size (5–15 engineers)</strong> — the team
                is large enough that coordination costs outweigh the simplicity
                of one codebase, but not so large that independent services are
                justified.
              </li>
              <li>
                <strong>Domain boundaries are becoming visible</strong> — you
                can clearly name 3–6 capabilities (Orders, Auth, Catalog…) that
                belong in separate domains.
              </li>
            </ul>
            <p style={{ marginTop: 8 }}>
              <strong>Don't move yet if:</strong> You're a small team that can
              deploy daily with no conflicts. Premature modularization adds
              boilerplate without payoff.
            </p>
          </>
        ),
      },
      {
        title: "Modular Monolith → Microservices",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              A modular monolith buys you internal clarity, but at some point
              that single process can't satisfy independent scaling, independent
              release cadences, or fault isolation.
            </p>
            <p style={{ marginTop: 8 }}>
              <strong>Move when you see:</strong>
            </p>
            <ul>
              <li>
                <strong>One module blocks deployment of others</strong> — the
                Orders team is ready to ship, but they have to wait because the
                Catalog module has a broken test.
              </li>
              <li>
                <strong>Scaling is all-or-nothing</strong> — you can't give more
                CPU to the hot path (e.g., Search) without scaling the entire
                backend, wasting capacity.
              </li>
              <li>
                <strong>A single fault takes everything down</strong> — an OOM
                in one module crashes the whole process, and there's nothing the
                modular boundary can do about it at runtime.
              </li>
              <li>
                <strong>Teams need polyglot flexibility</strong> — one team
                wants Go for a low-latency service; another prefers Python for
                ML inference. A single runtime can't accommodate that.
              </li>
              <li>
                <strong>Release cadence differs dramatically</strong> — the Auth
                module ships once a quarter while the Checkout module ships
                daily. They're on fundamentally different lifecycles.
              </li>
              <li>
                <strong>You have the DevOps maturity to support it</strong> —
                CI/CD pipelines, container orchestration, distributed tracing,
                and on-call rotations per service are prerequisites, not
                nice-to-haves.
              </li>
            </ul>
            <p style={{ marginTop: 8 }}>
              <strong>Don't move yet if:</strong> Your modules work well, you
              can deploy frequently, and you don't need independent scaling.
              Microservices tax is real and ongoing.
            </p>
          </>
        ),
      },
      {
        title: "Microservices → Serverless",
        accent: "#34d399",
        content: (
          <>
            <p>
              Serverless is the most extreme decomposition. It's a great fit for
              specific workload shapes, but a bad fit for others.
            </p>
            <p style={{ marginTop: 8 }}>
              <strong>Move when you see:</strong>
            </p>
            <ul>
              <li>
                <strong>Bursty, event-driven traffic</strong> — workloads that
                spike from 0 to 10,000 requests and back to 0 in minutes.
                Keeping containers warm 24/7 wastes money.
              </li>
              <li>
                <strong>Cost sensitivity at idle</strong> — you're paying for
                instances that sit idle 80% of the time. Pay-per-invocation
                eliminates idle cost entirely.
              </li>
              <li>
                <strong>Tasks are naturally short-lived</strong> — image
                resizing, webhook processing, file transformations, API
                composition — jobs that finish in seconds, not minutes.
              </li>
              <li>
                <strong>Platform-managed scaling is worth the trade-off</strong>{" "}
                — you'd rather accept cold starts and vendor coupling than
                manage Kubernetes, HPA policies, and node pools yourself.
              </li>
              <li>
                <strong>You already use managed cloud services heavily</strong>{" "}
                — DynamoDB, SQS, S3 event triggers, API Gateway. Serverless
                composes naturally with the cloud-native event model.
              </li>
            </ul>
            <p style={{ marginTop: 8 }}>
              <strong>Don't move yet if:</strong> You have long-running
              processes, need persistent connections (WebSockets, DB pools), or
              require sub-10ms latency where cold starts are unacceptable.
              Stateful or latency-critical services are better as containers.
            </p>
          </>
        ),
      },
      {
        title: "The Distributed Monolith anti-pattern",
        accent: "#ef4444",
        content: (
          <>
            <p>
              The most expensive mistake is jumping from a tangled monolith
              straight to microservices without ever establishing clear domain
              boundaries first.
            </p>
            <p style={{ marginTop: 8 }}>
              A modular monolith forces you to define module interfaces, clarify
              data ownership, and identify the real domain seams. Those are{" "}
              <em>exactly</em> the boundaries you'll split on later. If you skip
              that step, you'll create a distributed monolith — tightly coupled
              services that communicate synchronously and share a database —
              giving you all the costs of distribution with none of the
              benefits.
            </p>
            <p style={{ marginTop: 8 }}>
              <strong>Rule of thumb:</strong> if you can't draw clean module
              boundaries inside one codebase, you aren't ready to draw service
              boundaries across a network.
            </p>
          </>
        ),
      },
    ],
  },

  tradeoffs: {
    title: "Choosing the Right Architecture",
    subtitle:
      "There is no universally correct answer — only context-appropriate ones",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "The three axes that matter",
        accent: "#fbbf24",
        content: (
          <ol>
            <li>
              <strong>Deploy granularity</strong> — how much of the system must
              redeploy for a single change? (Monolith: 100% → Serverless:
              &lt;1%)
            </li>
            <li>
              <strong>Blast radius</strong> — what fraction of users are
              affected when one component fails? (Monolith: 100% → Serverless:
              &lt;1%)
            </li>
            <li>
              <strong>Operational cost</strong> — how many moving parts must you
              operate, monitor, and maintain? Complexity grows fast beyond the
              monolith.
            </li>
          </ol>
        ),
      },
      {
        title: "Decision heuristic",
        accent: "#60a5fa",
        content: (
          <ul>
            <li>
              0–5 engineers, early product: <strong>Monolith</strong>
            </li>
            <li>
              5–20 engineers, clear domain boundaries:{" "}
              <strong>Modular Monolith</strong>
            </li>
            <li>
              20+ engineers, high scale, strong DevOps culture:{" "}
              <strong>Microservices</strong>
            </li>
            <li>
              Event-driven workloads, bursty traffic, pay-per-use economics:{" "}
              <strong>Serverless</strong>
            </li>
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
