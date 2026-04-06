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
  type DbType,
  type ReadPreference,
  type WorkloadId,
  type WriteConcern,
} from "./dbTradeoffSlice";
import { useDbTradeoffAnimation, type Signal } from "./useDbTradeoffAnimation";
import "./main.scss";

/* ── Needs checklist ─────────────────────────────────── */

type CheckStatus = "pass" | "warn" | "fail";
interface NeedCheck {
  need: string;
  status: CheckStatus;
  note: string;
}

function buildNeedsChecklist(
  workload: WorkloadId,
  dbType: DbType,
  writeConcern: WriteConcern,
  readPreference: ReadPreference,
): NeedCheck[] {
  const isRelational = dbType === "relational";
  const isMongo = dbType === "mongodb";
  const mongoLevel = isMongo
    ? writeConcern === "wmajority" && readPreference === "majority"
      ? "strong"
      : writeConcern === "w1" && readPreference === "secondary"
        ? "eventual"
        : "quorum"
    : null;

  if (workload === "banking") {
    return [
      {
        need: "Strong consistency",
        status: isRelational
          ? "pass"
          : isMongo
            ? mongoLevel === "strong"
              ? "pass"
              : mongoLevel === "quorum"
                ? "warn"
                : "fail"
            : "fail",
        note: isRelational
          ? "Full serialisable isolation via ACID guarantees"
          : isMongo
            ? mongoLevel === "strong"
              ? "w:majority + Majority reads — quorum consensus achieved"
              : mongoLevel === "quorum"
                ? "Partial — enable Majority read mode to reach strong"
                : "w:1 + secondary reads can return stale data"
            : "Eventual-only — no strong consistency mode available",
      },
      {
        need: "ACID transactions",
        status: isRelational ? "pass" : isMongo ? "warn" : "fail",
        note: isRelational
          ? "Native multi-statement transactions across any tables"
          : isMongo
            ? "Multi-doc transactions exist but carry overhead and document-model semantics"
            : "No cross-partition transactions — LWT is limited and slow",
      },
      {
        need: "Correctness over speed",
        status: isRelational
          ? "pass"
          : isMongo
            ? writeConcern === "wmajority"
              ? "warn"
              : "fail"
            : "fail",
        note: isRelational
          ? "Designed for correctness-first: constraints, triggers, referential integrity"
          : isMongo
            ? writeConcern === "wmajority"
              ? "w:majority reduces loss risk but ledger semantics are weaker than relational"
              : "w:1 prioritises speed — dangerous for financial ledger data"
            : "AP system — availability is favoured over correctness",
      },
    ];
  }

  if (workload === "ecommerce") {
    return [
      {
        need: "Flexible schema",
        status: isMongo ? "pass" : "warn",
        note: isMongo
          ? "Document model natively supports evolving attributes per product"
          : isRelational
            ? "Possible via JSONB columns, but schema migrations add friction"
            : "Wide-column allows adding columns; no nested structures",
      },
      {
        need: "Nested product data",
        status: isMongo ? "pass" : isRelational ? "warn" : "fail",
        note: isMongo
          ? "Embed variants, specs, and images directly in the document"
          : isRelational
            ? "Requires separate tables and JOINs per attribute type"
            : "Flat rows only — nesting must be pre-denormalised",
      },
      {
        need: "Read-heavy workload",
        status: isRelational || isMongo ? "pass" : "warn",
        note: isRelational
          ? "Indexed reads, query planner, and caching handle most patterns well"
          : isMongo
            ? "Rich compound indexes and aggregation pipeline scale reads well"
            : "Scales for reads only when the partition key matches — range queries require extra tables",
      },
    ];
  }

  // chat
  return [
    {
      need: "Massive write throughput",
      status: isRelational ? "fail" : isMongo ? "warn" : "pass",
      note: isRelational
        ? "Single-node write path is a bottleneck — sharding adds significant complexity"
        : isMongo
          ? "Good throughput but plateaus against Cassandra at millions of writes/sec"
          : "Log-structured storage + distributed ring — built for exactly this",
    },
    {
      need: "Partition-friendly reads",
      status: isRelational ? "warn" : isMongo ? "warn" : "pass",
      note: isRelational
        ? "Works with careful indexing; large table JOINs degrade under scale"
        : isMongo
          ? "Shard key design is critical; less natural than Cassandra partition keys"
          : "Partition key is first-class — every read is partition-scoped by design",
    },
    {
      need: "High availability",
      status: isRelational ? "warn" : isMongo ? "warn" : "pass",
      note: isRelational
        ? "Requires explicit replication and failover setup; single-region by default"
        : isMongo
          ? "Replica sets give HA but failover election takes 10–30 s"
          : "Peer-to-peer, no primary — multi-DC replication and 99.99% HA out of the box",
    },
  ];
}

