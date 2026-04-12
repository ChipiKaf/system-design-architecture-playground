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

export const aiClaimsAutomationAdapter: InsuranceDesignAdapter = {
  id: "ai-claims-automation",

  profile: {
    label: "Claims Automation",
    description:
      "Automates insurance claim processing using AWS Bedrock to analyse documents and images, orchestrated by Step Functions.",
  },

  colors: { fill: "#1e3a5f", stroke: "#3b82f6" },

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
        color: "#3b82f6",
        explain:
          "Step Functions sends the claim documents to Bedrock.\n\nThe LLM analyses photos, PDFs, and descriptions to extract damage assessments, verify policy coverage, and estimate payout amounts.",
      },
    ];
  },

  buildTopology(builder: any, state: InsuranceDesignState, helpers) {
    const hot = helpers.hot;

    builder
      .node("client")
      .at(POS.client.x, POS.client.y)
      .rect(140, 55, 12)
      .fill(hot("client") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("client") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Next.js App");
          l.newline();
          l.color("Claim submission form", "#93c5fd", { fontSize: 9 });
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
          l.bold("GraphQL API");
          l.newline();
          l.color("Mutation: submitClaim", "#5eead4", { fontSize: 9 });
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
            state.dataIngested ? "✓ Claim received" : "Intake handler",
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
            state.orchestratorActive ? "✓ Pipeline running" : "Claims pipeline",
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
      .fill(state.aiComplete ? "#064e3b" : hot("ai") ? "#1e3a5f" : "#0f172a")
      .stroke(
        state.aiComplete ? "#22c55e" : hot("ai") ? "#3b82f6" : "#334155",
        2,
      )
      .richLabel(
        (l: any) => {
          l.bold("Bedrock (LLM)");
          l.newline();
          l.color(
            state.aiComplete
              ? "✓ Analysis complete"
              : state.aiProcessing
                ? "⏳ Analysing docs…"
                : "Document analysis",
            state.aiComplete
              ? "#86efac"
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
            state.resultStored ? "✓ Claim updated" : "Claims table",
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
      .fill(hot("notify") ? "#4c1d95" : "#0f172a")
      .stroke(hot("notify") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("SES (Email)");
          l.newline();
          l.color(
            state.notificationSent ? "✓ Customer notified" : "Claim outcome",
            state.notificationSent ? "#c4b5fd" : "#94a3b8",
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
      .label("1. Submit", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("gql", "intake", "e-gql-intake")
      .stroke(hot("gql") || hot("intake") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("2. Validate", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("intake", "orchestrator", "e-intake-orch")
      .stroke(hot("intake") || hot("orchestrator") ? "#ef4444" : "#475569", 2)
      .arrow(true)
      .label("3. Start pipeline", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("orchestrator", "ai", "e-orch-ai")
      .stroke(hot("orchestrator") || hot("ai") ? "#3b82f6" : "#475569", 2)
      .arrow(true)
      .label("4. Analyse", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("ai", "store", "e-ai-store")
      .stroke(state.resultStored ? "#eab308" : "#475569", 2)
      .arrow(true)
      .label("5. Persist", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("store", "notify", "e-store-notify")
      .stroke(state.notificationSent ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("6. Notify", { fill: "#94a3b8", fontSize: 9 });
  },

  getStatBadges(state: InsuranceDesignState) {
    return [
      { label: "Variant", value: "Claims Automation", color: "#3b82f6" },
      {
        label: "AI Engine",
        value: state.aiComplete ? "Bedrock ✓" : "Bedrock",
        color: state.aiComplete ? "#22c55e" : "#94a3b8",
      },
      {
        label: "Pipeline",
        value: state.orchestratorActive ? "Running" : "Idle",
        color: state.orchestratorActive ? "#f87171" : "#94a3b8",
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
