import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

const POS = {
  angular: { x: 80, y: 280 },
  ctor: { x: 280, y: 280 },
  inputs: { x: 490, y: 130 },
  ngoninit: { x: 650, y: 280 },
  di: { x: 280, y: 100 },
  http: { x: 650, y: 460 },
};

export const constructorAdapter: AngularAdapter = {
  id: "constructor",

  profile: {
    label: "Constructor",
    description:
      "Examining the constructor — a plain TypeScript method invoked when the class is instantiated. Only DI injection should happen here.",
  },

  colors: { fill: "#1e3a5f", stroke: "#3b82f6" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    state.diReady =
      p === "di" ||
      p === "inputs" ||
      p === "hook" ||
      p === "logic" ||
      p === "summary";
    state.inputsReady =
      p === "inputs" || p === "hook" || p === "logic" || p === "summary";
    state.hookFired = p === "hook" || p === "logic" || p === "summary";
    state.logicResult =
      p === "logic" || p === "summary" ? "warning" : "pending";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "ctor",
        to: "http",
        duration: 800,
        color: "#f59e0b",
        explain:
          "⚠ Constructor calls HTTP — but @Input() values are undefined!",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;

    builder
      .node("angular")
      .at(POS.angular.x, POS.angular.y)
      .rect(140, 55, 12)
      .fill(hot("angular") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("angular") ? "#dd0031" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Angular");
          l.newline();
          l.color("Framework", "#94a3b8", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("ctor")
      .at(POS.ctor.x, POS.ctor.y)
      .rect(150, 55, 12)
      .fill(hot("ctor") ? "#1e40af" : "#0f172a")
      .stroke(hot("ctor") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.code("constructor()");
          l.newline();
          l.color("TS class method", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("inputs")
      .at(POS.inputs.x, POS.inputs.y)
      .rect(155, 55, 12)
      .fill(
        state.inputsReady ? "#064e3b" : hot("inputs") ? "#312e81" : "#0f172a",
      )
      .stroke(
        state.inputsReady ? "#22c55e" : hot("inputs") ? "#a78bfa" : "#334155",
        2,
      )
      .richLabel(
        (l: any) => {
          l.bold("@Input()");
          l.newline();
          l.color(
            state.inputsReady ? "✓ Resolved" : "✗ Not yet bound",
            state.inputsReady ? "#86efac" : "#fca5a5",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("ngoninit")
      .at(POS.ngoninit.x, POS.ngoninit.y)
      .rect(150, 55, 12)
      .fill(hot("ngoninit") ? "#064e3b" : "#0f172a")
      .stroke(hot("ngoninit") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.code("ngOnInit()");
          l.newline();
          l.color("Lifecycle hook", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("di")
      .at(POS.di.x, POS.di.y)
      .rect(150, 55, 12)
      .fill(hot("di") ? "#134e4a" : "#0f172a")
      .stroke(hot("di") ? "#14b8a6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("DI Container");
          l.newline();
          l.color(
            state.diReady ? "✓ Injected" : "Services",
            state.diReady ? "#5eead4" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("http")
      .at(POS.http.x, POS.http.y)
      .rect(150, 55, 12)
      .fill(
        hot("http")
          ? state.logicResult === "warning"
            ? "#78350f"
            : "#0f172a"
          : "#0f172a",
      )
      .stroke(
        hot("http")
          ? state.logicResult === "warning"
            ? "#f59e0b"
            : "#334155"
          : "#334155",
        2,
      )
      .richLabel(
        (l: any) => {
          l.bold("HTTP Service");
          l.newline();
          l.color(
            state.logicResult === "warning"
              ? "⚠ Inputs undefined"
              : "fetchData()",
            state.logicResult === "warning" ? "#fbbf24" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    /* Edges */
    builder
      .edge("angular", "ctor", "e-angular-ctor")
      .stroke(hot("angular") || hot("ctor") ? "#60a5fa" : "#475569", 2)
      .arrow(true)
      .label("1. Creates", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("di", "ctor", "e-di-ctor")
      .stroke(state.diReady ? "#14b8a6" : "#475569", 2)
      .arrow(true)
      .label("Injects", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("ctor", "inputs", "e-ctor-inputs")
      .stroke(hot("inputs") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .dashed()
      .label("2. Then…", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("inputs", "ngoninit", "e-inputs-ngoninit")
      .stroke(hot("ngoninit") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("3. Fires", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("ctor", "http", "e-ctor-http")
      .stroke(
        state.logicResult === "warning" ? "#f59e0b" : "#475569",
        state.logicResult === "warning" ? 2.5 : 1.5,
      )
      .arrow(true)
      .dashed()
      .label(state.logicResult === "warning" ? "⚠ Risky" : "Init logic?", {
        fill: state.logicResult === "warning" ? "#fbbf24" : "#64748b",
        fontSize: 9,
      });

    builder
      .edge("ngoninit", "http", "e-ngoninit-http")
      .stroke("#334155", 1.5)
      .arrow(true)
      .label("Safe path", { fill: "#64748b", fontSize: 9 });
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Focus", value: "constructor()", color: "#3b82f6" },
      {
        label: "DI",
        value: state.diReady ? "✓ Ready" : "—",
        color: state.diReady ? "#14b8a6" : "#64748b",
      },
      {
        label: "@Input",
        value: state.inputsReady ? "✓ Bound" : "✗ Undefined",
        color: state.inputsReady ? "#22c55e" : "#f87171",
      },
      {
        label: "Result",
        value: state.logicResult === "warning" ? "⚠ Risky" : "—",
        color: state.logicResult === "warning" ? "#f59e0b" : "#64748b",
      },
    ];
  },

  softReset(state: AngularState) {
    state.diReady = false;
    state.inputsReady = false;
    state.hookFired = false;
    state.logicResult = "pending";
  },
};
