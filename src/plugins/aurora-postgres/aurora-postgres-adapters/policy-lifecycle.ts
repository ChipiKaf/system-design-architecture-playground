import type { AuroraPostgresAdapter } from "./types";
import type { AuroraPostgresState } from "../auroraPostgresSlice";

/* ══════════════════════════════════════════════════════════
   Policy Lifecycle — How insurance policies map to relational

   Quote → Underwrite → Bind → Active → Endorse/Renew → Expire
   Temporal versioning, status constraints, scheduled transitions.
   ══════════════════════════════════════════════════════════ */

const POS = {
  quote: { x: 60, y: 80 },
  underwrite: { x: 250, y: 80 },
  bind: { x: 440, y: 80 },
  active: { x: 630, y: 80 },
  endorse: { x: 440, y: 240 },
  expire: { x: 710, y: 240 },
  version: { x: 130, y: 240 },
};

export const policyLifecycleAdapter: AuroraPostgresAdapter = {
  id: "policy-lifecycle",

  profile: {
    label: "Policy Lifecycle",
    description:
      "A policy moves through Quote → Underwrite → Bind → Active → Endorse/Renew or Expire. Each stage has temporal versioning — you can see what the policy looked like at any point in time.",
  },

  colors: { fill: "#14532d", stroke: "#4ade80" },

  computeMetrics(state: AuroraPostgresState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.pipelineStage = active ? "policies" : "none";
    state.auditTrail = active;
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "quote",
        to: "underwrite",
        duration: 550,
        color: "#4ade80",
        explain:
          "Customer requests auto insurance. INSERT INTO policies (status, product, effective_date, version) VALUES ('quoted', 'auto', '2024-07-01', 1). The policy exists as a draft with a version number.",
      },
      {
        from: "underwrite",
        to: "bind",
        duration: 550,
        color: "#4ade80",
        explain:
          "Underwriting evaluates risk: driving record, vehicle value, ZIP code. UPDATE policies SET status = 'underwritten', premium = 1200, risk_score = 'B+' WHERE id = 'POL-42'. Risk data stored in the JSONB details column.",
      },
      {
        from: "bind",
        to: "active",
        duration: 500,
        color: "#f59e0b",
        explain:
          "Customer pays, policy binds: BEGIN; UPDATE policies SET status = 'active'; INSERT INTO policy_versions (...) SELECT * FROM policies WHERE id = 'POL-42'; INSERT INTO premium_schedule (...); COMMIT. The version snapshot is now immutable.",
      },
      {
        from: "active",
        to: "endorse",
        duration: 500,
        color: "#a78bfa",
        explain:
          "6 months in, customer adds a new vehicle. This is an endorsement: INSERT INTO policy_versions to snapshot current state, then UPDATE policies SET version = version + 1, details = details || '{\"vehicles\": [...]}'. Premium recalculated. Previous version preserved.",
      },
      {
        from: "endorse",
        to: "version",
        duration: 500,
        color: "#a78bfa",
        explain:
          "Temporal query: SELECT * FROM policy_versions WHERE policy_id = 'POL-42' AND effective_at <= '2024-09-15' ORDER BY version DESC LIMIT 1. What did this policy look like on September 15? The DB knows. Regulators love this.",
      },
      {
        from: "active",
        to: "expire",
        duration: 450,
        color: "#22d3ee",
        explain:
          "Policy term ends: pg_cron runs nightly UPDATE policies SET status = 'expired' WHERE expiration_date < CURRENT_DATE AND status = 'active'. Or auto-renew: INSERT a new term version, same policy_id. All in the database, all auditable.",
      },
    ];
  },

  getStepLabels() {
    return [
      "Quote: Draft Policy",
      "Underwrite: Risk Score",
      "Bind: Activate + Snapshot",
      "Endorse: Mid-term Change",
      "Version: Temporal Query",
      "Expire / Renew",
    ];
  },

  buildTopology(builder: any, _state: AuroraPostgresState, helpers) {
    const hot = helpers.hot;

    builder
      .node("quote")
      .at(POS.quote.x, POS.quote.y)
      .rect(150, 54, 12)
      .fill(hot("quote") ? "#14532d" : "#0f172a")
      .stroke(hot("quote") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Quote");
          l.newline();
          l.color("draft, version 1", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("underwrite")
      .at(POS.underwrite.x, POS.underwrite.y)
      .rect(150, 54, 12)
      .fill(hot("underwrite") ? "#14532d" : "#0f172a")
      .stroke(hot("underwrite") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Underwrite");
          l.newline();
          l.color("risk score + premium", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("bind")
      .at(POS.bind.x, POS.bind.y)
      .rect(150, 54, 12)
      .fill(hot("bind") ? "#78350f" : "#0f172a")
      .stroke(hot("bind") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Bind");
          l.newline();
          l.color("pay + activate", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("active")
      .at(POS.active.x, POS.active.y)
      .rect(150, 54, 12)
      .fill(hot("active") ? "#78350f" : "#0f172a")
      .stroke(hot("active") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Active Policy");
          l.newline();
          l.color("in force", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("endorse")
      .at(POS.endorse.x, POS.endorse.y)
      .rect(160, 54, 12)
      .fill(hot("endorse") ? "#312e81" : "#0f172a")
      .stroke(hot("endorse") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Endorsement");
          l.newline();
          l.color("mid-term change", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("expire")
      .at(POS.expire.x, POS.expire.y)
      .rect(150, 54, 12)
      .fill(hot("expire") ? "#164e63" : "#0f172a")
      .stroke(hot("expire") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Expire / Renew");
          l.newline();
          l.color("pg_cron nightly", "#a5f3fc", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("version")
      .at(POS.version.x, POS.version.y)
      .rect(170, 54, 12)
      .fill(hot("version") ? "#312e81" : "#0f172a")
      .stroke(hot("version") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Version History");
          l.newline();
          l.color("temporal queries", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* Edges */
    builder.edge("quote", "underwrite", "e-quote-uw").stroke("#4ade80", 1.4);
    builder.edge("underwrite", "bind", "e-uw-bind").stroke("#4ade80", 1.4);
    builder.edge("bind", "active", "e-bind-active").stroke("#f59e0b", 1.4);
    builder
      .edge("active", "endorse", "e-active-endorse")
      .stroke("#a78bfa", 1.4);
    builder.edge("endorse", "version", "e-endorse-ver").stroke("#a78bfa", 1.4);
    builder
      .edge("active", "expire", "e-active-expire")
      .stroke("#22d3ee", 1.2)
      .dashed();
  },

  getStatBadges(state: AuroraPostgresState) {
    return [
      {
        label: "Pipeline",
        value: state.pipelineStage === "policies" ? "Policy" : "—",
        color: "#4ade80",
      },
      {
        label: "Versions",
        value: state.pipelineStage === "policies" ? "Temporal" : "—",
        color: "#a78bfa",
      },
      {
        label: "Audit",
        value: state.auditTrail ? "Immutable" : "—",
        color: "#22d3ee",
      },
    ];
  },

  softReset(state: AuroraPostgresState) {
    state.pipelineStage = "none";
    state.auditTrail = false;
  },
};
