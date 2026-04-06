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
import { useCapAcidAnimation, type Signal } from "./useCapAcidAnimation";
import {
  VARIANT_PROFILES,
  type CapAcidState,
  type AcidGrade,
  type IsolationGrade,
} from "./capAcidSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 960;
const H = 660;

/* ── ACID grade helpers ──────────────────────────────── */
const ACID_COLOR: Record<string, string> = {
  full: "#22c55e",
  partial: "#f59e0b",
  none: "#ef4444",
  "at-risk": "#f59e0b",
  serializable: "#22c55e",
  snapshot: "#60a5fa",
  "read-committed": "#f59e0b",
};
const ACID_ICON: Record<string, string> = {
  full: "✓",
  partial: "~",
  none: "✗",
  "at-risk": "⚠",
  serializable: "✓",
  snapshot: "~",
  "read-committed": "○",
};

/* ── Node colour by status ───────────────────────────── */
const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  up: { fill: "#0f172a", stroke: "#10b981" },
  partitioned: { fill: "#1c0f00", stroke: "#ef4444" },
  down: { fill: "#1c1917", stroke: "#7f1d1d" },
};

/* ── CAP triangle geometry ───────────────────────────── */
const TRI_CX = 160;
const TRI_CY = 185;
const TRI_R = 95;
const TRI_POINTS = [
  { x: TRI_CX, y: TRI_CY - TRI_R, label: "A", full: "Availability" },
  {
    x: TRI_CX - TRI_R * 0.87,
    y: TRI_CY + TRI_R * 0.5,
    label: "C",
    full: "Consistency",
  },
  {
    x: TRI_CX + TRI_R * 0.87,
    y: TRI_CY + TRI_R * 0.5,
    label: "P",
    full: "Partition Tol.",
  },
];

const CapAcidVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useCapAcidAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as CapAcidState;
  const {
    explanation,
    hotZones,
    phase,
    variant,
    partitioned,
    nodes,
    cap,
    acid,
    writeVersion,
    writeLatencyMs,
    readLatencyMs,
    availabilityPct,
  } = st;
  const profile = VARIANT_PROFILES[variant];
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    /* ── CAP triangle overlay ─────────────────────────── */
    b.overlay((o: any) => {
      // Triangle edges
      const pts = TRI_POINTS;
      const triPath = `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} L ${pts[2].x} ${pts[2].y} Z`;
      o.add(
        "path",
        {
          d: triPath,
          fill: "rgba(59,130,246,0.04)",
          stroke: "rgba(148,163,184,0.2)",
          strokeWidth: 1.5,
        },
        { key: "cap-tri" },
      );

      // Vertex labels + highlight
      const capFlags = [cap.a, cap.c, cap.p];
      const conceptKeys: ConceptKey[] = [
        "availability",
        "consistency-cap",
        "partition-tolerance",
      ];
      pts.forEach((pt, i) => {
        const active = capFlags[i];
        o.add(
          "circle",
          {
            x: pt.x,
            y: pt.y,
            r: 18,
            fill: active ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.12)",
            stroke: active ? "#22c55e" : "#ef4444",
            strokeWidth: active ? 2 : 1,
          },
          { key: `cap-v-${i}` },
        );
        o.add(
          "text",
          {
            x: pt.x,
            y: pt.y + 1,
            text: pt.label,
            fill: active ? "#22c55e" : "#ef4444",
            fontSize: 14,
            fontWeight: "800",
          },
          { key: `cap-vl-${i}` },
        );
        // Full name below vertex
        const dy = i === 0 ? -26 : 30;
        o.add(
          "text",
          {
            x: pt.x,
            y: pt.y + dy,
            text: pt.full,
            fill: active ? "#86efac" : "#fca5a5",
            fontSize: 8,
            fontWeight: "600",
          },
          { key: `cap-fn-${i}` },
        );
      });

      // Highlight the active edge pair
      const edgeActive = [
        cap.c && cap.a, // C—A edge (bottom-left to top)
        cap.a && cap.p, // A—P edge (top to bottom-right)
        cap.c && cap.p, // C—P edge (bottom-left to bottom-right)
      ];
      const edges: [number, number][] = [
        [1, 0],
        [0, 2],
        [1, 2],
      ];
      edges.forEach(([a, bb], i) => {
        if (edgeActive[i]) {
          o.add(
            "line",
            {
              x1: pts[a].x,
              y1: pts[a].y,
              x2: pts[bb].x,
              y2: pts[bb].y,
              stroke: "#22c55e",
              strokeWidth: 2.5,
            },
            { key: `cap-e-${i}` },
          );
        }
      });

      // DB position label
      const posLabel = `${profile.label}: ${profile.capPosition}`;
      o.add(
        "text",
        {
          x: TRI_CX,
          y: TRI_CY + TRI_R + 24,
          text: posLabel,
          fill: profile.color,
          fontSize: 11,
          fontWeight: "700",
        },
        { key: "cap-pos" },
      );
      if (partitioned) {
        o.add(
          "text",
          {
            x: TRI_CX,
            y: TRI_CY + TRI_R + 38,
            text: "⚡ PARTITION ACTIVE",
            fill: "#ef4444",
            fontSize: 9,
            fontWeight: "700",
          },
          { key: "cap-part-label" },
        );
      }
    });

    /* ── ACID status panel overlay ─────────────────────── */
    b.overlay((o: any) => {
      const panelX = 18;
      const panelY = 340;
      const panelW = 285;
      const panelH = 155;

      o.add(
        "rect",
        {
          x: panelX,
          y: panelY,
          width: panelW,
          height: panelH,
          rx: 10,
          fill: "rgba(7,17,34,0.85)",
          stroke: "rgba(59,130,246,0.25)",
          strokeWidth: 1,
        },
        { key: "acid-bg" },
      );
      o.add(
        "text",
        {
          x: panelX + panelW / 2,
          y: panelY + 18,
          text: "ACID Compliance",
          fill: "#e2e8f0",
          fontSize: 12,
          fontWeight: "700",
        },
        { key: "acid-title" },
      );

      const items: {
        label: string;
        grade: AcidGrade | IsolationGrade | "at-risk";
        concept: ConceptKey;
      }[] = [
        { label: "Atomicity", grade: acid.atomicity, concept: "atomicity" },
        {
          label: "Consistency",
          grade: acid.consistency,
          concept: "consistency-acid",
        },
        { label: "Isolation", grade: acid.isolation, concept: "isolation" },
        { label: "Durability", grade: acid.durability, concept: "durability" },
      ];

      items.forEach((item, i) => {
        const y = panelY + 38 + i * 28;
        const color = ACID_COLOR[item.grade] ?? "#94a3b8";
        const icon = ACID_ICON[item.grade] ?? "?";
        o.add(
          "text",
          {
            x: panelX + 20,
            y,
            text: `${icon}  ${item.label}`,
            fill: color,
            fontSize: 11,
            fontWeight: "600",
            textAnchor: "start",
          },
          { key: `acid-${i}-label` },
        );
        o.add(
          "text",
          {
            x: panelX + panelW - 16,
            y,
            text: item.grade.toUpperCase(),
            fill: color,
            fontSize: 10,
            fontWeight: "700",
            textAnchor: "end",
          },
          { key: `acid-${i}-val` },
        );
      });
    });

    /* ── Client app node ──────────────────────────────── */
    b.node("client-app")
      .at(380, 100)
      .rect(120, 50, 10)
      .fill(hot("client-app") ? "#1e3a8a" : "#0f172a")
      .stroke(hot("client-app") ? "#60a5fa" : "#334155", 2)
      .label("Client App", {
        fill: "#e2e8f0",
        fontSize: 12,
        fontWeight: "bold",
      });

    /* ── Query layer node ─────────────────────────────── */
    b.node("query-layer")
      .at(380, 220)
      .rect(120, 50, 10)
      .fill(hot("query-layer") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("query-layer") ? "#38bdf8" : "#334155", 2)
      .label("Query Layer", {
        fill: "#e2e8f0",
        fontSize: 12,
        fontWeight: "bold",
      });

    b.edge("client-app", "query-layer", "e-client-ql")
      .stroke(hot("client-app") ? "#60a5fa" : "#475569", 1.5)
      .arrow(true);

    /* ── Database nodes ───────────────────────────────── */
    const nodePositions = [
      { x: 520, y: 360 },
      { x: 680, y: 360 },
      { x: 840, y: 360 },
    ];

    nodes.forEach((node, i) => {
      if (i >= nodePositions.length) return;
      const pos = nodePositions[i];
      const nc = NODE_COLORS[node.status];
      const isHot = hot(node.id);
      const isPartNode =
        node.status === "partitioned" || node.status === "down";
      const vColor = node.dataVersion < writeVersion ? "#f59e0b" : "#22c55e";

      b.node(node.id)
        .at(pos.x, pos.y)
        .rect(135, 70, 10)
        .fill(isHot ? profile.color + "33" : nc.fill)
        .stroke(isHot ? profile.color : nc.stroke, isPartNode ? 2.5 : 2)
        .richLabel(
          (l: any) => {
            l.color(node.label, "#e2e8f0", { fontSize: 11, bold: true });
            if (node.role !== "peer") {
              l.color(` (${node.role})`, "#64748b", { fontSize: 8 });
            }
            l.newline();
            l.color(
              isPartNode
                ? node.status === "down"
                  ? "DOWN"
                  : "PARTITIONED"
                : `v${node.dataVersion}`,
              isPartNode ? "#ef4444" : vColor,
              { fontSize: 9, bold: isPartNode },
            );
          },
          { fill: "#fff", fontSize: 11, dy: 0, lineHeight: 1.6 },
        )
        .onClick(() =>
          openConcept(
            variant === "cassandra"
              ? "cap-theorem"
              : variant === "mongodb"
                ? "cap-theorem"
                : "acid",
          ),
        );

      // Edge from query-layer to each node
      if (!isPartNode) {
        b.edge("query-layer", node.id, `e-ql-${node.id}`)
          .stroke(isHot ? profile.color : "#475569", isHot ? 2 : 1.3)
          .arrow(true);
      }
    });

    /* ── Replication edges between DB nodes ────────────── */
    if (nodes.length >= 2) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const ni = nodes[i];
          const nj = nodes[j];
          if (ni.status === "partitioned" || ni.status === "down") continue;
          if (nj.status === "partitioned" || nj.status === "down") continue;
          b.edge(ni.id, nj.id, `rep-${i}-${j}`)
            .stroke("rgba(100,116,139,0.3)", 1)
            .dashed();
        }
      }
    }

    /* ── Partition line overlay ────────────────────────── */
    if (partitioned) {
      b.overlay((o: any) => {
        // Vertical partition line between node 1/2 and node 3
        const cutX = nodePositions[1].x + 135 + 12;
        o.add(
          "line",
          {
            x1: cutX,
            y1: 310,
            x2: cutX,
            y2: 460,
            stroke: "#ef4444",
            strokeWidth: 2.5,
            strokeDasharray: "8,4",
          },
          { key: "partition-line" },
        );
        o.add(
          "text",
          {
            x: cutX,
            y: 305,
            text: "⚡ NETWORK PARTITION",
            fill: "#ef4444",
            fontSize: 9,
            fontWeight: "700",
          },
          { key: "partition-label" },
        );
      });
    }

    /* ── Version warning overlay ───────────────────────── */
    if (
      partitioned &&
      nodes.some((n) => n.dataVersion < writeVersion && n.status !== "down")
    ) {
      b.overlay((o: any) => {
        const staleNodes = nodes.filter(
          (n) => n.dataVersion < writeVersion && n.status !== "down",
        );
        staleNodes.forEach((n, i) => {
          const idx = nodes.indexOf(n);
          if (idx >= 0 && idx < nodePositions.length) {
            const pos = nodePositions[idx];
            o.add(
              "text",
              {
                x: pos.x + 67,
                y: pos.y + 82,
                text: `⚠ STALE (v${n.dataVersion})`,
                fill: "#f59e0b",
                fontSize: 9,
                fontWeight: "700",
              },
              { key: `stale-${i}` },
            );
          }
        });
      });
    }

    /* ── Signals ──────────────────────────────────────── */
    if (signals.length > 0) {
      b.overlay((o: any) => {
        signals.forEach((sig: Signal) => {
          const { id, colorClass, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, {
            key: id,
            className: colorClass,
          });
        });
      });
    }

    return b;
  })();

  /* ── Mount / destroy ────────────────────────────────── */
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

  /* ── Pill definitions ───────────────────────────────── */
  const pills = [
    {
      key: "cap-theorem" as ConceptKey,
      label: "CAP Theorem",
      color: "#fbbf24",
      borderColor: "#f59e0b",
    },
    {
      key: "acid" as ConceptKey,
      label: "ACID",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "isolation" as ConceptKey,
      label: "Isolation Levels",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "partition-tolerance" as ConceptKey,
      label: "Partitions",
      color: "#fca5a5",
      borderColor: "#ef4444",
    },
  ];

  /* ── Stat badge helpers ─────────────────────────────── */
  const capLabel =
    [cap.c && "C", cap.a && "A", cap.p && "P"].filter(Boolean).join("") || "—";
  const acidGrade = (g: AcidGrade | IsolationGrade | "at-risk") =>
    g === "full" || g === "serializable"
      ? "full"
      : g === "partial" ||
          g === "snapshot" ||
          g === "read-committed" ||
          g === "at-risk"
        ? "partial"
        : "none";
  const overallAcid =
    [acid.atomicity, acid.consistency, acid.durability].every(
      (g) => g === "full",
    ) && acid.isolation !== "none"
      ? "FULL"
      : [acid.atomicity, acid.consistency, acid.durability].some(
            (g) => g === "none",
          ) || acid.isolation === "none"
        ? "DEGRADED"
        : "PARTIAL";
  const overallAcidColor =
    overallAcid === "FULL"
      ? "#22c55e"
      : overallAcid === "PARTIAL"
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className={`cap-acid-root cap-acid-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="cap-acid-stage">
            <StageHeader
              title="CAP & ACID Explorer"
              subtitle={`${profile.label} — ${partitioned ? "⚡ Partitioned" : "Healthy"}`}
            >
              <StatBadge
                label="CAP"
                value={capLabel}
                className={`cap-acid-phase cap-acid-phase--${phase}`}
              />
              <StatBadge label="ACID" value={overallAcid} />
              <StatBadge label="Avail" value={`${availabilityPct}%`} />
              <StatBadge
                label="Write"
                value={writeLatencyMs > 0 ? `${writeLatencyMs}ms` : "BLOCKED"}
              />
              <StatBadge label="Read" value={`${readLatencyMs}ms`} />
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
            <SideCard label="Risk Assessment" variant="info">
              <p
                style={{
                  color: partitioned ? "#f59e0b" : "#86efac",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                {st.riskText}
              </p>
            </SideCard>
            <SideCard label="CAP Status" variant="info">
              <div className="cap-acid-cap-grid">
                <span style={{ color: cap.c ? "#22c55e" : "#ef4444" }}>
                  {cap.c ? "✓" : "✗"} Consistency
                </span>
                <span style={{ color: cap.a ? "#22c55e" : "#ef4444" }}>
                  {cap.a ? "✓" : "✗"} Availability
                </span>
                <span style={{ color: cap.p ? "#22c55e" : "#ef4444" }}>
                  {cap.p ? "✓" : "✗"} Partition Tol.
                </span>
              </div>
            </SideCard>
            <SideCard label="ACID Status" variant="info">
              <div className="cap-acid-acid-grid">
                {(
                  [
                    ["Atomicity", acid.atomicity],
                    ["Consistency", acid.consistency],
                    ["Isolation", acid.isolation],
                    ["Durability", acid.durability],
                  ] as const
                ).map(([label, grade]) => (
                  <span
                    key={label}
                    style={{ color: ACID_COLOR[grade] ?? "#94a3b8" }}
                  >
                    {ACID_ICON[grade] ?? "?"} {label}:{" "}
                    {String(grade).toUpperCase()}
                  </span>
                ))}
              </div>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default CapAcidVisualization;
