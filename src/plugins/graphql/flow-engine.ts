import type { GraphqlState } from "./graphqlSlice";
import { getAdapter } from "./graphql-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   GraphQL Lab — Declarative Flow Engine

   Uses the shared lab-engine for build/execute logic.
   Token expansion and flow beats delegate to adapters.
   Steps use `when` guards to show only for the active topic.
   ══════════════════════════════════════════════════════════ */

export type FlowBeat = GenericFlowBeat<GraphqlState>;
export type StepDef = GenericStepDef<GraphqlState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<GraphqlState>;

/* ── Token expansion (delegates to adapter) ──────────── */

export function expandToken(token: string, state: GraphqlState): string[] {
  const adapter = getAdapter(state.variant);
  const expanded = adapter.expandToken(token, state);
  return expanded ?? [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  /* Q1 — GraphQL vs REST */
  | "q1-overview"
  | "q1-authenticate"
  | "q1-client-request"
  | "q1-parse-validate"
  | "q1-server-resolve"
  | "q1-response"
  | "q1-schema-contract"
  | "q1-summary"
  /* Queries vs Mutations vs Subscriptions */
  | "qvmvs-overview"
  | "qvmvs-client-sends"
  | "qvmvs-appsync-process"
  | "qvmvs-resolve"
  | "qvmvs-response"
  | "qvmvs-summary";

/* ── Guards ──────────────────────────────────────────── */

const isQ1 = (s: GraphqlState) => s.topic === "graphql-vs-rest";
const isQ2 = (s: GraphqlState) =>
  s.topic === "queries-vs-mutations-vs-subscriptions";

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  /* ═══ Q1 — GraphQL vs REST ═══════════════════════════ */
  {
    key: "q1-overview",
    label: "Architecture Overview",
    when: isQ1,
    nextButton: "Begin →",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `Examining the ${adapter.profile.label} approach on AWS. Step through to see how client-server communication works — from authentication through to data retrieval.`;
    },
  },
  {
    key: "q1-authenticate",
    label: "Authenticate",
    when: isQ1,
    phase: "auth",
    processingText: "Authenticating…",
    nextButtonColor: "#d97706",
    flow: (s) => getAdapter(s.variant).getFlowBeats(s),
    finalHotZones: ["client", "cognito"],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "graphql-approach"
        ? "The client signs in to Amazon Cognito (username/password, social login, MFA, etc). Cognito validates credentials and returns a JWT token (ID + access + refresh). The JWT is cached client-side and will be attached to every subsequent request via the Authorization header. AppSync validates this JWT on each request."
        : "The client signs in to Amazon Cognito and receives a JWT token. The token is cached locally. On each subsequent API call, the client sends the JWT in the Authorization header. API Gateway's Cognito Authorizer validates the token before the request reaches any Lambda — unauthorized calls are rejected at the gateway.",
  },
  {
    key: "q1-client-request",
    label: "Client Sends Request",
    when: isQ1,
    phase: "request",
    processingText: "Sending request…",
    nextButtonColor: "#2563eb",
    flow: (s) =>
      s.variant === "graphql-approach"
        ? [{ from: "client", to: "appsync", duration: 500, color: "#e535ab" }]
        : [{ from: "client", to: "apigw", duration: 400, color: "#3b82f6" }],
    finalHotZones: ["client", "endpoint", "appsync", "apigw"],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "graphql-approach"
        ? 'Now the client sends a POST to AppSync\'s /graphql endpoint with the JWT in the Authorization header: { user(id:"123") { name, email, avatar } }. AppSync validates the JWT, then processes the query. One request, exact fields.'
        : "Now the client sends 3 HTTPS requests to API Gateway, each with the JWT in the Authorization header. API Gateway validates the token via the Cognito Authorizer, then routes to /users/{id}, /posts, and /profile. Each route is a separate resource + Lambda.",
  },
  {
    key: "q1-parse-validate",
    label: "Parse & Validate",
    when: isQ1,
    phase: "validate",
    processingText: "Validating query…",
    flow: (s) =>
      s.variant === "graphql-approach"
        ? [{ from: "appsync", to: "parser", duration: 500, color: "#a78bfa" }]
        : [
            { from: "apigw", to: "usersEp", duration: 300, color: "#3b82f6" },
            { from: "apigw", to: "postsEp", duration: 300, color: "#3b82f6" },
            { from: "apigw", to: "profileEp", duration: 300, color: "#3b82f6" },
            {
              from: "usersEp",
              to: "usersLam",
              duration: 400,
              color: "#34d399",
            },
            {
              from: "postsEp",
              to: "postsLam",
              duration: 400,
              color: "#34d399",
            },
            {
              from: "profileEp",
              to: "profileLam",
              duration: 400,
              color: "#34d399",
            },
          ],
    finalHotZones: (s) =>
      s.variant === "graphql-approach"
        ? ["parser", "schema"]
        : ["usersLam", "postsLam", "profileLam"],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "graphql-approach"
        ? "AppSync parses the query into an AST and validates every field against the SDL schema. If the client asks for a field that doesn't exist (e.g. user.address), it's rejected immediately — before any Lambda resolver is invoked."
        : "API Gateway routes each request to its matching resource, then triggers the corresponding Lambda via proxy integration. There is no query parsing — the URL path IS the query. Each Lambda runs independently.",
  },
  {
    key: "q1-server-resolve",
    label: "Resolve Data",
    when: isQ1,
    phase: "resolve",
    processingText: "Resolving…",
    flow: (s) =>
      s.variant === "graphql-approach"
        ? [
            { from: "parser", to: "vtl", duration: 400, color: "#22c55e" },
            { from: "vtl", to: "userRes", duration: 350, color: "#f472b6" },
            { from: "vtl", to: "postsRes", duration: 350, color: "#fb923c" },
            { from: "vtl", to: "profileRes", duration: 350, color: "#38bdf8" },
            { from: "userRes", to: "dynamo", duration: 400, color: "#eab308" },
            { from: "postsRes", to: "dynamo", duration: 400, color: "#eab308" },
            {
              from: "profileRes",
              to: "dynamo",
              duration: 400,
              color: "#eab308",
            },
          ]
        : [
            { from: "usersLam", to: "rds", duration: 400, color: "#eab308" },
            { from: "postsLam", to: "rds", duration: 400, color: "#eab308" },
            { from: "profileLam", to: "rds", duration: 400, color: "#eab308" },
          ],
    finalHotZones: (s) =>
      s.variant === "graphql-approach" ? ["dynamo"] : ["rds"],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "graphql-approach"
        ? "The pipeline resolver (VTL/JS mapping templates) dispatches individual Lambda resolvers per field. Each Lambda calls DynamoDB GetItem with a ProjectionExpression for ONLY the requested attribute — e.g. name, not the entire item."
        : "Each Lambda runs a SQL query against Amazon RDS (SELECT * FROM table). The getUser Lambda returns 6 columns, getPosts returns 4, getProfile returns 2 — but the client only needs 1 field from each.",
  },
  {
    key: "q1-response",
    label: "Response to Client",
    when: isQ1,
    phase: "response",
    processingText: "Returning data…",
    flow: (s) =>
      s.variant === "graphql-approach"
        ? [
            { from: "dynamo", to: "vtl", duration: 400 },
            { from: "vtl", to: "appsync", duration: 400 },
            { from: "appsync", to: "client", duration: 400 },
          ]
        : [{ from: "rds", to: "response", duration: 400, color: "#f87171" }],
    finalHotZones: ["client"],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "graphql-approach"
        ? "AppSync assembles the Lambda resolver results into a JSON response matching the query shape exactly. The client gets 3 fields in 1 round trip — no over-fetching, no under-fetching."
        : "The client receives 12 fields across 3 API Gateway round trips, but only needed 3. That's 9 wasted fields (over-fetching). If the profile data wasn't on the users table, another Lambda + round trip would be needed (under-fetching).",
  },
  {
    key: "q1-schema-contract",
    label: "Schema as Contract",
    when: isQ1,
    phase: "schema",
    finalHotZones: (s) =>
      s.variant === "graphql-approach" ? ["schema", "parser"] : [],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "graphql-approach"
        ? "The AppSync SDL schema is a strongly typed contract: it defines every type, field, and argument. AppSync uses it for validation, and tools like the AppSync console query explorer provide auto-complete and documentation — all from the schema."
        : "API Gateway has no built-in type contract for response shapes. Documentation relies on OpenAPI/Swagger specs imported separately. If the spec drifts from the Lambda implementation, clients break with no compile-time warning.",
  },
  {
    key: "q1-summary",
    label: "Summary",
    when: isQ1,
    phase: "summary",
    explain: (s) =>
      s.variant === "graphql-approach"
        ? "AWS AppSync: single endpoint → parser validates against SDL schema → pipeline resolver dispatches Lambda functions per field → DynamoDB returns exact attributes. Fewer round trips, precise fetching, typed contract, plus built-in subscriptions for real-time."
        : "API Gateway + Lambda: 3 endpoints → 3 Lambda invocations → 3 RDS queries returning full rows → client merges & discards unused fields. More round trips, over-fetching, no built-in contract. Simpler for basic CRUD and leverages HTTP caching via CloudFront.",
  },
  // ── Q2 — Queries vs Mutations vs Subscriptions ────
  {
    key: "qvmvs-overview",
    label: "Operation Overview",
    when: isQ2,
    nextButton: "Begin →",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `Examining the ${adapter.profile.label} operation type. Step through to see how data flows from the client through AppSync to DynamoDB.`;
    },
  },
  {
    key: "qvmvs-client-sends",
    label: "Client Sends Operation",
    when: isQ2,
    phase: "request",
    processingText: "Sending…",
    nextButtonColor: "#e535ab",
    flow: (s) => [
      {
        from: "client",
        to: "appsync",
        duration: 500,
        color: getAdapter(s.variant).colors.stroke,
      },
    ],
    finalHotZones: ["client", "appsync"],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "query-op"
        ? "The client sends a read-only query to AppSync's /graphql endpoint. Queries MUST be side-effect free — they only retrieve data, never modify it. AppSync can batch and cache query results."
        : s.variant === "mutation-op"
          ? "The client sends a mutation to AppSync's /graphql endpoint. Mutations are write operations that create, update, or delete data. Only top-level mutation fields may have side effects."
          : "The client sends a subscription request to AppSync. AppSync upgrades the connection to a WebSocket. Unlike queries and mutations, subscriptions are long-lived — the server pushes updates whenever the underlying data changes.",
  },
  {
    key: "qvmvs-appsync-process",
    label: "AppSync Processes",
    when: isQ2,
    phase: "validate",
    processingText: "Processing…",
    flow: (s) =>
      s.variant === "subscription-op"
        ? [{ from: "appsync", to: "filter", duration: 400, color: "#a78bfa" }]
        : [
            {
              from: "appsync",
              to: "resolver",
              duration: 500,
              color: "#a78bfa",
            },
          ],
    finalHotZones: (s) =>
      s.variant === "subscription-op" ? ["filter"] : ["resolver"],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "query-op"
        ? "AppSync validates the query against the SDL schema, then dispatches a resolver to fetch the requested fields. The resolver maps query fields to DynamoDB GetItem calls with ProjectionExpression."
        : s.variant === "mutation-op"
          ? "AppSync validates the mutation input types against the schema, then dispatches a resolver to perform the write. The resolver maps the mutation to a DynamoDB PutItem/UpdateItem operation."
          : "AppSync registers the subscription filter against the SDL schema. The filter defines which mutation events this client cares about — e.g. only new posts by a specific user.",
  },
  {
    key: "qvmvs-resolve",
    label: "Data Layer",
    when: isQ2,
    phase: "resolve",
    processingText: "Resolving…",
    flow: (s) =>
      s.variant === "subscription-op"
        ? [
            {
              from: "mutation-src",
              to: "appsync",
              duration: 400,
              color: "#22c55e",
            },
            { from: "appsync", to: "filter", duration: 350, color: "#a78bfa" },
            { from: "filter", to: "client", duration: 500, color: "#a78bfa" },
          ]
        : [{ from: "resolver", to: "dynamo", duration: 500, color: "#eab308" }],
    finalHotZones: (s) =>
      s.variant === "subscription-op" ? ["client", "filter"] : ["dynamo"],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "query-op"
        ? "The resolver calls DynamoDB GetItem with a ProjectionExpression for ONLY the requested attributes. No full-table scan, no wasted reads — just the fields the query asked for."
        : s.variant === "mutation-op"
          ? "The resolver writes to DynamoDB using PutItem or UpdateItem. DynamoDB returns the new/updated item. If any subscriptions are watching this mutation type, AppSync will automatically push the result to subscribed clients."
          : "A mutation event arrives (from another client or service). AppSync evaluates the subscription filter — if the event matches, it pushes the data payload to this client's WebSocket connection in real-time.",
  },
  {
    key: "qvmvs-response",
    label: "Response / Event",
    when: isQ2,
    phase: "response",
    processingText: "Returning…",
    flow: (s) =>
      s.variant === "subscription-op"
        ? []
        : [
            { from: "dynamo", to: "resolver", duration: 400 },
            { from: "resolver", to: "appsync", duration: 400 },
            { from: "appsync", to: "client", duration: 400 },
          ],
    finalHotZones: ["client"],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "query-op"
        ? "AppSync assembles the resolver result into a JSON response matching the query shape exactly. The response travels back: DynamoDB → Resolver → AppSync → Client. Read-only, no side effects."
        : s.variant === "mutation-op"
          ? "AppSync returns the mutated data to the caller. The response contains the fields requested in the mutation's selection set. Meanwhile, any active subscriptions for this mutation type receive the same data via WebSocket push."
          : "The subscription remains open. Each time a matching mutation fires, the client receives a push event with the updated data — no polling needed. The connection stays alive until the client unsubscribes or disconnects.",
  },
  {
    key: "qvmvs-summary",
    label: "Summary",
    when: isQ2,
    phase: "summary",
    explain: (s) =>
      s.variant === "query-op"
        ? "Queries are read-only, side-effect free operations. Client specifies exact fields → AppSync validates against schema → Resolver fetches from DynamoDB → exact response returned. Cacheable and predictable."
        : s.variant === "mutation-op"
          ? "Mutations are write operations (create/update/delete). Only top-level mutation fields may have side effects. After the write, AppSync returns the result AND pushes it to any active subscriptions watching that mutation type."
          : "Subscriptions provide real-time updates via WebSocket. Client subscribes to a mutation type with optional filters → when a matching mutation fires, the data is pushed automatically. Used for live chat, notifications, collaborative editing.",
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: GraphqlState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
