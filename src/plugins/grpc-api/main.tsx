import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
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
import type { PillDef } from "../../components/plugin-kit/ConceptPills";
import { concepts, type ConceptKey } from "./concepts";
import { useGrpcApiAnimation, type Signal } from "./useGrpcApiAnimation";
import {
  VARIANT_PROFILES,
  type GrpcApiState,
  type VariantKey,
} from "./grpcApiSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 940;
const H = 560;

type Builder = ReturnType<typeof viz>;
type HotFn = (zone: string) => boolean;

const cardNode = (
  b: Builder,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  hot: HotFn,
  accent: string,
  opts?: { fill?: string; labelColor?: string; fontSize?: number },
) => {
  b.node(id)
    .at(x, y)
    .rect(w, h, 12)
    .fill(hot(id) ? (opts?.fill ?? "#142235") : (opts?.fill ?? "#0b1220"))
    .stroke(hot(id) ? accent : "#334155", 2)
    .label(label, {
      fill: opts?.labelColor ?? "#e2e8f0",
      fontSize: opts?.fontSize ?? 11,
      fontWeight: "bold",
    });
};

const panelNode = (
  b: Builder,
  id: string,
  x: number,
  y: number,
  label: string,
  hot: HotFn,
  accent: string,
) => {
  cardNode(b, id, x, y, 128, 40, label, hot, accent, {
    fill: hot(id) ? "#132033" : "#08111d",
    labelColor: "#cbd5e1",
    fontSize: 10,
  });
};

const addCommonFrame = (
  b: Builder,
  hot: HotFn,
  profile: (typeof VARIANT_PROFILES)[VariantKey],
  labels: { client: string; service: string },
) => {
  cardNode(b, "client", 70, 250, 118, 50, labels.client, hot, profile.color, {
    fill: hot("client") ? "#10243a" : "#08121f",
  });

  cardNode(b, "gateway", 250, 250, 138, 50, "gRPC Gateway", hot, "#38bdf8", {
    fill: hot("gateway") ? "#10243a" : "#08121f",
    labelColor: "#bae6fd",
  });

  cardNode(b, "proto", 430, 70, 140, 46, ".proto + stubs", hot, "#22c55e", {
    fill: hot("proto") ? "#11281b" : "#08160f",
    labelColor: "#bbf7d0",
  });

  cardNode(
    b,
    serviceIdFor(profile.key),
    470,
    250,
    150,
    54,
    labels.service,
    hot,
    profile.color,
    {
      fill: hot(serviceIdFor(profile.key)) ? "#132338" : "#0a1320",
    },
  );

  panelNode(
    b,
    "deadline-panel",
    250,
    430,
    "metadata + deadline",
    hot,
    "#f59e0b",
  );
  panelNode(b, "status-panel", 742, 430, "status + trailers", hot, "#94a3b8");

  b.edge("client", "proto", `${profile.key}-client-proto`)
    .stroke("#1f3b2b", 1)
    .dashed()
    .label("generated client", { fill: "#4ade80", fontSize: 8 });

  b.edge(serviceIdFor(profile.key), "proto", `${profile.key}-service-proto`)
    .stroke("#1f3b2b", 1)
    .dashed()
    .label("shared schema", { fill: "#4ade80", fontSize: 8 });
};

const serviceIdFor = (variant: VariantKey) => {
  switch (variant) {
    case "unary-checkout":
      return "order-svc";
    case "server-streaming":
      return "feed-svc";
    case "client-streaming":
      return "ingest-svc";
    case "bidirectional-stream":
      return "route-svc";
  }
};

const addSharedOverlay = (
  b: Builder,
  profile: (typeof VARIANT_PROFILES)[VariantKey],
  signals: Signal[],
) => {
  b.overlay((o) => {
    o.add(
      "rect",
      {
        x: W - 194,
        y: 18,
        w: 172,
        h: 28,
        rx: 9,
        ry: 9,
        fill: "rgba(2, 6, 23, 0.72)",
        stroke: profile.color,
        strokeWidth: 1.5,
        opacity: 1,
      },
      { key: `${profile.key}-badge-bg` },
    );
    o.add(
      "text",
      {
        x: W - 108,
        y: 37,
        text: profile.rpcType,
        fill: profile.color,
        fontSize: 11,
        fontWeight: "bold",
      },
      { key: `${profile.key}-badge-text` },
    );
    o.add(
      "text",
      {
        x: W / 2,
        y: H - 18,
        text: `Protobuf · HTTP/2 · ${profile.streamPattern} · deadline ${profile.deadlineMs} ms`,
        fill: "#64748b",
        fontSize: 10,
      },
      { key: `${profile.key}-footer` },
    );

    signals.forEach((sig) => {
      const { id, colorClass, ...params } = sig;
      o.add("signal", params as SignalOverlayParams, {
        key: id,
        className: colorClass,
      });
    });
  });
};

