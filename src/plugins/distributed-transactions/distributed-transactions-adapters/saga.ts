import { createPatternAdapter } from "./shared";

export const sagaAdapter = createPatternAdapter({
  id: "saga",
  profile: {
    label: "Saga",
    shortLabel: "Saga",
    description:
      "Coordinate one business workflow as a sequence of local transactions across services, then compensate when a later step fails.",
    context:
      "Use saga when each service owns its own database and the workflow itself needs to stay explicit at the application layer.",
    tradeoff:
      "Saga replaces one global atomic commit with step-by-step progress, status tracking, and compensating actions. It fits service autonomy, but it raises workflow and failure-path complexity.",
    terms: [
      "local transaction",
      "orchestrator",
      "participant",
      "compensating action",
      "eventual consistency",
    ],
    criticalNodes: [
      "initiator",
      "boundary",
      "transport",
      "participant-a",
      "participant-b",
      "recovery",
    ],
  },
  colors: {
    fill: "rgba(30, 64, 175, 0.86)",
    stroke: "#60a5fa",
    muted: "#bfdbfe",
  },
  metrics: {
    coordinationModel: "Orchestrated workflow",
    atomicBoundary: "Local tx only",
    deliverySemantics: "Step commands",
    failureStrategy: "Compensate",
    consistencyStory: "Eventually consistent",
  },
  topology: {
    initiatorLabel: "Order Service",
    initiatorSubtitle: "Starts the business flow",
    boundaryLabel: "Order DB",
    boundarySubtitle: "One local commit",
    transportLabel: "Saga Orchestrator",
    transportSubtitle: "Tracks step progress",
    participantALabel: "Payment Service",
    participantASubtitle: "Owns its local commit",
    participantBLabel: "Inventory Service",
    participantBSubtitle: "Reserves stock locally",
    recoveryLabel: "Compensation Path",
    recoverySubtitle: "Undo with semantic actions",
    splitLabel:
      "When a later step fails, saga compensates instead of rolling back one global transaction.",
  },
  copy: {
    overview:
      "A saga splits one business transaction into multiple local transactions. Each participant commits its own state independently, and failure handling becomes an explicit workflow concern instead of a hidden database rollback.",
    "local-write":
      "The flow starts with one local commit inside the initiating service. At this point only the order side has durable state; nothing else is globally committed.",
    "capture-intent":
      "The initiator records what should happen next and hands control to the saga coordinator. This template is ready for orchestration or choreography branches later.",
    "deliver-change":
      "Participants execute their own local work independently. Coordination happens through workflow progress and messages, not a shared transaction spanning every service database.",
    "handle-failure":
      "If a later participant fails, saga needs compensating actions. This template highlights the failure window and vocabulary now; the concrete compensation branch can be implemented next.",
    summary:
      "Saga is the fit when one business action spans service-owned data. The price is explicit workflow logic, eventual consistency, and compensations instead of one global atomic commit.",
  },
});
