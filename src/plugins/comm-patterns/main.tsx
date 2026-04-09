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
  useCommPatternsAnimation,
  type Signal,
} from "./useCommPatternsAnimation";
import {
  PATTERN_PROFILES,
  SERVICES,
  type CommPatternsState,
} from "./commPatternsSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 960;
const H = 620;

/* ── Stable node positions (shared across patterns) ──── */
const POS = {
  client: { x: 80, y: 310 },
  "web-client": { x: 70, y: 155 },
  "mobile-client": { x: 70, y: 310 },
  "desktop-client": { x: 70, y: 465 },
  gateway: { x: 370, y: 310 },
  "web-bff": { x: 330, y: 155 },
  "mobile-bff": { x: 330, y: 310 },
  "desktop-bff": { x: 330, y: 465 },
  "identity-server": { x: 370, y: 530 },
  catalog: { x: 700, y: 120 },
  shoppingcart: { x: 700, y: 260 },
  discount: { x: 700, y: 400 },
  order: { x: 700, y: 540 },
} as const;

type NodeId = keyof typeof POS;

const SVC_IDS: NodeId[] = ["catalog", "shoppingcart", "discount", "order"];
const BFF_CLIENTS: Array<{ id: NodeId; label: string; partner: NodeId }> = [
  { id: "web-client", label: "Web", partner: "web-bff" },
  { id: "mobile-client", label: "Mobile", partner: "mobile-bff" },
  { id: "desktop-client", label: "Desktop", partner: "desktop-bff" },
];
const BFFS: Array<{ id: NodeId; label: string }> = [
  { id: "web-bff", label: "Web BFF" },
  { id: "mobile-bff", label: "Mobile BFF" },
  { id: "desktop-bff", label: "Desktop BFF" },
];
const BFF_SERVICE_MAP: Record<string, NodeId[]> = {
  "web-bff": ["catalog", "shoppingcart", "discount"],
  "mobile-bff": ["catalog", "discount"],
  "desktop-bff": ["catalog", "shoppingcart", "order"],
};

const CommPatternsVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useCommPatternsAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as CommPatternsState;
  const { explanation, hotZones, phase, pattern } = st;
  const profile = PATTERN_PROFILES[pattern];
  const hot = (zone: string) => hotZones.includes(zone);

  const showGateway = pattern.startsWith("gateway");
  const showBff = pattern === "bff";
  const showEdgeLayer = showGateway || showBff;
  const showIdentity = pattern === "gateway-offload";

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    /* ── Client / Frontend nodes ─────────────────────── */
    if (showBff) {
      BFF_CLIENTS.forEach(({ id, label }) => {
        const pos = POS[id];
        b.node(id)
          .at(pos.x, pos.y)
          .rect(116, 52, 14)
          .fill(hot(id) ? "#3b1026" : "#0f172a")
          .stroke(hot(id) ? profile.color : "#334155", 2)
          .label(label, {
            fill: "#e2e8f0",
            fontSize: 12,
            fontWeight: "bold",
          });
      });
    } else {
      b.node("client")
        .at(POS.client.x, POS.client.y)
        .rect(120, 56, 14)
        .fill(hot("client") ? "#1e3a5f" : "#0f172a")
        .stroke(hot("client") ? "#60a5fa" : "#334155", 2)
        .label("Client", {
          fill: "#e2e8f0",
          fontSize: 13,
          fontWeight: "bold",
        });
    }

    /* ── Gateway node (gateway patterns only) ───────── */
    if (showGateway) {
      b.node("gateway")
        .at(POS.gateway.x, POS.gateway.y)
        .rect(140, 60, 14)
        .fill(hot("gateway") ? "#312e81" : "#0f172a")
        .stroke(hot("gateway") ? profile.color : "#475569", 2)
        .label("API Gateway", {
          fill: "#e2e8f0",
          fontSize: 13,
          fontWeight: "bold",
        });

      b.edge("client", "gateway", "e-client-gw")
        .stroke("#475569", 2)
        .arrow(true)
        .label("REST / HTTP", { fill: "#94a3b8", fontSize: 9 });
    }

    /* ── BFF nodes (BFF pattern only) ───────────────── */
    if (showBff) {
      BFFS.forEach(({ id, label }) => {
        const pos = POS[id];
        b.node(id)
          .at(pos.x, pos.y)
          .rect(128, 54, 14)
          .fill(hot(id) ? "#4a0d2b" : "#0f172a")
          .stroke(hot(id) ? profile.color : "#475569", 2)
          .label(label, {
            fill: "#fce7f3",
            fontSize: 11,
            fontWeight: "bold",
          });
      });

      BFF_CLIENTS.forEach(({ id, partner }) => {
        b.edge(id, partner, `e-${id}-${partner}`)
          .stroke("#475569", 1.6)
          .arrow(true)
          .label("REST / HTTP", { fill: "#94a3b8", fontSize: 8 });
      });
    }

    /* ── Identity Server (offload only) ─────────────── */
    if (showIdentity) {
      b.node("identity-server")
        .at(POS["identity-server"].x, POS["identity-server"].y)
        .rect(140, 50, 12)
        .fill(hot("identity-server") ? "#78350f" : "#0f172a")
        .stroke(hot("identity-server") ? "#f59e0b" : "#475569", 2)
        .label("Identity Server", {
          fill: "#fbbf24",
          fontSize: 11,
          fontWeight: "bold",
        });

      b.edge("gateway", "identity-server", "e-gw-identity")
        .stroke("#78350f", 1.5)
        .arrow(true)
        .dashed();
    }

    /* ── Backend services ────────────────────────────── */
    SVC_IDS.forEach((id, i) => {
      const svcName = SERVICES[i];
      const pos = POS[id];
      b.node(id)
        .at(pos.x, pos.y)
        .rect(140, 50, 12)
        .fill(hot(id) ? "#064e3b" : "#0f172a")
        .stroke(hot(id) ? "#34d399" : "#334155", 2)
        .label(svcName, {
          fill: "#e2e8f0",
          fontSize: 12,
          fontWeight: "bold",
        });

      if (showGateway) {
        b.edge("gateway", id, `e-gw-${id}`)
          .stroke("#334155", 1.5)
          .arrow(true)
          .label("gRPC", { fill: "#7dd3fc", fontSize: 8 });
      } else if (showBff) {
        BFFS.forEach(({ id: bffId }) => {
          const targets = BFF_SERVICE_MAP[bffId];
          if (!targets.includes(id)) return;

          const edge = b.edge(bffId, id, `e-${bffId}-${id}`)
            .stroke(
              bffId === "web-bff"
                ? "rgba(236, 72, 153, 0.5)"
                : "rgba(148, 163, 184, 0.18)",
              1.3,
            )
            .arrow(true);

          if (bffId === "web-bff") {
            edge.label("gRPC", { fill: "#f9a8d4", fontSize: 8 });
          }
        });
      } else {
        b.edge("client", id, `e-client-${id}`)
          .stroke("#334155", 1.5)
          .arrow(true)
          .label("REST", { fill: "#94a3b8", fontSize: 8 });
      }
    });

    /* ── Overlay labels ──────────────────────────────── */
    b.overlay((o) => {
      o.add(
        "text",
        {
          x: W / 2,
          y: 30,
          text: profile.label,
          fill: profile.color,
          fontSize: 15,
          fontWeight: "bold",
        },
        { key: "pattern-title" },
      );

      if (
        pattern === "gateway-offload" &&
        (phase === "offload" ||
          phase === "forward" ||
          phase === "response" ||
          phase === "return" ||
          phase === "summary")
      ) {
        const concerns = ["SSL", "Auth", "Rate Limit", "Logging"];
        concerns.forEach((c, i) => {
          o.add(
            "text",
            {
              x: POS.gateway.x + 81,
              y: POS.gateway.y - 55 + i * 16,
              text: `• ${c}`,
              fill: "#fbbf24",
              fontSize: 9,
              fontWeight: "normal",
            },
            { key: `concern-${i}` },
          );
        });
      }

      if (pattern === "bff") {
        o.add(
          "text",
          {
            x: 200,
            y: 72,
            text: "Different UI / data needs",
            fill: phase === "bff-overview" ? profile.color : "#64748b",
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "bff-needs" },
        );
        o.add(
          "text",
          {
            x: 382,
            y: 72,
            text: "Dedicated backends per frontend",
            fill:
              phase === "bff-overview" ||
              phase === "bff-compose" ||
              phase === "bff-shape" ||
              phase === "return" ||
              phase === "summary"
                ? profile.color
                : "#64748b",
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "bff-dedicated" },
        );
      }

      if (
        showEdgeLayer &&
        (phase === "protocol" ||
          phase === "route" ||
          phase === "fan-out" ||
          phase === "bff-compose" ||
          phase === "forward" ||
          phase === "response" ||
          phase === "aggregate" ||
          phase === "bff-shape" ||
          phase === "return" ||
          phase === "summary")
      ) {
        const protocolNode = showBff ? "web-bff" : "gateway";
        const protoPos = POS[protocolNode];

        o.add(
          "text",
          {
            x: protoPos.x - 80,
            y: protoPos.y - 42,
            text: "REST / HTTP",
            fill: "#94a3b8",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "proto-in" },
        );
        o.add(
          "text",
          {
            x: protoPos.x,
            y: protoPos.y - 42,
            text: "→",
            fill: "#c084fc",
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "proto-arrow" },
        );
        o.add(
          "text",
          {
            x: protoPos.x + 55,
            y: protoPos.y - 42,
            text: "gRPC",
            fill: "#7dd3fc",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "proto-out" },
        );
      }

      if (pattern === "gateway-route" && phase !== "overview") {
        o.add(
          "text",
          {
            x: (POS.gateway.x + POS.catalog.x) / 2,
            y: POS.catalog.y - 20,
            text: "/api/products/123",
            fill: "#ef4444",
            fontSize: 10,
            fontWeight: "bold",
          },
          { key: "route-path" },
        );
      }

      if (pattern === "gateway-agg" && phase === "aggregate") {
        o.add(
          "text",
          {
            x: POS.gateway.x,
            y: POS.gateway.y - 45,
            text: "Aggregating responses…",
            fill: "#22c55e",
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "agg-label" },
        );
      }

      if (pattern === "bff" && phase === "bff-shape") {
        o.add(
          "text",
          {
            x: POS["web-bff"].x + 8,
            y: POS["web-bff"].y - 44,
            text: "Shaping response for Web UI",
            fill: profile.color,
            fontSize: 10,
            fontWeight: "bold",
          },
          { key: "bff-shape-label" },
        );
      }

      if (pattern === "direct" && phase !== "overview") {
        SVC_IDS.forEach((id, i) => {
          const svcPos = POS[id];
          o.add(
            "text",
            {
              x: (POS.client.x + svcPos.x) / 2 - 10,
              y: svcPos.y - 12,
              text: `${i + 1}`,
              fill: "#ef4444",
              fontSize: 11,
              fontWeight: "bold",
            },
            { key: `call-num-${i}` },
          );
        });
      }

      if (signals.length > 0) {
        signals.forEach((sig: Signal) => {
          const { id, colorClass, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, {
            key: id,
            className: colorClass,
          });
        });
      }
    });

    return b;
  })();

  /* ── Mount / destroy VizCraft scene ─────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
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

  const pills = [
    {
      key: "api-gateway" as ConceptKey,
      label: "API Gateway",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "gateway-routing" as ConceptKey,
      label: "Routing",
      color: "#93c5fd",
      borderColor: "#2563eb",
    },
    {
      key: "gateway-aggregation" as ConceptKey,
      label: "Aggregation",
      color: "#86efac",
      borderColor: "#22c55e",
    },
    {
      key: "gateway-offloading" as ConceptKey,
      label: "Offloading",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "bff-pattern" as ConceptKey,
      label: "BFF",
      color: "#f9a8d4",
      borderColor: "#ec4899",
    },
  ];

  return (
    <div className={`comm-patterns-root comm-patterns-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="comm-patterns-stage">
            <StageHeader title="Communication Patterns" subtitle={profile.label}>
              <StatBadge
                label="Pattern"
                value={profile.shortLabel}
                color={profile.color}
              />
              <StatBadge
                label="Client Calls"
                value={st.clientRoundTrips}
                color={st.clientRoundTrips > 1 ? "#ef4444" : "#22c55e"}
              />
              <StatBadge
                label="Latency"
                value={`~${st.totalLatencyMs}ms`}
                color="#60a5fa"
              />
              <StatBadge
                label="Coupling"
                value={profile.coupling}
                color={
                  profile.coupling === "high"
                    ? "#ef4444"
                    : profile.coupling === "medium"
                      ? "#f59e0b"
                      : "#22c55e"
                }
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
            <SideCard label="Pattern Profile" variant="info">
              <p
                style={{
                  color: profile.color,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                {profile.label}
              </p>
              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                {profile.description}
              </p>
              <div style={{ marginBottom: 6 }}>
                <span
                  style={{ color: "#22c55e", fontWeight: 600, fontSize: 11 }}
                >
                  Strengths
                </span>
                <ul
                  style={{
                    margin: "4px 0 0 14px",
                    fontSize: 11,
                    color: "#cbd5e1",
                  }}
                >
                  {profile.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span
                  style={{ color: "#ef4444", fontWeight: 600, fontSize: 11 }}
                >
                  Weaknesses
                </span>
                <ul
                  style={{
                    margin: "4px 0 0 14px",
                    fontSize: 11,
                    color: "#cbd5e1",
                  }}
                >
                  {profile.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </SideCard>
            {(showGateway || showBff) && (
              <SideCard
                label={showBff ? "BFF Responsibilities" : "Gateway Responsibilities"}
                variant="info"
              >
                <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
                  {showBff
                    ? "Request flow through a dedicated frontend backend:"
                    : "Request flow through the API Gateway:"}
                </p>
                {(() => {
                  const pipeline = showBff
                    ? [
                        {
                          step: "Request Validation",
                          icon: "V",
                          active: phase !== "overview",
                        },
                        {
                          step: "Authentication",
                          icon: "A",
                          active: phase !== "overview",
                        },
                        {
                          step: "Protocol Conversion",
                          icon: "P",
                          active:
                            phase === "protocol" ||
                            phase === "bff-compose" ||
                            phase === "response" ||
                            phase === "bff-shape" ||
                            phase === "return" ||
                            phase === "summary",
                        },
                        {
                          step: "Service Composition",
                          icon: "C",
                          active:
                            phase === "bff-compose" ||
                            phase === "response" ||
                            phase === "bff-shape" ||
                            phase === "return" ||
                            phase === "summary",
                        },
                        {
                          step: "Response Shaping",
                          icon: "S",
                          active:
                            phase === "bff-shape" ||
                            phase === "return" ||
                            phase === "summary",
                        },
                        {
                          step: "Client-specific DTOs",
                          icon: "D",
                          active:
                            phase === "bff-shape" ||
                            phase === "return" ||
                            phase === "summary",
                        },
                        {
                          step: "Retry / Timeout",
                          icon: "R",
                          active: phase !== "overview",
                        },
                        {
                          step: "Logging & Tracing",
                          icon: "L",
                          active: phase !== "overview",
                        },
                      ]
                    : [
                        {
                          step: "Request Validation",
                          icon: "V",
                          active: phase !== "overview",
                        },
                        {
                          step: "IP Allow/Deny",
                          icon: "I",
                          active: phase !== "overview",
                        },
                        {
                          step: "Authentication & Auth",
                          icon: "A",
                          active:
                            pattern === "gateway-offload" && phase !== "overview",
                        },
                        {
                          step: "Rate Limiting",
                          icon: "T",
                          active:
                            pattern === "gateway-offload" && phase !== "overview",
                        },
                        {
                          step: "Circuit Breaker",
                          icon: "C",
                          active: phase !== "overview",
                        },
                        {
                          step: "Service Discovery",
                          icon: "S",
                          active: phase !== "overview",
                        },
                        {
                          step: "Protocol Conversion",
                          icon: "P",
                          active: phase !== "overview",
                        },
                        {
                          step: "Load Balancing",
                          icon: "L",
                          active: phase !== "overview",
                        },
                        {
                          step: "Retry / Timeout",
                          icon: "R",
                          active: phase !== "overview",
                        },
                        {
                          step: "Logging & Tracing",
                          icon: "G",
                          active:
                            pattern === "gateway-offload" && phase !== "overview",
                        },
                      ];

                  return (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {pipeline.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 10,
                            padding: "2px 4px",
                            borderRadius: 4,
                            color: item.active ? "#e2e8f0" : "#475569",
                            background: item.active
                              ? "rgba(59,130,246,0.12)"
                              : "transparent",
                          }}
                        >
                          <span style={{ width: 14, textAlign: "center" }}>
                            {item.icon}
                          </span>
                          <span>{item.step}</span>
                          {index < pipeline.length - 1 && (
                            <span style={{ marginLeft: "auto", color: "#334155" }}>
                              {"->"}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <p style={{ fontSize: 10, color: "#64748b", marginTop: 8 }}>
                  {showBff
                    ? "Each frontend owns its own backend composition layer, so web, mobile, and desktop can evolve independently."
                    : pattern === "gateway-offload"
                      ? "All concerns handled at the gateway — services stay focused on business logic."
                      : "Highlighted concerns are always active. Switch to Offloading to see the full cross-cutting pipeline."}
                </p>
              </SideCard>
            )}
            {phase === "summary" && (
              <SideCard label="Quick Comparison" variant="info">
                <table
                  style={{
                    width: "100%",
                    fontSize: 11,
                    color: "#e2e8f0",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid #334155" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "4px 6px",
                          color: "#94a3b8",
                        }}
                      >
                        Metric
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "4px 6px",
                          color: "#94a3b8",
                        }}
                      >
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "3px 6px" }}>Client calls</td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "3px 6px",
                          color: profile.color,
                        }}
                      >
                        {profile.clientCalls}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "3px 6px" }}>Latency</td>
                      <td style={{ textAlign: "right", padding: "3px 6px" }}>
                        ~{st.totalLatencyMs}ms
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "3px 6px" }}>Coupling</td>
                      <td style={{ textAlign: "right", padding: "3px 6px" }}>
                        {profile.coupling}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "3px 6px" }}>Complexity</td>
                      <td style={{ textAlign: "right", padding: "3px 6px" }}>
                        {profile.complexity}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </SideCard>
            )}
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default CommPatternsVisualization;