const buildUnaryScene = (
  b: Builder,
  hot: HotFn,
  signals: Signal[],
  profile: (typeof VARIANT_PROFILES)["unary-checkout"],
) => {
  addCommonFrame(b, hot, profile, {
    client: "Checkout UI",
    service: "Order Service",
  });

  cardNode(b, "pricing-svc", 760, 165, 124, 46, "Pricing Svc", hot, "#0ea5e9", {
    fill: hot("pricing-svc") ? "#11283a" : "#091725",
    labelColor: "#bae6fd",
  });
  cardNode(
    b,
    "inventory-svc",
    760,
    335,
    124,
    46,
    "Inventory Svc",
    hot,
    "#34d399",
    {
      fill: hot("inventory-svc") ? "#11281d" : "#09170f",
      labelColor: "#bbf7d0",
    },
  );

  b.edge("client", "gateway", "grpc-unary-request")
    .stroke("#475569", 2)
    .arrow(true)
    .label("QuoteCheckout", { fill: "#94a3b8", fontSize: 9 });
  b.edge("gateway", "order-svc", "grpc-unary-route")
    .stroke("#475569", 2)
    .arrow(true)
    .label("/checkout.v1/QuoteCheckout", {
      fill: "#94a3b8",
      fontSize: 8,
    });
  b.edge("order-svc", "pricing-svc", "grpc-unary-pricing")
    .stroke("#334155", 1.8)
    .arrow(true)
    .label("GetPrice", { fill: "#94a3b8", fontSize: 8 });
  b.edge("order-svc", "inventory-svc", "grpc-unary-inventory")
    .stroke("#334155", 1.8)
    .arrow(true)
    .label("ReserveStock", { fill: "#94a3b8", fontSize: 8 });
  b.edge("pricing-svc", "order-svc", "grpc-unary-pricing-resp")
    .stroke("#1e3a3a", 1.3)
    .arrow(true)
    .dashed();
  b.edge("inventory-svc", "order-svc", "grpc-unary-inventory-resp")
    .stroke("#1e3a3a", 1.3)
    .arrow(true)
    .dashed();
  b.edge("order-svc", "gateway", "grpc-unary-order-resp")
    .stroke("#1e3a3a", 1.3)
    .arrow(true)
    .dashed()
    .label("QuoteReply", { fill: "#64748b", fontSize: 8 });
  b.edge("gateway", "client", "grpc-unary-client-resp")
    .stroke("#1e3a3a", 1.3)
    .arrow(true)
    .dashed();

  addSharedOverlay(b, profile, signals);
};

const buildServerStreamingScene = (
  b: Builder,
  hot: HotFn,
  signals: Signal[],
  profile: (typeof VARIANT_PROFILES)["server-streaming"],
) => {
  addCommonFrame(b, hot, profile, {
    client: "Ops Dashboard",
    service: "Shipment Feed",
  });

  cardNode(
    b,
    "event-source",
    760,
    250,
    126,
    46,
    "Event Store",
    hot,
    "#f59e0b",
    {
      fill: hot("event-source") ? "#2a1f09" : "#181109",
      labelColor: "#fde68a",
    },
  );

  b.edge("client", "gateway", "grpc-stream-request")
    .stroke("#475569", 2)
    .arrow(true)
    .label("WatchShipment", { fill: "#94a3b8", fontSize: 9 });
  b.edge("gateway", "feed-svc", "grpc-stream-route")
    .stroke("#475569", 2)
    .arrow(true)
    .label("open stream", { fill: "#94a3b8", fontSize: 8 });
  b.edge("event-source", "feed-svc", "grpc-stream-event")
    .stroke("#334155", 1.4)
    .arrow(true)
    .dashed()
    .label("delivery events", { fill: "#64748b", fontSize: 8 });
  b.edge("feed-svc", "gateway", "grpc-stream-update")
    .stroke("#1e3a3a", 1.4)
    .arrow(true)
    .dashed()
    .label("ShipmentUpdate", { fill: "#64748b", fontSize: 8 });
  b.edge("gateway", "client", "grpc-stream-client")
    .stroke("#1e3a3a", 1.4)
    .arrow(true)
    .dashed()
    .label("push", { fill: "#64748b", fontSize: 8 });

  addSharedOverlay(b, profile, signals);
};

