import React, { useEffect, useLayoutEffect, useRef } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  CanvasStage,
  ConceptPills,
  PluginLayout,
  SideCard,
  SidePanel,
  StageHeader,
  StatBadge,
  useConceptModal,
} from "../../components/plugin-kit";
import { concepts, type ConceptKey } from "./concepts";
import { QUERY_CATALOG } from "./shardingSlice";
import { useShardingAnimation, type Signal } from "./useShardingAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 980;
const H = 680;

const shardColor = (loadPct: number) => {
  if (loadPct >= 32) return { fill: "#7f1d1d", stroke: "#ef4444" };
  if (loadPct >= 23) return { fill: "#78350f", stroke: "#f59e0b" };
  return { fill: "#0f3b2e", stroke: "#10b981" };
};

const ShardingVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useShardingAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const {
    shards,
    strategy,
    shardKey,
    selectedQuery,
    queryMetrics,
    throughputRps,
    balanceScore,
    hotspotLevel,
    complexityScore,
    dataMovedMb,
    denormalized,
    colocateOrdersWithUsers,
    routingTrace,
    queryTargetShards,
    explanation,
    hotZones,
    phase,
    clients,
  } = runtime;

  const hot = (zone: string) => hotZones.includes(zone);

  const scene = (() => {
    const b = viz().view(W, H);

    clients.forEach((client, idx) => {
      const y = 120 + idx * 90;
      b.node(client.id)
        .at(94, y)
        .circle(22)
        .fill(hot(client.id) ? "#1d4ed8" : "#1e293b")
        .stroke(hot(client.id) ? "#60a5fa" : "#475569", 2)
        .label(client.type === "mobile" ? "M" : "D", {
          fill: "#e2e8f0",
          fontSize: 11,
          fontWeight: "700",
        });
    });

    b.node("router")
      .at(310, 240)
      .rect(190, 82, 14)
      .fill(hot("router") ? "#0f766e" : "#0f172a")
      .stroke(hot("router") ? "#2dd4bf" : "#334155", 2)
      .label("Request Router", {
        fill: "#e2e8f0",
        fontSize: 14,
        fontWeight: "700",
        dy: -8,
      })
      .label(`${strategy.toUpperCase()} / ${shardKey}`, {
        fill: "#99f6e4",
        fontSize: 11,
        dy: 14,
      })
      .onClick(() => openConcept("routing"));

    b.node("aggregator")
      .at(515, 92)
      .rect(148, 58, 12)
      .fill(hot("aggregator") ? "#581c87" : "#111827")
      .stroke(hot("aggregator") ? "#c084fc" : "#4b5563", 2)
      .label("Merge Node", { fill: "#e9d5ff", fontSize: 12, fontWeight: "700" })
      .onClick(() => openConcept("cross-shard"));

    const shardY = 310;
    const backupY = 480;
    const left = 520;
    const right = 920;
    const step = shards.length <= 1 ? 0 : (right - left) / (shards.length - 1);

    shards.forEach((s, i) => {
      const x = shards.length <= 1 ? 720 : left + i * step;
      const colors = shardColor(s.loadPct);
      const isTarget = queryTargetShards.includes(s.id);
      const frameStroke = isTarget ? "#38bdf8" : colors.stroke;

      b.node(s.id)
        .at(x, shardY)
        .rect(130, 96, 12)
        .fill(hot(s.id) ? "#082f49" : colors.fill)
        .stroke(hot(s.id) ? "#38bdf8" : frameStroke, 2)
        .richLabel(
          (l) => {
            l.color(`Shard ${i + 1}`, "#e2e8f0", {
              fontSize: 12,
              bold: true,
            });
            l.color("  DB Node", "#64748b", { fontSize: 9 });
            l.newline();
            l.color(`${s.records.toLocaleString()} rows`, "#94a3b8", {
              fontSize: 9,
            });
            l.newline();
            l.color(`${s.writesQps} qps · ${s.loadPct}% load`, "#94a3b8", {
              fontSize: 9,
            });
          },
          { fill: "#fff", fontSize: 11, dy: 2, lineHeight: 1.7 },
        )
        .onClick(() => openConcept("shard-key"));

      b.node(`backup-${s.id}`)
        .at(x, backupY)
        .rect(110, 54, 10)
        .fill("#10203e")
        .stroke("#475569", 1.5)
        .richLabel(
          (l) => {
            l.color("Replica DB", "#93c5fd", { fontSize: 10, bold: true });
            l.newline();
            l.color(`Shard ${i + 1} copy`, "#64748b", { fontSize: 8 });
          },
          { fill: "#93c5fd", fontSize: 10, dy: 2, lineHeight: 1.6 },
        )
        .onClick(() => openConcept("replication-vs-sharding"));

      b.edge(s.id, `backup-${s.id}`, `rep-${s.id}`)
        .stroke("#334155", 1.5)
        .arrow(true)
        .dashed();

      b.edge("router", s.id, `route-${s.id}`)
        .stroke(isTarget ? "#38bdf8" : "#475569", isTarget ? 2.2 : 1.5)
        .arrow(true);

      if (queryMetrics.shardsTouched > 1) {
        b.edge(s.id, "aggregator", `agg-${s.id}`)
          .stroke(queryTargetShards.includes(s.id) ? "#a855f7" : "#3f3f46", 1.5)
          .arrow(true)
          .dashed();
      }
    });

    clients.forEach((c) => {
      b.edge(c.id, "router", `c-${c.id}`).stroke("#64748b", 1.5).arrow(true);
    });

    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig) => {
          const { id, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, { key: id });
        });
      });
    }

    b.overlay((o) => {
      o.add(
        "text",
        {
          x: 24,
          y: 34,
          text: `Route: ${routingTrace.keyLabel}=${routingTrace.keyValue} -> hash=${routingTrace.hashValue} -> mod ${shards.length} = ${routingTrace.moduloResult}`,
          fill: "#bae6fd",
          fontSize: 12,
          fontWeight: "600",
        },
        { key: "routing-trace" },
      );
    });

    return b;
  })();

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = viewportRef.current;
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

  const pills = [
    {
      key: "sharding",
      label: "Sharding",
      color: "#7dd3fc",
      borderColor: "#0ea5e9",
    },
    {
      key: "routing",
      label: "Routing",
      color: "#bfdbfe",
      borderColor: "#3b82f6",
    },
    {
      key: "shard-key",
      label: "Shard Key",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "hotspots",
      label: "Hotspots",
      color: "#fecaca",
      borderColor: "#ef4444",
    },
    {
      key: "fanout",
      label: "Fan-out",
      color: "#ddd6fe",
      borderColor: "#8b5cf6",
    },
    {
      key: "cross-shard",
      label: "Cross-Shard",
      color: "#e9d5ff",
      borderColor: "#a855f7",
    },
    {
      key: "rebalance",
      label: "Rebalance",
      color: "#bbf7d0",
      borderColor: "#22c55e",
    },
    {
      key: "replication-vs-sharding",
      label: "Replication vs Sharding",
      color: "#fef08a",
      borderColor: "#eab308",
    },
    {
      key: "denormalization",
      label: "Denormalization",
      color: "#99f6e4",
      borderColor: "#14b8a6",
    },
  ];

  return (
    <div className="sharding-root">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className={`sharding-stage sharding-stage--${phase}`}>
            <StageHeader
              title="Sharding Lab"
              subtitle="Route requests to shards, measure fan-out cost, and compare key/strategy tradeoffs"
            >
              <StatBadge
                label="Query"
                value={QUERY_CATALOG[selectedQuery].type}
                color="#bae6fd"
              />
              <StatBadge
                label="Touched"
                value={queryMetrics.shardsTouched}
                color="#c4b5fd"
              />
              <StatBadge
                label="Latency"
                value={`~${queryMetrics.latencyMs}ms`}
                color="#fca5a5"
              />
              <StatBadge
                label="Balance"
                value={`${balanceScore}/100`}
                color="#86efac"
              />
              <StatBadge
                label="Hotspot"
                value={`${hotspotLevel}%`}
                color="#fdba74"
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

            <SideCard label="Term Guide" variant="info">
              <p>
                <strong>Shards touched:</strong> how many shard databases this
                query had to ask.
              </p>
              <p>
                <strong>Latency:</strong> estimated time before the result comes
                back.
              </p>
              <p>
                <strong>Balance:</strong> how evenly traffic/data is spread
                across shards (higher is better).
              </p>
              <p>
                <strong>Complexity:</strong> how difficult this setup is to
                operate and debug.
              </p>
              <p>
                <strong>Fan-out:</strong> one query splitting into requests to
                multiple shards.
              </p>
            </SideCard>

            <SideCard label="Current Setup" variant="info">
              <p>
                <strong>Strategy:</strong> {strategy.toUpperCase()}
              </p>
              <p>
                <strong>Shard key:</strong> {shardKey}
              </p>
              <p>
                <strong>Query:</strong> {QUERY_CATALOG[selectedQuery].label}
              </p>
              <p>
                <strong>Model:</strong>{" "}
                {denormalized ? "Denormalized reads" : "Normalized"} /{" "}
                {colocateOrdersWithUsers
                  ? "Co-located users+orders"
                  : "Split entities"}
              </p>
            </SideCard>

            <SideCard label="Routing Formula" variant="info">
              <div className="sharding-route">
                <p>
                  {routingTrace.keyLabel} ={" "}
                  <strong>{routingTrace.keyValue}</strong>
                </p>
                <p>
                  hash(...) = <strong>{routingTrace.hashValue}</strong>
                </p>
                <p>
                  mod {shards.length} ={" "}
                  <strong>{routingTrace.moduloResult}</strong>
                </p>
                <p>
                  target = <strong>{queryTargetShards.join(", ")}</strong>
                </p>
              </div>
            </SideCard>

            <SideCard label="Shard Metrics" variant="info">
              <div className="sharding-list">
                {shards.map((s, i) => (
                  <div key={s.id} className="sharding-list__row">
                    <span>
                      Shard {i + 1}{" "}
                      <span style={{ color: "#64748b", fontSize: 10 }}>
                        DB Node
                      </span>
                    </span>
                    <span>{s.records.toLocaleString()} rows</span>
                    <span>{s.writesQps} qps</span>
                  </div>
                ))}
              </div>
            </SideCard>

            <SideCard label="Tradeoffs" variant="info">
              <div className="sharding-kpis">
                <div className="sharding-kpis__row">
                  <span>Throughput</span>
                  <strong>{throughputRps} rps</strong>
                </div>
                <div className="sharding-kpis__row">
                  <span>Fan-out</span>
                  <strong>{queryMetrics.fanOut} shards</strong>
                </div>
                <div className="sharding-kpis__row">
                  <span>Merge cost</span>
                  <strong>{queryMetrics.mergeCost}</strong>
                </div>
                <div className="sharding-kpis__row">
                  <span>Rebalance move</span>
                  <strong>~{dataMovedMb} MB</strong>
                </div>
                <div className="sharding-kpis__row">
                  <span>Complexity</span>
                  <strong>{complexityScore}/10</strong>
                </div>
              </div>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default ShardingVisualization;
