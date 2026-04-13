import type { AuroraPostgresAdapter } from "./types";
import type { AuroraPostgresState } from "../auroraPostgresSlice";

/* ══════════════════════════════════════════════════════════
   Complex Queries — Insurance demands relational joins

   Shows an actuarial report query joining policies, claims,
   and payments with window functions, CTEs, and aggregation.

   Row 1: Analyst → Query Planner → Policies → Claims
   Row 2: Payments → Aggregate (CTE) → Report
   ══════════════════════════════════════════════════════════ */

const POS = {
  analyst: { x: 60, y: 80 },
  planner: { x: 280, y: 80 },
  policies: { x: 500, y: 80 },
  claims: { x: 720, y: 80 },
  payments: { x: 60, y: 240 },
  aggregate: { x: 350, y: 240 },
  report: { x: 640, y: 240 },
};

export const complexQueriesAdapter: AuroraPostgresAdapter = {
  id: "complex-queries",

  profile: {
    label: "Complex Queries",
    description:
      "Insurance reporting needs multi-table JOINs, window functions for loss ratios, CTEs for cohort analysis. NoSQL can't do this without pulling data into application code.",
  },

  colors: { fill: "#1e3a5f", stroke: "#60a5fa" },

  computeMetrics(state: AuroraPostgresState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.queryComplexity = active ? "complex" : "none";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "analyst",
        to: "planner",
        duration: 500,
        color: "#60a5fa",
        explain:
          "An actuary runs: 'Show me the loss ratio per product line for policies written in 2024, broken down by quarter.' This is a single SQL query in PostgreSQL.",
      },
      {
        from: "planner",
        to: "policies",
        duration: 500,
        color: "#60a5fa",
        explain:
          "The query planner reads the policies table. WITH policy_cohort AS (SELECT * FROM policies WHERE written_date >= '2024-01-01'). This CTE isolates the 2024 cohort efficiently.",
      },
      {
        from: "planner",
        to: "claims",
        duration: 500,
        color: "#f59e0b",
        explain:
          "JOIN claims ON claims.policy_id = policies.id. The planner uses an index on policy_id to merge claims with their parent policies. One query, two tables, zero application code.",
      },
      {
        from: "claims",
        to: "payments",
        duration: 500,
        color: "#f59e0b",
        explain:
          "JOIN payments ON payments.claim_id = claims.id. Three tables deep now. In DynamoDB you'd need 3 separate queries and stitch them in your Lambda — that's where bugs hide.",
      },
      {
        from: "payments",
        to: "aggregate",
        duration: 550,
        color: "#a78bfa",
        explain:
          "SUM(payments.amount) / SUM(policies.premium) AS loss_ratio, partitioned by product_line and date_trunc('quarter', written_date). Window functions compute this per-group without GROUP BY flattening.",
      },
      {
        from: "aggregate",
        to: "report",
        duration: 450,
        color: "#22d3ee",
        explain:
          "The final report materializes: product line, quarter, premium collected, claims paid, loss ratio. One round trip to the database. The actuary sees it instantly. Try that with MongoDB.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Submit SQL Query",
      "CTE: Policy Cohort",
      "JOIN Claims",
      "JOIN Payments",
      "Window: Loss Ratio",
      "Report Materializes",
    ];
  },

  buildTopology(builder: any, _state: AuroraPostgresState, helpers) {
    const hot = helpers.hot;

    builder
      .node("analyst")
      .at(POS.analyst.x, POS.analyst.y)
      .rect(160, 54, 12)
      .fill(hot("analyst") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("analyst") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Actuary");
          l.newline();
          l.color("loss ratio query", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("planner")
      .at(POS.planner.x, POS.planner.y)
      .rect(160, 54, 12)
      .fill(hot("planner") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("planner") ? "#60a5fa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Query Planner");
          l.newline();
          l.color("cost-based optimizer", "#93c5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("policies")
      .at(POS.policies.x, POS.policies.y)
      .rect(160, 54, 12)
      .fill(hot("policies") ? "#14532d" : "#0f172a")
      .stroke(hot("policies") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Policies");
          l.newline();
          l.color("CTE: 2024 cohort", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("claims")
      .at(POS.claims.x, POS.claims.y)
      .rect(160, 54, 12)
      .fill(hot("claims") ? "#78350f" : "#0f172a")
      .stroke(hot("claims") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Claims");
          l.newline();
          l.color("JOIN on policy_id", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("payments")
      .at(POS.payments.x, POS.payments.y)
      .rect(160, 54, 12)
      .fill(hot("payments") ? "#78350f" : "#0f172a")
      .stroke(hot("payments") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Payments");
          l.newline();
          l.color("JOIN on claim_id", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("aggregate")
      .at(POS.aggregate.x, POS.aggregate.y)
      .rect(180, 54, 12)
      .fill(hot("aggregate") ? "#312e81" : "#0f172a")
      .stroke(hot("aggregate") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Window Functions");
          l.newline();
          l.color("SUM() OVER (PARTITION BY…)", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("report")
      .at(POS.report.x, POS.report.y)
      .rect(160, 54, 12)
      .fill(hot("report") ? "#164e63" : "#0f172a")
      .stroke(hot("report") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Loss Ratio Report");
          l.newline();
          l.color("single round trip", "#a5f3fc", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* Edges */
    builder.edge("analyst", "planner", "e-analyst-plan").stroke("#60a5fa", 1.4);
    builder.edge("planner", "policies", "e-plan-pol").stroke("#60a5fa", 1.4);
    builder.edge("planner", "claims", "e-plan-claims").stroke("#f59e0b", 1.4);
    builder.edge("claims", "payments", "e-claims-pay").stroke("#f59e0b", 1.4);
    builder.edge("payments", "aggregate", "e-pay-agg").stroke("#a78bfa", 1.4);
    builder.edge("aggregate", "report", "e-agg-report").stroke("#22d3ee", 1.4);
  },

  getStatBadges(state: AuroraPostgresState) {
    return [
      {
        label: "Complexity",
        value: state.queryComplexity === "complex" ? "Multi-JOIN" : "—",
        color: "#60a5fa",
      },
      {
        label: "Tables",
        value: state.queryComplexity === "complex" ? "3+" : "—",
        color: "#f59e0b",
      },
      {
        label: "Round Trips",
        value: state.queryComplexity === "complex" ? "1" : "—",
        color: "#22d3ee",
      },
    ];
  },

  softReset(state: AuroraPostgresState) {
    state.queryComplexity = "none";
  },
};
