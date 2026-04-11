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
  useLgplArchitectureAnimation,
  type Signal,
} from "./useLgplArchitectureAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1100;
const H = 700;

/* ── Colour palette ────────────────────────────────────── */
const C = {
  bg: "#0f172a",
  dim: "#334155",
  dimEdge: "#1e293b",
  muted: "#64748b",
  text: "#94a3b8",
  blue: "#60a5fa",
  blueFill: "#1e3a5f",
  amber: "#fbbf24",
  amberFill: "#78350f",
  purple: "#c084fc",
  purpleFill: "#3b0764",
  green: "#34d399",
  greenFill: "#064e3b",
  red: "#f87171",
  redFill: "#7f1d1d",
  teal: "#2dd4bf",
  tealFill: "#134e4a",
};

const LgplArchitectureVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, currentStep, signals, phase } =
    useLgplArchitectureAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const { explanation, hotZones, showLayers, showGates, showPipes, showLoops } =
    runtime;
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    /* ━━ LAYERS (left column, stacked) ━━━━━━━━━━━━━━━━━ */
    if (showLayers) {
      // Background panel for layers
      b.overlay((o) => {
        o.add(
          "rect",
          {
            x: 30,
            y: 40,
            w: 260,
            h: 620,
            rx: 16,
            ry: 16,
            fill: "rgba(15, 23, 42, 0.5)",
            stroke:
              hot("layer-presentation") ||
              hot("layer-business") ||
              hot("layer-data") ||
              hot("layer-db")
                ? "rgba(96, 165, 250, 0.35)"
                : "rgba(51, 65, 85, 0.4)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "layers-bg" },
        );
        o.add(
          "text",
          {
            x: 160,
            y: 30,
            text: "LAYERS",
            fill: C.blue,
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "layers-lbl" },
        );
      });

      b.node("layer-presentation")
        .at(160, 120)
        .rect(200, 55, 10)
        .fill(hot("layer-presentation") ? C.blueFill : C.bg)
        .stroke(
          hot("layer-presentation") ? C.blue : C.dim,
          hot("layer-presentation") ? 2.5 : 1,
        )
        .label("Presentation", {
          fill: hot("layer-presentation") ? "#93c5fd" : C.text,
          fontSize: 13,
          fontWeight: "bold",
        });

      b.node("layer-business")
        .at(160, 270)
        .rect(200, 55, 10)
        .fill(hot("layer-business") ? C.blueFill : C.bg)
        .stroke(
          hot("layer-business") ? C.blue : C.dim,
          hot("layer-business") ? 2.5 : 1,
        )
        .label("Business Logic", {
          fill: hot("layer-business") ? "#93c5fd" : C.text,
          fontSize: 13,
          fontWeight: "bold",
        });

      b.node("layer-data")
        .at(160, 420)
        .rect(200, 55, 10)
        .fill(hot("layer-data") ? C.blueFill : C.bg)
        .stroke(hot("layer-data") ? C.blue : C.dim, hot("layer-data") ? 2.5 : 1)
        .label("Data Access", {
          fill: hot("layer-data") ? "#93c5fd" : C.text,
          fontSize: 13,
          fontWeight: "bold",
        });

      b.node("layer-db")
        .at(160, 570)
        .rect(200, 55, 10)
        .fill(hot("layer-db") ? C.blueFill : C.bg)
        .stroke(hot("layer-db") ? C.blue : C.dim, hot("layer-db") ? 2.5 : 1)
        .label("Database", {
          fill: hot("layer-db") ? "#93c5fd" : C.text,
          fontSize: 13,
          fontWeight: "bold",
        });

      // Layer edges
      b.edge("layer-presentation", "layer-business", "e-l1")
        .stroke(
          hot("layer-presentation") || hot("layer-business")
            ? C.blue
            : C.dimEdge,
          1.5,
        )
        .arrow(true);
      b.edge("layer-business", "layer-data", "e-l2")
        .stroke(
          hot("layer-business") || hot("layer-data") ? C.blue : C.dimEdge,
          1.5,
        )
        .arrow(true);
      b.edge("layer-data", "layer-db", "e-l3")
        .stroke(hot("layer-data") || hot("layer-db") ? C.blue : C.dimEdge, 1.5)
        .arrow(true);

      // Layer subtitles
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: 160,
            y: 158,
            text: "(UI, REST API, GraphQL)",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "l-sub-1" },
        );
        o.add(
          "text",
          {
            x: 160,
            y: 308,
            text: "(rules, workflows, validation)",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "l-sub-2" },
        );
        o.add(
          "text",
          {
            x: 160,
            y: 458,
            text: "(repositories, ORM, queries)",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "l-sub-3" },
        );
        o.add(
          "text",
          {
            x: 160,
            y: 608,
            text: "(PostgreSQL, MongoDB, Redis)",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "l-sub-4" },
        );
      });
    }

    /* ━━ GATES (between presentation + business) ━━━━━━━ */
    if (showGates) {
      b.overlay((o) => {
        o.add(
          "rect",
          {
            x: 330,
            y: 70,
            w: 210,
            h: 310,
            rx: 14,
            ry: 14,
            fill: "rgba(15, 23, 42, 0.5)",
            stroke:
              hot("gate-auth") || hot("gate-validate") || hot("gate-rate")
                ? "rgba(251, 191, 36, 0.35)"
                : "rgba(51, 65, 85, 0.4)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "gates-bg" },
        );
        o.add(
          "text",
          {
            x: 435,
            y: 60,
            text: "GATES",
            fill: C.amber,
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "gates-lbl" },
        );
      });

      b.node("gate-auth")
        .at(435, 130)
        .rect(160, 44, 22)
        .fill(hot("gate-auth") ? C.amberFill : C.bg)
        .stroke(hot("gate-auth") ? C.amber : C.dim, hot("gate-auth") ? 2.5 : 1)
        .label("Auth Gate", {
          fill: hot("gate-auth") ? "#fde68a" : C.text,
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("gate-validate")
        .at(435, 225)
        .rect(160, 44, 22)
        .fill(hot("gate-validate") ? C.amberFill : C.bg)
        .stroke(
          hot("gate-validate") ? C.amber : C.dim,
          hot("gate-validate") ? 2.5 : 1,
        )
        .label("Validation Gate", {
          fill: hot("gate-validate") ? "#fde68a" : C.text,
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("gate-rate")
        .at(435, 320)
        .rect(160, 44, 22)
        .fill(hot("gate-rate") ? C.amberFill : C.bg)
        .stroke(hot("gate-rate") ? C.amber : C.dim, hot("gate-rate") ? 2.5 : 1)
        .label("Rate Limiter", {
          fill: hot("gate-rate") ? "#fde68a" : C.text,
          fontSize: 12,
          fontWeight: "bold",
        });

      // Gate edges: presentation → auth → validate → business
      b.edge("layer-presentation", "gate-auth", "e-g1")
        .stroke(hot("gate-auth") ? C.amber : C.dimEdge, 1.2)
        .arrow(true);
      b.edge("gate-auth", "gate-validate", "e-g2")
        .stroke(
          hot("gate-auth") || hot("gate-validate") ? C.amber : C.dimEdge,
          1.2,
        )
        .arrow(true);
      b.edge("gate-validate", "layer-business", "e-g3")
        .stroke(
          hot("gate-validate") || hot("layer-business") ? C.green : C.dimEdge,
          1.2,
        )
        .arrow(true);

      // Gate subtitles
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: 435,
            y: 162,
            text: "(JWT, OAuth, API key)",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "g-sub-1" },
        );
        o.add(
          "text",
          {
            x: 435,
            y: 257,
            text: "(schema, constraints, types)",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "g-sub-2" },
        );
        o.add(
          "text",
          {
            x: 435,
            y: 352,
            text: "(throttle, circuit breaker)",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "g-sub-3" },
        );
      });
    }

    /* ━━ PIPES (between business + data) ━━━━━━━━━━━━━━━ */
    if (showPipes) {
      b.overlay((o) => {
        o.add(
          "rect",
          {
            x: 330,
            y: 400,
            w: 210,
            h: 260,
            rx: 14,
            ry: 14,
            fill: "rgba(15, 23, 42, 0.5)",
            stroke:
              hot("pipe-serialize") ||
              hot("pipe-transform") ||
              hot("pipe-enrich")
                ? "rgba(192, 132, 252, 0.35)"
                : "rgba(51, 65, 85, 0.4)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "pipes-bg" },
        );
        o.add(
          "text",
          {
            x: 435,
            y: 390,
            text: "PIPES",
            fill: C.purple,
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "pipes-lbl" },
        );
      });

      b.node("pipe-serialize")
        .at(435, 458)
        .rect(160, 40, 8)
        .fill(hot("pipe-serialize") ? C.purpleFill : C.bg)
        .stroke(
          hot("pipe-serialize") ? C.purple : C.dim,
          hot("pipe-serialize") ? 2.5 : 1,
        )
        .label("Serialize", {
          fill: hot("pipe-serialize") ? "#d8b4fe" : C.text,
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("pipe-transform")
        .at(435, 533)
        .rect(160, 40, 8)
        .fill(hot("pipe-transform") ? C.purpleFill : C.bg)
        .stroke(
          hot("pipe-transform") ? C.purple : C.dim,
          hot("pipe-transform") ? 2.5 : 1,
        )
        .label("Transform", {
          fill: hot("pipe-transform") ? "#d8b4fe" : C.text,
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("pipe-enrich")
        .at(435, 608)
        .rect(160, 40, 8)
        .fill(hot("pipe-enrich") ? C.purpleFill : C.bg)
        .stroke(
          hot("pipe-enrich") ? C.purple : C.dim,
          hot("pipe-enrich") ? 2.5 : 1,
        )
        .label("Enrich", {
          fill: hot("pipe-enrich") ? "#d8b4fe" : C.text,
          fontSize: 12,
          fontWeight: "bold",
        });

      // Pipe edges
      b.edge("layer-business", "pipe-serialize", "e-p1")
        .stroke(hot("pipe-serialize") ? C.purple : C.dimEdge, 1.2)
        .arrow(true);
      b.edge("pipe-serialize", "pipe-transform", "e-p2")
        .stroke(
          hot("pipe-serialize") || hot("pipe-transform") ? C.purple : C.dimEdge,
          1.2,
        )
        .arrow(true);
      b.edge("pipe-transform", "pipe-enrich", "e-p3")
        .stroke(
          hot("pipe-transform") || hot("pipe-enrich") ? C.purple : C.dimEdge,
          1.2,
        )
        .arrow(true);
      b.edge("pipe-enrich", "layer-data", "e-p4")
        .stroke(
          hot("pipe-enrich") || hot("layer-data") ? C.purple : C.dimEdge,
          1.2,
        )
        .arrow(true);

      // Pipe subtitles
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: 435,
            y: 486,
            text: "(DTO → JSON / Protobuf)",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "p-sub-1" },
        );
        o.add(
          "text",
          {
            x: 435,
            y: 561,
            text: "(map, filter, aggregate)",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "p-sub-2" },
        );
        o.add(
          "text",
          {
            x: 435,
            y: 636,
            text: "(metadata, tracing, timestamps)",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "p-sub-3" },
        );
      });
    }

    /* ━━ LOOPS (right column) ━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    if (showLoops) {
      b.overlay((o) => {
        o.add(
          "rect",
          {
            x: 600,
            y: 200,
            w: 460,
            h: 460,
            rx: 16,
            ry: 16,
            fill: "rgba(15, 23, 42, 0.5)",
            stroke:
              hot("loop-retry") || hot("loop-event")
                ? "rgba(248, 113, 113, 0.35)"
                : "rgba(51, 65, 85, 0.4)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "loops-bg" },
        );
        o.add(
          "text",
          {
            x: 830,
            y: 190,
            text: "LOOPS",
            fill: C.red,
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "loops-lbl" },
        );
      });

      b.node("loop-retry")
        .at(720, 310)
        .rect(180, 60, 30)
        .fill(hot("loop-retry") ? C.redFill : C.bg)
        .stroke(hot("loop-retry") ? C.red : C.dim, hot("loop-retry") ? 2.5 : 1)
        .label("Retry Loop", {
          fill: hot("loop-retry") ? "#fca5a5" : C.text,
          fontSize: 13,
          fontWeight: "bold",
        });

      b.node("loop-event")
        .at(940, 310)
        .rect(180, 60, 30)
        .fill(hot("loop-event") ? C.tealFill : C.bg)
        .stroke(hot("loop-event") ? C.teal : C.dim, hot("loop-event") ? 2.5 : 1)
        .label("Event Loop", {
          fill: hot("loop-event") ? "#99f6e4" : C.text,
          fontSize: 13,
          fontWeight: "bold",
        });

      // Retry: data ↔ retry loop
      b.edge("layer-data", "loop-retry", "e-lr1")
        .stroke(hot("loop-retry") ? C.red : C.dimEdge, 1.2)
        .arrow(true);
      b.edge("loop-retry", "layer-data", "e-lr2")
        .stroke(hot("loop-retry") ? C.red : C.dimEdge, 1.2)
        .arrow(true)
        .dashed();

      // Event: event loop → business
      b.edge("loop-event", "layer-business", "e-le1")
        .stroke(hot("loop-event") ? C.teal : C.dimEdge, 1.2)
        .arrow(true);

      // Loop subtitles & details
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: 720,
            y: 356,
            text: "(exponential backoff, max retries)",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "lo-sub-1" },
        );
        o.add(
          "text",
          {
            x: 940,
            y: 356,
            text: "(async message processing)",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "lo-sub-2" },
        );

        // Retry cycle arrow hint
        o.add(
          "text",
          {
            x: 720,
            y: 260,
            text: "failure → wait → retry",
            fill: "#fca5a5",
            fontSize: 9,
            opacity: 0.8,
          },
          { key: "lo-retry-hint" },
        );
        o.add(
          "text",
          {
            x: 940,
            y: 260,
            text: "dequeue → dispatch → ack",
            fill: "#99f6e4",
            fontSize: 9,
            opacity: 0.8,
          },
          { key: "lo-event-hint" },
        );

        // Use-case examples
        o.add(
          "text",
          {
            x: 720,
            y: 400,
            text: "Transient DB failures",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "lo-ex-1a" },
        );
        o.add(
          "text",
          {
            x: 720,
            y: 414,
            text: "Network timeouts",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "lo-ex-1b" },
        );
        o.add(
          "text",
          {
            x: 720,
            y: 428,
            text: "Deadlock recovery",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "lo-ex-1c" },
        );

        o.add(
          "text",
          {
            x: 940,
            y: 400,
            text: "Kafka / RabbitMQ consumer",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "lo-ex-2a" },
        );
        o.add(
          "text",
          {
            x: 940,
            y: 414,
            text: "Webhook processing",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "lo-ex-2b" },
        );
        o.add(
          "text",
          {
            x: 940,
            y: 428,
            text: "CRON job scheduler",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "lo-ex-2c" },
        );

        // Polling loop
        o.add(
          "rect",
          {
            x: 760,
            y: 470,
            w: 150,
            h: 44,
            rx: 22,
            ry: 22,
            fill: C.bg,
            stroke:
              hot("loop-retry") || hot("loop-event")
                ? "rgba(251, 191, 36, 0.5)"
                : C.dim,
            strokeWidth: 1,
            opacity: 1,
          },
          { key: "lo-poll-bg" },
        );
        o.add(
          "text",
          {
            x: 835,
            y: 497,
            text: "Polling Loop",
            fill: C.amber,
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "lo-poll-lbl" },
        );
        o.add(
          "text",
          {
            x: 835,
            y: 530,
            text: "(health checks, state sync)",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "lo-poll-sub" },
        );

        // Reconciliation loop
        o.add(
          "rect",
          {
            x: 760,
            y: 558,
            w: 150,
            h: 44,
            rx: 22,
            ry: 22,
            fill: C.bg,
            stroke:
              hot("loop-retry") || hot("loop-event")
                ? "rgba(96, 165, 250, 0.5)"
                : C.dim,
            strokeWidth: 1,
            opacity: 1,
          },
          { key: "lo-recon-bg" },
        );
        o.add(
          "text",
          {
            x: 835,
            y: 585,
            text: "Reconciliation",
            fill: C.blue,
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "lo-recon-lbl" },
        );
        o.add(
          "text",
          {
            x: 835,
            y: 618,
            text: "(eventual consistency, drift repair)",
            fill: C.muted,
            fontSize: 8,
          },
          { key: "lo-recon-sub" },
        );
      });
    }

    /* ── Signals ────────────────────────────────────────── */
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

  /* ── Mount (once) / commit (updates) VizCraft scene ── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? viewportRef.current;

    if (!builderRef.current) {
      builderRef.current = scene;
      pzRef.current =
        scene.mount(containerRef.current, {
          autoplay: true,
          panZoom: true,
          initialZoom: saved?.zoom ?? 1,
          initialPan: saved?.pan ?? { x: 0, y: 0 },
        }) ?? null;
    } else {
      scene.commit(containerRef.current);
      builderRef.current = scene;
      if (saved) {
        pzRef.current?.setZoom(saved.zoom);
        pzRef.current?.setPan(saved.pan);
      }
    }

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
      key: "layers",
      label: "Layers",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    { key: "gates", label: "Gates", color: "#fde68a", borderColor: "#f59e0b" },
    { key: "pipes", label: "Pipes", color: "#d8b4fe", borderColor: "#a855f7" },
    { key: "loops", label: "Loops", color: "#fca5a5", borderColor: "#ef4444" },
  ];

  const subtitles: Record<string, string> = {
    overview: "Layers, Gates, Pipes, and Loops",
    layers: "Horizontal tiers of responsibility",
    "layer-detail": "Encapsulated concerns per tier",
    gates: "Conditional routing and validation",
    "gate-routing": "Auth → Validation → Business Logic",
    pipes: "Data transformation channels",
    "pipe-transform": "Serialize → Transform → Enrich",
    loops: "Feedback and retry cycles",
    "loop-feedback": "Retry, event, polling, reconciliation",
    "full-flow": "All four primitives working together",
    summary: "Composable architecture primitives",
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="lgpl-architecture-root">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="lgpl-architecture-stage">
            <StageHeader
              title="LGPL Architecture"
              subtitle={subtitles[phase] ?? ""}
            >
              <StatBadge
                label="Phase"
                value={phase.replace(/-/g, " ")}
                className={`lgpl-architecture-phase lgpl-architecture-phase--${phase}`}
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
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default LgplArchitectureVisualization;
