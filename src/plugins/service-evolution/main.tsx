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
import {
  useServiceEvolutionAnimation,
  type Signal,
} from "./useServiceEvolutionAnimation";
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

/* ─── Colours ─────────────────────────────────────────── */
const DARK_BG = "#0f172a";
const CARD_STROKE = "#334155";
const TEXT_MAIN = "#f1f5f9";
const TEXT_DIM = "#94a3b8";
const HOT_FILL = "#1e3a5f";

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
    .richLabel(
      (l) => {
        l.bold("Application");
        l.newline();
        l.color("UI · Logic · Data", TEXT_DIM, { fontSize: 9 });
      },
      { fill: TEXT_MAIN, fontSize: 13, dy: 4, lineHeight: 1.8 },
    );

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

/** Modular Monolith: a single backend containing bounded modules. */
function buildModularMonolithScene(
  b: ReturnType<typeof viz>,
  hot: (id: string) => boolean,
  variant: VariantKey,
) {
  const color = VARIANT_PROFILES[variant].color;
  const modules = [
    {
      id: "mod-0",
      label: "Catalog Module",
      schemaId: "schema-0",
      schemaLabel: "catalog.*",
      y: GATEWAY_Y - 92,
      x: 430,
      schemaX: 790,
    },
    {
      id: "mod-1",
      label: "Ordering Module",
      schemaId: "schema-1",
      schemaLabel: "ordering.*",
      y: GATEWAY_Y - 92,
      x: 605,
      schemaX: 872,
    },
    {
      id: "mod-2",
      label: "Basket Module",
      schemaId: "schema-2",
      schemaLabel: "basket.*",
      y: GATEWAY_Y,
      x: 430,
      schemaX: 790,
    },
    {
      id: "mod-3",
      label: "Identity Module",
      schemaId: "schema-3",
      schemaLabel: "identity.*",
      y: GATEWAY_Y,
      x: 605,
      schemaX: 872,
    },
    {
      id: "mod-4",
      label: "Payment Module",
      schemaId: "schema-4",
      schemaLabel: "payment.*",
      y: GATEWAY_Y + 92,
      x: 430,
      schemaX: 790,
    },
    {
      id: "mod-5",
      label: "Shipment Module",
      schemaId: "schema-5",
      schemaLabel: "shipment.*",
      y: GATEWAY_Y + 92,
      x: 605,
      schemaX: 872,
    },
  ];

  // Outer application shell
  b.node("app")
    .at(520, GATEWAY_Y)
    .rect(360, 280, 16)
    .fill(hot("app") ? "#1a2942" : DARK_BG)
    .stroke(hot("app") ? color : CARD_STROKE, 2);

  // Shared database shell that contains separate per-module schemas.
  b.node("db")
    .at(830, GATEWAY_Y)
    .rect(170, 280, 16)
    .fill(hot("db") ? "#1c2b1e" : DARK_BG)
    .stroke(hot("db") ? "#4ade80" : CARD_STROKE, 2);

  modules.forEach(({ id, label, y, x, schemaId, schemaLabel, schemaX }) => {
    b.node(id)
      .at(x, y)
      .rect(142, 42, 8)
      .fill(hot(id) ? HOT_FILL : DARK_BG)
      .stroke(hot(id) ? color : CARD_STROKE, 1.5)
      .label(label, { fill: TEXT_MAIN, fontSize: 9, fontWeight: "bold" });

    b.node(schemaId)
      .at(schemaX, y)
      .rect(68, 30, 6)
      .fill(hot(schemaId) ? "#1f3522" : "#111827")
      .stroke(hot(schemaId) ? "#4ade80" : CARD_STROKE, 1)
      .label(schemaLabel, {
        fill: hot(schemaId) ? "#bbf7d0" : TEXT_DIM,
        fontSize: 7.5,
        fontWeight: "bold",
      });

    b.edge(id, schemaId, `e-${id}-${schemaId}`)
      .stroke("#334155", 1)
      .arrow(true)
      .dashed();
  });

  b.edge("gateway", "app", "e-gw-app").stroke(CARD_STROKE, 1.5).arrow(true);
  b.edge("app", "db", "e-app-db").stroke(CARD_STROKE, 1.5).arrow(true);

  b.overlay((o) => {
    o.add(
      "text",
      {
        x: 520,
        y: 150,
        text: "Modular Monolith",
        fill: TEXT_MAIN,
        fontSize: 15,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "modulith-title" },
    );
    o.add(
      "text",
      {
        x: 520,
        y: 162,
        text: "Single deployment unit",
        fill: TEXT_DIM,
        fontSize: 9,
        textAnchor: "middle",
      },
      { key: "modulith-subtitle" },
    );
    o.add(
      "text",
      {
        x: 830,
        y: 150,
        text: "PostgreSQL",
        fill: TEXT_MAIN,
        fontSize: 14,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "db-title" },
    );
    o.add(
      "text",
      {
        x: 830,
        y: 162,
        text: "Separate schema per module",
        fill: TEXT_DIM,
        fontSize: 8,
        textAnchor: "middle",
      },
      { key: "db-subtitle" },
    );
  });
}

