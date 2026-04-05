import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "sharding"
  | "routing"
  | "shard-key"
  | "hotspots"
  | "fanout"
  | "cross-shard"
  | "rebalance"
  | "replication-vs-sharding"
  | "denormalization";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  sharding: {
    title: "Horizontal DB Scaling (Sharding)",
    subtitle: "Split one dataset across many databases",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "Core idea",
        accent: "#38bdf8",
        content: (
          <p>
            Sharding partitions data so each shard owns only part of the
            dataset. Reads and writes scale horizontally because load is spread
            across multiple database nodes.
          </p>
        ),
      },
      {
        title: "Key tradeoff",
        accent: "#38bdf8",
        content: (
          <p>
            Point lookups can get much faster, but queries that need many shards
            become more expensive because they require fan-out and merge work.
          </p>
        ),
      },
    ],
  },

  routing: {
    title: "Request Routing",
    subtitle: "How one key maps to one shard",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "Deterministic route",
        accent: "#60a5fa",
        content: (
          <p>
            The router extracts a shard key (for example userId), computes a
            hash, then maps it to a shard. Same key always routes to the same
            shard.
          </p>
        ),
      },
      {
        title: "Example",
        accent: "#60a5fa",
        content: (
          <pre>{`userId = 42
hash(42) = 138291
138291 % 4 = 3
=> route to Shard 3`}</pre>
        ),
      },
    ],
  },

  "shard-key": {
    title: "Shard Key Choice",
    subtitle: "Most important design decision",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What makes a good key",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>Stable over time (does not change often)</li>
            <li>Present in common queries</li>
            <li>Distributes writes/reads evenly</li>
          </ul>
        ),
      },
      {
        title: "Locality rule",
        accent: "#f59e0b",
        content: (
          <p>
            Keep data that is queried together on the same shard. For
            user-centric products, this usually means sharding child entities by
            userId.
          </p>
        ),
      },
    ],
  },

  hotspots: {
    title: "Hotspots and Skew",
    subtitle: "Uneven load defeats horizontal scaling",
    accentColor: "#f87171",
    sections: [
      {
        title: "Why hotspots happen",
        accent: "#f87171",
        content: (
          <ul>
            <li>Range sharding with sequential IDs</li>
            <li>Popular users/regions receiving most writes</li>
            <li>Bad shard key for dominant query path</li>
          </ul>
        ),
      },
      {
        title: "Result",
        accent: "#f87171",
        content: (
          <p>
            One shard saturates while others are underutilized. Throughput drops
            to the speed of the hottest shard.
          </p>
        ),
      },
    ],
  },

  fanout: {
    title: "Fan-out in This Sandbox",
    subtitle: "How one query expands into many shard requests",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What fan-out means here",
        accent: "#a78bfa",
        content: (
          <p>
            Fan-out is the number of shards touched by a query. If a request
            cannot be answered from one shard, the router sends parallel
            sub-requests to multiple shards, then combines responses.
          </p>
        ),
      },
      {
        title: "Simple example",
        accent: "#a78bfa",
        content: (
          <pre>{`Router receives one query
-> shard-1
-> shard-2
-> shard-3
-> merge results`}</pre>
        ),
      },
      {
        title: "Why it matters",
        accent: "#a78bfa",
        content: (
          <ul>
            <li>Higher fan-out usually means higher latency</li>
            <li>More network and merge overhead</li>
            <li>More operational complexity under load</li>
          </ul>
        ),
      },
    ],
  },

  "cross-shard": {
    title: "Cross-Shard Queries",
    subtitle: "Scatter, gather, merge",
    accentColor: "#c084fc",
    sections: [
      {
        title: "Local vs global",
        accent: "#c084fc",
        content: (
          <ul>
            <li>Single-shard query: fast and cheap</li>
            <li>Cross-shard query: fan-out + network + merge cost</li>
          </ul>
        ),
      },
      {
        title: "Join pain",
        accent: "#c084fc",
        content: (
          <p>
            If users and orders are sharded on different keys, joining them may
            require querying many shards and combining partial results.
          </p>
        ),
      },
    ],
  },

  rebalance: {
    title: "Rebalancing and Resharding",
    subtitle: "Operational cost of growth",
    accentColor: "#22c55e",
    sections: [
      {
        title: "What changes",
        accent: "#22c55e",
        content: (
          <p>
            Adding/removing shards requires moving data. Naive modulo hashing
            can move a lot of keys, while better strategies can reduce movement.
          </p>
        ),
      },
      {
        title: "Why it matters",
        accent: "#22c55e",
        content: (
          <p>
            Data movement consumes bandwidth and can impact latency during
            migration windows. Scale-out is never free operationally.
          </p>
        ),
      },
    ],
  },

  "replication-vs-sharding": {
    title: "Replication vs Sharding",
    subtitle: "Copies versus partitions",
    accentColor: "#facc15",
    sections: [
      {
        title: "Replication",
        accent: "#facc15",
        content: (
          <p>
            Each replica stores the same data. Replication improves availability
            and read scale, but does not partition ownership of the dataset.
          </p>
        ),
      },
      {
        title: "Sharding",
        accent: "#facc15",
        content: (
          <p>
            Each shard stores different data. Sharding increases write and
            storage scale by distributing ownership across many nodes.
          </p>
        ),
      },
    ],
  },

  denormalization: {
    title: "Denormalization in Sharded Systems",
    subtitle: "Duplicate selected fields to avoid expensive joins",
    accentColor: "#2dd4bf",
    sections: [
      {
        title: "Why teams do this",
        accent: "#2dd4bf",
        content: (
          <p>
            Copying a few read-heavy fields into child records can keep hot
            paths local to one shard and reduce fan-out queries.
          </p>
        ),
      },
      {
        title: "Tradeoff",
        accent: "#2dd4bf",
        content: (
          <p>
            Reads get faster, but writes become more complex because duplicated
            fields must be kept consistent.
          </p>
        ),
      },
    ],
  },
};
