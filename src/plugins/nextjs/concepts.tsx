import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "nextjs-overview"
  | "server-components"
  | "client-components"
  | "hydration"
  | "streaming"
  | "caching"
  | "rsc-payload"
  | "file-routing"
  | "layouts";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "nextjs-overview": {
    title: "Next.js — The Big Picture",
    subtitle: "A web app operating system built on top of React",
    accentColor: "#0070f3",
    sections: [
      {
        title: "What Next.js is",
        content: (
          <>
            <p>
              React gives you <strong>components</strong>. Next.js gives you the{" "}
              <strong>machinery around those components</strong>: routing,
              server rendering, data fetching, caching, streaming, bundling, and
              deployment behaviour.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              Think of a restaurant. React is the chef who assembles dishes.
              Next.js is the whole restaurant system — menu, waiters, kitchen
              routing, prep stations, delivery timing, storage and reheating.
            </p>
          </>
        ),
      },
      {
        title: "When a user visits a URL",
        content: (
          <ol style={{ paddingLeft: "1.2rem" }}>
            <li>Which file matches that URL</li>
            <li>Which parts run on the server</li>
            <li>Which parts run in the browser</li>
            <li>What data needs to be fetched</li>
            <li>Whether the result can be cached</li>
            <li>Whether to send the full page or stream it in chunks</li>
            <li>How the browser becomes interactive afterward</li>
          </ol>
        ),
      },
      {
        title: "4 questions for every feature",
        content: (
          <>
            <p>
              <strong>1. Where does this run?</strong> — server or browser?
            </p>
            <p>
              <strong>2. When does this run?</strong> — build time, request
              time, or navigation time?
            </p>
            <p>
              <strong>3. What gets sent over the network?</strong> — HTML, RSC
              payload, JS bundle, streamed chunks?
            </p>
            <p>
              <strong>4. What gets reused?</strong> — layout, cached data,
              prerendered output, prefetched route data?
            </p>
          </>
        ),
      },
    ],
  },

  "server-components": {
    title: "React Server Components",
    subtitle: "Components that run on the server — the default in App Router",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What they are",
        content: (
          <>
            <p>
              A Server Component is a React component that runs on the{" "}
              <strong>server</strong>. It can directly call databases, use
              secrets, and talk to internal services — none of that code ships
              to the browser.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              In App Router, Server Components are the <strong>default</strong>.
              You don't need any special annotation — just write a component and
              it runs on the server.
            </p>
          </>
        ),
      },
      {
        title: "Why they matter",
        content: (
          <ul style={{ paddingLeft: "1.2rem" }}>
            <li>Less JavaScript shipped to the browser</li>
            <li>Secrets and DB logic stay on the server</li>
            <li>Initial rendering can be faster and lighter</li>
            <li>Data fetching happens before the user sees the page</li>
          </ul>
        ),
      },
      {
        title: "Mental model",
        content: (
          <p>
            Server Components = <strong>rehearsed backstage</strong>. The
            audience (browser) sees the finished result but never sees the
            preparation work.
          </p>
        ),
      },
    ],
  },

  "client-components": {
    title: "Client Components",
    subtitle: "'use client' — where interactivity lives",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "When you need them",
        content: (
          <>
            <p>
              If a component needs <code>useState</code>, <code>useEffect</code>
              , click handlers, or browser APIs — it must be a{" "}
              <strong>Client Component</strong>.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              Mark the boundary with <code>'use client'</code> at the top of the
              file. This tells Next.js: "this file, and everything it pulls into
              the client graph, must run in the browser."
            </p>
          </>
        ),
      },
      {
        title: "The boundary effect",
        content: (
          <>
            <p>
              <code>'use client'</code> is not just a local switch — it defines
              a boundary in the dependency tree. Everything imported by that
              file becomes part of the client bundle.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              Server tree = heavy machinery in the back room. Client tree =
              portable tools you ship to the user. Marking something client-side
              means it has to be portable.
            </p>
          </>
        ),
      },
    ],
  },

  hydration: {
    title: "Hydration",
    subtitle: "How pre-rendered HTML becomes interactive",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What it is",
        content: (
          <>
            <p>
              Hydration means React in the browser{" "}
              <strong>
                connects event handlers and client behaviour to already-rendered
                HTML
              </strong>
              .
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              Imagine the server sends a fully assembled car body. Hydration is
              the step where the engine and controls get hooked up so the car
              can move.
            </p>
          </>
        ),
      },
      {
        title: "The sequence",
        content: (
          <ol style={{ paddingLeft: "1.2rem" }}>
            <li>Receive prepared markup (HTML)</li>
            <li>Receive instructions for the component tree (RSC payload)</li>
            <li>Load client-side code only where needed</li>
            <li>Attach interactivity (hydration)</li>
          </ol>
        ),
      },
    ],
  },

  streaming: {
    title: "Streaming",
    subtitle: "Send the page in chunks as parts become ready",
    accentColor: "#22d3ee",
    sections: [
      {
        title: "How it works",
        content: (
          <>
            <p>
              Instead of "wait until the whole meal is ready," streaming says
              "bring the drinks now, starter next, main course when ready."
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              Next.js breaks a route into smaller chunks and progressively sends
              them. <code>loading.tsx</code> shows a placeholder while slower
              parts keep rendering on the server.
            </p>
          </>
        ),
      },
      {
        title: "When to use it",
        content: (
          <p>
            Streaming is best when some parts of your page are fast and some are
            slow. The user sees useful content immediately instead of staring at
            a blank screen.
          </p>
        ),
      },
    ],
  },

  caching: {
    title: "Caching & Revalidation",
    subtitle: "Store results to avoid recomputing work",
    accentColor: "#4ade80",
    sections: [
      {
        title: "The meal prep analogy",
        content: (
          <>
            <p>
              <strong>Fresh cooking every time</strong> = dynamic rendering.{" "}
              <strong>Pre-prepared food</strong> = cached.{" "}
              <strong>Refresh every so often</strong> = revalidation.
            </p>
          </>
        ),
      },
      {
        title: "Cache modes",
        content: (
          <ul style={{ paddingLeft: "1.2rem" }}>
            <li>
              <strong>Static</strong> — made ahead of time
            </li>
            <li>
              <strong>Dynamic</strong> — made when ordered
            </li>
            <li>
              <strong>Cached dynamic</strong> — made once, reused for a while
            </li>
            <li>
              <strong>Revalidated</strong> — replace the stored version when
              stale
            </li>
          </ul>
        ),
      },
      {
        title: "Why it's confusing",
        content: (
          <p>
            If Next.js internals ever feel confusing, it's usually because of
            one of three boundary types: route boundaries, server/client
            boundaries, or <strong>cache boundaries</strong>.
          </p>
        ),
      },
    ],
  },

  "rsc-payload": {
    title: "RSC Payload",
    subtitle: "Compact binary representation of the server-rendered tree",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What it is",
        content: (
          <p>
            The RSC payload is a{" "}
            <strong>compact, serialized binary representation</strong> of the
            rendered React Server Components tree. It's not HTML and it's not
            JSON — it's a custom streaming format designed for efficient DOM
            updates between server and client.
          </p>
        ),
      },
      {
        title: "What it contains",
        content: (
          <>
            <p>Each RSC payload carries three things:</p>
            <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem" }}>
              <li>
                <strong>Rendered component output</strong> — the final markup
                produced by Server Components (already executed on the server)
              </li>
              <li>
                <strong>Placeholders for Client Components</strong> — markers
                that tell React "load this <code>'use client'</code> component
                here" with references to the JS bundle chunks
              </li>
              <li>
                <strong>Serialized props</strong> — data passed from Server
                Components to Client Components, transferred across the
                server→client boundary
              </li>
            </ul>
          </>
        ),
      },
      {
        title: "Why it matters",
        content: (
          <p>
            Because the payload streams, React can start updating the DOM before
            the entire response finishes. The browser never rebuilds the
            component tree from scratch — it receives pre-rendered output and
            only loads client JS where <code>'use client'</code> boundaries
            exist. This is why Server Components ship{" "}
            <strong>zero JavaScript</strong> to the browser, and why SPA-style
            navigations in Next.js feel instant: only a lightweight RSC payload
            is fetched instead of a full HTML page.
          </p>
        ),
      },
    ],
  },

  "file-routing": {
    title: "File-Based Routing",
    subtitle: "The filesystem is the router API",
    accentColor: "#4ade80",
    sections: [
      {
        title: "How it works",
        content: (
          <>
            <p>
              Create <code>app/dashboard/page.tsx</code> → that becomes{" "}
              <code>/dashboard</code>. Create{" "}
              <code>app/blog/[slug]/page.tsx</code> → dynamic route.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              Folders = branches in a road map. <code>page.tsx</code> =
              destination screen. <code>layout.tsx</code> = reusable shell.{" "}
              <code>loading.tsx</code> = temporary placeholder.{" "}
              <code>error.tsx</code> = fallback when something breaks.
            </p>
          </>
        ),
      },
    ],
  },

  layouts: {
    title: "Nested Layouts",
    subtitle: "Persistent shells that survive navigation",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "How they work",
        content: (
          <>
            <p>
              Layouts are like transparent layers — global app frame, dashboard
              frame, page content. When you navigate, Next.js can keep outer
              layers and only replace the inner part that changed.
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              This is like changing the content inside a picture frame without
              rebuilding the whole wall. Navigation feels smooth because layouts
              don't re-render unnecessarily.
            </p>
          </>
        ),
      },
      {
        title: "Hotel analogy",
        content: (
          <p>
            Old websites make you leave the building and re-enter through the
            front door for every room. Next.js just walks you down the hallway
            and opens the next door.
          </p>
        ),
      },
    ],
  },
};
