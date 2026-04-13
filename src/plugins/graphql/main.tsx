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
import { useGraphqlAnimation, type Signal } from "./useGraphqlAnimation";
import { type GraphqlState, type VariantKey } from "./graphqlSlice";
import { getAdapter, TOPICS } from "./graphql-adapters";
import type { TopicKey } from "./graphql-adapters";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1300;
const H = 700;

/* ── Concept pills per topic ─────────────────────────── */
const Q1_PILLS: { key: ConceptKey; label: string }[] = [
  { key: "cognito", label: "Cognito" },
  { key: "graphql-overview", label: "AppSync" },
  { key: "rest-overview", label: "API Gateway" },
  { key: "schema", label: "Schema (SDL)" },
  { key: "over-fetching", label: "Over-fetching" },
  { key: "resolver", label: "Lambda Resolvers" },
];

const TOPIC_PILLS: Record<TopicKey, { key: ConceptKey; label: string }[]> = {
  "graphql-vs-rest": Q1_PILLS,
  "queries-vs-mutations-vs-subscriptions": [
    { key: "query-op", label: "Query" },
    { key: "mutation-op", label: "Mutation" },
    { key: "subscription-op", label: "Subscription" },
    { key: "schema", label: "Schema (SDL)" },
  ],
  "resolvers-data-fetching": [
    { key: "resolver-execution", label: "Resolver Model" },
    { key: "n-plus-1", label: "N+1 Problem" },
    { key: "dataloader", label: "DataLoader" },
    { key: "resolver", label: "Lambda Resolvers" },
  ],
};

/* ── Interview questions per topic ───────────────────── */
const TOPIC_QUESTIONS: Record<TopicKey, string> = {
  "graphql-vs-rest":
    "What are the main differences between GraphQL and REST, and why might you choose GraphQL?",
  "queries-vs-mutations-vs-subscriptions":
    "Distinguish between GraphQL queries, mutations and subscriptions.",
  "resolvers-data-fetching":
    "How does GraphQL fetch data from the database? Walk me through what happens under the hood when a nested query runs.",
};

/* ── Code examples per variant ───────────────────────── */
const CODE_EXAMPLES: Record<
  VariantKey,
  {
    client: { label: string; code: string };
    server: { label: string; code: string };
  }
