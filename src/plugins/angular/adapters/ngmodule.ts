import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: top-to-bottom showing NgModule indirection ── */
const POS = {
  ngmodule: { x: 400, y: 60 },
  declarations: { x: 200, y: 195 },
  imports: { x: 600, y: 195 },
  component: { x: 400, y: 330 },
  treeShake: { x: 200, y: 465 },
  bundle: { x: 600, y: 465 },
  result: { x: 400, y: 575 },
};

export const ngmoduleAdapter: AngularAdapter = {
  id: "ngmodule",

  profile: {
    label: "NgModule",
    description:
      "@NgModule — the traditional way to organise Angular apps. Groups declarations, imports, providers, and exports. Still needed for legacy libraries.",
  },

  colors: { fill: "#78350f", stroke: "#f59e0b" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "sc-imports" ||
      p === "sc-compose" ||
      p === "sc-treeshake" ||
      p === "sc-summary";
    state.moduleStrategy = active ? "ngmodule" : "none";
    state.treeShaking = active ? "limited" : "none";
    state.boilerplate = active ? "heavy" : "none";
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
        color: "#f59e0b",
        explain:
          "⚠ The entire module is bundled — unused declarations may remain in the output.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const active = state.moduleStrategy === "ngmodule";

    /* ─ ngmodule: @NgModule decorator ─ */
    builder
      .node("ngmodule")
      .at(POS.ngmodule.x, POS.ngmodule.y)
      .rect(250, 58, 12)
      .fill(hot("ngmodule") ? "#78350f" : "#0f172a")
      .stroke(hot("ngmodule") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("@NgModule({");
          l.newline();
          l.code("declarations, imports, ...");
          l.bold(" })");
        },
        { fill: "#fcd34d", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ─ declarations: Components belong to a module ─ */
    builder
      .node("declarations")
      .at(POS.declarations.x, POS.declarations.y)
      .rect(220, 58, 12)
      .fill(hot("declarations") ? "#78350f" : "#0f172a")
      .stroke(hot("declarations") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("declarations:");
          l.newline();
          l.code("[CardComp, ListComp, ...]");
        },
        { fill: "#fcd34d", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    /* ─ imports: Module-level imports ─ */
    builder
      .node("imports")
      .at(POS.imports.x, POS.imports.y)
      .rect(220, 58, 12)
      .fill(hot("imports") ? "#312e81" : "#0f172a")
      .stroke(hot("imports") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("imports:");
          l.newline();
          l.code("[CommonModule, FormsModule]");
        },
        { fill: "#c4b5fd", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    /* ─ component: Lives inside the module ─ */
    builder
      .node("component")
      .at(POS.component.x, POS.component.y)
      .rect(230, 55, 12)
      .fill(hot("component") ? "#78350f" : "#0f172a")
      .stroke(hot("component") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("CardComponent");
          l.newline();
          l.color(
            active ? "Belongs to FeatureModule" : "Declared in a module",
            active ? "#fcd34d" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ treeShake: Module-level granularity ─ */
    builder
      .node("treeShake")
      .at(POS.treeShake.x, POS.treeShake.y)
      .rect(210, 55, 12)
      .fill(hot("treeShake") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("treeShake") ? "#f87171" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Tree-Shaking");
          l.newline();
          l.color(
            active ? "⚠ Entire module bundled" : "Bundler analysis",
            active ? "#fca5a5" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ bundle: Lazy-load requires a module ─ */
    builder
      .node("bundle")
      .at(POS.bundle.x, POS.bundle.y)
      .rect(210, 55, 12)
      .fill(hot("bundle") ? "#78350f" : "#0f172a")
      .stroke(hot("bundle") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Lazy-Loading");
          l.newline();
          l.color(
            active ? "Route → Module → Component" : "Requires module wrapper",
            active ? "#fcd34d" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ result ─ */
    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(220, 40, 10)
      .fill("#0f172a")
      .stroke(hot("result") ? "#f59e0b" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color(
            active
              ? "⚠ More boilerplate, coarser bundles"
              : "Traditional Angular architecture",
            active ? "#fcd34d" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fcd34d", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("ngmodule", "declarations", "e-mod-decl")
      .stroke(hot("declarations") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("1. Register components", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("ngmodule", "imports", "e-mod-imp")
      .stroke(hot("imports") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("1. Import dependencies", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("declarations", "component", "e-decl-comp")
      .stroke(hot("component") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("2. Component lives here", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("imports", "component", "e-imp-comp")
      .stroke(hot("component") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("2. Available to use", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("component", "treeShake", "e-comp-tree")
      .stroke(hot("treeShake") ? "#f87171" : "#475569", active ? 2.5 : 1.5)
      .arrow(true)
      .label(active ? "3. ⚠ Whole module" : "3. Bundle analysis", {
        fill: active ? "#fca5a5" : "#94a3b8",
        fontSize: 9,
      });

    builder
      .edge("component", "bundle", "e-comp-bundle")
      .stroke(hot("bundle") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("4. Module wrapper needed", { fill: "#94a3b8", fontSize: 9 });

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
      { label: "Mode", value: "NgModule", color: "#f59e0b" },
      {
        label: "Tree-shake",
        value: state.treeShaking === "limited" ? "⚠ Limited" : "—",
        color: state.treeShaking === "limited" ? "#f87171" : "#64748b",
      },
      {
        label: "Boilerplate",
        value: state.boilerplate === "heavy" ? "⚠ Heavy" : "—",
        color: state.boilerplate === "heavy" ? "#f59e0b" : "#64748b",
      },
      { label: "Status", value: "Legacy", color: "#f59e0b" },
    ];
  },

  softReset(state: AngularState) {
    state.moduleStrategy = "none";
    state.treeShaking = "none";
    state.boilerplate = "none";
  },
};
