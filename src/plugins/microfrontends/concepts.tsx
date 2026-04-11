import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "micro-frontends"
  | "module-federation"
  | "remote-entry"
  | "shared-deps"
  | "iframe-isolation"
  | "error-boundary"
  | "strategy-comparison";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "micro-frontends": {
    title: "Micro-frontends",
    subtitle: "Independently deployable frontend modules",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "What are they?",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              Micro-frontends extend microservice principles to the frontend.
              Each feature or page is owned by a <strong>separate team</strong>,
              built in its own repo, and deployed independently.
            </p>
            <p>
              The <em>Host Shell</em> acts as the container — it provides
              routing, authentication, and layout, then loads each remote module
              into designated slots at runtime.
            </p>
          </>
        ),
      },
      {
        title: "Key benefits",
        accent: "#8b5cf6",
        content: (
          <ul>
            <li>
              <strong>Independent deploys</strong> — ship without coordinating
              with other teams
            </li>
            <li>
              <strong>Tech diversity</strong> — each MFE can use its own
              framework version
            </li>
            <li>
              <strong>Smaller bundles</strong> — lazy-load only what the user
              needs
            </li>
            <li>
              <strong>Team autonomy</strong> — full ownership from code to
              production
            </li>
          </ul>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#8b5cf6",
        content: (
          <ul>
            <li>Operational complexity (more CI pipelines, more deploys)</li>
            <li>Shared state and cross-MFE communication are harder</li>
            <li>Consistent UX requires a shared design system</li>
            <li>Runtime integration introduces new failure modes</li>
          </ul>
        ),
      },
    ],
  },

  "module-federation": {
    title: "Module Federation",
    subtitle: "Webpack 5 / Vite runtime module sharing",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "How it works",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              Module Federation lets a JavaScript application dynamically load
              code from another independently deployed application at
              <strong> runtime</strong> — not at build time.
            </p>
            <p>
              Each remote declares what it <em>exposes</em> (components,
              utilities). The host declares what it <em>consumes</em>. At
              runtime, the federation runtime negotiates shared dependencies and
              wires everything together.
            </p>
          </>
        ),
      },
      {
        title: "Expose / consume config",
        accent: "#3b82f6",
        content: (
          <pre
            style={{
              fontSize: 12,
              color: "#e2e8f0",
              background: "#0f172a",
              padding: 12,
              borderRadius: 8,
              whiteSpace: "pre-wrap",
            }}
          >
            {`// Remote (vite.config.ts)
federation({
  name: "dashboard",
  exposes: {
    "./DashboardApp": "./src/App.tsx",
  },
  shared: ["react", "react-dom"],
})

// Host
federation({
  name: "shell",
  remotes: {
    dashboard: "http://cdn/dashboard/remoteEntry.js",
  },
  shared: ["react", "react-dom"],
})`}
          </pre>
        ),
      },
      {
        title: "When to use",
        accent: "#3b82f6",
        content: (
          <p>
            Best when teams need <strong>deep integration</strong> — shared
            routing, shared React context, seamless UX. The trade-off is build
            tooling complexity and version coupling for shared deps.
          </p>
        ),
      },
    ],
  },

  "remote-entry": {
    title: "remoteEntry.js",
    subtitle: "The manifest that maps modules to chunks",
    accentColor: "#10b981",
    sections: [
      {
        title: "What is it?",
        accent: "#10b981",
        content: (
          <>
            <p>
              <code>remoteEntry.js</code> is the file Module Federation
              generates for each remote. It's a small JavaScript manifest that
              registers the remote's exposed modules with the federation
              runtime.
            </p>
            <p>
              When the host fetches this file, it learns <em>what</em> modules
              exist and <em>how</em> to load them — but no actual component code
              is downloaded yet. The real chunks are fetched lazily on demand.
            </p>
          </>
        ),
      },
      {
        title: "Discovery flow",
        accent: "#10b981",
        content: (
          <ol>
            <li>Host loads → federation runtime initialised</li>
            <li>
              Runtime fetches each remote's <code>remoteEntry.js</code>
            </li>
            <li>Manifest registers available modules + chunk URLs</li>
            <li>
              Later, <code>{'import("dashboard/DashboardApp")'}</code> triggers
              actual chunk fetch
            </li>
          </ol>
        ),
      },
      {
        title: "Failure handling",
        accent: "#10b981",
        content: (
          <p>
            If <code>remoteEntry.js</code> fails to load (404, 500, timeout),
            the dynamic <code>import()</code> rejects. Your Error Boundary
            catches this and shows a fallback. The rest of the app remains
            functional.
          </p>
        ),
      },
    ],
  },

  "shared-deps": {
    title: "Shared Dependencies",
    subtitle: "Singleton negotiation at runtime",
    accentColor: "#06b6d4",
    sections: [
      {
        title: "The problem",
        accent: "#06b6d4",
        content: (
          <p>
            If every micro-frontend bundles its own copy of React, the user
            downloads it multiple times. Worse, multiple React instances cause
            hooks to break — <code>useState</code> from one instance doesn't
            work inside a component rendered by another.
          </p>
        ),
      },
      {
        title: "How sharing works",
        accent: "#06b6d4",
        content: (
          <>
            <p>
              Module Federation's <code>shared</code> config declares which
              packages should be shared. At runtime, the federation runtime uses
              a <strong>singleton</strong> strategy:
            </p>
            <ol>
              <li>The host provides React 18.2</li>
              <li>Remote A wants React ^18.0 → satisfied by host's copy</li>
              <li>Remote B wants React ^18.1 → also satisfied</li>
              <li>One copy loaded, all remotes share it</li>
            </ol>
          </>
        ),
      },
      {
        title: "Version mismatch",
        accent: "#06b6d4",
        content: (
          <p>
            If a remote requires React 19 but the host provides React 18, the
            runtime can either: (a) load a separate copy (wasteful but safe), or
            (b) crash if <code>singleton: true, strictVersion: true</code> is
            set. Choose your trade-off carefully.
          </p>
        ),
      },
    ],
  },

  "iframe-isolation": {
    title: "Iframe Isolation",
    subtitle: "Full JS/CSS isolation via <iframe>",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "How it works",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Instead of loading a remote into the same JavaScript context,
              embed it in an <code>&lt;iframe&gt;</code>. The micro-frontend
              runs in a <strong>completely separate browsing context</strong> —
              its own DOM, CSS, and JS global scope.
            </p>
            <p>
              Communication happens via <code>window.postMessage()</code>. The
              host sends messages to the iframe; the iframe sends messages back.
            </p>
          </>
        ),
      },
      {
        title: "Benefits",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>
              <strong>Total isolation</strong> — CSS leaks and JS conflicts are
              impossible
            </li>
            <li>
              <strong>Security</strong> — sandbox attribute restricts
              capabilities
            </li>
            <li>
              <strong>Legacy friendly</strong> — embed any app regardless of
              framework
            </li>
            <li>
              <strong>Simple</strong> — no build tooling changes needed
            </li>
          </ul>
        ),
      },
      {
        title: "Drawbacks",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>Performance overhead — separate browser context per iframe</li>
            <li>
              No shared state — must serialize everything through postMessage
            </li>
            <li>Layout challenges — iframe height/scroll management</li>
            <li>SEO — iframe content isn't indexed by most crawlers</li>
            <li>
              Accessibility — screen readers may struggle with iframe boundaries
            </li>
          </ul>
        ),
      },
    ],
  },

  "error-boundary": {
    title: "Error Boundary & Fallback",
    subtitle: "Graceful degradation when a remote fails",
    accentColor: "#ef4444",
    sections: [
      {
        title: "Why remotes can fail",
        accent: "#ef4444",
        content: (
          <ul>
            <li>
              Network error fetching <code>remoteEntry.js</code>
            </li>
            <li>CDN returns 500 or the file is corrupted</li>
            <li>Version mismatch causes a runtime crash</li>
            <li>Remote has a bug that throws during render</li>
            <li>Timeout — remote's server is too slow</li>
          </ul>
        ),
      },
      {
        title: "Error Boundary pattern",
        accent: "#ef4444",
        content: (
          <>
            <p>
              Wrap each micro-frontend slot in a React{" "}
              <code>ErrorBoundary</code>. When the dynamic <code>import()</code>{" "}
              rejects or the component throws, the boundary catches it and
              renders a fallback UI.
            </p>
            <pre
              style={{
                fontSize: 12,
                color: "#e2e8f0",
                background: "#0f172a",
                padding: 12,
                borderRadius: 8,
                whiteSpace: "pre-wrap",
              }}
            >
              {`<ErrorBoundary fallback={<FallbackCard />}>
  <Suspense fallback={<Spinner />}>
    <RemoteDashboard />
  </Suspense>
</ErrorBoundary>`}
            </pre>
          </>
        ),
      },
      {
        title: "Partial failure",
        accent: "#ef4444",
        content: (
          <p>
            The key insight:{" "}
            <strong>one remote failing doesn't take down the whole app</strong>.
            The host shell, navigation, and other remotes continue to work. The
            user sees a helpful fallback message in the failed slot and can
            still use the rest of the application.
          </p>
        ),
      },
    ],
  },

  "strategy-comparison": {
    title: "Integration Strategies",
    subtitle: "Module Federation vs Iframe vs Custom Loader",
    accentColor: "#a855f7",
    sections: [
      {
        title: "Module Federation",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>
              <strong>Integration:</strong> Deep — shared React context,
              routing, state
            </li>
            <li>
              <strong>Isolation:</strong> Low — shared JS scope, CSS can leak
            </li>
            <li>
              <strong>Shared deps:</strong> Runtime singleton negotiation
            </li>
            <li>
              <strong>Config:</strong> Complex — Webpack/Vite federation plugin
            </li>
            <li>
              <strong>Best for:</strong> Teams using the same framework with
              coordinated versions
            </li>
          </ul>
        ),
      },
      {
        title: "Iframe",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>
              <strong>Integration:</strong> Shallow — postMessage only
            </li>
            <li>
              <strong>Isolation:</strong> Full — separate browsing context
            </li>
            <li>
              <strong>Shared deps:</strong> None — each iframe bundles
              everything
            </li>
            <li>
              <strong>Config:</strong> Simple — just an iframe src URL
            </li>
            <li>
              <strong>Best for:</strong> Untrusted third-party widgets, legacy
              apps
            </li>
          </ul>
        ),
      },
      {
        title: "Custom Loader (SystemJS / Import Maps)",
        accent: "#10b981",
        content: (
          <ul>
            <li>
              <strong>Integration:</strong> Flexible — depends on implementation
            </li>
            <li>
              <strong>Isolation:</strong> Minimal — same JS scope
            </li>
            <li>
              <strong>Shared deps:</strong> Import map controls versions
            </li>
            <li>
              <strong>Config:</strong> Moderate — custom bootstrap logic
            </li>
            <li>
              <strong>Best for:</strong> Framework-agnostic setups (single-spa)
            </li>
          </ul>
        ),
      },
    ],
  },
};
