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
import { useServiceEvolutionAnimation, type Signal } from "./useServiceEvolutionAnimation";
import {
  VARIANT_PROFILES,
  TRAIT_META,
  type ServiceEvolutionState,
  type VariantKey,
  type TraitKey,
} from "./serviceEvolutionSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

/* ─── Canvas dimensions ──────────────────────────────── */
const W = 960;
const H = 560;

/* ─── Layout constants ───────────────────────────────── */
const CLIENT_X = 60;
const GATEWAY_X = 200;
const GATEWAY_Y = H / 2;
const SERVICES_START_X = 360;
const DB_OFFSET_Y = 100;

/* ─── Colours ─────────────────────────────────────────── */
const DARK_BG     = "#0f172a";
const CARD_STROKE = "#334155";
const TEXT_MAIN   = "#f1f5f9";
const TEXT_DIM    = "#94a3b8";
const HOT_FILL    = "#1e3a5f";

/* ─── Node builder helpers ──────────────────────────────
   Shared, parametric helpers so individual service/fn
   nodes stay DRY.
────────────────────────────────────────────────────────── */

function buildClient(b: ReturnType<typeof viz>, hot: (id: string) => boolean) {
  b.node("client")
    .at(CLIENT_X, GATEWAY_Y)
    .rect(80, 40, 8)
    .fill(hot("client") ? HOT_FILL : DARK_BG)
    .stroke(hot("client") ? "#60a5fa" : CARD_STROKE, 2)
    .label("Client", { fill: TEXT_MAIN, fontSize: 11, fontWeight: "bold" });
}

function buildGateway(b: ReturnType<typeof viz>, hot: (id: string) => boolean) {
  b.node("gateway")
    .at(GATEWAY_X + 10, GATEWAY_Y)
    .rect(100, 50, 8)
    .fill(hot("gateway") ? HOT_FILL : DARK_BG)
    .stroke(hot("gateway") ? "#7dd3fc" : CARD_STROKE, 2)
    .label("Gateway", { fill: TEXT_MAIN, fontSize: 11, fontWeight: "bold" });
  b.edge("client", "gateway", "e-client-gw")
    .stroke(CARD_STROKE, 1.5)
    .arrow(true);
}

/** Monolith: single large app box + single DB */
function buildMonolithScene(
  b: ReturnType<typeof viz>,
  hot: (id: string) => boolean,
  variant: VariantKey,
) {
  const color = VARIANT_PROFILES[variant].color;

  // Application block (tall, indicating it holds everything inside)
  b.node("app")
    .at(SERVICES_START_X + 60, GATEWAY_Y)
    .rect(200, 160, 12)
    .fill(hot("app") ? "#1a2942" : DARK_BG)
    .stroke(hot("app") ? color : CARD_STROKE, 2)
    .richLabel((l) => {
      l.bold("Application");
      l.newline();
      l.color("UI · Logic · Data", TEXT_DIM, { fontSize: 9 });
    }, { fill: TEXT_MAIN, fontSize: 13, dy: 4, lineHeight: 1.8 });

  // DB below the app
  b.node("db")
    .at(SERVICES_START_X + 60, GATEWAY_Y + 130)
    .rect(120, 40, 6)
    .fill(hot("db") ? "#1c2b1e" : DARK_BG)
    .stroke(hot("db") ? "#4ade80" : CARD_STROKE, 1.5)
    .label("Database", { fill: TEXT_DIM, fontSize: 10 });

  b.edge("gateway", "app", "e-gw-app").stroke(CARD_STROKE, 1.5).arrow(true);
  b.edge("app", "db", "e-app-db").stroke(CARD_STROKE, 1.5).arrow(true);
}

