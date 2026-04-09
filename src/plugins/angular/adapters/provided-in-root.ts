import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: injector tree — root singleton pattern ── */
const POS = {
  root: { x: 400, y: 55 },
  service: { x: 400, y: 175 },
  compA: { x: 200, y: 310 },
  compB: { x: 600, y: 310 },
  childA: { x: 200, y: 445 },
  childB: { x: 600, y: 445 },
  result: { x: 400, y: 565 },
};

export const providedInRootAdapter: AngularAdapter = {
  id: "provided-in-root",

  profile: {
    label: "providedIn: 'root'",
    description:
      "providedIn: 'root' — registers the service in the root injector. One singleton instance is shared across the entire application.",
  },

  colors: { fill: "#1e3a5f", stroke: "#3b82f6" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "di-register" ||
      p === "di-resolve" ||
      p === "di-check" ||
      p === "di-summary";
    state.providerScope = active ? "root" : "none";
    state.instanceCount = active ? "singleton" : "none";
    state.overrideActive = false;
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "service",
        to: "childB",
        duration: 700,
        color: "#3b82f6",
        explain:
          "✓ Same singleton instance — both components get the exact same service reference.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const active = state.providerScope === "root";

    /* ─ root: Root Injector ─ */
    builder
      .node("root")
      .at(POS.root.x, POS.root.y)
      .rect(220, 58, 12)
      .fill(hot("root") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("root") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Root Injector");
          l.newline();
          l.color("Application-wide singleton scope", "#93c5fd", {
            fontSize: 9,
          });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ─ service: The registered service ─ */
    builder
      .node("service")
      .at(POS.service.x, POS.service.y)
      .rect(260, 58, 12)
      .fill(hot("service") ? "#312e81" : "#0f172a")
      .stroke(hot("service") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("UserService");
          l.newline();
          l.code("providedIn: 'root'");
        },
        { fill: "#c4b5fd", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    /* ─ compA: Component A ─ */
    builder
      .node("compA")
      .at(POS.compA.x, POS.compA.y)
      .rect(200, 55, 12)
      .fill(hot("compA") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("compA") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("ComponentA");
          l.newline();
          l.color(
            active ? "✓ Gets singleton" : "Requests UserService",
            active ? "#93c5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ compB: Component B ─ */
    builder
      .node("compB")
      .at(POS.compB.x, POS.compB.y)
      .rect(200, 55, 12)
      .fill(hot("compB") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("compB") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("ComponentB");
          l.newline();
          l.color(
            active ? "✓ Same instance!" : "Requests UserService",
            active ? "#93c5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ childA: Looks up the tree ─ */
    builder
      .node("childA")
      .at(POS.childA.x, POS.childA.y)
      .rect(200, 55, 12)
      .fill(hot("childA") ? "#064e3b" : "#0f172a")
      .stroke(hot("childA") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("ChildOfA");
          l.newline();
          l.color(
            active ? "↑ Walks up → finds root" : "Also requests service",
            active ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ childB: Also looks up ─ */
    builder
      .node("childB")
      .at(POS.childB.x, POS.childB.y)
      .rect(200, 55, 12)
      .fill(hot("childB") ? "#064e3b" : "#0f172a")
      .stroke(hot("childB") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("ChildOfB");
          l.newline();
          l.color(
            active ? "↑ Walks up → same root" : "Also requests service",
            active ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ result ─ */
    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(240, 40, 10)
      .fill("#0f172a")
      .stroke(hot("result") ? "#22c55e" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color(
            active
              ? "✓ One instance, shared by all — singleton"
              : "All components share one service instance",
            active ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#86efac", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("root", "service", "e-root-svc")
      .stroke(hot("service") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("1. Registers service", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("service", "compA", "e-svc-a")
      .stroke(hot("compA") ? "#3b82f6" : "#475569", 2)
      .arrow(true)
      .label("2. Inject", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("service", "compB", "e-svc-b")
      .stroke(hot("compB") ? "#3b82f6" : "#475569", 2)
      .arrow(true)
      .label("2. Inject", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("compA", "childA", "e-a-child")
      .stroke(hot("childA") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("3. Child inherits", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("compB", "childB", "e-b-child")
      .stroke(hot("childB") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("3. Child inherits", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("childA", "result", "e-childA-res")
      .stroke("#1e293b", 1)
      .arrow(true);

    builder
      .edge("childB", "result", "e-childB-res")
      .stroke("#1e293b", 1)
      .arrow(true);
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Scope", value: "Root", color: "#3b82f6" },
      {
        label: "Instances",
        value: state.instanceCount === "singleton" ? "1 (Singleton)" : "—",
        color: state.instanceCount === "singleton" ? "#22c55e" : "#64748b",
      },
      {
        label: "Override",
        value: "No",
        color: "#64748b",
      },
      { label: "Tree-shakable", value: "✓", color: "#22c55e" },
    ];
  },

  softReset(state: AngularState) {
    state.providerScope = "none";
    state.instanceCount = "none";
    state.overrideActive = false;
  },
};
