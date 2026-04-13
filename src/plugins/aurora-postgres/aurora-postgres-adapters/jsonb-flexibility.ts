import type { AuroraPostgresAdapter } from "./types";
import type { AuroraPostgresState } from "../auroraPostgresSlice";

/* ══════════════════════════════════════════════════════════
   JSONB Flexibility — Structured core + flexible details

   Insurance has a rigid core (policy number, dates, status)
   but wildly varying details (auto vs home vs life).
   PostgreSQL JSONB gives you both in one database.

   Row 1: Policy Core (relational) → JSONB Details → GIN Index
   Row 2: Query Both → Full-Text → Result
   ══════════════════════════════════════════════════════════ */

const POS = {
  core: { x: 60, y: 80 },
  jsonb: { x: 300, y: 80 },
  ginIndex: { x: 540, y: 80 },
  queryBoth: { x: 60, y: 240 },
  fullText: { x: 300, y: 240 },
  result: { x: 540, y: 240 },
};

export const jsonbFlexibilityAdapter: AuroraPostgresAdapter = {
  id: "jsonb-flexibility",

  profile: {
    label: "JSONB Flexibility",
    description:
      "Structured columns for what's universal (policy_id, status, dates). JSONB for what varies by product line (auto coverage vs home riders vs life beneficiaries). One table, both worlds.",
  },

  colors: { fill: "#312e81", stroke: "#a78bfa" },

  computeMetrics(state: AuroraPostgresState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.schemaMode = active ? "hybrid" : "none";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "core",
        to: "jsonb",
        duration: 550,
        color: "#a78bfa",
        explain:
          "The policies table has typed columns: policy_id BIGINT, status VARCHAR, effective_date DATE, premium NUMERIC. These are indexed, constrained, and type-safe. This is your auditable core.",
      },
      {
        from: "jsonb",
        to: "gin-index",
        duration: 550,
        color: "#a78bfa",
        explain:
          'The same row has: details JSONB. For auto insurance: {"vin": "...", "make": "Toyota", "deductible": 500}. For home: {"sqft": 2200, "roof_year": 2018, "riders": ["flood"]}. No schema migration needed when adding a new product.',
      },
      {
        from: "gin-index",
        to: "query-both",
        duration: 500,
        color: "#f59e0b",
        explain:
          'CREATE INDEX idx_details ON policies USING GIN (details). The GIN index lets you query inside JSONB at near-relational speed. WHERE details @> \'{"make": "Toyota"}\' uses the index, not a table scan.',
      },
      {
        from: "query-both",
        to: "full-text",
        duration: 500,
        color: "#f59e0b",
        explain:
          "SELECT * FROM policies WHERE status = 'active' AND details->>'make' = 'Toyota' AND premium > 1000. You mix relational WHERE clauses with JSONB path queries in a single statement. SQL + JSON, unified.",
      },
      {
        from: "full-text",
        to: "result",
        duration: 450,
        color: "#22d3ee",
        explain:
          "PostgreSQL also supports jsonb_path_query for JSONPath, containment operators (@>, <@), and JSONB aggregation (jsonb_agg). You get document-database flexibility without giving up transactions or joins.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Relational Core Columns",
      "JSONB Details Column",
      "GIN Index on JSONB",
      "Hybrid SQL + JSON Query",
      "Full JSON Power",
    ];
  },

  buildTopology(builder: any, _state: AuroraPostgresState, helpers) {
    const hot = helpers.hot;

    builder
      .node("core")
      .at(POS.core.x, POS.core.y)
      .rect(180, 54, 12)
      .fill(hot("core") ? "#14532d" : "#0f172a")
      .stroke(hot("core") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Relational Core");
          l.newline();
          l.color("policy_id, status, premium", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("jsonb")
      .at(POS.jsonb.x, POS.jsonb.y)
      .rect(180, 54, 12)
      .fill(hot("jsonb") ? "#312e81" : "#0f172a")
      .stroke(hot("jsonb") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("JSONB Details");
          l.newline();
          l.color("auto / home / life", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("gin-index")
      .at(POS.ginIndex.x, POS.ginIndex.y)
      .rect(180, 54, 12)
      .fill(hot("gin-index") ? "#312e81" : "#0f172a")
      .stroke(hot("gin-index") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("GIN Index");
          l.newline();
          l.color("fast JSONB lookups", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("query-both")
      .at(POS.queryBoth.x, POS.queryBoth.y)
      .rect(180, 54, 12)
      .fill(hot("query-both") ? "#78350f" : "#0f172a")
      .stroke(hot("query-both") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Hybrid Query");
          l.newline();
          l.color("SQL + JSONB operators", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("full-text")
      .at(POS.fullText.x, POS.fullText.y)
      .rect(180, 54, 12)
      .fill(hot("full-text") ? "#78350f" : "#0f172a")
      .stroke(hot("full-text") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("JSONPath + Ops");
          l.newline();
          l.color("@>, <@, jsonb_agg", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(160, 54, 12)
      .fill(hot("result") ? "#164e63" : "#0f172a")
      .stroke(hot("result") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Result Set");
          l.newline();
          l.color("typed + flexible", "#a5f3fc", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* Edges */
    builder.edge("core", "jsonb", "e-core-jsonb").stroke("#a78bfa", 1.4);
    builder.edge("jsonb", "gin-index", "e-jsonb-gin").stroke("#a78bfa", 1.4);
    builder
      .edge("gin-index", "query-both", "e-gin-query")
      .stroke("#f59e0b", 1.4);
    builder
      .edge("query-both", "full-text", "e-query-ft")
      .stroke("#f59e0b", 1.4);
    builder.edge("full-text", "result", "e-ft-result").stroke("#22d3ee", 1.4);
  },

  getStatBadges(state: AuroraPostgresState) {
    return [
      {
        label: "Schema",
        value: state.schemaMode === "hybrid" ? "Hybrid" : "—",
        color: "#a78bfa",
      },
      {
        label: "Index",
        value: state.schemaMode === "hybrid" ? "GIN" : "—",
        color: "#f59e0b",
      },
      {
        label: "Flexibility",
        value: state.schemaMode === "hybrid" ? "Document-like" : "—",
        color: "#22d3ee",
      },
    ];
  },

  softReset(state: AuroraPostgresState) {
    state.schemaMode = "none";
  },
};