/** Microservices: 6 independent services, each with own DB */
function buildMicroScene(
  b: ReturnType<typeof viz>,
  hot: (id: string) => boolean,
  variant: VariantKey,
) {
  const color = VARIANT_PROFILES[variant].color;
  const services = [
    { id: "svc-0", label: "Catalog Svc", y: GATEWAY_Y - 120, x: 470 },
    { id: "svc-1", label: "Ordering Svc", y: GATEWAY_Y - 120, x: 690 },
    { id: "svc-2", label: "Basket Svc", y: GATEWAY_Y - 10, x: 470 },
    { id: "svc-3", label: "Identity Svc", y: GATEWAY_Y - 10, x: 690 },
    { id: "svc-4", label: "Payment Svc", y: GATEWAY_Y + 100, x: 470 },
    { id: "svc-5", label: "Shipment Svc", y: GATEWAY_Y + 100, x: 690 },
  ];

  services.forEach(({ id, label, x, y }, i) => {
    const dbId = `db-${i}`;

    b.node(id)
      .at(x, y)
      .rect(132, 40, 7)
      .fill(hot(id) ? HOT_FILL : DARK_BG)
      .stroke(hot(id) ? color : CARD_STROKE, 1.5)
      .label(label, { fill: TEXT_MAIN, fontSize: 9, fontWeight: "bold" });

    b.node(dbId)
      .at(x, y + 50)
      .rect(70, 28, 5)
      .fill(hot(dbId) ? "#1c2b1e" : DARK_BG)
      .stroke(hot(dbId) ? "#4ade80" : CARD_STROKE, 1)
      .label("Owned DB", { fill: TEXT_DIM, fontSize: 7.5, fontWeight: "bold" });

    b.edge("gateway", id, `e-gw-${id}`).stroke(CARD_STROKE, 1).arrow(true);
    b.edge(id, dbId, `e-${id}-${dbId}`)
      .stroke(CARD_STROKE, 1)
      .arrow(true)
      .dashed();
  });

  b.overlay((o) => {
    o.add(
      "text",
      {
        x: 595,
        y: 108,
        text: "Database-per-Service",
        fill: TEXT_MAIN,
        fontSize: 12,
        fontWeight: 700,
        textAnchor: "middle",
      },
      { key: "microservices-title" },
    );
    o.add(
      "text",
      {
        x: 595,
        y: 122,
        text: "Each service owns its private data",
        fill: TEXT_DIM,
        fontSize: 9,
        textAnchor: "middle",
      },
      { key: "microservices-subtitle" },
    );
    o.add(
      "text",
      {
        x: 595,
        y: 136,
        text: "Other services should use APIs or events, not direct DB access",
        fill: "#c4b5fd",
        fontSize: 8,
        textAnchor: "middle",
      },
      { key: "microservices-contract" },
    );
  });
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
  const fnLabels = [
    "auth",
    "order",
    "user",
    "catalog",
    "pay",
    "notify",
    "email",
    "search",
    "report",
    "cart",
    "review",
    "ship",
  ];

  for (let i = 0; i < 12; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const fnId = `fn-${i}`;
    const x = startX + col * spacingX;
    const y = startY + row * spacingY;

    b.node(fnId)
      .at(x, y)
      .circle(28)
      .fill(hot(fnId) ? "#1e3a1f" : DARK_BG)
      .stroke(hot(fnId) ? color : "#334155", 1.5)
      .label(`ƒ\n${fnLabels[i]}`, {
        fill: hot(fnId) ? color : TEXT_DIM,
        fontSize: 8,
      });

    b.edge("gateway", fnId, `e-gw-${fnId}`).stroke("#1e293b", 1).arrow(true);
  }

  void rows; // satisfy linter
}

/* ════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════ */

const ServiceEvolutionVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, signals } =
    useServiceEvolutionAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as ServiceEvolutionState;
  const {
    explanation,
    hotZones,
    phase,
    variant,
    deployTimeS,
    scaleLatencyS,
    blastRadius,
  } = st;
  const profile = VARIANT_PROFILES[variant];
  const hot = (zone: string) => hotZones.includes(zone);
  const showMicroserviceDataCard = variant === "microservices";

  /* ── Build VizCraft scene based on active variant ──── */
  const scene = (() => {
    const b = viz().view(W, H);

    buildClient(b, hot);
    buildGateway(b, hot);

    switch (variant) {
      case "monolith":
        buildMonolithScene(b, hot, variant);
        break;
      case "modular-monolith":
        buildModularMonolithScene(b, hot, variant);
        break;
      case "microservices":
        buildMicroScene(b, hot, variant);
        break;
      case "serverless":
        buildServerlessScene(b, hot, variant);
        break;
    }

    /* ── Signals overlay ─────────────────────────────── */
    if (signals.length > 0) {
      b.overlay((o) => {
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

  /* ── Mount / unmount ────────────────────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 0.9,
        initialPan: saved?.pan ?? { x: 20, y: 0 },
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

  /* ── Phase-driven className for fault visual ─────────── */
  const rootClass = [
    "service-evolution-root",
    `service-evolution-phase--${phase}`,
  ].join(" ");

  /* ── Concept pills ────────────────────────────────── */
  const pills = [
    {
      key: "monolith",
      label: "Monolith",
      color: "#94a3b8",
      borderColor: "#64748b",
    },
    {
      key: "modular-monolith",
      label: "Modular Monolith",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "microservices",
      label: "Microservices",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    {
      key: "serverless",
      label: "Serverless",
      color: "#6ee7b7",
      borderColor: "#10b981",
    },
    {
      key: "when-to-migrate",
      label: "When to Migrate",
      color: "#f9a8d4",
      borderColor: "#ec4899",
    },
    {
      key: "tradeoffs",
      label: "Trade-off Guide",
      color: "#fcd34d",
      borderColor: "#d97706",
    },
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
              title="Monolith → Serverless"
              subtitle={`${profile.label} · ${profile.accentText} · compare deploy, scale, and fault boundaries`}
            >
              <StatBadge
                label="Deploy"
                value={`~${deployTimeS}s`}
                color={
                  deployTimeS <= 8
                    ? "#4ade80"
                    : deployTimeS <= 45
                      ? "#fbbf24"
                      : "#f87171"
                }
              />
              <StatBadge
                label="Scale"
                value={`~${scaleLatencyS}s`}
                color={
                  scaleLatencyS <= 5
                    ? "#4ade80"
                    : scaleLatencyS <= 20
                      ? "#fbbf24"
                      : "#f87171"
                }
              />
              <StatBadge
                label="Blast %"
                value={`${blastRadius}%`}
                color={
                  blastRadius <= 5
                    ? "#4ade80"
                    : blastRadius <= 35
                      ? "#fbbf24"
                      : "#f87171"
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

            <SideCard label="Architecture traits" variant="info">
              <div className="service-evolution-traits">
                {traitKeys.map((key) => {
                  const meta = TRAIT_META[key];
                  const score = profile.traits[key];
                  const label = profile.traitLabels[key];
                  return (
                    <div key={key} className="service-evolution-trait-row">
                      <span className="service-evolution-trait-name">
                        {meta.label}
                      </span>
                      <div className="service-evolution-trait-bar-wrap">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span
                            key={i}
                            className={`service-evolution-trait-pip${i < score ? " active" : ""}`}
                            style={
                              i < score ? { background: profile.color } : {}
                            }
                          />
                        ))}
                      </div>
                      <span className="service-evolution-trait-label">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </SideCard>

            {showMicroserviceDataCard && (
              <SideCard label="Database-per-Service" variant="info">
                <div className="service-evolution-db-pattern">
                  <p>
                    Each database shown beneath a service is{" "}
                    <strong>private to that service</strong>. The owning service
                    is the only one allowed to read or write it directly.
                  </p>
                  <ul className="service-evolution-db-pattern__list">
                    <li>
                      Other services should call an API or consume an event, not
                      query the database directly.
                    </li>
                    <li>
                      That gives clear data ownership, independent schema
                      evolution, and per-service scaling.
                    </li>
                    <li>
                      It also enables polyglot persistence: one service can use
                      SQL while another uses a document or key-value store.
                    </li>
                  </ul>
                  <p className="service-evolution-db-pattern__warning">
                    Trade-off: joins and multi-service transactions stop being
                    simple database operations and become application-level
                    coordination problems.
                  </p>
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

export default ServiceEvolutionVisualization;
