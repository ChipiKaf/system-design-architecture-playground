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

export const ngoninitAdapter: AngularAdapter = {
  id: "ngoninit",

  profile: {
    label: "ngOnInit",
    description:
      "Examining ngOnInit — Angular's lifecycle hook that fires after inputs are bound. The appropriate place for initialization logic.",
  },

  colors: { fill: "#064e3b", stroke: "#22c55e" },

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
      p === "logic" || p === "summary" ? "success" : "pending";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "ngoninit",
        to: "http",
        duration: 800,
        color: "#22c55e",
        explain: "✓ ngOnInit calls HTTP — @Input() values are available!",
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
      .fill(hot("ctor") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("ctor") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.code("constructor()");
          l.newline();
          l.color("DI only", "#93c5fd", { fontSize: 9 });
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
            state.inputsReady ? "✓ Resolved" : "Pending…",
            state.inputsReady ? "#86efac" : "#94a3b8",
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
          l.color(
            state.hookFired ? "✓ Inputs available" : "Lifecycle hook",
            state.hookFired ? "#86efac" : "#86efac",
            { fontSize: 9 },
          );
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
          ? state.logicResult === "success"
            ? "#064e3b"
            : "#0f172a"
          : "#0f172a",
      )
      .stroke(
        hot("http")
          ? state.logicResult === "success"
            ? "#22c55e"
            : "#334155"
          : "#334155",
        2,
      )
      .richLabel(
        (l: any) => {
          l.bold("HTTP Service");
          l.newline();
          l.color(
            state.logicResult === "success"
              ? "✓ Correct params"
              : "fetchData()",
            state.logicResult === "success" ? "#86efac" : "#94a3b8",
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
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed()
      .label("Risky path", { fill: "#64748b", fontSize: 9 });

    builder
      .edge("ngoninit", "http", "e-ngoninit-http")
      .stroke(
        state.logicResult === "success" ? "#22c55e" : "#475569",
        state.logicResult === "success" ? 2.5 : 1.5,
      )
      .arrow(true)
      .label(state.logicResult === "success" ? "✓ Safe" : "Init logic?", {
        fill: state.logicResult === "success" ? "#86efac" : "#64748b",
        fontSize: 9,
      });
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Focus", value: "ngOnInit()", color: "#22c55e" },
      {
        label: "DI",
        value: state.diReady ? "✓ Ready" : "—",
        color: state.diReady ? "#14b8a6" : "#64748b",
      },
      {
        label: "@Input",
        value: state.inputsReady ? "✓ Bound" : "Pending",
        color: state.inputsReady ? "#22c55e" : "#64748b",
      },
      {
        label: "Result",
        value: state.logicResult === "success" ? "✓ Safe" : "—",
        color: state.logicResult === "success" ? "#22c55e" : "#64748b",
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
