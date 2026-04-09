import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: top-to-bottom DOM tree showing attribute scoping ── */
const POS = {
  component: { x: 400, y: 65 },
  css: { x: 400, y: 185 },
  encap: { x: 400, y: 310 },
  myOutput: { x: 200, y: 445 },
  otherOutput: { x: 600, y: 445 },
  browser: { x: 400, y: 565 },
};

export const emulatedAdapter: AngularAdapter = {
  id: "emulated",

  profile: {
    label: "Emulated",
    description:
      "ViewEncapsulation.Emulated (default) — Angular scopes styles by adding unique _ngcontent attributes. Works on all browsers without real Shadow DOM.",
  },

  colors: { fill: "#1e3a5f", stroke: "#3b82f6" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "ve-scoping" ||
      p === "ve-render" ||
      p === "ve-isolation" ||
      p === "ve-summary";
    state.styleScope = active ? "attribute" : "none";
    state.collisionRisk = active ? "low" : "none";
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
        color: "#3b82f6",
        explain:
          "Scoped CSS checks OtherComponent — no _ngcontent-abc attribute, so it doesn't match.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const scoped = state.styleScope === "attribute";

    /* ─ component: Your original CSS ─ */
    builder
      .node("component")
      .at(POS.component.x, POS.component.y)
      .rect(210, 58, 12)
      .fill(hot("component") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("component") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("MyComponent");
          l.newline();
          l.code("button { color: red }");
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ─ css: Rewritten CSS rule ─ */
    builder
      .node("css")
      .at(POS.css.x, POS.css.y)
      .rect(260, 58, 12)
      .fill(hot("css") ? "#312e81" : "#0f172a")
      .stroke(hot("css") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Rewritten CSS");
          l.newline();
          l.code(
            scoped ? "button[_ngcontent-abc] { }" : "button { color: red }",
          );
        },
        { fill: "#c4b5fd", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    /* ─ encap: The attribute-scoping engine ─ */
    builder
      .node("encap")
      .at(POS.encap.x, POS.encap.y)
      .rect(210, 55, 12)
      .fill(hot("encap") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("encap") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Emulated Scoping");
          l.newline();
          l.color(
            scoped ? "Adds _ngcontent-abc to DOM" : "Attribute-based matcher",
            scoped ? "#93c5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ myOutput: DOM with the attribute ─ */
    builder
      .node("myOutput")
      .at(POS.myOutput.x, POS.myOutput.y)
      .rect(220, 58, 12)
      .fill(hot("myOutput") ? "#064e3b" : "#0f172a")
      .stroke(hot("myOutput") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("<app-my>");
          l.newline();
          l.color(
            scoped ? "<button _ngcontent-abc> ✓" : "<button _ngcontent-abc>",
            scoped ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ otherOutput: DOM without the attribute ─ */
    builder
      .node("otherOutput")
      .at(POS.otherOutput.x, POS.otherOutput.y)
      .rect(220, 58, 12)
      .fill(hot("otherOutput") ? (scoped ? "#064e3b" : "#0f172a") : "#0f172a")
      .stroke(
        hot("otherOutput") ? (scoped ? "#22c55e" : "#334155") : "#334155",
        2,
      )
      .richLabel(
        (l: any) => {
          l.bold("<app-other>");
          l.newline();
          l.color(
            scoped ? "<button> (no attr) ✗" : "<button>",
            scoped ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ browser: Compat badge ─ */
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
      .stroke(hot("encap") ? "#3b82f6" : "#475569", 2)
      .arrow(true)
      .label("2. Rewrite + add attr", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("encap", "myOutput", "e-encap-my")
      .stroke(hot("myOutput") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label(scoped ? "3. ✓ Attr matches" : "3. Apply", {
        fill: scoped ? "#86efac" : "#94a3b8",
        fontSize: 9,
      });

    builder
      .edge("encap", "otherOutput", "e-encap-other")
      .stroke(scoped ? "#22c55e" : "#475569", scoped ? 2.5 : 1.5)
      .arrow(true)
      .dashed()
      .label(scoped ? "4. ✗ No attr → blocked" : "4. Leaks?", {
        fill: scoped ? "#86efac" : "#64748b",
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
      { label: "Mode", value: "Emulated", color: "#3b82f6" },
      {
        label: "Scope",
        value: state.styleScope === "attribute" ? "_ngcontent" : "—",
        color: state.styleScope === "attribute" ? "#3b82f6" : "#64748b",
      },
      {
        label: "Collision",
        value: state.collisionRisk === "low" ? "Low" : "—",
        color: state.collisionRisk === "low" ? "#22c55e" : "#64748b",
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
