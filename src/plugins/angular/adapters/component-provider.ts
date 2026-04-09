import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: injector tree — component-level provider pattern ── */
const POS = {
  root: { x: 400, y: 55 },
  compA: { x: 200, y: 195 },
  compB: { x: 600, y: 195 },
  svcA: { x: 200, y: 335 },
  svcB: { x: 600, y: 335 },
  childA: { x: 200, y: 465 },
  childB: { x: 600, y: 465 },
  result: { x: 400, y: 575 },
};

export const componentProviderAdapter: AngularAdapter = {
  id: "component-provider",

  profile: {
    label: "Component providers",
    description:
      "providers: [UserService] on a component — creates a NEW instance for that component and its children. Overrides any parent provider.",
  },

  colors: { fill: "#78350f", stroke: "#f59e0b" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "di-register" ||
      p === "di-resolve" ||
      p === "di-check" ||
      p === "di-summary";
    state.providerScope = active ? "component" : "none";
    state.instanceCount = active ? "per-component" : "none";
    state.overrideActive = active;
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "svcA",
        to: "svcB",
        duration: 700,
        color: "#f87171",
        explain:
          "⚠ Different instances! Each component's providers array creates its own service — they don't share state.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const active = state.providerScope === "component";

    /* ─ root: Root Injector (no provider here) ─ */
    builder
      .node("root")
      .at(POS.root.x, POS.root.y)
      .rect(220, 55, 12)
      .fill(hot("root") ? "#1e293b" : "#0f172a")
      .stroke(hot("root") ? "#475569" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Root Injector");
          l.newline();
          l.color("No UserService registered here", "#64748b", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ compA: Component A with providers ─ */
    builder
      .node("compA")
      .at(POS.compA.x, POS.compA.y)
      .rect(210, 58, 12)
      .fill(hot("compA") ? "#78350f" : "#0f172a")
      .stroke(hot("compA") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("ComponentA");
          l.newline();
          l.code("providers: [UserService]");
        },
        { fill: "#fcd34d", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    /* ─ compB: Component B with providers ─ */
    builder
      .node("compB")
      .at(POS.compB.x, POS.compB.y)
      .rect(210, 58, 12)
      .fill(hot("compB") ? "#78350f" : "#0f172a")
      .stroke(hot("compB") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("ComponentB");
          l.newline();
          l.code("providers: [UserService]");
        },
        { fill: "#fcd34d", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    /* ─ svcA: Instance A ─ */
    builder
      .node("svcA")
      .at(POS.svcA.x, POS.svcA.y)
      .rect(210, 55, 12)
      .fill(hot("svcA") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("svcA") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("UserService #1");
          l.newline();
          l.color(
            active ? "Instance for CompA subtree" : "New instance created",
            active ? "#93c5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ svcB: Instance B ─ */
    builder
      .node("svcB")
      .at(POS.svcB.x, POS.svcB.y)
      .rect(210, 55, 12)
      .fill(hot("svcB") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("svcB") ? "#f87171" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("UserService #2");
          l.newline();
          l.color(
            active ? "⚠ DIFFERENT instance!" : "New instance created",
            active ? "#fca5a5" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ childA: Inherits from compA ─ */
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
            active ? "↑ Gets instance #1" : "Inherits parent's provider",
            active ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ childB: Inherits from compB ─ */
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
            active ? "↑ Gets instance #2" : "Inherits parent's provider",
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
      .rect(260, 40, 10)
      .fill("#0f172a")
      .stroke(hot("result") ? "#f59e0b" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color(
            active
              ? "⚠ Each subtree gets its own instance — no shared state"
              : "Component providers create per-subtree instances",
            active ? "#fcd34d" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fcd34d", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("root", "compA", "e-root-a")
      .stroke(hot("compA") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("Tree", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("root", "compB", "e-root-b")
      .stroke(hot("compB") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("Tree", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("compA", "svcA", "e-a-svc")
      .stroke(hot("svcA") ? "#3b82f6" : "#475569", 2)
      .arrow(true)
      .label("1. Creates #1", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("compB", "svcB", "e-b-svc")
      .stroke(hot("svcB") ? "#f87171" : "#475569", 2)
      .arrow(true)
      .label("1. Creates #2", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("svcA", "childA", "e-svc-childA")
      .stroke(hot("childA") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("2. Inherits #1", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("svcB", "childB", "e-svc-childB")
      .stroke(hot("childB") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("2. Inherits #2", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("svcA", "svcB", "e-svc-compare")
      .stroke(active ? "#f87171" : "#475569", active ? 2.5 : 1)
      .arrow(false)
      .dashed()
      .label(active ? "≠ Different!" : "Same?", {
        fill: active ? "#fca5a5" : "#64748b",
        fontSize: 9,
      });

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
      { label: "Scope", value: "Component", color: "#f59e0b" },
      {
        label: "Instances",
        value: state.instanceCount === "per-component" ? "Per-component" : "—",
        color: state.instanceCount === "per-component" ? "#f59e0b" : "#64748b",
      },
      {
        label: "Override",
        value: state.overrideActive ? "Yes ⚠" : "—",
        color: state.overrideActive ? "#f87171" : "#64748b",
      },
      { label: "Tree-shakable", value: "No", color: "#f87171" },
    ];
  },

  softReset(state: AngularState) {
    state.providerScope = "none";
    state.instanceCount = "none";
    state.overrideActive = false;
  },
};