const buildClientStreamingScene = (
  b: Builder,
  hot: HotFn,
  signals: Signal[],
  profile: (typeof VARIANT_PROFILES)["client-streaming"],
) => {
  addCommonFrame(b, hot, profile, {
    client: "Edge Device",
    service: "Ingest Service",
  });

  cardNode(
    b,
    "warehouse",
    760,
    250,
    126,
    46,
    "Telemetry Lake",
    hot,
    "#0ea5e9",
    {
      fill: hot("warehouse") ? "#11283a" : "#091725",
      labelColor: "#bae6fd",
    },
  );

  b.edge("client", "gateway", "grpc-client-stream-open")
    .stroke("#475569", 2)
    .arrow(true)
    .label("UploadTelemetry", { fill: "#94a3b8", fontSize: 9 });
  b.edge("gateway", "ingest-svc", "grpc-client-stream-route")
    .stroke("#475569", 2)
    .arrow(true)
    .label("open stream", { fill: "#94a3b8", fontSize: 8 });
  b.edge("ingest-svc", "warehouse", "grpc-client-stream-persist")
    .stroke("#334155", 1.4)
    .arrow(true)
    .dashed()
    .label("append batch", { fill: "#64748b", fontSize: 8 });
  b.edge("ingest-svc", "gateway", "grpc-client-stream-summary")
    .stroke("#1e3a3a", 1.4)
    .arrow(true)
    .dashed()
    .label("UploadSummary", { fill: "#64748b", fontSize: 8 });
  b.edge("gateway", "client", "grpc-client-stream-ack")
    .stroke("#1e3a3a", 1.4)
    .arrow(true)
    .dashed()
    .label("ack", { fill: "#64748b", fontSize: 8 });

  addSharedOverlay(b, profile, signals);
};

const buildBidirectionalScene = (
  b: Builder,
  hot: HotFn,
  signals: Signal[],
  profile: (typeof VARIANT_PROFILES)["bidirectional-stream"],
) => {
  addCommonFrame(b, hot, profile, {
    client: "Dispatch Console",
    service: "Routing Service",
  });

  cardNode(b, "planner-svc", 760, 250, 126, 46, "Planner Svc", hot, "#22c55e", {
    fill: hot("planner-svc") ? "#11281d" : "#09170f",
    labelColor: "#bbf7d0",
  });

  b.edge("client", "gateway", "grpc-bidi-open")
    .stroke("#475569", 2)
    .arrow(true)
    .label("SyncRoute", { fill: "#94a3b8", fontSize: 9 });
  b.edge("gateway", "route-svc", "grpc-bidi-route")
    .stroke("#475569", 2)
    .arrow(true)
    .label("duplex stream", { fill: "#94a3b8", fontSize: 8 });
  b.edge("route-svc", "planner-svc", "grpc-bidi-plan")
    .stroke("#334155", 1.4)
    .arrow(true)
    .dashed()
    .label("Replan", { fill: "#64748b", fontSize: 8 });
  b.edge("planner-svc", "route-svc", "grpc-bidi-plan-resp")
    .stroke("#1e3a3a", 1.4)
    .arrow(true)
    .dashed();
  b.edge("route-svc", "gateway", "grpc-bidi-guidance")
    .stroke("#1e3a3a", 1.4)
    .arrow(true)
    .dashed()
    .label("Guidance", { fill: "#64748b", fontSize: 8 });
  b.edge("gateway", "client", "grpc-bidi-client")
    .stroke("#1e3a3a", 1.4)
    .arrow(true)
    .dashed()
    .label("route update", { fill: "#64748b", fontSize: 8 });

  addSharedOverlay(b, profile, signals);
};

const buildScene = (variant: VariantKey, hot: HotFn, signals: Signal[]) => {
  const b = viz().view(W, H);
  const profile = VARIANT_PROFILES[variant];

  switch (variant) {
    case "unary-checkout":
      buildUnaryScene(b, hot, signals, profile);
      break;
    case "server-streaming":
      buildServerStreamingScene(b, hot, signals, profile);
      break;
    case "client-streaming":
      buildClientStreamingScene(b, hot, signals, profile);
      break;
    case "bidirectional-stream":
      buildBidirectionalScene(b, hot, signals, profile);
      break;
  }

  return b;
};

const GrpcApiVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useGrpcApiAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as GrpcApiState;
  const { explanation, hotZones, phase, variant } = st;
  const profile = VARIANT_PROFILES[variant];
  const hot = (zone: string) => hotZones.includes(zone);

  const scene = useMemo(
    () => buildScene(variant, hot, signals),
    [variant, hotZones, signals],
  );

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

  const pills: PillDef[] = [
    { key: "grpc", label: "gRPC", color: "#bbf7d0", borderColor: "#22c55e" },
    {
      key: "protobuf",
      label: "Protobuf",
      color: "#bae6fd",
      borderColor: "#0ea5e9",
    },
    { key: "http2", label: "HTTP/2", color: "#99f6e4", borderColor: "#14b8a6" },
    {
      key: "rpc-types",
      label: "RPC Types",
      color: "#e9d5ff",
      borderColor: "#a855f7",
    },
    {
      key: "streaming",
      label: "Streaming",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "deadlines",
      label: "Deadlines",
      color: "#fecaca",
      borderColor: "#ef4444",
    },
    {
      key: "metadata",
      label: "Metadata",
      color: "#bbf7d0",
      borderColor: "#16a34a",
    },
    {
      key: "codegen",
      label: "Codegen",
      color: "#c7d2fe",
      borderColor: "#6366f1",
    },
    {
      key: "status-trailers",
      label: "Status",
      color: "#e2e8f0",
      borderColor: "#94a3b8",
    },
  ];

  return (
    <div className={`grpc-api-root grpc-api-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="grpc-api-stage">
            <StageHeader
              title="gRPC Communication Lab"
              subtitle={`${profile.label} · ${profile.streamPattern}`}
            >
              <StatBadge
                label="RPC"
                value={profile.rpcType}
                color={profile.color}
              />
              <StatBadge label="Latency" value={`${st.latencyMs} ms`} />
              <StatBadge
                label="Payload"
                value={`${st.payloadKb.toFixed(1)} KB`}
              />
              <StatBadge label="Msgs" value={`${st.messagesOnWire}`} />
              <StatBadge label="Deadline" value={`${st.deadlineMs} ms`} />
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p className="grpc-api-copy">{explanation}</p>
            </SideCard>
            <SideCard label="Why gRPC Here" variant="info">
              <p className="grpc-api-accent" style={{ color: profile.color }}>
                {profile.label}
              </p>
              <p className="grpc-api-copy">{profile.description}</p>
              <p className="grpc-api-copy">{profile.useCase}</p>
              <p className="grpc-api-copy">{profile.whyGrpc}</p>
            </SideCard>
            <SideCard label="Wire Facts" variant="info">
              <div className="grpc-api-facts">
                <span>RPC shape</span>
                <strong>{st.rpcType}</strong>
                <span>Stream pattern</span>
                <strong>{st.streamPattern}</strong>
                <span>Transport</span>
                <strong>HTTP/2</strong>
                <span>Encoding</span>
                <strong>Protocol Buffers</strong>
                <span>Services touched</span>
                <strong>{st.servicesTouched}</strong>
                <span>Finish</span>
                <strong>{st.statusModel}</strong>
              </div>
            </SideCard>
            <SideCard label="Strengths vs Trade-offs" variant="info">
              <div className="grpc-api-columns">
                <div>
                  <div className="grpc-api-column-title">Strengths</div>
                  <ul className="grpc-api-list">
                    {profile.strengths.map((strength) => (
                      <li key={strength}>{strength}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="grpc-api-column-title grpc-api-column-title--warn">
                    Trade-offs
                  </div>
                  <ul className="grpc-api-list">
                    {profile.tradeoffs.map((tradeoff) => (
                      <li key={tradeoff}>{tradeoff}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </SideCard>
            <SideCard label="Proto Snapshot" variant="code">
              <div className="grpc-api-code-stack">
                <div>
                  <span className="grpc-api-code-label">
                    Contract / request
                  </span>
                  <pre className="grpc-api-code">{profile.requestPreview}</pre>
                </div>
                <div>
                  <span className="grpc-api-code-label">Response shape</span>
                  <pre className="grpc-api-code">{profile.responsePreview}</pre>
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

export default GrpcApiVisualization;
