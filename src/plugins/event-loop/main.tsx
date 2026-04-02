import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import InfoModal from "../../components/InfoModal/InfoModal";
import { concepts, type ConceptKey } from "./concepts";
import { useEventLoopAnimation } from "./useEventLoopAnimation";
import type { LoopItem } from "./eventLoopSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 560;

/*
 * Nodes arranged in a diamond loop — the event loop cycle:
 *
 *              [Script] ──► [Call Stack]     [Web APIs]
 *                            (12 o'clock)    (side)
 *                           ╱            ╲
 *          [Microtask Queue]              [Task Queue]
 *             (9 o'clock)                   (3 o'clock)
 *                           ╲            ╱
 *                            [Render]
 *                           (6 o'clock)
 *                               │
 *                           [Console]
 */
const NODES = {
  stack: { x: 310, y: 24, w: 220, h: 100 },
  microtask: { x: 16, y: 210, w: 210, h: 88 },
  render: { x: 315, y: 410, w: 210, h: 64 },
  task: { x: 614, y: 210, w: 210, h: 88 },
  script: { x: 80, y: 6, w: 120, h: 38 },
  webApis: { x: 590, y: 24, w: 180, h: 72 },
  console: { x: 340, y: 496, w: 160, h: 38 },
} as const;

const CODE_LINES = [
  { no: 1, tag: "sync", code: 'console.log("A");' },
  { no: 2, tag: "task", code: 'setTimeout(() => console.log("timeout"), 0);' },
  { no: 3, tag: "microtask", code: "Promise.resolve().then(() => {" },
  { no: 4, tag: "microtask", code: '  console.log("promise");' },
  {
    no: 5,
    tag: "microtask",
    code: '  queueMicrotask(() => console.log("microtask"));',
  },
  { no: 6, tag: "microtask", code: "});" },
  { no: 7, tag: "sync", code: 'console.log("B");' },
] as const;

const phaseLabel: Record<string, string> = {
  overview: "Overview",
  sync: "Sync task",
  microtasks: "Drain microtasks",
  render: "Render opportunity",
  tasks: "Task turn",
  summary: "Summary",
};

const preview = (items: LoopItem[]) => {
  if (items.length === 0) return "empty";
  return items[0].label;
};

const EventLoopVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals, phase } =
    useEventLoopAnimation(onAnimationComplete);
  const [activeConcept, setActiveConcept] = useState<ConceptKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);

  const openConcept = useCallback(
    (key: ConceptKey) => setActiveConcept(key),
    [],
  );
  const closeConcept = useCallback(() => setActiveConcept(null), []);

  const {
    callStack,
    webApis,
    microtaskQueue,
    taskQueue,
    consoleOutput,
    currentLine,
    explanation,
    renderCount,
    hotZones,
  } = runtime;

  const hot = (zone: string) => hotZones.includes(zone);
  const topFrame =
    callStack.length > 0 ? callStack[callStack.length - 1].label : "empty";

  const ladderIndex =
    phase === "sync"
      ? 0
      : phase === "microtasks"
        ? 1
        : phase === "render"
          ? 2
          : phase === "tasks" || phase === "summary"
            ? 3
            : -1;

  const scene = (() => {
    const b = viz().view(W, H);

    // ── Central loop indicator ──────────────────────────
    b.overlay((o) => {
      o.add(
        "text",
        {
          x: 420,
          y: 258,
          text: "The Event Loop",
          fill: "#334155",
          fontSize: 18,
          fontWeight: 700,
          textAnchor: "middle",
        },
        { key: "loop-title" },
      );
      o.add(
        "text",
        {
          x: 420,
          y: 282,
          text:
            phase === "overview" ? "click a step to begin" : phaseLabel[phase],
          fill: "#475569",
          fontSize: 12,
          textAnchor: "middle",
        },
        { key: "loop-phase" },
      );
    });

    // ── Script (entry, top-left) ────────────────────────
    b.node("script")
      .at(NODES.script.x, NODES.script.y)
      .rect(NODES.script.w, NODES.script.h, 10)
      .fill("#0f172a")
      .stroke(hot("script") ? "#60a5fa" : "#334155", 1.4)
      .label("example.js", {
        fill: "#94a3b8",
        fontSize: 11,
        fontWeight: "bold",
      })
      .onClick(() => openConcept("event-loop"))
      .tooltip({
        title: "Global Script",
        sections: [
          {
            label: "Role",
            value:
              "The whole file starts as one synchronous task on the call stack.",
          },
        ],
      });

    // ── Call Stack (top, 12 o'clock) ────────────────────
    b.node("stack")
      .at(NODES.stack.x, NODES.stack.y)
      .rect(NODES.stack.w, NODES.stack.h, 18)
      .fill(hot("stack") ? "#1e3a8a" : "#0f172a")
      .stroke(hot("stack") ? "#60a5fa" : "#1e3a8a", 2.4)
      .label("Call Stack", {
        fill: "#fff",
        fontSize: 15,
        fontWeight: "bold",
        dy: -24,
      })
      .badge("LIFO", {
        position: "top-right",
        fill: "#fff",
        background: "#1d4ed8",
        fontSize: 8,
      })
      .onClick(() => openConcept("call-stack"))
      .tooltip({
        title: "Call Stack",
        sections: [
          { label: "Top frame", value: topFrame },
          {
            label: "Rule",
            value: "Nothing from the queues can run until the stack is empty.",
          },
        ],
      });
    b.node("stack").label(topFrame, {
      fill: callStack.length > 0 ? "#93c5fd" : "#475569",
      fontSize: 11,
      dy: 2,
    });

    // ── Microtask Queue (left, 9 o'clock) ───────────────
    b.node("microtask")
      .at(NODES.microtask.x, NODES.microtask.y)
      .rect(NODES.microtask.w, NODES.microtask.h, 16)
      .fill(
        hot("microtask")
          ? "#8b5cf6"
          : microtaskQueue.length > 0
            ? "#4c1d95"
            : "#1e1b4b",
      )
      .stroke(
        hot("microtask") || microtaskQueue.length > 0 ? "#a78bfa" : "#4338ca",
        2,
      )
      .label("Microtask Queue", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -16,
      })
      .badge("FIFO", {
        position: "top-right",
        fill: "#fff",
        background: "#7c3aed",
        fontSize: 8,
      })
      .onClick(() => openConcept("microtasks"))
      .tooltip({
        title: "Microtask Queue",
        sections: [
          { label: "Next", value: preview(microtaskQueue) },
          {
            label: "Rule",
            value:
              "Drains completely before the event loop takes a normal task.",
          },
        ],
      });
    b.node("microtask").label(preview(microtaskQueue), {
      fill: microtaskQueue.length > 0 ? "#ddd6fe" : "#64748b",
      fontSize: 10,
      dy: 8,
    });

    // ── Task Queue (right, 3 o'clock) ───────────────────
    b.node("task")
      .at(NODES.task.x, NODES.task.y)
      .rect(NODES.task.w, NODES.task.h, 16)
      .fill(
        hot("task") ? "#16a34a" : taskQueue.length > 0 ? "#14532d" : "#052e16",
      )
      .stroke(hot("task") || taskQueue.length > 0 ? "#4ade80" : "#166534", 2)
      .label("Task Queue", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -16,
      })
      .badge("FIFO", {
        position: "top-right",
        fill: "#fff",
        background: "#15803d",
        fontSize: 8,
      })
      .onClick(() => openConcept("tasks"))
      .tooltip({
        title: "Task Queue",
        sections: [
          { label: "Next", value: preview(taskQueue) },
          {
            label: "Rule",
            value: "One task per turn, only after microtasks are drained.",
          },
        ],
      });
    b.node("task").label(preview(taskQueue), {
      fill: taskQueue.length > 0 ? "#86efac" : "#64748b",
      fontSize: 10,
      dy: 8,
    });

    // ── Render (bottom, 6 o'clock) ──────────────────────
    b.node("render")
      .at(NODES.render.x, NODES.render.y)
      .rect(NODES.render.w, NODES.render.h, 14)
      .fill(hot("render") ? "#0f766e" : renderCount > 0 ? "#134e4a" : "#042f2e")
      .stroke(hot("render") || renderCount > 0 ? "#2dd4bf" : "#0f766e", 2)
      .label("Render", {
        fill: "#fff",
        fontSize: 14,
        fontWeight: "bold",
        dy: -6,
      })
      .badge("paint", {
        position: "top-right",
        fill: "#fff",
        background: "#0f766e",
        fontSize: 8,
      })
      .onClick(() => openConcept("render"))
      .tooltip({
        title: "Render",
        sections: [
          { label: "Paints", value: String(renderCount) },
          {
            label: "When",
            value: "Stack empty + microtasks drained.",
          },
        ],
      });
    b.node("render").label(
      renderCount > 0 ? `${renderCount} paint` : "waiting",
      {
        fill: renderCount > 0 ? "#99f6e4" : "#475569",
        fontSize: 9,
        dy: 10,
      },
    );

    // ── Web APIs (top-right, side channel) ──────────────
    b.node("web-apis")
      .at(NODES.webApis.x, NODES.webApis.y)
      .rect(NODES.webApis.w, NODES.webApis.h, 14)
      .fill(hot("web-apis") ? "#431407" : "#1c1917")
      .stroke(hot("web-apis") ? "#fb923c" : "#78350f", 1.6)
      .label("Web APIs", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -12,
      })
      .badge("host", {
        position: "top-right",
        fill: "#fff",
        background: "#ea580c",
        fontSize: 8,
      })
      .onClick(() => openConcept("web-apis"))
      .tooltip({
        title: "Host APIs",
        sections: [
          { label: "Waiting", value: preview(webApis) },
          {
            label: "Role",
            value: "Timers and host features wait here, outside the JS stack.",
          },
        ],
      });
    b.node("web-apis").label(preview(webApis), {
      fill: webApis.length > 0 ? "#fed7aa" : "#57534e",
      fontSize: 10,
      dy: 8,
    });

    // ── Console (below loop, output) ────────────────────
    b.node("console")
      .at(NODES.console.x, NODES.console.y)
      .rect(NODES.console.w, NODES.console.h, 10)
      .fill(hot("console") ? "#881337" : "#111827")
      .stroke(hot("console") ? "#fb7185" : "#374151", 1.4)
      .label("Console", {
        fill: "#d1d5db",
        fontSize: 11,
        fontWeight: "bold",
        dy: -2,
      })
      .tooltip({
        title: "Console",
        sections: [
          {
            label: "Output",
            value:
              consoleOutput.length > 0
                ? consoleOutput.join(", ")
                : "Nothing yet",
          },
        ],
      });
    b.node("console").label(
      consoleOutput.length > 0 ? consoleOutput.join(" > ") : "...",
      {
        fill: consoleOutput.length > 0 ? "#fecdd3" : "#6b7280",
        fontSize: 8,
        dy: 12,
      },
    );

    // ═══════════════════════════════════════════════════
    // LOOP EDGES (clockwise diamond)
    //   Stack ──1──► Microtask ──2──► Render
    //     ▲                             │
    //     └──────4──── Task ◄───3───────┘
    // ═══════════════════════════════════════════════════

    const loopActive1 = phase === "sync" || phase === "microtasks";
    const l1 = b
      .edge("stack", "microtask", "loop-1")
      .arrow(true)
      .stroke(loopActive1 ? "#a78bfa" : "#334155", loopActive1 ? 2.4 : 1.4)
      .label(phase === "sync" ? "queue microtask" : "1 check microtasks", {
        fill: "#c4b5fd",
        fontSize: 8,
      });
    if (loopActive1) l1.animate("flow", { duration: "0.9s" });

    const loopActive2 = phase === "render";
    const l2 = b
      .edge("microtask", "render", "loop-2")
      .arrow(true)
      .stroke(loopActive2 ? "#2dd4bf" : "#334155", loopActive2 ? 2.4 : 1.4)
      .label("2 may paint", { fill: "#5eead4", fontSize: 8 });
    if (loopActive2) l2.animate("flow", { duration: "0.9s" });

    const loopActive3 = phase === "tasks" || phase === "summary";
    const l3 = b
      .edge("render", "task", "loop-3")
      .arrow(true)
      .stroke(loopActive3 ? "#4ade80" : "#334155", loopActive3 ? 2.4 : 1.4)
      .label("3 pick one task", { fill: "#86efac", fontSize: 8 });
    if (loopActive3) l3.animate("flow", { duration: "0.9s" });

    const loopActive4 = phase === "tasks";
    const l4 = b
      .edge("task", "stack", "loop-4")
      .arrow(true)
      .stroke(loopActive4 ? "#60a5fa" : "#334155", loopActive4 ? 2.4 : 1.4)
      .label("4 execute", { fill: "#93c5fd", fontSize: 8 });
    if (loopActive4) l4.animate("flow", { duration: "0.9s" });

    // ═══════════════════════════════════════════════════
    // SIDE EDGES (entry, async registration, output)
    // ═══════════════════════════════════════════════════

    const eEntry = b
      .edge("script", "stack", "e-entry")
      .arrow(true)
      .stroke(
        phase === "sync" ? "#60a5fa" : "#475569",
        phase === "sync" ? 2 : 1.2,
      )
      .label("run", { fill: "#93c5fd", fontSize: 8 });
    if (phase === "sync") eEntry.animate("flow", { duration: "1s" });

    const eApis = b
      .edge("stack", "web-apis", "e-apis")
      .arrow(true)
      .stroke(
        hot("web-apis") ? "#fb923c" : "#475569",
        hot("web-apis") ? 1.8 : 1,
      )
      .label("register timer", { fill: "#fdba74", fontSize: 8 });
    if (hot("web-apis")) eApis.animate("flow", { duration: "1s" });

    const eReady = b
      .edge("web-apis", "task", "e-ready")
      .arrow(true)
      .stroke(
        taskQueue.length > 0 ? "#4ade80" : "#475569",
        taskQueue.length > 0 ? 1.8 : 1,
      )
      .label("ready", { fill: "#86efac", fontSize: 8 });
    if (taskQueue.length > 0) eReady.animate("flow", { duration: "1s" });

    const eLog = b
      .edge("stack", "console", "e-log")
      .arrow(true)
      .stroke(
        hot("console") ? "#fb7185" : "#334155",
        hot("console") ? 1.8 : 0.8,
      )
      .dashed()
      .label("log", { fill: "#fda4af", fontSize: 8 });
    if (hot("console")) eLog.animate("flow", { duration: "1s" });

    // Drain path: microtask ──► stack (reverse shortcut)
    if (phase === "microtasks") {
      b.edge("microtask", "stack", "e-drain")
        .arrow(true)
        .stroke("#c4b5fd", 2.2)
        .label("drain first", {
          fill: "#ddd6fe",
          fontSize: 9,
          fontWeight: "bold",
        })
        .animate("flow", { duration: "0.8s" });
    }

    // ── Annotations ─────────────────────────────────────
    if (phase === "microtasks") {
      b.node("ann-micro")
        .at(30, 320)
        .rect(0, 0, 0)
        .fill("transparent")
        .label("Microtasks drain before any task", {
          fill: "#ddd6fe",
          fontSize: 9,
          fontWeight: "bold",
        });
    }

    if (phase === "render") {
      b.animate((anim) => {
        anim
          .at(0)
          .node("render")
          .to({ scale: 1.08 }, { duration: 260, easing: "easeOut" })
          .to({ scale: 1.0 }, { duration: 340, easing: "easeIn" });
      });
    }

    // ── Signal overlays ─────────────────────────────────
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

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    // Save viewport from the live PanZoomController before destroying
    const saved = pzRef.current?.getState() ?? null;

    builderRef.current?.destroy();
    builderRef.current = scene;

    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  const ladder = [
    {
      label: "Finish current stack",
      concept: "call-stack" as ConceptKey,
      helper: "Synchronous code always keeps the desk until it is done.",
    },
    {
      label: "Drain microtasks",
      concept: "microtasks" as ConceptKey,
      helper: "Promise.then and queueMicrotask callbacks go first.",
    },
    {
      label: "Browser may render",
      concept: "render" as ConceptKey,
      helper: "The browser can paint between turns when things are quiet.",
    },
    {
      label: "Run one task",
      concept: "tasks" as ConceptKey,
      helper: "Now one callback from the task queue gets a turn.",
    },
  ];

  const renderLane = (
    title: string,
    items: LoopItem[],
    accentClass: string,
    concept: ConceptKey,
  ) => {
    return (
      <div className={`el-lane ${accentClass}`}>
        <button className="el-lane__title" onClick={() => openConcept(concept)}>
          <span>{title}</span>
          <span className="el-lane__count">{items.length}</span>
        </button>
        <div className="el-lane__items">
          {items.length === 0 && <span className="el-empty">empty</span>}
          {items.map((item) => (
            <div key={item.id} className="el-chip">
              <strong>{item.label}</strong>
              {item.detail && <span>{item.detail}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="el-root">
      <div className="el-pills">
        <button
          className="el-pill el-pill--loop"
          onClick={() => openConcept("event-loop")}
        >
          Event Loop
        </button>
        <button
          className="el-pill el-pill--stack"
          onClick={() => openConcept("call-stack")}
        >
          Call Stack
        </button>
        <button
          className="el-pill el-pill--apis"
          onClick={() => openConcept("web-apis")}
        >
          Web APIs
        </button>
        <button
          className="el-pill el-pill--micro"
          onClick={() => openConcept("microtasks")}
        >
          Microtasks
        </button>
        <button
          className="el-pill el-pill--task"
          onClick={() => openConcept("tasks")}
        >
          Task Queue
        </button>
        <button
          className="el-pill el-pill--render"
          onClick={() => openConcept("render")}
        >
          Render
        </button>
      </div>

      <div className="el-body">
        <div className="el-stage">
          <div className="el-stage__head">
            <div>
              <h2>JavaScript Event Loop</h2>
              <p>
                One script, one timer, one Promise callback, one nested
                microtask. Watch how the runtime chooses the next piece of work.
              </p>
            </div>

            <div className="el-stage__stats">
              <div className={`el-phase el-phase--${phase}`}>
                <span className="el-phase__label">Phase</span>
                <span className="el-phase__value">{phaseLabel[phase]}</span>
              </div>
              <div className="el-stat">
                <span className="el-stat__label">Paints</span>
                <span className="el-stat__value">{renderCount}</span>
              </div>
              <div className="el-stat">
                <span className="el-stat__label">Output</span>
                <span className="el-stat__value">{consoleOutput.length}</span>
              </div>
            </div>
          </div>

          <div className="el-stage__canvas-wrap">
            <div className="el-stage__canvas" ref={containerRef} />
          </div>
        </div>

        <aside className="el-sidebar">
          <div className="el-card el-card--explanation">
            <div className="el-card__label">What just happened?</div>
            <p>{explanation}</p>
          </div>

          <div className="el-card el-card--code">
            <div className="el-card__head">
              <h3>Example Script</h3>
              <span className="el-card__sub">
                Current line: {currentLine ?? "-"}
              </span>
            </div>

            <div className="el-code">
              {CODE_LINES.map((line) => (
                <div
                  key={line.no}
                  className={`el-code__line${currentLine === line.no ? " el-code__line--active" : ""}`}
                >
                  <span className="el-code__no">{line.no}</span>
                  <span className={`el-code__tag el-code__tag--${line.tag}`}>
                    {line.tag}
                  </span>
                  <code>{line.code}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="el-card el-card--queues">
            <div className="el-card__head">
              <h3>Queue Inspector</h3>
              <span className="el-card__sub">live runtime state</span>
            </div>

            <div className="el-lanes">
              {renderLane(
                "Call Stack",
                callStack,
                "el-lane--stack",
                "call-stack",
              )}
              {renderLane("Web APIs", webApis, "el-lane--apis", "web-apis")}
              {renderLane(
                "Microtasks",
                microtaskQueue,
                "el-lane--micro",
                "microtasks",
              )}
              {renderLane("Task Queue", taskQueue, "el-lane--task", "tasks")}
            </div>
          </div>

          <div className="el-card el-card--rules">
            <div className="el-card__head">
              <h3>Turn Priority</h3>
              <span className="el-card__sub">why Promise beats timeout</span>
            </div>

            <div className="el-rules">
              {ladder.map((rule, index) => {
                const status =
                  index < ladderIndex
                    ? "completed"
                    : index === ladderIndex
                      ? "active"
                      : "pending";

                return (
                  <button
                    key={rule.label}
                    className={`el-rule el-rule--${status}`}
                    onClick={() => openConcept(rule.concept)}
                  >
                    <span className="el-rule__index">{index + 1}</span>
                    <span className="el-rule__body">
                      <strong>{rule.label}</strong>
                      <span>{rule.helper}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="el-card el-card--output">
            <div className="el-card__head">
              <h3>Console Output</h3>
              <span className="el-card__sub">actual execution order</span>
            </div>

            <div className="el-output">
              {consoleOutput.length === 0 && (
                <div className="el-empty">Nothing logged yet</div>
              )}

              {consoleOutput.map((entry, index) => (
                <div
                  key={`${entry}-${index}`}
                  className={`el-output__row${index === consoleOutput.length - 1 ? " el-output__row--latest" : ""}`}
                >
                  <span className="el-output__order">{index + 1}</span>
                  <span className="el-output__value">{entry}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {activeConcept && (
        <InfoModal
          isOpen
          onClose={closeConcept}
          title={concepts[activeConcept].title}
          subtitle={concepts[activeConcept].subtitle}
          accentColor={concepts[activeConcept].accentColor}
          sections={concepts[activeConcept].sections}
          aside={concepts[activeConcept].aside}
        />
      )}
    </div>
  );
};

export default EventLoopVisualization;
