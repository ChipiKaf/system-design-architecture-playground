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
  | "qvmvs-summary"
  /* Q3 — Resolvers & Data Fetching */
  | "q3-overview"
  | "q3-client-request"
  | "q3-parse-validate"
  | "q3-resolve-claims"
  | "q3-resolve-nested"
  | "q3-response"
  | "q3-summary";

/* ── Guards ──────────────────────────────────────────── */

const isQ1 = (s: GraphqlState) => s.topic === "graphql-vs-rest";
const isQ2 = (s: GraphqlState) =>
  s.topic === "queries-vs-mutations-vs-subscriptions";
const isQ3 = (s: GraphqlState) => s.topic === "resolvers-data-fetching";

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
  // ── Q3 — Resolvers & Data Fetching ────────────────
  {
    key: "q3-overview",
    label: "How Does GraphQL Fetch Data?",
    when: isQ3,
    nextButton: "Begin →",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label}: ${adapter.profile.description}`;
    },
  },
  {
    key: "q3-client-request",
    label: "Client Sends Query",
    when: isQ3,
    phase: "request",
    processingText: "Sending query…",
    nextButtonColor: "#e535ab",
    flow: (s) => [
      { from: "client", to: "graphql", duration: 500, color: "#e535ab" },
    ],
    finalHotZones: ["client", "graphql"],
    recalcMetrics: true,
    explain: () =>
      "The client sends a GraphQL query asking for claims AND the policyholder name for each claim. This is a nested query — the policyholder field lives on a different table than claims. How the server fetches this data depends entirely on how the resolvers are written.",
  },
  {
    key: "q3-parse-validate",
    label: "Parse & Validate Against Schema",
    when: isQ3,
    phase: "validate",
    processingText: "Validating…",
    flow: () => [
      { from: "graphql", to: "graphql", duration: 400, color: "#a78bfa" },
    ],
    finalHotZones: ["graphql"],
    recalcMetrics: true,
    explain: () =>
      "The GraphQL engine parses the query into a tree (AST) and checks every field against the schema. It confirms that 'claims' is a valid query field, and that 'policyholder' is a valid field on the Claim type. If anything doesn't match the schema, the query is rejected before any resolver runs.",
  },
  {
    key: "q3-resolve-claims",
    label: "Resolve Top-Level: claims",
    when: isQ3,
    phase: "resolve",
    processingText: "Fetching claims…",
    nextButtonColor: "#22c55e",
    flow: (s) =>
      s.variant === "sql-join-resolver"
        ? [
            {
              from: "graphql",
              to: "resolver",
              duration: 400,
              color: "#22c55e",
            },
            { from: "resolver", to: "db", duration: 500, color: "#eab308" },
          ]
        : [
            {
              from: "graphql",
              to: "claimsRes",
              duration: 400,
              color: "#22c55e",
            },
            { from: "claimsRes", to: "db", duration: 500, color: "#eab308" },
          ],
    finalHotZones: (s) =>
      s.variant === "sql-join-resolver"
        ? ["resolver", "db"]
        : ["claimsRes", "db"],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "sql-join-resolver"
        ? "The claims resolver fires a single SQL query with a JOIN: SELECT c.*, p.name FROM claims c JOIN persons p ON c.policyholder_id = p.id. One query gets everything — claims AND their policyholders. This works great when all your data is in one database."
        : s.variant === "naive-resolvers"
          ? "The claims() resolver fires: SELECT * FROM claims. This returns 100 claim rows. Each row has a policyholder_id, but NOT the policyholder's name yet. The GraphQL engine sees that the query also asks for 'policyholder', so it needs to resolve that field next — for every single claim."
          : "The claims() resolver fires: SELECT * FROM claims. This returns 100 claim rows. Each row has a policyholder_id but not the policyholder name. The GraphQL engine sees the nested 'policyholder' field and will call the policyholder resolver for each claim — but DataLoader will intercept those calls.",
  },
  {
    key: "q3-resolve-nested",
    label: (s) =>
      s.variant === "sql-join-resolver"
        ? "All Data Already Fetched"
        : s.variant === "naive-resolvers"
          ? "N+1 Problem: 100 More Queries!"
          : "DataLoader Batches into 1 Query",
    when: isQ3,
    phase: (s) =>
      s.variant === "sql-join-resolver"
        ? "resolve"
        : s.variant === "naive-resolvers"
          ? "n-plus-1"
          : "batch",
    processingText: (s) =>
      s.variant === "naive-resolvers"
        ? "Firing 100 queries…"
        : s.variant === "dataloader-batching"
          ? "Batching IDs…"
          : "Already resolved",
    nextButtonColor: (s) =>
      s.variant === "naive-resolvers" ? "#ef4444" : "#3b82f6",
    flow: (s) =>
      s.variant === "sql-join-resolver"
        ? []
        : s.variant === "naive-resolvers"
          ? [
              {
                from: "graphql",
                to: "holderRes",
                duration: 300,
                color: "#ef4444",
              },
              { from: "holderRes", to: "db", duration: 400, color: "#ef4444" },
            ]
          : [
              {
                from: "graphql",
                to: "holderRes",
                duration: 300,
                color: "#3b82f6",
              },
              {
                from: "holderRes",
                to: "dataloader",
                duration: 400,
                color: "#3b82f6",
              },
              { from: "dataloader", to: "db", duration: 400, color: "#eab308" },
            ],
    finalHotZones: (s) =>
      s.variant === "sql-join-resolver"
        ? ["resolver", "db"]
        : s.variant === "naive-resolvers"
          ? ["holderRes", "db", "counter"]
          : ["dataloader", "db", "counter"],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "sql-join-resolver"
        ? "Because the JOIN already fetched policyholder data alongside claims, there's nothing more to do. The resolver returned all the data in a single query. This is the simplest approach — but it only works when all your data lives in one database."
        : s.variant === "naive-resolvers"
          ? "Here's the N+1 problem: GraphQL calls the policyholder() resolver once for EACH of the 100 claims. Each call fires its own query: SELECT * FROM persons WHERE id = 'xyz'. That's 100 separate database queries — plus the 1 original claims query = 101 total. The database is hammered with nearly identical queries that could have been combined."
          : "All 100 policyholder() resolver calls go through DataLoader. Instead of firing immediately, DataLoader collects all 100 person IDs during the current event loop tick. Then it fires ONE query: SELECT * FROM persons WHERE id IN ('id1', 'id2', …, 'id100'). That's just 2 total queries (1 for claims + 1 batched for policyholders) instead of 101.",
  },
  {
    key: "q3-response",
    label: "Response to Client",
    when: isQ3,
    phase: "response",
    processingText: "Returning data…",
    flow: (s) =>
      s.variant === "sql-join-resolver"
        ? [
            { from: "db", to: "resolver", duration: 400 },
            { from: "resolver", to: "graphql", duration: 400 },
            { from: "graphql", to: "client", duration: 400 },
          ]
        : [{ from: "db", to: "result", duration: 400 }],
    finalHotZones: ["client", "result"],
    recalcMetrics: true,
    explain: (s) =>
      s.variant === "sql-join-resolver"
        ? "The response goes back to the client with all claims and their policyholder names. Total: 1 database query. Simple and efficient — the JOIN did all the heavy lifting."
        : s.variant === "naive-resolvers"
          ? "The client finally gets the response with all 100 claims and policyholder names. But it took 101 database queries to get there. With 1,000 claims that would be 1,001 queries. With 10,000 claims — you can see the problem. The response is correct, but painfully slow."
          : "The client gets the same response — all 100 claims with policyholder names. But it only took 2 database queries total: 1 for claims, 1 batched query for all policyholders. DataLoader solved the N+1 problem without changing the resolver structure.",
  },
  {
    key: "q3-summary",
    label: "Summary & Comparison",
    when: isQ3,
    phase: "summary",
    explain: (s) =>
      s.variant === "sql-join-resolver"
        ? "SQL JOIN approach: 1 query total. The resolver does a JOIN to fetch claims + policyholders together. Pros: simplest, fastest for single-database setups. Cons: only works when all data is in the same database. If policyholders lived in a separate microservice or API, you couldn't JOIN."
        : s.variant === "naive-resolvers"
          ? "Naive resolver approach: 101 queries for 100 claims (N+1 problem). GraphQL's per-field resolver model means each nested field triggers its own database call. This is the DEFAULT behavior if you don't add batching. The N+1 problem is the #1 performance trap in GraphQL — and DataLoader is the standard fix."
          : "DataLoader approach: 2 queries total. DataLoader sits between resolvers and the database, collecting IDs and batching them into a single WHERE IN query. This is the industry-standard solution for the N+1 problem. Works across databases, APIs, and microservices — not just SQL.",
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
