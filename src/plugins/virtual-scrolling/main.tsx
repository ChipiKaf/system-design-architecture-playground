import React, { useMemo, useLayoutEffect, useRef, useEffect } from "react";
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
  useVirtualScrollingAnimation,
  type Signal,
} from "./useVirtualScrollingAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1000;
const H = 620;

/* ── Colour palette ──────────────────────────────────── */
const C = {
  bg: "#0f172a",
  dim: "#334155",
  dimEdge: "#1e293b",
  muted: "#64748b",
  text: "#94a3b8",
  blue: "#60a5fa",
  blueFill: "#1e3a5f",
  cyan: "#06b6d4",
  cyanFill: "#083344",
  green: "#34d399",
  greenFill: "#064e3b",
  amber: "#fbbf24",
  amberFill: "#451a03",
  red: "#f87171",
  redFill: "#450a0a",
  violet: "#a78bfa",
  violetFill: "#2e1065",
  pink: "#f472b6",
  pinkFill: "#500724",
};

const VirtualScrollingVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, currentStep, signals, phase } =
    useVirtualScrollingAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const {
    explanation,
    hotZones,
    showFullTable,
    showViewport,
    showVisibleRows,
    showSpacers,
    showScrollHandler,
    showOverscan,
    showMemoryBar,
    showLibraries,
    showDomCount,
    showRecalc,
    showOverflowMyth,
    showRealCost,
  } = runtime;
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = useMemo(() => {
    const b = viz().view(W, H);

    /* ── Background regions ──────────────────────────────── */
    // Left: Data source & browser
    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 20,
          y: 15,
          w: 280,
          h: 590,
          rx: 16,
          ry: 16,
          fill: "rgba(15, 23, 42, 0.4)",
          stroke: "rgba(51, 65, 85, 0.3)",
          strokeWidth: 1,
          opacity: 1,
        },
        { key: "left-bg" },
      );
      o.add(
        "text",
        {
          x: 45,
          y: 12,
          text: "DATA & DOM",
          fill: "#475569",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "left-lbl" },
      );
    });

    // Center: Virtual scrolling engine
    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 320,
          y: 15,
          w: 360,
          h: 590,
          rx: 16,
          ry: 16,
          fill: "rgba(15, 23, 42, 0.35)",
          stroke: "rgba(51, 65, 85, 0.25)",
          strokeWidth: 1,
          opacity: 1,
        },
        { key: "center-bg" },
      );
      o.add(
        "text",
        {
          x: 340,
          y: 12,
          text: "VIRTUAL SCROLLING ENGINE",
          fill: "#475569",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "center-lbl" },
      );
    });

    // Right: Output & libraries
    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 700,
          y: 15,
          w: 280,
          h: 590,
          rx: 16,
          ry: 16,
          fill: "rgba(15, 23, 42, 0.3)",
          stroke: "rgba(51, 65, 85, 0.25)",
          strokeWidth: 1,
          opacity: 1,
        },
        { key: "right-bg" },
      );
      o.add(
        "text",
        {
          x: 720,
          y: 12,
          text: "OUTPUT & TOOLS",
          fill: "#475569",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "right-lbl" },
      );
    });

    /* ── NODES ────────────────────────────────────────── */

    // App / React component
    b.node("app")
      .at(150, 55)
      .rect(120, 36, 10)
      .fill(hot("app") ? C.blueFill : C.bg)
      .stroke(hot("app") ? C.blue : C.dim, hot("app") ? 2 : 1.5)
      .label("App ⚛️", {
        fill: hot("app") ? "#93c5fd" : "#e2e8f0",
        fontSize: 13,
        fontWeight: "bold",
      });

    // Data source (10K items)
    b.node("data-source")
      .at(150, 150)
      .rect(140, 36, 10)
      .fill(hot("data-source") ? C.amberFill : C.bg)
      .stroke(
        hot("data-source") ? C.amber : C.dim,
        hot("data-source") ? 2 : 1.5,
      )
      .label("data[] (10,000 items)", {
        fill: hot("data-source") ? "#fde68a" : C.text,
        fontSize: 11,
        fontWeight: "bold",
      });

    // DOM tree
    b.node("dom-tree")
      .at(150, 260)
      .rect(130, 36, 10)
      .fill(hot("dom-tree") ? C.redFill : C.bg)
      .stroke(hot("dom-tree") ? C.red : C.dim, hot("dom-tree") ? 2 : 1.5)
      .label("DOM Tree 🌳", {
        fill: hot("dom-tree") ? "#fca5a5" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    // Browser (layout + paint)
    b.node("browser")
      .at(150, 370)
      .rect(140, 36, 10)
      .fill(hot("browser") ? "#451a03" : C.bg)
      .stroke(hot("browser") ? "#f59e0b" : C.dim, hot("browser") ? 2 : 1.5)
      .label("Layout → Paint 🎨", {
        fill: hot("browser") ? "#fde68a" : C.text,
        fontSize: 11,
        fontWeight: "bold",
      });

    // Container (scrollable div)
    b.node("container")
      .at(500, 55)
      .rect(140, 32, 8)
      .fill(hot("container") ? C.cyanFill : C.bg)
      .stroke(hot("container") ? C.cyan : C.dim, hot("container") ? 2 : 1.5)
      .label("Container (overflow: auto)", {
        fill: hot("container") ? "#67e8f9" : C.muted,
        fontSize: 10,
        fontWeight: "bold",
      });

    // Viewport window
    if (showViewport) {
      b.node("viewport")
        .at(500, 170)
        .rect(160, 44, 12)
        .fill(hot("viewport") ? C.cyanFill : C.bg)
        .stroke(hot("viewport") ? C.cyan : C.dim, hot("viewport") ? 2.5 : 1.5)
        .label("Viewport Window 🔭", {
          fill: hot("viewport") ? "#67e8f9" : "#e2e8f0",
          fontSize: 12,
          fontWeight: "bold",
        });
    }

    // Visible rows
    if (showVisibleRows) {
      b.node("visible-rows")
        .at(500, 300)
        .rect(150, 44, 12)
        .fill(hot("visible-rows") ? C.greenFill : C.bg)
        .stroke(
          hot("visible-rows") ? C.green : C.dim,
          hot("visible-rows") ? 2.5 : 1.5,
        )
        .label("Visible Rows (~10)", {
          fill: hot("visible-rows") ? "#6ee7b7" : "#e2e8f0",
          fontSize: 12,
          fontWeight: "bold",
        });
    }

    // Scroll handler
    if (showScrollHandler) {
      b.node("scroll-handler")
        .at(500, 430)
        .rect(160, 32, 8)
        .fill(hot("scroll-handler") ? C.pinkFill : C.bg)
        .stroke(
          hot("scroll-handler") ? C.pink : C.dim,
          hot("scroll-handler") ? 2 : 1.5,
        )
        .label("onScroll → recalculate", {
          fill: hot("scroll-handler") ? "#f9a8d4" : C.muted,
          fontSize: 10,
          fontWeight: "bold",
        });
    }

    // Spacer top
    if (showSpacers) {
      b.node("spacer-top")
        .at(370, 240)
        .rect(100, 26, 6)
        .fill(hot("spacer-top") ? C.amberFill : C.bg)
        .stroke(hot("spacer-top") ? C.amber : C.dim, 1.5)
        .label("Spacer ↑", {
          fill: hot("spacer-top") ? "#fde68a" : C.muted,
          fontSize: 10,
          fontWeight: "bold",
        });

      // Spacer bottom
      b.node("spacer-bot")
        .at(630, 240)
        .rect(100, 26, 6)
        .fill(hot("spacer-bot") ? C.amberFill : C.bg)
        .stroke(hot("spacer-bot") ? C.amber : C.dim, 1.5)
        .label("Spacer ↓", {
          fill: hot("spacer-bot") ? "#fde68a" : C.muted,
          fontSize: 10,
          fontWeight: "bold",
        });
    }

    // Overscan rows
    if (showOverscan) {
      b.node("overscan-top")
        .at(370, 340)
        .rect(90, 24, 6)
        .fill(hot("overscan-top") ? C.violetFill : C.bg)
        .stroke(hot("overscan-top") ? C.violet : C.dim, 1.5)
        .label("+3 above", {
          fill: hot("overscan-top") ? "#c4b5fd" : C.muted,
          fontSize: 10,
          fontWeight: "bold",
        });

      b.node("overscan-bot")
        .at(630, 340)
        .rect(90, 24, 6)
        .fill(hot("overscan-bot") ? C.violetFill : C.bg)
        .stroke(hot("overscan-bot") ? C.violet : C.dim, 1.5)
        .label("+3 below", {
          fill: hot("overscan-bot") ? "#c4b5fd" : C.muted,
          fontSize: 10,
          fontWeight: "bold",
        });
    }

    // Libraries
    if (showLibraries) {
      b.node("lib-rw")
        .at(810, 160)
        .rect(130, 32, 8)
        .fill(hot("lib-rw") ? C.greenFill : C.bg)
        .stroke(hot("lib-rw") ? C.green : C.dim, 1.5)
        .label("react-window", {
          fill: hot("lib-rw") ? "#6ee7b7" : C.muted,
          fontSize: 11,
          fontWeight: "bold",
        });

      b.node("lib-tv")
        .at(810, 230)
        .rect(130, 32, 8)
        .fill(hot("lib-tv") ? C.greenFill : C.bg)
        .stroke(hot("lib-tv") ? C.green : C.dim, 1.5)
        .label("@tanstack/virtual", {
          fill: hot("lib-tv") ? "#6ee7b7" : C.muted,
          fontSize: 11,
          fontWeight: "bold",
        });
    }

    /* ── EDGES ────────────────────────────────────────── */

    // App → data source
    b.edge("app", "data-source", "e-app-ds")
      .stroke(hot("data-source") ? C.amber : C.dimEdge, 1.5)
      .arrow(true);

    // Data → DOM
    b.edge("data-source", "dom-tree", "e-ds-dom")
      .stroke(hot("dom-tree") ? C.red : C.dimEdge, 1.5)
      .arrow(true);

    // DOM → Browser
    b.edge("dom-tree", "browser", "e-dom-brow")
      .stroke(hot("browser") ? "#f59e0b" : C.dimEdge, 1.5)
      .arrow(true);

    // Container → Viewport
    if (showViewport) {
      b.edge("container", "viewport", "e-cont-vp")
        .stroke(hot("viewport") ? C.cyan : C.dimEdge, 1.5)
        .arrow(true);
    }

    // Viewport → Visible rows
    if (showViewport && showVisibleRows) {
      b.edge("viewport", "visible-rows", "e-vp-vis")
        .stroke(hot("visible-rows") ? C.green : C.dimEdge, 1.5)
        .arrow(true);
    }

    // Visible rows → DOM
    if (showVisibleRows) {
      b.edge("visible-rows", "dom-tree", "e-vis-dom")
        .stroke(hot("dom-tree") ? "#34d399" : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Scroll handler → visible rows
    if (showScrollHandler && showVisibleRows) {
      b.edge("scroll-handler", "visible-rows", "e-sh-vis")
        .stroke(hot("visible-rows") ? C.pink : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Viewport → scroll handler
    if (showScrollHandler && showViewport) {
      b.edge("viewport", "scroll-handler", "e-vp-sh")
        .stroke(hot("scroll-handler") ? C.pink : C.dimEdge, 1.5)
        .arrow(true);
    }

    // Spacers → viewport
    if (showSpacers && showViewport) {
      b.edge("spacer-top", "viewport", "e-st-vp")
        .stroke(hot("spacer-top") ? C.amber : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
      b.edge("spacer-bot", "viewport", "e-sb-vp")
        .stroke(hot("spacer-bot") ? C.amber : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    /* ── Step-specific overlays ───────────────────────── */
    b.overlay((o) => {
      // Full table warning (steps 0-2)
      if (showFullTable) {
        const rowCount = 8;
        for (let i = 0; i < rowCount; i++) {
          const y = 470 + i * 16;
          const opacity = 1 - i * 0.1;
          o.add(
            "rect",
            {
              x: 70,
              y,
              w: 170,
              h: 12,
              rx: 2,
              ry: 2,
              fill: `rgba(248, 113, 113, ${0.15 * opacity})`,
              stroke: `rgba(248, 113, 113, ${0.3 * opacity})`,
              strokeWidth: 1,
              opacity: 1,
            },
            { key: `ftrow-${i}` },
          );
          o.add(
            "text",
            {
              x: 155,
              y: y + 9,
              text: i < 7 ? `Row ${i * 1400}` : "… 10,000",
              fill: `rgba(252, 165, 165, ${opacity})`,
              fontSize: 8,
              fontWeight: "bold",
            },
            { key: `ftlbl-${i}` },
          );
        }
      }

      // DOM count overlay
      if (showDomCount) {
        const isSmall = showVisibleRows && !showFullTable;
        o.add(
          "rect",
          {
            x: 730,
            y: 50,
            w: 180,
            h: 50,
            rx: 10,
            ry: 10,
            fill: isSmall
              ? "rgba(52, 211, 153, 0.08)"
              : "rgba(239, 68, 68, 0.08)",
            stroke: isSmall
              ? "rgba(52, 211, 153, 0.3)"
              : "rgba(239, 68, 68, 0.3)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "dom-count-bg" },
        );
        o.add(
          "text",
          {
            x: 820,
            y: 68,
            text: "DOM Nodes",
            fill: "#94a3b8",
            fontSize: 10,
            fontWeight: "bold",
          },
          { key: "dom-count-lbl" },
        );
        o.add(
          "text",
          {
            x: 820,
            y: 88,
            text: isSmall ? "~15" : "~50,000",
            fill: isSmall ? "#34d399" : "#f87171",
            fontSize: 18,
            fontWeight: "bold",
          },
          { key: "dom-count-val" },
        );
      }

      // Memory bar
      if (showMemoryBar) {
        const isOptimized = showVisibleRows && !showFullTable;
        const barW = isOptimized ? 40 : 160;
        o.add(
          "rect",
          {
            x: 730,
            y: 115,
            w: 180,
            h: 30,
            rx: 6,
            ry: 6,
            fill: "rgba(15, 23, 42, 0.6)",
            stroke: "rgba(51, 65, 85, 0.3)",
            strokeWidth: 1,
            opacity: 1,
          },
          { key: "mem-outer" },
        );
        o.add(
          "rect",
          {
            x: 735,
            y: 119,
            w: barW,
            h: 22,
            rx: 4,
            ry: 4,
            fill: isOptimized
              ? "rgba(52, 211, 153, 0.5)"
              : "rgba(239, 68, 68, 0.5)",
            stroke: "none",
            strokeWidth: 0,
            opacity: 1,
          },
          { key: "mem-fill" },
        );
        o.add(
          "text",
          {
            x: 820,
            y: 134,
            text: isOptimized ? "~0.3 MB" : "~45 MB",
            fill: isOptimized ? "#6ee7b7" : "#fca5a5",
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "mem-val" },
        );
      }

      // Recalculate formula
      if (showRecalc) {
        o.add(
          "rect",
          {
            x: 355,
            y: 510,
            w: 300,
            h: 60,
            rx: 10,
            ry: 10,
            fill: "rgba(244, 114, 182, 0.06)",
            stroke: "rgba(244, 114, 182, 0.3)",
            strokeWidth: 1,
            opacity: 1,
          },
          { key: "recalc-bg" },
        );
        const formulas = [
          "startIndex = ⌊scrollTop / rowHeight⌋",
          "endIndex = startIndex + visibleCount",
        ];
        formulas.forEach((t, i) => {
          o.add(
            "text",
            {
              x: 505,
              y: 530 + i * 18,
              text: t,
              fill: "#f9a8d4",
              fontSize: 11,
              fontWeight: "bold",
            },
            { key: `recalc-${i}` },
          );
        });
      }

      // Overscan labels
      if (showOverscan) {
        o.add(
          "text",
          {
            x: 500,
            y: 380,
            text: "overscan buffer prevents white flash",
            fill: "#a78bfa",
            fontSize: 10,
            fontWeight: "bold",
          },
          { key: "overscan-lbl" },
        );
      }

      // Overflow myth overlay
      if (showOverflowMyth) {
        o.add(
          "rect",
          {
            x: 325,
            y: 410,
            w: 340,
            h: 120,
            rx: 12,
            ry: 12,
            fill: "rgba(239, 68, 68, 0.06)",
            stroke: "rgba(239, 68, 68, 0.3)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "myth-bg" },
        );
        o.add(
          "text",
          {
            x: 495,
            y: 432,
            text: "\u2717  overflow: auto  \u2260  fewer DOM nodes",
            fill: "#f87171",
            fontSize: 12,
            fontWeight: "bold",
          },
          { key: "myth-title" },
        );
        const mythLines = [
          "\u2714  Clips painted pixels (cheap)",
          "\u2718  Still creates ALL 10K nodes (expensive)",
          "\u2718  Still runs layout on ALL 10K (expensive)",
        ];
        mythLines.forEach((t, i) => {
          o.add(
            "text",
            {
              x: 495,
              y: 458 + i * 20,
              text: t,
              fill: i === 0 ? "#86efac" : "#fca5a5",
              fontSize: 11,
              fontWeight: "bold",
            },
            { key: `myth-line-${i}` },
          );
        });
      }

      // Real cost breakdown
      if (showRealCost) {
        const costs = [
          { label: "DOM Creation", pct: 40, color: "rgba(248, 113, 113, 0.6)" },
          {
            label: "Layout / Reflow",
            pct: 45,
            color: "rgba(251, 191, 36, 0.6)",
          },
          { label: "Paint", pct: 15, color: "rgba(52, 211, 153, 0.5)" },
        ];
        let xOff = 340;
        costs.forEach((c, i) => {
          const w = c.pct * 3;
          o.add(
            "rect",
            {
              x: xOff,
              y: 546,
              w,
              h: 22,
              rx: 4,
              ry: 4,
              fill: c.color,
              stroke: "none",
              strokeWidth: 0,
              opacity: 1,
            },
            { key: `cost-bar-${i}` },
          );
          o.add(
            "text",
            {
              x: xOff + w / 2,
              y: 561,
              text: `${c.label} ${c.pct}%`,
              fill: "#e2e8f0",
              fontSize: 9,
              fontWeight: "bold",
            },
            { key: `cost-lbl-${i}` },
          );
          xOff += w + 4;
        });
        o.add(
          "text",
          {
            x: 495,
            y: 584,
            text: "overflow:auto only skips Paint (15%)",
            fill: "#94a3b8",
            fontSize: 10,
            fontWeight: "bold",
          },
          { key: "cost-note" },
        );
      }
    });

    /* ── Signals ──────────────────────────────────────── */
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig) => {
          const { id, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, { key: id });
        });
      });
    }

    return b;
  }, [
    currentStep,
    hotZones,
    showFullTable,
    showViewport,
    showVisibleRows,
    showSpacers,
    showScrollHandler,
    showOverscan,
    showMemoryBar,
    showLibraries,
    showDomCount,
    showRecalc,
    showOverflowMyth,
    showRealCost,
    signals,
  ]);

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
  const pills = [
    {
      key: "dom-nodes",
      label: "DOM Nodes",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "reflow-repaint",
      label: "Reflow",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "viewport",
      label: "Viewport",
      color: "#67e8f9",
      borderColor: "#06b6d4",
    },
    {
      key: "virtual-list",
      label: "Virtual List",
      color: "#6ee7b7",
      borderColor: "#10b981",
    },
    {
      key: "overscan",
      label: "Overscan",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    {
      key: "spacer-trick",
      label: "Spacer Trick",
      color: "#fde68a",
      borderColor: "#d97706",
    },
    {
      key: "scroll-handler",
      label: "Scroll Handler",
      color: "#f9a8d4",
      borderColor: "#ec4899",
    },
    {
      key: "windowing-libraries",
      label: "Libraries",
      color: "#bbf7d0",
      borderColor: "#22c55e",
    },
  ];

  /* ── Phase labels ───────────────────────────────────── */
  const phaseLabel: Record<string, string> = {
    overview: "The Problem",
    "browser-render": "DOM Creation",
    "overflow-myth": "The Myth",
    "real-cost": "Real Cost",
    "key-insight": "Key Insight",
    "viewport-container": "Container",
    "calc-visible": "Calculate",
    "render-visible": "Render Visible",
    "scroll-event": "Scroll Event",
    "spacer-trick": "Spacer Trick",
    overscan: "Overscan",
    summary: "Summary",
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`virtual-scrolling-root virtual-scrolling-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="virtual-scrolling-stage">
            <StageHeader
              title="Virtual Scrolling"
              subtitle="Render 10,000 rows with the DOM cost of 10"
            >
              <StatBadge
                label="Focus"
                value={phaseLabel[phase] ?? phase}
                color="#06b6d4"
              />
              <StatBadge
                label="Step"
                value={`${currentStep} / 11`}
                color="#a78bfa"
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

export default VirtualScrollingVisualization;
