import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: top-to-bottom showing global style leakage ── */
const POS = {
  component: { x: 400, y: 65 },
  css: { x: 400, y: 185 },
  encap: { x: 400, y: 310 },
  myOutput: { x: 200, y: 445 },
  otherOutput: { x: 600, y: 445 },
  browser: { x: 400, y: 565 },
};

export const noneAdapter: AngularAdapter = {
  id: "none",

  profile: {
    label: "None",
    description:
      "ViewEncapsulation.None — Angular does not scope styles; they become global. Useful for theme libraries, but causes collisions.",
  },

  colors: { fill: "#78350f", stroke: "#f59e0b" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "ve-scoping" ||
      p === "ve-render" ||
      p === "ve-isolation" ||
      p === "ve-summary";
    state.styleScope = "none";
    state.collisionRisk = active ? "high" : "none";
    state.browserCompat = "all";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "encap",
        to: "otherOutput",
        duration: 700,
        color: "#f87171",
        explain: "⚠ Global CSS leaks! OtherComponent's buttons also turn red.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const leaked = state.collisionRisk === "high";

    /* ─ component: Your original CSS ─ */
    builder
      .node("component")
      .at(POS.component.x, POS.component.y)
      .rect(210, 58, 12)
      .fill(hot("component") ? "#78350f" : "#0f172a")
      .stroke(hot("component") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("MyComponent");
          l.newline();
          l.code("button { color: red }");
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ─ css: Untouched, dumped into <head> ─ */
    builder
      .node("css")
      .at(POS.css.x, POS.css.y)
      .rect(260, 58, 12)
      .fill(hot("css") ? "#312e81" : "#0f172a")
      .stroke(hot("css") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Global <style> in <head>");
          l.newline();
          l.color(
            leaked
              ? "⚠ Injected as-is — no rewriting"
              : "button { color: red }",
            leaked ? "#fbbf24" : "#c4b5fd",
            { fontSize: 9 },
          );
        },
        { fill: "#c4b5fd", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    /* ─ encap: No scoping at all ─ */
    builder
      .node("encap")
      .at(POS.encap.x, POS.encap.y)
      .rect(210, 55, 12)
      .fill(hot("encap") ? "#78350f" : "#0f172a")
      .stroke(hot("encap") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("No Scoping");
          l.newline();
          l.color(
            leaked ? "⚠ CSS matches ALL buttons" : "No transformation applied",
            leaked ? "#fbbf24" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ myOutput: Styled (intended) ─ */
    builder
      .node("myOutput")
      .at(POS.myOutput.x, POS.myOutput.y)
      .rect(220, 58, 12)
      .fill(hot("myOutput") ? "#78350f" : "#0f172a")
      .stroke(hot("myOutput") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("<app-my>");
          l.newline();
          l.color(
            leaked ? "<button> → red ✓ (intended)" : "<button>",
            leaked ? "#fcd34d" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ otherOutput: ALSO styled — leaked! ─ */
    builder
      .node("otherOutput")
      .at(POS.otherOutput.x, POS.otherOutput.y)
      .rect(220, 58, 12)
      .fill(hot("otherOutput") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("otherOutput") ? "#f87171" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("<app-other>");
          l.newline();
          l.color(
            leaked ? "<button> → ⚠ ALSO red!" : "<button>",
            leaked ? "#fca5a5" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ browser ─ */
    builder
      .node("browser")
      .at(POS.browser.x, POS.browser.y)
      .rect(160, 40, 10)
      .fill("#0f172a")
      .stroke(hot("browser") ? "#22c55e" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color("✓ All browsers supported", "#86efac", { fontSize: 9 });
        },
        { fill: "#86efac", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("component", "css", "e-comp-css")
      .stroke(hot("css") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("1. Write CSS", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("css", "encap", "e-css-encap")
      .stroke(hot("encap") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("2. No rewriting!", {
        fill: leaked ? "#fbbf24" : "#94a3b8",
        fontSize: 9,
      });

    builder
      .edge("encap", "myOutput", "e-encap-my")
      .stroke(hot("myOutput") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("3. Matches ✓", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("encap", "otherOutput", "e-encap-other")
      .stroke(leaked ? "#f87171" : "#475569", leaked ? 3 : 1.5)
      .arrow(true)
      .label(leaked ? "4. ⚠ Also matches!" : "4. Leaks?", {
        fill: leaked ? "#fca5a5" : "#64748b",
        fontSize: 9,
      });

    builder
      .edge("myOutput", "browser", "e-my-browser")
      .stroke("#1e293b", 1)
      .arrow(true);

    builder
      .edge("otherOutput", "browser", "e-other-browser")
      .stroke("#1e293b", 1)
      .arrow(true);
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Mode", value: "None", color: "#f59e0b" },
      { label: "Scope", value: "Global ⚠", color: "#f59e0b" },
      {
        label: "Collision",
        value: state.collisionRisk === "high" ? "⚠ High" : "—",
        color: state.collisionRisk === "high" ? "#f87171" : "#64748b",
      },
      { label: "Compat", value: "All ✓", color: "#22c55e" },
    ];
  },

  softReset(state: AngularState) {
    state.styleScope = "none";
    state.collisionRisk = "none";
    state.browserCompat = "all";
  },
};
