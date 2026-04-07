import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey = "mqtt" | "topics" | "qos" | "pubsub";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  mqtt: {
    title: "MQTT Protocol",
    subtitle: "Lightweight messaging for IoT",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What is MQTT?",
        accent: "#a78bfa",
        content: (
          <div>
            <p>
              <strong>MQTT</strong> (Message Queuing Telemetry Transport) is a
              lightweight publish/subscribe messaging protocol designed for
              constrained devices and low-bandwidth, high-latency networks. It's
              the de-facto standard for IoT communication.
            </p>
            <p>
              MQTT runs over TCP/IP and uses a <strong>broker</strong> as a
              central hub. Clients never communicate directly — they publish
              messages to topics, and the broker forwards them to all
              subscribers whose topic filters match.
            </p>
          </div>
        ),
      },
      {
        title: "Key Properties",
        accent: "#a78bfa",
        content: (
          <ul>
            <li>
              <strong>Lightweight:</strong> Minimal packet overhead (as small as
              2 bytes header)
            </li>
            <li>
              <strong>Bi-directional:</strong> Any client can publish and
              subscribe
            </li>
            <li>
              <strong>Session awareness:</strong> Broker tracks client sessions
              and pending messages
            </li>
            <li>
              <strong>Last Will & Testament:</strong> Clients can set a "will"
              message sent if they disconnect unexpectedly
            </li>
            <li>
              <strong>Retained messages:</strong> Broker stores the last message
              per topic for new subscribers
            </li>
          </ul>
        ),
      },
    ],
  },

  topics: {
    title: "Topics & Wildcards",
    subtitle: "Hierarchical message routing",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "Topic Structure",
        accent: "#fbbf24",
        content: (
          <div>
            <p>
              MQTT topics are <strong>UTF-8 strings</strong> with levels
              separated by <code>/</code>. They form a hierarchy, similar to a
              file system path:
            </p>
            <pre style={{ color: "#fbbf24", fontSize: "0.85rem" }}>
              {`building/floor/room
B1/F1/R1
B1/F1/R2
B2/F1/R1`}
            </pre>
            <p>
              Publishers send messages to an <strong>exact topic</strong>.
              Subscribers can use <strong>wildcards</strong> to match multiple
              topics at once.
            </p>
          </div>
        ),
      },
      {
        title: "Wildcard Types",
        accent: "#fbbf24",
        content: (
          <div>
            <p>
              <strong>
                <code>+</code> (Single-level wildcard):
              </strong>{" "}
              Matches exactly one level.
            </p>
            <ul>
              <li>
                <code>B1/+/R1</code> matches <code>B1/F1/R1</code> and{" "}
                <code>B1/F2/R1</code>
              </li>
              <li>
                <code>+/F1/R1</code> matches <code>B1/F1/R1</code> and{" "}
                <code>B2/F1/R1</code>
              </li>
            </ul>
            <p>
              <strong>
                <code>#</code> (Multi-level wildcard):
              </strong>{" "}
              Matches zero or more levels. Must be the last character.
            </p>
            <ul>
              <li>
                <code>B1/#</code> matches <code>B1/F1/R1</code>,{" "}
                <code>B1/F2/R2</code>, and any topic starting with{" "}
                <code>B1/</code>
              </li>
              <li>
                <code>#</code> alone matches <strong>every topic</strong>
              </li>
            </ul>
          </div>
        ),
      },
    ],
  },

  qos: {
    title: "QoS Levels",
    subtitle: "Delivery guarantees",
    accentColor: "#22d3ee",
    sections: [
      {
        title: "QoS 0 — At Most Once",
        accent: "#22c55e",
        content: (
          <p>
            Fire and forget. The message is sent once with no acknowledgement.
            It may be lost if the network is unreliable. Fastest and lowest
            overhead.
          </p>
        ),
      },
      {
        title: "QoS 1 — At Least Once",
        accent: "#f59e0b",
        content: (
          <p>
            The message is sent and the receiver acknowledges with{" "}
            <strong>PUBACK</strong>. If no ack is received, the sender
            retransmits. This guarantees delivery but may result in{" "}
            <strong>duplicates</strong>.
          </p>
        ),
      },
      {
        title: "QoS 2 — Exactly Once",
        accent: "#ef4444",
        content: (
          <p>
            A four-step handshake:{" "}
            <strong>PUBLISH → PUBREC → PUBREL → PUBCOMP</strong>. Guarantees the
            message is delivered exactly once. Highest overhead but safest for
            critical data.
          </p>
        ),
      },
    ],
  },

  pubsub: {
    title: "Pub/Sub Pattern",
    subtitle: "Decoupled communication",
    accentColor: "#86efac",
    sections: [
      {
        title: "How Pub/Sub Works",
        accent: "#86efac",
        content: (
          <div>
            <p>
              In the <strong>publish/subscribe</strong> pattern, senders
              (publishers) don't send messages directly to receivers
              (subscribers). Instead, a <strong>broker</strong> acts as an
              intermediary:
            </p>
            <ol>
              <li>
                Subscribers tell the broker which <strong>topics</strong>{" "}
                they're interested in
              </li>
              <li>Publishers send messages to a topic via the broker</li>
              <li>
                The broker routes each message to all subscribers whose filter
                matches the topic
              </li>
            </ol>
            <p>
              This <strong>decouples</strong> publishers from subscribers — they
              don't need to know about each other. New subscribers can be added
              without changing the publisher.
            </p>
          </div>
        ),
      },
      {
        title: "MQTT vs Other Pub/Sub",
        accent: "#86efac",
        content: (
          <ul>
            <li>
              <strong>vs Kafka:</strong> MQTT is lighter, designed for IoT
              devices with limited resources. Kafka is for high-throughput log
              streaming.
            </li>
            <li>
              <strong>vs Redis Pub/Sub:</strong> MQTT has QoS levels and
              persistent sessions. Redis pub/sub is in-memory and
              fire-and-forget.
            </li>
            <li>
              <strong>vs WebSockets:</strong> MQTT is a full protocol with
              topics, QoS, and sessions. WebSockets provide raw bidirectional
              communication.
            </li>
          </ul>
        ),
      },
    ],
  },
};
