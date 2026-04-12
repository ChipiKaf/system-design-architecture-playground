export type {
  NextjsAdapter,
  StatBadgeConfig,
  SceneHelpers,
  VariantProfile,
  VariantColors,
} from "./types";

import type { VariantKey } from "../nextjsSlice";
import type { NextjsAdapter } from "./types";
import { staticRenderingAdapter } from "./static-rendering";
import { dynamicRenderingAdapter } from "./dynamic-rendering";
import { clientSideRenderingAdapter } from "./client-side-rendering";
import { streamingAdapter } from "./streaming";
import { serverComponentsAdapter } from "./server-components";
import { clientComponentsAdapter } from "./client-components";
import { fileRoutingAdapter } from "./file-routing";
import { nestedLayoutsAdapter } from "./nested-layouts";
import { dataFetchingAdapter } from "./data-fetching";
import { cachingAdapter } from "./caching";

/* ── Topic definitions ────────────────────────────────── */

export type TopicKey = "rendering" | "components" | "routing" | "data-flow";

export interface TopicDef {
  id: TopicKey;
  label: string;
  variants: VariantKey[];
  defaultVariant: VariantKey;
}

export const TOPICS: TopicDef[] = [
  {
    id: "rendering",
    label: "Q1 — Rendering Strategies",
    variants: [
      "static-rendering",
      "dynamic-rendering",
      "client-side-rendering",
      "streaming",
    ],
    defaultVariant: "static-rendering",
  },
  {
    id: "components",
    label: "Q2 — Server vs Client",
    variants: ["server-components", "client-components"],
    defaultVariant: "server-components",
  },
  {
    id: "routing",
    label: "Q3 — Routing & Layouts",
    variants: ["file-routing", "nested-layouts"],
    defaultVariant: "file-routing",
  },
  {
    id: "data-flow",
    label: "Q4 — Data & Caching",
    variants: ["data-fetching", "caching"],
    defaultVariant: "data-fetching",
  },
];

/* ── Adapter registry ─────────────────────────────────── */

const ADAPTERS: Record<VariantKey, NextjsAdapter> = {
  "static-rendering": staticRenderingAdapter,
  "dynamic-rendering": dynamicRenderingAdapter,
  "client-side-rendering": clientSideRenderingAdapter,
  streaming: streamingAdapter,
  "server-components": serverComponentsAdapter,
  "client-components": clientComponentsAdapter,
  "file-routing": fileRoutingAdapter,
  "nested-layouts": nestedLayoutsAdapter,
  "data-fetching": dataFetchingAdapter,
  caching: cachingAdapter,
};

export function getAdapter(key: VariantKey): NextjsAdapter {
  return ADAPTERS[key];
}

export const allAdapters: NextjsAdapter[] = Object.values(ADAPTERS);
