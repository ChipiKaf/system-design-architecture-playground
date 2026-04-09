import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "cap"
  | "ap-vs-cp"
  | "service-split"
  | "reads-vs-writes";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  cap: {
    title: "CAP Theorem",
    subtitle: "Why partitions force the real trade-off",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What CAP actually says",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              In a distributed system you cannot fully guarantee consistency,
              availability, and partition tolerance at the same time.
            </p>
            <p>
              In practice partition tolerance is not optional because links
              fail, packets drop, and regions disconnect. The real design choice
              is whether a service protects consistency first or keeps serving
              requests first when that split happens.
            </p>
          </>
        ),
      },
      {
        title: "What the viewer should notice here",
        accent: "#60a5fa",
        content: (
          <p>
            Each adapter represents one e-commerce concern, then shows the same
            failure: a partition between the local service and another critical
            dependency. The interesting part is the decision each service makes
            next.
          </p>
        ),
      },
    ],
  },
  "ap-vs-cp": {
    title: "AP vs CP",
    subtitle: "Availability-first vs consistency-first behavior under a split",
    accentColor: "#22c55e",
    sections: [
      {
        title: "AP-leaning services",
        accent: "#22c55e",
        content: (
          <>
            <p>
              AP-leaning services keep responding during partitions and accept
              short-lived divergence. Catalog and notifications fit this model:
              stale data or delayed delivery is usually tolerable.
            </p>
            <p>
              The business goal is continuity. A page view or email can be a bit
              wrong for a while; a total outage is worse.
            </p>
          </>
        ),
      },
      {
        title: "CP-leaning services",
        accent: "#f97316",
        content: (
          <>
            <p>
              CP-leaning services would rather block, fail, or retry than commit
              an inconsistent result. Payments and orders fit here because money
              movement and purchase records cannot be guessed.
            </p>
            <p>
              The business goal is correctness, even when that means temporary
              unavailability.
            </p>
          </>
        ),
      },
    ],
  },
  "service-split": {
    title: "Service Split",
    subtitle: "Why one e-commerce system contains both AP and CP choices",
    accentColor: "#f97316",
    sections: [
      {
        title: "Same business, different priorities",
        accent: "#f97316",
        content: (
          <>
            <p>
              A product catalog, an inventory service, a payment service, an
              order service, and a notification service all serve the same
              store, but they do not protect the same invariant.
            </p>
            <p>
              That is why real systems often split by concern. Catalog wants the
              storefront up. Payments want the ledger correct. Notifications
              just need durable best-effort delivery.
            </p>
          </>
        ),
      },
      {
        title: "Architecture pattern",
        accent: "#fb923c",
        content: (
          <p>
            Good system design is deciding where inconsistency is acceptable and
            where it is absolutely not. Service boundaries let you make those
            decisions explicitly instead of forcing one global policy onto every
            workflow.
          </p>
        ),
      },
    ],
  },
  "reads-vs-writes": {
    title: "Reads vs Writes",
    subtitle: "The same service can make different choices per operation",
    accentColor: "#ef4444",
    sections: [
      {
        title: "Why inventory is hybrid",
        accent: "#ef4444",
        content: (
          <>
            <p>
              Inventory is the classic example. Browse reads can often tolerate
              a little staleness, so the read side leans AP through caches and
              read replicas.
            </p>
            <p>
              Checkout writes are different. Reserving the last unit must be CP
              because overselling is worse than making the buyer wait.
            </p>
          </>
        ),
      },
      {
        title: "Why this matters in interviews and production",
        accent: "#f87171",
        content: (
          <p>
            The mature answer is rarely “this whole system is AP” or “this whole
            system is CP.” The better answer is to identify the exact operation,
            the invariant it protects, and the failure you are willing to
            accept.
          </p>
        ),
      },
    ],
  },
};