> = {
  "graphql-approach": {
    client: {
      label: "Client — Amplify SDK",
      code: `import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { signIn } from 'aws-amplify/auth';

// Cognito auth
await signIn({ username, password });

const client = generateClient();
const { data } = await client.graphql({
  query: \`
    query GetUser($id: ID!) {
      user(id: $id) {
        name email avatar
      }
    }
  \`,
  variables: { id: "u-42" },
});
// → JWT attached automatically
// → single request, exact fields`,
    },
    server: {
      label: "Lambda Resolver — userResolver",
      code: `import { DynamoDBClient, GetItemCommand }
  from '@aws-sdk/client-dynamodb';

const ddb = new DynamoDBClient({});

export const handler = async (event) => {
  const { id } = event.arguments;
  const { Item } = await ddb.send(
    new GetItemCommand({
      TableName: 'UsersTable',
      Key: { PK: { S: id } },
      ProjectionExpression:
        '#n, avatar, bio, #loc',
      ExpressionAttributeNames: {
        '#n': 'name', '#loc': 'location',
      },
    })
  );
  return Item;
};`,
    },
  },
  "rest-approach": {
    client: {
      label: "Client — Fetch (3 calls)",
      code: `import { fetchAuthSession } from 'aws-amplify/auth';

// Get Cognito JWT
const { tokens } = await fetchAuthSession();
const jwt = tokens.idToken.toString();
const base = 'https://api.example.com';
const headers = { Authorization: jwt };

const [user, posts, profile] =
  await Promise.all([
    fetch(\`\${base}/users/u-42\`, { headers }),
    fetch(\`\${base}/posts?userId=u-42\`, { headers }),
    fetch(\`\${base}/profile/u-42\`, { headers }),
  ]).then(rs => rs.map(r => r.json()));

// → 3 round-trips + auth header each
// → over-fetching on every response`,
    },
    server: {
      label: "Lambda Handler — getUser",
      code: `import { Client } from 'pg';

const pg = new Client({
  host: process.env.RDS_HOST,
  database: 'app',
});
await pg.connect();

export const handler = async (event) => {
  const id = event.pathParameters.id;
  const { rows } = await pg.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  // Returns ALL columns (12 fields)
  // Client only uses 3 → over-fetch
  return {
    statusCode: 200,
    body: JSON.stringify(rows[0]),
  };
};`,
    },
  },
  "query-op": {
    client: {
      label: "Client — Query",
      code: `import { generateClient } from 'aws-amplify/api';

const client = generateClient();
const { data } = await client.graphql({
  query: \`
    query GetUser($id: ID!) {
      user(id: $id) {
        name
        email
        avatar
      }
    }
  \`,
  variables: { id: "u-42" },
});
// → Read-only, no side effects
// → Cacheable by AppSync`,
    },
    server: {
      label: "Resolver — GetItem",
      code: `// VTL request mapping template
{
  "operation": "GetItem",
  "key": {
    "PK": { "S": "$ctx.args.id" }
  },
  "projection": {
    "expression": "#n, email, avatar",
    "expressionNames": {
      "#n": "name"
    }
  }
}
// → Only requested fields fetched`,
    },
  },
  "mutation-op": {
    client: {
      label: "Client — Mutation",
      code: `import { generateClient } from 'aws-amplify/api';

const client = generateClient();
const { data } = await client.graphql({
  query: \`
    mutation CreatePost($input: PostInput!) {
      createPost(input: $input) {
        id
        title
      }
    }
  \`,
  variables: {
    input: {
      title: "Hello World",
      userId: "u-42",
    },
  },
});
// → Write operation, has side effects
// → Triggers onCreatePost subscription`,
    },
    server: {
      label: "Resolver — PutItem",
      code: `// VTL request mapping template
{
  "operation": "PutItem",
  "key": {
    "PK": { "S": "$util.autoId()" }
  },
  "attributeValues": {
    "title": { "S": "$ctx.args.input.title" },
    "userId": { "S": "$ctx.args.input.userId" },
    "createdAt": { "S": "$util.time.nowISO8601()" }
  }
}
// → Side effects: top-level only
// → Triggers subscription fan-out`,
    },
  },
  "subscription-op": {
    client: {
      label: "Client — Subscription",
      code: `import { generateClient } from 'aws-amplify/api';

const client = generateClient();
const sub = client.graphql({
  query: \`
    subscription OnCreatePost {
      onCreatePost {
        id
        title
      }
    }
  \`,
}).subscribe({
  next: (event) => {
    console.log('New post:', event.data);
  },
  error: (err) => console.error(err),
});
// → WebSocket, server pushes data
// → No polling needed`,
    },
    server: {
      label: "Schema — Subscription Type",
      code: `type Subscription {
  onCreatePost: Post
    @aws_subscribe(mutations: ["createPost"])
}

type Mutation {
  createPost(input: PostInput!): Post
}

type Post {
  id: ID!
  title: String!
  userId: String!
  createdAt: AWSDateTime!
}
// → AppSync manages WebSocket
// → Auto fan-out to subscribers`,
    },
  },
  "sql-join-resolver": {
    client: {
      label: "Client — Nested Query",
      code: `const { data } = await client.graphql({
  query: \`
    query GetClaims {
      claims {
        id
        amount
        status
        policyholder {
          name
          email
        }
      }
    }
  \`,
});
// → One request, nested fields
// → How does the server get
//   policyholder data?`,
    },
    server: {
      label: "Resolver — SQL JOIN",
      code: `// claims resolver — single query
const resolvers = {
  Query: {
    claims: async () => {
      const { rows } = await pg.query(\`
        SELECT c.id, c.amount, c.status,
               p.name, p.email
        FROM claims c
        JOIN persons p
          ON c.policyholder_id = p.id
      \`);
      return rows;
    }
  }
};
// → 1 query (JOIN) gets everything
// → Only works for single-DB setups`,
    },
  },
  "naive-resolvers": {
    client: {
      label: "Client — Same Query",
      code: `const { data } = await client.graphql({
  query: \`
    query GetClaims {
      claims {
        id
        amount
        policyholder {
          name
        }
      }
    }
  \`,
});
// → Same query as before
// → But the server handles it
//   very differently…`,
    },
    server: {
      label: "Resolvers — Naive (N+1)",
      code: `const resolvers = {
  Query: {
    // Query 1: get all claims
    claims: async () => {
      const { rows } = await pg.query(
        'SELECT * FROM claims'
      );
      return rows; // 100 claims
    }
  },
  Claim: {
    // Runs ONCE PER CLAIM (100×)
    policyholder: async (claim) => {
      const { rows } = await pg.query(
        'SELECT * FROM persons WHERE id = $1',
        [claim.policyholder_id]
      );
      return rows[0];
    }
  }
};
// → 1 + 100 = 101 queries!
// → This is the N+1 problem`,
    },
  },
  "dataloader-batching": {
    client: {
      label: "Client — Same Query",
      code: `const { data } = await client.graphql({
  query: \`
    query GetClaims {
      claims {
        id
        amount
        policyholder {
          name
        }
      }
    }
  \`,
});
// → Exact same query
// → Client doesn't know about
//   DataLoader — it's server-side`,
    },
    server: {
      label: "Resolvers — With DataLoader",
      code: `import DataLoader from 'dataloader';

// Created per-request
const personLoader = new DataLoader(
  async (ids) => {
    // ONE query for ALL ids
    const { rows } = await pg.query(
      'SELECT * FROM persons WHERE id = ANY($1)',
      [ids]
    );
    // Return in same order as ids
    return ids.map(id =>
      rows.find(r => r.id === id)
    );
  }
);

const resolvers = {
  Claim: {
    policyholder: (claim) =>
      personLoader.load(claim.policyholder_id)
      // DataLoader batches 100 load()
      // calls into 1 SQL query
  }
};
// → 1 + 1 = 2 queries total!`,
    },
  },
};

const GraphqlVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useGraphqlAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as GraphqlState;
  const { explanation, hotZones, phase, variant, topic } = st;
  const adapter = getAdapter(variant);
  const hot = (zone: string) => hotZones.includes(zone);
  const activeTopic = TOPICS.find((t) => t.id === topic);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    adapter.buildTopology(b, st, { hot, phase });

    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig: Signal) => {
          const { id, colorClass, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, {
            key: id,
            className: colorClass,
          });
        });
      });
    }

    return b;
  })();

  /* ── Mount (once) / commit (updates) VizCraft scene ── */
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
      /* Subsequent updates — commit in-place, restore viewport */
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

  /* ── Pills for current topic ────────────────────────── */
  const pills = (TOPIC_PILLS[topic] ?? []).map((p) => ({
    key: p.key,
    label: p.label,
    color: "#f9a8d4",
    borderColor: "#e535ab",
  }));

  /* ── Stat badges from adapter ───────────────────────── */
  const badges = adapter.getStatBadges(st);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`graphql-root graphql-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="graphql-stage">
            <StageHeader
              title="GraphQL"
              subtitle={`${activeTopic?.label ?? topic} — ${adapter.profile.label}`}
            >
              {badges.map((badge) => (
                <StatBadge
                  key={badge.label}
                  label={badge.label}
                  value={badge.value}
                  className={`graphql-phase graphql-phase--${phase}`}
                />
              ))}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            {TOPIC_QUESTIONS[topic] && (
              <SideCard label="Interview Question" variant="info">
                <p style={{ fontStyle: "italic", color: "#94a3b8" }}>
                  {TOPIC_QUESTIONS[topic]}
                </p>
              </SideCard>
            )}
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
            <SideCard label="Active Variant" variant="info">
              <p style={{ color: adapter.colors.stroke, fontWeight: 600 }}>
                {adapter.profile.label}
              </p>
              <p>{adapter.profile.description}</p>
            </SideCard>
            <SideCard
              label={CODE_EXAMPLES[variant].client.label}
              variant="code"
            >
              <pre className="graphql-code">
                {CODE_EXAMPLES[variant].client.code}
              </pre>
            </SideCard>
            <SideCard
              label={CODE_EXAMPLES[variant].server.label}
              variant="code"
            >
              <pre className="graphql-code">
                {CODE_EXAMPLES[variant].server.code}
              </pre>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default GraphqlVisualization;
