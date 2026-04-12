import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "ai-pipeline"
  | "bedrock"
  | "sagemaker"
  | "step-functions"
  | "claims-automation"
  | "risk-scoring"
  | "fraud-detection"
  | "llm-platform"
  | "langchain"
  | "langfuse"
  | "openai-models"
  | "connection-id"
  | "sqs-backpressure";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "ai-pipeline": {
    title: "AI/ML Pipeline",
    subtitle: "End-to-end data → model → decision flow",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What it is",
        accent: "#60a5fa",
        content: (
          <p>
            An AI pipeline is a series of connected services that ingest raw
            data, transform it into features, pass it through a model, and act
            on the prediction. In insurance, that prediction might be a risk
            score, a fraud flag, or an automated claim decision.
          </p>
        ),
      },
      {
        title: "Why Step Functions",
        accent: "#f87171",
        content: (
          <p>
            Step Functions turns the pipeline into a state machine. Each step is
            retryable, has built-in error handling, and logs every transition to
            CloudWatch. You can inspect exactly where a claim stalled — no
            custom retry logic needed.
          </p>
        ),
      },
      {
        title: "On Your CV",
        accent: "#fbbf24",
        content: (
          <p>
            "Designed and implemented AI/ML pipelines on AWS using Step
            Functions, Lambda, and SageMaker/Bedrock — automating insurance
            decisions with full observability and retry semantics."
          </p>
        ),
      },
    ],
  },

  bedrock: {
    title: "AWS Bedrock",
    subtitle: "Managed foundation models (LLMs)",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What it does",
        accent: "#3b82f6",
        content: (
          <p>
            Bedrock gives you access to foundation models (Claude, Titan, Llama)
            via a simple API — no infrastructure to manage. You send a prompt
            with documents/images and get structured output back.
          </p>
        ),
      },
      {
        title: "Insurance use case",
        accent: "#22c55e",
        content: (
          <p>
            For claims automation, Bedrock analyses uploaded photos and PDFs.
            The LLM extracts damage descriptions, checks policy coverage, and
            suggests a payout range — replacing hours of manual review.
          </p>
        ),
      },
    ],
  },

  sagemaker: {
    title: "AWS SageMaker",
    subtitle: "Custom ML model training and hosting",
    accentColor: "#22c55e",
    sections: [
      {
        title: "What it does",
        accent: "#22c55e",
        content: (
          <p>
            SageMaker lets you train, tune, and deploy custom ML models. You
            define a training job, point it at S3 data, and deploy the model to
            a real-time endpoint that Lambda or Step Functions can invoke.
          </p>
        ),
      },
      {
        title: "Insurance use cases",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              <strong>Risk scoring:</strong> a gradient-boosted model predicts
              how risky a new policyholder is, directly influencing premiums.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              <strong>Fraud detection:</strong> an anomaly-detection model flags
              claims that deviate from historical patterns — unusual amounts,
              repeat addresses, rapid successive claims.
            </p>
          </>
        ),
      },
    ],
  },

  "step-functions": {
    title: "AWS Step Functions",
    subtitle: "Visual workflow orchestration",
    accentColor: "#f87171",
    sections: [
      {
        title: "What it does",
        accent: "#f87171",
        content: (
          <p>
            Step Functions coordinates multiple Lambda functions, API calls, and
            AI services into a reliable, observable workflow. Each state
            transition is logged, and you can visualise the execution in the AWS
            console.
          </p>
        ),
      },
      {
        title: "Why not just chain Lambdas?",
        accent: "#fbbf24",
        content: (
          <p>
            Direct Lambda-to-Lambda calls create hidden dependencies, lose
            execution context on failure, and make debugging painful. Step
            Functions gives you retries, timeouts, parallel branches, and a
            complete audit trail — out of the box.
          </p>
        ),
      },
    ],
  },

  "claims-automation": {
    title: "Claims Automation",
    subtitle: "AI-driven claim processing",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "The problem",
        accent: "#f87171",
        content: (
          <p>
            Manual claims review is slow, inconsistent, and expensive. Human
            assessors make different decisions on the same claim. Customers wait
            days for a response.
          </p>
        ),
      },
      {
        title: "The AI solution",
        accent: "#3b82f6",
        content: (
          <p>
            Bedrock analyses submitted documents and photos. The LLM extracts
            structured data — damage type, severity, coverage match — and
            produces a recommended payout. Step Functions orchestrates the
            entire flow: intake → analysis → decision → notification.
          </p>
        ),
      },
      {
        title: "On Your CV",
        accent: "#fbbf24",
        content: (
          <p>
            "Built an automated claims pipeline using AWS Bedrock, Step
            Functions, and Lambda — reducing average claim resolution time from
            3 days to under 30 seconds for straightforward claims."
          </p>
        ),
      },
    ],
  },

  "risk-scoring": {
    title: "Risk Scoring",
    subtitle: "ML-powered underwriting",
    accentColor: "#22c55e",
    sections: [
      {
        title: "The problem",
        accent: "#f87171",
        content: (
          <p>
            Traditional underwriting uses rigid rule tables. They miss subtle
            correlations in data and can't adapt quickly to new risk patterns.
          </p>
        ),
      },
      {
        title: "The ML solution",
        accent: "#22c55e",
        content: (
          <p>
            A SageMaker-hosted gradient-boosted model scores each applicant in
            real time. Features include demographics, vehicle type, claims
            history, and geographic risk factors. The score feeds directly into
            the pricing engine.
          </p>
        ),
      },
    ],
  },

  "fraud-detection": {
    title: "Fraud Detection",
    subtitle: "Anomaly detection on claims",
    accentColor: "#ef4444",
    sections: [
      {
        title: "The problem",
        accent: "#f87171",
        content: (
          <p>
            Insurance fraud costs the industry billions annually. Manual review
            catches only a fraction of suspicious claims, and rule-based systems
            produce too many false positives.
          </p>
        ),
      },
      {
        title: "The ML solution",
        accent: "#ef4444",
        content: (
          <p>
            A SageMaker anomaly-detection model runs on every incoming claim. It
            compares against historical patterns and flags outliers — unusually
            high amounts, repeat claimant addresses, or rapid successive claims.
            Flagged claims are routed to a human investigator via SNS alerts.
          </p>
        ),
      },
    ],
  },

  "llm-platform": {
    title: "LLM Platform",
    subtitle: "Scalable OpenAI-powered AI assistant",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What it is",
        accent: "#a78bfa",
        content: (
          <p>
            A production LLM platform that wraps OpenAI's API behind a
            rate-limited, cached, and observable layer. SQS absorbs traffic
            spikes so you never hit the OpenAI rate limit. Redis semantic
            caching avoids re-asking questions the model has already answered.
            Langfuse traces every call for cost and quality monitoring.
          </p>
        ),
      },
      {
        title: "Business fit",
        accent: "#22c55e",
        content: (
          <>
            <p>
              <strong>Customer-facing:</strong> an AI chat widget embedded in
              the Next.js app. Customers ask about policy coverage, get instant
              quote guidance, or check their claim status — 24/7, without
              waiting for a call centre.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              <strong>Internal:</strong> an underwriting copilot that summarises
              policy documents and highlights risk factors for human reviewers.
            </p>
          </>
        ),
      },
      {
        title: "On Your CV",
        accent: "#fbbf24",
        content: (
          <p>
            "Designed a scalable LLM platform on AWS using LangGraph on ECS
            Fargate, SQS for rate-limit buffering, ElastiCache for semantic
            caching, and Langfuse for observability — serving customer-facing AI
            with zero rate-limit breaches."
          </p>
        ),
      },
    ],
  },

  langchain: {
    title: "LangChain / LangGraph",
    subtitle: "LLM application frameworks",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "LangChain",
        accent: "#60a5fa",
        content: (
          <p>
            LangChain provides building blocks for LLM apps — prompt templates,
            output parsers, retrieval chains, tool calling. It wraps OpenAI (and
            other providers) in a consistent interface so you can swap models
            without rewriting your app.
          </p>
        ),
      },
      {
        title: "LangGraph",
        accent: "#a78bfa",
        content: (
          <p>
            LangGraph adds stateful, multi-step agent workflows on top of
            LangChain. You define a graph of nodes (each an LLM call or tool)
            and edges (routing logic). The agent can loop, branch, and
            self-correct — unlike a simple chain which is strictly linear.
          </p>
        ),
      },
      {
        title: "Why ECS Fargate?",
        accent: "#f87171",
        content: (
          <p>
            LangGraph agents are long-running and memory-hungry — they hold
            conversation state, manage tool calls, and may perform multiple LLM
            round-trips. Lambda's 15-minute timeout and limited memory make it a
            poor fit. ECS Fargate gives you persistent containers with tunable
            CPU/memory, auto-scaling, and no cold starts.
          </p>
        ),
      },
    ],
  },

  langfuse: {
    title: "Langfuse",
    subtitle: "LLM observability and analytics",
    accentColor: "#22c55e",
    sections: [
      {
        title: "What it does",
        accent: "#22c55e",
        content: (
          <p>
            Langfuse is an open-source LLM observability platform. It traces
            every LLM call — recording the prompt, response, token count,
            latency, and cost. You can inspect individual traces, compare model
            versions, and catch regressions before users do.
          </p>
        ),
      },
      {
        title: "Why you need it",
        accent: "#f87171",
        content: (
          <p>
            Without observability, LLM apps are black boxes. You can't tell why
            a response was slow, expensive, or wrong. Langfuse gives you
            dashboards for cost per conversation, p95 latency, and user-reported
            quality scores — essential for insurance where accuracy is
            non-negotiable.
          </p>
        ),
      },
    ],
  },

  "openai-models": {
    title: "OpenAI Model Cheat Sheet",
    subtitle: "Cost, speed, and capability comparison (April 2026)",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "How to read this",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              Every OpenAI model trades off three things: <strong>cost</strong>,{" "}
              <strong>speed</strong>, and <strong>capability</strong>. Expensive
              models think harder but slower. Cheap models are fast but less
              capable.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              <strong>Input tokens</strong> = what you send (the question +
              context). <strong>Output tokens</strong> = what the model
              generates (the answer). Output is always more expensive because
              generation is harder than reading.
            </p>
          </>
        ),
      },
      {
        title: "Model Comparison",
        accent: "#a78bfa",
        content: (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.78rem",
                lineHeight: 1.5,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "2px solid rgba(148,163,184,0.3)",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "6px 8px" }}>Model</th>
                  <th style={{ padding: "6px 8px" }}>Input $/1M</th>
                  <th style={{ padding: "6px 8px" }}>Output $/1M</th>
                  <th style={{ padding: "6px 8px" }}>Context</th>
                  <th style={{ padding: "6px 8px" }}>Speed</th>
                  <th style={{ padding: "6px 8px" }}>RPM</th>
                  <th style={{ padding: "6px 8px" }}>TPM</th>
                  <th style={{ padding: "6px 8px" }}>Best for</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "GPT-5.4",
                    "$2.50",
                    "$15.00",
                    "~1M",
                    "🐢",
                    "500",
                    "500K",
                    "Complex agents, deep reasoning",
                  ],
                  [
                    "GPT-5",
                    "$1.25",
                    "$10.00",
                    "~400K",
                    "🐢",
                    "500",
                    "500K",
                    "Coding, reasoning-heavy",
                  ],
                  [
                    "GPT-4.1",
                    "$2.00",
                    "$8.00",
                    "~1M",
                    "⚡",
                    "500",
                    "30K",
                    "Chat, APIs, high-throughput",
                  ],
                  [
                    "GPT-5.4 mini",
                    "$0.75",
                    "$4.50",
                    "100K+",
                    "⚡⚡",
                    "500",
                    "500K",
                    "Production apps, coding",
                  ],
                  [
                    "GPT-4.1 mini",
                    "$0.40",
                    "$1.60",
                    "~1M",
                    "⚡⚡",
                    "500",
                    "200K",
                    "Cheap general workloads",
                  ],
                  [
                    "GPT-5.4 nano",
                    "$0.20",
                    "$1.25",
                    "Med",
                    "⚡⚡⚡",
                    "500",
                    "200K",
                    "Bulk/simple tasks",
                  ],
                  [
                    "GPT-4.1 nano",
                    "$0.10",
                    "$0.40",
                    "~1M",
                    "⚡⚡⚡",
                    "500",
                    "200K",
                    "Massive scale, lowest cost",
                  ],
                ].map(([model, inp, out, ctx, spd, rpm, tpm, use], i) => (
                  <tr
                    key={model}
                    style={{
                      borderBottom: "1px solid rgba(148,163,184,0.15)",
                      background:
                        i === 2 ? "rgba(167,139,250,0.12)" : "transparent",
                    }}
                  >
                    <td
                      style={{
                        padding: "6px 8px",
                        fontWeight: i === 2 ? 700 : 400,
                        color: i === 2 ? "#c4b5fd" : "inherit",
                      }}
                    >
                      {model}
                    </td>
                    <td style={{ padding: "6px 8px" }}>{inp}</td>
                    <td style={{ padding: "6px 8px" }}>{out}</td>
                    <td style={{ padding: "6px 8px" }}>{ctx}</td>
                    <td style={{ padding: "6px 8px" }}>{spd}</td>
                    <td style={{ padding: "6px 8px", color: "#fbbf24" }}>
                      {rpm}
                    </td>
                    <td style={{ padding: "6px 8px", color: "#fbbf24" }}>
                      {tpm}
                    </td>
                    <td style={{ padding: "6px 8px", color: "#94a3b8" }}>
                      {use}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      },
      {
        title: "Tier-1 Rate Limits",
        accent: "#fbbf24",
        content: (
          <>
            <p>
              OpenAI enforces two independent rate limits per organisation
              (Tier-1 shown above):
            </p>
            <ul
              style={{
                marginTop: "0.4rem",
                paddingLeft: "1.2rem",
                lineHeight: 1.7,
              }}
            >
              <li>
                <strong>RPM (Requests Per Minute)</strong> — all models share a{" "}
                <strong>500 RPM</strong> cap at Tier-1. Each API call counts as
                one request, regardless of how many tokens it uses.
              </li>
              <li>
                <strong>TPM (Tokens Per Minute)</strong> — varies by model.
                GPT-5.4 and GPT-5 get <strong>500K TPM</strong>, while GPT-4.1
                is capped at <strong>30K TPM</strong>. Nano/mini variants sit at{" "}
                <strong>200K–500K TPM</strong>.
              </li>
            </ul>
            <p style={{ marginTop: "0.5rem" }}>
              <strong>Why the SQS queue matters:</strong> At Tier-1, GPT-4.1's
              30K TPM cap means ~15 concurrent conversations (each using ~2K
              tokens) can saturate the limit. The SQS buffer absorbs traffic
              spikes and lets workers drain messages at a pace the API can
              handle. As you scale to Tier-2+ (higher limits), the queue still
              protects against sudden bursts.
            </p>
          </>
        ),
      },
      {
        title: "Why we chose GPT-4.1 for this plugin",
        accent: "#22c55e",
        content: (
          <>
            <p>
              For a customer-facing insurance chat bot, we need a model that's{" "}
              <strong>fast enough</strong> to stream answers in real-time and{" "}
              <strong>capable enough</strong> to reason about policy documents
              with structured output.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              GPT-4.1 hits the sweet spot: 1M token context window (fits full
              policy documents), fast response times for streaming, and native
              function calling + structured output support. At $2.00/$8.00 per
              1M tokens it's more expensive than mini/nano, but the accuracy and
              citation quality justify it for insurance-grade answers.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              For the embedding step we use <strong>Bedrock Titan</strong> (not
              OpenAI) — it runs inside AWS, costs a fraction of a cent, and the
              data never leaves the network.
            </p>
          </>
        ),
      },
      {
        title: "Cost rule of thumb",
        accent: "#fbbf24",
        content: (
          <>
            <p>
              A typical insurance Q&A turn uses ~1,500 input tokens (system
              prompt + policy context + question) and ~500 output tokens (answer
              + citations).
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              With GPT-4.1: ~$0.003 input + ~$0.004 output ={" "}
              <strong>~R0.12 per question</strong>.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              Semantic caching avoids ~35% of those calls → effective cost drops
              to <strong>~R0.08 per question</strong>.
            </p>
          </>
        ),
      },
    ],
  },

  "connection-id": {
    title: "WebSocket connectionId",
    subtitle: "How API Gateway identifies each open socket",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "What is a connectionId?",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              When a user opens a WebSocket connection,{" "}
              <strong>API Gateway</strong> assigns a unique string called a{" "}
              <code>connectionId</code>. Think of it as:
            </p>
            <p
              style={{
                marginTop: "0.5rem",
                fontStyle: "italic",
                color: "#94a3b8",
              }}
            >
              "The address of this one open socket — so you can send messages
              back to exactly this client."
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              It is <strong>not</strong> a user ID. It is a temporary session
              identifier that exists only while the socket is open. One user can
              have multiple connectionIds (multiple browser tabs), and each
              connectionId disappears when the socket closes.
            </p>
          </>
        ),
      },
      {
        title: "Where does it come from?",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              You never create it yourself — API Gateway generates it
              automatically when a client connects.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              Your Lambda receives it inside <code>event.requestContext</code>:
            </p>
            <pre
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                borderRadius: "8px",
                background: "rgba(15,23,42,0.6)",
                fontSize: "0.78rem",
                lineHeight: 1.6,
                overflowX: "auto",
                color: "#e2e8f0",
              }}
            >
              {`// Inside your Lambda handler
const connectionId = event.requestContext.connectionId;
// e.g. "abc123XYZ"`}
            </pre>
            <p style={{ marginTop: "0.5rem" }}>
              Every message from the same client arrives with the{" "}
              <strong>same</strong> connectionId — so you always know which
              socket sent it.
            </p>
          </>
        ),
      },
      {
        title: "Why does it exist?",
        accent: "#f87171",
        content: (
          <>
            <p>
              WebSockets are <strong>stateful</strong> (the connection stays
              open), but Lambda is <strong>stateless</strong> (each invocation
              is independent). The connectionId bridges the gap — it lets your
              stateless code identify <em>which</em> client is talking.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              Without it, Lambda would have no idea who sent the message or
              where to send the reply.
            </p>
          </>
        ),
      },
      {
        title: "How you use it",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              <strong>1. Map it to a user</strong>
            </p>
            <p style={{ color: "#94a3b8", marginBottom: "0.4rem" }}>
              On <code>$connect</code>, store the mapping in Redis:
            </p>
            <pre
              style={{
                padding: "0.75rem",
                borderRadius: "8px",
                background: "rgba(15,23,42,0.6)",
                fontSize: "0.78rem",
                lineHeight: 1.6,
                overflowX: "auto",
                color: "#e2e8f0",
              }}
            >
              {`// $connect handler
await redis.set(connectionId, JSON.stringify({
  userId: "user-42",
  policyId: "POL-9001"
}));`}
            </pre>

            <p style={{ marginTop: "0.75rem" }}>
              <strong>2. Send messages back</strong>
            </p>
            <p style={{ color: "#94a3b8", marginBottom: "0.4rem" }}>
              You cannot just "return" a response like HTTP. Instead you call{" "}
              <code>postToConnection</code>:
            </p>
            <pre
              style={{
                padding: "0.75rem",
                borderRadius: "8px",
                background: "rgba(15,23,42,0.6)",
                fontSize: "0.78rem",
                lineHeight: 1.6,
                overflowX: "auto",
                color: "#e2e8f0",
              }}
            >
              {`import { ApiGatewayManagementApi } from
  "@aws-sdk/client-apigatewaymanagementapi";

await api.postToConnection({
  ConnectionId: connectionId,
  Data: JSON.stringify({
    message: "Yes, you are covered for hail damage."
  })
});`}
            </pre>
            <p style={{ marginTop: "0.5rem", color: "#94a3b8" }}>
              Think of connectionId as the{" "}
              <strong>phone number of the open call</strong>.{" "}
              <code>postToConnection</code> is how you talk into it.
            </p>
          </>
        ),
      },
      {
        title: "The lifecycle",
        accent: "#22c55e",
        content: (
          <>
            <p>
              <strong>1. Client connects</strong> — API Gateway fires the{" "}
              <code>$connect</code> route. You store the connectionId → userId
              mapping in Redis.
            </p>
            <p style={{ marginTop: "0.4rem" }}>
              <strong>2. Client sends messages</strong> — every message carries
              the same connectionId. You look up the user and process the
              request.
            </p>
            <p style={{ marginTop: "0.4rem" }}>
              <strong>3. Client disconnects</strong> — API Gateway fires the{" "}
              <code>$disconnect</code> route. You clean up the mapping from
              Redis.
            </p>
          </>
        ),
      },
      {
        title: "Why it matters in this architecture",
        accent: "#fbbf24",
        content: (
          <>
            <p>
              The pipeline is <strong>asynchronous</strong>:
            </p>
            <p
              style={{
                marginTop: "0.3rem",
                fontFamily: "monospace",
                fontSize: "0.8rem",
                color: "#94a3b8",
              }}
            >
              Client → Lambda → SQS → ECS → OpenAI → response later
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              When the LLM finally produces an answer, the ECS worker needs to
              know <em>which socket to send it to</em>. It reads the
              connectionId from the SQS message (passed through from Lambda),
              then calls <code>postToConnection</code> to stream the answer back
              to exactly the right browser tab.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              Without connectionId stored in the message, the async response
              would have nowhere to go.
            </p>
          </>
        ),
      },
    ],
  },

  "sqs-backpressure": {
    title: "SQS as a Rate-Limit Shock Absorber",
    subtitle: "How SQS buffers traffic spikes against LLM rate limits",
    accentColor: "#f87171",
    sections: [
      {
        title: "The Problem",
        content: (
          <>
            <p>
              LLM APIs enforce <strong>two hard ceilings</strong> per minute:
            </p>
            <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem" }}>
              <li>
                <strong>RPM</strong> — requests per minute (e.g. 500)
              </li>
              <li>
                <strong>TPM</strong> — tokens per minute (e.g. 30 000 for
                GPT-4.1)
              </li>
            </ul>
            <p style={{ marginTop: "0.5rem" }}>
              A traffic spike that exceeds either limit triggers{" "}
              <code>429 Too Many Requests</code>, and every retry adds more
              pressure. Without buffering, you either drop requests or cascade
              failures back to the client.
            </p>
          </>
        ),
      },
      {
        title: "SQS as a Shock Absorber",
        content: (
          <>
            <p>
              Placing an SQS queue between the API Gateway and the ECS workers
              <strong> decouples ingestion speed from processing speed</strong>.
              The queue accepts messages at any rate — even thousands per second
              — and the workers drain it at the pace the LLM provider can
              handle.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              Think of it like a funnel: wide at the top (user traffic), narrow
              at the bottom (LLM rate limits). The queue is the funnel body — it
              holds the excess until the narrow end can catch up.
            </p>
          </>
        ),
      },
      {
        title: "Four Control Levers",
        content: (
          <>
            <ol style={{ paddingLeft: "1.2rem" }}>
              <li>
                <strong>Worker concurrency</strong> — how many ECS tasks poll
                simultaneously. Each task makes one LLM call at a time.
              </li>
              <li>
                <strong>Poll batch size</strong> — messages per{" "}
                <code>ReceiveMessage</code> call (1–10). Smaller batches =
                tighter control.
              </li>
              <li>
                <strong>Visibility timeout</strong> — how long a message stays
                hidden while being processed. Set it to ~2× p95 inference
                latency.
              </li>
              <li>
                <strong>Autoscaling cap</strong> — max ECS tasks. This is your
                hard ceiling against runaway scaling.
              </li>
            </ol>
          </>
        ),
      },
      {
        title: "The Core Draining Pattern",
        content: (
          <>
            <pre
              style={{
                background: "#1e293b",
                padding: "0.75rem",
                borderRadius: 6,
                fontSize: "0.78rem",
                overflowX: "auto",
                lineHeight: 1.5,
              }}
            >
              {`while queue is not empty:
  msg = sqs.receiveMessage(batch=1)
  if rateLimiter.acquire():
      response = openai.chat(msg.prompt)
      sqs.deleteMessage(msg)
      postToConnection(msg.connectionId, response)
  else:
      // visibility timeout expires → msg reappears
      sleep(jittered_backoff)`}
            </pre>
            <p style={{ marginTop: "0.5rem" }}>
              The key insight: a <strong>central rate limiter</strong> (token
              bucket or sliding window) gates every LLM call. If the budget is
              exhausted, the worker simply lets the message{" "}
              <em>become visible again</em> instead of retrying in a hot loop.
            </p>
          </>
        ),
      },
      {
        title: "Throughput Mental Model",
        content: (
          <>
            <p>
              Your effective throughput is the <em>minimum</em> of two limits:
            </p>
            <pre
              style={{
                background: "#1e293b",
                padding: "0.75rem",
                borderRadius: 6,
                fontSize: "0.78rem",
                overflowX: "auto",
                lineHeight: 1.5,
              }}
            >
              {`effective_rpm = min(
  RPM_limit,
  floor(TPM_limit / avg_tokens_per_request)
)`}
            </pre>
            <p style={{ marginTop: "0.5rem" }}>
              Example: GPT-4.1 at Tier 1 has 500 RPM but only 30 000 TPM. If
              each request averages 2 000 tokens (1 500 in + 500 out), your
              effective limit is{" "}
              <code>min(500, floor(30000 / 2000)) = 15 req/min</code>. The
              remaining 485 RPM are unusable — TPM is the bottleneck.
            </p>
          </>
        ),
      },
      {
        title: "What SQS Gives You",
        content: (
          <>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>
                <strong>Spike absorption</strong> — 1 000 requests arrive in 10
                seconds? They queue up and drain over the next few minutes.
              </li>
              <li>
                <strong>Decoupling</strong> — API Gateway returns 202 Accepted
                immediately; client is never blocked.
              </li>
              <li>
                <strong>Smoothing</strong> — workers pull at a steady rate
                matching the LLM budget.
              </li>
              <li>
                <strong>Free retries</strong> — visibility timeout gives you
                at-least-once delivery without writing retry logic.
              </li>
              <li>
                <strong>DLQ safety net</strong> — messages that fail repeatedly
                move to a Dead Letter Queue for investigation.
              </li>
            </ul>
          </>
        ),
      },
      {
        title: "Operational Knobs",
        content: (
          <>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.82rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #334155",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "4px 8px" }}>Knob</th>
                  <th style={{ padding: "4px 8px" }}>Default</th>
                  <th style={{ padding: "4px 8px" }}>Effect</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "4px 8px" }}>Visibility timeout</td>
                  <td style={{ padding: "4px 8px" }}>60 s</td>
                  <td style={{ padding: "4px 8px" }}>
                    Too low → duplicate processing; too high → slow retry
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "4px 8px" }}>Batch size</td>
                  <td style={{ padding: "4px 8px" }}>1</td>
                  <td style={{ padding: "4px 8px" }}>
                    Higher = better throughput but coarser rate control
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "4px 8px" }}>Max receive count</td>
                  <td style={{ padding: "4px 8px" }}>3</td>
                  <td style={{ padding: "4px 8px" }}>After N failures → DLQ</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "4px 8px" }}>ECS task max</td>
                  <td style={{ padding: "4px 8px" }}>10</td>
                  <td style={{ padding: "4px 8px" }}>
                    Hard cap against runaway concurrency
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 8px" }}>Token bucket rate</td>
                  <td style={{ padding: "4px 8px" }}>RPM / 60</td>
                  <td style={{ padding: "4px 8px" }}>
                    Smooth per-second pacing
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ),
      },
    ],
  },
};
