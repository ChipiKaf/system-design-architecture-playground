import React, { useRef, useLayoutEffect, useEffect } from "react";
import "./main.scss";
import { useLanggraphAnimation } from "./useLanggraphAnimation";
import { viz, type SignalOverlayParams } from "vizcraft";
import { useConceptModal, ConceptPills } from "../../components/plugin-kit";
import { concepts, type ConceptKey } from "./concepts";

import { setChannelMode, type NodePatch } from "./langgraphSlice";
import { useDispatch } from "react-redux";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 660;
const H = 780;

/* ── Node layout ──────────────────────────────────────────── */
const NODES = {
  input: { x: 330, y: 48, w: 120, h: 40 },
  analyze: { x: 330, y: 140, w: 140, h: 48 },
  router: { x: 330, y: 235, w: 130, h: 44 },
  simple: { x: 155, y: 330, w: 120, h: 46 },
  complex: { x: 505, y: 330, w: 130, h: 46 },
  planner: { x: 330, y: 425, w: 140, h: 48 },
  "task-0": { x: 130, y: 540, w: 115, h: 48 },
  "task-1": { x: 330, y: 540, w: 115, h: 48 },
  "task-2": { x: 530, y: 540, w: 115, h: 48 },
  merge: { x: 330, y: 645, w: 130, h: 44 },
  review: { x: 330, y: 720, w: 130, h: 38 },
  end: { x: 330, y: 768, w: 70, h: 30 },
} as const;

const LanggraphVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { lgState, currentStep, animPhase, signals } =
    useLanggraphAnimation(onAnimationComplete);

  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const reduxDispatch = useDispatch();

  const {
    graphData,
    activeNodes,
    completedNodes,
    changedKeys,
    phase,
    nodePatches,
    channelMode,
  } = lgState;

  /* ── Helper: node visual state ──────────────────────────── */
  const nodeState = (id: string) => {
    if (activeNodes.includes(id)) return "active";
    if (completedNodes.includes(id)) return "completed";
    return "idle";
  };

  const fill = (id: string, idle: string, active: string) => {
    const s = nodeState(id);
    if (s === "active") return active;
    if (s === "completed") return active;
    return idle;
  };

  const strokeColor = (id: string, idle: string, active: string) => {
    const s = nodeState(id);
    if (s === "active") return active;
    if (s === "completed") return active;
    return idle;
  };

  const opacity = (id: string) => {
    // Dim the "simple" branch when complex is chosen
    if (id === "simple" && graphData.route === "complex") return 0.35;
    if (id === "simple" && graphData.route === null && currentStep > 1)
      return 0.35;
    return 1;
  };

  /* ── Build VizCraft scene ───────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    const isRouting = animPhase === "routing" || animPhase === "branching";
    const isFanning = animPhase === "fanning-out";
    const isExecuting = animPhase === "executing";
    const isMerging = animPhase === "merging";
    const isInterrupted = animPhase === "interrupted";

    // ── INPUT ──
    const inp = NODES.input;
    b.node("input")
      .at(inp.x, inp.y)
      .rect(inp.w, inp.h, 20)
      .fill(fill("input", "#164e63", "#06b6d4"))
      .stroke(strokeColor("input", "#155e75", "#22d3ee"), 2)
      .label("User Input", { fill: "#fff", fontSize: 11, fontWeight: "bold" })
      .tooltip({
        title: "START — User Input",
        sections: [
          {
            label: "Role",
            value: "Entry point — the initial state is created from user input",
          },
          { label: "State", value: `"${graphData.input}"` },
        ],
      });

    // ── ANALYZE (LLM) ──
    const an = NODES.analyze;
    b.node("analyze")
      .at(an.x, an.y)
      .rect(an.w, an.h, 8)
      .fill(fill("analyze", "#312e81", "#6366f1"))
      .stroke(strokeColor("analyze", "#3730a3", "#818cf8"), 2)
      .label("Classify Input", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -6,
      })
      .badge("LLM", {
        position: "top-right",
        fill: "#fff",
        background: "#4f46e5",
        fontSize: 8,
      })
      .onClick(() => openConcept("nodes"))
      .tooltip({
        title: "Classify Input — LLM Node",
        sections: [
          { label: "Type", value: "LLM Node — calls a language model" },
          { label: "Input", value: "state.input (the user request)" },
          {
            label: "Output",
            value: graphData.classification
              ? `classification: "${graphData.classification}"`
              : "Pending...",
          },
          { label: "💡", value: "Click to learn about Nodes" },
        ],
      });
    b.node("analyze").label(
      nodeState("analyze") === "active"
        ? "⟳ calling LLM..."
        : graphData.classification
          ? `→ "${graphData.classification}"`
          : "",
      { fill: "#c7d2fe", fontSize: 8, dy: 9 },
    );

    // ── ROUTER (Conditional) ──
    const rt = NODES.router;
    b.node("router")
      .at(rt.x, rt.y)
      .rect(rt.w, rt.h, 8)
      .fill(fill("router", "#451a03", "#d97706"))
      .stroke(strokeColor("router", "#78350f", "#fbbf24"), 2)
      .label("Route", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -5,
      })
      .badge("if/else", {
        position: "top-right",
        fill: "#fff",
        background: "#b45309",
        fontSize: 8,
      })
      .onClick(() => openConcept("edges"))
      .tooltip({
        title: "Router — Conditional Edge",
        sections: [
          {
            label: "Type",
            value:
              "Conditional edge function — inspects state to decide next node",
          },
          {
            label: "Logic",
            value:
              'if classification === "complex" → Deep Analysis, else → Quick Reply',
          },
          {
            label: "Decision",
            value: graphData.route ? `"${graphData.route}"` : "Pending...",
          },
          { label: "💡", value: "Click to learn about Edges & Routing" },
        ],
      });
    b.node("router").label(graphData.route ? `→ ${graphData.route}` : "", {
      fill: "#fde68a",
      fontSize: 8,
      dy: 8,
    });

    // ── SIMPLE PATH ──
    const sp = NODES.simple;
    b.node("simple")
      .at(sp.x, sp.y)
      .rect(sp.w, sp.h, 8)
      .fill(fill("simple", "#1e1b4b", "#6366f1"))
      .stroke(
        strokeColor("simple", "#312e81", "#818cf8"),
        graphData.route === "complex" ? 1 : 2,
      )
      .label("Quick Reply", {
        fill: graphData.route === "complex" ? "#64748b" : "#fff",
        fontSize: 11,
        fontWeight: "bold",
        dy: -5,
      })
      .badge("LLM", {
        position: "top-right",
        fill: "#fff",
        background: "#4f46e5",
        fontSize: 8,
      })
      .tooltip({
        title: "Quick Reply — Simple Branch",
        sections: [
          {
            label: "Type",
            value: "LLM Node — handles simple queries directly",
          },
          {
            label: "Status",
            value:
              graphData.route === "complex"
                ? "Not taken (input classified as complex)"
                : "Available",
          },
        ],
      });
    b.node("simple").label(graphData.route === "complex" ? "not taken" : "", {
      fill: "#475569",
      fontSize: 8,
      dy: 8,
    });

    // ── COMPLEX PATH ──
    const cx = NODES.complex;
    b.node("complex")
      .at(cx.x, cx.y)
      .rect(cx.w, cx.h, 8)
      .fill(fill("complex", "#1e1b4b", "#6366f1"))
      .stroke(strokeColor("complex", "#312e81", "#818cf8"), 2)
      .label("Deep Analysis", {
        fill: "#fff",
        fontSize: 11,
        fontWeight: "bold",
        dy: -5,
      })
      .badge("LLM", {
        position: "top-right",
        fill: "#fff",
        background: "#4f46e5",
        fontSize: 8,
      })
      .tooltip({
        title: "Deep Analysis — Complex Branch",
        sections: [
          {
            label: "Type",
            value: "LLM Node with tool use — researches the problem space",
          },
          { label: "Output", value: graphData.analysis ?? "Pending..." },
        ],
      });
    b.node("complex").label(
      nodeState("complex") === "active"
        ? "⟳ researching..."
        : graphData.analysis
          ? "✓ analysis done"
          : "",
      { fill: "#c7d2fe", fontSize: 8, dy: 8 },
    );

    // ── PLANNER (LLM) ──
    const pl = NODES.planner;
    b.node("planner")
      .at(pl.x, pl.y)
      .rect(pl.w, pl.h, 8)
      .fill(fill("planner", "#312e81", "#6366f1"))
      .stroke(strokeColor("planner", "#3730a3", "#818cf8"), 2)
      .label("Plan Tasks", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -6,
      })
      .badge("LLM", {
        position: "top-right",
        fill: "#fff",
        background: "#4f46e5",
        fontSize: 8,
      })
      .onClick(() => openConcept("send"))
      .tooltip({
        title: "Task Planner — LLM Node",
        sections: [
          {
            label: "Type",
            value: "LLM Node — generates a task list for parallel execution",
          },
          {
            label: "Output",
            value:
              graphData.tasks.length > 0
                ? graphData.tasks.map((t) => t.name).join(", ")
                : "Pending...",
          },
          { label: "💡", value: "Click to learn about Send() & fan-out" },
        ],
      });
    b.node("planner").label(
      nodeState("planner") === "active"
        ? "⟳ planning..."
        : graphData.tasks.length > 0
          ? `→ ${graphData.tasks.length} tasks`
          : "",
      { fill: "#c7d2fe", fontSize: 8, dy: 9 },
    );

    // ── PARALLEL TASKS ──
    const taskLabels = ["DB Schema", "REST API", "React UI"];
    const taskIds = ["schema", "api", "ui"];
    (["task-0", "task-1", "task-2"] as const).forEach((nodeId, i) => {
      const tn = NODES[nodeId];
      const taskData = graphData.tasks[i];
      const result = graphData.results[taskIds[i]];
      const ns = nodeState(nodeId);

      b.node(nodeId)
        .at(tn.x, tn.y)
        .rect(tn.w, tn.h, 8)
        .fill(
          ns === "active"
            ? "#6366f1"
            : ns === "completed"
              ? "#4f46e5"
              : "#1e1b4b",
        )
        .stroke(ns !== "idle" ? "#818cf8" : "#312e81", ns !== "idle" ? 2 : 1)
        .label(taskLabels[i], {
          fill: "#fff",
          fontSize: 11,
          fontWeight: "bold",
          dy: -6,
        })
        .badge("LLM", {
          position: "top-right",
          fill: "#fff",
          background: "#4f46e5",
          fontSize: 7,
        })
        .tooltip({
          title: `${taskLabels[i]} — Parallel Task`,
          sections: [
            { label: "Task ID", value: taskIds[i] },
            { label: "Status", value: taskData?.status ?? "not started" },
            { label: "Result", value: result ?? "Pending..." },
            {
              label: "Pattern",
              value: "Spawned via Send() for parallel execution",
            },
          ],
        });
      b.node(nodeId).label(
        ns === "active" ? "⟳ LLM..." : result ? "✓ done" : "",
        { fill: "#c7d2fe", fontSize: 8, dy: 9 },
      );
    });

    // ── Fan-out annotation ──
    if (
      isFanning ||
      isExecuting ||
      isMerging ||
      completedNodes.includes("merge")
    ) {
      b.node("send-hint")
        .at(330, 487)
        .rect(0, 0, 0)
        .fill("transparent")
        .label("Send()  ×3  — parallel fan-out", {
          fill: "#06b6d4",
          fontSize: 9,
          fontWeight: "bold",
        });
    }

    // ── MERGE ──
    const mg = NODES.merge;
    b.node("merge")
      .at(mg.x, mg.y)
      .rect(mg.w, mg.h, 8)
      .fill(fill("merge", "#022c22", "#059669"))
      .stroke(strokeColor("merge", "#064e3b", "#10b981"), 2)
      .label("Aggregate", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .badge("merge", {
        position: "top-right",
        fill: "#fff",
        background: "#047857",
        fontSize: 8,
      })
      .onClick(() => openConcept("channels"))
      .tooltip({
        title: "Aggregator — Merge Reducer",
        sections: [
          {
            label: "Type",
            value: "Merge node — combines parallel results via merge reducer",
          },
          {
            label: "Results merged",
            value: String(Object.keys(graphData.results).length),
          },
          { label: "💡", value: "Click to learn about Channels & Reducers" },
        ],
      });
    b.node("merge").label(
      nodeState("merge") === "active"
        ? "merging..."
        : Object.keys(graphData.results).length === 3
          ? "✓ 3 results"
          : "",
      { fill: "#a7f3d0", fontSize: 8, dy: 8 },
    );

    // ── REVIEW (interrupt) ──
    const rv = NODES.review;
    b.node("review")
      .at(rv.x, rv.y)
      .rect(rv.w, rv.h, 8)
      .fill(isInterrupted ? "#dc2626" : fill("review", "#1c1917", "#dc2626"))
      .stroke(
        isInterrupted ? "#f87171" : strokeColor("review", "#292524", "#ef4444"),
        isInterrupted ? 2 : 1,
      )
      .label(isInterrupted ? "__interrupt__" : "Review", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
      })
      .onClick(() => openConcept("interrupt"))
      .tooltip({
        title: "Human Review — Interrupt Point",
        sections: [
          {
            label: "Type",
            value: "Interrupt node — pauses for human approval",
          },
          {
            label: "Status",
            value: graphData.interrupted
              ? "⏸ PAUSED — waiting for approval"
              : graphData.approved
                ? "✓ Approved"
                : "Not reached",
          },
          { label: "💡", value: "Click to learn about Interrupts" },
        ],
      });

    // ── END ──
    const en = NODES.end;
    b.node("end")
      .at(en.x, en.y)
      .rect(en.w, en.h, 15)
      .fill(fill("end", "#1e293b", "#22c55e"))
      .stroke(
        strokeColor("end", "#334155", "#4ade80"),
        nodeState("end") === "idle" ? 1 : 2,
      )
      .label("END", { fill: "#fff", fontSize: 10, fontWeight: "bold" });

    // ═══ EDGES ══════════════════════════════════════════════

    // Input → Analyze (direct)
    const e1 = b
      .edge("input", "analyze", "e-in-analyze")
      .arrow(true)
      .stroke("#64748b", 1.5);
    if (animPhase === "classifying") e1.animate("flow", { duration: "1s" });

    // Analyze → Router (direct)
    const e2 = b
      .edge("analyze", "router", "e-analyze-router")
      .arrow(true)
      .stroke("#64748b", 1.5);
    if (isRouting) e2.animate("flow", { duration: "1s" });

    // Router → Simple (conditional — dashed)
    const simDim = graphData.route === "complex";
    b.edge("router", "simple", "e-router-simple")
      .arrow(true)
      .stroke(simDim ? "#334155" : "#f59e0b", simDim ? 1 : 1.5)
      .dashed()
      .label(simDim ? "" : "simple", { fill: "#fbbf24", fontSize: 8 });

    // Router → Complex (conditional — dashed)
    const cxEdge = b
      .edge("router", "complex", "e-router-complex")
      .arrow(true)
      .stroke(graphData.route === "complex" ? "#f59e0b" : "#64748b", 1.5)
      .dashed()
      .label(graphData.route === "complex" ? "complex ✓" : "complex", {
        fill: "#fbbf24",
        fontSize: 8,
      });
    if (animPhase === "branching") cxEdge.animate("flow", { duration: "1s" });

    // Simple → Planner
    b.edge("simple", "planner", "e-simple-planner")
      .arrow(true)
      .stroke(simDim ? "#1e293b" : "#64748b", simDim ? 1 : 1.5);

    // Complex → Planner
    const e5 = b
      .edge("complex", "planner", "e-complex-planner")
      .arrow(true)
      .stroke(completedNodes.includes("complex") ? "#818cf8" : "#64748b", 1.5);
    if (animPhase === "planning") e5.animate("flow", { duration: "1s" });

    // Planner → Tasks (Send edges)
    (["task-0", "task-1", "task-2"] as const).forEach((t, i) => {
      const e = b
        .edge("planner", t, `e-planner-${t}`)
        .arrow(true)
        .stroke(
          isFanning || isExecuting ? "#06b6d4" : "#334155",
          isFanning || isExecuting ? 1.5 : 1,
        );
      if (isFanning) e.animate("flow", { duration: "0.8s" });
    });

    // Tasks → Merge
    (["task-0", "task-1", "task-2"] as const).forEach((t) => {
      const e = b
        .edge(t, "merge", `e-${t}-merge`)
        .arrow(true)
        .stroke(isMerging ? "#10b981" : "#334155", isMerging ? 1.5 : 1);
      if (isMerging) e.animate("flow", { duration: "1s" });
    });

    // Merge → Review
    const e6 = b
      .edge("merge", "review", "e-merge-review")
      .arrow(true)
      .stroke(isInterrupted ? "#ef4444" : "#334155", isInterrupted ? 1.5 : 1);

    // Review → End
    const e7 = b
      .edge("review", "end", "e-review-end")
      .arrow(true)
      .stroke(
        animPhase === "resuming" || animPhase === "complete"
          ? "#22c55e"
          : "#334155",
        1,
      );
    if (animPhase === "resuming") e7.animate("flow", { duration: "1s" });

    // ═══ SIGNAL OVERLAYS ════════════════════════════════════
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig) => {
          const { id, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, { key: id });
        });
      });
    }

    // ═══ Phase-specific annotations ═════════════════════════

    // Routing decision annotation
    if (isRouting) {
      b.node("route-ann")
        .at(330, 263)
        .rect(0, 0, 0)
        .fill("transparent")
        .label("evaluating state.classification...", {
          fill: "#fbbf24",
          fontSize: 8,
        });
    }

    // Interrupt annotation
    if (isInterrupted) {
      b.overlay((o) => {
        o.add(
          "rect",
          {
            x: NODES.review.x - 90,
            y: NODES.review.y - 28,
            w: 180,
            h: 18,
            rx: 4,
            ry: 4,
            fill: "#7f1d1d",
            stroke: "#ef4444",
            strokeWidth: 1,
            opacity: 0.9,
          },
          { key: "int-bg" },
        );
        o.add(
          "text",
          {
            x: NODES.review.x,
            y: NODES.review.y - 17,
            text: "⏸  Graph paused — awaiting approval",
            fill: "#fca5a5",
            fontSize: 9,
            fontWeight: 700,
            textAnchor: "middle",
          },
          { key: "int-label" },
        );
      });
    }

    return b;
  })();

  // ── Mount ──────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    builderRef.current?.destroy();
    builderRef.current = scene;
    scene.mount(containerRef.current, { autoplay: true });
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
    };
  }, []);

  /* ── State panel data ───────────────────────────────────── */

  // Compute what "replace" mode would produce — only the last patch survives
  const replaceResult: Record<string, string> = {};
  if (nodePatches.length > 0) {
    const sorted = [...nodePatches].sort((a, b) => a.ts - b.ts);
    const lastPatch = sorted[sorted.length - 1];
    Object.assign(replaceResult, lastPatch.patch);
  }

  const displayResults =
    channelMode === "merge" ? graphData.results : replaceResult;

  const stateEntries: {
    key: string;
    value: string;
    changed: boolean;
    reducer: string;
  }[] = [
    {
      key: "input",
      value: `"${graphData.input.length > 40 ? graphData.input.slice(0, 37) + "..." : graphData.input}"`,
      changed: changedKeys.includes("input"),
      reducer: "replace",
    },
    {
      key: "classification",
      value: graphData.classification
        ? `"${graphData.classification}"`
        : "null",
      changed: changedKeys.includes("classification"),
      reducer: "replace",
    },
    {
      key: "route",
      value: graphData.route ? `"${graphData.route}"` : "null",
      changed: changedKeys.includes("route"),
      reducer: "replace",
    },
    {
      key: "analysis",
      value: graphData.analysis
        ? `"${graphData.analysis.slice(0, 42)}..."`
        : "null",
      changed: changedKeys.includes("analysis"),
      reducer: "replace",
    },
    {
      key: "tasks",
      value:
        graphData.tasks.length > 0
          ? `[${graphData.tasks.map((t) => `{${t.id}: ${t.status}}`).join(", ")}]`
          : "[]",
      changed: changedKeys.includes("tasks"),
      reducer: "replace",
    },
    {
      key: "results",
      value:
        Object.keys(displayResults).length > 0
          ? `{${Object.keys(displayResults).join(", ")}}`
          : "{}",
      changed: changedKeys.includes("results"),
      reducer: channelMode === "merge" ? "merge ⟵" : "replace ⚠",
    },
    {
      key: "__interrupt__",
      value: graphData.interrupted ? "true" : "false",
      changed: changedKeys.includes("interrupted"),
      reducer: "—",
    },
  ];

  const lgPills = [
    {
      key: "state-graph",
      label: "StateGraph",
      color: "#c4b5fd",
      borderColor: "#7c3aed",
    },
    { key: "nodes", label: "Nodes", color: "#a5b4fc", borderColor: "#6366f1" },
    { key: "edges", label: "Edges", color: "#fde68a", borderColor: "#f59e0b" },
    {
      key: "state-annotation",
      label: "State & Annotations",
      color: "#86efac",
      borderColor: "#22c55e",
    },
    {
      key: "channels",
      label: "Channels",
      color: "#67e8f9",
      borderColor: "#06b6d4",
    },
    { key: "send", label: "Send()", color: "#fda4af", borderColor: "#f43f5e" },
    {
      key: "interrupt",
      label: "Interrupt",
      color: "#fdba74",
      borderColor: "#f97316",
    },
  ];

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="lg-root">
      {/* Concept pills */}
      <ConceptPills pills={lgPills} onOpen={openConcept} className="lg-pills" />

      {/* Main body: graph + state panel */}
      <div className="lg-body">
        <div className="lg-graph">
          <div className="lg-canvas" ref={containerRef} />
        </div>

        <div className="lg-sidebar">
          <div className="lg-state-panel">
            <h3 className="lg-state-title">
              Graph State
              <span className="lg-state-subtitle">Annotation&lt;…&gt;</span>
            </h3>
            <div className="lg-state-entries">
              {stateEntries.map((e) => (
                <div
                  key={e.key}
                  className={`lg-state-entry${e.changed ? " lg-state-entry--changed" : ""}`}
                >
                  <span className="lg-state-key">{e.key}</span>
                  <span className="lg-state-val">{e.value}</span>
                  <span
                    className="lg-state-reducer"
                    title={`Reducer: ${e.reducer}`}
                  >
                    {e.reducer}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Channel Inspector ─────────────────────────── */}
          {nodePatches.length > 0 && (
            <div className="lg-channel-inspector">
              <h3 className="lg-channel-title">
                Channel Inspector
                <button
                  className="lg-channel-info"
                  onClick={() => openConcept("channels")}
                  title="Learn about Channels"
                >
                  ?
                </button>
              </h3>

              {/* Each node's return value */}
              <div className="lg-channel-patches">
                <span className="lg-channel-label">Node returns:</span>
                {nodePatches
                  .slice()
                  .sort((a, b) => a.ts - b.ts)
                  .map((p, i) => {
                    const key = Object.keys(p.patch)[0];
                    const isLost =
                      channelMode === "replace" && i < nodePatches.length - 1;
                    return (
                      <div
                        key={p.nodeId}
                        className={`lg-channel-patch${isLost ? " lg-channel-patch--lost" : ""}`}
                      >
                        <span className="lg-channel-node">{p.nodeLabel}</span>
                        <span className="lg-channel-arrow">→</span>
                        <code className="lg-channel-code">
                          {"{ "}
                          {key}: "…"
                          {" }"}
                        </code>
                        {isLost && (
                          <span className="lg-channel-overwritten">
                            overwritten
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Reducer toggle */}
              <div className="lg-channel-toggle">
                <span className="lg-channel-toggle-label">
                  Reducer for <code>results</code>:
                </span>
                <div className="lg-channel-buttons">
                  <button
                    className={`lg-channel-btn${channelMode === "merge" ? " lg-channel-btn--active" : ""}`}
                    onClick={() => reduxDispatch(setChannelMode("merge"))}
                  >
                    merge
                  </button>
                  <button
                    className={`lg-channel-btn lg-channel-btn--danger${channelMode === "replace" ? " lg-channel-btn--active" : ""}`}
                    onClick={() => reduxDispatch(setChannelMode("replace"))}
                  >
                    replace
                  </button>
                </div>
              </div>

              {/* Visual result comparison */}
              <div className="lg-channel-result">
                <span className="lg-channel-label">state.results =</span>
                {channelMode === "merge" ? (
                  <div className="lg-channel-outcome lg-channel-outcome--ok">
                    <code>
                      {"{ "}
                      {Object.keys(graphData.results).map((k, i) => (
                        <span key={k}>
                          {i > 0 && ", "}
                          <span className="lg-channel-key-ok">{k}</span>
                        </span>
                      ))}
                      {" }"}
                    </code>
                    <span className="lg-channel-verdict lg-channel-verdict--ok">
                      ✓ all {Object.keys(graphData.results).length} preserved
                    </span>
                  </div>
                ) : (
                  <div className="lg-channel-outcome lg-channel-outcome--bad">
                    <code>
                      {"{ "}
                      {Object.keys(replaceResult).map((k, i) => (
                        <span key={k}>
                          {i > 0 && ", "}
                          <span className="lg-channel-key-ok">{k}</span>
                        </span>
                      ))}
                      {" }"}
                    </code>
                    <span className="lg-channel-verdict lg-channel-verdict--bad">
                      ⚠{" "}
                      {Object.keys(graphData.results).length -
                        Object.keys(replaceResult).length}{" "}
                      lost — only last write survived!
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase indicator */}
          <div className="lg-phase">
            <span className="lg-phase-label">Phase</span>
            <span className="lg-phase-value">{phase}</span>
          </div>

          {/* LLM call indicator */}
          {(animPhase === "classifying" ||
            animPhase === "branching" ||
            animPhase === "planning" ||
            animPhase === "executing") && (
            <div className="lg-llm-panel">
              <div className="lg-llm-indicator">
                <span className="lg-llm-dot" />
                LLM call in progress…
              </div>
              <div className="lg-llm-detail">
                {animPhase === "classifying" && (
                  <>
                    <span className="lg-llm-label">Prompt:</span> Classify this
                    request as simple or complex.
                  </>
                )}
                {animPhase === "branching" && (
                  <>
                    <span className="lg-llm-label">Prompt:</span> Analyze
                    requirements: auth, DB, API…
                  </>
                )}
                {animPhase === "planning" && (
                  <>
                    <span className="lg-llm-label">Prompt:</span> Break analysis
                    into parallel tasks.
                  </>
                )}
                {animPhase === "executing" && (
                  <>
                    <span className="lg-llm-label">Prompt:</span> Generate
                    output for assigned task.
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* InfoModal */}
      <ConceptModal />
    </div>
  );
};

export default LanggraphVisualization;
