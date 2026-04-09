import type { BuildAdapter } from "./types";
import type {
  CiCdBuildState,
  PackageNode,
  ScenarioId,
} from "../ciCdBuildSlice";
import type { FlowBeat, StepDef } from "../flow-engine";
import type { SceneHelpers, StatBadgeConfig } from "./types";

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

export const turborepoAdapter: BuildAdapter = {
  id: "turborepo",

  profile: {
    label: "Turborepo (by Vercel)",
    shortLabel: "Turborepo",
    graphModel:
      "Turborepo reads package.json workspaces and turbo.json pipeline to build a task-level dependency graph.",
    cacheStrategy:
      "File-system cache (.turbo/) locally + Vercel Remote Cache for shared CI caching across runs.",
    strengths: [
      "Zero-config for npm/pnpm/yarn workspaces",
      "Minimal turbo.json — pipeline config is ~10 lines",
      "Remote caching via Vercel is one command to enable",
      "Incremental adoption — drop into existing monorepo",
      "Content-aware hashing (file content, not timestamps)",
    ],
    weaknesses: [
      "No built-in code generators or scaffolding",
      "Less granular task graph than Nx (package-level, not file-level)",
      "No distributed task execution — parallelism is local only",
      "Affected filtering is less precise (package-level deps)",
    ],
  },

  colors: {
    fill: "#3b1a45",
    stroke: "#c084fc",
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
    // Turborepo parallelism is local CPU cores, slightly less efficient scheduling
    const parallelism = Math.min(affected.length, 3);
    const baseCold = affected.reduce((sum, p) => sum + p.sizeKb * 2.5, 0);
    const coldBuildMs = Math.round(baseCold / Math.max(parallelism, 1));
    // Turborepo cache hit rate slightly lower (package-level hash, not file-level)
    const cacheHitRate = 78;
    const warmBuildMs = Math.round(
      coldBuildMs * (1 - cacheHitRate / 100) + 150,
    );
    const treeShakenKb = Math.round(
      affected.reduce((sum, p) => sum + p.sizeKb * 0.22, 0),
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
        color: "#c084fc",
        explain:
          "Turborepo reads turbo.json pipeline + package.json dependencies to discover workspace topology.",
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
        duration: 750,
        color: "#f59e0b",
        explain:
          "Turborepo schedules leaf packages first (topological sort of pipeline). Parallel tasks limited to local CPU concurrency.",
      });
    }
    if (apps.length > 0) {
      beats.push({
        from: "$lib-packages",
        to: "$app-packages",
        duration: 850,
        color: "#ef4444",
        explain:
          "After dependencies complete, dependent packages build. Each task output is hashed by content (not timestamp).",
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
        duration: 450,
        color: "#22c55e",
        explain:
          "Turborepo hashes package inputs (source files, deps, env vars) → checks .turbo/ local cache, then Vercel Remote Cache.",
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
          "Cache HIT — Turborepo restores the cached output tarball + replays logged stdout. No re-execution needed.",
      },
    ];
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTreeShakeFlows(_state: CiCdBuildState): FlowBeat[] {
    return [
      {
        from: "$app-packages",
        to: "output-bundle",
        duration: 650,
        color: "#a78bfa",
        explain:
          "Turborepo delegates bundling to each package's build script (Vite/Webpack/esbuild). Tree-shaking effectiveness depends on the bundler and how well you've set up package exports.",
      },
    ];
  },

  /* ── Explanations ────────────────────────────────────── */

  getAnalysisExplanation(state: CiCdBuildState): string {
    const affected = state.packages.filter((p) => p.affected);
    return `Turborepo uses \`turbo run build --filter=...[HEAD~1]\` — it compares package-level hashes to find ${affected.length}/${state.packages.length} changed packages. Filtering is at package granularity (entire package rebuilt if any file changes).`;
  },

  getColdBuildExplanation(state: CiCdBuildState): string {
    const parallelism = Math.min(
      state.packages.filter((p) => p.affected).length,
      3,
    );
    return `First CI run — no cache. Turborepo schedules ${state.result.affectedCount} tasks in pipeline order with local ${parallelism}-way parallelism. Cold build takes ~${state.result.coldBuildMs}ms. No distributed execution — all tasks run on this CI agent.`;
  },

  getCacheLookupExplanation(state: CiCdBuildState): string {
    return `Second CI run (same code). Turborepo hashes each task's inputs (glob patterns from turbo.json + env vars). Checks local .turbo/ first, then Vercel Remote Cache. Hit rate: ${state.result.cacheHitRate}%.`;
  },

  getWarmBuildExplanation(state: CiCdBuildState): string {
    return `Cache HIT! Turborepo restores cached output and replays the task log. Total time ~${state.result.warmBuildMs}ms. Remote cache is shared via Vercel — any CI agent or dev can reuse it with \`turbo login && turbo link\`.`;
  },

  getTreeShakeExplanation(state: CiCdBuildState): string {
    return `Turborepo does not handle bundling itself — it delegates to each package's build tool. Tree-shaking removes ~${state.result.treeShakenKb}KB. Effectiveness depends on package.json "exports" field and the bundler's dead-code analysis.`;
  },

  /* ── Step reorder ────────────────────────────────────── */

  reorderSteps(steps: StepDef[]): StepDef[] {
    return steps; // Turborepo uses the default order
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
          fill = "rgba(192,132,252,0.12)";
          stroke = "#c084fc";
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

    drawGroup(shared, cols.shared, "#3b1a45", "#c084fc");
    drawGroup(libs, cols.lib, "#3b1a45", "#c084fc");
    drawGroup(apps, cols.app, "#2d1b3d", "#a855f7");

    // Edges: shared → libs, libs → apps
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

    if (phase === "affected") {
      const affected = state.packages.filter((p) => p.affected);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      builder.overlay((o: any) => {
        o.add(
          "text",
          {
            x: viewW / 2,
            y: 50,
            text: `turbo run build --filter: ${affected.length} packages affected`,
            fill: "#c084fc",
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
                ? "Saving task outputs → .turbo/ + Remote Cache"
                : phase === "cache-lookup"
                  ? "Checking Turbo cache for content hashes..."
                  : "Cache HIT — replaying task logs + outputs",
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
        color: "#c084fc",
      },
      {
        label: "Parallelism",
        value: `${state.result.parallelism}x`,
        color: "#a855f7",
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
