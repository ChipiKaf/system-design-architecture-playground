import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "cognito"
  | "graphql-overview"
  | "rest-overview"
  | "schema"
  | "over-fetching"
  | "resolver"
  | "query-op"
  | "mutation-op"
  | "subscription-op"
  | "n-plus-1"
  | "dataloader"
  | "resolver-execution";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  cognito: {
    title: "Amazon Cognito",
    subtitle: "Managed authentication and authorization for AWS applications",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What is Cognito?",
        accent: "#f59e0b",
        content: (
          <p>
            Amazon Cognito provides{" "}
            <strong>user sign-up, sign-in, and access control</strong> for web
            and mobile apps. It issues <strong>JWT tokens</strong> (ID, access,
            refresh) that downstream services like AppSync or API Gateway
            validate to authorize requests.
          </p>
        ),
      },
      {
        title: "How it integrates",
        accent: "#d97706",
        content: (
          <ul>
            <li>
              <strong>AppSync:</strong> Cognito is a first-class auth provider —
              AppSync validates JWTs natively and supports fine-grained
              field-level authorization via <code>@auth</code> directives.
            </li>
            <li>
              <strong>API Gateway:</strong> Uses a Cognito Authorizer that
              validates the JWT before the request reaches any Lambda function.
              Unauthorized requests are rejected at the gateway.
            </li>
            <li>
              <strong>User Pools</strong> manage user identities;{" "}
              <strong>Identity Pools</strong> grant temporary AWS credentials
              for direct service access (S3, DynamoDB).
            </li>
          </ul>
        ),
      },
    ],
  },
  "graphql-overview": {
    title: "AWS AppSync (GraphQL)",
    subtitle:
      "Managed GraphQL service on AWS — single endpoint, real-time, offline",
    accentColor: "#e535ab",
    sections: [
      {
        title: "What is AWS AppSync?",
        accent: "#e535ab",
        content: (
          <p>
            AWS AppSync is a <strong>fully managed GraphQL service</strong> that
            lets clients send a single query specifying exactly which fields
            they need. AppSync handles parsing, validation, and resolver
            dispatching. It supports <strong>real-time subscriptions</strong>{" "}
            via WebSockets and <strong>offline sync</strong> via the Amplify
            DataStore.
          </p>
        ),
      },
      {
        title: "Key AWS components",
        accent: "#e535ab",
        content: (
          <ul>
            <li>
              <strong>AppSync endpoint</strong> — single POST /graphql URL for
              all queries/mutations
            </li>
            <li>
              <strong>SDL Schema</strong> — defines types, queries, mutations,
              and subscriptions
            </li>
            <li>
              <strong>Pipeline resolvers</strong> — VTL or JS mapping templates
              that orchestrate data sources
            </li>
            <li>
              <strong>Lambda data sources</strong> — individual Lambda functions
              invoked per field
            </li>
            <li>
              <strong>DynamoDB / RDS / OpenSearch</strong> — direct resolver
              integrations
            </li>
            <li>
              <strong>Cognito / IAM / API Key</strong> — built-in auth modes
            </li>
          </ul>
        ),
      },
    ],
  },
  "rest-overview": {
    title: "API Gateway + Lambda (REST)",
    subtitle: "Serverless REST APIs on AWS — multiple endpoints, Lambda proxy",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What is API Gateway REST?",
        accent: "#3b82f6",
        content: (
          <p>
            Amazon API Gateway lets you create <strong>RESTful APIs</strong>{" "}
            with multiple resource endpoints. Each route (e.g.
            /users/&#123;id&#125;) maps to a{" "}
            <strong>Lambda proxy integration</strong> that handles the request.
            The server decides the response shape — clients have no control over
            which fields are returned.
          </p>
        ),
      },
      {
        title: "Key AWS components",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>
              <strong>API Gateway</strong> — creates REST resources, stages, and
              deployments
            </li>
            <li>
              <strong>Lambda proxy</strong> — one Lambda per route (or a
              monolithic handler)
            </li>
            <li>
              <strong>Amazon RDS / Aurora</strong> — relational database backing
              the Lambdas
            </li>
            <li>
              <strong>CloudFront</strong> — CDN caching for GET responses
            </li>
            <li>
              <strong>Cognito authorizers</strong> — JWT validation at the
              gateway level
            </li>
            <li>
              <strong>Usage plans / API keys</strong> — rate limiting and
              throttling
            </li>
          </ul>
        ),
      },
    ],
  },
  schema: {
    title: "AppSync Schema (SDL)",
    subtitle: "A strongly typed contract between client and server",
    accentColor: "#a855f7",
    sections: [
      {
        title: "What is the SDL schema?",
        accent: "#a855f7",
        content: (
          <p>
            The AppSync schema uses{" "}
            <strong>Schema Definition Language (SDL)</strong> to declare types
            (User, Post), queries, mutations, and subscriptions. AppSync
            validates every incoming query against this schema — if a field
            doesn't exist or an argument has the wrong type, the request is
            rejected before any resolver runs.
          </p>
        ),
      },
      {
        title: "Why it matters on AWS",
        accent: "#a855f7",
        content: (
          <ul>
            <li>
              AppSync console provides a built-in query explorer with
              auto-complete
            </li>
            <li>Amplify Codegen generates TypeScript types from the schema</li>
            <li>
              Schema changes are versioned and deployed via CloudFormation / CDK
            </li>
            <li>
              API Gateway REST has no equivalent — relies on OpenAPI specs
              maintained separately
            </li>
          </ul>
        ),
      },
    ],
  },
  "over-fetching": {
    title: "Over-fetching & Under-fetching",
    subtitle: "The core data efficiency problem — AppSync vs API Gateway",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "Over-fetching (API Gateway)",
        accent: "#fbbf24",
        content: (
          <p>
            Each Lambda behind API Gateway returns a{" "}
            <strong>fixed JSON shape</strong>. If a Lambda returns 6 fields but
            the client only needs 1, the other 5 are wasted bandwidth and Lambda
            execution time. With AppSync, the GraphQL query specifies exactly
            which fields to return — the Lambda resolver only fetches those
            attributes from DynamoDB.
          </p>
        ),
      },
      {
        title: "Under-fetching (API Gateway)",
        accent: "#f97316",
        content: (
          <p>
            When one API Gateway endpoint doesn't return all needed data, the
            client must make <strong>additional round trips</strong> to other
            endpoints — each triggering another Lambda cold start. AppSync
            resolves related data in a single query via pipeline resolvers,
            assembling results from multiple data sources in one network call.
          </p>
        ),
      },
    ],
  },
  resolver: {
    title: "Lambda Resolvers (AppSync)",
    subtitle: "Per-field Lambda functions invoked by the pipeline resolver",
    accentColor: "#22c55e",
    sections: [
      {
        title: "How AppSync resolvers work",
        accent: "#22c55e",
        content: (
          <p>
            Each field in the AppSync schema maps to a <strong>resolver</strong>{" "}
            — either a direct DynamoDB/RDS integration or a Lambda function. The
            pipeline resolver uses VTL or JavaScript mapping templates to invoke
            these data sources per-field. Each Lambda fetches ONLY the requested
            attributes using DynamoDB <code>ProjectionExpression</code> or SQL
            column selection.
          </p>
        ),
      },
      {
        title: "API Gateway equivalent",
        accent: "#3b82f6",
        content: (
          <p>
            In the API Gateway REST model, each route triggers a{" "}
            <strong>single Lambda</strong> that returns the entire resource.
            There is no field-level granularity — the Lambda always runs SELECT
            * or a full DynamoDB Scan/GetItem, regardless of what the client
            actually needs.
          </p>
        ),
      },
    ],
  },
  "query-op": {
    title: "GraphQL Queries",
    subtitle:
      "Read-only operations for retrieving data — no side effects allowed",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What is a query?",
        accent: "#3b82f6",
        content: (
          <p>
            A GraphQL <strong>query</strong> is a read-only operation used for
            retrieving data. Queries must be <strong>side-effect free</strong> —
            they only fetch application state, never modify it. The client
            specifies exactly which fields it needs, and the server returns only
            those fields.
          </p>
        ),
      },
      {
        title: "Key characteristics",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>
              <strong>Read-only</strong> — no modifications to server state
            </li>
            <li>
              <strong>Cacheable</strong> — AppSync can cache query results with
              TTL-based caching
            </li>
            <li>
              <strong>Parallel execution</strong> — multiple query fields
              resolve in parallel
            </li>
            <li>
              <strong>No side effects</strong> — guaranteed by the GraphQL spec
            </li>
          </ul>
        ),
      },
    ],
  },
  "mutation-op": {
    title: "GraphQL Mutations",
    subtitle: "Write operations that create, update, or delete data",
    accentColor: "#22c55e",
    sections: [
      {
        title: "What is a mutation?",
        accent: "#22c55e",
        content: (
          <p>
            A GraphQL <strong>mutation</strong> is a write operation that
            creates, updates, or deletes data. The spec states that{" "}
            <strong>
              only top-level mutation fields may have side effects
            </strong>
            ; all other fields must be idempotent, ensuring predictable
            execution.
          </p>
        ),
      },
      {
        title: "Key characteristics",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              <strong>Sequential execution</strong> — top-level mutation fields
              execute in order (unlike queries)
            </li>
            <li>
              <strong>Side effects</strong> — only allowed at the top level
            </li>
            <li>
              <strong>Returns data</strong> — the mutation's selection set
              determines what's returned after the write
            </li>
            <li>
              <strong>Triggers subscriptions</strong> — AppSync automatically
              pushes mutation results to subscribed clients
            </li>
          </ul>
        ),
      },
    ],
  },
  "subscription-op": {
    title: "GraphQL Subscriptions",
    subtitle: "Real-time updates via persistent WebSocket connections",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What is a subscription?",
        accent: "#a78bfa",
        content: (
          <p>
            A GraphQL <strong>subscription</strong> provides real-time updates
            to clients via persistent connections (usually WebSockets). When a
            client subscribes to an event, the server pushes updates whenever a
            matching mutation fires — used for live chat, notifications, and
            collaborative editing.
          </p>
        ),
      },
      {
        title: "Key characteristics",
        accent: "#a78bfa",
        content: (
          <ul>
            <li>
              <strong>Push-based</strong> — server sends data to clients (no
              polling)
            </li>
            <li>
              <strong>Event-driven</strong> — tied to specific mutation types
            </li>
            <li>
              <strong>Filtered</strong> — clients can filter which events they
              receive (e.g. posts by a specific user)
            </li>
            <li>
              <strong>AppSync</strong> manages WebSocket connections, scaling,
              and fan-out automatically
            </li>
          </ul>
        ),
      },
    ],
  },
  "n-plus-1": {
    title: "The N+1 Problem",
    subtitle: "The #1 performance trap in GraphQL — and how to spot it",
    accentColor: "#ef4444",
    sections: [
      {
        title: "What is the N+1 problem?",
        accent: "#ef4444",
        content: (
          <p>
            Imagine you ask for 100 insurance claims, and for each claim you
            also want the policyholder's name. With naive resolvers, GraphQL
            fires <strong>1 query</strong> to get the 100 claims, then fires{" "}
            <strong>100 more queries</strong> — one per claim — to get each
            policyholder. That's <strong>101 queries</strong> instead of 1 or 2.
            The "N" is the number of items (100 claims), the "+1" is the initial
            query. Hence: N+1.
          </p>
        ),
      },
      {
        title: "Why does GraphQL cause this?",
        accent: "#f97316",
        content: (
          <p>
            GraphQL resolves fields <strong>independently</strong>. Each field
            has its own resolver function. When the <code>policyholder</code>{" "}
            field resolver runs, it doesn't know that 99 other claims also need
            a policyholder. It only sees its own parent claim's{" "}
            <code>policyholder_id</code> and fires a query for that one ID.
            Multiply that by N items and you get N+1.
          </p>
        ),
      },
      {
        title: "A concrete example",
        accent: "#ef4444",
        content: (
          <ul>
            <li>
              <strong>Query 1:</strong> SELECT * FROM claims → 100 rows
            </li>
            <li>
              <strong>Query 2:</strong> SELECT * FROM persons WHERE id = 'p1'
            </li>
            <li>
              <strong>Query 3:</strong> SELECT * FROM persons WHERE id = 'p2'
            </li>
            <li>
              <strong>…</strong> (98 more identical queries)
            </li>
            <li>
              <strong>Query 101:</strong> SELECT * FROM persons WHERE id =
              'p100'
            </li>
            <li>
              <strong>Total:</strong> 101 database round trips for data that
              could be fetched in 2
            </li>
          </ul>
        ),
      },
    ],
  },
  dataloader: {
    title: "DataLoader — Batching & Caching",
    subtitle: "The industry-standard fix for the N+1 problem in GraphQL",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What is DataLoader?",
        accent: "#3b82f6",
        content: (
          <p>
            DataLoader is a utility (originally from Facebook) that sits between
            your resolvers and your data sources. Instead of each resolver
            firing its own query immediately, DataLoader{" "}
            <strong>collects all the IDs</strong> requested during the current
            event loop tick, then fires <strong>one batched query</strong> for
            all of them.
          </p>
        ),
      },
      {
        title: "How batching works",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              100 resolver calls → <code>loader.load(id1)</code>,{" "}
              <code>loader.load(id2)</code>, …, <code>loader.load(id100)</code>
            </li>
            <li>DataLoader waits for the current tick to finish</li>
            <li>
              Fires <strong>one query</strong>:{" "}
              <code>
                SELECT * FROM persons WHERE id IN ('id1', 'id2', …, 'id100')
              </code>
            </li>
            <li>Returns each result to the correct resolver</li>
            <li>
              <strong>Result:</strong> 2 queries instead of 101
            </li>
          </ul>
        ),
      },
      {
        title: "Why DataLoader, not just SQL JOINs?",
        accent: "#a78bfa",
        content: (
          <p>
            SQL JOINs only work when all data lives in one database. DataLoader
            works with <strong>any data source</strong> — other databases, REST
            APIs, microservices, even third-party services. It also provides{" "}
            <strong>per-request caching</strong>: if two claims share the same
            policyholder, the second call returns the cached result without
            hitting the database again.
          </p>
        ),
      },
    ],
  },
  "resolver-execution": {
    title: "GraphQL Resolver Execution Model",
    subtitle: "How GraphQL actually fetches data — it's NOT a database",
    accentColor: "#e535ab",
    sections: [
      {
        title: "GraphQL is an orchestration layer",
        accent: "#e535ab",
        content: (
          <p>
            GraphQL does <strong>not</strong> talk to your database directly. It
            doesn't know SQL. It doesn't store data. GraphQL is a{" "}
            <strong>query language for your API</strong> — an orchestration
            layer that sits between clients and your data sources. When a query
            arrives, GraphQL walks the query tree field by field, calling a{" "}
            <strong>resolver function</strong> for each field. Each resolver
            decides where to get its data: a database, another API, a cache, or
            even a calculation.
          </p>
        ),
      },
      {
        title: "Per-field resolution",
        accent: "#22c55e",
        content: (
          <p>
            Every field in a GraphQL schema can have its own resolver. When you
            query{" "}
            <code>{"{ claims { id, amount, policyholder { name } } }"}</code>,
            the engine first calls the <code>claims</code> resolver (which might
            query PostgreSQL), then for each claim it calls the{" "}
            <code>policyholder</code> resolver (which might call a different
            service). This per-field model is powerful but creates the N+1
            problem if you're not careful.
          </p>
        ),
      },
      {
        title: "Three data-fetching strategies",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>
              <strong>SQL JOIN:</strong> Do the JOIN in the resolver — 1 query,
              but only works for single-database setups
            </li>
            <li>
              <strong>Naive resolvers:</strong> Each field fetches independently
              — leads to N+1 problem (101 queries for 100 items)
            </li>
            <li>
              <strong>DataLoader batching:</strong> Collect IDs, batch into one
              WHERE IN query — 2 queries total, works across any data source
            </li>
          </ul>
        ),
      },
    ],
  },
};
