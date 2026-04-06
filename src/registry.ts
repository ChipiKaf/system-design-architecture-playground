import type { DemoPlugin } from "./types/ModelPlugin";
import LoadBalancerPlugin from "./plugins/load-balancer";
import EventStreamingPlugin from "./plugins/event-streaming";
import LanggraphPlugin from "./plugins/langgraph";
import BigOPlugin from "./plugins/big-o";
import EventLoopPlugin from "./plugins/event-loop";
import EcsAutoscalingPlugin from "./plugins/ecs-autoscaling";
import PalindromePlugin from "./plugins/palindrome";
import CoinChangePlugin from "./plugins/coin-change";
import LcsPlugin from "./plugins/lcs";
import ScalabilityPlugin from "./plugins/scalability";
import HttpCachingPlugin from "./plugins/http-caching";
import FailoverPlugin from "./plugins/failover";
import ShardingPlugin from "./plugins/sharding";
import DbTradeoffPlugin from "./plugins/db-tradeoff";
import CapAcidPlugin from "./plugins/cap-acid";

/* ──────────────────────────────────────────────────────────
 *  Plugin Category Registry
 *
 *  To add a new category:
 *    1. Push a new PluginCategory into `categories` below.
 *
 *  To add a plugin to an existing category:
 *    1. Import the plugin.
 *    2. Add it to the `plugins` array of the target category.
 *
 *  The store, routes, and landing page all derive from this
 *  single source of truth — no other files need to change.
 * ────────────────────────────────────────────────────────── */

export interface PluginCategory {
  /** URL slug, e.g. "system-design" */
  id: string;
  /** Display name shown on the landing page */
  name: string;
  /** One-liner for the landing card */
  description: string;
  /** Accent colour for the card / heading */
  accent: string;
  /** Plugins that belong to this category */
  plugins: DemoPlugin[];
}

export const categories: PluginCategory[] = [
  {
    id: "system-design",
    name: "System Design",
    description:
      "Core infrastructure components — load balancers, message brokers, caching layers, and more.",
    accent: "#3b82f6",
    plugins: [
      LoadBalancerPlugin,
      EventStreamingPlugin,
      EcsAutoscalingPlugin,
      ScalabilityPlugin,
      HttpCachingPlugin,
      FailoverPlugin,
      ShardingPlugin,
      DbTradeoffPlugin, CapAcidPlugin],
  },
  {
    id: "architecture",
    name: "Architecture & Patterns",
    description:
      "Design patterns, graph-based orchestration (LangGraph), AI pipelines, and other architectural concepts.",
    accent: "#8b5cf6",
    plugins: [LanggraphPlugin],
  },
  {
    id: "algorithms",
    name: "Algorithms",
    description:
      "Core algorithm ideas explained visually — time complexity, search strategies, growth curves, and more.",
    accent: "#f97316",
    plugins: [BigOPlugin, PalindromePlugin, CoinChangePlugin, LcsPlugin],
  },
  {
    id: "language-runtime",
    name: "Language & Runtime",
    description:
      "How code actually runs — event loops, call stacks, queues, rendering, and other runtime mechanics.",
    accent: "#14b8a6",
    plugins: [EventLoopPlugin],
  },
];

/* ── Helpers ─────────────────────────────────────────────── */

/** Flat list of every registered plugin. */
export const allPlugins: DemoPlugin[] = categories.flatMap((c) => c.plugins);

/** kebab-case → camelCase  ("event-streaming" → "eventStreaming") */
export const toCamelCase = (s: string) =>
  s.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

/**
 * Build a `{ [camelKey]: reducer }` map for configureStore.
 * Keyed by the camelCase version of each plugin.id so existing
 * plugin selectors (`state.loadBalancer`, `state.eventStreaming`)
 * keep working without change.
 */
export const pluginReducerMap = Object.fromEntries(
  allPlugins.map((p) => [toCamelCase(p.id), p.reducer]),
);

/** Look up which category a plugin belongs to. */
export function categoryForPlugin(
  pluginId: string,
): PluginCategory | undefined {
  return categories.find((c) => c.plugins.some((p) => p.id === pluginId));
}

/** Look up a plugin by id. */
export function findPlugin(pluginId: string): DemoPlugin | undefined {
  return allPlugins.find((p) => p.id === pluginId);
}

/** Look up a category by id. */
export function findCategory(categoryId: string): PluginCategory | undefined {
  return categories.find((c) => c.id === categoryId);
}
