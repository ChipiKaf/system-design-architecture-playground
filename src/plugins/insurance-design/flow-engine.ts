import type { InsuranceDesignState } from "./insuranceDesignSlice";
import { getAdapter } from "./insurance-design-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   InsuranceDesign Lab — Declarative Flow Engine

   Uses the shared lab-engine for build/execute logic.
   Token expansion and flow beats delegate to adapters.
   Steps use `when` guards to show only for the active topic.
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<InsuranceDesignState>;
export type StepDef = GenericStepDef<InsuranceDesignState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<InsuranceDesignState>;

/* ── Token expansion (delegates to adapter) ──────────── */

export function expandToken(
  token: string,
  state: InsuranceDesignState,
): string[] {
  const adapter = getAdapter(state.variant);
  const expanded = adapter.expandToken(token, state);
  return expanded ?? [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  /* AI System (shared: claims / risk / fraud) */
  | "ai-overview"
  | "ai-ingest"
  | "ai-route"
  | "ai-orchestrate"
  | "ai-analyze"
  | "ai-store"
  | "ai-notify"
  | "ai-summary"
  /* AI System (LLM Platform only) */
  | "llm-ws-connect"
  | "llm-message"
  | "llm-sqs-send"
  | "llm-sqs-buffer"
  | "llm-sqs-poll"
  | "llm-ecs-consume"
  | "llm-ecs-embed"
  | "llm-ecs-cache"
  | "llm-ecs-infer"
  | "llm-ecs-persist-db"
  | "llm-ecs-persist-cache"
  | "llm-ecs-trace"
  | "llm-ecs-reply"
  | "llm-stream"
  /* AI System (Scalable LLM Alt only) */
  | "alt-query"
  | "alt-gql-publish"
  | "alt-eb-rules"
  | "alt-eb-target"
  | "alt-sfn-start"
  | "alt-exact-cache"
  | "alt-embed"
  | "alt-semantic-cache"
  | "alt-model-route"
  | "alt-inference"
  | "alt-persist"
  | "alt-observe"
  | "alt-respond";

/* ── Step Configuration ──────────────────────────────── */

const isAI = (s: InsuranceDesignState) => s.topic === "ai-system";
const isAINonLLM = (s: InsuranceDesignState) =>
  s.topic === "ai-system" &&
  s.variant !== "ai-llm-platform" &&
  s.variant !== "ai-llm-platform-alt";
const isLLM = (s: InsuranceDesignState) =>
  s.topic === "ai-system" && s.variant === "ai-llm-platform";
const isAlt = (s: InsuranceDesignState) =>
  s.topic === "ai-system" && s.variant === "ai-llm-platform-alt";

export const STEPS: StepDef[] = [
  /* ═══ AI System — shared overview ════════════════════ */
  {
    key: "ai-overview",
    label: "Architecture Overview",
    when: isAI,
    nextButton: "Begin →",
    action: "resetRun",
    explain: (s) => {
      const a = getAdapter(s.variant);
      return `${a.profile.label} — step through to see how this pipeline works at an insurance company.\n\n${a.profile.description}`;
    },
  },

  /* ═══ AI System — shared middle steps (claims / risk / fraud) ═══ */
  {
    key: "ai-ingest",
    label: "Customer Request",
    when: isAINonLLM,
    phase: "ingest",
    processingText: "Receiving data…",
    nextButtonColor: "#14b8a6",
    flow: () => [{ from: "client", to: "gql", duration: 500 }],
    finalHotZones: ["client", "gql"],
    recalcMetrics: true,
    explain: (s) => {
      if (s.variant === "ai-fraud-detection")
        return "An EventBridge event (claim.submitted) fires when a new claim is created — it arrives at the GraphQL API for initial validation.";
      if (s.variant === "ai-risk-scoring")
        return "A new policy application arrives from the Next.js frontend. The GraphQL mutation validates the input and prepares it for the intake Lambda.";
      return "A customer submits a claim through the Next.js app. The GraphQL API validates the input and prepares the data for processing.";
    },
  },
  {
    key: "ai-route",
    label: "Route to Intake",
    when: isAINonLLM,
    phase: "ingest",
    processingText: "Routing…",
    nextButtonColor: "#14b8a6",
    flow: () => [{ from: "gql", to: "intake", duration: 500 }],
    finalHotZones: ["gql", "intake"],
    recalcMetrics: true,
    explain: (s) => {
      if (s.variant === "ai-fraud-detection")
        return "The GraphQL resolver triggers the intake Lambda. It enriches the raw claim data — pulling policy history, claimant profile, and previous claim patterns from Aurora.";
      if (s.variant === "ai-risk-scoring")
        return "The GraphQL resolver triggers the intake Lambda. It extracts ML features — age, location, vehicle type, claims history — and normalises them for the SageMaker model.";
      return "The GraphQL resolver triggers the intake Lambda. It receives the claim data, uploads any attached documents to S3, and creates an initial claim record in Aurora.";
    },
  },
  {
    key: "ai-orchestrate",
    label: "Pipeline Orchestration",
    when: isAINonLLM,
    phase: "orchestrate",
    processingText: "Starting pipeline…",
    nextButtonColor: "#ef4444",
    flow: () => [{ from: "intake", to: "orchestrator", duration: 600 }],
    finalHotZones: ["orchestrator"],
    recalcMetrics: true,
    explain: (s) => {
      const a = getAdapter(s.variant);
      return `Step Functions takes over. It orchestrates the entire ${a.profile.label.toLowerCase()} pipeline as a state machine — each step is retryable, observable in CloudWatch, and defined in AWS CDK.\n\nIf any step fails, the state machine handles retries and dead-letter routing automatically.`;
    },
  },
  {
    key: "ai-analyze",
    label: "AI Analysis",
    when: isAINonLLM,
    phase: "analyze",
    processingText: "AI processing…",
    nextButtonColor: "#3b82f6",
    flow: (s) => getAdapter(s.variant).getFlowBeats(s),
    recalcMetrics: true,
    explain: (s) => {
      const a = getAdapter(s.variant);
      if (s.variant === "ai-fraud-detection")
        return `${a.profile.label}: the SageMaker anomaly-detection model examines the enriched claim.\n\nIt compares against historical patterns — unusually high amounts, repeat addresses, rapid successive claims — and assigns a fraud probability score.`;
      if (s.variant === "ai-risk-scoring")
        return `${a.profile.label}: the SageMaker endpoint receives the normalised feature vector.\n\nThe gradient-boosted model predicts a risk score (0–100) based on the applicant's profile. This score directly drives premium calculation.`;
      return `${a.profile.label}: Bedrock receives the claim documents — photos, PDFs, and text descriptions.\n\nThe LLM extracts damage assessments, verifies policy coverage, and estimates a payout range. The structured output feeds the next decision step.`;
    },
  },
  {
    key: "ai-store",
    label: "Persist Results",
    when: isAINonLLM,
    phase: "output",
    processingText: "Storing results…",
    nextButtonColor: "#eab308",
    flow: () => [{ from: "ai", to: "store", duration: 500 }],
    finalHotZones: ["ai", "store"],
    recalcMetrics: true,
    explain: (s) => {
      if (s.variant === "ai-fraud-detection")
        return "The fraud score is persisted in Aurora PostgreSQL (fraud_flags table). If the score exceeds the threshold, the claim is placed on hold pending review.";
      if (s.variant === "ai-risk-scoring")
        return "The risk score is stored in Aurora PostgreSQL (risk_scores table). This score directly drives premium calculation and underwriting decisions.";
      return "The AI decision is written to Aurora PostgreSQL — the claims table is updated with the payout estimate and confidence level.";
    },
  },
  {
    key: "ai-notify",
    label: "Send Notification",
    when: isAINonLLM,
    phase: "output",
    processingText: "Notifying…",
    nextButtonColor: "#eab308",
    flow: () => [{ from: "store", to: "notify", duration: 500 }],
    finalHotZones: ["store", "notify"],
    recalcMetrics: true,
    explain: (s) => {
      if (s.variant === "ai-fraud-detection")
        return "An SNS message alerts the investigations team with the fraud score and claim details. The team can review and escalate in the internal dashboard.";
      if (s.variant === "ai-risk-scoring")
        return "An EventBridge event (score.completed) is emitted. Downstream services — the pricing engine and underwriting dashboard — consume it and adjust the premium in real time.";
      return "SES sends the customer an email with the claim outcome. The entire flow — from submission to notification — typically completes in under 30 seconds.";
    },
  },

  /* ═══ AI System — LLM Platform only (14 granular steps) ═══ */
  {
    key: "llm-ws-connect",
    label: "WebSocket Connect",
    when: isLLM,
    phase: "ws-connect",
    processingText: "Establishing connection…",
    nextButtonColor: "#22c55e",
    flow: () => [{ from: "client", to: "wsapi", duration: 600 }],
    finalHotZones: ["client", "wsapi"],
    recalcMetrics: true,
    explain: () =>
      "The customer opens the chat widget. The browser opens a WebSocket — a persistent two-way connection to the server.\n\n" +
      "Think of it like a phone call: once connected, both sides can talk at any time. " +
      "The alternative (HTTP polling) is like texting 'any news?' every half second — wasteful.\n\n" +
      "API Gateway gives this connection a unique ID (connectionId) and a Lambda saves it to Redis:\n" +
      "  connectionId → { userId, policyId }    expires after 2 hours\n\n" +
      "Why save it? Because later, when the AI has an answer, it needs to know which browser tab to send it to. " +
      "The connectionId is that address.\n\n" +
      "If the customer closes the tab, the connectionId is deleted. Next visit = new connection.",
  },
  {
    key: "llm-message",
    label: "Message Received",
    when: isLLM,
    phase: "message",
    processingText: "Processing message…",
    nextButtonColor: "#818cf8",
    flow: () => [{ from: "wsapi", to: "gateway", duration: 500 }],
    finalHotZones: ["wsapi", "gateway"],
    recalcMetrics: true,
    explain: () =>
      "The customer types 'Am I covered for hail damage?' and hits send.\n\n" +
      "The message travels over the WebSocket as a small JSON object:\n" +
      '  { action: "sendMessage", conversationId: "c-9f2a…", content: "Am I covered for hail damage?" }\n\n' +
      "A Lambda function receives it and does three things:\n" +
      "1. Checks the message is valid (not empty, not too long).\n" +
      "2. Looks up who sent it using the connectionId → gets their userId and policyId from Redis.\n" +
      "3. Packages everything together so downstream services know who asked what, and where to send the reply.\n\n" +
      "The conversationId groups messages into a thread. First message creates it, subsequent messages reuse it.\n\n" +
      "Why Lambda? This work takes under a second. Lambda charges per millisecond with zero idle cost — perfect for quick tasks.",
  },
  {
    key: "llm-sqs-send",
    label: "SQS — SendMessage",
    when: isLLM,
    phase: "sqs-send",
    processingText: "Enqueueing…",
    nextButtonColor: "#ef4444",
    flow: () => [{ from: "gateway", to: "sqs-send", duration: 500 }],
    finalHotZones: ["gateway", "sqs-send"],
    recalcMetrics: true,
    explain: () =>
      "Instead of calling the AI immediately, the Lambda calls sqs.sendMessage() to push the message into Amazon SQS.\n\n" +
      "Why not call the AI directly? OpenAI has a speed limit — only so many words per minute. " +
      "If 500 customers ask questions at once and we call OpenAI directly, most requests get rejected.\n\n" +
      "The message payload includes:\n" +
      '  { question: "Am I covered for hail?", connectionId: "abc123", userId: "u-7f2a", policyId: "POL-9182" }\n\n' +
      "The connectionId is critical — it's how the AI will later know which customer to reply to.\n\n" +
      "Lambda returns 200 OK to the browser immediately. The customer sees a typing indicator. " +
      "The actual AI work happens asynchronously in a worker container.",
  },
  {
    key: "llm-sqs-buffer",
    label: "SQS — Queue Storage",
    when: isLLM,
    phase: "sqs-buffer",
    processingText: "Buffering…",
    nextButtonColor: "#ef4444",
    flow: () => [{ from: "sqs-send", to: "sqs-buffer", duration: 400 }],
    finalHotZones: ["sqs-send", "sqs-buffer"],
    recalcMetrics: true,
    explain: () =>
      "The message sits in the SQS queue until a worker picks it up.\n\n" +
      "SQS is a buffer — like a waiting line at a ticket counter. Messages arrive at any rate, " +
      "but workers pick them up at the pace they can handle. No message is lost, no one gets an error.\n\n" +
      "How SQS protects against double-processing:\n" +
      "• Visibility timeout = 30 seconds. Once a worker picks up a message, it becomes invisible to other workers.\n" +
      "• If the worker finishes in time, it deletes the message. If it crashes, the message reappears after 30 s.\n" +
      "• After 3 failed attempts, the message moves to a dead-letter queue (DLQ) for manual investigation.\n\n" +
      "Why this matters for AI:\n" +
      "GPT-4o can take 5–15 seconds per question. Without a queue, a sudden spike of 500 questions " +
      "would overwhelm the workers and drop requests. The queue absorbs the spike — workers drain it at their own pace.",
  },
  {
    key: "llm-sqs-poll",
    label: "SQS — Long Poll",
    when: isLLM,
    phase: "sqs-poll",
    processingText: "Polling…",
    nextButtonColor: "#ef4444",
    flow: () => [{ from: "sqs-buffer", to: "sqs-poll", duration: 400 }],
    finalHotZones: ["sqs-buffer", "sqs-poll"],
    recalcMetrics: true,
    explain: () =>
      "The ECS worker calls receiveMessage(WaitTimeSeconds: 20) — a long poll.\n\n" +
      "What's long polling?\n" +
      "• Short poll: 'Any messages?' → 'No.' (empty response, wasted API call)\n" +
      "• Long poll: 'Any messages? I'll wait up to 20 seconds.' → SQS holds the connection open until a message arrives.\n\n" +
      "Long polling eliminates empty responses. Each API call either returns a real message or times out after 20 s.\n\n" +
      "Why this design?\n" +
      "Each ECS Fargate task runs a loop: poll → process → delete → poll → … " +
      "The long poll keeps the loop efficient. During quiet periods, workers sit idle (Fargate only charges for active CPU time). " +
      "During spikes, multiple workers drain the queue in parallel.\n\n" +
      "The auto-scaling policy watches the queue length. If messages pile up, ECS spins up more tasks. " +
      "When the queue empties, tasks scale back down.",
  },
  {
    key: "llm-ecs-consume",
    label: "ECS — Consume Message",
    when: isLLM,
    phase: "ecs-consume",
    processingText: "Consuming from queue…",
    nextButtonColor: "#a78bfa",
    flow: () => [{ from: "sqs-poll", to: "ecs-consume", duration: 500 }],
    finalHotZones: ["sqs-poll", "ecs-consume"],
    recalcMetrics: true,
    explain: () =>
      "An AI worker (running on ECS Fargate) picks up the next message from the queue.\n\n" +
      "We run multiple workers. Any worker can pick up any customer's message — " +
      "it doesn't matter which one, because the connectionId in the message tells the worker where to send the reply.\n\n" +
      "This is how horizontal scaling works: add more workers to handle more customers. " +
      "No customer is 'stuck' to a specific worker.\n\n" +
      "Why ECS Fargate instead of Lambda? The AI agent might need 5–30 seconds to think (look up policies, reason, verify). " +
      "Lambda is built for quick tasks (< 1 second). Fargate runs long-lived containers that can take their time.\n\n" +
      "Inside the container, a LangGraph agent orchestrates the next 6 steps — embedding, cache check, inference, persist, trace, and reply.",
  },
  {
    key: "llm-ecs-embed",
    label: "ECS — Generate Embedding",
    when: isLLM,
    phase: "ecs-embed",
    processingText: "Converting to vector…",
    nextButtonColor: "#38bdf8",
    flow: () => [
      { from: "ecs-embed", to: "ext-bedrock", duration: 600, color: "#38bdf8" },
    ],
    finalHotZones: ["ecs-embed", "ext-bedrock"],
    recalcMetrics: true,
    explain: () =>
      "Before checking the cache, the agent needs to turn the customer's question into a format a computer can compare.\n\n" +
      "It sends the text to Amazon Bedrock's Titan Embeddings model. This model reads the question and returns a vector — " +
      "a list of numbers (e.g. [0.12, -0.98, 0.44, …]) that represents the meaning of the text.\n\n" +
      "The key insight: two questions with similar meaning produce similar vectors, even if the words are completely different.\n" +
      "  'Am I covered for hail damage?'  → [0.12, -0.98, 0.44, …]\n" +
      "  'Does my policy cover hail?'     → [0.13, -0.97, 0.43, …]  ← very close!\n" +
      "  'What's the weather today?'      → [0.85, 0.21, -0.67, …]  ← totally different\n\n" +
      "Why Bedrock Titan instead of OpenAI's embeddings?\n" +
      "Titan runs inside AWS — the data never leaves our network. It costs a fraction of a cent per call " +
      "and returns in under 50 ms. Since we call it on every single message, it needs to be fast and cheap.",
  },
  {
    key: "llm-ecs-cache",
    label: "ECS — Cache Lookup",
    when: isLLM,
    phase: "ecs-cache",
    processingText: "Searching cache…",
    nextButtonColor: "#f59e0b",
    flow: () => [
      { from: "ecs-cache", to: "ext-redis", duration: 500, color: "#f59e0b" },
    ],
    finalHotZones: ["ecs-cache", "ext-redis"],
    recalcMetrics: true,
    explain: () =>
      "Now the agent takes that vector and searches Redis for a similar one.\n\n" +
      "Redis stores every previous answer alongside its embedding vector. The search compares vectors using cosine similarity — " +
      "a score from 0 to 1 that measures how close two vectors are.\n\n" +
      "  score > 0.90 → very similar, use cached answer\n" +
      "  score 0.80–0.90 → similar but risky, call GPT-4o to be safe\n" +
      "  score < 0.80 → different question, definitely call GPT-4o\n\n" +
      "If there's a match (score > 0.90):\n" +
      "  → Return the cached answer instantly. Skip the expensive GPT-4o call entirely.\n\n" +
      "If no match:\n" +
      "  → Continue to the next step and ask GPT-4o.\n\n" +
      "Why is this so valuable?\n" +
      "The embedding call costs ~R0.01. The GPT-4o call costs ~R0.50 and takes 2 seconds. " +
      "Every cache hit saves 50x the cost and 2 seconds of latency.",
  },
  {
    key: "llm-ecs-infer",
    label: "ECS — LLM Inference",
    when: isLLM,
    phase: "ecs-infer",
    processingText: "GPT-4o reasoning…",
    nextButtonColor: "#3b82f6",
    flow: () => [
      { from: "ecs-infer", to: "ext-openai", duration: 800, color: "#3b82f6" },
    ],
    finalHotZones: ["ecs-infer", "ext-openai"],
    recalcMetrics: true,
    explain: () =>
      "No cached answer — the agent asks OpenAI GPT-4o.\n\n" +
      "But it doesn't just send the question. The LangGraph agent can think in steps:\n" +
      "1. Look up the customer's policy details in the database.\n" +
      "2. Feed those details + the question to GPT-4o.\n" +
      "3. If the answer seems uncertain, do another lookup and ask again.\n\n" +
      "The response is NOT plain text. We tell GPT-4o to return structured JSON:\n" +
      '  { "answer": "Based on your Comprehensive policy…",\n' +
      '    "citations": [{ "source": "policy-doc-v3", "section": "7.2" }],\n' +
      '    "confidence": 0.92,\n' +
      '    "followUp": "Would you like to start a claim?" }\n\n' +
      "Why structured instead of plain text?\n" +
      "• answer — displayed as rich text (bold, lists, links) in the chat bubble.\n" +
      "• citations — rendered as clickable links to the actual policy PDF section.\n" +
      "• confidence — if low, the question is escalated to a human agent.\n" +
      "• followUp — shown as a button below the message (e.g. 'Start a claim').\n\n" +
      "Plain text would just be a wall of words. Structured output lets the UI be smart.",
  },
  {
    key: "llm-ecs-persist-db",
    label: "ECS — Persist to Aurora",
    when: isLLM,
    phase: "ecs-persist-db",
    processingText: "Writing to database…",
    nextButtonColor: "#eab308",
    flow: () => [
      {
        from: "ecs-persist",
        to: "ext-aurora",
        duration: 500,
        color: "#eab308",
      },
    ],
    finalHotZones: ["ecs-persist", "ext-aurora"],
    recalcMetrics: true,
    explain: () =>
      "The agent saves the conversation to the database (Aurora PostgreSQL).\n\n" +
      "Two tables store the chat history:\n" +
      "• conversations — one row per chat thread (who, when, which policy).\n" +
      "• messages — one row per message. Stores the full structured response as JSON, not just plain text.\n\n" +
      "How long do we keep it?\n" +
      "Insurance law (FAIS Act) requires keeping customer interaction records for at least 5 years. " +
      "After 12 months of inactivity, old chats are archived to cheap storage (S3) to keep the database fast.\n\n" +
      "Why Aurora PostgreSQL? It's the same database the rest of the platform uses (policies, claims, customers). " +
      "No extra infrastructure to maintain.",
  },
  {
    key: "llm-ecs-persist-cache",
    label: "ECS — Cache Response",
    when: isLLM,
    phase: "ecs-persist-cache",
    processingText: "Caching response…",
    nextButtonColor: "#f59e0b",
    flow: () => [
      { from: "ecs-persist", to: "ext-redis", duration: 500, color: "#f59e0b" },
    ],
    finalHotZones: ["ecs-persist", "ext-redis"],
    recalcMetrics: true,
    explain: () =>
      "The answer is also saved to Redis — but not just the text. We store three things together:\n\n" +
      "1. The embedding vector (the list of numbers from the Bedrock step)\n" +
      "2. The answer text (the structured JSON from GPT-4o)\n" +
      "3. A TTL (time-to-live) of 24 hours — after that, the cache entry expires\n\n" +
      "This is what makes the cache check work in a previous step. " +
      "When a new question comes in, we generate its vector and compare it against all stored vectors. " +
      "If there's a close match, we return the stored answer without calling GPT-4o.\n\n" +
      "Redis also tracks the customer's active session:\n" +
      "  userId → { connectionId, conversationId }    expires after 2 hours\n\n" +
      "This 2-hour timer is the session window. If the customer goes idle for 2 hours, " +
      "the session expires and the WebSocket closes. Next visit starts fresh.\n\n" +
      "Within the 2 hours, any AI worker can look up their session " +
      "to find their connectionId — so scaling to more workers doesn't break the conversation.",
  },
  {
    key: "llm-ecs-trace",
    label: "ECS — Record Trace",
    when: isLLM,
    phase: "ecs-trace",
    processingText: "Recording trace…",
    nextButtonColor: "#22c55e",
    flow: () => [
      {
        from: "ecs-trace",
        to: "ext-langfuse",
        duration: 500,
        color: "#22c55e",
      },
    ],
    finalHotZones: ["ecs-trace", "ext-langfuse"],
    recalcMetrics: true,
    explain: () =>
      "The agent logs everything it did to Langfuse — an LLM monitoring tool.\n\n" +
      "What gets logged: the question, the AI's answer, how many tokens it used, how long it took, and the cost.\n\n" +
      "Why does this matter?\n" +
      "If the bot tells a customer 'You're covered for hail' but the policy doesn't actually cover it, " +
      "The insurer is legally liable. Langfuse lets the team review every AI answer, " +
      "catch mistakes (hallucinations), and track costs over time.\n\n" +
      "It's self-hosted inside our network, so sensitive customer data never leaves our infrastructure.",
  },
  {
    key: "llm-ecs-reply",
    label: "ECS — Stream Reply",
    when: isLLM,
    phase: "ecs-reply",
    processingText: "Sending reply…",
    nextButtonColor: "#a78bfa",
    flow: () => [
      { from: "ecs-reply", to: "wsapi", duration: 500, color: "#a78bfa" },
    ],
    finalHotZones: ["ecs-reply", "wsapi"],
    recalcMetrics: true,
    explain: () =>
      "The agent sends the answer back to API Gateway, addressed to the customer's connectionId.\n\n" +
      "It sends it in small pieces (chunks), not all at once:\n" +
      '  { type: "chunk", content: "Based on your" }\n' +
      '  { type: "chunk", content: " Comprehensive policy," }\n' +
      "  …\n" +
      '  { type: "done", citations: […], confidence: 0.92 }\n\n' +
      "The chunks stream the answer word by word. The final 'done' message carries the citations and confidence score.\n\n" +
      "Key for scaling: it doesn't matter which worker processed this message. " +
      "Any worker can send to any connectionId. No worker needs to remember any customer — " +
      "the connectionId is the only link.",
  },
  {
    key: "llm-stream",
    label: "Stream to Browser",
    when: isLLM,
    phase: "stream",
    processingText: "Streaming…",
    nextButtonColor: "#a78bfa",
    flow: () => [
      { from: "wsapi", to: "client", duration: 500, color: "#a78bfa" },
    ],
    finalHotZones: ["wsapi", "client"],
    recalcMetrics: true,
    explain: () =>
      "API Gateway forwards each chunk to the customer's browser over the WebSocket.\n\n" +
      "What the customer sees in the chat widget:\n" +
      "• Words appear one-by-one, like someone typing — 'Based on your Comprehensive policy, hail damage is covered…'\n" +
      "• When the answer finishes, clickable links appear (e.g. 'Section 7.2' → opens the actual policy PDF).\n" +
      "• A confidence badge (green/yellow/red) and a follow-up button ('Start a claim') appear below.\n\n" +
      "This is why we use structured output from GPT-4o — the app knows what's an answer, what's a citation, " +
      "and what's a follow-up action, so it can render each part as a proper UI element, not just a wall of text.\n\n" +
      "Why stream word-by-word? A 3-second wait with a spinner feels slow. " +
      "Words appearing as they're generated feels instant.",
  },

  /* ═══ AI System — Scalable LLM Alt (15 steps) ════════ */
  {
    key: "alt-query",
    label: "GraphQL Query",
    when: isAlt,
    phase: "alt-query",
    processingText: "Sending query…",
    nextButtonColor: "#38bdf8",
    flow: () => [{ from: "client", to: "graphql", duration: 500 }],
    finalHotZones: ["client", "graphql"],
    recalcMetrics: true,
    explain: () =>
      "The user asks a question through the React/Next.js frontend.\n\n" +
      "The app uses @apollo/client to send a GraphQL mutation:\n" +
      '  mutation { askLLM(question: "Am I covered for hail damage?") { answer, citations, confidence } }\n\n' +
      "Why GraphQL instead of REST?\n" +
      "GraphQL lets the client declare exactly which fields it needs. The response is shaped to the UI — " +
      "no over-fetching, no under-fetching. Persisted queries (stored server-side) reduce payload sizes further, " +
      "which matters when LLM responses can be large.\n\n" +
      "The single GraphQL gateway aggregates all downstream services. The client doesn't need to know about " +
      "EventBridge, Step Functions, or the model router — it just sends one query and gets one response.",
  },
  {
    key: "alt-gql-publish",
    label: "Publish Event",
    when: isAlt,
    phase: "alt-gql-publish",
    processingText: "Publishing event…",
    nextButtonColor: "#a855f7",
    flow: () => [
      { from: "graphql", to: "eb-bus", duration: 500, color: "#a855f7" },
    ],
    finalHotZones: ["graphql", "eb-bus"],
    recalcMetrics: true,
    explain: () =>
      "The GraphQL gateway (Node.js/TypeScript on ECS) validates the query and publishes an event.\n\n" +
      "The resolver does three things:\n" +
      "1. Validates the input (depth limiting, complexity analysis to guard against DoS).\n" +
      "2. Checks authorization in the business logic layer — not in the resolver itself.\n" +
      "3. Calls PutEvents to place the normalized question + user context on the EventBridge bus.\n\n" +
      "Why emit an event instead of calling Step Functions directly?\n" +
      "Loose coupling. The gateway doesn't know which downstream service handles the query. " +
      "EventBridge routes it. If you add a second pipeline tomorrow (e.g., document ingestion), " +
      "you add a second rule — no code changes to the gateway.",
  },
  {
    key: "alt-eb-rules",
    label: "Rule Engine Match",
    when: isAlt,
    phase: "alt-eb-rules",
    processingText: "Matching rules…",
    nextButtonColor: "#8b5cf6",
    flow: () => [
      { from: "eb-bus", to: "eb-rules", duration: 400, color: "#8b5cf6" },
    ],
    finalHotZones: ["eb-bus", "eb-rules"],
    recalcMetrics: true,
    explain: () =>
      "The Event Bus delivers the event to the Rule Engine for pattern matching.\n\n" +
      "The rule: { source: 'llm-gateway', detail-type: 'llm.query' }\n\n" +
      "EventBridge rules are content-based filters — they inspect the event body and route by pattern. " +
      "One event can match multiple rules, enabling fan-out to N targets without any publisher changes.\n\n" +
      "This is NOT a queue. Events flow through immediately — there's no polling, no consumers, no retention. " +
      "EventBridge is a routing layer, not a storage layer.",
  },
  {
    key: "alt-eb-target",
    label: "Route to Target",
    when: isAlt,
    phase: "alt-eb-target",
    processingText: "Routing to SFN…",
    nextButtonColor: "#7c3aed",
    flow: () => [
      { from: "eb-rules", to: "eb-target", duration: 400, color: "#7c3aed" },
    ],
    finalHotZones: ["eb-rules", "eb-target"],
    recalcMetrics: true,
    explain: () =>
      "The matched rule routes the event to its target: Step Functions.\n\n" +
      "The target configuration specifies:\n" +
      "• Target ARN: the Express workflow state machine\n" +
      "• Input transform: event.detail → workflow input (strips EventBridge envelope)\n" +
      "• Retry policy + DLQ: failed deliveries go to an SQS dead-letter queue\n\n" +
      "EventBridge also provides an audit trail, replay capability, and archive — " +
      "useful for debugging production issues or replaying events through updated pipelines.",
  },
  {
    key: "alt-sfn-start",
    label: "Enter Express Workflow",
    when: isAlt,
    phase: "alt-sfn-start",
    processingText: "Starting workflow…",
    nextButtonColor: "#a78bfa",
    flow: () => [
      { from: "eb-target", to: "sfn-cache", duration: 500, color: "#a78bfa" },
    ],
    finalHotZones: ["eb-target", "sfn-cache"],
    recalcMetrics: true,
    explain: () =>
      "EventBridge calls StartExecution on the Express workflow.\n\n" +
      "Step Functions takes over — it orchestrates the entire LLM pipeline as a state machine.\n\n" +
      "Why Step Functions instead of a single Lambda or ECS task?\n" +
      "Each step is independently retryable with exponential backoff. " +
      "The execution history is a detailed audit trail.\n\n" +
      "This is an Express workflow (high-volume, short-lived) — ideal for chat messages. " +
      "Standard workflows would be used for longer jobs like document ingestion.\n\n" +
      "The Claim-Check pattern: large payloads go to S3, and S3 URIs are passed between states. " +
      "This avoids the 256 KB payload limit and keeps the pipeline stable as data grows.",
  },
  {
    key: "alt-exact-cache",
    label: "Exact-Match Cache",
    when: isAlt,
    phase: "alt-exact-cache",
    processingText: "Checking exact cache…",
    nextButtonColor: "#f59e0b",
    flow: () => [
      { from: "sfn-cache", to: "ext-redis", duration: 500, color: "#f59e0b" },
    ],
    finalHotZones: ["sfn-cache", "ext-redis"],
    recalcMetrics: true,
    explain: () =>
      "First cache layer: exact-match lookup in Redis.\n\n" +
      "The normalized prompt is hashed and used as a key. If someone asked this exact question before, " +
      "the cached answer is returned immediately — no embedding computation, no LLM call.\n\n" +
      "This is the cheapest possible cache hit: O(1) lookup, sub-millisecond, near-zero cost.\n\n" +
      "When does this help most?\n" +
      "FAQ-style questions: 'What's the claims process?', 'How do I update my address?', 'What does comprehensive cover?' " +
      "These are asked hundreds of times with identical wording.\n\n" +
      "If the exact-match misses, we proceed to the semantic cache (next step).",
  },
  {
    key: "alt-embed",
    label: "Generate Embedding",
    when: isAlt,
    phase: "alt-embed",
    processingText: "Converting to vector…",
    nextButtonColor: "#38bdf8",
    flow: () => [
      { from: "sfn-embed", to: "ext-embed", duration: 600, color: "#38bdf8" },
    ],
    finalHotZones: ["sfn-embed", "ext-embed"],
    recalcMetrics: true,
    explain: () =>
      "The prompt is sent to a SentenceTransformer model to generate a vector embedding.\n\n" +
      "This converts the question into a high-dimensional vector — a list of numbers that captures its meaning:\n" +
      "  'Am I covered for hail?'  → [0.12, -0.98, 0.44, …]\n" +
      "  'Does my policy cover hail?' → [0.13, -0.97, 0.43, …]  ← very close!\n\n" +
      "Why SentenceTransformer?\n" +
      "It runs on our own infrastructure — data never leaves the network. " +
      "The overhead is 5–20 ms, negligible compared to LLM inference time.\n\n" +
      "This embedding serves two purposes:\n" +
      "1. Semantic cache lookup (next step) — find similar previously-answered questions.\n" +
      "2. RAG retrieval — find relevant policy documents to include as context for the LLM.",
  },
  {
    key: "alt-semantic-cache",
    label: "Semantic Cache Search",
    when: isAlt,
    phase: "alt-semantic-cache",
    processingText: "Searching vectors…",
    nextButtonColor: "#eab308",
    flow: () => [
      {
        from: "sfn-semantic",
        to: "ext-pgvector",
        duration: 500,
        color: "#eab308",
      },
    ],
    finalHotZones: ["sfn-semantic", "ext-pgvector"],
    recalcMetrics: true,
    explain: () =>
      "Second cache layer: semantic similarity search in Aurora pgvector.\n\n" +
      "The embedding is compared against all stored question embeddings using cosine similarity:\n" +
      "  score > 0.90 → match found, return cached answer (skip LLM entirely)\n" +
      "  score < 0.90 → cache miss, proceed to LLM\n\n" +
      "Why pgvector on Aurora instead of a dedicated vector DB?\n" +
      "Aurora already runs our PostgreSQL database. pgvector adds vector search as an extension — " +
      "same ACID guarantees, same multi-AZ replication, no extra infrastructure.\n\n" +
      "The multi-layer approach (exact + semantic) can reduce API calls by 60–85% " +
      "and cut latency by ~97% for cached queries.\n\n" +
      "If the semantic cache misses, the vector search also returns the top-k relevant policy documents " +
      "for RAG context — so the work isn't wasted.",
  },
  {
    key: "alt-model-route",
    label: "Model Routing",
    when: isAlt,
    phase: "alt-model-route",
    processingText: "Classifying complexity…",
    nextButtonColor: "#a78bfa",
    flow: () => [
      {
        from: "sfn-semantic",
        to: "sfn-route",
        duration: 500,
        color: "#a78bfa",
      },
    ],
    finalHotZones: ["sfn-route"],
    recalcMetrics: true,
    explain: () =>
      "Intelligent model routing: a classifier examines query complexity and selects the cheapest model that can handle it.\n\n" +
      "Model family (2026 pricing per 1M tokens):\n\n" +
      "  GPT-5.4 flagship  — $2.50 in / $15.00 out — complex agents, deep reasoning\n" +
      "  GPT-5             — $1.25 in / $10.00 out — coding, reasoning-heavy apps\n" +
      "  GPT-4.1           — $2.00 in / $8.00 out  — chat, APIs, high-throughput\n" +
      "  GPT-5.4 mini      — $0.75 in / $4.50 out  — production apps, coding\n" +
      "  GPT-4.1 mini      — $0.40 in / $1.60 out  — cheap general workloads\n" +
      "  GPT-5.4 nano      — $0.20 in / $1.25 out  — bulk/simple tasks\n" +
      "  GPT-4.1 nano      — $0.10 in / $0.40 out  — massive scale, low cost\n\n" +
      "Simple FAQ → GPT-4.1 nano ($0.10/M). Policy analysis → GPT-4.1 ($2.00/M). " +
      "Complex multi-step reasoning → GPT-5.4 ($2.50/M).\n\n" +
      "Per-user and per-application budget controls prevent cost explosions.",
  },
  {
    key: "alt-inference",
    label: "LLM Inference",
    when: isAlt,
    phase: "alt-inference",
    processingText: "GPT reasoning…",
    nextButtonColor: "#3b82f6",
    flow: () => [
      {
        from: "sfn-inference",
        to: "ext-openai",
        duration: 800,
        color: "#3b82f6",
      },
    ],
    finalHotZones: ["sfn-inference", "ext-openai"],
    recalcMetrics: true,
    explain: () =>
      "The selected model receives the query with RAG context (retrieved documents from pgvector).\n\n" +
      "The prompt includes:\n" +
      "• The user's question\n" +
      "• Top-k relevant policy documents (from the vector search)\n" +
      "• Session metadata (conversation history, user profile)\n\n" +
      "The response is structured JSON — not plain text:\n" +
      '  { "answer": "Based on your Comprehensive policy…",\n' +
      '    "citations": [{ "source": "policy-v3", "section": "7.2" }],\n' +
      '    "confidence": 0.92 }\n\n' +
      "Why structured output? The UI renders each part differently — " +
      "answer as rich text, citations as clickable links, confidence as a badge.\n\n" +
      "Batching: for offline jobs, static batching improves GPU utilization. " +
      "For real-time chat, micro-batching balances latency and throughput.",
  },
  {
    key: "alt-persist",
    label: "Persist & Cache",
    when: isAlt,
    phase: "alt-persist",
    processingText: "Storing results…",
    nextButtonColor: "#eab308",
    flow: () => [
      {
        from: "sfn-persist",
        to: "ext-pgvector",
        duration: 400,
        color: "#eab308",
      },
      { from: "sfn-persist", to: "ext-redis", duration: 400, color: "#f59e0b" },
    ],
    finalHotZones: ["sfn-persist", "ext-pgvector", "ext-redis"],
    recalcMetrics: true,
    explain: () =>
      "The response is persisted in two places simultaneously:\n\n" +
      "1. Aurora pgvector — the question embedding + answer are stored for future semantic cache hits. " +
      "ACID guarantees ensure consistency. Multi-AZ replication provides high availability.\n\n" +
      "2. Redis exact-match cache — the normalized prompt → answer is stored with a TTL. " +
      "Next time someone asks the exact same question, it's a sub-millisecond hit.\n\n" +
      "The conversation history also persists in Aurora (conversations + messages tables). " +
      "Insurance compliance requires keeping interaction records for 5+ years.\n\n" +
      "After 12 months of inactivity, old records are archived to S3 — cheap storage, same durability.",
  },
  {
    key: "alt-observe",
    label: "Observability Trace",
    when: isAlt,
    phase: "alt-observe",
    processingText: "Recording trace…",
    nextButtonColor: "#22c55e",
    flow: () => [
      {
        from: "sfn-trace",
        to: "ext-cloudwatch",
        duration: 500,
        color: "#22c55e",
      },
    ],
    finalHotZones: ["sfn-trace", "ext-cloudwatch"],
    recalcMetrics: true,
    explain: () =>
      "CloudWatch and X-Ray capture end-to-end observability.\n\n" +
      "What's tracked:\n" +
      "• Token usage, latency breakdown, and cost attribution per request.\n" +
      "• Distributed tracing across every hop: GraphQL → EventBridge → Step Functions → LLM → cache.\n" +
      "• Which model was selected and why (router decision log).\n\n" +
      "Why not Langfuse? CloudWatch + X-Ray are native AWS services — no extra infrastructure, " +
      "same IAM policies, same VPC. X-Ray traces map directly to Step Functions execution history.\n\n" +
      "Alerts fire when error rates or costs exceed thresholds. " +
      "Fallback logic: if the primary model fails, fall back to cached responses or simpler models.",
  },
  {
    key: "alt-respond",
    label: "GraphQL Response",
    when: isAlt,
    phase: "alt-respond",
    processingText: "Returning response…",
    nextButtonColor: "#38bdf8",
    flow: () => [
      { from: "graphql", to: "client", duration: 500, color: "#38bdf8" },
    ],
    finalHotZones: ["graphql", "client"],
    recalcMetrics: true,
    explain: () =>
      "The structured response flows back through the GraphQL gateway to the client.\n\n" +
      "Apollo Client caches the response locally — if the user navigates away and comes back, " +
      "the answer is already there. Persisted queries keep the payload minimal.\n\n" +
      "What the user sees:\n" +
      "• The answer rendered as rich text with citations as clickable links.\n" +
      "• A confidence badge (green/yellow/red).\n" +
      "• Follow-up action buttons (e.g., 'Start a claim').\n\n" +
      "For streaming, the GraphQL subscription or @defer directive can deliver tokens incrementally — " +
      "words appear as they're generated, just like in a chat interface.",
  },

  /* ═══ AI System — shared summary ═════════════════════ */
  {
    key: "ai-summary",
    label: "Summary",
    when: isAI,
    phase: "summary",
    explain: (s) => {
      const a = getAdapter(s.variant);
      if (s.variant === "ai-llm-platform")
        return (
          `${a.profile.label} pipeline complete.\n\n` +
          "The full path a message takes:\n" +
          "Browser → WebSocket → API Gateway → Lambda → SQS [SendMessage → Queue Storage → Long Poll] → ECS Fargate [Consumer → Embedding (Bedrock) → Cache Lookup (Redis) → LLM Inference (GPT-4o) → Persist (Aurora + Redis) → Trace (Langfuse) → Stream Response] → WebSocket → Browser\n\n" +
          "Key decisions recap:\n" +
          "• WebSocket — two-way connection, server pushes words as they're generated\n" +
          "• connectionId in Redis — any worker can reply to any customer, no sticky sessions\n" +
          "• SQS (expanded) — SendMessage → Queue Storage → Long Poll. Buffers against OpenAI's rate limit\n" +
          "• ECS Fargate (expanded) — 7-stage LangGraph agent pipeline, horizontally scalable\n" +
          "• Structured JSON output — answer, citations, confidence, follow-up actions (not plain text)\n" +
          "• Redis — caches answers to save 30–40% on AI costs, stores session (2-hour window)\n" +
          "• Aurora PostgreSQL — permanent chat history, kept 5+ years for insurance compliance\n" +
          "• Langfuse — logs every AI answer for auditing"
        );
      if (s.variant === "ai-llm-platform-alt")
        return (
          `${a.profile.label} pipeline complete.\n\n` +
          "The full path a query takes:\n" +
          "Next.js (Apollo) → GraphQL Gateway (ECS) → EventBridge [Bus → Rules → Target] → Step Functions Express [Check Cache → Generate Embedding → Semantic Search → Route Model → LLM Inference → Persist → Trace] → CloudWatch + X-Ray → GraphQL → Browser\n\n" +
          "Key decisions recap:\n" +
          "• GraphQL gateway — single schema, declarative data fetching, persisted queries\n" +
          "• EventBridge — loose coupling, audit trail, replay capability\n" +
          "• Step Functions (Express) — each step retryable, observable, Claim-Check pattern for large payloads\n" +
          "• Multi-layer cache — exact-match (Redis) + semantic (pgvector) → 60–85% fewer API calls, ~97% lower latency on hits\n" +
          "• Intelligent model routing — GPT-5.4 ($2.50/M) for complex, GPT-4.1 nano ($0.10/M) for simple → 10–25x cost difference\n" +
          "• Aurora pgvector — vector DB + relational DB in one, ACID guarantees, multi-AZ replication\n" +
          "• CloudWatch + X-Ray — native AWS observability, token/cost attribution per request"
        );
      return `${a.profile.label} pipeline complete.\n\nEvery component is deployed via AWS CDK, runs inside a VPC, and logs to CloudWatch. The Step Functions state machine makes the pipeline observable, retryable, and auditable.\n\nTry another variant to compare approaches.`;
    },
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: InsuranceDesignState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
