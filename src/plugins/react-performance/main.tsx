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
  useReactPerformanceAnimation,
  type Signal,
} from "./useReactPerformanceAnimation";
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

const ReactPerformanceVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, currentStep, signals, phase } =
    useReactPerformanceAnimation(onAnimationComplete);
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
    showRenderWave,
    showWastedRender,
    showMemoShield,
    showLazyChunks,
    showLeakDrip,
    showTimerLeak,
    showClosureLeak,
    showHeapGrowth,
    showLighthouse,
    showProfiler,
    showCleanup,
  } = runtime;
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = useMemo(() => {
    const b = viz().view(W, H);

    /* ── React pipeline background ────────────────────── */
    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 30,
          y: 20,
          w: 600,
          h: 360,
          rx: 16,
          ry: 16,
          fill: "rgba(15, 23, 42, 0.4)",
          stroke: "rgba(51, 65, 85, 0.35)",
          strokeWidth: 1,
          opacity: 1,
        },
        { key: "pipeline-bg" },
      );
      o.add(
        "text",
        {
          x: 50,
          y: 16,
          text: "REACT RENDER PIPELINE",
          fill: "#475569",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "pipeline-lbl" },
      );
    });

    /* ── Tools & diagnostics background ───────────────── */
    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 660,
          y: 20,
          w: 310,
          h: 580,
          rx: 16,
          ry: 16,
          fill: "rgba(15, 23, 42, 0.3)",
          stroke: "rgba(51, 65, 85, 0.25)",
          strokeWidth: 1,
          opacity: 1,
        },
        { key: "tools-bg" },
      );
      o.add(
        "text",
        {
          x: 680,
          y: 16,
          text: "DIAGNOSTICS & TOOLS",
          fill: "#475569",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "tools-lbl" },
      );
    });

    /* ── NODES ────────────────────────────────────────── */

    // App root
    b.node("app")
      .at(130, 55)
      .rect(110, 38, 10)
      .fill(hot("app") ? C.blueFill : C.bg)
      .stroke(hot("app") ? C.blue : C.dim, hot("app") ? 2 : 1.5)
      .label("App ⚛️", {
        fill: hot("app") ? "#93c5fd" : "#e2e8f0",
        fontSize: 13,
        fontWeight: "bold",
      });

    // Parent component
    b.node("parent")
      .at(130, 160)
      .rect(120, 38, 10)
      .fill(hot("parent") ? C.violetFill : C.bg)
      .stroke(hot("parent") ? C.violet : C.dim, hot("parent") ? 2 : 1.5)
      .label("Parent", {
        fill: hot("parent") ? "#c4b5fd" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    // Child components
    b.node("child-a")
      .at(60, 290)
      .rect(110, 38, 10)
      .fill(hot("child-a") ? C.redFill : C.bg)
      .stroke(hot("child-a") ? C.red : C.dim, hot("child-a") ? 2 : 1.5)
      .label("ChildA", {
        fill: hot("child-a") ? "#fca5a5" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    b.node("child-b")
      .at(220, 290)
      .rect(110, 38, 10)
      .fill(hot("child-b") ? C.greenFill : C.bg)
      .stroke(hot("child-b") ? C.green : C.dim, hot("child-b") ? 2 : 1.5)
      .label("ChildB", {
        fill: hot("child-b") ? "#6ee7b7" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    // Virtual DOM
    b.node("vdom")
      .at(420, 120)
      .rect(140, 38, 10)
      .fill(hot("vdom") ? C.cyanFill : C.bg)
      .stroke(hot("vdom") ? C.cyan : C.dim, hot("vdom") ? 2 : 1.5)
      .label("Virtual DOM", {
        fill: hot("vdom") ? "#67e8f9" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    // Real DOM
    b.node("dom")
      .at(420, 250)
      .rect(140, 38, 10)
      .fill(hot("dom") ? C.cyanFill : C.bg)
      .stroke(hot("dom") ? C.cyan : C.dim, hot("dom") ? 2 : 1.5)
      .label("Real DOM 🖥️", {
        fill: hot("dom") ? "#67e8f9" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    // Hooks / useMemo / useCallback
    b.node("hooks")
      .at(130, 340)
      .rect(140, 30, 8)
      .fill(hot("hooks") ? C.purpleFill : C.bg)
      .stroke(hot("hooks") ? C.purple : C.dim, hot("hooks") ? 2 : 1.5)
      .label("useMemo / useCallback", {
        fill: hot("hooks") ? "#d8b4fe" : C.muted,
        fontSize: 10,
        fontWeight: "bold",
      });

    // Bundle / code-splitting nodes
    b.node("bundle")
      .at(130, 440)
      .rect(110, 32, 8)
      .fill(hot("bundle") ? C.amberFill : C.bg)
      .stroke(hot("bundle") ? C.amber : C.dim, hot("bundle") ? 2 : 1.5)
      .label("Bundle 📦", {
        fill: hot("bundle") ? "#fde68a" : C.muted,
        fontSize: 11,
        fontWeight: "bold",
      });

    if (showLazyChunks) {
      const chunks = [
        { id: "chunk-a", x: 60, label: "Home" },
        { id: "chunk-b", x: 160, label: "Settings" },
        { id: "chunk-c", x: 260, label: "Admin" },
      ];
      for (const c of chunks) {
        const isHot = hot(c.id);
        b.node(c.id)
          .at(c.x, 530)
          .rect(80, 28, 6)
          .fill(isHot ? C.greenFill : C.bg)
          .stroke(isHot ? C.green : C.dim, 1.5)
          .label(c.label, {
            fill: isHot ? "#6ee7b7" : C.muted,
            fontSize: 10,
            fontWeight: "bold",
          });
      }
    }

    // Memory heap
    b.node("heap")
      .at(400, 440)
      .rect(130, 38, 10)
      .fill(hot("heap") ? C.redFill : C.bg)
      .stroke(hot("heap") ? C.red : C.dim, hot("heap") ? 2 : 1.5)
      .label("Memory Heap 🧠", {
        fill: hot("heap") ? "#fca5a5" : C.text,
        fontSize: 11,
        fontWeight: "bold",
      });

    // Timer / subscription node (leak source)
    b.node("timer")
      .at(400, 540)
      .rect(130, 30, 8)
      .fill(hot("timer") ? C.amberFill : C.bg)
      .stroke(hot("timer") ? C.amber : C.dim, hot("timer") ? 2 : 1.5)
      .label("⏱ setInterval / WS", {
        fill: hot("timer") ? "#fde68a" : C.muted,
        fontSize: 10,
        fontWeight: "bold",
      });

    // Closure node (leak source)
    b.node("closure")
      .at(160, 540)
      .rect(120, 30, 8)
      .fill(hot("closure") ? C.purpleFill : C.bg)
      .stroke(hot("closure") ? C.purple : C.dim, hot("closure") ? 2 : 1.5)
      .label("🔒 Stale Closure", {
        fill: hot("closure") ? "#d8b4fe" : C.muted,
        fontSize: 10,
        fontWeight: "bold",
      });

    // DevTools
    b.node("devtools")
      .at(810, 80)
      .rect(140, 38, 10)
      .fill(hot("devtools") ? C.cyanFill : C.bg)
      .stroke(hot("devtools") ? C.cyan : C.dim, hot("devtools") ? 2 : 1.5)
      .label("Chrome DevTools 🔧", {
        fill: hot("devtools") ? "#67e8f9" : C.text,
        fontSize: 11,
        fontWeight: "bold",
      });

    // Profiler
    b.node("profiler")
      .at(810, 200)
      .rect(140, 38, 10)
      .fill(hot("profiler") ? C.purpleFill : C.bg)
      .stroke(hot("profiler") ? C.purple : C.dim, hot("profiler") ? 2 : 1.5)
      .label("Profiler 🔬", {
        fill: hot("profiler") ? "#d8b4fe" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    /* ── EDGES ────────────────────────────────────────── */

    // App → Parent
    b.edge("app", "parent", "e-app-parent")
      .stroke(hot("parent") ? C.violet : C.dimEdge, 1.5)
      .arrow(true);

    // Parent → Children
    b.edge("parent", "child-a", "e-p-ca")
      .stroke(hot("child-a") ? C.red : C.dimEdge, 1.5)
      .arrow(true);
    b.edge("parent", "child-b", "e-p-cb")
      .stroke(hot("child-b") ? C.green : C.dimEdge, 1.5)
      .arrow(true);

    // Parent → Virtual DOM
    b.edge("parent", "vdom", "e-p-vdom")
      .stroke(hot("vdom") ? C.cyan : C.dimEdge, 1.5)
      .arrow(true);

    // VDOM → Real DOM
    b.edge("vdom", "dom", "e-vdom-dom")
      .stroke(hot("dom") ? C.cyan : C.dimEdge, 1.5)
      .arrow(true);

    // Hooks → children (step 4+)
    if (currentStep >= 4) {
      b.edge("hooks", "child-a", "e-hooks-ca")
        .stroke(hot("hooks") ? C.purple : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
      b.edge("hooks", "child-b", "e-hooks-cb")
        .stroke(hot("hooks") ? C.purple : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Bundle → chunks
    if (showLazyChunks) {
      b.edge("bundle", "chunk-a", "e-bun-a")
        .stroke(hot("chunk-a") ? C.green : C.dimEdge, 1.5)
        .arrow(true);
      b.edge("bundle", "chunk-b", "e-bun-b")
        .stroke(hot("chunk-b") ? C.green : C.dimEdge, 1.5)
        .arrow(true);
      b.edge("bundle", "chunk-c", "e-bun-c")
        .stroke(hot("chunk-c") ? C.green : C.dimEdge, 1.5)
        .arrow(true);
    }

    // App → Heap (leak flow)
    if (currentStep >= 6) {
      b.edge("app", "heap", "e-app-heap")
        .stroke(hot("heap") ? C.red : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Timer → Parent (leak path)
    if (currentStep >= 7) {
      b.edge("timer", "parent", "e-timer-p")
        .stroke(hot("timer") ? C.amber : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
      b.edge("parent", "heap", "e-p-heap")
        .stroke(hot("heap") ? C.red : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Closure → Parent (leak path)
    if (currentStep >= 8) {
      b.edge("closure", "parent", "e-clos-p")
        .stroke(hot("closure") ? C.purple : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Heap → DevTools
    if (currentStep >= 9) {
      b.edge("heap", "devtools", "e-heap-dt")
        .stroke(hot("devtools") ? C.cyan : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // DOM → DevTools (Lighthouse)
    if (currentStep >= 10) {
      b.edge("dom", "devtools", "e-dom-dt")
        .stroke(hot("devtools") ? "#86efac" : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Components → Profiler
    if (currentStep >= 11) {
      b.edge("parent", "profiler", "e-p-prof")
        .stroke(hot("profiler") ? C.purple : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
      b.edge("child-a", "profiler", "e-ca-prof")
        .stroke(hot("profiler") ? C.purple : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
      b.edge("child-b", "profiler", "e-cb-prof")
        .stroke(hot("profiler") ? C.purple : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    /* ── Step-specific overlays ───────────────────────── */
    b.overlay((o) => {
      // Render wave indicator (Step 1)
      if (showRenderWave) {
        o.add(
          "rect",
          {
            x: 350,
            y: 160,
            w: 140,
            h: 24,
            rx: 6,
            ry: 6,
            fill: "rgba(96, 165, 250, 0.1)",
            stroke: "rgba(96, 165, 250, 0.4)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "render-wave-box" },
        );
        o.add(
          "text",
          {
            x: 420,
            y: 176,
            text: "Diff → Patch → Paint",
            fill: "#60a5fa",
            fontSize: 10,
            fontWeight: "bold",
          },
          { key: "render-wave-lbl" },
        );
      }

      // Wasted render indicators (Step 2)
      if (showWastedRender) {
        const wastedNodes = [
          { x: 60, y: 271 },
          { x: 220, y: 271 },
        ];
        wastedNodes.forEach((n, i) => {
          o.add(
            "rect",
            {
              x: n.x - 38,
              y: n.y - 8,
              w: 76,
              h: 16,
              rx: 4,
              ry: 4,
              fill: "rgba(239, 68, 68, 0.15)",
              stroke: "rgba(239, 68, 68, 0.4)",
              strokeWidth: 1,
              opacity: 1,
            },
            { key: `wasted-bg-${i}` },
          );
          o.add(
            "text",
            {
              x: n.x,
              y: n.y + 4,
              text: "WASTED ✗",
              fill: "#f87171",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: `wasted-lbl-${i}` },
          );
        });
      }

      // Memo shield (Steps 3-4)
      if (showMemoShield) {
        o.add(
          "rect",
          {
            x: 157,
            y: 263,
            w: 126,
            h: 54,
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
            x: 220,
            y: 332,
            text: "React.memo ✓ SKIP",
            fill: "#fbbf24",
            fontSize: 10,
            fontWeight: "bold",
          },
          { key: "memo-lbl" },
        );
      }

      // Heap growth bar (Steps 6-9)
      if (showHeapGrowth) {
        const barCount = 5;
        for (let i = 0; i < barCount; i++) {
          const h = 8 + i * 10;
          o.add(
            "rect",
            {
              x: 540 + i * 18,
              y: 462 - h,
              w: 12,
              h,
              rx: 2,
              ry: 2,
              fill:
                i < 2
                  ? "rgba(52, 211, 153, 0.6)"
                  : i < 4
                    ? "rgba(251, 191, 36, 0.6)"
                    : "rgba(239, 68, 68, 0.7)",
              stroke: "none",
              strokeWidth: 0,
              opacity: 1,
            },
            { key: `heap-bar-${i}` },
          );
        }
        o.add(
          "text",
          {
            x: 572,
            y: 478,
            text: "Memory ↑",
            fill: "#f87171",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "heap-growth-lbl" },
        );
      }

      // Timer leak drip indicator
      if (showTimerLeak) {
        o.add(
          "rect",
          {
            x: 335,
            y: 510,
            w: 130,
            h: 22,
            rx: 6,
            ry: 6,
            fill: "rgba(245, 158, 11, 0.12)",
            stroke: "rgba(245, 158, 11, 0.4)",
            strokeWidth: 1,
            opacity: 1,
          },
          { key: "timer-leak-box" },
        );
        o.add(
          "text",
          {
            x: 400,
            y: 525,
            text: "⚠ Still running!",
            fill: "#f59e0b",
            fontSize: 10,
            fontWeight: "bold",
          },
          { key: "timer-leak-lbl" },
        );
      }

      // Closure leak
      if (showClosureLeak) {
        o.add(
          "rect",
          {
            x: 100,
            y: 510,
            w: 120,
            h: 22,
            rx: 6,
            ry: 6,
            fill: "rgba(192, 132, 252, 0.12)",
            stroke: "rgba(192, 132, 252, 0.4)",
            strokeWidth: 1,
            opacity: 1,
          },
          { key: "closure-leak-box" },
        );
        o.add(
          "text",
          {
            x: 160,
            y: 525,
            text: "🔒 Holding refs!",
            fill: "#c084fc",
            fontSize: 10,
            fontWeight: "bold",
          },
          { key: "closure-leak-lbl" },
        );
      }

      // Lighthouse scores
      if (showLighthouse) {
        const scores = [
          { label: "LCP", val: "< 2.5s", color: "#86efac", y: 310 },
          { label: "INP", val: "< 200ms", color: "#fde68a", y: 340 },
          { label: "CLS", val: "< 0.1", color: "#93c5fd", y: 370 },
        ];
        scores.forEach((s) => {
          o.add(
            "text",
            {
              x: 810,
              y: s.y,
              text: `${s.label}: ${s.val}`,
              fill: s.color,
              fontSize: 12,
              fontWeight: "bold",
            },
            { key: `lh-${s.label}` },
          );
        });
        o.add(
          "text",
          {
            x: 810,
            y: 280,
            text: "Core Web Vitals",
            fill: "#86efac",
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "lh-title" },
        );
      }

      // Profiler flame chart mock
      if (showProfiler) {
        const flames = [
          {
            x: 740,
            w: 140,
            color: "rgba(192, 132, 252, 0.4)",
            label: "Parent",
          },
          { x: 740, w: 70, color: "rgba(248, 113, 113, 0.4)", label: "ChildA" },
          { x: 820, w: 60, color: "rgba(134, 239, 172, 0.3)", label: "ChildB" },
        ];
        flames.forEach((f, i) => {
          o.add(
            "rect",
            {
              x: f.x,
              y: 430 + i * 30,
              w: f.w,
              h: 22,
              rx: 4,
              ry: 4,
              fill: f.color,
              stroke: "rgba(148, 163, 184, 0.2)",
              strokeWidth: 1,
              opacity: 1,
            },
            { key: `flame-${i}` },
          );
          o.add(
            "text",
            {
              x: f.x + f.w / 2,
              y: 445 + i * 30,
              text: f.label,
              fill: "#e2e8f0",
              fontSize: 10,
              fontWeight: "bold",
            },
            { key: `flame-lbl-${i}` },
          );
        });
        o.add(
          "text",
          {
            x: 810,
            y: 420,
            text: "🔥 Flame Chart",
            fill: "#c084fc",
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "flame-title" },
        );
      }

      // Cleanup checkmark overlay (Summary)
      if (showCleanup) {
        o.add(
          "rect",
          {
            x: 370,
            y: 330,
            w: 200,
            h: 52,
            rx: 10,
            ry: 10,
            fill: "rgba(52, 211, 153, 0.08)",
            stroke: "rgba(52, 211, 153, 0.35)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "cleanup-box" },
        );
        const items = ["✓ memo  ✓ lazy  ✓ cleanup", "✓ profile  ✓ measure"];
        items.forEach((t, i) => {
          o.add(
            "text",
            {
              x: 470,
              y: 350 + i * 18,
              text: t,
              fill: "#34d399",
              fontSize: 11,
              fontWeight: "bold",
            },
            { key: `cleanup-${i}` },
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
    showRenderWave,
    showWastedRender,
    showMemoShield,
    showLazyChunks,
    showLeakDrip,
    showTimerLeak,
    showClosureLeak,
    showHeapGrowth,
    showLighthouse,
    showProfiler,
    showCleanup,
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
      key: "render-cycle",
      label: "Render Cycle",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "wasted-renders",
      label: "Wasted Renders",
      color: "#fca5a5",
      borderColor: "#ef4444",
    },
    {
      key: "react-memo",
      label: "React.memo",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "use-memo-callback",
      label: "useMemo",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    {
      key: "code-splitting",
      label: "Lazy Load",
      color: "#6ee7b7",
      borderColor: "#10b981",
    },
    {
      key: "memory-leaks",
      label: "Memory Leaks",
      color: "#fca5a5",
      borderColor: "#dc2626",
    },
    {
      key: "cleanup-pattern",
      label: "Cleanup",
      color: "#fde68a",
      borderColor: "#d97706",
    },
    {
      key: "heap-snapshots",
      label: "Heap Snap",
      color: "#67e8f9",
      borderColor: "#06b6d4",
    },
    {
      key: "lighthouse",
      label: "Lighthouse",
      color: "#bbf7d0",
      borderColor: "#22c55e",
    },
    {
      key: "react-profiler",
      label: "Profiler",
      color: "#d8b4fe",
      borderColor: "#a855f7",
    },
  ];

  /* ── Phase labels for badge ─────────────────────────── */
  const phaseLabel: Record<string, string> = {
    overview: "Overview",
    "render-cycle": "Render Cycle",
    "wasted-renders": "Wasted Renders",
    "memo-shield": "React.memo",
    "memo-hooks": "useMemo",
    "code-splitting": "Lazy Load",
    "memory-leak-intro": "Memory Leaks",
    "leak-cleanup": "Cleanup",
    "leak-closure": "Closures",
    "heap-snapshot": "Heap Snap",
    lighthouse: "Lighthouse",
    profiler: "Profiler",
    summary: "Summary",
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`react-performance-root react-performance-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="react-performance-stage">
            <StageHeader
              title="React Performance & Memory"
              subtitle="Find what's slow, fix what leaks — one tool at a time"
            >
              <StatBadge
                label="Focus"
                value={phaseLabel[phase] ?? phase}
                color="#60a5fa"
              />
              <StatBadge
                label="Step"
                value={`${currentStep} / 12`}
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

export default ReactPerformanceVisualization;