const STATUS_ICON: Record<CheckStatus, string> = {
  pass: "✓",
  warn: "⚠",
  fail: "✗",
};
const STATUS_COLOR: Record<CheckStatus, string> = {
  pass: "#22c55e",
  warn: "#f59e0b",
  fail: "#ef4444",
};

function NeedsChecklist({
  title,
  checks,
}: {
  title: string;
  checks: NeedCheck[];
}) {
  return (
    <div className="db-tradeoff-needs">
      <p className="db-tradeoff-needs__title">{title} needs:</p>
      {checks.map((c) => (
        <div key={c.need} className="db-tradeoff-needs__row">
          <span
            className="db-tradeoff-needs__icon"
            style={{ color: STATUS_COLOR[c.status] }}
          >
            {STATUS_ICON[c.status]}
          </span>
          <div className="db-tradeoff-needs__body">
            <span className="db-tradeoff-needs__label">{c.need}</span>
            <span className="db-tradeoff-needs__note">{c.note}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

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
    writeConcern,
    readPreference,
    replicaAckCount,
  } = runtime;

  const hot = (zone: string) => hotZones.includes(zone);
  const isReplicaAck = phase === "replica-ack";
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
          // Majority verdict banner (replica-ack phase, target shard only)
          if (isReplicaAck && isTarget) {
            const gotNew = replicaAckCount >= 2;
            o.add(
              "text",
              {
                x: 580,
                y: sy - 44,
                text: gotNew
                  ? `MAJORITY: NEW value ✓  (${replicaAckCount}/3 nodes)`
                  : `MAJORITY: OLD value  (1/3 — not yet committed)`,
                fill: gotNew ? "#22c55e" : "#f59e0b",
                fontSize: 9,
                fontWeight: "700",
              },
              { key: `shard-majority-${s}` },
            );
          }
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
                if (isReplicaAck && isTarget) {
                  // Primary always has the latest write
                  l.color("v2  NEW", "#22c55e", { fontSize: 8 });
                } else {
                  l.color(
                    primary.status === "down"
                      ? "OFFLINE"
                      : `${primary.loadPct}%`,
                    primary.status === "down" ? "#ef4444" : "#94a3b8",
                    { fontSize: 8 },
                  );
                }
              },
              { fill: "#fff", fontSize: 10, dy: 0, lineHeight: 1.6 },
            )
            .onClick(() => openConcept("mongodb"));

          const isMajorityResponse =
            phase === "db-response" &&
            isTarget &&
            readPreference === "majority" &&
            isReadOp(selectedOp);
          const majorityResponseColor = isMajorityResponse
            ? replicaAckCount >= 2
              ? "#22c55e"
              : "#f59e0b"
            : null;

          b.edge("query-layer", primary.id, `e-query-${primary.id}`)
            .stroke(
              majorityResponseColor ??
                (isHot
                  ? dbColors.stroke
                  : primary.status === "down"
                    ? "#7f1d1d"
                    : "#475569"),
              majorityResponseColor ? 2.5 : isHot ? 2.2 : 1.4,
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
              isReplicaAck && isTarget
                ? replicaAckCount >= si + 2
                  ? "#052e16" // has new value — green tint
                  : "#1c0f00" // has old value — amber tint
                : isHot
                  ? dbColors.fill
                  : sec.status === "down"
                    ? "#1c1917"
                    : "#0f172a",
            )
            .stroke(
              isReplicaAck && isTarget
                ? replicaAckCount >= si + 2
                  ? "#22c55e"
                  : "#b45309"
                : sec.status === "down"
                  ? statusColors.stroke
                  : isHot
                    ? dbColors.stroke
                    : "#334155",
              isReplicaAck && isTarget ? 1.8 : 1.5,
            )
            .richLabel(
              (l) => {
                l.color(`SEC ${si + 1}`, "#cbd5e1", {
                  fontSize: 9,
                  bold: true,
                });
                l.newline();
                if (isReplicaAck && isTarget) {
                  const secHasNew = replicaAckCount >= si + 2;
                  l.color(
                    secHasNew ? "v2  NEW" : "v1  OLD",
                    secHasNew ? "#22c55e" : "#f59e0b",
                    { fontSize: 8 },
                  );
                } else {
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
                }
              },
              { fill: "#fff", fontSize: 9, dy: 0, lineHeight: 1.5 },
            )
            .onClick(() => openConcept("write-concern"));

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
          const { id, colorClass, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, {
            key: id,
            ...(colorClass ? { className: colorClass } : {}),
          });
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
    {
      key: "write-concern",
      label: "Write Concern",
      color: "#f9a8d4",
      borderColor: "#f472b6",
    },
    {
      key: "mixed-concern",
      label: "Mixed Concern",
      color: "#fed7aa",
      borderColor: "#f97316",
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
              {dbType === "mongodb" && (
                <StatBadge
                  label="RPO"
                  value={
                    result.rpoRisk === "high"
                      ? "> 0"
                      : result.rpoRisk === "low"
                        ? "~low"
                        : "≈ 0"
                  }
                  color={result.rpoRisk === "none" ? "#22c55e" : "#ef4444"}
                />
              )}
              {result.rtoMs > 0 && (
                <StatBadge
                  label="RTO"
                  value={`~${(result.rtoMs / 1000).toFixed(0)}s`}
                  color="#f59e0b"
                />
              )}
              {dbType === "mongodb" && (
                <StatBadge
                  label="Mode"
                  value={
                    writeConcern === "wmajority" &&
                    readPreference === "majority"
                      ? "Strong"
                      : writeConcern === "w1" && readPreference === "secondary"
                        ? "Eventual"
                        : "Mixed"
                  }
                  color={
                    writeConcern === "wmajority" &&
                    readPreference === "majority"
                      ? "#22c55e"
                      : writeConcern === "w1" && readPreference === "secondary"
                        ? "#ef4444"
                        : "#f59e0b"
                  }
                />
              )}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              {phase === "summary" ? (
                <NeedsChecklist
                  title={WORKLOAD_PROFILES[workload].label}
                  checks={buildNeedsChecklist(
                    workload,
                    dbType,
                    writeConcern,
                    readPreference,
                  )}
                />
              ) : (
                <p>{explanation}</p>
              )}
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
                {dbType === "mongodb" && (
                  <div className="db-tradeoff-kpis__row">
                    <span>Write concern</span>
                    <strong
                      style={{
                        color: writeConcern === "w1" ? "#ef4444" : "#22c55e",
                      }}
                    >
                      {writeConcern === "w1" ? "w:1 (fast)" : "w:majority"}
                    </strong>
                  </div>
                )}
                {dbType === "mongodb" && (
                  <div className="db-tradeoff-kpis__row">
                    <span>Read mode</span>
                    <strong
                      style={{
                        color:
                          readPreference === "secondary"
                            ? "#f59e0b"
                            : readPreference === "majority"
                              ? "#22c55e"
                              : "#3b82f6",
                      }}
                    >
                      {readPreference === "secondary"
                        ? "Secondary (may be stale)"
                        : readPreference === "majority"
                          ? "Majority (consistent)"
                          : "Primary (latest)"}
                    </strong>
                  </div>
                )}
                {dbType === "mongodb" && (
                  <div className="db-tradeoff-kpis__row">
                    <span>RPO risk</span>
                    <strong
                      style={{
                        color:
                          result.rpoRisk === "none" ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {result.rpoRisk === "high"
                        ? "Data loss possible"
                        : result.rpoRisk === "low"
                          ? "Low risk"
                          : "Safe (≈ 0)"}
                    </strong>
                  </div>
                )}
                {result.rtoMs > 0 && (
                  <div className="db-tradeoff-kpis__row">
                    <span>RTO (recovery)</span>
                    <strong style={{ color: "#f59e0b" }}>
                      ~{(result.rtoMs / 1000).toFixed(0)}s election
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
