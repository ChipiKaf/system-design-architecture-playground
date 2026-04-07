import React, { useLayoutEffect, useRef, useEffect } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  useConceptModal,
  ConceptPills,
  PluginLayout,
  StageHeader,
  StatBadge,
  SidePanel,
  SideCard,
  CanvasStage,
} from "../../components/plugin-kit";
import { concepts, type ConceptKey } from "./concepts";
import { useMqttAnimation, type Signal } from "./useMqttAnimation";
import { topicMatches } from "./mqttSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1000;
const H = 620;

const MqttVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useMqttAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const {
    explanation,
    hotZones,
    phase,
    publishTopic,
    subscribers,
    matchedSubscriberIds,
    qos,
    retained,
    messagesSent,
    messagesDelivered,
  } = runtime;

  const hot = (zone: string) => hotZones.includes(zone);
  const isMatched = (subId: string) => matchedSubscriberIds.includes(subId);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    const pubX = 80;
    const pubY = H / 2 - 20;
    const brokerX = W / 2 - 60;
    const brokerY = H / 2 - 40;

    // ── Publisher node ───────────────────────────────────
    b.node("publisher")
      .at(pubX, pubY)
      .rect(120, 56, 12)
      .fill(hot("publisher") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("publisher") ? "#60a5fa" : "#334155", 2);

    b.node("publisher").richLabel(
      (l) => {
        l.bold("Publisher");
        l.newline();
        l.color(publishTopic, "#93c5fd", { fontSize: 9 });
      },
      { fill: "#fff", fontSize: 12, dy: 2, lineHeight: 1.6 },
    );

    // ── Broker node ─────────────────────────────────────
    b.node("broker")
      .at(brokerX, brokerY)
      .rect(140, 80, 14)
      .fill(hot("broker") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("broker") ? "#818cf8" : "#475569", 2);

    b.node("broker").richLabel(
      (l) => {
        l.bold("MQTT Broker");
        l.newline();
        l.color("Topic Routing", "#a5b4fc", { fontSize: 9 });
      },
      { fill: "#fff", fontSize: 13, dy: 4, lineHeight: 1.6 },
    );

    // ── Subscriber nodes (stacked vertically) ───────────
    const subStartY = 80;
    const subSpacing = Math.min(
      100,
      (H - 160) / Math.max(subscribers.length, 1),
    );
    const subX = W - 200;

    subscribers.forEach((sub, i) => {
      const sy = subStartY + i * subSpacing;
      const matched = isMatched(sub.id);
      const isActive = hot(sub.id);

      const fill = isActive
        ? "#0f2e1f"
        : matched &&
            (phase === "deliver" ||
              phase === "matching" ||
              phase === "qos-ack" ||
              phase === "summary")
          ? "#0f2e1f"
          : "#0f172a";
      const stroke = isActive
        ? sub.color
        : matched &&
            (phase === "deliver" ||
              phase === "matching" ||
              phase === "qos-ack" ||
              phase === "summary")
          ? sub.color
          : "#334155";

      b.node(sub.id)
        .at(subX, sy)
        .rect(160, 48, 10)
        .fill(fill)
        .stroke(stroke, matched ? 2 : 1.5);

      b.node(sub.id).richLabel(
        (l) => {
          l.bold(sub.label);
          l.newline();
          l.color(sub.pattern, sub.color, { fontSize: 9 });
        },
        { fill: "#e2e8f0", fontSize: 11, dy: 2, lineHeight: 1.5 },
      );
    });

    // ── Edges ────────────────────────────────────────────
    b.edge("publisher", "broker", "pub-broker")
      .stroke(hot("publisher") ? "#60a5fa" : "#334155", 1.5)
      .arrow(true);

    subscribers.forEach((sub) => {
      const matched = isMatched(sub.id);
      const color =
        matched && phase !== "overview" && phase !== "connect"
          ? sub.color
          : "#334155";
      b.edge("broker", sub.id, `broker-${sub.id}`)
        .stroke(color, matched ? 1.5 : 1)
        .arrow(true);
    });

    // ── Topic tree overlay ──────────────────────────────
    const treeX = 60;
    const treeY = 25;
    b.overlay((o) => {
      // background box for topic tree
      o.add(
        "rect",
        {
          x: treeX - 10,
          y: treeY - 8,
          w: 220,
          h: 125,
          rx: 10,
          ry: 10,
          fill: "rgba(15,23,42,0.7)",
          stroke: "rgba(148,163,184,0.15)",
          strokeWidth: 1,
        },
        { key: "tree-bg" },
      );

      o.add(
        "text",
        {
          x: treeX,
          y: treeY + 8,
          text: "Topic Hierarchy",
          fill: "#94a3b8",
          fontSize: 10,
          fontWeight: "600",
        },
        { key: "tree-title" },
      );

      // Draw mini topic tree
      const buildings = ["B1", "B2"];
      const floors = ["F1", "F2"];
      const rooms = ["R1", "R2"];
      let row = 0;
      buildings.forEach((bld) => {
        floors.forEach((fl) => {
          rooms.forEach((rm) => {
            const fullTopic = `${bld}/${fl}/${rm}`;
            const isPublish = fullTopic === publishTopic;
            const matchCount = subscribers.filter((s) =>
              topicMatches(s.pattern, fullTopic),
            ).length;

            const topicColor = isPublish
              ? "#fbbf24"
              : matchCount > 0 && phase !== "overview"
                ? "#60a5fa"
                : "#475569";

            o.add(
              "text",
              {
                x: treeX + 4,
                y: treeY + 28 + row * 12,
                text: `${isPublish ? "▸ " : "  "}${fullTopic}`,
                fill: topicColor,
                fontSize: 9,
                fontWeight: isPublish ? "700" : "400",
              },
              { key: `tree-${fullTopic}` },
            );
            row++;
          });
        });
      });
    });

    // ── Match indicator overlays ────────────────────────
    if (
      phase === "matching" ||
      phase === "deliver" ||
      phase === "qos-ack" ||
      phase === "summary"
    ) {
      b.overlay((o) => {
        subscribers.forEach((sub, i) => {
          const sy = subStartY + i * subSpacing;
          const matched = isMatched(sub.id);
          o.add(
            "circle",
            {
              x: subX - 12,
              y: sy + 24,
              r: 5,
              fill: matched ? "#22c55e" : "#ef4444",
            },
            { key: `match-${sub.id}` },
          );
        });
      });
    }

    // ── QoS badge overlay on broker ─────────────────────
    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: brokerX + 95,
          y: brokerY - 2,
          w: 40,
          h: 20,
          rx: 6,
          ry: 6,
          fill: qos === 0 ? "#1e293b" : qos === 1 ? "#164e63" : "#4c1d95",
          stroke: qos === 0 ? "#475569" : qos === 1 ? "#22d3ee" : "#a78bfa",
          strokeWidth: 1,
        },
        { key: "qos-badge-bg" },
      );
      o.add(
        "text",
        {
          x: brokerX + 115,
          y: brokerY + 12,
          text: `QoS ${qos}`,
          fill: qos === 0 ? "#94a3b8" : qos === 1 ? "#22d3ee" : "#a78bfa",
          fontSize: 9,
          fontWeight: "600",
        },
        { key: "qos-badge-text" },
      );

      // Retained flag
      if (retained) {
        o.add(
          "rect",
          {
            x: brokerX + 95,
            y: brokerY + 58,
            w: 56,
            h: 18,
            rx: 5,
            ry: 5,
            fill: "#422006",
            stroke: "#f59e0b",
            strokeWidth: 1,
          },
          { key: "retain-badge-bg" },
        );
        o.add(
          "text",
          {
            x: brokerX + 123,
            y: brokerY + 70,
            text: "RETAINED",
            fill: "#fbbf24",
            fontSize: 8,
            fontWeight: "600",
          },
          { key: "retain-badge-text" },
        );
      }
    });

    // ── Signals ──────────────────────────────────────────
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig: Signal) => {
          const { id, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, { key: id });
        });
      });
    }

    return b;
  })();

  /* ── Mount VizCraft scene ───────────────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    // Snapshot the *live* viewport right before destroying so we
    // restore the exact position the user was looking at — no jump.
    const saved = pzRef.current?.getState() ?? viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
    const unsub = pzRef.current?.onChange((s) => {
      viewportRef.current = s;
    });
    return () => {
      unsub?.();
    };
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  /* ── Pill definitions ───────────────────────────────── */
  const pills = [
    {
      key: "mqtt",
      label: "MQTT Protocol",
      color: "#a78bfa",
      borderColor: "#7c3aed",
    },
    {
      key: "topics",
      label: "Topics & Wildcards",
      color: "#fbbf24",
      borderColor: "#f59e0b",
    },
    {
      key: "qos",
      label: "QoS Levels",
      color: "#22d3ee",
      borderColor: "#06b6d4",
    },
    {
      key: "pubsub",
      label: "Pub/Sub Pattern",
      color: "#86efac",
      borderColor: "#22c55e",
    },
  ];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`mqtt-root mqtt-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="mqtt-stage">
            <StageHeader
              title="MQTT"
              subtitle="Publish/Subscribe message routing"
            >
              <StatBadge label="Topic" value={publishTopic} color="#fbbf24" />
              <StatBadge
                label="Matched"
                value={`${matchedSubscriberIds.length}/${subscribers.length}`}
                color={matchedSubscriberIds.length > 0 ? "#22c55e" : "#ef4444"}
              />
              <StatBadge label="QoS" value={qos} color="#a78bfa" />
              <StatBadge label="Sent" value={messagesSent} color="#60a5fa" />
              <StatBadge
                label="Delivered"
                value={messagesDelivered}
                color="#86efac"
              />
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
            {phase !== "overview" && (
              <SideCard label="Subscription Table" variant="info">
                <div className="mqtt-sub-table">
                  {subscribers.map((sub) => {
                    const matched = isMatched(sub.id);
                    return (
                      <div key={sub.id} className="mqtt-sub-row">
                        <span
                          className="mqtt-sub-dot"
                          style={{ background: sub.color }}
                        />
                        <span className="mqtt-sub-name">{sub.label}</span>
                        <code className="mqtt-sub-pattern">{sub.pattern}</code>
                        {(phase === "matching" ||
                          phase === "deliver" ||
                          phase === "qos-ack" ||
                          phase === "summary") && (
                          <span
                            className={`mqtt-sub-match ${matched ? "mqtt-sub-match--yes" : "mqtt-sub-match--no"}`}
                          >
                            {matched ? "✓" : "✗"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SideCard>
            )}
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default MqttVisualization;
