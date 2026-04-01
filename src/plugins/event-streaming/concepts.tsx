import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "kafka"
  | "idempotency"
  | "subscription"
  | "partitioning"
  | "consumer-group"
  | "worker-group"
  | "broadcast-group";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  kafka: {
    title: "Apache Kafka",
    subtitle: "Distributed event-streaming platform",
    accentColor: "#0ea5e9",
    sections: [
      {
        title: "What is Kafka?",
        accent: "#0ea5e9",
        content: (
          <>
            <p>
              <strong>Apache Kafka</strong> is a distributed event-streaming
              platform. Think of it as a <strong>durable, ordered log</strong>{" "}
              that sits between producers (apps that generate events) and
              consumers (apps that react to events).
            </p>
            <p>
              Unlike a traditional message queue that deletes messages after
              delivery, Kafka <strong>retains events</strong> for a configurable
              period (hours, days, or forever). Multiple consumers can each read
              the same events independently, at their own pace.
            </p>
          </>
        ),
      },
      {
        title: "Core Concepts",
        accent: "#38bdf8",
        content: (
          <ul>
            <li>
              <strong>Topic</strong> — A named category / feed of events (e.g.{" "}
              <code>order-placed</code>). Producers write to a topic; consumers
              read from it.
            </li>
            <li>
              <strong>Partition</strong> — Each topic is split into partitions
              for parallelism. Events with the same <strong>key</strong> always
              land in the same partition, guaranteeing <em>order per key</em>.
            </li>
            <li>
              <strong>Broker</strong> — A Kafka server. A cluster has multiple
              brokers; each stores a subset of partitions.
            </li>
            <li>
              <strong>Offset</strong> — A sequential ID for each event in a
              partition. Consumers track their offset to know where they left
              off.
            </li>
            <li>
              <strong>Replication</strong> — Each partition is replicated across
              brokers for fault tolerance. One replica is the <em>leader</em>;
              the rest are <em>followers</em>.
            </li>
          </ul>
        ),
      },
      {
        title: "Producers",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              A producer is any application that publishes events to a Kafka
              topic. The producer decides which <strong>key</strong> to attach
              to each event. Kafka hashes the key to choose the target
              partition.
            </p>
            <p>
              Producers can choose delivery guarantees: <code>acks=0</code>{" "}
              (fire-and-forget), <code>acks=1</code> (leader acknowledged), or{" "}
              <code>acks=all</code> (all replicas acknowledged — strongest
              guarantee).
            </p>
          </>
        ),
      },
      {
        title: "Consumers & Consumer Groups",
        accent: "#6366f1",
        content: (
          <>
            <p>
              A <strong>consumer</strong> reads events from one or more
              partitions. Consumers that share the same{" "}
              <strong>group ID</strong> form a <strong>consumer group</strong>.
            </p>
            <p>
              Inside a group, Kafka assigns each partition to exactly one
              consumer — this gives you <strong>load-balanced</strong>{" "}
              consumption. If a consumer crashes, Kafka rebalances the
              partitions among the remaining members.
            </p>
            <p>
              Two <em>different</em> consumer groups reading the same topic each
              get <strong>all</strong> events independently — this is the{" "}
              <strong>fan-out / broadcast</strong> pattern.
            </p>
          </>
        ),
      },
      {
        title: "Why Kafka?",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              <strong>Decoupling</strong> — Producers and consumers don't need
              to know about each other.
            </li>
            <li>
              <strong>Durability</strong> — Events are persisted to disk and
              replicated. You can replay the log.
            </li>
            <li>
              <strong>Scalability</strong> — Add partitions for throughput; add
              consumers for parallel processing.
            </li>
            <li>
              <strong>Ordering</strong> — Events with the same key are always
              delivered in order within a partition.
            </li>
          </ul>
        ),
      },
    ],
    aside: (
      <>
        <h4>Quick Reference</h4>
        <p>
          <strong>Default port:</strong> 9092
        </p>
        <p>
          <strong>Protocol:</strong> TCP binary
        </p>
        <p>
          <strong>Client libs:</strong> librdkafka (C), KafkaJS (Node),
          confluent-kafka (Python)
        </p>
        <p>
          <strong>Retention:</strong> time-based or size-based; default 7 days
        </p>
        <p>
          <strong>Alternatives:</strong> Amazon Kinesis, Redpanda, Apache Pulsar
        </p>
      </>
    ),
  },

  idempotency: {
    title: "Idempotency",
    subtitle: "Processing the same event twice produces the same result",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What is Idempotency?",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              An operation is <strong>idempotent</strong> if performing it
              multiple times has the same effect as performing it once. In
              event-driven systems this is critical because events can be{" "}
              <strong>delivered more than once</strong> (network retries,
              consumer crashes, rebalances).
            </p>
            <p>
              Example: <code>SET balance = 100</code> is idempotent — running it
              twice still gives 100. But <code>balance += 10</code> is{" "}
              <em>not</em> idempotent — running it twice adds 20.
            </p>
          </>
        ),
      },
      {
        title: "Why It Matters Here",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              Kafka provides <strong>at-least-once delivery</strong> by default.
              If a worker consumes an event and crashes before committing its
              offset, Kafka will redeliver that event. Without idempotent
              handling, this causes <strong>duplicate side-effects</strong>{" "}
              (double writes, duplicate charges, etc.).
            </p>
            <p>
              In this demo, the <strong>Data Store</strong> represents a
              persistent layer that applies idempotency checks before writing.
            </p>
          </>
        ),
      },
      {
        title: "Common Strategies",
        accent: "#7c3aed",
        content: (
          <ul>
            <li>
              <strong>Event ID / dedup key</strong> — Store the ID of every
              processed event. If you see the same ID again, skip it.
            </li>
            <li>
              <strong>Upsert / PUT semantics</strong> — Write the full state
              rather than a delta. <code>SET x = val</code> instead of{" "}
              <code>x += delta</code>.
            </li>
            <li>
              <strong>Idempotency key in HTTP APIs</strong> — Clients send a
              unique key with each request; the server deduplicates on that key.
            </li>
            <li>
              <strong>Kafka producer idempotency</strong> — Setting{" "}
              <code>enable.idempotence=true</code> lets Kafka deduplicate
              producer retries at the broker level.
            </li>
          </ul>
        ),
      },
    ],
    aside: (
      <>
        <h4>Rule of Thumb</h4>
        <p>
          If your consumer writes to an external system, <strong>always</strong>{" "}
          design for at-least-once delivery and make the write idempotent.
        </p>
        <p>
          The cost of designing for idempotency upfront is far lower than
          debugging duplicate side-effects in production.
        </p>
      </>
    ),
  },

  subscription: {
    title: "Subscriptions & Consumer Groups",
    subtitle: "How consumers attach to topics and receive events",
    accentColor: "#22c55e",
    sections: [
      {
        title: "What is a Subscription?",
        accent: "#22c55e",
        content: (
          <>
            <p>
              A <strong>subscription</strong> is when a consumer (or consumer
              group) tells the Kafka broker:{" "}
              <em>"I want to read events from topic X."</em> The broker then
              assigns partitions to that consumer and begins delivering events.
            </p>
            <p>
              Unlike a push-based pub/sub (e.g. WebSocket broadcasts), Kafka
              consumers <strong>pull</strong> events at their own pace by
              polling the broker.
            </p>
          </>
        ),
      },
      {
        title: "Consumer Groups Explained",
        accent: "#16a34a",
        content: (
          <>
            <p>
              A <strong>consumer group</strong> is a set of consumers that share
              the same <code>group.id</code>. Kafka ensures each partition of
              the subscribed topic is assigned to <strong>exactly one</strong>{" "}
              consumer within the group.
            </p>
            <p>
              This means if you have 3 partitions and 3 consumers in the same
              group, each consumer gets 1 partition —{" "}
              <strong>load-balanced consumption</strong>.
            </p>
            <p>
              If a consumer in the group dies, Kafka triggers a{" "}
              <strong>rebalance</strong> and redistributes its partitions among
              the survivors.
            </p>
          </>
        ),
      },
      {
        title: "Load-Balanced vs Fan-Out",
        accent: "#4ade80",
        content: (
          <>
            <p>
              <strong>Load-balanced (same group ID):</strong> Partitions are
              split among consumers. Each event is processed by exactly{" "}
              <strong>one</strong> consumer. Used for workers that process and
              persist events.
            </p>
            <p>
              <strong>Fan-out (different group IDs):</strong> Each consumer
              group independently reads <strong>all</strong> events. Used when
              multiple services need the same data — e.g. a search indexer, a
              notification service, and an analytics pipeline all subscribing to
              the same topic.
            </p>
          </>
        ),
      },
      {
        title: "In This Demo",
        accent: "#86efac",
        content: (
          <>
            <p>
              <strong>Store Workers</strong> form one consumer group with{" "}
              <code>group.id = "store-workers"</code>. Each worker subscribes to
              and owns one partition, so each event is processed once.
            </p>
            <p>
              <strong>WebSocket Nodes</strong> each use their own{" "}
              <strong>unique</strong> group ID (e.g.{" "}
              <code>group.id = "ws-node-0"</code>, <code>"ws-node-1"</code>).
              Because each node is the sole member of its own group, Kafka
              assigns it <strong>all</strong> partitions — giving every node
              every event (fan-out).
            </p>
          </>
        ),
      },
    ],
    aside: (
      <>
        <h4>Key Insight</h4>
        <p>
          The <strong>group.id</strong> is the magic switch. Same group ID =
          load-balanced. Different group IDs = each group gets everything.
        </p>
        <p>
          You can add consumers to a group at runtime. Kafka will rebalance
          automatically.
        </p>
      </>
    ),
  },

  partitioning: {
    title: "Partitioning & Ordering",
    subtitle: "How Kafka splits a topic for parallelism and ordering",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "What is a Partition?",
        accent: "#fbbf24",
        content: (
          <>
            <p>
              A <strong>partition</strong> is a single, ordered, append-only log
              within a Kafka topic. Each event written to a partition gets a
              sequential <strong>offset</strong> (0, 1, 2, …).
            </p>
            <p>
              A topic can have many partitions. More partitions = more
              parallelism, because different consumers can read different
              partitions simultaneously.
            </p>
          </>
        ),
      },
      {
        title: "Key-Based Routing",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              When a producer sends an event with a <strong>key</strong>, Kafka
              hashes the key to determine the partition:{" "}
              <code>partition = hash(key) % numPartitions</code>.
            </p>
            <p>
              All events with the same key land in the same partition, which
              means they are{" "}
              <strong>strictly ordered relative to each other</strong>. This is
              how you guarantee ordering for a specific user, order, or entity.
            </p>
          </>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#d97706",
        content: (
          <ul>
            <li>
              <strong>More partitions</strong> → higher throughput but more
              broker resources and longer rebalance times.
            </li>
            <li>
              <strong>Fewer partitions</strong> → simpler but limits max
              consumer parallelism (one consumer per partition per group).
            </li>
            <li>
              <strong>No key (null key)</strong> → round-robin assignment across
              partitions. No ordering guarantee.
            </li>
          </ul>
        ),
      },
    ],
  },

  "consumer-group": {
    title: "Consumer Groups Deep Dive",
    subtitle: "Coordinated consumption across multiple instances",
    accentColor: "#6366f1",
    sections: [
      {
        title: "The Coordination Protocol",
        accent: "#6366f1",
        content: (
          <>
            <p>
              When consumers join a group, one broker becomes the{" "}
              <strong>group coordinator</strong>. It handles:
            </p>
            <ul>
              <li>
                <strong>Membership</strong> — tracking which consumers are alive
                (via heartbeats).
              </li>
              <li>
                <strong>Partition assignment</strong> — deciding which consumer
                gets which partition(s).
              </li>
              <li>
                <strong>Rebalancing</strong> — redistributing partitions when
                consumers join or leave.
              </li>
            </ul>
          </>
        ),
      },
      {
        title: "Offset Management",
        accent: "#818cf8",
        content: (
          <>
            <p>
              Each consumer group tracks its <strong>committed offset</strong>{" "}
              per partition. After processing an event, the consumer commits its
              offset. If it crashes and restarts, it resumes from the last
              committed offset.
            </p>
            <p>
              This is exactly why <strong>idempotency</strong> matters — if the
              consumer processed an event but crashed before committing, it will
              re-receive that event after restart.
            </p>
          </>
        ),
      },
    ],
  },

  "worker-group": {
    title: "Why Workers Get One Partition Each",
    subtitle: "Shared group.id → Kafka load-balances across members",
    accentColor: "#818cf8",
    sections: [
      {
        title: "The Key: One Shared Group ID",
        accent: "#818cf8",
        content: (
          <>
            <p>
              All store workers join Kafka with the <strong>same</strong>{" "}
              <code>group.id = "store-workers"</code>. From Kafka's perspective
              they form a single <strong>consumer group</strong>.
            </p>
            <p>
              Kafka's rule: inside a consumer group, each partition is assigned
              to <strong>exactly one</strong> member. So with 3 partitions and 3
              workers, each worker gets one partition.
            </p>
          </>
        ),
      },
      {
        title: "How the Assignment Works",
        accent: "#6366f1",
        content: (
          <>
            <p>
              When workers connect, the Kafka <strong>group coordinator</strong>{" "}
              (a broker) runs a partition assignment strategy (usually{" "}
              <em>range</em> or <em>round-robin</em>):
            </p>
            <ul>
              <li>Worker 0 → P0</li>
              <li>Worker 1 → P1</li>
              <li>Worker 2 → P2</li>
            </ul>
            <p>
              If a worker crashes, Kafka <strong>rebalances</strong> — surviving
              workers pick up the orphaned partition. When the worker returns,
              Kafka rebalances again.
            </p>
          </>
        ),
      },
      {
        title: "Why This Matters",
        accent: "#4f46e5",
        content: (
          <ul>
            <li>
              <strong>No duplicate processing</strong> — each event is consumed
              by exactly one worker (at-least-once semantics still require
              idempotency for safety).
            </li>
            <li>
              <strong>Horizontal scaling</strong> — add more partitions and
              workers to increase throughput.
            </li>
            <li>
              <strong>Ordering per key</strong> — since all events for a key hit
              the same partition, and one worker owns that partition, events for
              a given key are processed in order.
            </li>
          </ul>
        ),
      },
    ],
    aside: (
      <>
        <h4>Quick Rule</h4>
        <p>
          Same <code>group.id</code> = load-balanced.
        </p>
        <p>
          Kafka assigns each partition to <strong>one</strong> member of the
          group. Max useful consumers = number of partitions.
        </p>
      </>
    ),
  },

  "broadcast-group": {
    title: "Why Every Node Gets Every Event",
    subtitle: "Unique group.id per node → each node is its own consumer group",
    accentColor: "#4ade80",
    sections: [
      {
        title: "The Key: Each Node Has a Unique Group ID",
        accent: "#4ade80",
        content: (
          <>
            <p>
              Each WebSocket node subscribes to the same topic but uses its{" "}
              <strong>own unique</strong> <code>group.id</code> — e.g.{" "}
              <code>"ws-node-0"</code>, <code>"ws-node-1"</code>,{" "}
              <code>"ws-node-2"</code>.
            </p>
            <p>
              Because each node is the <strong>sole member</strong> of its own
              consumer group, Kafka assigns it <strong>all</strong> partitions.
              Every node independently reads every event.
            </p>
          </>
        ),
      },
      {
        title: "Contrast with Workers",
        accent: "#22c55e",
        content: (
          <>
            <p>
              Workers share <code>group.id = "store-workers"</code>, so Kafka
              splits events among them (load-balanced). WebSocket nodes each
              have a unique group ID, so Kafka gives each node{" "}
              <strong>everything</strong> (fan-out).
            </p>
            <p>
              The difference is <strong>one config value</strong>:{" "}
              <code>group.id</code>. Same ID = share the work. Unique ID =
              everyone gets a copy.
            </p>
          </>
        ),
      },
      {
        title: "Why Fan-Out Here?",
        accent: "#16a34a",
        content: (
          <>
            <p>
              Each WS node serves a different set of connected browser clients.
              Every client needs every event in real time, so each node must
              receive the full stream and push it over WebSockets.
            </p>
            <p>
              If these nodes shared a group ID, each event would reach only{" "}
              <strong>one</strong> node, and clients connected to the other
              nodes would miss it entirely.
            </p>
          </>
        ),
      },
    ],
    aside: (
      <>
        <h4>Quick Rule</h4>
        <p>
          Unique <code>group.id</code> per node = fan-out.
        </p>
        <p>
          Each consumer group independently reads <strong>all</strong> events.
          The nodes don't compete — they each get a full copy.
        </p>
      </>
    ),
  },
};
