import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: shadow boundary layout ───────────────── *
 * Left column = Document Tree (component, otherOutput)
 * Center box  = Shadow Boundary (encap, css, myOutput)
 * Right col   = Result (browser)
 * ──────────────────────────────────────────────────────── */
const POS = {
  component: { x: 350, y: 55 },
  css: { x: 350, y: 175 },
  /* ── inside shadow boundary ── */
  boundary: { x: 350, y: 365 },
  encap: { x: 350, y: 300 },
  myOutput: { x: 350, y: 440 },
  /* ── outside shadow boundary ── */
  otherOutput: { x: 690, y: 300 },
  browser: { x: 690, y: 440 },
};

export const shadowDomAdapter: AngularAdapter = {
  id: "shadow-dom",

  profile: {
    label: "ShadowDom",
    description:
      "ViewEncapsulation.ShadowDom — Angular uses the native Shadow DOM API to encapsulate styles. True browser-enforced isolation.",
  },

  colors: { fill: "#064e3b", stroke: "#14b8a6" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "ve-scoping" ||
      p === "ve-render" ||
      p === "ve-isolation" ||
      p === "ve-summary";
    state.styleScope = active ? "shadow" : "none";
    state.collisionRisk = active ? "none" : "none";
    state.browserCompat = "modern";
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
        color: "#14b8a6",
        explain:
          "✓ Shadow boundary blocks everything — styles can't escape #shadow-root.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const shadowed = state.styleScope === "shadow";

    /* ─ Shadow boundary background (rendered first = behind) ─ */
    builder
      .node("boundary")
      .at(POS.boundary.x, POS.boundary.y)
      .rect(300, 240, 16)
      .fill(shadowed ? "rgba(20, 184, 166, 0.06)" : "rgba(30, 41, 59, 0.3)")
      .stroke(shadowed ? "#14b8a6" : "#1e293b", shadowed ? 1.5 : 0.5)
      .richLabel(
        (l: any) => {
          l.color(
            "Shadow Boundary",
            shadowed ? "rgba(94, 234, 212, 0.8)" : "#475569",
            { fontSize: 9 },
          );
        },
        { fill: "#5eead4", fontSize: 9, dy: -105 },
      );

    /* ─ component: Your component source ─ */
    builder
      .node("component")
      .at(POS.component.x, POS.component.y)
      .rect(210, 58, 12)
      .fill(hot("component") ? "#134e4a" : "#0f172a")
      .stroke(hot("component") ? "#14b8a6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("MyComponent");
          l.newline();
          l.code("button { color: red }");
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ─ css: Style declaration ─ */
    builder
      .node("css")
      .at(POS.css.x, POS.css.y)
      .rect(240, 58, 12)
      .fill(hot("css") ? "#312e81" : "#0f172a")
      .stroke(hot("css") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Component <style>");
          l.newline();
          l.code("button { color: red }");
        },
        { fill: "#c4b5fd", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    /* ─ encap: #shadow-root (inside boundary) ─ */
    builder
      .node("encap")
      .at(POS.encap.x, POS.encap.y)
      .rect(240, 55, 12)
      .fill(hot("encap") ? "#134e4a" : "#0f172a")
      .stroke(hot("encap") ? "#14b8a6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("#shadow-root (open)");
          l.newline();
          l.color(
            shadowed ? "✓ Browser-enforced isolation" : "Native shadow DOM",
            shadowed ? "#5eead4" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ myOutput: Content sealed inside shadow (inside boundary) ─ */
    builder
      .node("myOutput")
      .at(POS.myOutput.x, POS.myOutput.y)
      .rect(240, 55, 12)
      .fill(hot("myOutput") ? "#134e4a" : "#0f172a")
      .stroke(hot("myOutput") ? "#14b8a6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("<button>Click</button>");
          l.newline();
          l.color(
            shadowed ? "✓ Styled & sealed inside" : "Rendered in shadow root",
            shadowed ? "#5eead4" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ otherOutput: Outside the boundary ─ */
    builder
      .node("otherOutput")
      .at(POS.otherOutput.x, POS.otherOutput.y)
      .rect(200, 55, 12)
      .fill(hot("otherOutput") ? "#064e3b" : "#0f172a")
      .stroke(hot("otherOutput") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("<app-other>");
          l.newline();
          l.color(
            shadowed ? "✓ Completely unaffected" : "Outside shadow tree",
            shadowed ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ browser: Compat warning ─ */
    builder
      .node("browser")
      .at(POS.browser.x, POS.browser.y)
      .rect(180, 40, 10)
      .fill("#0f172a")
      .stroke(hot("browser") ? "#f59e0b" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color("⚠ Modern browsers only", "#fcd34d", { fontSize: 9 });
        },
        { fill: "#fcd34d", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("component", "css", "e-comp-css")
      .stroke(hot("css") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("1. Write CSS", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("css", "encap", "e-css-encap")
      .stroke(hot("encap") ? "#14b8a6" : "#475569", 2)
      .arrow(true)
      .label("2. Into #shadow-root", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("encap", "myOutput", "e-encap-my")
      .stroke(hot("myOutput") ? "#14b8a6" : "#475569", 2)
      .arrow(true)
      .label("3. Sealed inside", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("encap", "otherOutput", "e-encap-other")
      .stroke(shadowed ? "#22c55e" : "#475569", shadowed ? 2.5 : 1.5)
      .arrow(true)
      .dashed()
      .label(shadowed ? "4. ✓ Boundary blocks" : "4. Crosses?", {
        fill: shadowed ? "#86efac" : "#64748b",
        fontSize: 9,
      });

    builder
      .edge("otherOutput", "browser", "e-other-browser")
      .stroke("#1e293b", 1)
      .arrow(true);
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Mode", value: "ShadowDom", color: "#14b8a6" },
      {
        label: "Scope",
        value: state.styleScope === "shadow" ? "#shadow-root" : "—",
        color: state.styleScope === "shadow" ? "#14b8a6" : "#64748b",
      },
      {
        label: "Collision",
        value: "None",
        color: "#22c55e",
      },
      { label: "Compat", value: "Modern ⚠", color: "#f59e0b" },
    ];
  },

  softReset(state: AngularState) {
    state.styleScope = "none";
    state.collisionRisk = "none";
    state.browserCompat = "modern";
  },
};
