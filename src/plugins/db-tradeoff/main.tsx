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
import {
  DB_PROFILES,
  OPERATION_CATALOG,
  WORKLOAD_PROFILES,
  isTargetedOp,
} from "./dbTradeoffSlice";
import { useDbTradeoffAnimation, type Signal } from "./useDbTradeoffAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 960;
const H = 660;

/* ── Colour helpers ──────────────────────────────────── */

const DB_COLORS: Record<string, { fill: string; stroke: string }> = {
  relational: { fill: "#172554", stroke: "#3b82f6" },
  mongodb: { fill: "#052e16", stroke: "#22c55e" },
  cassandra: { fill: "#422006", stroke: "#f59e0b" },
};

const NODE_STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  up: { fill: "#0f3b2e", stroke: "#10b981" },
  down: { fill: "#7f1d1d", stroke: "#ef4444" },
  lagging: { fill: "#78350f", stroke: "#f59e0b" },
};

const fitColor = (score: number) => {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
};

const DbTradeoffVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useDbTradeoffAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const {
    dbType,
    workload,
    selectedOp,
    consistencyLevel,
    nodes,
    result,
    dataModel,
    dataModelDetail,
    whyThisDb,
    explanation,
    hotZones,
    phase,
    targetShardIdx,
  } = runtime;

  const hot = (zone: string) => hotZones.includes(zone);
  const profile = DB_PROFILES[dbType];
  const dbColors = DB_COLORS[dbType];

  /* ── Build VizCraft scene ────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    /* ── Client app ──────────────────────────────────── */
    b.node("client-app")
      .at(130, 280)
      .rect(130, 65, 12)
      .fill(hot("client-app") ? "#1e3a8a" : "#0f172a")
      .stroke(hot("client-app") ? "#60a5fa" : "#334155", 2)
      .label("Client App", {
        fill: "#e2e8f0",
        fontSize: 13,
        fontWeight: "bold",
        dy: -6,
      })
      .label(OPERATION_CATALOG[selectedOp].label, {
        fill: "#94a3b8",
        fontSize: 9,
        dy: 14,
      });

    /* ── Query / App Layer ───────────────────────────── */
    b.node("query-layer")
      .at(370, 280)
      .rect(160, 70, 12)
      .fill(hot("query-layer") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("query-layer") ? "#38bdf8" : "#334155", 2)
      .label("App / Query Layer", {
        fill: "#e2e8f0",
        fontSize: 13,
        fontWeight: "bold",
        dy: -6,
      })
      .label(
        dbType === "cassandra"
          ? "Partition Router"
          : dbType === "mongodb"
            ? "mongos / Driver"
            : "SQL Executor",
        { fill: "#7dd3fc", fontSize: 9, dy: 14 },
      )
      .onClick(() => openConcept("data-modeling"));

    b.edge("client-app", "query-layer", "e-client-query")
      .stroke(hot("client-app") ? "#60a5fa" : "#475569", 2)
      .arrow(true);

    /* ── DB topology (varies per DB type) ────────────── */

    if (dbType === "mongodb") {
      /* ── MongoDB: mongos → Sharded cluster ─────────── */
      const shardCount =
        runtime.targetShardIdx !== undefined
          ? Math.max(
              ...nodes
                .filter((n) => n.shardIdx !== undefined)
                .map((n) => n.shardIdx!),
            ) + 1
          : 1;
      const shardSpacingY = shardCount <= 2 ? 200 : 170;
      const shardStartY = H / 2 - ((shardCount - 1) * shardSpacingY) / 2;
      const shardKeyField =
        workload === "banking"
          ? "account_id"
          : workload === "ecommerce"
            ? "product_id"
            : "channel_id";

      for (let s = 0; s < shardCount; s++) {
        const sy = shardStartY + s * shardSpacingY;
        const shardNodes = nodes.filter((n) => n.shardIdx === s);
        const primary = shardNodes.find((n) => n.role === "primary");
        const secondaries = shardNodes.filter((n) => n.role === "secondary");
        const isTarget =
          isTargetedOp(selectedOp) && s === runtime.targetShardIdx;
        const isScatter = !isTargetedOp(selectedOp);
        const shardHighlighted = isTarget || isScatter;

        /* Shard background overlay */
        b.overlay((o) => {
          o.add(
            "rect",
            {
              x: 570,
              y: sy - 72,
              width: 350,
              height: 145,
              rx: 10,
              fill: shardHighlighted
                ? "rgba(34,197,94,0.05)"
                : "rgba(15,23,42,0.3)",
              stroke: shardHighlighted
                ? "rgba(34,197,94,0.25)"
                : "rgba(100,116,139,0.15)",
              strokeWidth: 1,
              strokeDasharray: "4,3",
            },
            { key: `shard-bg-${s}` },
          );
          // Shard label
          o.add(
            "text",
            {
              x: 580,
              y: sy - 57,
              text: `Shard ${s + 1}  ·  ${shardKeyField} range`,
              fill: shardHighlighted ? "#86efac" : "#64748b",
              fontSize: 9,
              fontWeight: "600",
            },
            { key: `shard-label-${s}` },
          );
        });

        /* Primary node */
        if (primary) {
          const px = 640;
          const py = sy - 20;
          const isHot = hot(primary.id);
          const statusColors = NODE_STATUS_COLORS[primary.status];

          b.node(primary.id)
            .at(px, py)
            .rect(120, 48, 8)
            .fill(
              isHot
                ? dbColors.fill
                : primary.status === "down"
                  ? "#1c1917"
                  : "#0f172a",
            )
            .stroke(
              primary.status === "down"
                ? statusColors.stroke
                : isHot
                  ? dbColors.stroke
                  : statusColors.stroke,
              2,
            )
            .richLabel(
              (l) => {
                l.color("PRIMARY", "#e2e8f0", { fontSize: 10, bold: true });
                l.newline();
                l.color(
                  primary.status === "down" ? "OFFLINE" : `${primary.loadPct}%`,
                  primary.status === "down" ? "#ef4444" : "#94a3b8",
                  { fontSize: 8 },
                );
              },
              { fill: "#fff", fontSize: 10, dy: 0, lineHeight: 1.6 },
            )
            .onClick(() => openConcept("mongodb"));

          b.edge("query-layer", primary.id, `e-query-${primary.id}`)
            .stroke(
              isHot
                ? dbColors.stroke
                : primary.status === "down"
                  ? "#7f1d1d"
                  : "#475569",
              isHot ? 2.2 : 1.4,
            )
            .arrow(true);
        }

        /* Secondary nodes */
        secondaries.forEach((sec, si) => {
          const sx = 790 + si * 105;
          const sy2 = sy - 20;
          const isHot = hot(sec.id);
          const statusColors = NODE_STATUS_COLORS[sec.status];

          b.node(sec.id)
            .at(sx, sy2)
            .rect(95, 44, 8)
            .fill(
              isHot
                ? dbColors.fill
                : sec.status === "down"
                  ? "#1c1917"
                  : "#0f172a",
            )
            .stroke(
              sec.status === "down"
                ? statusColors.stroke
                : isHot
                  ? dbColors.stroke
                  : "#334155",
              1.5,
            )
            .richLabel(
              (l) => {
                l.color(`SEC ${si + 1}`, "#cbd5e1", {
                  fontSize: 9,
                  bold: true,
                });
                l.newline();
                l.color(
                  sec.status === "down"
                    ? "OFF"
                    : sec.status === "lagging"
                      ? "LAG"
                      : `${sec.loadPct}%`,
                  sec.status === "down"
                    ? "#ef4444"
                    : sec.status === "lagging"
                      ? "#f59e0b"
                      : "#94a3b8",
                  { fontSize: 8 },
                );
              },
              { fill: "#fff", fontSize: 9, dy: 0, lineHeight: 1.5 },
            );

          /* Primary → secondary replication edge */
          if (primary && sec.status !== "down" && primary.status !== "down") {
            b.edge(primary.id, sec.id, `rep-${primary.id}-${sec.id}`)
              .stroke("#334155", 1)
              .dashed()
              .arrow(true);
          }
        });
      }
    } else {
      /* ── Relational / Cassandra: flat node list ──────── */
      const nodeCount = nodes.length;
      const dbLeft = 640;
      const dbSpacingY = nodeCount <= 3 ? 120 : 100;
      const dbStartY = 280 - ((nodeCount - 1) * dbSpacingY) / 2;

      nodes.forEach((node, i) => {
        const y = dbStartY + i * dbSpacingY;
        const statusColors = NODE_STATUS_COLORS[node.status];
        const isHot = hot(node.id);

        const roleLabel =
          dbType === "cassandra"
            ? `Replica ${i + 1}`
            : node.role === "primary"
              ? "Primary"
              : `Secondary ${i}`;

        const statusLabel =
          node.status === "down"
            ? "OFFLINE"
            : node.status === "lagging"
              ? "LAGGING"
              : `${node.loadPct}% load`;

        b.node(node.id)
          .at(dbLeft + (i % 2 === 1 ? 60 : 0), y)
          .rect(170, 80, 12)
          .fill(
            isHot
              ? dbColors.fill
              : node.status === "down"
                ? "#1c1917"
                : "#0f172a",
          )
          .stroke(
            node.status === "down"
              ? statusColors.stroke
              : isHot
                ? dbColors.stroke
                : statusColors.stroke,
            2,
          )
          .richLabel(
            (l) => {
              l.color(roleLabel, "#e2e8f0", { fontSize: 11, bold: true });
              l.color("  DB Node", "#64748b", { fontSize: 9 });
              l.newline();
              l.color(
                statusLabel,
                node.status === "down"
                  ? "#ef4444"
                  : node.status === "lagging"
                    ? "#f59e0b"
                    : "#94a3b8",
                { fontSize: 9 },
              );
            },
            { fill: "#fff", fontSize: 11, dy: 2, lineHeight: 1.7 },
          )
          .onClick(() =>
            openConcept(dbType === "cassandra" ? "cassandra" : "relational"),
          );

        b.edge("query-layer", node.id, `e-query-${node.id}`)
          .stroke(
            isHot
              ? dbColors.stroke
              : node.status === "down"
                ? "#7f1d1d"
                : "#475569",
            isHot ? 2.2 : 1.5,
          )
          .arrow(true);
      });

      /* ── Replication edges ─────────────────────────── */
      if (nodeCount >= 2) {
        if (dbType === "cassandra") {
          for (let i = 0; i < nodeCount; i++) {
            const next = (i + 1) % nodeCount;
            if (nodes[i].status !== "down" && nodes[next].status !== "down") {
              b.edge(nodes[i].id, nodes[next].id, `rep-${i}-${next}`)
                .stroke("#78350f", 1.2)
                .dashed();
            }
          }
        } else {
          for (let i = 1; i < nodeCount; i++) {
            if (nodes[i].status !== "down") {
              b.edge(nodes[0].id, nodes[i].id, `rep-0-${i}`)
                .stroke("#334155", 1.2)
                .dashed();
            }
          }
        }
      }
    }

    /* ── Data model overlay ──────────────────────────── */
    if (phase === "data-model" || phase === "summary") {
      b.overlay((o) => {
        dataModelDetail.forEach((line, i) => {
          o.add(
            "text",
            {
              x: 30,
              y: 520 + i * 18,
              text: line,
              fill: "#94a3b8",
              fontSize: 10,
              fontWeight: "400",
            },
            { key: `dm-${i}` },
          );
        });
      });
    }

    /* ── Stale read warning overlay ──────────────────── */
    if (phase === "stale") {
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: W / 2,
            y: 40,
            text: "⚠ STALE READ DETECTED",
            fill: "#ef4444",
            fontSize: 16,
            fontWeight: "700",
          },
          { key: "stale-warn" },
        );
      });
    }

    /* ── Signals ─────────────────────────────────────── */
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

  /* ── Mount / destroy ─────────────────────────────────── */
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

  /* ── Pills ──────────────────────────────────────────── */
  const pills = [
    {
      key: "relational",
      label: "PostgreSQL",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "mongodb",
      label: "MongoDB",
      color: "#86efac",
      borderColor: "#22c55e",
    },
    {
      key: "cassandra",
      label: "Cassandra",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "consistency",
      label: "Consistency",
      color: "#fecaca",
      borderColor: "#ef4444",
    },
    {
      key: "availability",
      label: "Availability",
      color: "#ddd6fe",
      borderColor: "#8b5cf6",
    },
    {
      key: "data-modeling",
      label: "Data Modeling",
      color: "#99f6e4",
      borderColor: "#14b8a6",
    },
    {
      key: "cap-theorem",
      label: "CAP Theorem",
      color: "#fbcfe8",
      borderColor: "#ec4899",
    },
    {
      key: "replication",
      label: "Replication",
      color: "#c7d2fe",
      borderColor: "#6366f1",
    },
    {
      key: "denormalization",
      label: "Denormalization",
      color: "#a5f3fc",
      borderColor: "#0ea5e9",
    },
    {
      key: "ledger-critical",
      label: "Ledger Critical",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "acid",
      label: "ACID",
      color: "#6ee7b7",
      borderColor: "#10b981",
    },
  ];

  return (
    <div className="db-tradeoff-root">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className={`db-tradeoff-stage db-tradeoff-stage--${phase}`}>
            <StageHeader
              title="Database Tradeoff Lab"
              subtitle="Pick a database and workload — see how behavior, latency, and reliability change"
            >
              <StatBadge
                label="DB"
                value={profile.label.split(" ")[0]}
                color={dbColors.stroke}
              />
              <StatBadge
                label="Fit"
                value={`${result.fitScore}/100`}
                color={fitColor(result.fitScore)}
              />
              <StatBadge
                label="Read"
                value={`~${result.readLatencyMs}ms`}
                color="#bae6fd"
              />
              <StatBadge
                label="Write"
                value={`~${result.writeLatencyMs}ms`}
                color="#fca5a5"
              />
              <StatBadge
                label="Avail"
                value={`${result.availability}%`}
                color="#c4b5fd"
              />
              {dbType === "mongodb" && (
                <StatBadge
                  label="Shards"
                  value={`${result.shardsTouched}/${runtime.nodeCount}`}
                  color={result.shardsTouched === 1 ? "#22c55e" : "#f59e0b"}
                />
              )}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>

            <SideCard label="Why This DB?" variant="info">
              <p>{whyThisDb}</p>
            </SideCard>

            <SideCard label="Data Model" variant="info">
              <p style={{ color: "#94a3b8", fontSize: 12 }}>{dataModel}</p>
              <div className="db-tradeoff-schema">
                {dataModelDetail.map((line, i) => (
                  <code key={i}>{line}</code>
                ))}
              </div>
            </SideCard>

            <SideCard label="Metrics" variant="info">
              <div className="db-tradeoff-kpis">
                <div className="db-tradeoff-kpis__row">
                  <span>Read latency</span>
                  <strong>~{result.readLatencyMs}ms</strong>
                </div>
                <div className="db-tradeoff-kpis__row">
                  <span>Write latency</span>
                  <strong>~{result.writeLatencyMs}ms</strong>
                </div>
                <div className="db-tradeoff-kpis__row">
                  <span>Throughput</span>
                  <strong>{result.throughputRps.toLocaleString()} rps</strong>
                </div>
                <div className="db-tradeoff-kpis__row">
                  <span>Consistency</span>
                  <strong>{result.consistency}</strong>
                </div>
                <div className="db-tradeoff-kpis__row">
                  <span>Availability</span>
                  <strong>{result.availability}%</strong>
                </div>
                <div className="db-tradeoff-kpis__row">
                  <span>Nodes touched</span>
                  <strong>{result.nodesTouched}</strong>
                </div>
                {dbType === "mongodb" && (
                  <div className="db-tradeoff-kpis__row">
                    <span>Shards touched</span>
                    <strong
                      style={{
                        color:
                          result.shardsTouched === 1 ? "#22c55e" : "#f59e0b",
                      }}
                    >
                      {result.shardsTouched}/{runtime.nodeCount}
                    </strong>
                  </div>
                )}
                <div className="db-tradeoff-kpis__row">
                  <span>Stale read risk</span>
                  <strong
                    style={{
                      color: result.staleReadRisk ? "#ef4444" : "#22c55e",
                    }}
                  >
                    {result.staleReadRisk ? "Yes" : "No"}
                  </strong>
                </div>
                <div className="db-tradeoff-kpis__row">
                  <span>Complexity</span>
                  <strong>{result.complexity}/10</strong>
                </div>
              </div>
            </SideCard>

            <SideCard label="Strengths & Weaknesses" variant="info">
              <div className="db-tradeoff-traits">
                <div>
                  <strong style={{ color: "#22c55e", fontSize: 11 }}>
                    Strengths
                  </strong>
                  {profile.strengths.map((s, i) => (
                    <p key={i}>+ {s}</p>
                  ))}
                </div>
                <div>
                  <strong style={{ color: "#ef4444", fontSize: 11 }}>
                    Weaknesses
                  </strong>
                  {profile.weaknesses.map((w, i) => (
                    <p key={i}>− {w}</p>
                  ))}
                </div>
              </div>
            </SideCard>

            <SideCard label="Workload Info" variant="info">
              <p>
                <strong>{WORKLOAD_PROFILES[workload].label}</strong>
              </p>
              <p style={{ color: "#94a3b8", fontSize: 12 }}>
                {WORKLOAD_PROFILES[workload].description}
              </p>
              <ul className="db-tradeoff-needs">
                {WORKLOAD_PROFILES[workload].needs.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default DbTradeoffVisualization;
