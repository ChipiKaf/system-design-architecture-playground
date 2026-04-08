import React, { useLayoutEffect, useRef, useEffect, useMemo } from "react";
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
import { useRestApiAnimation, type Signal } from "./useRestApiAnimation";
import { VARIANT_PROFILES, type RestApiState } from "./restApiSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 920;
const H = 540;

const RestApiVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useRestApiAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as RestApiState;
  const { explanation, hotZones, phase, variant } = st;
  const profile = VARIANT_PROFILES[variant];
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = useMemo(() => {
    const b = viz().view(W, H);

    const nodeW = 130;
    const nodeH = 52;
    const r = 12;
    const edgeColor = "#475569";

    /* ── Node positions ──────────────────────────────── */
    const clientX = 70;
    const clientY = 260;
    const gwX = 260;
    const gwY = 260;
    const productX = 530;
    const productY = 120;
    const orderX = 530;
    const orderY = 260;
    const customerX = 530;
    const customerY = 400;
    const dbProductX = 760;
    const dbProductY = 120;
    const dbOrderX = 760;
    const dbOrderY = 260;
    const dbCustomerX = 760;
    const dbCustomerY = 400;

    /* ── Client ──────────────────────────────────────── */
    b.node("client")
      .at(clientX, clientY)
      .rect(100, 48, r)
      .fill(hot("client") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("client") ? "#60a5fa" : "#334155", 2)
      .label("Client", { fill: "#e2e8f0", fontSize: 12, fontWeight: "bold" });

    /* ── API Gateway ─────────────────────────────────── */
    b.node("gateway")
      .at(gwX, gwY)
      .rect(nodeW, nodeH, r)
      .fill(hot("gateway") ? "#312e81" : "#1a1a2e")
      .stroke(hot("gateway") ? "#818cf8" : "#475569", 2)
      .label("API Gateway", { fill: "#c4b5fd", fontSize: 11, fontWeight: "bold" });

    /* ── Product Service ─────────────────────────────── */
    b.node("product-svc")
      .at(productX, productY)
      .rect(nodeW, nodeH, r)
      .fill(hot("product-svc") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("product-svc") ? profile.color : "#334155", 2)
      .label("Product Svc", { fill: "#e2e8f0", fontSize: 11, fontWeight: "bold" });

    /* ── Order Service ───────────────────────────────── */
    b.node("order-svc")
      .at(orderX, orderY)
      .rect(nodeW, nodeH, r)
      .fill(hot("order-svc") ? "#064e3b" : "#0f172a")
      .stroke(hot("order-svc") ? "#34d399" : "#334155", 2)
      .label("Order Svc", { fill: "#e2e8f0", fontSize: 11, fontWeight: "bold" });

    /* ── Customer Service ────────────────────────────── */
    b.node("customer-svc")
      .at(customerX, customerY)
      .rect(nodeW, nodeH, r)
      .fill(hot("customer-svc") ? "#4a1d96" : "#0f172a")
      .stroke(hot("customer-svc") ? "#a78bfa" : "#334155", 2)
      .label("Customer Svc", { fill: "#e2e8f0", fontSize: 11, fontWeight: "bold" });

    /* ── Databases (small) ───────────────────────────── */
    const dbW = 80;
    const dbH = 40;
    b.node("db-product")
      .at(dbProductX, dbProductY)
      .rect(dbW, dbH, 8)
      .fill(hot("db-product") ? "#1e293b" : "#0c0c1d")
      .stroke(hot("db-product") ? "#60a5fa" : "#334155", 1.5)
      .label("DB", { fill: "#94a3b8", fontSize: 10, fontWeight: "bold" });

    b.node("db-order")
      .at(dbOrderX, dbOrderY)
      .rect(dbW, dbH, 8)
      .fill(hot("db-order") ? "#1e293b" : "#0c0c1d")
      .stroke(hot("db-order") ? "#34d399" : "#334155", 1.5)
      .label("DB", { fill: "#94a3b8", fontSize: 10, fontWeight: "bold" });

    b.node("db-customer")
      .at(dbCustomerX, dbCustomerY)
      .rect(dbW, dbH, 8)
      .fill(hot("db-customer") ? "#1e293b" : "#0c0c1d")
      .stroke(hot("db-customer") ? "#a78bfa" : "#334155", 1.5)
      .label("DB", { fill: "#94a3b8", fontSize: 10, fontWeight: "bold" });

    /* ── Edges ───────────────────────────────────────── */
    // Client → Gateway
    b.edge("client", "gateway", "e-client-gw")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("HTTP", { fill: "#94a3b8", fontSize: 9 });

    // Gateway → Services
    b.edge("gateway", "product-svc", "e-gw-product")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("/products", { fill: "#94a3b8", fontSize: 9 });

    b.edge("gateway", "order-svc", "e-gw-order")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("/orders", { fill: "#94a3b8", fontSize: 9 });

    b.edge("gateway", "customer-svc", "e-gw-customer")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("/customers", { fill: "#94a3b8", fontSize: 9 });

    // Services → DBs
    b.edge("product-svc", "db-product", "e-product-db")
      .stroke("#334155", 1.5)
      .arrow(true);

    b.edge("order-svc", "db-order", "e-order-db")
      .stroke("#334155", 1.5)
      .arrow(true);

    b.edge("customer-svc", "db-customer", "e-customer-db")
      .stroke("#334155", 1.5)
      .arrow(true);

    // Inter-service edges (for nested / hateoas)
    b.edge("customer-svc", "order-svc", "e-customer-order")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed()
      .label("REST", { fill: "#64748b", fontSize: 8 });

    b.edge("order-svc", "product-svc", "e-order-product")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed()
      .label("REST", { fill: "#64748b", fontSize: 8 });

    // Response edges (reverse)
    b.edge("gateway", "client", "e-gw-client-resp")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed();

    b.edge("product-svc", "gateway", "e-product-gw-resp")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed();

    b.edge("order-svc", "gateway", "e-order-gw-resp")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed();

    b.edge("customer-svc", "gateway", "e-customer-gw-resp")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed();

    b.edge("db-product", "product-svc", "e-db-product-resp")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed();

    b.edge("db-order", "order-svc", "e-db-order-resp")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed();

    b.edge("db-customer", "customer-svc", "e-db-customer-resp")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed();

    b.edge("order-svc", "customer-svc", "e-order-customer-resp")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed();

    b.edge("product-svc", "order-svc", "e-product-order-resp")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed();

    /* ── Overlays ────────────────────────────────────── */
    b.overlay((o) => {
      // Variant badge
      o.add(
        "rect",
        { x: W - 170, y: 18, w: 150, h: 26, rx: 8, ry: 8, fill: "rgba(0,0,0,0.5)", stroke: profile.color, strokeWidth: 1.5, opacity: 1 },
        { key: "variant-badge-bg" },
      );
      o.add(
        "text",
        { x: W - 95, y: 36, text: profile.label, fill: profile.color, fontSize: 11, fontWeight: "bold" },
        { key: "variant-badge-text" },
      );

      // Maturity level badge
      o.add(
        "text",
        { x: W / 2, y: H - 16, text: `Richardson Maturity: Level ${profile.maturityLevel} · Format: JSON · Stateless`, fill: "#64748b", fontSize: 10, fontWeight: "normal" },
        { key: "maturity-label" },
      );

      // Signals
      signals.forEach((sig: Signal) => {
        const { id, colorClass, ...params } = sig;
        o.add(
          "signal",
          params as SignalOverlayParams,
          { key: id, className: colorClass },
        );
      });
    });

    return b;
  }, [variant, hotZones, signals, phase]);

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

  /* ── Pill definitions ───────────────────────────────── */
  const pills: PillDef[] = [
    { key: "rest-overview", label: "REST", color: "#93c5fd", borderColor: "#3b82f6" },
    { key: "http-methods", label: "HTTP Methods", color: "#fca5a5", borderColor: "#ef4444" },
    { key: "uri-design", label: "URI Design", color: "#fcd34d", borderColor: "#f59e0b" },
    { key: "status-codes", label: "Status Codes", color: "#86efac", borderColor: "#22c55e" },
    { key: "richardson-maturity", label: "Richardson Model", color: "#c4b5fd", borderColor: "#8b5cf6" },
    { key: "api-versioning", label: "Versioning", color: "#c4b5fd", borderColor: "#8b5cf6" },
    { key: "hateoas", label: "HATEOAS", color: "#86efac", borderColor: "#22c55e" },
    { key: "json-serialization", label: "JSON", color: "#f9a8d4", borderColor: "#ec4899" },
    { key: "statelessness", label: "Stateless", color: "#5eead4", borderColor: "#14b8a6" },
  ];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`rest-api-root rest-api-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="rest-api-stage">
            <StageHeader
              title="RESTful API Design"
              subtitle={profile.label}
            >
              <StatBadge label="Pattern" value={profile.label} color={profile.color} />
              <StatBadge label="Level" value={`${st.maturityLevel}`} color="#c4b5fd" />
              <StatBadge label="Method" value={st.httpMethod} color="#e2e8f0" />
              <StatBadge label="Format" value={st.payloadFormat} color="#f9a8d4" />
              <StatBadge label="Cache" value={st.cacheability} color="#5eead4" />
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
            <SideCard label={`${profile.label} Profile`} variant="info">
              <p style={{ color: profile.color, fontWeight: 600, marginBottom: 6 }}>
                {profile.label}
              </p>
              <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 8 }}>
                {profile.description}
              </p>
              <div style={{ fontSize: "0.72rem" }}>
                <p style={{ fontWeight: 600, color: "#22c55e", marginBottom: 2 }}>Strengths:</p>
                <ul style={{ margin: "0 0 8px 12px", color: "#cbd5e1" }}>
                  {profile.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p style={{ fontWeight: 600, color: "#ef4444", marginBottom: 2 }}>Trade-offs:</p>
                <ul style={{ margin: "0 0 0 12px", color: "#cbd5e1" }}>
                  {profile.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </SideCard>
            <SideCard label="REST Principles" variant="info">
              <div style={{ fontSize: "0.72rem", color: "#cbd5e1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                <span>Stateless:</span><span style={{ fontWeight: 600, color: "#22c55e" }}>Yes</span>
                <span>Cacheable:</span><span style={{ fontWeight: 600 }}>{st.cacheability}</span>
                <span>Idempotent:</span><span style={{ fontWeight: 600, color: st.idempotent ? "#22c55e" : "#f59e0b" }}>{st.idempotent ? "GET/PUT/DELETE" : "POST only"}</span>
                <span>Format:</span><span style={{ fontWeight: 600 }}>JSON</span>
                <span>Transport:</span><span style={{ fontWeight: 600 }}>HTTP</span>
                <span>Maturity:</span><span style={{ fontWeight: 600, color: "#c4b5fd" }}>Level {st.maturityLevel}</span>
              </div>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default RestApiVisualization;