/** Macroservices: 3 services, 2 DBs (one shared, one per domain) */
function buildMacroScene(
  b: ReturnType<typeof viz>,
  hot: (id: string) => boolean,
  variant: VariantKey,
) {
  const color = VARIANT_PROFILES[variant].color;
  const svcs = [
    { id: "svc-0", label: "API Service",     y: GATEWAY_Y - 110 },
    { id: "svc-1", label: "Order Service",   y: GATEWAY_Y },
    { id: "svc-2", label: "User Service",    y: GATEWAY_Y + 110 },
  ];
  const dbs = [
    { id: "db-0", label: "Orders DB", y: GATEWAY_Y - 40 },
    { id: "db-1", label: "Users DB",  y: GATEWAY_Y + 90 },
  ];

  svcs.forEach(({ id, label, y }) => {
    b.node(id)
      .at(SERVICES_START_X + 40, y)
      .rect(140, 44, 8)
      .fill(hot(id) ? HOT_FILL : DARK_BG)
      .stroke(hot(id) ? color : CARD_STROKE, 1.5)
      .label(label, { fill: TEXT_MAIN, fontSize: 10, fontWeight: "bold" });
    b.edge("gateway", id, `e-gw-${id}`).stroke(CARD_STROKE, 1).arrow(true);
  });

  dbs.forEach(({ id, label, y }) => {
    b.node(id)
      .at(SERVICES_START_X + 230, y)
      .rect(100, 36, 5)
      .fill(hot(id) ? "#1c2b1e" : DARK_BG)
      .stroke(hot(id) ? "#4ade80" : CARD_STROKE, 1.5)
      .label(label, { fill: TEXT_DIM, fontSize: 9 });
  });

  // Services share DB-0; only svc-2 uses DB-1
  b.edge("svc-0", "db-0", "e-svc0-db0").stroke(CARD_STROKE, 1).arrow(true).dashed();
  b.edge("svc-1", "db-0", "e-svc1-db0").stroke(CARD_STROKE, 1).arrow(true).dashed();
  b.edge("svc-2", "db-1", "e-svc2-db1").stroke(CARD_STROKE, 1).arrow(true).dashed();
  // Cascade edge (shown in fault-spread step)
  b.edge("svc-1", "svc-0", "e-cascade").stroke("#ef444430", 1).dashed();
}

/** Microservices: 6 independent services, each with own DB */
function buildMicroScene(
  b: ReturnType<typeof viz>,
  hot: (id: string) => boolean,
  variant: VariantKey,
) {
  const color = VARIANT_PROFILES[variant].color;
  const labels = ["Auth", "Orders", "Users", "Catalog", "Pay", "Notify"];
  const rows = 2;
  const cols = 3;
  const startX = SERVICES_START_X + 10;
  const startY = GATEWAY_Y - 120;
  const spacingX = 175;
  const spacingY = 130;

  for (let i = 0; i < 6; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const svcId = `svc-${i}`;
    const dbId  = `db-${i}`;
    const sx    = startX + col * spacingX;
    const sy    = startY + row * spacingY;

    b.node(svcId)
      .at(sx, sy)
      .rect(110, 38, 6)
      .fill(hot(svcId) ? HOT_FILL : DARK_BG)
      .stroke(hot(svcId) ? color : CARD_STROKE, 1.5)
      .label(`${labels[i]} Svc`, { fill: TEXT_MAIN, fontSize: 9, fontWeight: "bold" });

    b.node(dbId)
      .at(sx + 20, sy + 54)
      .rect(72, 28, 4)
      .fill(hot(dbId) ? "#1c2b1e" : DARK_BG)
      .stroke(hot(dbId) ? "#4ade80" : CARD_STROKE, 1)
      .label("DB", { fill: TEXT_DIM, fontSize: 8 });

    b.edge("gateway", svcId, `e-gw-${svcId}`).stroke(CARD_STROKE, 1).arrow(true);
    b.edge(svcId, dbId, `e-${svcId}-${dbId}`).stroke(CARD_STROKE, 1).arrow(true).dashed();
  }

  void rows; // satisfy linter
}

/** Serverless: 12 function nodes in a grid (no DBs — managed services) */
function buildServerlessScene(
  b: ReturnType<typeof viz>,
  hot: (id: string) => boolean,
  variant: VariantKey,
) {
  const color = VARIANT_PROFILES[variant].color;
  const cols = 4;
  const rows = 3;
  const startX = SERVICES_START_X + 20;
  const startY = GATEWAY_Y - 130;
  const spacingX = 130;
  const spacingY = 95;
  const fnLabels = ["auth", "order", "user", "catalog", "pay", "notify",
                    "email", "search", "report", "cart", "review", "ship"];

  for (let i = 0; i < 12; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const fnId = `fn-${i}`;
    const x    = startX + col * spacingX;
    const y    = startY + row * spacingY;

    b.node(fnId)
      .at(x, y)
      .circle(28)
      .fill(hot(fnId) ? "#1e3a1f" : DARK_BG)
      .stroke(hot(fnId) ? color : "#334155", 1.5)
      .label(`ƒ\n${fnLabels[i]}`, { fill: hot(fnId) ? color : TEXT_DIM, fontSize: 8 });

    b.edge("gateway", fnId, `e-gw-${fnId}`).stroke("#1e293b", 1).arrow(true);
  }

  void rows; // satisfy linter
}

