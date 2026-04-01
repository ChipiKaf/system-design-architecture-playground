import type { DemoPlugin } from "./types/ModelPlugin";
import LoadBalancerPlugin from "./plugins/load-balancer";
import EventStreamingPlugin from "./plugins/event-streaming";

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
    plugins: [LoadBalancerPlugin, EventStreamingPlugin],
  },
  // {
  //   id: "architecture",
  //   name: "Architecture & Patterns",
  //   description:
  //     "Design patterns, graph-based orchestration (LangGraph), pub/sub topologies, and other architectural concepts.",
  //   accent: "#8b5cf6",
  //   plugins: [],
  // },
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
