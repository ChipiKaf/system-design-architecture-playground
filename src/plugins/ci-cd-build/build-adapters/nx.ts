import type { BuildAdapter } from "./types";
import type {
  CiCdBuildState,
  PackageNode,
  ScenarioId,
} from "../ciCdBuildSlice";
import type { FlowBeat, StepDef } from "../flow-engine";

/* ── Graph templates per scenario ──────────────────────── */

function buildMonorepoWeb(count: number): PackageNode[] {
  const nodes: PackageNode[] = [
    {
      id: "pkg-app-main",
      label: "web-app",
      role: "app",
      cached: false,
      affected: true,
      sizeKb: 420,
    },
    {
      id: "pkg-app-admin",
      label: "admin-app",
      role: "app",
      cached: false,
      affected: false,
      sizeKb: 310,
    },
    {
      id: "pkg-ui-lib",
      label: "ui-lib",
      role: "lib",
      cached: false,
      affected: true,
      sizeKb: 180,
    },
    {
      id: "pkg-utils",
      label: "utils",
      role: "shared",
      cached: false,
      affected: true,
      sizeKb: 45,
    },
    {
      id: "pkg-api-client",
      label: "api-client",
      role: "lib",
      cached: false,
      affected: true,
      sizeKb: 90,
    },
    {
      id: "pkg-config",
      label: "tsconfig",
      role: "shared",
      cached: false,
      affected: false,
      sizeKb: 5,
    },
  ];
  return nodes.slice(0, Math.max(3, count));
}

function buildFullstack(count: number): PackageNode[] {
  const nodes: PackageNode[] = [
    {
      id: "pkg-frontend",
      label: "frontend",
      role: "app",
      cached: false,
      affected: true,
      sizeKb: 380,
    },
    {
      id: "pkg-backend",
      label: "backend",
      role: "app",
      cached: false,
      affected: true,
      sizeKb: 260,
    },
    {
      id: "pkg-shared-types",
      label: "shared-types",
      role: "shared",
      cached: false,
      affected: true,
      sizeKb: 30,
    },
    {
      id: "pkg-db-client",
      label: "db-client",
      role: "lib",
      cached: false,
      affected: false,
      sizeKb: 70,
    },
    {
      id: "pkg-auth",
      label: "auth",
      role: "lib",
      cached: false,
      affected: false,
      sizeKb: 55,
    },
  ];
  return nodes.slice(0, Math.max(3, count));
}

function buildDesignSystem(count: number): PackageNode[] {
  const nodes: PackageNode[] = [
    {
      id: "pkg-tokens",
      label: "tokens",
      role: "shared",
      cached: false,
      affected: true,
      sizeKb: 15,
    },
    {
      id: "pkg-components",
      label: "components",
      role: "lib",
      cached: false,
      affected: true,
      sizeKb: 280,
    },
    {
      id: "pkg-docs",
      label: "docs-site",
      role: "app",
      cached: false,
      affected: true,
      sizeKb: 190,
    },
    {
      id: "pkg-storybook",
      label: "storybook",
      role: "app",
      cached: false,
      affected: false,
      sizeKb: 120,
    },
    {
      id: "pkg-icons",
      label: "icons",
      role: "lib",
      cached: false,
      affected: false,
      sizeKb: 60,
    },
  ];
  return nodes.slice(0, Math.max(3, count));
}

/* ── Adapter ───────────────────────────────────────────── */

