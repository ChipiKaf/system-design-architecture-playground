import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: top-to-bottom showing standalone component composition ── */
const POS = {
  decorator: { x: 400, y: 60 },
  imports: { x: 400, y: 185 },
  component: { x: 400, y: 310 },
  treeShake: { x: 200, y: 445 },
  bundle: { x: 600, y: 445 },
  result: { x: 400, y: 565 },
};

export const standaloneAdapter: AngularAdapter = {
  id: "standalone",

  profile: {
    label: "Standalone",
    description:
      "standalone: true — declare dependencies directly in @Component.imports. No NgModule needed. Recommended default since Angular 17.",
  },

  colors: { fill: "#064e3b", stroke: "#14b8a6" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "sc-imports" ||
      p === "sc-compose" ||
      p === "sc-treeshake" ||
      p === "sc-summary";
    state.moduleStrategy = active ? "standalone" : "none";
    state.treeShaking = active ? "optimal" : "none";
    state.boilerplate = active ? "minimal" : "none";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "component",
        to: "treeShake",
        duration: 700,
        color: "#14b8a6",
        explain:
          "✓ Only imported dependencies are bundled — unused code is tree-shaken away.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const active = state.moduleStrategy === "standalone";

    /* ─ decorator: @Component with standalone: true ─ */
    builder
      .node("decorator")
      .at(POS.decorator.x, POS.decorator.y)
      .rect(230, 58, 12)
      .fill(hot("decorator") ? "#064e3b" : "#0f172a")
      .stroke(hot("decorator") ? "#14b8a6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("@Component({");
          l.newline();
          l.code("standalone: true");
          l.bold(" })");
        },
        { fill: "#5eead4", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ─ imports: Direct dependency imports ─ */
    builder
      .node("imports")
      .at(POS.imports.x, POS.imports.y)
      .rect(270, 58, 12)
      .fill(hot("imports") ? "#312e81" : "#0f172a")
      .stroke(hot("imports") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("imports: [");
          l.newline();
          l.code("CommonModule, RouterLink");
          l.bold(" ]");
        },
        { fill: "#c4b5fd", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    /* ─ component: The self-contained component ─ */
    builder
      .node("component")
      .at(POS.component.x, POS.component.y)
      .rect(230, 55, 12)
      .fill(hot("component") ? "#064e3b" : "#0f172a")
      .stroke(hot("component") ? "#14b8a6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("CardComponent");
          l.newline();
          l.color(
            active ? "✓ Self-contained" : "Standalone component",
            active ? "#5eead4" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ treeShake: Optimal tree-shaking ─ */
    builder
      .node("treeShake")
      .at(POS.treeShake.x, POS.treeShake.y)
      .rect(210, 55, 12)
      .fill(hot("treeShake") ? "#064e3b" : "#0f172a")
      .stroke(hot("treeShake") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Tree-Shaking");
          l.newline();
          l.color(
            active ? "✓ Only what's imported" : "Bundler analysis",
            active ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ bundle: Small, focused bundle ─ */
    builder
      .node("bundle")
      .at(POS.bundle.x, POS.bundle.y)
      .rect(210, 55, 12)
      .fill(hot("bundle") ? "#064e3b" : "#0f172a")
      .stroke(hot("bundle") ? "#14b8a6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Lazy-Loadable");
          l.newline();
          l.color(
            active ? "✓ Direct route loading" : "Route → Component",
            active ? "#5eead4" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ result: Final output ─ */
    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(200, 40, 10)
      .fill("#0f172a")
      .stroke(hot("result") ? "#22c55e" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color(
            active
              ? "✓ Minimal boilerplate, optimal bundles"
              : "Angular 14+ recommended default",
            active ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#86efac", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("decorator", "imports", "e-dec-imp")
      .stroke(hot("imports") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("1. Declare deps inline", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("imports", "component", "e-imp-comp")
      .stroke(hot("component") ? "#14b8a6" : "#475569", 2)
      .arrow(true)
      .label("2. Self-contained unit", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("component", "treeShake", "e-comp-tree")
      .stroke(hot("treeShake") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label(active ? "3. ✓ Exact imports" : "3. Bundle analysis", {
        fill: active ? "#86efac" : "#94a3b8",
        fontSize: 9,
      });

    builder
      .edge("component", "bundle", "e-comp-bundle")
      .stroke(hot("bundle") ? "#14b8a6" : "#475569", 2)
      .arrow(true)
      .label("4. Route directly", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("treeShake", "result", "e-tree-result")
      .stroke("#1e293b", 1)
      .arrow(true);

    builder
      .edge("bundle", "result", "e-bundle-result")
      .stroke("#1e293b", 1)
      .arrow(true);
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Mode", value: "Standalone", color: "#14b8a6" },
      {
        label: "Tree-shake",
        value: state.treeShaking === "optimal" ? "Optimal ✓" : "—",
        color: state.treeShaking === "optimal" ? "#22c55e" : "#64748b",
      },
      {
        label: "Boilerplate",
        value: state.boilerplate === "minimal" ? "Minimal ✓" : "—",
        color: state.boilerplate === "minimal" ? "#22c55e" : "#64748b",
      },
      { label: "Since", value: "v14+", color: "#14b8a6" },
    ];
  },

  softReset(state: AngularState) {
    state.moduleStrategy = "none";
    state.treeShaking = "none";
    state.boilerplate = "none";
  },
};
