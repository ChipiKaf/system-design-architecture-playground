import type { InsuranceDesignAdapter } from "./types";
import type { InsuranceDesignState } from "../insuranceDesignSlice";

const POS = {
  client: { x: 80, y: 200 },
  gql: { x: 260, y: 200 },
  intake: { x: 440, y: 200 },
  orchestrator: { x: 660, y: 200 },
  ai: { x: 660, y: 400 },
  store: { x: 440, y: 400 },
  notify: { x: 220, y: 400 },
};

export const aiFraudDetectionAdapter: InsuranceDesignAdapter = {
  id: "ai-fraud-detection",

  profile: {
    label: "Fraud Detection",
    description:
      "Real-time anomaly detection on incoming claims. A SageMaker model flags suspicious patterns, triggering SNS alerts and an investigation workflow.",
  },

  colors: { fill: "#7f1d1d", stroke: "#ef4444" },

  computeMetrics(state: InsuranceDesignState) {
    const p = state.phase;
    state.dataIngested =
      p === "ingest" ||
      p === "orchestrate" ||
      p === "analyze" ||
      p === "output" ||
      p === "summary";
    state.orchestratorActive =
      p === "orchestrate" ||
      p === "analyze" ||
      p === "output" ||
      p === "summary";
    state.aiProcessing = p === "analyze";
    state.aiComplete = p === "output" || p === "summary";
    state.resultStored = p === "output" || p === "summary";
    state.notificationSent = p === "summary";
  },

  expandToken(token: string): string[] | null {
    if (token === "$AI_STEP") return ["orchestrator", "ai"];
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "orchestrator",
        to: "ai",
        duration: 800,
        color: "#ef4444",
        explain:
          "Step Functions invokes the SageMaker anomaly-detection endpoint.\n\nThe model compares the claim against historical patterns — unusually high amounts, repeat addresses, rapid successive claims — and returns a fraud probability score.",
      },
    ];
  },

  buildTopology(builder: any, state: InsuranceDesignState, helpers) {
    const hot = helpers.hot;

    builder
      .node("client")
      .at(POS.client.x, POS.client.y)
      .rect(140, 55, 12)
      .fill(hot("client") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("client") ? "#ef4444" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("EventBridge");
          l.newline();
          l.color("claim.submitted event", "#fca5a5", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("gql")
      .at(POS.gql.x, POS.gql.y)
      .rect(140, 55, 12)
      .fill(hot("gql") ? "#134e4a" : "#0f172a")
      .stroke(hot("gql") ? "#14b8a6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Lambda");
          l.newline();
          l.color("Event receiver", "#5eead4", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("intake")
      .at(POS.intake.x, POS.intake.y)
      .rect(140, 55, 12)
      .fill(hot("intake") ? "#312e81" : "#0f172a")
      .stroke(hot("intake") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Lambda");
          l.newline();
          l.color(
            state.dataIngested ? "✓ Data enriched" : "Enrichment fn",
            state.dataIngested ? "#86efac" : "#c4b5fd",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("orchestrator")
      .at(POS.orchestrator.x, POS.orchestrator.y)
      .rect(150, 55, 12)
      .fill(hot("orchestrator") ? "#7f1d1d" : "#0f172a")
      .stroke(
        state.orchestratorActive
          ? "#f87171"
          : hot("orchestrator")
            ? "#ef4444"
            : "#334155",
        2,
      )
      .richLabel(
        (l: any) => {
          l.bold("Step Functions");
          l.newline();
          l.color(
            state.orchestratorActive ? "✓ Fraud pipeline" : "Fraud pipeline",
            state.orchestratorActive ? "#fca5a5" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("ai")
      .at(POS.ai.x, POS.ai.y)
      .rect(150, 55, 12)
      .fill(state.aiComplete ? "#7f1d1d" : hot("ai") ? "#1e3a5f" : "#0f172a")
      .stroke(
        state.aiComplete ? "#ef4444" : hot("ai") ? "#3b82f6" : "#334155",
        2,
      )
      .richLabel(
        (l: any) => {
          l.bold("SageMaker");
          l.newline();
          l.color(
            state.aiComplete
              ? "⚠ Fraud: 87% likely"
              : state.aiProcessing
                ? "⏳ Scanning…"
                : "Anomaly detection",
            state.aiComplete
              ? "#fca5a5"
              : state.aiProcessing
                ? "#fbbf24"
                : "#93c5fd",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("store")
      .at(POS.store.x, POS.store.y)
      .rect(140, 55, 12)
      .fill(hot("store") ? "#713f12" : "#0f172a")
      .stroke(
        state.resultStored ? "#eab308" : hot("store") ? "#f59e0b" : "#334155",
        2,
      )
      .richLabel(
        (l: any) => {
          l.bold("Aurora PostgreSQL");
          l.newline();
          l.color(
            state.resultStored ? "✓ Flag recorded" : "fraud_flags table",
            state.resultStored ? "#fde047" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    builder
      .node("notify")
      .at(POS.notify.x, POS.notify.y)
      .rect(140, 55, 12)
      .fill(hot("notify") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("notify") ? "#ef4444" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("SNS (Alert)");
          l.newline();
          l.color(
            state.notificationSent
              ? "✓ Investigator alerted"
              : "Fraud alerts topic",
            state.notificationSent ? "#fca5a5" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 12, dy: -2, lineHeight: 1.6 },
      );

    /* ── Edges ── */
    builder
      .edge("client", "gql", "e-client-gql")
      .stroke(hot("client") || hot("gql") ? "#14b8a6" : "#475569", 2)
      .arrow(true)
      .label("1. Event", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("gql", "intake", "e-gql-intake")
      .stroke(hot("gql") || hot("intake") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("2. Enrich", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("intake", "orchestrator", "e-intake-orch")
      .stroke(hot("intake") || hot("orchestrator") ? "#ef4444" : "#475569", 2)
      .arrow(true)
      .label("3. Detect", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("orchestrator", "ai", "e-orch-ai")
      .stroke(hot("orchestrator") || hot("ai") ? "#ef4444" : "#475569", 2)
      .arrow(true)
      .label("4. Score", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("ai", "store", "e-ai-store")
      .stroke(state.resultStored ? "#eab308" : "#475569", 2)
      .arrow(true)
      .label("5. Record", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("store", "notify", "e-store-notify")
      .stroke(state.notificationSent ? "#ef4444" : "#475569", 2)
      .arrow(true)
      .label("6. Alert", { fill: "#94a3b8", fontSize: 9 });
  },

  getStatBadges(state: InsuranceDesignState) {
    return [
      { label: "Variant", value: "Fraud Detection", color: "#ef4444" },
      {
        label: "AI Engine",
        value: state.aiComplete ? "SageMaker ⚠" : "SageMaker",
        color: state.aiComplete ? "#ef4444" : "#94a3b8",
      },
      {
        label: "Fraud Risk",
        value: state.aiComplete ? "87%" : "—",
        color: state.aiComplete ? "#ef4444" : "#94a3b8",
      },
    ];
  },

  softReset(state: InsuranceDesignState) {
    state.aiProcessing = false;
    state.aiComplete = false;
    state.resultStored = false;
    state.notificationSent = false;
  },
};
