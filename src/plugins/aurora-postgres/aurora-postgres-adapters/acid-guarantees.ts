import type { AuroraPostgresAdapter } from "./types";
import type { AuroraPostgresState } from "../auroraPostgresSlice";

/* ══════════════════════════════════════════════════════════
   ACID Guarantees — Why insurance demands transactions

   Shows a claims payment moving money between tables.
   If any step fails, the entire transaction rolls back.

   Row 1: App → BEGIN TX → Debit Pool → Credit Claimant → COMMIT
   Row 2: failure path showing ROLLBACK
   ══════════════════════════════════════════════════════════ */

const POS = {
  app: { x: 60, y: 100 },
  beginTx: { x: 250, y: 100 },
  debit: { x: 440, y: 100 },
  credit: { x: 630, y: 100 },
  commit: { x: 820, y: 100 },
  rollback: { x: 440, y: 260 },
};

export const acidGuaranteesAdapter: AuroraPostgresAdapter = {
  id: "acid-guarantees",

  profile: {
    label: "ACID Guarantees",
    description:
      "Insurance moves money between accounts — premiums in, claims out. If a credit succeeds but the debit fails, someone loses money. ACID transactions make this impossible.",
  },

  colors: { fill: "#14532d", stroke: "#4ade80" },

  computeMetrics(state: AuroraPostgresState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.transactionGuarantee = active ? "acid" : "none";
    state.auditTrail = active;
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "app",
        to: "begin-tx",
        duration: 500,
        color: "#4ade80",
        explain:
          "A claim is approved for $15,000. The app starts a database transaction — BEGIN. From this moment, either ALL changes succeed or NONE of them do.",
      },
      {
        from: "begin-tx",
        to: "debit",
        duration: 550,
        color: "#4ade80",
        explain:
          "UPDATE premium_pool SET balance = balance - 15000 WHERE policy_id = 'POL-42'. The money is deducted from the premium reserve. But it's not committed yet — it's held in limbo.",
      },
      {
        from: "debit",
        to: "credit",
        duration: 550,
        color: "#4ade80",
        explain:
          "UPDATE claims SET status = 'paid', amount = 15000 WHERE claim_id = 'CLM-789'. The claimant's record is updated. Both writes are now in the transaction log, but invisible to other sessions.",
      },
      {
        from: "debit",
        to: "rollback",
        duration: 500,
        color: "#ef4444",
        explain:
          "What if the credit INSERT fails? A constraint violation, a disk error, anything. PostgreSQL ROLLBACK undoes the debit too. The premium pool is restored. No money vanishes. This is Atomicity.",
      },
      {
        from: "credit",
        to: "commit",
        duration: 500,
        color: "#22d3ee",
        explain:
          "COMMIT. Both the debit and credit become visible atomically. Other transactions now see the updated balances. The WAL (Write-Ahead Log) guarantees this survives a crash. That's Durability.",
      },
    ];
  },

  getStepLabels() {
    return [
      "BEGIN Transaction",
      "Debit Premium Pool",
      "Credit Claimant",
      "Failure → ROLLBACK",
      "COMMIT (Atomic)",
    ];
  },

  buildTopology(builder: any, _state: AuroraPostgresState, helpers) {
    const hot = helpers.hot;

    builder
      .node("app")
      .at(POS.app.x, POS.app.y)
      .rect(150, 54, 12)
      .fill(hot("app") ? "#14532d" : "#0f172a")
      .stroke(hot("app") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Claims Service");
          l.newline();
          l.color("approve claim $15k", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("begin-tx")
      .at(POS.beginTx.x, POS.beginTx.y)
      .rect(150, 54, 12)
      .fill(hot("begin-tx") ? "#14532d" : "#0f172a")
      .stroke(hot("begin-tx") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("BEGIN");
          l.newline();
          l.color("transaction isolation", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("debit")
      .at(POS.debit.x, POS.debit.y)
      .rect(150, 54, 12)
      .fill(hot("debit") ? "#78350f" : "#0f172a")
      .stroke(hot("debit") ? "#fbbf24" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Debit Pool");
          l.newline();
          l.color("balance - $15,000", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("credit")
      .at(POS.credit.x, POS.credit.y)
      .rect(150, 54, 12)
      .fill(hot("credit") ? "#78350f" : "#0f172a")
      .stroke(hot("credit") ? "#fbbf24" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Credit Claimant");
          l.newline();
          l.color("status = 'paid'", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("commit")
      .at(POS.commit.x, POS.commit.y)
      .rect(140, 54, 12)
      .fill(hot("commit") ? "#164e63" : "#0f172a")
      .stroke(hot("commit") ? "#22d3ee" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("COMMIT");
          l.newline();
          l.color("WAL → durable", "#a5f3fc", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("rollback")
      .at(POS.rollback.x, POS.rollback.y)
      .rect(160, 54, 12)
      .fill(hot("rollback") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("rollback") ? "#ef4444" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("ROLLBACK");
          l.newline();
          l.color("undo all changes", "#fca5a5", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* Edges */
    builder.edge("app", "begin-tx", "e-app-begin").stroke("#4ade80", 1.4);
    builder.edge("begin-tx", "debit", "e-begin-debit").stroke("#4ade80", 1.4);
    builder.edge("debit", "credit", "e-debit-credit").stroke("#fbbf24", 1.4);
    builder
      .edge("debit", "rollback", "e-debit-rollback")
      .stroke("#ef4444", 1.2)
      .dashed();
    builder.edge("credit", "commit", "e-credit-commit").stroke("#22d3ee", 1.4);
  },

  getStatBadges(state: AuroraPostgresState) {
    return [
      {
        label: "Guarantee",
        value: state.transactionGuarantee === "acid" ? "ACID" : "—",
        color: "#4ade80",
      },
      {
        label: "Isolation",
        value: state.transactionGuarantee === "acid" ? "Read Committed" : "—",
        color: "#fbbf24",
      },
      {
        label: "Audit",
        value: state.auditTrail ? "WAL" : "—",
        color: "#22d3ee",
      },
    ];
  },

  softReset(state: AuroraPostgresState) {
    state.transactionGuarantee = "none";
    state.auditTrail = false;
  },
};
