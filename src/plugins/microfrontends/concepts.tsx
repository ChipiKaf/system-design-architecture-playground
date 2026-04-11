import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "micro-frontends"
  | "the-problem"
  | "hooks-crash"
  | "module-federation"
  | "remote-entry"
  | "shared-deps"
  | "version-mismatch"
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
    subtitle: "Separate teams, separate apps, one website",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "The elevator pitch",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              Imagine a big company website — there's a Dashboard, a Products
              page, and a Settings page. In a <strong>monolith</strong>, all of
              this lives in one massive codebase. Every team edits the same
              repo. To ship a tiny change, you have to coordinate with everyone.
            </p>
            <p>
              <strong>Micro-frontends</strong> split this up. Each team owns
              their own mini-app. Team A builds the Dashboard, Team B builds
              Products, Team C builds Settings. They deploy independently — like
              separate stores in a mall that share the same building.
            </p>
          </>
        ),
      },
      {
        title: "Why bother?",
        accent: "#8b5cf6",
        content: (
          <ul>
            <li>
              <strong>Ship faster</strong> — Team A deploys on Monday without
              waiting for Team B
            </li>
            <li>
              <strong>Smaller downloads</strong> — only load the page the user
              actually visits
            </li>
            <li>
              <strong>Team freedom</strong> — each team owns their code from
              start to finish
            </li>
            <li>
              <strong>Blast radius</strong> — if one app breaks, the others keep
              working
            </li>
          </ul>
        ),
      },
      {
        title: "The catch",
        accent: "#8b5cf6",
        content: (
          <p>
            More apps = more CI pipelines, more deploys, harder cross-app
            communication. You need a shared design system so the user doesn't
            notice the seams. And you need something to glue it all together at
            runtime — that's where <strong>Module Federation</strong> comes in.
          </p>
        ),
      },
    ],
  },

  "the-problem": {
    title: "Why Module Federation?",
    subtitle: "The problem it solves — in plain English",
    accentColor: "#ef4444",
    sections: [
      {
        title: "The naive approach",
        accent: "#ef4444",
        content: (
          <>
            <p>
              Without Module Federation, each mini-app bundles{" "}
              <strong>everything</strong> it needs — React, ReactDOM, Router —
              all on its own. When the user visits your site:
            </p>
            <ul>
              <li>Dashboard downloads React (500 KB)</li>
              <li>Products downloads React again (500 KB)</li>
              <li>
                Settings downloads React <em>again</em> (500 KB)
              </li>
            </ul>
            <p>
              That's <strong>1.5 MB of the same library</strong> downloaded
              three times. The user's browser gets heavy, pages load slowly, and
              if the versions don't match exactly, things crash silently.
            </p>
          </>
        ),
      },
      {
        title: "The real-world analogy",
        accent: "#ef4444",
        content: (
          <p>
            It's like three stores in a mall each building their own elevator.
            Why not share one elevator that everyone uses? Module Federation is
            that shared elevator — it lets separate apps share code at runtime
            so the user only downloads React <strong>once</strong>.
          </p>
        ),
      },
      {
        title: "What Module Federation actually does",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>
              Each app publishes a tiny "menu" (remoteEntry.js) saying what it
              offers
            </li>
            <li>
              The host reads the menus and loads only the code it needs, on
              demand
            </li>
            <li>
              Shared libraries like React are loaded <strong>once</strong> and
              reused by all apps
            </li>
            <li>
              No build-time coordination — teams deploy whenever they want
            </li>
          </ul>
        ),
      },
    ],
  },

  "hooks-crash": {
    title: "The React Hooks Crash",
    subtitle: "Why two React copies = broken app",
    accentColor: "#dc2626",
    sections: [
      {
        title: "Step 1: React's secret walkie-talkie",
        accent: "#dc2626",
        content: (
          <>
            <p>
              Inside every copy of React, there's a hidden global variable
              called the <strong>dispatcher</strong>. Think of it as a
              walkie-talkie. When React starts rendering your component, it
              picks up the walkie-talkie and broadcasts:{" "}
              <em>"I'm rendering now — any hooks, talk to me."</em>
            </p>
            <p>
              When your component calls <code>useState()</code>, it grabs that
              same walkie-talkie and says: <em>"Give me a state slot."</em>{" "}
              React hears it, registers the state, and everything works.
            </p>
            <p>
              <strong>Key point:</strong> <code>useState()</code> is NOT a
              standalone function. It just reads from the walkie-talkie. If
              nobody is broadcasting, it crashes.
            </p>
          </>
        ),
      },
      {
        title: "Step 2: Two Reacts = two walkie-talkies",
        accent: "#dc2626",
        content: (
          <>
            <p>
              Now imagine two copies of React are loaded — React A (from the
              Host Shell) and React B (bundled inside the Dashboard). Each has{" "}
              <strong>its own walkie-talkie</strong> on a different channel.
            </p>
            <ol>
              <li>
                The Host Shell calls <code>render()</code> using
                <strong> React A</strong>. React A picks up walkie-talkie A and
                broadcasts: <em>"I'm rendering now."</em>
              </li>
              <li>React A starts rendering the Dashboard component.</li>
              <li>
                But the Dashboard's code was built with <strong>React B</strong>
                . When the Dashboard calls <code>useState()</code>, it grabs
                walkie-talkie <strong>B</strong> — not A.
              </li>
              <li>
                Walkie-talkie B is <strong>silent</strong>. Nobody told React B
                that a render is happening. React B says:{" "}
                <em>
                  "Nobody is rendering right now — this hook call is invalid!"
                </em>
              </li>
            </ol>
          </>
        ),
      },
      {
        title: "Step 3: The crash",
        accent: "#dc2626",
        content: (
          <>
            <p>React throws this error and your entire component tree dies:</p>
            <pre
              style={{
                fontSize: 12,
                color: "#fca5a5",
                background: "#1c1917",
                padding: 12,
                borderRadius: 8,
                whiteSpace: "pre-wrap",
              }}
            >
              {`Error: Invalid hook call.
Hooks can only be called inside the body of
a function component. This might happen because:
1. You have mismatching versions of React
2. You might have more than one copy of React
   in the same app  <-- THIS ONE`}
            </pre>
            <p>
              The fix is simple in concept:{" "}
              <strong>make sure there is only ONE copy of React</strong>. That's
              exactly what Module Federation's <code>singleton: true</code> does
              — it forces all micro-frontends to share the same walkie-talkie.
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
              {`shared: {
  react: { singleton: true },
  "react-dom": { singleton: true },
}`}
            </pre>
          </>
        ),
      },
    ],
  },

  "module-federation": {
    title: "Module Federation",
    subtitle: "The glue that connects micro-frontends",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "How it works (simple version)",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              Module Federation is a feature in Webpack 5 (and Vite) that lets
              one app <strong>load code from another app at runtime</strong> —
              not at build time.
            </p>
            <p>
              Think of it like a restaurant: each kitchen (team) publishes a
              menu. When a customer (user) orders, the waiter (Host Shell)
              checks the menu and fetches only the dish they asked for. No need
              to pre-cook everything.
            </p>
          </>
        ),
      },
      {
        title: "The config (simplified)",
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
            {`// Team A says: "I offer a Dashboard component"
federation({
  name: "dashboard",
  exposes: { "./App": "./src/App.tsx" },
  shared: ["react", "react-dom"],
})

// Host Shell says: "I'll load Dashboard from this URL"
federation({
  name: "shell",
  remotes: { dashboard: "http://cdn/dashboard/remoteEntry.js" },
  shared: ["react", "react-dom"],
})`}
          </pre>
        ),
      },
      {
        title: "The key insight",
        accent: "#3b82f6",
        content: (
          <p>
            The <code>shared</code> config is where the magic happens. It tells
            Module Federation: "React should only be loaded once. Whoever has it
            first, share it with everyone else." This prevents the 3× download
            problem from Step 3.
          </p>
        ),
      },
    ],
  },

  "remote-entry": {
    title: "remoteEntry.js",
    subtitle: "The tiny menu file that lists what an app offers",
    accentColor: "#10b981",
    sections: [
      {
        title: "What is it?",
        accent: "#10b981",
        content: (
          <>
            <p>
              When a team builds their app with Module Federation, the build
              creates a small file called <code>remoteEntry.js</code>. Think of
              it as a <strong>restaurant menu</strong> — it lists the dishes
              (components) available and where to find the ingredients (code
              chunks).
            </p>
            <p>
              Important: the menu itself is tiny. It doesn't contain the actual
              component code. The real code is fetched later, only when needed.
            </p>
          </>
        ),
      },
      {
        title: "The flow",
        accent: "#10b981",
        content: (
          <ol>
            <li>Host Shell starts up</li>
            <li>
              It fetches each team's <code>remoteEntry.js</code> (reads the
              menus)
            </li>
            <li>
              Now it knows: "Dashboard is available, Products is available"
            </li>
            <li>
              User navigates to /dashboard → only then is the actual Dashboard
              code downloaded
            </li>
          </ol>
        ),
      },
      {
        title: "If the menu can't be found",
        accent: "#10b981",
        content: (
          <p>
            If <code>remoteEntry.js</code> fails to load (the server is down,
            404, timeout), the dynamic import rejects. Your Error Boundary
            catches it and shows a friendly fallback. The rest of the app keeps
            working.
          </p>
        ),
      },
    ],
  },

  "shared-deps": {
    title: "Shared Dependencies",
    subtitle: "One React for everyone — no duplicates",
    accentColor: "#06b6d4",
    sections: [
      {
        title: "The problem (again)",
        accent: "#06b6d4",
        content: (
          <p>
            If every mini-app bundles its own React, two bad things happen:{" "}
            <strong>(1)</strong> the user downloads React multiple times —
            wasteful. <strong>(2)</strong> Multiple React instances break hooks
            — <code>useState</code> from one copy doesn't work inside a
            component from another copy. Your app crashes with cryptic errors.
          </p>
        ),
      },
      {
        title: "How sharing works",
        accent: "#06b6d4",
        content: (
          <>
            <p>
              Module Federation's <code>shared</code> config tells the runtime:
              "These libraries should only exist once."
            </p>
            <ol>
              <li>Host loads React 18.2</li>
              <li>Dashboard wants React ^18.0 → "Host has 18.2, use that"</li>
              <li>Products wants React ^18.1 → "Same copy, still works"</li>
              <li>Result: one download, all apps share it</li>
            </ol>
          </>
        ),
      },
      {
        title: "When versions don't match",
        accent: "#06b6d4",
        content: (
          <p>
            If one app needs React 19 but the host has React 18, Module
            Federation can either: load a separate copy (wasteful but safe), or
            refuse to start if you set <code>strictVersion: true</code>. Pick
            your trade-off — usually, you keep versions aligned across teams.
          </p>
        ),
      },
    ],
  },

  "version-mismatch": {
    title: "Version Mismatch",
    subtitle: "When one team ships a different React version",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "The scenario",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              The Host Shell and two teams use React 18. But Team C upgrades to
              React 19 and deploys their Settings app. Now the Module Federation
              runtime has a problem: the Host provides React 18, but Settings
              wants React 19.
            </p>
            <p>
              This is like a building that provides 220V power outlets, but one
              store brings equipment that needs 110V. Something has to give.
            </p>
          </>
        ),
      },
      {
        title: "What Module Federation does",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Module Federation checks the <code>shared</code> config at runtime
              and has two strategies:
            </p>
            <ul>
              <li>
                <strong>strictVersion: true</strong> — "I refuse to load
                Settings. React 19 ≠ React 18." The app shows an error boundary
                fallback. Fail loud, fail clear.
              </li>
              <li>
                <strong>strictVersion: false</strong> (default) — "Fine, I'll
                load a separate copy of React 19 just for Settings." It works,
                but now you have two React instances — and you're back to the
                hooks crash risk from Step 4.
              </li>
            </ul>
          </>
        ),
      },
      {
        title: "The best fix",
        accent: "#3b82f6",
        content: (
          <>
            <p>Don't let versions drift. The best teams:</p>
            <ul>
              <li>
                Pin shared dependencies to the same major version across all
                teams
              </li>
              <li>
                Use a shared <code>package.json</code> or renovate bot to keep
                versions in sync
              </li>
              <li>
                Set <code>singleton: true, strictVersion: true</code> so
                mismatches fail loudly in CI, not silently in production
              </li>
            </ul>
          </>
        ),
      },
    ],
  },

  "iframe-isolation": {
    title: "Iframe Isolation",
    subtitle: "The glass wall — total isolation, limited communication",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "How it works",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Instead of loading a mini-app into the same page, put it in an{" "}
              <code>&lt;iframe&gt;</code>. It's like putting a store behind a
              glass wall — their CSS, JavaScript, and bugs{" "}
              <strong>cannot leak out</strong>.
            </p>
            <p>
              Communication happens by sliding notes under the door:{" "}
              <code>window.postMessage()</code>. The host sends a message, the
              iframe reads it and responds.
            </p>
          </>
        ),
      },
      {
        title: "When to use iframes",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>
              <strong>Untrusted code</strong> — third-party widgets you don't
              control
            </li>
            <li>
              <strong>Legacy apps</strong> — old jQuery app that can't be
              modernized
            </li>
            <li>
              <strong>Different frameworks</strong> — one team uses Angular,
              another React
            </li>
          </ul>
        ),
      },
      {
        title: "The trade-offs",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>Every iframe loads its own React — no sharing</li>
            <li>
              Communication is clunky — everything goes through postMessage
            </li>
            <li>Layout headaches — iframe height and scroll are tricky</li>
            <li>SEO-unfriendly — search engines can't see iframe content</li>
          </ul>
        ),
      },
    ],
  },

  "error-boundary": {
    title: "Error Boundary",
    subtitle: "One app breaks, the rest keep working",
    accentColor: "#ef4444",
    sections: [
      {
        title: "What can go wrong?",
        accent: "#ef4444",
        content: (
          <ul>
            <li>Team C's server goes down — remoteEntry.js can't load</li>
            <li>The CDN returns corrupted files</li>
            <li>A version mismatch causes a runtime crash</li>
            <li>The remote app has a bug that throws during render</li>
          </ul>
        ),
      },
      {
        title: "The safety net",
        accent: "#ef4444",
        content: (
          <>
            <p>
              Wrap each mini-app's slot in a React{" "}
              <strong>Error Boundary</strong>. When something goes wrong, the
              boundary catches it and shows a friendly fallback — like a "This
              section is temporarily unavailable" message.
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
        title: "The key insight",
        accent: "#ef4444",
        content: (
          <p>
            <strong>One store closing doesn't shut down the mall.</strong> The
            user sees a helpful message in the broken slot, but the Host Shell,
            navigation, and all other mini-apps keep working normally. This is
            one of the biggest wins of micro-frontends.
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
              <strong>Sharing:</strong> Deep — shared React, Router, state
            </li>
            <li>
              <strong>Isolation:</strong> Low — same JS scope, CSS can leak
            </li>
            <li>
              <strong>Setup:</strong> Complex — Webpack/Vite federation config
            </li>
            <li>
              <strong>Best for:</strong> Teams using the same framework who want
              seamless UX
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
              <strong>Sharing:</strong> None — each iframe bundles everything
            </li>
            <li>
              <strong>Isolation:</strong> Full — separate browser context
            </li>
            <li>
              <strong>Setup:</strong> Simple — just an iframe src URL
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
              <strong>Sharing:</strong> Flexible — import map controls versions
            </li>
            <li>
              <strong>Isolation:</strong> Minimal — same JS scope
            </li>
            <li>
              <strong>Setup:</strong> Moderate — custom bootstrap logic
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
