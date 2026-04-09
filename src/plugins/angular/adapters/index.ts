export type {
  AngularAdapter,
  StatBadgeConfig,
  SceneHelpers,
  VariantProfile,
  VariantColors,
} from "./types";

import type { VariantKey } from "../angularSlice";
import type { AngularAdapter } from "./types";
import { constructorAdapter } from "./constructor";
import { ngoninitAdapter } from "./ngoninit";
import { emulatedAdapter } from "./emulated";
import { noneAdapter } from "./none";
import { shadowDomAdapter } from "./shadow-dom";
import { standaloneAdapter } from "./standalone";
import { ngmoduleAdapter } from "./ngmodule";
import { providedInRootAdapter } from "./provided-in-root";
import { componentProviderAdapter } from "./component-provider";
import { defaultCdAdapter } from "./default-cd";
import { onpushCdAdapter } from "./onpush-cd";
import { writableSignalAdapter } from "./writable-signal";
import { behaviorSubjectAdapter } from "./behavior-subject";

/* ── Topic definitions ────────────────────────────────── */

export type TopicKey =
  | "constructor-vs-ngoninit"
  | "view-encapsulation"
  | "standalone-vs-ngmodule"
  | "change-detection"
  | "hierarchical-di"
  | "signals-vs-rxjs";

export interface TopicDef {
  id: TopicKey;
  label: string;
  variants: VariantKey[];
  defaultVariant: VariantKey;
}

export const TOPICS: TopicDef[] = [
  {
    id: "constructor-vs-ngoninit",
    label: "Q1 — Constructor vs ngOnInit",
    variants: ["constructor", "ngoninit"],
    defaultVariant: "constructor",
  },
  {
    id: "view-encapsulation",
    label: "Q2 — View Encapsulation",
    variants: ["emulated", "none", "shadow-dom"],
    defaultVariant: "emulated",
  },
  {
    id: "standalone-vs-ngmodule",
    label: "Q3 — Standalone vs NgModule",
    variants: ["standalone", "ngmodule"],
    defaultVariant: "standalone",
  },
  {
    id: "change-detection",
    label: "Q4 — Change Detection",
    variants: ["default-cd", "onpush-cd"],
    defaultVariant: "default-cd",
  },
  {
    id: "hierarchical-di",
    label: "Q5 — Hierarchical DI",
    variants: ["provided-in-root", "component-provider"],
    defaultVariant: "provided-in-root",
  },
  {
    id: "signals-vs-rxjs",
    label: "Q9 — Signals vs BehaviorSubject",
    variants: ["writable-signal", "behavior-subject"],
    defaultVariant: "writable-signal",
  },
];

/* ── Adapter registry ─────────────────────────────────── */

const ADAPTERS: Record<VariantKey, AngularAdapter> = {
  constructor: constructorAdapter,
  ngoninit: ngoninitAdapter,
  emulated: emulatedAdapter,
  none: noneAdapter,
  "shadow-dom": shadowDomAdapter,
  standalone: standaloneAdapter,
  ngmodule: ngmoduleAdapter,
  "provided-in-root": providedInRootAdapter,
  "component-provider": componentProviderAdapter,
  "default-cd": defaultCdAdapter,
  "onpush-cd": onpushCdAdapter,
  "writable-signal": writableSignalAdapter,
  "behavior-subject": behaviorSubjectAdapter,
};

export function getAdapter(key: VariantKey): AngularAdapter {
  return ADAPTERS[key];
}

export const allAdapters: AngularAdapter[] = Object.values(ADAPTERS);
