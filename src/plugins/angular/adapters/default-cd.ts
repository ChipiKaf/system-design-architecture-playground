import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: Zone.js-triggered full-tree check ────── */
const POS = {
  zonejs: { x: 480, y: 55 },
  event: { x: 160, y: 55 },
  cd: { x: 480, y: 175 },
  root: { x: 480, y: 295 },
  compA: { x: 240, y: 415 },
  compB: { x: 480, y: 415 },
  compC: { x: 720, y: 415 },
  result: { x: 480, y: 545 },
};

export const defaultCdAdapter: AngularAdapter = {
  id: "default-cd",

  profile: {
    label: "Default Strategy",
    description:
      "Default strategy — Zone.js patches every async API. Any event (click, timer, HTTP) triggers a full change-detection cycle that checks every component in the tree.",
  },

  colors: { fill: "#1e3a5f", stroke: "#3b82f6" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "cd-trigger" ||
      p === "cd-walk" ||
      p === "cd-check" ||
      p === "cd-summary";
    state.cdStrategy = active ? "default" : "none";
    state.checksPerCycle = active ? "all" : "none";
    state.skipCount = 0;
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "compA",
        to: "result",
        duration: 600,
        color: "#f59e0b",
        explain:
          "⚠ All 3 components checked — even those whose data didn't change.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const active = state.cdStrategy === "default";

    /* ─ event: Async Event ─ */
    builder
      .node("event")
      .at(POS.event.x, POS.event.y)
      .rect(180, 52, 12)
      .fill(hot("event") ? "#78350f" : "#0f172a")
      .stroke(hot("event") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Async Event");
          l.newline();
          l.color("click / timer / HTTP", "#fbbf24", { fontSize: 9 });
        },
        { fill: "#fde68a", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ─ zonejs: Zone.js ─ */
    builder
      .node("zonejs")
      .at(POS.zonejs.x, POS.zonejs.y)
      .rect(200, 52, 12)
      .fill(hot("zonejs") ? "#312e81" : "#0f172a")
      .stroke(hot("zonejs") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Zone.js");
          l.newline();
          l.color("Patches all async APIs", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#e0d4ff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ─ cd: Change Detection ─ */
    builder
      .node("cd")
      .at(POS.cd.x, POS.cd.y)
      .rect(240, 55, 12)
      .fill(hot("cd") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("cd") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Change Detection");
          l.newline();
          l.code("ApplicationRef.tick()");
        },
        { fill: "#93c5fd", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    /* ─ root: Root Component ─ */
    builder
      .node("root")
      .at(POS.root.x, POS.root.y)
      .rect(220, 52, 12)
      .fill(hot("root") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("root") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("AppComponent");
          l.newline();
          l.color(
            active ? "✓ Checked" : "Root of component tree",
            active ? "#93c5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ compA: Component A — has the change ─ */
    builder
      .node("compA")
      .at(POS.compA.x, POS.compA.y)
      .rect(200, 52, 12)
      .fill(hot("compA") ? "#064e3b" : "#0f172a")
      .stroke(hot("compA") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("ComponentA");
          l.newline();
          l.color(
            active ? "✓ Checked — data changed" : "Data changed here",
            active ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ compB: Component B — no change, still checked ─ */
    builder
      .node("compB")
      .at(POS.compB.x, POS.compB.y)
      .rect(200, 52, 12)
      .fill(hot("compB") ? "#78350f" : "#0f172a")
      .stroke(hot("compB") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("ComponentB");
          l.newline();
          l.color(
            active ? "⚠ Checked — no change" : "No change here",
            active ? "#fbbf24" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ compC: Component C — no change, still checked ─ */
    builder
      .node("compC")
      .at(POS.compC.x, POS.compC.y)
      .rect(200, 52, 12)
      .fill(hot("compC") ? "#78350f" : "#0f172a")
      .stroke(hot("compC") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("ComponentC");
          l.newline();
          l.color(
            active ? "⚠ Checked — no change" : "No change here",
            active ? "#fbbf24" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ result ─ */
    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(300, 40, 10)
      .fill("#0f172a")
      .stroke(hot("result") ? "#f59e0b" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color(
            active
              ? "⚠ 3/3 components checked — wasted work on B & C"
              : "Every component checked on each event",
            active ? "#fbbf24" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fbbf24", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("event", "zonejs", "e-evt-zone")
      .stroke(hot("zonejs") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("1. Intercepted", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("zonejs", "cd", "e-zone-cd")
      .stroke(hot("cd") ? "#3b82f6" : "#475569", 2)
      .arrow(true)
      .label("2. Triggers tick()", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("cd", "root", "e-cd-root")
      .stroke(hot("root") ? "#3b82f6" : "#475569", 2)
      .arrow(true)
      .label("3. Walk tree", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("root", "compA", "e-root-a")
      .stroke(hot("compA") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("4. Check", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("root", "compB", "e-root-b")
      .stroke(hot("compB") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("4. Check", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("root", "compC", "e-root-c")
      .stroke(hot("compC") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("4. Check", { fill: "#94a3b8", fontSize: 9 });

    builder.edge("compA", "result", "e-a-res").stroke("#1e293b", 1).arrow(true);

    builder.edge("compC", "result", "e-c-res").stroke("#1e293b", 1).arrow(true);
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Strategy", value: "Default", color: "#3b82f6" },
      {
        label: "Checks",
        value: state.checksPerCycle === "all" ? "All (3/3)" : "—",
        color: state.checksPerCycle === "all" ? "#f59e0b" : "#64748b",
      },
      {
        label: "Skipped",
        value: "0",
        color: "#64748b",
      },
      { label: "Trigger", value: "Zone.js", color: "#a78bfa" },
    ];
  },

  softReset(state: AngularState) {
    state.cdStrategy = "none";
    state.checksPerCycle = "none";
    state.skipCount = 0;
  },
};
