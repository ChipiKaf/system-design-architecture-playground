import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "build-tools"
  | "caching"
  | "tree-shaking"
  | "task-graph"
  | "affected";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "build-tools": {
    title: "Monorepo Build Tools",
    subtitle: "Nx and Turborepo — orchestrating builds at scale",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What they do",
        accent: "#60a5fa",
        content: (
          <p>
            Monorepo build tools like <strong>Nx</strong> and{" "}
            <strong>Turborepo</strong> orchestrate tasks across many packages in
            a single repository. They analyze the dependency graph, determine
            build order, maximize parallelism, and cache outputs to skip
            redundant work.
          </p>
        ),
      },
      {
        title: "Nx (by Nrwl)",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>Fine-grained task graph with automatic dependency detection</li>
            <li>
              Distributed Task Execution (DTE) splits work across CI agents
            </li>
            <li>Built-in generators scaffold new packages/components</li>
            <li>Nx Cloud provides zero-config remote caching</li>
            <li>Supports Angular, React, Node, Go, and more</li>
          </ul>
        ),
      },
      {
        title: "Turborepo (by Vercel)",
        accent: "#c084fc",
        content: (
          <ul>
            <li>Zero-config for npm/pnpm/yarn workspaces</li>
            <li>Minimal turbo.json pipeline definition (~10 lines)</li>
            <li>Content-aware hashing (file content, not timestamps)</li>
            <li>Vercel Remote Cache enabled with one command</li>
            <li>Incremental adoption — drop into existing monorepo</li>
          </ul>
        ),
      },
    ],
  },
  caching: {
    title: "Build Caching",
    subtitle: "Skip work you've already done",
    accentColor: "#22c55e",
    sections: [
      {
        title: "How it works",
        accent: "#22c55e",
        content: (
          <p>
            Build tools hash each task's inputs — source files, dependency
            outputs, environment variables, and configuration. If the hash
            matches a previous run, the tool <strong>replays</strong> the cached
            output instead of re-executing the task. This turns a 5-minute build
            into a 10-second restore.
          </p>
        ),
      },
      {
        title: "Local vs Remote cache",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              <strong>Local:</strong> Stored on disk (.nx/cache or .turbo/).
              Fast, but only helps the same machine.
            </li>
            <li>
              <strong>Remote:</strong> Shared cache (Nx Cloud, Vercel Remote
              Cache). Any CI agent or developer can reuse outputs — a teammate's
              build can warm your cache.
            </li>
          </ul>
        ),
      },
      {
        title: "Cache key anatomy",
        accent: "#22c55e",
        content: (
          <p>
            The cache key includes: source file hashes, dependency graph
            position, environment variables, runtime versions, and task
            configuration. A single byte change in any input produces a
            different hash → cache miss → full rebuild of that task.
          </p>
        ),
      },
    ],
  },
  "tree-shaking": {
    title: "Tree-Shaking",
    subtitle: "Eliminating dead code from production bundles",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What it is",
        accent: "#a78bfa",
        content: (
          <p>
            Tree-shaking is a dead-code elimination technique. The bundler
            (Webpack, Vite, esbuild) analyzes ES module <code>import</code>/
            <code>export</code> statements and removes exports that are never
            imported. The name comes from "shaking a tree" — unused branches
            fall off.
          </p>
        ),
      },
      {
        title: "Why monorepos help",
        accent: "#a78bfa",
        content: (
          <p>
            In monorepos, shared libraries have clearly defined package
            boundaries and explicit exports. Bundlers can statically analyze
            which exports each app actually imports — and drop the rest. The
            more granular your library boundaries, the more effective
            tree-shaking becomes.
          </p>
        ),
      },
      {
        title: "Gotchas",
        accent: "#a78bfa",
        content: (
          <ul>
            <li>Side-effect imports (e.g. polyfills) can't be tree-shaken</li>
            <li>CommonJS modules (require()) defeat tree-shaking entirely</li>
            <li>Re-exporting barrels (index.ts) can reduce effectiveness</li>
            <li>
              Mark side-effect-free packages in package.json:{" "}
              {`"sideEffects": false`}
            </li>
          </ul>
        ),
      },
    ],
  },
  "task-graph": {
    title: "Task / Project Graph",
    subtitle: "Modeling workspace structure as a directed acyclic graph",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "What it is",
        accent: "#fbbf24",
        content: (
          <p>
            A task graph (or project graph) is a <strong>DAG</strong> (Directed
            Acyclic Graph) where each node represents a package or task and each
            edge represents a dependency. Building the graph lets the tool
            compute: topological build order, maximum parallelism, and what's
            affected by a change.
          </p>
        ),
      },
      {
        title: "Nx vs Turborepo approach",
        accent: "#fbbf24",
        content: (
          <ul>
            <li>
              <strong>Nx:</strong> Builds a <em>task-level</em> graph — each
              individual task (build, test, lint) for each project gets a
              separate node. Supports fine-grained parallelism.
            </li>
            <li>
              <strong>Turborepo:</strong> Builds a <em>package-level</em> graph
              from package.json workspaces + turbo.json pipeline. Simpler model,
              but less granular.
            </li>
          </ul>
        ),
      },
    ],
  },
  affected: {
    title: "Affected / Changed Detection",
    subtitle: "Only rebuild what actually changed",
    accentColor: "#f87171",
    sections: [
      {
        title: "How it works",
        accent: "#f87171",
        content: (
          <p>
            The build tool compares the current commit against a base branch
            (usually main). It identifies which files changed, maps those files
            to packages, then walks the dependency graph to find all downstream
            packages that <em>might</em> be affected. Only affected packages are
            built, tested, and linted.
          </p>
        ),
      },
      {
        title: "Why it matters in CI/CD",
        accent: "#f87171",
        content: (
          <p>
            In a monorepo with 50+ packages, rebuilding everything on every PR
            is wasteful. Affected detection can reduce a 15-minute CI pipeline
            to 2 minutes by skipping unchanged packages. Combined with caching,
            CI times stay near-constant regardless of repo size.
          </p>
        ),
      },
    ],
  },
};