export const nxAdapter: BuildAdapter = {
  id: "nx",

  profile: {
    label: "Nx (by Nrwl)",
    shortLabel: "Nx",
    graphModel:
      "Nx auto-detects project boundaries from package.json + tsconfig paths, building a fine-grained task graph.",
    cacheStrategy:
      "Local computation cache by default + Nx Cloud for distributed remote caching across CI agents.",
    strengths: [
      "Fine-grained task graph with automatic dependency detection",
      "Distributed task execution (DTE) across CI agents",
      "Built-in generators and code scaffolding",
      "Affected command only rebuilds what changed",
      "Remote caching via Nx Cloud is near-zero config",
    ],
    weaknesses: [
      "Heavier setup — more config files and plugins",
      "Nx Cloud adds vendor dependency for remote cache",
      "Learning curve for generators and executors",
    ],
  },

  colors: {
    fill: "#1e3a5f",
    stroke: "#60a5fa",
  },

  /* ── Graph ───────────────────────────────────────────── */

  buildGraph(scenario: ScenarioId, packageCount: number): PackageNode[] {
    switch (scenario) {
      case "monorepo-web":
        return buildMonorepoWeb(packageCount);
      case "fullstack":
        return buildFullstack(packageCount);
      case "design-system":
        return buildDesignSystem(packageCount);
    }
  },

  /* ── Metrics ─────────────────────────────────────────── */

  computeMetrics(state: CiCdBuildState) {
    const affected = state.packages.filter((p) => p.affected);
    const parallelism = Math.min(affected.length, 4);
    const baseCold = affected.reduce((sum, p) => sum + p.sizeKb * 2.2, 0);
    const coldBuildMs = Math.round(baseCold / Math.max(parallelism, 1));
    const cacheHitRate = 85;
    const warmBuildMs = Math.round(
      coldBuildMs * (1 - cacheHitRate / 100) + 120,
    );
    const treeShakenKb = Math.round(
      affected.reduce((sum, p) => sum + p.sizeKb * 0.28, 0),
    );

    return {
      coldBuildMs,
      warmBuildMs,
      cacheHitRate,
      parallelism,
      treeShakenKb,
    };
  },

  /* ── Token expansion ─────────────────────────────────── */

  expandToken(token: string, state: CiCdBuildState): string[] | null {
    if (token === "$affected-packages")
      return state.packages.filter((p) => p.affected).map((p) => p.id);
    if (token === "$all-packages") return state.packages.map((p) => p.id);
    if (token === "$app-packages")
      return state.packages.filter((p) => p.role === "app").map((p) => p.id);
    if (token === "$lib-packages")
      return state.packages
        .filter((p) => p.role === "lib" || p.role === "shared")
        .map((p) => p.id);
    return null;
  },

  /* ── Flow beats ──────────────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAnalysisFlows(_state: CiCdBuildState): FlowBeat[] {
    return [
      {
        from: "build-orchestrator",
        to: "$all-packages",
        duration: 500,
        color: "#60a5fa",
        explain:
          "Nx traverses the project graph, comparing git diff against the task graph to find affected projects.",
      },
    ];
  },

  getColdBuildFlows(state: CiCdBuildState): FlowBeat[] {
    const affected = state.packages.filter((p) => p.affected);
    const libs = affected.filter((p) => p.role !== "app");
    const apps = affected.filter((p) => p.role === "app");

    const beats: FlowBeat[] = [];
    if (libs.length > 0) {
      beats.push({
        from: "build-orchestrator",
        to: "$lib-packages",
        duration: 700,
        color: "#f59e0b",
        explain:
          "Nx builds leaf libraries first (topological order). With DTE these run in parallel across agents.",
      });
    }
    if (apps.length > 0) {
      beats.push({
        from: "$lib-packages",
        to: "$app-packages",
        duration: 800,
        color: "#ef4444",
        explain:
          "After libraries complete, dependent apps build in parallel. Each task produces a deterministic output hash.",
      });
    }
    return beats;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getCacheLookupFlows(_state: CiCdBuildState): FlowBeat[] {
    return [
      {
        from: "build-orchestrator",
        to: "$cache-store",
        duration: 400,
        color: "#22c55e",
        explain:
          "Nx hashes task inputs → checks local .nx/cache, then Nx Cloud remote cache for a match.",
      },
    ];
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getWarmBuildFlows(_state: CiCdBuildState): FlowBeat[] {
    return [
      {
        from: "$cache-store",
        to: "$affected-packages",
        duration: 500,
        color: "#22c55e",
        explain:
          "Cache HIT — Nx replays the cached output (stdout + file artifacts) instead of re-executing the task. Build time drops dramatically.",
      },
    ];
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTreeShakeFlows(_state: CiCdBuildState): FlowBeat[] {
    return [
      {
        from: "$app-packages",
        to: "output-bundle",
        duration: 600,
        color: "#a78bfa",
        explain:
          "Nx delegates to the app's bundler (Webpack/Vite/esbuild). Unused exports from libs are tree-shaken. Nx's fine-grained project boundaries make tree-shaking more effective.",
      },
    ];
  },

  /* ── Explanations ────────────────────────────────────── */

  getAnalysisExplanation(state: CiCdBuildState): string {
    const affected = state.packages.filter((p) => p.affected);
    return `Nx runs \`nx affected\` — comparing HEAD against the base branch. It walks the project graph and marks ${affected.length}/${state.packages.length} packages as affected. Only these will be built, tested, and linted.`;
  },

  getColdBuildExplanation(state: CiCdBuildState): string {
    const parallelism = Math.min(
      state.packages.filter((p) => p.affected).length,
      4,
    );
    return `First CI run — no cache exists. Nx schedules ${state.result.affectedCount} affected tasks in topological order with ${parallelism}-way parallelism. Cold build takes ~${state.result.coldBuildMs}ms.`;
  },

  getCacheLookupExplanation(state: CiCdBuildState): string {
    return `Second CI run (same code). Nx hashes each task's inputs: source files, dependency outputs, and nx.json config. It checks the local cache first, then Nx Cloud. Cache hit rate: ${state.result.cacheHitRate}%.`;
  },

  getWarmBuildExplanation(state: CiCdBuildState): string {
    return `Cache HIT! Nx replays the task output from cache — no compilation needed. The task appears to run instantly (~${state.result.warmBuildMs}ms total). Nx Cloud shares this cache across all CI agents and developer machines.`;
  },

  getTreeShakeExplanation(state: CiCdBuildState): string {
    return `Nx's buildable libraries produce individual compilation outputs. The bundler (Vite/Webpack) performs tree-shaking on final app builds, eliminating ~${state.result.treeShakenKb}KB of dead code from unused library exports.`;
  },

  /* ── Step reorder ────────────────────────────────────── */

  reorderSteps(steps: StepDef[]): StepDef[] {
    return steps; // Nx uses the default order
  },

  /* ── Scene ───────────────────────────────────────────── */

  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    state: CiCdBuildState,
    helpers: SceneHelpers,
  ) {
    const { hot, phase } = helpers;
    const pkgs = state.packages;
    const cols = { app: 600, lib: 350, shared: 150 };
    const startY = 120;
    const gapY = 85;

    // Group by role
    const apps = pkgs.filter((p) => p.role === "app");
    const libs = pkgs.filter((p) => p.role === "lib");
    const shared = pkgs.filter((p) => p.role === "shared");

    const drawGroup = (
      group: PackageNode[],
      x: number,
      color: string,
      strokeC: string,
    ) => {
      group.forEach((pkg, i) => {
        const y = startY + i * gapY;
        const isHot = hot(pkg.id);
        const isAffected = pkg.affected;
        const isCached = phase === "warm-build" || phase === "cache-lookup";

        let fill = "#0f172a";
        let stroke = "#334155";
        if (isHot) {
          fill = color;
          stroke = strokeC;
        } else if (isAffected && phase !== "overview") {
          fill = "rgba(59,130,246,0.12)";
          stroke = "#3b82f6";
        }

        builder
          .node(pkg.id)
          .at(x, y)
          .rect(120, 50, 10)
          .fill(fill)
          .stroke(stroke, 2)
          .label(pkg.label, {
            fill: "#e2e8f0",
            fontSize: 11,
            fontWeight: isAffected ? "bold" : "normal",
          });

        if (isAffected && phase !== "overview") {
          builder.node(pkg.id).badge("affected", { position: "top-right" });
        }
        if (isCached && isAffected) {
          builder.node(pkg.id).badge("cached ✓", { position: "bottom-right" });
        }
      });
    };

    drawGroup(shared, cols.shared, "#1e3a5f", "#60a5fa");
    drawGroup(libs, cols.lib, "#1e3a5f", "#60a5fa");
    drawGroup(apps, cols.app, "#172554", "#3b82f6");

    // Edges: shared → libs, libs → apps (simplified dependency graph)
    shared.forEach((s) => {
      libs.forEach((l) => {
        builder
          .edge(s.id, l.id, `dep-${s.id}-${l.id}`)
          .stroke("#334155", 1.5)
          .arrow(true)
          .dashed();
      });
    });
    libs.forEach((l) => {
      apps.forEach((a) => {
        builder
          .edge(l.id, a.id, `dep-${l.id}-${a.id}`)
          .stroke("#334155", 1.5)
          .arrow(true)
          .dashed();
      });
    });
  },

  buildAnnotationOverlays(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    state: CiCdBuildState,
    helpers: SceneHelpers,
    viewW: number,
  ) {
    const { phase } = helpers;

    // Column labels
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    builder.overlay((o: any) => {
      o.add(
        "text",
        {
          x: 150,
          y: 80,
          text: "Shared",
          fill: "#64748b",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "col-shared" },
      );
      o.add(
        "text",
        {
          x: 350,
          y: 80,
          text: "Libraries",
          fill: "#64748b",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "col-libs" },
      );
      o.add(
        "text",
        {
          x: 600,
          y: 80,
          text: "Applications",
          fill: "#64748b",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "col-apps" },
      );
    });

    // Phase-specific annotations
    if (phase === "affected") {
      const affected = state.packages.filter((p) => p.affected);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      builder.overlay((o: any) => {
        o.add(
          "text",
          {
            x: viewW / 2,
            y: 50,
            text: `nx affected: ${affected.length} packages need rebuild`,
            fill: "#fbbf24",
            fontSize: 12,
            fontWeight: "bold",
          },
          { key: "affected-label" },
        );
      });
    }

    if (
      phase === "cache-save" ||
      phase === "cache-lookup" ||
      phase === "warm-build"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      builder.overlay((o: any) => {
        o.add(
          "text",
          {
            x: viewW / 2,
            y: 50,
            text:
              phase === "cache-save"
                ? "Saving build artifacts → Nx Cache"
                : phase === "cache-lookup"
                  ? "Checking Nx Cache for matching hashes..."
                  : "Cache HIT — replaying outputs",
            fill: "#22c55e",
            fontSize: 12,
            fontWeight: "bold",
          },
          { key: "cache-label" },
        );
      });
    }
  },

  getStatBadges(state: CiCdBuildState): StatBadgeConfig[] {
    return [
      {
        label: "Affected",
        value: `${state.result.affectedCount}/${state.result.totalPackages}`,
        color: "#fbbf24",
      },
      {
        label: "Parallelism",
        value: `${state.result.parallelism}x`,
        color: "#60a5fa",
      },
    ];
  },

  softReset(state: CiCdBuildState) {
    state.buildRun = 1;
    state.packages.forEach((p) => {
      p.cached = false;
    });
  },
};

import type { SceneHelpers, StatBadgeConfig } from "./types";
