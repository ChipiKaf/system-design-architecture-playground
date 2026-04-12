import React, { useLayoutEffect, useRef, useEffect } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  useConceptModal,
  ConceptPills,
  PluginLayout,
  StageHeader,
  StatBadge,
  SidePanel,
  SideCard,
  CanvasStage,
} from "../../components/plugin-kit";
import { concepts, type ConceptKey } from "./concepts";
import { useStepFunctionsAnimation } from "./useStepFunctionsAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1400;
const H = 910;

/* ── Node layout ─────────────────────────────────────────
 *
 *  [React App] → [GraphQL/ECS] → [EventBridge] → ┌── State Machine ──────────┐
 *                                                  │  [Validate Claim]          │     [Lambda]
 *                                                  │        ↓                   │
 *                                                  │   [Is Valid?] ─No─ [Reject]│
 *                                                  │     ↓ Yes           ↓       │
 *                                                  │  [Assess Claim]  [Denied]   │     [Lambda]
 *                                                  │        ↓                   │
 *                                                  │  [Wait for Approval] ←────────── [Admin Dashboard]
 *                                                  │        ↓                   │
 *                                                  │  [Store Documents]          │     [S3]
 *                                                  │        ↓                   │
 *                                                  │  [Notify Customer]          │     [SNS]
 *                                                  │        ↓                   │
 *                                                  │   [Approved ✓]              │
 *                                                  └────────────────────────────┘
 * ──────────────────────────────────────────────────────── */

const StepFunctionsVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, signals, phase } =
    useStepFunctionsAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const {
    explanation,
    hotZones,
    currentStateName,
    choicePath,
    workflowStatus,
  } = runtime;
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    // ── Client App (React / Next.js) ────────────────────
    b.node("client-app")
      .at(55, 65)
      .rect(110, 40, 8)
      .fill(hot("client-app") ? "#164e63" : "#0f172a")
      .stroke(hot("client-app") ? "#06b6d4" : "#155e75", 1.6)
      .label("React App", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("client-app"))
      .tooltip({
        title: "React / Next.js App",
        sections: [
          { label: "Role", value: "Customer-facing web & mobile app" },
          { label: "Stack", value: "React, Next.js, React Native, TypeScript" },
        ],
      });
    b.node("client-app").label("Next.js + TS", {
      fill: "#67e8f9",
      fontSize: 7,
      dy: 8,
    });

    // ── ECS Backend (expanded internal view) ────────────
    const beHot = hot("be-mutation") || hot("be-service") || hot("be-sdk");

    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 135,
          y: 25,
          w: 170,
          h: 270,
          rx: 14,
          ry: 14,
          fill: beHot ? "rgba(74, 4, 78, 0.06)" : "rgba(15, 23, 42, 0.0)",
          stroke: beHot ? "#a21caf" : "#86198f",
          strokeWidth: 1.4,
          strokeDasharray: "6 4",
          opacity: 0.7,
        },
        { key: "be-boundary" },
      );
      o.add(
        "text",
        {
          x: 147,
          y: 18,
          text: "ECS Backend",
          fill: "#f0abfc",
          fontSize: 10,
          fontWeight: 700,
        },
        { key: "be-boundary-label" },
      );
      o.add(
        "text",
        {
          x: 147,
          y: 286,
          text: "publishes one fact, not every downstream command",
          fill: "#f5d0fe",
          fontSize: 7,
          fontWeight: 600,
        },
        { key: "be-boundary-note" },
      );
    });

    // GraphQL resolver (runs inside the ECS app process)
    b.node("be-mutation")
      .at(220, 65)
      .rect(110, 40, 8)
      .fill(hot("be-mutation") ? "#4a044e" : "#0f172a")
      .stroke(hot("be-mutation") ? "#e879f9" : "#a21caf", 1.6)
      .label("Resolver", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("gql-mutation"))
      .tooltip({
        title: "GraphQL submitClaim Resolver",
        sections: [
          {
            label: "Role",
            value: "GraphQL resolver function inside the Node.js server",
          },
          {
            label: "Call",
            value: "ctx.services.claimService.submitClaim(input)",
          },
        ],
      });
    b.node("be-mutation").label("Mutation.submitClaim", {
      fill: "#f0abfc",
      fontSize: 7,
      dy: 8,
    });

    // ClaimService (application/business logic)
    b.node("be-service")
      .at(220, 150)
      .rect(110, 40, 8)
      .fill(hot("be-service") ? "#4a044e" : "#0f172a")
      .stroke(hot("be-service") ? "#d946ef" : "#86198f", 1.6)
      .label("ClaimService", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("claim-service"))
      .tooltip({
        title: "ClaimService",
        sections: [
          {
            label: "Role",
            value: "Validates input, persists claim, emits ClaimSubmitted",
          },
          {
            label: "Type",
            value: "Normal TypeScript class in the same ECS process",
          },
          {
            label: "Avoids",
            value:
              "Hard-coding Step Functions, fraud, analytics, and other downstream calls",
          },
        ],
      });
    b.node("be-service").label("submitClaim(input)", {
      fill: "#e879f9",
      fontSize: 7,
      dy: 8,
    });

    // SDK Client (putEvents call)
    b.node("be-sdk")
      .at(220, 235)
      .rect(110, 40, 8)
      .fill(hot("be-sdk") ? "#4a044e" : "#0f172a")
      .stroke(hot("be-sdk") ? "#c026d3" : "#701a75", 1.6)
      .label("SDK Client", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("eventbridge"))
      .tooltip({
        title: "EventBridge SDK Client",
        sections: [
          { label: "Call", value: "PutEventsCommand → claims-bus" },
          {
            label: "Boundary",
            value: "First outbound AWS API call from the ECS container",
          },
        ],
      });
    b.node("be-sdk").label("eventBridge.send()", {
      fill: "#d946ef",
      fontSize: 7,
      dy: 8,
    });

    // ── EventBridge (expanded internal view) ─────────────
    const ebHot = hot("eb-bus") || hot("eb-rules") || hot("eb-target");

    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 420,
          y: 25,
          w: 170,
          h: 270,
          rx: 14,
          ry: 14,
          fill: ebHot ? "rgba(107, 33, 168, 0.06)" : "rgba(15, 23, 42, 0.0)",
          stroke: ebHot ? "#7c3aed" : "#4c1d95",
          strokeWidth: 1.4,
          strokeDasharray: "6 4",
          opacity: 0.7,
        },
        { key: "eb-boundary" },
      );
      o.add(
        "text",
        {
          x: 432,
          y: 18,
          text: "Amazon EventBridge",
          fill: "#c4b5fd",
          fontSize: 10,
          fontWeight: 700,
        },
        { key: "eb-boundary-label" },
      );
      o.add(
        "text",
        {
          x: 432,
          y: 286,
          text: "managed AWS service + infra-configured rules",
          fill: "#ddd6fe",
          fontSize: 7,
          fontWeight: 600,
        },
        { key: "eb-boundary-note" },
      );
    });

    // Event Bus (ingestion)
    b.node("eb-bus")
      .at(505, 65)
      .rect(110, 40, 8)
      .fill(hot("eb-bus") ? "#3b0764" : "#0f172a")
      .stroke(hot("eb-bus") ? "#a855f7" : "#7c3aed", 1.6)
      .label("Event Bus", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("event-bus"))
      .tooltip({
        title: "Event Bus",
        sections: [
          { label: "Role", value: "Receives events via putEvents API" },
          {
            label: "Type",
            value: "Routing ingress — not an SQS queue or Kafka log",
          },
        ],
      });
    b.node("eb-bus").label("ingestion", {
      fill: "#d8b4fe",
      fontSize: 7,
      dy: 8,
    });

    // Rule Engine (pattern matching)
    b.node("eb-rules")
      .at(505, 150)
      .rect(110, 40, 8)
      .fill(hot("eb-rules") ? "#3b0764" : "#0f172a")
      .stroke(hot("eb-rules") ? "#8b5cf6" : "#6d28d9", 1.6)
      .label("Rule Engine", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("rule-engine"))
      .tooltip({
        title: "Rule Engine",
        sections: [
          { label: "Role", value: "Matches events to rules by pattern" },
          { label: "Power", value: "Many-to-many — 1 event → N targets" },
        ],
      });
    b.node("eb-rules").label("pattern match", {
      fill: "#c4b5fd",
      fontSize: 7,
      dy: 8,
    });

    // Target (Step Functions)
    b.node("eb-target")
      .at(505, 235)
      .rect(110, 40, 8)
      .fill(hot("eb-target") ? "#3b0764" : "#0f172a")
      .stroke(hot("eb-target") ? "#7c3aed" : "#5b21b6", 1.6)
      .label("Target: SFN", {
        fill: "#fff",
        fontSize: 10,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("step-functions"))
      .tooltip({
        title: "Target → Step Functions",
        sections: [
          { label: "Action", value: "Calls StartExecution on state machine" },
          { label: "Input", value: "event.detail → workflow input" },
        ],
      });
    b.node("eb-target").label("StartExecution", {
      fill: "#a78bfa",
      fontSize: 7,
      dy: 8,
    });

    // ── State Machine boundary ──────────────────────────
    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 640,
          y: 195,
          w: 430,
          h: 690,
          rx: 18,
          ry: 18,
          fill: "rgba(15, 23, 42, 0.0)",
          stroke: "#475569",
          strokeWidth: 1.4,
          strokeDasharray: "8 5",
          opacity: 0.7,
        },
        { key: "sfn-boundary" },
      );
      o.add(
        "text",
        {
          x: 652,
          y: 188,
          text: "Step Functions State Machine",
          fill: "#fdba74",
          fontSize: 11,
          fontWeight: 700,
        },
        { key: "sfn-boundary-label" },
      );
    });

    // ── Validate Claim (Task state) ───────────────────
    b.node("validate")
      .at(760, 235)
      .rect(190, 52, 10)
      .fill(hot("validate") ? "#312e81" : "#0f172a")
      .stroke(hot("validate") ? "#818cf8" : "#4338ca", 2)
      .label("Validate Claim", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("task-state"))
      .tooltip({
        title: "Validate Claim",
        sections: [
          { label: "Type", value: "Task State" },
          { label: "Calls", value: "Lambda (validation function)" },
        ],
      });
    b.node("validate").badge("Task", {
      position: "top-right",
      fill: "#fff",
      background: "#6366f1",
      fontSize: 8,
    });

    // ── Choice State — Is Order Valid? ──────────────────
    b.node("choice")
      .at(760, 355)
      .rect(190, 52, 10)
      .fill(
        hot("choice")
          ? "#78350f"
          : choicePath !== "pending"
            ? "#451a03"
            : "#0f172a",
      )
      .stroke(hot("choice") ? "#f59e0b" : "#b45309", 2)
      .label("Is Claim Valid?", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("choice-state"))
      .tooltip({
        title: "Is Claim Valid?",
        sections: [
          { label: "Type", value: "Choice State" },
          { label: "Yes path", value: "→ Assess Claim" },
          { label: "No path", value: "→ Reject Claim" },
        ],
      });
    b.node("choice").badge("Choice", {
      position: "top-right",
      fill: "#fff",
      background: "#d97706",
      fontSize: 8,
    });

    // ── Assess Claim (Task state) ─────────────────────
    b.node("assess")
      .at(760, 470)
      .rect(190, 52, 10)
      .fill(hot("assess") ? "#312e81" : "#0f172a")
      .stroke(hot("assess") ? "#818cf8" : "#4338ca", 2)
      .label("Assess Claim", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("task-state"))
      .tooltip({
        title: "Assess Claim",
        sections: [
          { label: "Type", value: "Task State" },
          { label: "Calls", value: "Lambda (assessment + PostgreSQL)" },
        ],
      });
    b.node("assess").badge("Task", {
      position: "top-right",
      fill: "#fff",
      background: "#6366f1",
      fontSize: 8,
    });

    // ── Wait for Approval (Task state — waitForTaskToken) ──
    b.node("approval-wait")
      .at(760, 570)
      .rect(190, 52, 10)
      .fill(hot("approval-wait") ? "#422006" : "#0f172a")
      .stroke(hot("approval-wait") ? "#fbbf24" : "#92400e", 2)
      .label("Wait for Approval", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("wait-for-callback"))
      .tooltip({
        title: "Wait for Approval",
        sections: [
          { label: "Type", value: "Task State (waitForTaskToken)" },
          {
            label: "Mechanism",
            value:
              "Pauses workflow, emits token → admin approves → sendTaskSuccess resumes",
          },
          {
            label: "Timeout",
            value: "Standard workflows can wait up to 1 year",
          },
        ],
      });
    b.node("approval-wait").badge("Callback", {
      position: "top-right",
      fill: "#fff",
      background: "#d97706",
      fontSize: 8,
    });

    // ── Store Documents (Task state) ──────────────────
    b.node("store-docs")
      .at(760, 670)
      .rect(190, 52, 10)
      .fill(hot("store-docs") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("store-docs") ? "#60a5fa" : "#1e40af", 2)
      .label("Store Documents", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("s3"))
      .tooltip({
        title: "Store Documents",
        sections: [
          { label: "Type", value: "Task State" },
          { label: "Calls", value: "S3 (PutObject — direct integration)" },
        ],
      });
    b.node("store-docs").badge("Task", {
      position: "top-right",
      fill: "#fff",
      background: "#2563eb",
      fontSize: 8,
    });

    // ── Notify Customer (Task state) ──────────────────
    b.node("notify")
      .at(760, 760)
      .rect(190, 52, 10)
      .fill(hot("notify") ? "#4c0519" : "#0f172a")
      .stroke(hot("notify") ? "#f43f5e" : "#881337", 2)
      .label("Notify Customer", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("sns"))
      .tooltip({
        title: "Notify Customer",
        sections: [
          { label: "Type", value: "Task State" },
          { label: "Calls", value: "SNS (Publish — direct integration)" },
        ],
      });
    b.node("notify").badge("Task", {
      position: "top-right",
      fill: "#fff",
      background: "#e11d48",
      fontSize: 8,
    });

    // ── Success State ───────────────────────────────────
    b.node("success")
      .at(760, 845)
      .rect(150, 44, 10)
      .fill(hot("success") ? "#052e16" : "#0f172a")
      .stroke(hot("success") ? "#22c55e" : "#166534", 2.4)
      .label("Claim Approved ✓", {
        fill: hot("success") ? "#86efac" : "#fff",
        fontSize: 12,
        fontWeight: "bold",
      })
      .tooltip({
        title: "Claim Approved",
        sections: [
          {
            label: "Type",
            value: "Succeed State — workflow ends successfully",
          },
        ],
      });

    // ── Reject Order (Task state — No path) ─────────────
    b.node("reject")
      .at(960, 355)
      .rect(130, 52, 10)
      .fill(hot("reject") ? "#450a0a" : "#0f172a")
      .stroke(hot("reject") ? "#ef4444" : "#7f1d1d", 2)
      .label("Reject Claim", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
      })
      .onClick(() => openConcept("task-state"))
      .tooltip({
        title: "Reject Claim",
        sections: [
          { label: "Type", value: "Task State" },
          {
            label: "Handles",
            value: "Invalid claims — logs rejection, notifies customer",
          },
        ],
      });
    b.node("reject").badge("Task", {
      position: "top-right",
      fill: "#fff",
      background: "#dc2626",
      fontSize: 8,
    });

    // ── Fail State ──────────────────────────────────────
    b.node("fail")
      .at(960, 470)
      .rect(110, 44, 10)
      .fill(hot("fail") ? "#450a0a" : "#0f172a")
      .stroke(hot("fail") ? "#ef4444" : "#7f1d1d", 2.4)
      .label("Denied ✗", {
        fill: hot("fail") ? "#fca5a5" : "#fff",
        fontSize: 12,
        fontWeight: "bold",
      })
      .tooltip({
        title: "Claim Denied",
        sections: [
          { label: "Type", value: "Fail State — workflow ends with an error" },
        ],
      });

    // ── External Services (right column) ────────────────

    // Lambda — validation
    b.node("lambda-1")
      .at(1200, 235)
      .rect(140, 50, 10)
      .fill(hot("lambda-1") ? "#431407" : "#0f172a")
      .stroke(hot("lambda-1") ? "#fb923c" : "#78350f", 1.6)
      .label("Lambda", {
        fill: "#fdba74",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("lambda"))
      .tooltip({
        title: "Validation Lambda",
        sections: [
          {
            label: "Role",
            value: "Validates claim — checks policy, coverage, dates",
          },
        ],
      });
    b.node("lambda-1").label("validateClaim()", {
      fill: "#fed7aa",
      fontSize: 8,
      dy: 10,
    });

    // Lambda — payment
    b.node("lambda-2")
      .at(1200, 470)
      .rect(140, 50, 10)
      .fill(hot("lambda-2") ? "#431407" : "#0f172a")
      .stroke(hot("lambda-2") ? "#fb923c" : "#78350f", 1.6)
      .label("Lambda", {
        fill: "#fdba74",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("lambda"))
      .tooltip({
        title: "Assessment Lambda",
        sections: [
          {
            label: "Role",
            value: "Calculates payout — damage, deductible, limits",
          },
        ],
      });
    b.node("lambda-2").label("assessClaim()", {
      fill: "#fed7aa",
      fontSize: 8,
      dy: 10,
    });

    // Admin Dashboard (approval UI)
    b.node("approval-svc")
      .at(1200, 570)
      .rect(140, 50, 10)
      .fill(hot("approval-svc") ? "#422006" : "#0f172a")
      .stroke(hot("approval-svc") ? "#fbbf24" : "#92400e", 1.6)
      .label("Admin Dashboard", {
        fill: "#fde68a",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("wait-for-callback"))
      .tooltip({
        title: "Admin Dashboard",
        sections: [
          {
            label: "Role",
            value: "Claims adjuster reviews and approves/denies the claim",
          },
          {
            label: "Callback",
            value: "Calls sendTaskSuccess(taskToken) to resume the workflow",
          },
        ],
      });
    b.node("approval-svc").label("sendTaskSuccess()", {
      fill: "#fef3c7",
      fontSize: 8,
      dy: 10,
    });

    // S3
    b.node("s3-svc")
      .at(1200, 670)
      .rect(140, 50, 10)
      .fill(hot("s3-svc") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("s3-svc") ? "#3b82f6" : "#1e40af", 1.6)
      .label("S3", {
        fill: "#93c5fd",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("s3"))
      .tooltip({
        title: "Amazon S3",
        sections: [
          { label: "Role", value: "Stores claim documents (photos, receipts)" },
        ],
      });
    b.node("s3-svc").label("claim-docs bucket", {
      fill: "#bfdbfe",
      fontSize: 8,
      dy: 10,
    });

    // SNS
    b.node("sns-svc")
      .at(1200, 760)
      .rect(140, 50, 10)
      .fill(hot("sns-svc") ? "#4c0519" : "#0f172a")
      .stroke(hot("sns-svc") ? "#f43f5e" : "#881337", 1.6)
      .label("SNS", {
        fill: "#fda4af",
        fontSize: 12,
        fontWeight: "bold",
        dy: -4,
      })
      .onClick(() => openConcept("sns"))
      .tooltip({
        title: "SNS",
        sections: [
          { label: "Role", value: "Sends email/push notification to customer" },
        ],
      });
    b.node("sns-svc").label("claim-updates topic", {
      fill: "#fecdd3",
      fontSize: 8,
      dy: 10,
    });

    // ═══════════════════════════════════════════════════
    // EDGES — Trigger Chain (client → backend → event bus → workflow)
    // ═══════════════════════════════════════════════════

    // React App → GraphQL Mutation (enters backend)
    const eClientGql = b
      .edge("client-app", "be-mutation", "e-client-gql")
      .arrow(true)
      .stroke(
        hot("client-app") && hot("be-mutation") ? "#06b6d4" : "#334155",
        hot("client-app") && hot("be-mutation") ? 2.4 : 1.2,
      )
      .label("GraphQL / HTTP", { fill: "#67e8f9", fontSize: 8 });
    if (hot("client-app") && hot("be-mutation"))
      eClientGql.animate("flow", { duration: "0.8s" });

    // GraphQL Mutation → ClaimService (backend internal)
    const eGqlSvc = b
      .edge("be-mutation", "be-service", "e-gql-svc")
      .arrow(true)
      .stroke(
        hot("be-mutation") && hot("be-service") ? "#e879f9" : "#4a044e",
        hot("be-mutation") && hot("be-service") ? 1.8 : 1,
      )
      .label("ctx.services", { fill: "#f0abfc", fontSize: 7 });
    if (hot("be-mutation") && hot("be-service"))
      eGqlSvc.animate("flow", { duration: "0.6s" });

    // ClaimService → SDK Client (backend internal)
    const eSvcSdk = b
      .edge("be-service", "be-sdk", "e-svc-sdk")
      .arrow(true)
      .stroke(
        hot("be-service") && hot("be-sdk") ? "#d946ef" : "#4a044e",
        hot("be-service") && hot("be-sdk") ? 1.8 : 1,
      )
      .label("publish ClaimSubmitted", { fill: "#e879f9", fontSize: 7 });
    if (hot("be-service") && hot("be-sdk"))
      eSvcSdk.animate("flow", { duration: "0.6s" });

    // SDK Client → Event Bus (exits backend → enters EventBridge)
    const eSdkBus = b
      .edge("be-sdk", "eb-bus", "e-sdk-bus")
      .arrow(true)
      .stroke(
        hot("be-sdk") && hot("eb-bus") ? "#a855f7" : "#334155",
        hot("be-sdk") && hot("eb-bus") ? 2.4 : 1.2,
      )
      .label("remote PutEvents API", { fill: "#c4b5fd", fontSize: 8 });
    if (hot("be-sdk") && hot("eb-bus"))
      eSdkBus.animate("flow", { duration: "0.8s" });

    // Event Bus → Rule Engine (internal)
    const eBusRules = b
      .edge("eb-bus", "eb-rules", "e-bus-rules")
      .arrow(true)
      .stroke(
        hot("eb-bus") && hot("eb-rules") ? "#a855f7" : "#4c1d95",
        hot("eb-bus") && hot("eb-rules") ? 1.8 : 1,
      )
      .label("matches", { fill: "#c4b5fd", fontSize: 7 });
    if (hot("eb-bus") && hot("eb-rules"))
      eBusRules.animate("flow", { duration: "0.6s" });

    // Rule Engine → Target (internal)
    const eRulesTarget = b
      .edge("eb-rules", "eb-target", "e-rules-target")
      .arrow(true)
      .stroke(
        hot("eb-rules") && hot("eb-target") ? "#8b5cf6" : "#4c1d95",
        hot("eb-rules") && hot("eb-target") ? 1.8 : 1,
      )
      .label("routes", { fill: "#c4b5fd", fontSize: 7 });
    if (hot("eb-rules") && hot("eb-target"))
      eRulesTarget.animate("flow", { duration: "0.6s" });

    // Target → Validate Claim (triggers workflow)
    const eTargetValidate = b
      .edge("eb-target", "validate", "e-target-validate")
      .arrow(true)
      .stroke(
        hot("eb-target") && hot("validate") ? "#7c3aed" : "#334155",
        hot("eb-target") && hot("validate") ? 2.4 : 1.2,
      )
      .label("StartExecution", { fill: "#a78bfa", fontSize: 7 });
    if (hot("eb-target") && hot("validate"))
      eTargetValidate.animate("flow", { duration: "0.8s" });

    // Validate → Choice
    const eValChoice = b
      .edge("validate", "choice", "e-val-choice")
      .arrow(true)
      .stroke(
        hot("validate") && hot("choice") ? "#f59e0b" : "#334155",
        hot("validate") && hot("choice") ? 2.2 : 1.2,
      )
      .label("result", { fill: "#fbbf24", fontSize: 8 });
    if (hot("validate") && hot("choice"))
      eValChoice.animate("flow", { duration: "0.7s" });

    // Choice → Assess (Yes path)
    const eChoiceAssess = b
      .edge("choice", "assess", "e-choice-assess")
      .arrow(true)
      .stroke(
        hot("choice") && hot("assess")
          ? "#22c55e"
          : choicePath === "yes"
            ? "#166534"
            : "#334155",
        hot("choice") && hot("assess") ? 2.4 : 1.2,
      )
      .label("Yes ✓", {
        fill: choicePath === "yes" ? "#86efac" : "#6b7280",
        fontSize: 9,
        fontWeight: choicePath === "yes" ? "bold" : "normal",
      });
    if (hot("choice") && hot("assess"))
      eChoiceAssess.animate("flow", { duration: "0.7s" });

    // Choice → Reject (No path)
    const eChoiceReject = b
      .edge("choice", "reject", "e-choice-reject")
      .arrow(true)
      .stroke(
        hot("choice") && hot("reject")
          ? "#ef4444"
          : choicePath === "no"
            ? "#7f1d1d"
            : "#334155",
        hot("choice") && hot("reject") ? 2.4 : 1,
      )
      .label("No ✗", {
        fill: choicePath === "no" ? "#fca5a5" : "#6b7280",
        fontSize: 9,
        fontWeight: choicePath === "no" ? "bold" : "normal",
      });
    if (hot("choice") && hot("reject"))
      eChoiceReject.animate("flow", { duration: "0.7s" });

    // Assess → Wait for Approval
    const eAssessApproval = b
      .edge("assess", "approval-wait", "e-assess-approval")
      .arrow(true)
      .stroke(
        hot("assess") && hot("approval-wait") ? "#818cf8" : "#334155",
        hot("assess") && hot("approval-wait") ? 2.2 : 1.2,
      );
    if (hot("assess") && hot("approval-wait"))
      eAssessApproval.animate("flow", { duration: "0.7s" });

    // Wait for Approval → Store Documents (approved)
    const eApprovalStore = b
      .edge("approval-wait", "store-docs", "e-approval-store")
      .arrow(true)
      .stroke(
        hot("approval-wait") && hot("store-docs") ? "#22c55e" : "#334155",
        hot("approval-wait") && hot("store-docs") ? 2.2 : 1.2,
      )
      .label("approved", {
        fill: hot("approval-wait") && hot("store-docs") ? "#86efac" : "#6b7280",
        fontSize: 8,
      });
    if (hot("approval-wait") && hot("store-docs"))
      eApprovalStore.animate("flow", { duration: "0.7s" });

    // Store Documents → Notify
    const eStoreNotify = b
      .edge("store-docs", "notify", "e-store-notify")
      .arrow(true)
      .stroke(
        hot("store-docs") && hot("notify") ? "#818cf8" : "#334155",
        hot("store-docs") && hot("notify") ? 2.2 : 1.2,
      );
    if (hot("store-docs") && hot("notify"))
      eStoreNotify.animate("flow", { duration: "0.7s" });

    // Notify → Success
    const eNotifySuccess = b
      .edge("notify", "success", "e-notify-success")
      .arrow(true)
      .stroke(
        hot("notify") && hot("success") ? "#22c55e" : "#334155",
        hot("notify") && hot("success") ? 2.4 : 1.2,
      );
    if (hot("notify") && hot("success"))
      eNotifySuccess.animate("flow", { duration: "0.7s" });

    // Reject → Fail
    const eRejectFail = b
      .edge("reject", "fail", "e-reject-fail")
      .arrow(true)
      .stroke(
        hot("reject") && hot("fail") ? "#ef4444" : "#334155",
        hot("reject") && hot("fail") ? 2.4 : 1,
      );
    if (hot("reject") && hot("fail"))
      eRejectFail.animate("flow", { duration: "0.7s" });

    // ═══════════════════════════════════════════════════
    // EDGES — Service Calls (dashed — shows what each Task calls)
    // ═══════════════════════════════════════════════════

    // Validate → Lambda 1
    b.edge("validate", "lambda-1", "e-val-lambda")
      .arrow(true)
      .stroke(
        hot("validate") && hot("lambda-1") ? "#fb923c" : "#262626",
        hot("validate") && hot("lambda-1") ? 1.6 : 0.8,
      )
      .dashed()
      .label("calls", { fill: "#fdba74", fontSize: 7 });

    // Assess → Lambda 2
    b.edge("assess", "lambda-2", "e-assess-lambda")
      .arrow(true)
      .stroke(
        hot("assess") && hot("lambda-2") ? "#fb923c" : "#262626",
        hot("assess") && hot("lambda-2") ? 1.6 : 0.8,
      )
      .dashed()
      .label("calls", { fill: "#fdba74", fontSize: 7 });

    // Wait for Approval → Admin Dashboard (sends task token)
    b.edge("approval-wait", "approval-svc", "e-approval-admin")
      .arrow(true)
      .stroke(
        hot("approval-wait") && hot("approval-svc") ? "#fbbf24" : "#262626",
        hot("approval-wait") && hot("approval-svc") ? 1.6 : 0.8,
      )
      .dashed()
      .label("token + request", { fill: "#fde68a", fontSize: 7 });

    // Admin Dashboard → Wait for Approval (sendTaskSuccess callback)
    b.edge("approval-svc", "approval-wait", "e-admin-approval")
      .arrow(true)
      .stroke(
        hot("approval-svc") && hot("approval-wait") ? "#22c55e" : "#262626",
        hot("approval-svc") && hot("approval-wait") ? 1.6 : 0.8,
      )
      .dashed()
      .label("sendTaskSuccess", { fill: "#86efac", fontSize: 7 });

    // Store Documents → S3
    b.edge("store-docs", "s3-svc", "e-store-s3")
      .arrow(true)
      .stroke(
        hot("store-docs") && hot("s3-svc") ? "#3b82f6" : "#262626",
        hot("store-docs") && hot("s3-svc") ? 1.6 : 0.8,
      )
      .dashed()
      .label("PutObject", { fill: "#93c5fd", fontSize: 7 });

    // Notify → SNS
    b.edge("notify", "sns-svc", "e-notify-sns")
      .arrow(true)
      .stroke(
        hot("notify") && hot("sns-svc") ? "#f43f5e" : "#262626",
        hot("notify") && hot("sns-svc") ? 1.6 : 0.8,
      )
      .dashed()
      .label("Publish", { fill: "#fda4af", fontSize: 7 });

    // ── Signal overlays ─────────────────────────────────
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig) => {
          const { id, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, { key: id });
        });
      });
    }

    return b;
  })();

  // ── Mount / update scene (preserve pan-zoom) ──────────
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? viewportRef.current;

    if (!builderRef.current) {
      /* First mount */
      builderRef.current = scene;
      pzRef.current =
        scene.mount(containerRef.current, {
          autoplay: true,
          panZoom: true,
          initialZoom: saved?.zoom ?? 1,
          initialPan: saved?.pan ?? { x: 0, y: 0 },
        }) ?? null;
    } else {
      /* Subsequent updates — commit in-place, keep viewport */
      scene.commit(containerRef.current);
      builderRef.current = scene;
      if (saved) {
        pzRef.current?.setZoom(saved.zoom);
        pzRef.current?.setPan(saved.pan);
      }
    }

    const unsub = pzRef.current?.onChange((s) => {
      viewportRef.current = s;
    });
    return () => {
      unsub?.();
    };
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  // ── Pill definitions ──────────────────────────────────
  const pills = [
    {
      key: "step-functions",
      label: "Step Functions",
      color: "#fdba74",
      borderColor: "rgba(249,115,22,0.28)",
    },
    {
      key: "standard-workflow",
      label: "Standard Workflow",
      color: "#fde68a",
      borderColor: "rgba(245,158,11,0.28)",
    },
    {
      key: "express-workflow",
      label: "Express Workflow",
      color: "#bbf7d0",
      borderColor: "rgba(34,197,94,0.28)",
    },
    {
      key: "state-machine",
      label: "State Machine",
      color: "#93c5fd",
      borderColor: "rgba(59,130,246,0.28)",
    },
    {
      key: "task-state",
      label: "Task State",
      color: "#c4b5fd",
      borderColor: "rgba(139,92,246,0.28)",
    },
    {
      key: "choice-state",
      label: "Choice State",
      color: "#fde68a",
      borderColor: "rgba(245,158,11,0.28)",
    },
    {
      key: "wait-for-callback",
      label: "Wait for Callback",
      color: "#fde68a",
      borderColor: "rgba(251,191,36,0.28)",
    },
    {
      key: "lambda",
      label: "Lambda",
      color: "#fed7aa",
      borderColor: "rgba(251,146,60,0.28)",
    },
    {
      key: "s3",
      label: "S3",
      color: "#bfdbfe",
      borderColor: "rgba(37,99,235,0.28)",
    },
    {
      key: "sns",
      label: "SNS",
      color: "#fecdd3",
      borderColor: "rgba(225,29,72,0.28)",
    },
    {
      key: "client-app",
      label: "React App",
      color: "#67e8f9",
      borderColor: "rgba(6,182,212,0.28)",
    },
    {
      key: "gql-mutation",
      label: "GraphQL Mutation",
      color: "#f0abfc",
      borderColor: "rgba(232,121,249,0.28)",
    },
    {
      key: "claim-service",
      label: "ClaimService",
      color: "#e879f9",
      borderColor: "rgba(217,70,239,0.28)",
    },
    {
      key: "event-bus",
      label: "Event Bus",
      color: "#d8b4fe",
      borderColor: "rgba(168,85,247,0.28)",
    },
    {
      key: "rule-engine",
      label: "Rule Engine",
      color: "#c4b5fd",
      borderColor: "rgba(139,92,246,0.28)",
    },
    {
      key: "eventbridge",
      label: "EventBridge",
      color: "#a78bfa",
      borderColor: "rgba(168,85,247,0.28)",
    },
  ];

  // ── Status helpers ────────────────────────────────────
  const statusColor =
    workflowStatus === "succeeded"
      ? "#22c55e"
      : workflowStatus === "failed"
        ? "#ef4444"
        : workflowStatus === "running"
          ? "#60a5fa"
          : "#94a3b8";

  return (
    <div className="step-functions-root">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="step-functions-stage">
            <StageHeader
              title="AWS Step Functions"
              subtitle="Insurance claims workflow — watch each state execute one at a time"
            >
              <StatBadge
                label="Phase"
                value={phase.replace(/-/g, " ")}
                className={`step-functions-phase step-functions-phase--${phase}`}
              />
              <StatBadge
                label="Status"
                value={workflowStatus}
                color={statusColor}
              />
              {currentStateName && (
                <StatBadge
                  label="Current State"
                  value={currentStateName}
                  color="#c4b5fd"
                />
              )}
            </StageHeader>

            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p style={{ whiteSpace: "pre-line" }}>{explanation}</p>
            </SideCard>

            <SideCard heading="Backend Wiring" sub="local vs remote">
              <p>
                Inside ECS: <code>Mutation.submitClaim</code> calls{" "}
                <code>ctx.services.claimService.submitClaim(input)</code>.
              </p>
              <p>
                Still inside ECS: <code>ClaimService</code> builds the event and
                calls <code>eventBridge.send(new PutEventsCommand(...))</code>.
              </p>
              <p>
                First remote boundary: the SDK sends an HTTPS request to
                EventBridge. Rules and targets are AWS infrastructure, not code
                inside the container.
              </p>
            </SideCard>

            <SideCard heading="Responsibility Split" sub="command vs event">
              <p>
                Without EventBridge, <code>ClaimService</code> would gradually
                become the coordinator: call Step Functions, trigger fraud
                checks, send analytics, and keep growing as new reactions are
                added.
              </p>
              <p>
                In this design, the service does one thing: publish{" "}
                <code>ClaimSubmitted</code>. EventBridge rules decide which
                consumers react.
              </p>
              <p>
                That keeps business validation in the service layer, while
                downstream orchestration of reactions lives in infrastructure
                configuration.
              </p>
            </SideCard>

            <SideCard heading="Human-in-the-Loop" sub="waitForTaskToken">
              <p>
                The <strong>Wait for Approval</strong> state uses{" "}
                <code>waitForTaskToken</code>: Step Functions generates a unique
                token, sends it to the admin dashboard, and pauses.
              </p>
              <p>
                The claims adjuster reviews the case and clicks approve or deny.
                The dashboard calls <code>SendTaskSuccess(token, result)</code>{" "}
                — the workflow resumes from exactly where it stopped.
              </p>
              <p>
                Zero compute while waiting. Standard workflows can pause up to 1
                year. Express workflows do not support this pattern.
              </p>
            </SideCard>

            <SideCard
              heading="Workflow States"
              sub="state machine"
              className="sfn-card--states"
            >
              <div className="sfn-state-list">
                {[
                  {
                    id: "validate",
                    label: "Validate Claim",
                    type: "Task",
                    color: "#818cf8",
                  },
                  {
                    id: "choice",
                    label: "Is Claim Valid?",
                    type: "Choice",
                    color: "#f59e0b",
                  },
                  {
                    id: "assess",
                    label: "Assess Claim",
                    type: "Task",
                    color: "#818cf8",
                  },
                  {
                    id: "approval-wait",
                    label: "Wait for Approval",
                    type: "Callback",
                    color: "#fbbf24",
                  },
                  {
                    id: "store-docs",
                    label: "Store Documents",
                    type: "Task",
                    color: "#60a5fa",
                  },
                  {
                    id: "notify",
                    label: "Notify Customer",
                    type: "Task",
                    color: "#f43f5e",
                  },
                  {
                    id: "success",
                    label: "Claim Approved",
                    type: "Succeed",
                    color: "#22c55e",
                  },
                  {
                    id: "reject",
                    label: "Reject Claim",
                    type: "Task",
                    color: "#ef4444",
                  },
                  {
                    id: "fail",
                    label: "Claim Denied",
                    type: "Fail",
                    color: "#ef4444",
                  },
                ].map((state) => (
                  <div
                    key={state.id}
                    className={`sfn-state-chip ${hot(state.id) ? "sfn-state-chip--active" : ""}`}
                  >
                    <span
                      className="sfn-state-chip__dot"
                      style={{
                        background: hot(state.id) ? state.color : "#475569",
                        boxShadow: hot(state.id)
                          ? `0 0 6px ${state.color}60`
                          : "none",
                      }}
                    />
                    <span className="sfn-state-chip__name">{state.label}</span>
                    <span
                      className="sfn-state-chip__type"
                      style={{ color: state.color }}
                    >
                      {state.type}
                    </span>
                  </div>
                ))}
              </div>
            </SideCard>

            <SideCard
              heading="Key Idea"
              sub="remember this"
              className="sfn-card--idea"
            >
              <p className="sfn-key-idea">
                {phase === "overview" &&
                  "Step Functions is like a checklist: each state does one job, and the service handles everything in between."}
                {phase === "triggering" &&
                  "Direct calls make your backend the coordinator. Here the backend publishes ClaimSubmitted once, and EventBridge rules decide what reacts next."}
                {phase === "validating" &&
                  "Task states do the actual work. They call AWS services and wait for results."}
                {phase === "choosing" &&
                  "Choice states are like if/else — they read data and pick a path."}
                {phase === "assessing" &&
                  "Step Functions passes data between states automatically — no glue code needed."}
                {phase === "approving" &&
                  "waitForTaskToken lets the workflow pause for human decisions — zero compute cost while waiting, up to one year on Standard."}
                {phase === "uploading" &&
                  "Direct service integrations let you call S3, SNS, and 200+ services without Lambda."}
                {phase === "notifying" &&
                  "SNS can send emails, push notifications, or trigger other services — all from a single Publish call."}
                {phase === "complete" &&
                  "The Succeed state marks the workflow as complete. Every step is logged for debugging."}
                {phase === "rejecting" &&
                  "Choice states handle branching — different paths for different conditions."}
                {phase === "failed" &&
                  "The Fail state records what went wrong. Step Functions provides a full audit trail."}
                {phase === "summary" &&
                  "Your team writes the business logic. Step Functions handles the plumbing."}
              </p>
            </SideCard>
          </SidePanel>
        }
      />

      <ConceptModal />
    </div>
  );
};

export default StepFunctionsVisualization;
