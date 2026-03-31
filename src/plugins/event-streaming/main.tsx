import React, { useMemo, useRef, useLayoutEffect, useEffect } from "react";
import "./main.scss";
import { useEventStreamingAnimation } from "./useEventStreamingAnimation";
import { useDispatch } from "react-redux";
import { setAdapterType, toggleStreaming } from "./eventStreamingSlice";
import { viz } from "vizcraft";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 680;

const EventStreamingVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const dispatch = useDispatch();
  const { streaming, currentStep, animPhase, signals } =
    useEventStreamingAnimation(onAnimationComplete);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);

  const {
    partitions,
    consumerGroups,
    publishedEvents,
    lastPublishedEvent,
    adapterType,
    streamingEnabled,
  } = streaming;

  const workers = consumerGroups[0];
  const broadcast = consumerGroups[1];

  const isProducing = animPhase === "producing";
  const isPartitioning = animPhase === "partitioning";
  const isConsumingWorkers = animPhase === "consuming-workers";
  const isConsumingBroadcast = animPhase === "consuming-broadcast";

  // ── Build vizcraft scene ───────────────────────────────
  const scene = useMemo(() => {
    const b = viz().view(W, H);

    // ═══ ROW 1 — Producer chain (top, horizontal) ════════

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
      .label("Dispatcher", { fill: "#fff", fontSize: 13, fontWeight: "bold" })
      .tooltip({
        title: "Event Dispatcher",
        sections: [
          {
            label: "Role",
            value: "Routes events to streaming pipeline or direct storage",
          },
          {
            label: "Flag",
            value: `Streaming ${streamingEnabled ? "enabled" : "disabled"}`,
          },
        ],
      });

    b.node("adapter")
      .at(520, 60)
      .rect(130, 50, 10)
      .fill(adapterType === "production" ? "#f59e0b" : "#64748b")
      .stroke(adapterType === "production" ? "#d97706" : "#475569", 2)
      .label(
        adapterType === "production" ? "Prod Adapter" : "Default Adapter",
        { fill: "#fff", fontSize: 12, fontWeight: "bold" },
      )
      .tooltip({
        title: "Streaming Adapter",
        sections: [
          {
            label: "Type",
            value:
              adapterType === "production"
                ? "Production (librdkafka)"
                : "Default (KafkaJS)",
          },
          {
            label: "Purpose",
            value: "Pluggable transport layer for producing messages",
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

    // Dispatcher → Adapter (only when streaming)
    if (streamingEnabled) {
      const e2 = b
        .edge("dispatcher", "adapter", "e-disp-adapter")
        .arrow(true)
        .stroke("#94a3b8", 1.5);
      if (isProducing) e2.animate("flow", { duration: "1s" });
    }

    // ═══ ROW 2 — Event Broker ════════════════════════════

    b.node("broker")
      .at(450, 200)
      .rect(220, 60, 12)
      .fill("#0ea5e9")
      .stroke("#0284c7", 2)
      .label("Event Broker", {
        fill: "#fff",
        fontSize: 15,
        fontWeight: "bold",
        dy: -8,
      })
      .badge("Topic", {
        position: "top-left",
        fill: "#fff",
        background: "#0369a1",
        fontSize: 9,
      });

    b.node("broker").label(`3 partitions · gzip · 12h retention`, {
      fill: "#bae6fd",
      fontSize: 9,
      dy: 10,
    });

    // Adapter → Broker
    if (streamingEnabled) {
      const e3 = b
        .edge("adapter", "broker", "e-adapter-broker")
        .arrow(true)
        .stroke("#38bdf8", 2)
        .label("produce", { fill: "#38bdf8", fontSize: 9 });
      if (isProducing) e3.animate("flow", { duration: "1.2s" });
    }

    // Direct fallback path
    if (!streamingEnabled) {
      b.node("direct-store")
        .at(700, 60)
        .rect(120, 50, 10)
        .fill("#dc2626")
        .stroke("#b91c1c", 2)
        .label("Direct Write", {
          fill: "#fff",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.edge("dispatcher", "direct-store", "e-direct")
        .arrow(true)
        .stroke("#ef4444", 2)
        .dashed()
        .label("fallback", { fill: "#fca5a5", fontSize: 9 });
    }

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
        .tooltip({
          title: `Partition ${i}`,
          sections: [
            { label: "Events", value: String(count) },
            { label: "Role", value: "Ordered, append-only event log segment" },
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

    // ── Left: Store Workers (load-balanced) ──
    b.node("workers-label")
      .at(230, 410)
      .rect(240, 26, 6)
      .fill("#1e1b4b")
      .stroke("#312e81", 1)
      .label("Store Workers — load-balanced (shared consumer group)", {
        fill: "#a5b4fc",
        fontSize: 9,
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

      // Broker → Worker edge (via partition)
      const ew = b
        .edge(
          `p-${inst.assignedPartitions[0]}`,
          inst.id,
          `e-p${inst.assignedPartitions[0]}-${inst.id}`,
        )
        .arrow(true)
        .stroke("#6366f1", 1.5);
      if (isConsumingWorkers) ew.animate("flow", { duration: "1.2s" });
    });

    // ── Right: Broadcast (fan-out) ──
    b.node("broadcast-label")
      .at(670, 410)
      .rect(240, 26, 6)
      .fill("#14532d")
      .stroke("#166534", 1)
      .label("Broadcast — fan-out (unique consumer group per instance)", {
        fill: "#86efac",
        fontSize: 9,
      });

    broadcast.instances.forEach((inst, i) => {
      const bx = 620 + i * 100;
      const by = 470;

      b.node(inst.id)
        .at(bx, by)
        .rect(80, 50, 8)
        .fill(isConsumingBroadcast ? "#16a34a" : "#14532d")
        .stroke("#22c55e", 2)
        .label(`Instance ${i}`, {
          fill: "#fff",
          fontSize: 11,
          fontWeight: "bold",
          dy: -7,
        })
        .tooltip({
          title: `Broadcast Instance ${i}`,
          sections: [
            { label: "Received", value: String(inst.processedCount) },
            {
              label: "Pattern",
              value: "Every instance gets every event (fan-out)",
            },
          ],
        });

      b.node(inst.id).label(`${inst.processedCount} recv`, {
        fill: "#bbf7d0",
        fontSize: 8,
        dy: 9,
      });

      // Broker → Broadcast edge
      const eb = b
        .edge("broker", inst.id, `e-broker-${inst.id}`)
        .arrow(true)
        .stroke("#22c55e", 1.5);
      if (isConsumingBroadcast) eb.animate("flow", { duration: "1.2s" });
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
      .tooltip({
        title: "Persistent Storage",
        sections: [
          { label: "Role", value: "Durable event log with idempotency checks" },
        ],
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

    b.node("ws-gateway")
      .at(670, 580)
      .rect(120, 46, 10)
      .fill("#0f766e")
      .stroke("#115e59", 2)
      .label("Realtime Push", {
        fill: "#fff",
        fontSize: 11,
        fontWeight: "bold",
        dy: -2,
      })
      .badge("WS", {
        position: "top-right",
        fill: "#fff",
        background: "#0d9488",
        fontSize: 9,
      })
      .tooltip({
        title: "WebSocket Gateway",
        sections: [
          {
            label: "Role",
            value: "Pushes events to connected clients in real time",
          },
        ],
      });

    b.node("ws-gateway").label("→ clients", {
      fill: "#5eead4",
      fontSize: 8,
      dy: 12,
    });

    b.edge("broadcast-0", "ws-gateway", "e-b-ws")
      .arrow(true)
      .stroke("#5eead4", 1)
      .dashed()
      .label("push", { fill: "#5eead4", fontSize: 8 });

    // ═══ SIGNAL OVERLAYS (moving balls) ══════════════════
    if (signals.length > 0) {
      // Partition node positions for circle overlay placement
      const partitionPositions: Record<string, { x: number; y: number }> = {};
      partitions.forEach((_, i) => {
        partitionPositions[`p-${i}`] = { x: 370 + i * 80, y: 310 };
      });

      const movingSignals = signals.filter((s) => !s.resting);
      const restingSignals = signals.filter((s) => s.resting);

      b.overlay((o) => {
        // Moving signals as normal signal overlays
        movingSignals.forEach((sig) => {
          o.add(
            "signal",
            {
              from: sig.from,
              to: sig.to,
              progress: sig.progress,
              magnitude: 1,
            },
            { key: sig.id },
          );
        });

        // Resting signals as circle overlays inside partition boxes
        restingSignals.forEach((sig) => {
          const pos = partitionPositions[sig.resting!.nodeId];
          if (pos) {
            o.add(
              "circle",
              {
                x: pos.x + sig.resting!.offsetX,
                y: pos.y + sig.resting!.offsetY,
                r: 5,
                fill: "#fbbf24",
                stroke: "#f59e0b",
                strokeWidth: 1,
              },
              { key: sig.id },
            );
          }
        });
      });
    }

    return b;
  }, [
    partitions,
    consumerGroups,
    publishedEvents,
    lastPublishedEvent,
    adapterType,
    streamingEnabled,
    currentStep,
    animPhase,
    signals,
  ]);

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
        <div className="es-control-group">
          <label>
            <input
              type="checkbox"
              checked={streamingEnabled}
              onChange={() => dispatch(toggleStreaming())}
              disabled={currentStep > 0}
            />
            Streaming Enabled
          </label>
        </div>
      </div>

      <div className="es-canvas" ref={containerRef} />

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
          <span className="es-stat-label">Broadcast received</span>
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
    </div>
  );
};

export default EventStreamingVisualization;
