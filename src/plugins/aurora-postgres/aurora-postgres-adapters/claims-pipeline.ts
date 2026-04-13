import type { AuroraPostgresAdapter } from "./types";
import type { AuroraPostgresState } from "../auroraPostgresSlice";

/* ══════════════════════════════════════════════════════════
   Claims Pipeline — How insurance claims map to relational

   FNOL → Assessment → Approval → Settlement → Payment → Audit
   Every transition is a state machine row, auditable and
   constrained by the schema.
   ══════════════════════════════════════════════════════════ */

const POS = {
  fnol: { x: 60, y: 100 },
  assess: { x: 240, y: 100 },
  approval: { x: 420, y: 100 },
  settlement: { x: 600, y: 100 },
  payment: { x: 780, y: 100 },
  audit: { x: 420, y: 260 },
};

export const claimsPipelineAdapter: AuroraPostgresAdapter = {
  id: "claims-pipeline",

  profile: {
    label: "Claims Pipeline",
    description:
      "A claim moves through FNOL → Assessment → Approval → Settlement → Payment. Each transition is a database operation with constraints, triggers, and an audit trail. This is why insurance needs relational.",
  },

  colors: { fill: "#312e81", stroke: "#a78bfa" },

  computeMetrics(state: AuroraPostgresState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.pipelineStage = active ? "claims" : "none";
    state.auditTrail = active;
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "fnol",
        to: "assess",
        duration: 550,
        color: "#a78bfa",
        explain:
          "First Notice of Loss (FNOL): INSERT INTO claims (policy_id, type, description, reported_date, status) VALUES (..., 'fnol'). A CHECK constraint ensures status can only be 'fnol' on insert. The claim_id is auto-generated.",
      },
      {
        from: "assess",
        to: "approval",
        duration: 550,
        color: "#a78bfa",
        explain:
          "An adjuster reviews: UPDATE claims SET status = 'assessed', assessed_amount = 12500, adjuster_id = 42 WHERE claim_id = 'CLM-789'. A trigger fires: INSERT INTO claim_history (claim_id, old_status, new_status, changed_by, changed_at).",
      },
      {
        from: "approval",
        to: "settlement",
        duration: 500,
        color: "#f59e0b",
        explain:
          "Manager approval: UPDATE claims SET status = 'approved'. But if assessed_amount > authority_limit, a CHECK constraint blocks it — needs senior approval. The schema enforces business rules, not application code.",
      },
      {
        from: "settlement",
        to: "payment",
        duration: 500,
        color: "#f59e0b",
        explain:
          "Settlement: BEGIN; UPDATE claims SET status = 'settled'; INSERT INTO payments (claim_id, amount, method) VALUES ('CLM-789', 12500, 'ACH'); UPDATE premium_pool SET balance = balance - 12500; COMMIT. One atomic transaction.",
      },
      {
        from: "payment",
        to: "audit",
        duration: 450,
        color: "#22d3ee",
        explain:
          "Every state transition is in claim_history. Regulatory auditors can query: SELECT * FROM claim_history WHERE claim_id = 'CLM-789' ORDER BY changed_at. Full timeline, immutable, queryable. Try doing this reliably with DynamoDB.",
      },
      {
        from: "audit",
        to: "fnol",
        duration: 400,
        color: "#4ade80",
        explain:
          "The PostgreSQL CHECK constraints, FOREIGN KEYS, and triggers form a safety net. Invalid state transitions are impossible at the database level. The claim pipeline is a state machine enforced by the schema itself.",
      },
    ];
  },

  getStepLabels() {
    return [
      "FNOL: Create Claim",
      "Assess: Adjuster Review",
      "Approve: Authority Check",
      "Settle: Atomic Payment",
      "Audit: Full History",
      "Schema = Safety Net",
    ];
  },

  buildTopology(builder: any, _state: AuroraPostgresState, helpers) {
    const hot = helpers.hot;

    builder
      .node("fnol")
      .at(POS.fnol.x, POS.fnol.y)
      .rect(140, 54, 12)
      .fill(hot("fnol") ? "#312e81" : "#0f172a")
      .stroke(hot("fnol") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("FNOL");
          l.newline();
          l.color("report loss", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("assess")
      .at(POS.assess.x, POS.assess.y)
      .rect(140, 54, 12)
      .fill(hot("assess") ? "#312e81" : "#0f172a")
      .stroke(hot("assess") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Assessment");
          l.newline();
          l.color("adjuster reviews", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("approval")
      .at(POS.approval.x, POS.approval.y)
      .rect(140, 54, 12)
      .fill(hot("approval") ? "#78350f" : "#0f172a")
      .stroke(hot("approval") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Approval");
          l.newline();
          l.color("authority limit", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("settlement")
      .at(POS.settlement.x, POS.settlement.y)
      .rect(140, 54, 12)
      .fill(hot("settlement") ? "#78350f" : "#0f172a")
      .stroke(hot("settlement") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Settlement");
          l.newline();
          l.color("atomic transaction", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("payment")
      .at(POS.payment.x, POS.payment.y)
      .rect(140, 54, 12)
      .fill(hot("payment") ? "#164e63" : "#0f172a")
      .stroke(hot("payment") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Payment");
          l.newline();
          l.color("ACH / check", "#a5f3fc", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("audit")
      .at(POS.audit.x, POS.audit.y)
      .rect(180, 54, 12)
      .fill(hot("audit") ? "#14532d" : "#0f172a")
      .stroke(hot("audit") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Audit Trail");
          l.newline();
          l.color("claim_history table", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* Edges */
    builder.edge("fnol", "assess", "e-fnol-assess").stroke("#a78bfa", 1.4);
    builder
      .edge("assess", "approval", "e-assess-approve")
      .stroke("#a78bfa", 1.4);
    builder
      .edge("approval", "settlement", "e-approve-settle")
      .stroke("#f59e0b", 1.4);
    builder
      .edge("settlement", "payment", "e-settle-pay")
      .stroke("#f59e0b", 1.4);
    builder.edge("payment", "audit", "e-pay-audit").stroke("#22d3ee", 1.4);
    builder
      .edge("audit", "fnol", "e-audit-fnol")
      .stroke("#4ade80", 1.2)
      .dashed();
  },

  getStatBadges(state: AuroraPostgresState) {
    return [
      {
        label: "Pipeline",
        value: state.pipelineStage === "claims" ? "Claims" : "—",
        color: "#a78bfa",
      },
      {
        label: "Stages",
        value: state.pipelineStage === "claims" ? "5" : "—",
        color: "#f59e0b",
      },
      {
        label: "Audit",
        value: state.auditTrail ? "Immutable" : "—",
        color: "#4ade80",
      },
    ];
  },

  softReset(state: AuroraPostgresState) {
    state.pipelineStage = "none";
    state.auditTrail = false;
  },
};
