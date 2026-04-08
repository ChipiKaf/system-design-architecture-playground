import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "rest-overview"
  | "http-methods"
  | "uri-design"
  | "status-codes"
  | "richardson-maturity"
  | "api-versioning"
  | "hateoas"
  | "json-serialization"
  | "statelessness";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "rest-overview": {
    title: "REST (Representational State Transfer)",
    subtitle: "Architectural style for designing networked applications",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What is REST?",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              REST was introduced by <strong>Roy Fielding (2000)</strong> as an
              alternative to SOAP/WSDL. It enables easy and fast client-server
              communication, running on top of <strong>HTTP</strong>.
            </p>
            <p style={{ marginTop: 8 }}>
              REST focuses on <strong>transferring representations of resources</strong>.
              A resource is any named entity (a product, a customer, an order)
              identified by a URI.
            </p>
          </>
        ),
      },
      {
        title: "Six Constraints",
        accent: "#3b82f6",
        content: (
          <ul>
            <li><strong>Stateless</strong> — each request carries all context needed</li>
            <li><strong>Uniform Interface</strong> — consistent resource patterns</li>
            <li><strong>Cacheable</strong> — responses can be cached for performance</li>
            <li><strong>Client-Server</strong> — separation of concerns</li>
            <li><strong>Layered System</strong> — intermediaries (gateways, proxies)</li>
            <li><strong>Code on Demand</strong> — optional server-sent code</li>
          </ul>
        ),
      },
    ],
  },

  "http-methods": {
    title: "HTTP Methods (Verbs)",
    subtitle: "Core operations for RESTful APIs",
    accentColor: "#ef4444",
    sections: [
      {
        title: "CRUD Mapping",
        accent: "#ef4444",
        content: (
          <ul>
            <li><strong>GET</strong> — Retrieve information (safe, idempotent)</li>
            <li><strong>HEAD</strong> — Retrieve resource headers only</li>
            <li><strong>POST</strong> — Submit/create data (not idempotent)</li>
            <li><strong>PUT</strong> — Save/replace entire object at location (idempotent)</li>
            <li><strong>DELETE</strong> — Delete the object at location (idempotent)</li>
            <li><strong>PATCH</strong> — Update a single piece of data (partial update)</li>
          </ul>
        ),
      },
      {
        title: "Idempotency",
        accent: "#ef4444",
        content: (
          <p>
            An operation is <strong>idempotent</strong> if calling it multiple
            times produces the same result. GET, PUT, DELETE, and HEAD are
            idempotent. POST is not — sending the same POST twice creates two
            resources.
          </p>
        ),
      },
    ],
  },

  "uri-design": {
    title: "URI Design Rules",
    subtitle: "Best practices for RESTful resource URIs",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Rule 1: Nouns, not verbs",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              URIs represent resources (nouns). The HTTP method provides the verb.
            </p>
            <ul style={{ marginTop: 8 }}>
              <li>✅ Correct: <code>/products</code></li>
              <li>❌ Wrong: <code>/create-product</code> or <code>/getProducts</code></li>
            </ul>
          </>
        ),
      },
      {
        title: "Rule 2: Unique identifiers",
        accent: "#f59e0b",
        content: (
          <p>
            Every resource has a unique identifier. <code>/products/4</code>{" "}
            returns the single product with id=4. API frameworks route
            requests based on parameterized URI paths like{" "}
            <code>/products/{"{id}"}</code>.
          </p>
        ),
      },
      {
        title: "Rule 3: Nested resources",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Use <strong>collection/item/collection</strong> for relationships:
              <code>/customers/1/orders</code>. Avoid deep nesting beyond two
              levels — split across separate calls instead.
            </p>
            <ul style={{ marginTop: 8 }}>
              <li>✅ <code>/customers/6/orders</code> then <code>/orders/22/products</code></li>
              <li>❌ <code>/customers/6/orders/22/products</code></li>
            </ul>
          </>
        ),
      },
    ],
  },

  "status-codes": {
    title: "HTTP Status Codes",
    subtitle: "Communicating request outcomes through standard codes",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Common Codes",
        accent: "#22c55e",
        content: (
          <ul>
            <li><strong>200 OK</strong> — Successful GET, PUT, PATCH, DELETE</li>
            <li><strong>201 Created</strong> — Successful POST (resource created)</li>
            <li><strong>204 No Content</strong> — Success with no response body</li>
            <li><strong>400 Bad Request</strong> — Invalid input from client</li>
            <li><strong>401 Unauthorized</strong> — Authentication required</li>
            <li><strong>403 Forbidden</strong> — Authenticated but not authorized</li>
            <li><strong>404 Not Found</strong> — Resource does not exist</li>
            <li><strong>409 Conflict</strong> — Resource state conflict</li>
            <li><strong>500 Internal Server Error</strong> — Unhandled server failure</li>
          </ul>
        ),
      },
    ],
  },

  "richardson-maturity": {
    title: "Richardson Maturity Model",
    subtitle: "Four levels of REST maturity",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "The Levels",
        accent: "#8b5cf6",
        content: (
          <ul>
            <li><strong>Level 0</strong> — Single URI, all operations via POST (RPC-style)</li>
            <li><strong>Level 1</strong> — Separate URIs for individual resources</li>
            <li><strong>Level 2</strong> — Use HTTP methods (GET, POST, PUT, DELETE) on resources</li>
            <li><strong>Level 3</strong> — HATEOAS: use hypermedia links in responses</li>
          </ul>
        ),
      },
      {
        title: "In Practice",
        accent: "#8b5cf6",
        content: (
          <p>
            Most mature APIs are at <strong>Level 2</strong>. Level 3 (HATEOAS)
            is theoretically ideal but adds response overhead. Few real-world
            APIs implement it fully. Strive for at least Level 2 with proper
            resource URIs and HTTP method semantics.
          </p>
        ),
      },
    ],
  },

  "api-versioning": {
    title: "API Versioning Strategies",
    subtitle: "Managing API evolution without breaking clients",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "Why Version?",
        accent: "#8b5cf6",
        content: (
          <p>
            When an API changes, it may break communications with dependent
            microservices. Services add new features or bug fixes that require
            changing existing APIs. Changes should be{" "}
            <strong>backward compatible</strong> and not break any communications.
          </p>
        ),
      },
      {
        title: "Common Strategies",
        accent: "#8b5cf6",
        content: (
          <ul>
            <li>
              <strong>URI Versioning</strong>: <code>/api/v1/products</code>,{" "}
              <code>/api/v2/products</code> — most explicit, easy to route
            </li>
            <li>
              <strong>Header Versioning</strong>: Client sends{" "}
              <code>X-API-Version: 2</code> — keeps URLs clean
            </li>
            <li>
              <strong>Query Parameter</strong>:{" "}
              <code>/products?version=2</code> — simplest but least RESTful
            </li>
          </ul>
        ),
      },
    ],
  },

  hateoas: {
    title: "HATEOAS",
    subtitle: "Hypermedia As The Engine Of Application State",
    accentColor: "#22c55e",
    sections: [
      {
        title: "How It Works",
        accent: "#22c55e",
        content: (
          <>
            <p>
              HATEOAS means every API response includes{" "}
              <strong>links to related actions</strong>. The client discovers what
              it can do next by following links — no need to hardcode URL
              patterns.
            </p>
            <p style={{ marginTop: 8 }}>
              Example: A product response includes <code>_links.orders</code>,{" "}
              <code>_links.update</code>, <code>_links.delete</code>. The client
              navigates the API like a web browser follows links.
            </p>
          </>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Fully self-discoverable API</li>
            <li>Server controls available state transitions</li>
            <li>More verbose responses</li>
            <li>Rarely implemented in practice</li>
          </ul>
        ),
      },
    ],
  },

  "json-serialization": {
    title: "JSON in REST APIs",
    subtitle: "The standard data format for RESTful communication",
    accentColor: "#ec4899",
    sections: [
      {
        title: "Why JSON?",
        accent: "#ec4899",
        content: (
          <>
            <p>
              REST APIs typically use <strong>JSON</strong> (JavaScript Object
              Notation) for request and response bodies. It is human-readable,
              lightweight, and natively supported by every modern language and
              framework.
            </p>
            <p style={{ marginTop: 8 }}>
              Example:{" "}
              <code>
                {`{"productId":1,"name":"iPhone","price":44.90,"category":"Electronics"}`}
              </code>
            </p>
          </>
        ),
      },
      {
        title: "Content Negotiation",
        accent: "#ec4899",
        content: (
          <p>
            Clients specify <code>Accept: application/json</code> and servers
            set <code>Content-Type: application/json</code>. While REST can
            use other formats (XML, YAML), JSON dominates modern API design.
          </p>
        ),
      },
    ],
  },

  statelessness: {
    title: "Statelessness",
    subtitle: "Each request carries all the context needed",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "What It Means",
        accent: "#14b8a6",
        content: (
          <p>
            REST is <strong>stateless</strong> — the server does not store
            client session state between requests. Every request contains all
            information needed to process it (authentication tokens, parameters,
            etc.). This makes horizontal scaling straightforward.
          </p>
        ),
      },
      {
        title: "Benefits",
        accent: "#14b8a6",
        content: (
          <ul>
            <li>Any server instance can handle any request</li>
            <li>Easy horizontal scaling behind load balancers</li>
            <li>Simpler server design — no sticky sessions</li>
            <li>Better fault tolerance — client retries hit any instance</li>
          </ul>
        ),
      },
    ],
  },
};
