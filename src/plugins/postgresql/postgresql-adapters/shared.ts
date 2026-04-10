import type { PostgresqlState, VariantKey } from "../postgresqlSlice";
import type { PostgresqlAdapter, StrategyNotes, VariantColors } from "./types";

interface StrategyConfig {
  id: VariantKey;
  label: string;
  description: string;
  colors: VariantColors;
  badgeBestFor: string;
  badgeOperators: string;
  maintenanceCost: string;
  tableAffinity: string;
  queryLines: string[];
  workloadLines: string[];
  operatorLines: string[];
  indexLines: string[];
  tradeoffLines: string[];
  compositeLines: string[];
  notes: StrategyNotes;
  renderExtra?: (builder: any, state: PostgresqlState, helpers: any) => void;
}

const POS = {
  query: { x: 150, y: 220, w: 220, h: 112 },
  workload: { x: 150, y: 505, w: 220, h: 96 },
  operators: { x: 455, y: 220, w: 230, h: 112 },
  index: { x: 780, y: 220, w: 230, h: 124 },
  tradeoffs: { x: 1085, y: 220, w: 220, h: 124 },
  composite: { x: 770, y: 505, w: 540, h: 96 },
};

const ZONES = {
  evidence: { x: 40, y: 110, w: 250, h: 450, label: "Workload Evidence" },
  operatorFit: { x: 330, y: 110, w: 605, h: 180, label: "Operator Fit" },
  tradeoffs: { x: 950, y: 110, w: 245, h: 180, label: "Operational Cost" },
  design: { x: 495, y: 445, w: 550, h: 120, label: "Composite Design" },
};

function drawZone(
  overlay: any,
  key: string,
  zone: { x: number; y: number; w: number; h: number; label: string },
  color: string,
) {
  overlay.add(
    "rect",
    {
      x: zone.x,
      y: zone.y,
      w: zone.w,
      h: zone.h,
      rx: 18,
      fill: "rgba(15, 23, 42, 0.24)",
      stroke: color,
      strokeWidth: 1.2,
      strokeDasharray: "8 6",
      opacity: 0.22,
    },
    { key: `${key}-rect` },
  );
  overlay.add(
    "text",
    {
      x: zone.x + 14,
      y: zone.y + 18,
      text: zone.label,
      fill: color,
      fontSize: 10,
      fontWeight: "600",
      textAnchor: "start",
    },
    { key: `${key}-label` },
  );
}

function drawCard(
  builder: any,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  lines: string[],
  accent: string,
  active: boolean,
  forceAccent = false,
) {
  builder
    .node(id)
    .at(x, y)
    .rect(w, h, 18)
    .fill(active || forceAccent ? "rgba(15, 23, 42, 0.92)" : "#0f172a")
    .stroke(active || forceAccent ? accent : "#334155", 2)
    .richLabel(
      (label: any) => {
        label.bold(title);
        lines.forEach((line) => {
          label.newline();
          label.color(line, active || forceAccent ? "#cbd5e1" : "#94a3b8", {
            fontSize: 9,
          });
        });
      },
      {
        fill: "#fff",
        fontSize: 12,
        dy: -10,
        lineHeight: 1.55,
      },
    );
}

