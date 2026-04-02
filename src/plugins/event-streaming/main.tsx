import React, { useRef, useLayoutEffect, useEffect } from "react";
import "./main.scss";
import { useEventStreamingAnimation } from "./useEventStreamingAnimation";
import { useDispatch } from "react-redux";
import { setAdapterType, toggleBroadcastOffline } from "./eventStreamingSlice";
import { viz, type SignalOverlayParams } from "vizcraft";
import { useConceptModal, ConceptPills } from "../../components/plugin-kit";
import VizInfoBeacon from "../../components/VizInfoBeacon/VizInfoBeacon";
import { concepts, type ConceptKey } from "./concepts";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 760;

const centeredRect = (
  centerX: number,
  centerY: number,
  width: number,
  height: number,
) => ({
  x: centerX - width / 2,
  y: centerY - height / 2,
  width,
  height,
});

const kafkaNodeBounds = centeredRect(450, 200, 220, 60);
const kafkaHoverRegion = {
  x: kafkaNodeBounds.x - 10,
  y: kafkaNodeBounds.y - 10,
  width: kafkaNodeBounds.width + 20,
  height: kafkaNodeBounds.height + 20,
};
const kafkaIndicatorPos = {
  x: kafkaNodeBounds.x + kafkaNodeBounds.width + 18,
  y: kafkaNodeBounds.y + kafkaNodeBounds.height / 2,
};

const workersLabelBounds = centeredRect(230, 410, 240, 26);
const workersHoverRegion = {
  x: workersLabelBounds.x - 10,
  y: workersLabelBounds.y - 10,
  width: workersLabelBounds.width + 20,
  height: workersLabelBounds.height + 20,
};
const workersIndicatorPos = {
  x: workersLabelBounds.x + workersLabelBounds.width + 18,
  y: workersLabelBounds.y + workersLabelBounds.height / 2,
};

const broadcastLabelBounds = centeredRect(670, 410, 240, 26);
const broadcastHoverRegion = {
  x: broadcastLabelBounds.x - 10,
  y: broadcastLabelBounds.y - 10,
  width: broadcastLabelBounds.width + 20,
  height: broadcastLabelBounds.height + 20,
};
const broadcastIndicatorPos = {
  x: broadcastLabelBounds.x + broadcastLabelBounds.width + 18,
  y: broadcastLabelBounds.y + broadcastLabelBounds.height / 2,
};

const EventStreamingVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const dispatch = useDispatch();
  const { streaming, currentStep, animPhase, signals } =
    useEventStreamingAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);

  const {
    partitions,
    consumerGroups,
    publishedEvents,
    lastPublishedEvent,
    adapterType,
    offlineBroadcastIds,
  } = streaming;

  const workers = consumerGroups[0];
  const broadcast = consumerGroups[1];

  const scene = (() => {
    const isProducing = animPhase === "producing";
    const isPartitioning = animPhase === "partitioning";
    const isConsumingWorkers = animPhase === "consuming-workers";
    const isConsumingBroadcast = animPhase === "consuming-broadcast";

    const b = viz().view(W, H);

    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 40,
          y: 22,
          w: 560,
          h: 88,
          rx: 16,
          ry: 16,
          fill: "rgba(15, 23, 42, 0)",
          stroke: "#60a5fa",
          strokeWidth: 1.5,
          opacity: 0.65,
        },
        { key: "client-boundary", className: "es-client-boundary" },
      );

      o.add(
        "text",
        {
          x: 54,
          y: 18,
          text: "Client / Producer Process",
          fill: "#93c5fd",
          fontSize: 10,
          fontWeight: 700,
        },
        { key: "client-boundary-label", className: "es-client-boundary-label" },
      );
    });

    b.node("producer")
      .at(120, 60)
      .rect(130, 50, 10)
      .fill("#3b82f6")
      .stroke("#1d4ed8", 2)
      .label("Producer App", { fill: "#fff", fontSize: 13, fontWeight: "bold" })
      .tooltip({
        title: "Producer",
        sections: [
          {
            label: "Role",
            value: "Client application that generates domain events",
          },
        ],
      });

    b.node("dispatcher")
      .at(320, 60)
      .rect(130, 50, 10)
      .fill("#6366f1")
      .stroke("#4f46e5", 2)
      .label("Producer Service", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
      })
      .tooltip({
        title: "Producer Service",
        sections: [
          {
            label: "Layer",
            value:
              "Application code inside your producer, not Kafka infrastructure",
          },
          {
            label: "Role",
            value:
              "Chooses when to publish a domain event and hands it to the Kafka client",
          },
        ],
      });

    b.node("adapter")
      .at(520, 60)
      .rect(130, 50, 10)
      .fill(adapterType === "production" ? "#f59e0b" : "#64748b")
      .stroke(adapterType === "production" ? "#d97706" : "#475569", 2)
      .label(
        adapterType === "production" ? "librdkafka Client" : "KafkaJS Client",
        { fill: "#fff", fontSize: 11, fontWeight: "bold" },
      )
      .tooltip({
        title: "Kafka Client Adapter",
        sections: [
          {
            label: "Type",
            value:
              adapterType === "production"
                ? "librdkafka-backed client"
                : "KafkaJS client",
          },
          {
            label: "Role",
            value:
              "In-process library that serializes records and speaks Kafka protocol",
          },
          {
            label: "Layer",
            value:
              "Still part of your application process, not the Kafka cluster",
          },
        ],
      });

    // Producer → Dispatcher
    const e1 = b
      .edge("producer", "dispatcher", "e-prod-disp")
      .arrow(true)
      .stroke("#94a3b8", 1.5)
      .label("event", { fill: "#94a3b8", fontSize: 9 });
    if (isProducing) e1.animate("flow", { duration: "1s" });

    // Dispatcher → Adapter
    const e2 = b
      .edge("dispatcher", "adapter", "e-disp-adapter")
      .arrow(true)
      .stroke("#94a3b8", 1.5);
    if (isProducing) e2.animate("flow", { duration: "1s" });

    // ═══ ROW 2 — Kafka Cluster ════════════════════════════

    b.node("broker")
      .at(450, 200)
      .rect(220, 60, 12)
      .fill("#0ea5e9")
      .stroke("#0284c7", 2)
      .label("Kafka Cluster", {
        fill: "#fff",
        fontSize: 15,
        fontWeight: "bold",
        dy: -8,
      })
      .badge("Kafka", {
        position: "top-left",
        fill: "#fff",
        background: "#0369a1",
        fontSize: 9,
      })
      .tooltip({
        title: "Kafka Cluster",
        sections: [
          {
            label: "Role",
            value:
              "Durable event infrastructure that stores records and serves producers and consumers",
          },
          {
            label: "Topics",
            value:
              "A cluster can host many topics. This diagram is showing one topic split into partitions",
          },
          {
            label: "💡",
            value: "Hover the Kafka badge to reveal the info button",
          },
        ],
      });

    b.node("broker").label(`1 topic shown · 3 partitions · 12h retention`, {
      fill: "#bae6fd",
      fontSize: 9,
      dy: 10,
    });

    // Adapter → Broker
    const e3 = b
      .edge("adapter", "broker", "e-adapter-broker")
      .arrow(true)
      .stroke("#38bdf8", 2)
      .label("produce", { fill: "#38bdf8", fontSize: 9 });
    if (isProducing) e3.animate("flow", { duration: "1.2s" });

    // ═══ ROW 3 — Partitions ══════════════════════════════

    partitions.forEach((p, i) => {
      const px = 370 + i * 80;
      const py = 310;
      const count = p.events.length;
      const isTarget =
        isPartitioning && lastPublishedEvent?.assignedPartition === p.id;

      b.node(`p-${i}`)
        .at(px, py)
        .rect(60, 44, 6)
        .fill(isTarget ? "#fbbf24" : "#0c4a6e")
        .stroke(isTarget ? "#f59e0b" : "#075985", 2)
        .label(`P${i}`, {
          fill: "#fff",
          fontSize: 12,
          fontWeight: "bold",
          dy: -6,
        })
        .onClick(() => openConcept("partitioning"))
        .tooltip({
          title: `Topic Partition ${i}`,
          sections: [
            { label: "Events", value: String(count) },
            {
              label: "Role",
              value: "One ordered log segment of the topic shown above",
            },
            { label: "💡", value: "Click to learn about partitioning" },
          ],
        });

      b.node(`p-${i}`).label(`${count} evt${count !== 1 ? "s" : ""}`, {
        fill: "#7dd3fc",
        fontSize: 9,
        dy: 9,
      });

      b.edge("broker", `p-${i}`, `e-broker-p${i}`)
        .arrow(true)
        .stroke("#0ea5e9", 1)
        .dashed();
    });

    // Pulse animation on target partition
    if (isPartitioning && lastPublishedEvent) {
      b.animate((anim) => {
        anim
          .at(0)
          .node(`p-${lastPublishedEvent.assignedPartition}`)
          .to({ scale: 1.25 }, { duration: 300, easing: "easeOut" })
          .to({ scale: 1.0 }, { duration: 400, easing: "easeIn" });
      });
    }

    // ═══ ROW 4 — Consumer Groups (side by side) ══════════

    // Track which side is currently active for visual hierarchy
    const workersActive = isConsumingWorkers || animPhase === "burst";
    const broadcastActive = isConsumingBroadcast;

    // ── Left: Store Workers (load-balanced) ──
    b.node("workers-label")
      .at(230, 410)
      .rect(240, 26, 6)
      .fill("#1e1b4b")
      .stroke("#312e81", 1)
      .label("Workers — load-balanced", {
        fill: "#a5b4fc",
        fontSize: 10,
      })
      .badge("1:1", {
        position: "top-right",
        fill: "#fff",
        background: "#4f46e5",
        fontSize: 8,
      })
      .onClick(() => openConcept("worker-group"));

    // Inline annotation
    b.node("workers-hint")
      .at(230, 430)
      .rect(0, 0, 0)
      .fill("transparent")
      .label("each partition → exactly 1 worker  (click to learn)", {
        fill: broadcastActive ? "#475569" : "#818cf8",
        fontSize: 8,
      });

    // Subscription annotation
    b.node("workers-sub-hint")
      .at(230, 445)
      .rect(0, 0, 0)
      .fill("transparent")
      .label('subscribes with group.id = "store-workers"', {
        fill: broadcastActive ? "#3b3570" : "#6366f1",
        fontSize: 7,
      });

    workers.instances.forEach((inst, i) => {
      const wx = 150 + i * 90;
      const wy = 470;

      b.node(inst.id)
        .at(wx, wy)
        .rect(72, 50, 8)
        .fill(isConsumingWorkers ? "#4f46e5" : "#312e81")
        .stroke("#6366f1", 2)
        .label(`Worker ${i}`, {
          fill: "#fff",
          fontSize: 11,
          fontWeight: "bold",
          dy: -7,
        })
        .tooltip({
          title: `Store Worker ${i}`,
          sections: [
            {
              label: "Partition",
              value: `P${inst.assignedPartitions.join(", P")}`,
            },
            { label: "Processed", value: String(inst.processedCount) },
            {
              label: "Pattern",
              value: "Each worker owns one partition (load-balanced)",
            },
          ],
        });

      b.node(inst.id).label(
        `P${inst.assignedPartitions[0]} · ${inst.processedCount} done`,
        { fill: "#c7d2fe", fontSize: 8, dy: 9 },
      );

      // Partition → Worker edge
      const edgeStroke =
        broadcastActive && !workersActive
          ? "#3730a3" // dim when broadcast is active
          : "#6366f1";
      const ew = b
        .edge(
          `p-${inst.assignedPartitions[0]}`,
          inst.id,
          `e-p${inst.assignedPartitions[0]}-${inst.id}`,
        )
        .arrow(true)
        .stroke(edgeStroke, 1.5);
      if (isConsumingWorkers) ew.animate("flow", { duration: "1.2s" });
    });

    // ── Right: Broadcast (fan-out) ──
    b.node("broadcast-label")
      .at(670, 410)
      .rect(240, 26, 6)
      .fill("#14532d")
      .stroke("#166534", 1)
      .label("WebSocket Nodes — fan-out", {
        fill: "#86efac",
        fontSize: 10,
      })
      .badge("1:N", {
        position: "top-right",
        fill: "#fff",
        background: "#16a34a",
        fontSize: 8,
      })
      .onClick(() => openConcept("broadcast-group"));

    // Inline annotation
    b.node("broadcast-hint")
      .at(670, 430)
      .rect(0, 0, 0)
      .fill("transparent")
      .label("every event → all nodes → each node's clients", {
        fill: workersActive && !broadcastActive ? "#1a3a2a" : "#4ade80",
        fontSize: 8,
      });

    // Subscription annotation
    b.node("broadcast-sub-hint")
      .at(670, 445)
      .rect(0, 0, 0)
      .fill("transparent")
      .label("each node uses unique group.id → gets ALL partitions", {
        fill: workersActive && !broadcastActive ? "#0f3d1d" : "#22c55e",
        fontSize: 7,
      });

    broadcast.instances.forEach((inst, i) => {
      const bx = 620 + i * 100;
      const by = 470;
      const isOffline = offlineBroadcastIds.includes(inst.id);

      const nodeB = b
        .node(inst.id)
        .at(bx, by)
        .rect(80, 50, 8)
        .fill(
          isOffline ? "#1e293b" : isConsumingBroadcast ? "#16a34a" : "#14532d",
        )
        .stroke(isOffline ? "#374151" : "#22c55e", isOffline ? 1 : 2)
        .label(`WS Node ${i}`, {
          fill: isOffline ? "#64748b" : "#fff",
          fontSize: 11,
          fontWeight: "bold",
          dy: -7,
        })
        .onClick((id) => dispatch(toggleBroadcastOffline(id)))
        .tooltip({
          title: `WebSocket Node ${i}`,
          sections: [
            {
              label: isOffline ? "Status" : "Received",
              value: isOffline
                ? `OFFLINE — ${inst.missedCount} event${inst.missedCount !== 1 ? "s" : ""} missed`
                : String(inst.processedCount),
            },
            {
              label: "Pattern",
              value:
                "Each online node consumes every event from Kafka and pushes it to its own connected WebSocket clients",
            },
            {
              label: "Click",
              value: isOffline
                ? "Click to bring back online"
                : "Click to take offline",
            },
          ],
        });

      if (isOffline) {
        nodeB.badge("OFFLINE", {
          position: "top-left",
          fill: "#fff",
          background: "#dc2626",
          fontSize: 7,
        });
        nodeB.label(
          inst.missedCount > 0 ? `${inst.missedCount} missed` : "0 recv",
          { fill: "#ef4444", fontSize: 8, dy: 9 },
        );
      } else {
        nodeB.label(`${inst.processedCount} recv · 2 clients`, {
          fill: "#bbf7d0",
          fontSize: 8,
          dy: 9,
        });
      }

      // Broker → Broadcast edge (from topic, not partitions)
      const ebStroke = isOffline
        ? "#1e293b" // nearly invisible when offline
        : workersActive && !broadcastActive
          ? "#14532d" // dim when workers are active
          : "#22c55e";
      const eb = b
        .edge("broker", inst.id, `e-broker-${inst.id}`)
        .arrow(true)
        .stroke(ebStroke, isOffline ? 1 : 1.5);
      if (isOffline) eb.dashed();
      if (i === 0 && !isOffline) {
        eb.label("all events", { fill: ebStroke, fontSize: 8 });
      }
      if (isConsumingBroadcast && !isOffline)
        eb.animate("flow", { duration: "1.2s" });

      [0, 1].forEach((clientIndex) => {
        const clientX = bx + (clientIndex === 0 ? -32 : 32);
        const clientY = 650;
        const clientId = `${inst.id}-client-${clientIndex}`;
        const clientStroke = isOffline ? "#243341" : "#0f766e";
        const clientFill = isOffline
          ? "#08141a"
          : isConsumingBroadcast
            ? "#134e4a"
            : "#0a2e2b";

        b.node(clientId)
          .at(clientX, clientY)
          .rect(56, 34, 6)
          .fill(clientFill)
          .stroke(clientStroke, 1)
          .label(`Client ${i + 1}${clientIndex + 1}`, {
            fill: isOffline ? "#5b7282" : "#99f6e4",
            fontSize: 8,
            fontWeight: "bold",
          })
          .tooltip({
            title: `Client ${i + 1}${clientIndex + 1}`,
            sections: [
              {
                label: "Connected To",
                value: `WS Node ${i}`,
              },
              {
                label: "Role",
                value:
                  "Browser or app client receiving realtime updates from this node",
              },
            ],
          });

        const clientEdge = b
          .edge(inst.id, clientId, `e-${inst.id}-client-${clientIndex}`)
          .arrow(true)
          .stroke(isOffline ? "#1f2937" : "#0f766e", 1);
        if (isOffline) clientEdge.dashed();
        if (isConsumingBroadcast && !isOffline)
          clientEdge.animate("flow", { duration: "0.8s" });
      });
    });

    // Pulse on workers/broadcast during consumption
    if (isConsumingWorkers) {
      b.animate((anim) => {
        workers.instances.forEach((inst) => {
          anim
            .at(0)
            .node(inst.id)
            .to({ scale: 1.12 }, { duration: 250, easing: "easeOut" })
            .to({ scale: 1.0 }, { duration: 250, easing: "easeIn" });
        });
      });
    }
    if (isConsumingBroadcast) {
      b.animate((anim) => {
        broadcast.instances.forEach((inst) => {
          anim
            .at(0)
            .node(inst.id)
            .to({ scale: 1.12 }, { duration: 250, easing: "easeOut" })
            .to({ scale: 1.0 }, { duration: 250, easing: "easeIn" });
        });
        broadcast.instances.forEach((inst) => {
          [0, 1].forEach((clientIndex) => {
            anim
              .at(0)
              .node(`${inst.id}-client-${clientIndex}`)
              .to({ scale: 1.08 }, { duration: 180, easing: "easeOut" })
              .to({ scale: 1.0 }, { duration: 180, easing: "easeIn" });
          });
        });
      });
    }

    // ═══ ROW 5 — Sinks ══════════════════════════════════

    b.node("data-store")
      .at(230, 580)
      .cylinder(110, 46)
      .fill("#7c3aed")
      .stroke("#6d28d9", 2)
      .label("Data Store", {
        fill: "#fff",
        fontSize: 11,
        fontWeight: "bold",
        dy: -2,
      })
      .onClick(() => openConcept("idempotency"))
      .tooltip({
        title: "Persistent Storage",
        sections: [
          { label: "Role", value: "Durable event log with idempotency checks" },
          { label: "💡", value: "Click to learn about idempotency" },
        ],
      });

    // Idempotency annotation
    b.node("idempotency-hint")
      .at(230, 620)
      .rect(0, 0, 0)
      .fill("transparent")
      .label("⚡ idempotent writes — click store to learn", {
        fill: "#c4b5fd",
        fontSize: 8,
      });

    b.edge("worker-0", "data-store", "e-w0-store")
      .arrow(true)
      .stroke("#a78bfa", 1)
      .dashed();

    b.edge("worker-1", "data-store", "e-w1-store")
      .arrow(true)
      .stroke("#a78bfa", 1)
      .dashed()
      .label("persist", { fill: "#a78bfa", fontSize: 8 });

    b.edge("worker-2", "data-store", "e-w2-store")
      .arrow(true)
      .stroke("#a78bfa", 1)
      .dashed();

    // ═══ SIGNAL OVERLAYS ══════════════════
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig) => {
          const { id, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, { key: id });
        });
      });
    }

    return b;
  })();

  // ── Mount ──────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    builderRef.current?.destroy();
    builderRef.current = scene;
    scene.mount(containerRef.current, { autoplay: true });
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
    };
  }, []);

  // ── Stats ──────────────────────────────────────────────
  const totalPublished = publishedEvents.length;
  const workerProcessed = workers.instances.reduce(
    (a, i) => a + i.processedCount,
    0,
  );
  const broadcastProcessed = broadcast.instances.reduce(
    (a, i) => a + i.processedCount,
    0,
  );

  const esPills = [
    { key: "kafka", label: "Kafka", color: "#7dd3fc", borderColor: "#0ea5e9" },
    {
      key: "subscription",
      label: "Subscriptions",
      color: "#86efac",
      borderColor: "#22c55e",
    },
    {
      key: "idempotency",
      label: "Idempotency",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    {
      key: "partitioning",
      label: "Partitioning",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
  ];

  return (
    <div className="es-visualization">
      <div className="es-controls">
        <div className="es-control-group">
          <label htmlFor="es-adapter">Adapter:</label>
          <select
            id="es-adapter"
            value={adapterType}
            onChange={(e) =>
              dispatch(
                setAdapterType(e.target.value as "default" | "production"),
              )
            }
            disabled={currentStep > 0}
          >
            <option value="default">Default (KafkaJS)</option>
            <option value="production">Production (librdkafka)</option>
          </select>
        </div>

        <ConceptPills
          pills={esPills}
          onOpen={openConcept}
          className="es-concept-pills"
        />
      </div>

      <div className="es-canvas">
        <div className="es-canvas-stage" ref={containerRef} />
        <VizInfoBeacon
          viewWidth={W}
          viewHeight={H}
          hoverRegion={kafkaHoverRegion}
          indicatorPosition={kafkaIndicatorPos}
          ariaLabel="Open Kafka details"
          accentColor="#38bdf8"
          onActivate={() => openConcept("kafka")}
        />
        <VizInfoBeacon
          viewWidth={W}
          viewHeight={H}
          hoverRegion={workersHoverRegion}
          indicatorPosition={workersIndicatorPos}
          ariaLabel="Why workers get one partition each"
          accentColor="#818cf8"
          onActivate={() => openConcept("worker-group")}
        />
        <VizInfoBeacon
          viewWidth={W}
          viewHeight={H}
          hoverRegion={broadcastHoverRegion}
          indicatorPosition={broadcastIndicatorPos}
          ariaLabel="Why every node gets every event"
          accentColor="#4ade80"
          onActivate={() => openConcept("broadcast-group")}
        />
      </div>

      <div className="es-stats">
        <div className="es-stat">
          <span className="es-stat-label">Published</span>
          <span className="es-stat-value pub">{totalPublished}</span>
        </div>
        <div className="es-stat">
          <span className="es-stat-label">Workers consumed</span>
          <span className="es-stat-value worker">{workerProcessed}</span>
        </div>
        <div className="es-stat">
          <span className="es-stat-label">Fan-out deliveries</span>
          <span className="es-stat-value bcast">{broadcastProcessed}</span>
        </div>
        {lastPublishedEvent && (
          <div className="es-stat">
            <span className="es-stat-label">Last event</span>
            <span className="es-stat-value key">
              key={lastPublishedEvent.key} → P
              {lastPublishedEvent.assignedPartition}
            </span>
          </div>
        )}
      </div>

      <ConceptModal />
    </div>
  );
};

export default EventStreamingVisualization;
