import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "httpVsHttps"
  | "browserCache"
  | "cdnCache"
  | "cacheControl"
  | "etagValidation";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  httpVsHttps: {
    title: "HTTP vs HTTPS",
    subtitle: "How data is transported",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "HTTP",
        accent: "#3b82f6",
        content: (
          <p>
            Plain text communication over TCP. No encryption. Rarely used
            directly anymore.
          </p>
        ),
      },
      {
        title: "HTTPS",
        accent: "#22c55e",
        content: (
          <>
            <p>
              HTTP <strong>over TLS</strong> (encryption). Before any request is
              sent, a TLS handshake establishes encryption keys. Then HTTP
              messages travel securely.
            </p>
            <p>
              <strong>Key insight:</strong> HTTP vs HTTPS changes{" "}
              <em>security and connection setup cost</em> — it does{" "}
              <strong>not</strong> change caching behavior.
            </p>
          </>
        ),
      },
    ],
  },

  browserCache: {
    title: "Browser Cache",
    subtitle: "The closest cache to the user",
    accentColor: "#22c55e",
    sections: [
      {
        title: "How it works",
        accent: "#22c55e",
        content: (
          <>
            <p>
              The browser stores responses locally. On the next request for the
              same resource, it checks: "Do I already have this? Is it still
              fresh?"
            </p>
            <p>
              If <code>Cache-Control: max-age</code> hasn't expired → instant
              load, <strong>no network request at all</strong>.
            </p>
          </>
        ),
      },
      {
        title: "Characteristics",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Per user, per device</li>
            <li>Closest possible cache → fastest response (~5ms)</li>
            <li>Controlled by HTTP response headers</li>
          </ul>
        ),
      },
    ],
  },

  cdnCache: {
    title: "CDN (Edge Cache)",
    subtitle: "Shared cache geographically distributed",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "How it works",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              A CDN sits between browsers and your origin server. Edge servers
              are distributed globally. When a request arrives, the nearest edge
              checks its cache.
            </p>
            <p>
              <strong>Cache HIT</strong> → returns immediately, no origin
              request. <strong>Cache MISS</strong> → fetches from origin, stores
              the result, then returns it.
            </p>
          </>
        ),
      },
      {
        title: "Characteristics",
        accent: "#8b5cf6",
        content: (
          <ul>
            <li>Shared across many users</li>
            <li>Geographically distributed (~40ms latency)</li>
            <li>Reduces origin load significantly</li>
            <li>Great for static assets (JS, CSS, images)</li>
          </ul>
        ),
      },
    ],
  },

  cacheControl: {
    title: "Cache-Control Header",
    subtitle: "max-age vs no-cache vs no-store — what each one actually does",
    accentColor: "#f59e0b",
    aside: (
      <div>
        <h4>Quick reference</h4>
        <table>
          <thead>
            <tr>
              <th>Directive</th>
              <th>Stores?</th>
              <th>Reuses freely?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>max-age</td>
              <td style={{ color: "#86efac" }}>✅ yes</td>
              <td style={{ color: "#86efac" }}>✅ until expiry</td>
            </tr>
            <tr>
              <td>no-cache</td>
              <td style={{ color: "#86efac" }}>✅ yes</td>
              <td style={{ color: "#fde68a" }}>⚠ must validate</td>
            </tr>
            <tr>
              <td>no-store</td>
              <td style={{ color: "#fca5a5" }}>❌ no</td>
              <td style={{ color: "#fca5a5" }}>❌ no</td>
            </tr>
          </tbody>
        </table>
        <div className="info-divider" />
        <p style={{ marginTop: "0.5rem" }}>
          <strong style={{ color: "#e2e8f0" }}>Key rule:</strong>
          <br />
          HTTP/HTTPS controls <em>security</em>.
          <br />
          Cache-Control controls <em>whether data needs to travel at all</em>.
        </p>
      </div>
    ),
    sections: [
      {
        title: "⚡ max-age — freshness lifetime",
        accent: "#22c55e",
        content: (
          <>
            <p>
              <code>Cache-Control: max-age=3600</code>
            </p>
            <p>
              "Store this response and serve it freely for{" "}
              <strong>3600 seconds</strong>. Don't ask me again until it
              expires."
            </p>
            <div className="info-divider" />
            <p>
              <strong>Timeline</strong>
            </p>
            <ul>
              <li>t=0 → fetch from origin, cache it</li>
              <li>t=1800 → browser/CDN use cache ✅ (zero network)</li>
              <li>t=3600 → cache expires → must revalidate ❗</li>
            </ul>
            <div className="info-divider" />
            <p>
              <strong>Mental model:</strong> "Keep it in your fridge and eat it
              freely for an hour."
            </p>
            <p>
              <strong>When to use:</strong> Static assets (JS bundles, images)
              with versioned filenames. Cache for a year:{" "}
              <code>max-age=31536000</code>.
            </p>
          </>
        ),
      },
      {
        title: "🤯 no-cache — the badly named one",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              <strong>
                Despite the name, <code>no-cache</code> does NOT mean "don't
                cache".
              </strong>
            </p>
            <p>
              It means: "Store it, but <em>check with me before using it</em>."
            </p>
            <div className="info-divider" />
            <p>
              <strong>What actually happens on every request:</strong>
            </p>
            <ol style={{ paddingLeft: "1.2rem", margin: "0.4rem 0" }}>
              <li style={{ marginBottom: "0.3rem" }}>
                Browser finds the resource in cache
              </li>
              <li style={{ marginBottom: "0.3rem" }}>
                Browser sends: <code>If-None-Match: "v1"</code>
              </li>
              <li style={{ marginBottom: "0.3rem" }}>
                Server replies <code>304 Not Modified</code> → use your copy
              </li>
              <li>
                OR server replies <code>200 OK</code> → here's a new version
              </li>
            </ol>
            <div className="info-divider" />
            <p>
              <strong>Trade-off:</strong> Saves bandwidth (no body on 304) but
              still needs a round-trip for every request.
            </p>
            <p>
              <strong>Mental model:</strong> "Keep it in your fridge, but call
              me before eating it."
            </p>
            <p>
              <strong>When to use:</strong> API data that changes frequently.
              HTML pages (so users always see fresh content).
            </p>
          </>
        ),
      },
      {
        title: "🚫 no-store — nothing cached, ever",
        accent: "#ef4444",
        content: (
          <>
            <p>
              <code>Cache-Control: no-store</code>
            </p>
            <p>
              "Do NOT store this response anywhere. Every request must go to
              origin."
            </p>
            <div className="info-divider" />
            <ul>
              <li>Browser cannot cache it</li>
              <li>CDN cannot cache it</li>
              <li>No intermediate proxy can cache it</li>
              <li>Slowest — always full origin round-trip</li>
            </ul>
            <div className="info-divider" />
            <p>
              <strong>Mental model:</strong> "Don't even put it in your fridge."
            </p>
            <p>
              <strong>When to use:</strong> Banking pages, auth tokens, personal
              user data — anything sensitive that must never be stored.
            </p>
          </>
        ),
      },
      {
        title: "🌍 CDN vs Browser — controlling them separately",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              By default, <code>max-age</code> applies to <em>both</em> the
              browser cache and CDN. You can split them with two extra
              directives:
            </p>
            <table>
              <thead>
                <tr>
                  <th>Directive</th>
                  <th>Affects</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>private</td>
                  <td>Browser only — CDN will not cache</td>
                </tr>
                <tr>
                  <td>public</td>
                  <td>Both browser and CDN (CDN default)</td>
                </tr>
                <tr>
                  <td>s-maxage</td>
                  <td>CDN only (overrides max-age for CDN)</td>
                </tr>
              </tbody>
            </table>
            <p style={{ marginTop: "0.6rem" }}>
              Example: cache in CDN for 1 day but never in the user's browser:
            </p>
            <p>
              <code>Cache-Control: public, no-cache, s-maxage=86400</code>
            </p>
          </>
        ),
      },
    ],
  },

  etagValidation: {
    title: "ETag & 304 Not Modified",
    subtitle: "Conditional request validation",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "How it works",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              The server includes an <code>ETag: "abc123"</code> header — a
              version fingerprint of the resource.
            </p>
            <p>
              On the next request, the browser sends{" "}
              <code>If-None-Match: "abc123"</code>. If the resource hasn't
              changed, the server replies with <code>304 Not Modified</code> —
              use your cached copy.
            </p>
            <p>
              This saves bandwidth (no body transferred) but still requires a
              network round-trip for validation.
            </p>
          </>
        ),
      },
    ],
  },
};