export function createIndexStrategyAdapter(
  config: StrategyConfig,
): PostgresqlAdapter {
  return {
    id: config.id,

    profile: {
      label: config.label,
      description: config.description,
    },

    colors: config.colors,

    notes: config.notes,

    computeMetrics(state: PostgresqlState) {
      state.workloadFocus = config.badgeBestFor;
      state.operatorCoverage = config.badgeOperators;
      state.maintenanceCost = config.maintenanceCost;
      state.tableAffinity = config.tableAffinity;
    },

    expandToken() {
      return null;
    },

    getFlowBeats() {
      return [
        {
          from: "query",
          to: "operators",
          duration: 320,
          color: config.colors.stroke,
        },
        {
          from: "workload",
          to: "index",
          duration: 340,
          color: config.colors.stroke,
        },
        {
          from: "operators",
          to: "index",
          duration: 360,
          color: config.colors.stroke,
        },
        {
          from: "index",
          to: "tradeoffs",
          duration: 380,
          color: config.colors.stroke,
        },
        {
          from: "index",
          to: "composite",
          duration: 400,
          color: config.colors.stroke,
        },
      ];
    },

    buildTopology(builder, state: PostgresqlState, helpers) {
      const isSummary = helpers.phase === "summary";
      const isComparison = helpers.phase === "comparison";
      const highlight = (zone: string) => helpers.hot(zone);

      builder.overlay((overlay: any) => {
        drawZone(overlay, "zone-evidence", ZONES.evidence, "#38bdf8");
        drawZone(overlay, "zone-fit", ZONES.operatorFit, config.colors.stroke);
        drawZone(overlay, "zone-tradeoffs", ZONES.tradeoffs, "#f59e0b");
        drawZone(overlay, "zone-design", ZONES.design, "#14b8a6");

        overlay.add(
          "text",
          {
            x: 620,
            y: 54,
            text: "Start with the workload, then choose the smallest index that serves it well.",
            fill: "#cbd5e1",
            fontSize: 14,
            fontWeight: "600",
          },
          { key: "header-note" },
        );
        overlay.add(
          "text",
          {
            x: 620,
            y: 78,
            text: "Check predicates, ordering, selectivity, read/write mix, and physical locality before adding another index.",
            fill: "#94a3b8",
            fontSize: 10,
            fontWeight: "500",
          },
          { key: "subheader-note" },
        );
      });

      drawCard(
        builder,
        "query",
        POS.query.x,
        POS.query.y,
        POS.query.w,
        POS.query.h,
        "Observed Queries",
        config.queryLines,
        "#38bdf8",
        highlight("query"),
      );
      drawCard(
        builder,
        "workload",
        POS.workload.x,
        POS.workload.y,
        POS.workload.w,
        POS.workload.h,
        "Typical App Pattern",
        config.workloadLines,
        "#14b8a6",
        highlight("workload") || isComparison,
      );
      drawCard(
        builder,
        "operators",
        POS.operators.x,
        POS.operators.y,
        POS.operators.w,
        POS.operators.h,
        "Operator Match",
        config.operatorLines,
        config.colors.stroke,
        highlight("operators"),
      );
      drawCard(
        builder,
        "index",
        POS.index.x,
        POS.index.y,
        POS.index.w,
        POS.index.h,
        config.label,
        config.indexLines,
        config.colors.stroke,
        highlight("index") || isSummary,
        true,
      );
      drawCard(
        builder,
        "tradeoffs",
        POS.tradeoffs.x,
        POS.tradeoffs.y,
        POS.tradeoffs.w,
        POS.tradeoffs.h,
        "Trade-offs",
        config.tradeoffLines,
        "#f59e0b",
        highlight("tradeoffs") || isSummary,
      );
      drawCard(
        builder,
        "composite",
        POS.composite.x,
        POS.composite.y,
        POS.composite.w,
        POS.composite.h,
        "Composite / Covering",
        config.compositeLines,
        "#14b8a6",
        highlight("composite") || isComparison,
      );

      builder
        .edge("query", "operators", "edge-query-operators")
        .stroke(highlight("operators") ? config.colors.stroke : "#475569", 2)
        .arrow(true)
        .label("WHERE / ORDER BY / GROUP BY", {
          fill: "#93c5fd",
          fontSize: 9,
        });

      builder
        .edge("workload", "index", "edge-workload-index")
        .stroke(
          highlight("workload") || highlight("index")
            ? config.colors.stroke
            : "#475569",
          2,
        )
        .arrow(true)
        .label("read/write + locality", {
          fill: "#5eead4",
          fontSize: 9,
        });

      builder
        .edge("operators", "index", "edge-operators-index")
        .stroke(highlight("index") ? config.colors.stroke : "#475569", 2)
        .arrow(true)
        .label("operator class fit", {
          fill: config.colors.stroke,
          fontSize: 9,
        });

      builder
        .edge("index", "tradeoffs", "edge-index-tradeoffs")
        .stroke(highlight("tradeoffs") ? "#f59e0b" : "#475569", 2)
        .arrow(true)
        .label("write cost + footprint", {
          fill: "#fcd34d",
          fontSize: 9,
        });

      builder
        .edge("query", "composite", "edge-query-composite")
        .stroke(highlight("composite") ? "#14b8a6" : "#475569", 2)
        .arrow(true)
        .label("combined filters", {
          fill: "#99f6e4",
          fontSize: 9,
        });

      builder
        .edge("index", "composite", "edge-index-composite")
        .stroke(highlight("composite") ? "#14b8a6" : "#475569", 2)
        .arrow(true)
        .label("final design", {
          fill: "#99f6e4",
          fontSize: 9,
        });

      config.renderExtra?.(builder, state, helpers);

      if (state.phase === "summary") {
        builder.overlay((overlay: any) => {
          overlay.add(
            "text",
            {
              x: 780,
              y: 330,
              text: config.description,
              fill: config.colors.stroke,
              fontSize: 11,
              fontWeight: "600",
            },
            { key: "summary-caption" },
          );
        });
      }
    },

    getStatBadges(state: PostgresqlState) {
      return [
        {
          label: "Best For",
          value: state.workloadFocus,
          color: config.colors.stroke,
        },
        {
          label: "Operators",
          value: state.operatorCoverage,
          color: config.colors.stroke,
        },
        {
          label: "Write Cost",
          value: state.maintenanceCost,
          color: config.colors.stroke,
        },
        {
          label: "Table Fit",
          value: state.tableAffinity,
          color: config.colors.stroke,
        },
      ];
    },

    softReset(state: PostgresqlState) {
      state.workloadFocus = config.badgeBestFor;
      state.operatorCoverage = config.badgeOperators;
      state.maintenanceCost = config.maintenanceCost;
      state.tableAffinity = config.tableAffinity;
    },
  };
}
