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
  useReactBestPracticesAnimation,
  type Signal,
} from "./useReactBestPracticesAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 600;

/* ── Colour palette ──────────────────────────────────── */
const C = {
  bg: "#0f172a",
  dim: "#334155",
  dimEdge: "#1e293b",
  muted: "#64748b",
  text: "#94a3b8",
  blue: "#60a5fa",
  blueFill: "#1e3a5f",
  violet: "#a78bfa",
  violetFill: "#2e1065",
  purple: "#c084fc",
  purpleFill: "#1a0533",
  green: "#34d399",
  greenFill: "#064e3b",
  amber: "#fbbf24",
  amberFill: "#451a03",
  red: "#f87171",
  redFill: "#450a0a",
  cyan: "#06b6d4",
  cyanFill: "#083344",
  pink: "#f472b6",
  pinkFill: "#500724",
};

const ReactBestPracticesVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, currentStep, signals, phase } =
    useReactBestPracticesAnimation(onAnimationComplete);
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
    showClassBad,
    showFuncGood,
    showMemoShield,
    showVdomDiff,
    showFolders,
    showHookExtract,
    showTheme,
    showLint,
    showA11y,
  } = runtime;
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = useMemo(() => {
    const b = viz().view(W, H);

    /* ── Component tree background ────────────────────── */
    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 60,
          y: 22,
          w: 780,
          h: 370,
          rx: 16,
          ry: 16,
          fill: "rgba(15, 23, 42, 0.4)",
          stroke: "rgba(51, 65, 85, 0.35)",
          strokeWidth: 1,
          opacity: 1,
        },
        { key: "tree-bg" },
      );
      o.add(
        "text",
        {
          x: 80,
          y: 18,
          text: "COMPONENT TREE",
          fill: "#475569",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "tree-lbl" },
      );
    });

    /* ── Infrastructure background ────────────────────── */
    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 60,
          y: 410,
          w: 780,
          h: 65,
          rx: 12,
          ry: 12,
          fill: "rgba(15, 23, 42, 0.3)",
          stroke: "rgba(51, 65, 85, 0.25)",
          strokeWidth: 1,
          opacity: 1,
        },
        { key: "infra-bg" },
      );
      o.add(
        "text",
        {
          x: 80,
          y: 406,
          text: "INFRASTRUCTURE",
          fill: "#475569",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "infra-lbl" },
      );
    });

    /* ── Nodes ────────────────────────────────────────── */

    // Root
    b.node("app")
      .at(450, 55)
      .rect(120, 42, 10)
      .fill(hot("app") ? C.blueFill : C.bg)
      .stroke(hot("app") ? C.blue : C.dim, hot("app") ? 2 : 1.5)
      .label("App ⚛️", {
        fill: hot("app") ? "#93c5fd" : "#e2e8f0",
        fontSize: 14,
        fontWeight: "bold",
      });

    // Row 2: direct children
    b.node("header")
      .at(160, 170)
      .rect(120, 40, 10)
      .fill(hot("header") ? C.blueFill : C.bg)
      .stroke(hot("header") ? C.blue : C.dim, hot("header") ? 2 : 1.5)
      .label("Header", {
        fill: hot("header") ? "#93c5fd" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    b.node("main")
      .at(450, 170)
      .rect(130, 40, 10)
      .fill(hot("main") ? C.violetFill : C.bg)
      .stroke(hot("main") ? C.violet : C.dim, hot("main") ? 2 : 1.5)
      .label("Content", {
        fill: hot("main") ? "#c4b5fd" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    b.node("footer")
      .at(740, 170)
      .rect(120, 40, 10)
      .fill(hot("footer") ? C.blueFill : C.bg)
      .stroke(hot("footer") ? C.blue : C.dim, hot("footer") ? 2 : 1.5)
      .label("Footer", {
        fill: hot("footer") ? "#93c5fd" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    // Row 3: grandchildren
    b.node("list")
      .at(340, 310)
      .rect(130, 40, 10)
      .fill(hot("list") ? C.greenFill : C.bg)
      .stroke(hot("list") ? C.green : C.dim, hot("list") ? 2 : 1.5)
      .label("ProductList", {
        fill: hot("list") ? "#6ee7b7" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    b.node("card")
      .at(570, 310)
      .rect(130, 40, 10)
      .fill(hot("card") ? C.amberFill : C.bg)
      .stroke(hot("card") ? C.amber : C.dim, hot("card") ? 2 : 1.5)
      .label("ProductCard", {
        fill: hot("card") ? "#fde68a" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    // Infrastructure row
    b.node("hooks")
      .at(170, 440)
      .rect(120, 32, 8)
      .fill(hot("hooks") ? C.purpleFill : C.bg)
      .stroke(hot("hooks") ? C.purple : C.dim, hot("hooks") ? 2 : 1.5)
      .label("Custom Hooks 🪝", {
        fill: hot("hooks") ? "#d8b4fe" : C.muted,
        fontSize: 11,
        fontWeight: "bold",
      });

    b.node("state")
      .at(450, 440)
      .rect(120, 32, 8)
      .fill(hot("state") ? C.cyanFill : C.bg)
      .stroke(hot("state") ? C.cyan : C.dim, hot("state") ? 2 : 1.5)
      .label("State Store 🗃️", {
        fill: hot("state") ? "#67e8f9" : C.muted,
        fontSize: 11,
        fontWeight: "bold",
      });

    b.node("styles")
      .at(730, 440)
      .rect(120, 32, 8)
      .fill(hot("styles") ? C.pinkFill : C.bg)
      .stroke(hot("styles") ? C.pink : C.dim, hot("styles") ? 2 : 1.5)
      .label("Styles 🎨", {
        fill: hot("styles") ? "#f9a8d4" : C.muted,
        fontSize: 11,
        fontWeight: "bold",
      });

    // Output
    b.node("dom")
      .at(450, 540)
      .rect(140, 38, 10)
      .fill(hot("dom") ? C.cyanFill : C.bg)
      .stroke(hot("dom") ? C.cyan : C.dim, hot("dom") ? 2 : 1.5)
      .label("Browser DOM 🖥️", {
        fill: hot("dom") ? "#67e8f9" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    /* ── Edges ────────────────────────────────────────── */

    // App → children (always visible)
    b.edge("app", "header", "e-app-header")
      .stroke(hot("header") ? C.blue : C.dimEdge, 1.5)
      .arrow(true);
    b.edge("app", "main", "e-app-main")
      .stroke(hot("main") ? C.violet : C.dimEdge, 1.5)
      .arrow(true);
    b.edge("app", "footer", "e-app-footer")
      .stroke(hot("footer") ? C.blue : C.dimEdge, 1.5)
      .arrow(true);

    // Content → children (visible from step 2+)
    if (currentStep >= 2) {
      b.edge("main", "list", "e-main-list")
        .stroke(hot("list") ? C.green : C.dimEdge, 1.5)
        .arrow(true);
      b.edge("main", "card", "e-main-card")
        .stroke(hot("card") ? C.amber : C.dimEdge, 1.5)
        .arrow(true);
    }

    // Components → DOM (visible from step 4+)
    if (currentStep >= 4) {
      b.edge("list", "dom", "e-list-dom")
        .stroke(hot("dom") ? C.cyan : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
      b.edge("card", "dom", "e-card-dom")
        .stroke(hot("dom") ? C.cyan : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }
    if (currentStep >= 9) {
      b.edge("header", "dom", "e-header-dom")
        .stroke(hot("dom") ? "#38bdf8" : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Infrastructure → components (visible from step 5+)
    if (currentStep >= 5) {
      b.edge("hooks", "list", "e-hooks-list")
        .stroke(hot("hooks") ? C.purple : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
      b.edge("hooks", "card", "e-hooks-card")
        .stroke(hot("hooks") ? C.purple : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }
    if (currentStep >= 5) {
      b.edge("state", "main", "e-state-main")
        .stroke(hot("state") ? C.cyan : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }
    if (currentStep >= 7) {
      b.edge("styles", "header", "e-styles-header")
        .stroke(hot("styles") ? C.pink : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
      b.edge("styles", "footer", "e-styles-footer")
        .stroke(hot("styles") ? C.pink : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    /* ── Step-specific overlays ───────────────────────── */
    b.overlay((o) => {
      // Class → Function labels (Step 1)
      if (showClassBad) {
        const badNodes = [
          { x: 160, y: 130 },
          { x: 450, y: 130 },
          { x: 740, y: 130 },
        ];
        badNodes.forEach((n, i) => {
          o.add(
            "rect",
            {
              x: n.x - 28,
              y: n.y - 8,
              w: 56,
              h: 16,
              rx: 4,
              ry: 4,
              fill: "rgba(239, 68, 68, 0.15)",
              stroke: "rgba(239, 68, 68, 0.4)",
              strokeWidth: 1,
              opacity: 1,
            },
            { key: `class-bg-${i}` },
          );
          o.add(
            "text",
            {
              x: n.x,
              y: n.y + 4,
              text: "class ✗",
              fill: "#f87171",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: `class-lbl-${i}` },
          );
        });
      }

      if (showFuncGood && currentStep <= 1) {
        const goodNodes = [
          { x: 160, y: 130 },
          { x: 450, y: 130 },
          { x: 740, y: 130 },
        ];
        goodNodes.forEach((n, i) => {
          o.add(
            "rect",
            {
              x: n.x - 38,
              y: n.y - 8,
              w: 76,
              h: 16,
              rx: 4,
              ry: 4,
              fill: "rgba(52, 211, 153, 0.15)",
              stroke: "rgba(52, 211, 153, 0.4)",
              strokeWidth: 1,
              opacity: 1,
            },
            { key: `func-bg-${i}` },
          );
          o.add(
            "text",
            {
              x: n.x,
              y: n.y + 4,
              text: "function ✓",
              fill: "#34d399",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: `func-lbl-${i}` },
          );
        });
      }

      // Memo shield (Step 3)
      if (showMemoShield) {
        // Shield around ProductCard
        o.add(
          "rect",
          {
            x: 497,
            y: 282,
            w: 146,
            h: 56,
            rx: 14,
            ry: 14,
            fill: "rgba(251, 191, 36, 0.06)",
            stroke: "rgba(251, 191, 36, 0.5)",
            strokeWidth: 2,
            opacity: 1,
          },
          { key: "memo-shield" },
        );
        o.add(
          "text",
          {
            x: 570,
            y: 350,
            text: "React.memo → SKIP ✓",
            fill: "#fbbf24",
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "memo-lbl" },
        );
      }

      // Virtual DOM diff (Step 4)
      if (showVdomDiff) {
        o.add(
          "rect",
          {
            x: 370,
            y: 370,
            w: 160,
            h: 28,
            rx: 8,
            ry: 8,
            fill: "rgba(6, 182, 212, 0.1)",
            stroke: "rgba(6, 182, 212, 0.4)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "vdom-box" },
        );
        o.add(
          "text",
          {
            x: 450,
            y: 388,
            text: "Virtual DOM → Diff → Patch",
            fill: "#06b6d4",
            fontSize: 10,
            fontWeight: "bold",
          },
          { key: "vdom-lbl" },
        );
      }

      // Feature folders (Step 5)
      if (showFolders) {
        const folderX = 730;
        const folderY = 265;
        o.add(
          "rect",
          {
            x: folderX - 65,
            y: folderY - 10,
            w: 130,
            h: 100,
            rx: 8,
            ry: 8,
            fill: "rgba(52, 211, 153, 0.08)",
            stroke: "rgba(52, 211, 153, 0.35)",
            strokeWidth: 1,
            opacity: 1,
          },
          { key: "folder-box" },
        );
        const folders = [
          "📁 features/",
          "  📁 auth/",
          "  📁 products/",
          "  📁 cart/",
        ];
        folders.forEach((f, i) => {
          o.add(
            "text",
            {
              x: folderX - 50,
              y: folderY + 8 + i * 20,
              text: f,
              fill: "#34d399",
              fontSize: 11,
              fontWeight: i === 0 ? "bold" : "normal",
            },
            { key: `folder-${i}` },
          );
        });
      }

      // Hook extraction (Step 6)
      if (showHookExtract) {
        o.add(
          "rect",
          {
            x: 100,
            y: 345,
            w: 140,
            h: 28,
            rx: 8,
            ry: 8,
            fill: "rgba(192, 132, 252, 0.1)",
            stroke: "rgba(192, 132, 252, 0.4)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "hook-box" },
        );
        o.add(
          "text",
          {
            x: 170,
            y: 363,
            text: "useAuth()  useCart()",
            fill: "#c084fc",
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "hook-lbl" },
        );
      }

      // Theme indicator (Step 7)
      if (showTheme) {
        o.add(
          "rect",
          {
            x: 660,
            y: 265,
            w: 140,
            h: 28,
            rx: 8,
            ry: 8,
            fill: "rgba(244, 114, 182, 0.1)",
            stroke: "rgba(244, 114, 182, 0.4)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "theme-box" },
        );
        o.add(
          "text",
          {
            x: 730,
            y: 283,
            text: "🎨 Theme Provider",
            fill: "#f472b6",
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "theme-lbl" },
        );
      }

      // ESLint checkmarks (Step 8)
      if (showLint) {
        const lintNodes = [
          { x: 450, y: 35 },
          { x: 160, y: 150 },
          { x: 450, y: 150 },
          { x: 740, y: 150 },
          { x: 340, y: 290 },
          { x: 570, y: 290 },
        ];
        lintNodes.forEach((n, i) => {
          o.add(
            "text",
            {
              x: n.x + 62,
              y: n.y,
              text: "✓",
              fill: "#86efac",
              fontSize: 14,
              fontWeight: "bold",
            },
            { key: `lint-${i}` },
          );
        });
      }

      // Accessibility indicators (Step 9)
      if (showA11y) {
        o.add(
          "rect",
          {
            x: 100,
            y: 215,
            w: 120,
            h: 52,
            rx: 8,
            ry: 8,
            fill: "rgba(56, 189, 248, 0.08)",
            stroke: "rgba(56, 189, 248, 0.35)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "a11y-box" },
        );
        const ariaLabels = ["<nav> ✓", "aria-label ✓", "tabIndex ✓"];
        ariaLabels.forEach((lbl, i) => {
          o.add(
            "text",
            {
              x: 160,
              y: 228 + i * 16,
              text: lbl,
              fill: "#38bdf8",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: `a11y-${i}` },
          );
        });
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
    showClassBad,
    showFuncGood,
    showMemoShield,
    showVdomDiff,
    showFolders,
    showHookExtract,
    showTheme,
    showLint,
    showA11y,
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
      key: "functional-components",
      label: "Functional",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    { key: "hooks", label: "Hooks", color: "#c4b5fd", borderColor: "#8b5cf6" },
    {
      key: "memoization",
      label: "Memo",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "virtual-dom",
      label: "Virtual DOM",
      color: "#67e8f9",
      borderColor: "#06b6d4",
    },
    {
      key: "feature-folders",
      label: "Folders",
      color: "#6ee7b7",
      borderColor: "#10b981",
    },
    {
      key: "custom-hooks",
      label: "Custom Hooks",
      color: "#d8b4fe",
      borderColor: "#a855f7",
    },
    {
      key: "css-in-js",
      label: "Styling",
      color: "#f9a8d4",
      borderColor: "#ec4899",
    },
    {
      key: "code-quality",
      label: "Quality",
      color: "#bbf7d0",
      borderColor: "#22c55e",
    },
    {
      key: "accessibility",
      label: "A11y",
      color: "#7dd3fc",
      borderColor: "#0ea5e9",
    },
  ];

  /* ── Phase labels for badge ─────────────────────────── */
  const phaseLabel: Record<string, string> = {
    overview: "Overview",
    functional: "Components",
    "small-units": "Small Units",
    "memo-callback": "Memoization",
    "virtual-dom": "Virtual DOM",
    "feature-folders": "Folders",
    "custom-hooks": "Hooks",
    styling: "Styling",
    "code-quality": "Quality",
    accessibility: "A11y",
    summary: "Summary",
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div
      className={`react-best-practices-root react-best-practices-phase--${phase}`}
    >
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="react-best-practices-stage">
            <StageHeader
              title="React Best Practices"
              subtitle="Clean, fast, and accessible — one rule at a time"
            >
              <StatBadge
                label="Practice"
                value={phaseLabel[phase] ?? phase}
                color="#60a5fa"
              />
              <StatBadge
                label="Step"
                value={`${currentStep} / 10`}
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

export default ReactBestPracticesVisualization;