/* ════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════ */

const ServiceEvolutionVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useServiceEvolutionAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);

  const st = runtime as ServiceEvolutionState;
  const { explanation, hotZones, phase, variant,
          deployTimeS, scaleLatencyS, blastRadius } = st;
  const profile = VARIANT_PROFILES[variant];
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene based on active variant ──── */
  const scene = (() => {
    const b = viz().view(W, H);

    buildClient(b, hot);
    buildGateway(b, hot);

    switch (variant) {
      case "monolith":     buildMonolithScene(b, hot, variant); break;
      case "macroservices": buildMacroScene(b, hot, variant);  break;
      case "microservices": buildMicroScene(b, hot, variant);  break;
      case "serverless":    buildServerlessScene(b, hot, variant); break;
    }

    /* ── Signals overlay ─────────────────────────────── */
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig: Signal) => {
          const { id, colorClass, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, { key: id, className: colorClass });
        });
      });
    }

    return b;
  })();

  /* ── Mount / unmount ────────────────────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current = scene.mount(containerRef.current, {
      autoplay: true,
      panZoom: true,
      initialZoom: saved?.zoom ?? 0.9,
      initialPan: saved?.pan ?? { x: 20, y: 0 },
    }) ?? null;
    const unsub = pzRef.current?.onChange((s) => { viewportRef.current = s; });
    return () => { unsub?.(); };
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  /* ── Phase-driven className for fault visual ─────────── */
  const rootClass = [
    "service-evolution-root",
    `service-evolution-phase--${phase}`,
  ].join(" ");

  /* ── Concept pills ────────────────────────────────── */
  const pills = [
    { key: "monolith",       label: "Monolith",       color: "#94a3b8", borderColor: "#64748b" },
    { key: "macroservices",  label: "Macroservices",  color: "#93c5fd", borderColor: "#3b82f6" },
    { key: "microservices",  label: "Microservices",  color: "#c4b5fd", borderColor: "#8b5cf6" },
    { key: "serverless",     label: "Serverless",     color: "#6ee7b7", borderColor: "#10b981" },
    { key: "tradeoffs",      label: "Trade-off Guide", color: "#fcd34d", borderColor: "#d97706" },
  ];

  /* ── Trait bars ───────────────────────────────────── */
  const traitKeys = Object.keys(TRAIT_META) as TraitKey[];

  return (
    <div className={rootClass}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="service-evolution-stage">
            <StageHeader
              title="Service Architecture Evolution"
              subtitle={`${profile.label} · ${profile.accentText}`}
            >
              <StatBadge
                label="Deploy"
                value={`~${deployTimeS}s`}
                color={deployTimeS <= 8 ? "#4ade80" : deployTimeS <= 45 ? "#fbbf24" : "#f87171"}
              />
              <StatBadge
                label="Scale"
                value={`~${scaleLatencyS}s`}
                color={scaleLatencyS <= 5 ? "#4ade80" : scaleLatencyS <= 20 ? "#fbbf24" : "#f87171"}
              />
              <StatBadge
                label="Blast %"
                value={`${blastRadius}%`}
                color={blastRadius <= 5 ? "#4ade80" : blastRadius <= 35 ? "#fbbf24" : "#f87171"}
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

            <SideCard label="Architecture traits" variant="info">
              <div className="service-evolution-traits">
                {traitKeys.map((key) => {
                  const meta  = TRAIT_META[key];
                  const score = profile.traits[key];
                  const label = profile.traitLabels[key];
                  return (
                    <div key={key} className="service-evolution-trait-row">
                      <span className="service-evolution-trait-name">{meta.label}</span>
                      <div className="service-evolution-trait-bar-wrap">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span
                            key={i}
                            className={`service-evolution-trait-pip${i < score ? " active" : ""}`}
                            style={i < score ? { background: profile.color } : {}}
                          />
                        ))}
                      </div>
                      <span className="service-evolution-trait-label">{label}</span>
                    </div>
                  );
                })}
              </div>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default ServiceEvolutionVisualization;
