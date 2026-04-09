import type { AngularState } from "./angularSlice";
import { getAdapter } from "./adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<AngularState>;
export type StepDef = GenericStepDef<AngularState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<AngularState>;

/* ── Token expansion (no $tokens needed) ─────────────── */

export function expandToken(token: string, state: AngularState): string[] {
  const adapter = getAdapter(state.variant);
  const expanded = adapter.expandToken(token, state);
  return expanded ?? [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  /* Q1 — Constructor vs ngOnInit */
  | "overview"
  | "instantiate"
  | "di-inject"
  | "input-binding"
  | "ngoninit-fires"
  | "init-logic"
  | "summary"
  /* Q2 — View Encapsulation */
  | "ve-overview"
  | "ve-define-styles"
  | "ve-apply-scoping"
  | "ve-render-output"
  | "ve-check-isolation"
  | "ve-summary"
  /* Q3 — Standalone vs NgModule */
  | "sc-overview"
  | "sc-declare"
  | "sc-imports"
  | "sc-compose"
  | "sc-treeshake"
  | "sc-summary"
  /* Q4 — Change Detection */
  | "cd-overview"
  | "cd-trigger"
  | "cd-walk"
  | "cd-check"
  | "cd-summary"
  /* Q5 — Hierarchical DI */
  | "di-overview"
  | "di-register"
  | "di-resolve"
  | "di-check"
  | "di-summary"
  /* Q9 — Signals vs BehaviorSubject */
  | "sig-overview"
  | "sig-create"
  | "sig-read"
  | "sig-update"
  | "sig-summary";

/* ── Step Configuration ──────────────────────────────── */

const isQ1 = (s: AngularState) => s.topic === "constructor-vs-ngoninit";
const isQ2 = (s: AngularState) => s.topic === "view-encapsulation";
const isQ3 = (s: AngularState) => s.topic === "standalone-vs-ngmodule";
const isQ4 = (s: AngularState) => s.topic === "change-detection";
const isQ5 = (s: AngularState) => s.topic === "hierarchical-di";
const isQ9 = (s: AngularState) => s.topic === "signals-vs-rxjs";

export const STEPS: StepDef[] = [
  /* ═══ Q1 — Constructor vs ngOnInit ═══════════════════ */
  {
    key: "overview",
    label: "Architecture Overview",
    when: isQ1,
    nextButton: "Begin →",
    action: "resetRun",
    explain: (s) => {
      const v = s.variant === "constructor" ? "Constructor" : "ngOnInit";
      return `Examining ${v} — step through to see the Angular component lifecycle.`;
    },
  },
  {
    key: "instantiate",
    label: "Instantiate Component",
    when: isQ1,
    phase: "instantiate",
    processingText: "Creating component...",
    flow: [{ from: "angular", to: "ctor", duration: 600 }],
    finalHotZones: ["angular", "ctor"],
    explain: () =>
      "Angular creates the component class. The TypeScript constructor() runs immediately.",
  },
  {
    key: "di-inject",
    label: "Inject Dependencies",
    when: isQ1,
    phase: "di",
    processingText: "Injecting services...",
    flow: [{ from: "di", to: "ctor", duration: 550 }],
    recalcMetrics: true,
    finalHotZones: ["di", "ctor"],
    explain: () =>
      "Angular's DI container injects services into the constructor parameters. This is the ONLY safe thing to do here.",
  },
  {
    key: "input-binding",
    label: "Bind @Input() Values",
    when: isQ1,
    phase: "inputs",
    processingText: "Binding inputs...",
    flow: [{ from: "ctor", to: "inputs", duration: 600 }],
    recalcMetrics: true,
    finalHotZones: ["inputs"],
    explain: (s) =>
      s.variant === "constructor"
        ? "@Input() properties are bound AFTER the constructor. Accessing them in the constructor returns undefined!"
        : "@Input() properties are now bound. Values from the parent component are available.",
  },
  {
    key: "ngoninit-fires",
    label: "ngOnInit Fires",
    when: isQ1,
    phase: "hook",
    processingText: "Firing lifecycle hook...",
    flow: [{ from: "inputs", to: "ngoninit", duration: 600 }],
    recalcMetrics: true,
    finalHotZones: ["ngoninit"],
    explain: () =>
      "Angular calls ngOnInit() — all @Input() values are available. This is the safe place for initialization logic.",
  },
  {
    key: "init-logic",
    label: "Run Init Logic",
    when: isQ1,
    phase: "logic",
    processingText: "Running logic...",
    flow: (s) => getAdapter(s.variant).getFlowBeats(s),
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "constructor" ? ["ctor", "http"] : ["ngoninit", "http"],
    explain: (s) =>
      s.variant === "constructor"
        ? "⚠ Constructor calls HTTP — but @Input() values are still undefined! This is a common bug."
        : "✓ ngOnInit calls HTTP — @Input() values are available. Safe and correct.",
  },
  {
    key: "summary",
    label: "Summary",
    when: isQ1,
    phase: "summary",
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "constructor" ? ["ctor", "http"] : ["ngoninit", "http"],
    explain: (s) =>
      s.variant === "constructor"
        ? "Constructor: only for DI injection. Accessing @Input() or calling services that rely on inputs will fail. Use ngOnInit instead."
        : "ngOnInit: the correct place for init logic. @Input() values are resolved, DI services are available, and the component is ready.",
  },

  /* ═══ Q2 — View Encapsulation ════════════════════════ */
  {
    key: "ve-overview",
    label: "Encapsulation Overview",
    when: isQ2,
    nextButton: "Begin →",
    action: "resetRun",
    explain: (s) => {
      if (s.variant === "emulated")
        return '🏠 Emulated (default) — "Private-ish room". Angular fakes isolation with _ngcontent attributes. Step through to see what it actually generates.';
      if (s.variant === "none")
        return '🌍 None — "Global chaos mode". No protection at all. Your CSS becomes global and affects everything. Step through to see the damage.';
      return '🔒 ShadowDom — "Locked room". Real browser-level isolation via native Shadow DOM. Nothing leaks in or out. Step through to see the sealed box.';
    },
  },
  {
    key: "ve-define-styles",
    label: "Write Component CSS",
    when: isQ2,
    phase: "ve-styles",
    processingText: "Writing CSS...",
    flow: [{ from: "component", to: "css", duration: 550 }],
    finalHotZones: ["component", "css"],
    explain: () =>
      "You write: button { color: red } inside your component. Question is — who does this affect? Just your component, or the whole app?",
  },
  {
    key: "ve-apply-scoping",
    label: "Angular Processes CSS",
    when: isQ2,
    phase: "ve-scoping",
    processingText: "Applying encapsulation...",
    flow: [{ from: "css", to: "encap", duration: 600 }],
    recalcMetrics: true,
    finalHotZones: ["encap"],
    explain: (s) => {
      if (s.variant === "emulated")
        return "Angular rewrites your CSS: button → button[_ngcontent-abc]. It adds a unique attribute so only YOUR component's buttons match. Fake scoping — but it works.";
      if (s.variant === "none")
        return "Angular does NOTHING to your CSS. It emits button { color: red } as-is into a global <style> block. No attributes, no scoping, no protection.";
      return "Angular creates a native #shadow-root boundary. Your CSS lives INSIDE the shadow root — the browser enforces isolation, not Angular.";
    },
  },
  {
    key: "ve-render-output",
    label: "Render Component",
    when: isQ2,
    phase: "ve-render",
    processingText: "Rendering DOM...",
    flow: [{ from: "encap", to: "myOutput", duration: 600 }],
    recalcMetrics: true,
    finalHotZones: ["myOutput"],
    explain: (s) => {
      if (s.variant === "emulated")
        return "Your component renders: <button _ngcontent-abc>Click</button>. The scoping attribute is there — only this component's button turns red.";
      if (s.variant === "none")
        return "Your component renders: <button>Click</button>. No special attributes. The global CSS rule matches ALL buttons on the entire page.";
      return "Your component renders inside #shadow-root. The button and its styles exist in a sealed box — invisible to the outside DOM.";
    },
  },
  {
    key: "ve-check-isolation",
    label: "Does It Leak?",
    when: isQ2,
    phase: "ve-isolation",
    processingText: "Checking neighbor...",
    flow: (s) => getAdapter(s.variant).getFlowBeats(s),
    recalcMetrics: true,
    finalHotZones: ["otherOutput", "browser"],
    explain: (s) => {
      if (s.variant === "emulated")
        return "✓ OtherComponent's buttons are untouched. Why? They don't have _ngcontent-abc — so the scoped CSS doesn't match them.";
      if (s.variant === "none")
        return "⚠ OtherComponent's buttons turned red too! The global CSS rule matches ANY button. Your decoration spilled into your neighbor's house.";
      return "✓ OtherComponent is completely unaffected. The shadow boundary blocks everything. But heads up — this only works in modern browsers.";
    },
  },
  {
    key: "ve-summary",
    label: "Key Takeaway",
    when: isQ2,
    phase: "ve-summary",
    recalcMetrics: true,
    finalHotZones: (s) => {
      if (s.variant === "none") return ["otherOutput"];
      return ["myOutput", "browser"];
    },
    explain: (s) => {
      if (s.variant === "emulated")
        return "🏠 Emulated = fake scoping via attributes. Use 99% of the time. It's the default for a reason — good isolation, all browsers, zero config.";
      if (s.variant === "none")
        return "🌍 None = no scoping. Your CSS is global. Only use intentionally for theming. If you see styles randomly breaking across components, check for ViewEncapsulation.None.";
      return "🔒 ShadowDom = real browser scoping. Strongest isolation. Use for design systems or web components. Trade-off: global CSS (Bootstrap, Tailwind) won't pierce the boundary.";
    },
  },

  /* ═══ Q3 — Standalone vs NgModule ════════════════════ */
  {
    key: "sc-overview",
    label: "Architecture Overview",
    when: isQ3,
    nextButton: "Begin →",
    action: "resetRun",
    explain: (s) => {
      if (s.variant === "standalone")
        return "📦 Standalone components (Angular 14+) — declare standalone: true and import dependencies directly. No NgModule wrapper needed. The recommended default since Angular 17.";
      return "📋 NgModules — the traditional way to organise Angular apps. Group declarations, imports, providers, and exports in a module class. Still needed for legacy libraries.";
    },
  },
  {
    key: "sc-declare",
    label: "Declare Component",
    when: isQ3,
    phase: "sc-declare",
    processingText: "Setting up component...",
    flow: (s) =>
      s.variant === "standalone"
        ? [{ from: "decorator", to: "imports", duration: 550 }]
        : [{ from: "ngmodule", to: "declarations", duration: 550 }],
    finalHotZones: (s) =>
      s.variant === "standalone"
        ? ["decorator", "imports"]
        : ["ngmodule", "declarations"],
    explain: (s) =>
      s.variant === "standalone"
        ? "With standalone: true, the component declares its own dependencies directly in the @Component decorator. No module file needed."
        : "In the NgModule approach, you create a separate module file and list the component in declarations. The component can't exist without being declared somewhere.",
  },
  {
    key: "sc-imports",
    label: "Wire Dependencies",
    when: isQ3,
    phase: "sc-imports",
    processingText: "Importing dependencies...",
    flow: (s) =>
      s.variant === "standalone"
        ? [{ from: "imports", to: "component", duration: 600 }]
        : [{ from: "imports", to: "component", duration: 600 }],
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "standalone"
        ? ["imports", "component"]
        : ["imports", "component"],
    explain: (s) =>
      s.variant === "standalone"
        ? "Dependencies (CommonModule, RouterLink, other standalone components) are imported directly in the component's imports array. Each component is self-contained."
        : "Dependencies are imported at the module level. Every component declared in the module shares the same set of imports — even if only one component needs them.",
  },
  {
    key: "sc-compose",
    label: "Compose & Lazy-Load",
    when: isQ3,
    phase: "sc-compose",
    processingText: "Composing...",
    flow: (s) =>
      s.variant === "standalone"
        ? [{ from: "component", to: "bundle", duration: 600 }]
        : [{ from: "component", to: "bundle", duration: 600 }],
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "standalone"
        ? ["component", "bundle"]
        : ["component", "bundle"],
    explain: (s) =>
      s.variant === "standalone"
        ? "✓ Standalone components can be lazy-loaded directly: loadComponent: () => import('./card.component'). No module wrapper needed."
        : "⚠ Lazy-loading requires a module wrapper: loadChildren: () => import('./feature.module'). Extra file, extra boilerplate.",
  },
  {
    key: "sc-treeshake",
    label: "Tree-Shaking Check",
    when: isQ3,
    phase: "sc-treeshake",
    processingText: "Analysing bundle...",
    flow: (s) => getAdapter(s.variant).getFlowBeats(s),
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "standalone"
        ? ["treeShake", "result"]
        : ["treeShake", "result"],
    explain: (s) =>
      s.variant === "standalone"
        ? "✓ The bundler knows exactly what each component imports. Unused code is eliminated. Smallest possible bundle."
        : "⚠ The bundler sees everything declared in the module as potentially needed. Unused components in the same module may not be tree-shaken.",
  },
  {
    key: "sc-summary",
    label: "Key Takeaway",
    when: isQ3,
    phase: "sc-summary",
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "standalone"
        ? ["decorator", "treeShake", "result"]
        : ["ngmodule", "treeShake", "result"],
    explain: (s) =>
      s.variant === "standalone"
        ? "📦 Standalone = less boilerplate, better tree-shaking, direct lazy-loading. Use for all new projects. The Angular team recommends this as the default since v17."
        : "📋 NgModule = more ceremony, coarser bundles, but still necessary for legacy libraries and some advanced provider patterns. Migrate gradually.",
  },
  /* ═══ Q4 — Change Detection ══════════════════════════ */
  {
    key: "cd-overview",
    label: "Change Detection Overview",
    when: isQ4,
    nextButton: "Begin →",
    action: "resetRun",
    explain: (s) => {
      if (s.variant === "default-cd")
        return "🔄 Default strategy — Zone.js intercepts every async event and triggers a full change-detection cycle. Angular checks every component in the tree, even if nothing changed.";
      return "⚡ OnPush strategy — Angular only checks a component when its @Input() reference changes, an Observable emits via async pipe, or markForCheck() is called. Unchanged branches are skipped.";
    },
  },
  {
    key: "cd-trigger",
    label: "Trigger Event",
    when: isQ4,
    phase: "cd-trigger",
    processingText: "Event detected...",
    flow: [
      { from: "event", to: "zonejs", duration: 500 },
      { from: "zonejs", to: "cd", duration: 500 },
    ],
    finalHotZones: ["event", "zonejs", "cd"],
    explain: () =>
      "An async event fires (click, HTTP response, setTimeout). Zone.js intercepts it and calls ApplicationRef.tick() to start change detection.",
  },
  {
    key: "cd-walk",
    label: "Walk Component Tree",
    when: isQ4,
    phase: "cd-walk",
    processingText: "Walking tree...",
    flow: (s) =>
      s.variant === "default-cd"
        ? [
            { from: "cd", to: "root", duration: 400 },
            { from: "root", to: "compA", duration: 400 },
            { from: "root", to: "compB", duration: 400 },
            { from: "root", to: "compC", duration: 400 },
          ]
        : [
            { from: "cd", to: "root", duration: 400 },
            { from: "root", to: "compA", duration: 400 },
          ],
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "default-cd"
        ? ["root", "compA", "compB", "compC"]
        : ["root", "compA", "compB", "compC"],
    explain: (s) =>
      s.variant === "default-cd"
        ? "Angular walks the entire component tree top-down. With the default strategy, every component is visited and its template bindings are checked for changes."
        : "Angular walks the tree but checks OnPush components only when their @Input() reference changed. ComponentB and ComponentC have no new @Input — they are skipped entirely.",
  },
  {
    key: "cd-check",
    label: "Check Results",
    when: isQ4,
    phase: "cd-check",
    processingText: "Comparing...",
    flow: (s) => getAdapter(s.variant).getFlowBeats(s),
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "default-cd"
        ? ["compA", "compB", "compC", "result"]
        : ["compA", "result"],
    explain: (s) =>
      s.variant === "default-cd"
        ? "⚠ All 3 components were checked. Only ComponentA had actual data changes — the checks on B and C were wasted work. In deep trees this adds up."
        : "✓ Only ComponentA was checked (its @Input reference changed). ComponentB and ComponentC were skipped — no wasted checks, faster cycle.",
  },
  {
    key: "cd-summary",
    label: "Key Takeaway",
    when: isQ4,
    phase: "cd-summary",
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "default-cd"
        ? ["zonejs", "compA", "compB", "compC", "result"]
        : ["compA", "result"],
    explain: (s) =>
      s.variant === "default-cd"
        ? "🔄 Default = simple but expensive. Every async event checks every component. Fine for small apps, but a bottleneck in deep trees. Consider OnPush for performance-critical components."
        : "⚡ OnPush = opt-in performance. Only checks on @Input change, async pipe emission, or markForCheck(). Makes components more predictable and drastically reduces checks in large trees.",
  },
  /* ═══ Q5 — Hierarchical DI ══════════════════════════ */
  {
    key: "di-overview",
    label: "Injector Tree Overview",
    when: isQ5,
    nextButton: "Begin →",
    action: "resetRun",
    explain: (s) => {
      if (s.variant === "provided-in-root")
        return "🌳 providedIn: 'root' — the service is registered at the top of the injector tree. Every component that asks for it gets the same singleton instance.";
      return "🔀 Component providers — each component with providers: [Service] creates its own instance. Children inherit that instance, but siblings get different ones.";
    },
  },
  {
    key: "di-register",
    label: "Register Provider",
    when: isQ5,
    phase: "di-register",
    processingText: "Registering service...",
    flow: (s) =>
      s.variant === "provided-in-root"
        ? [{ from: "root", to: "service", duration: 550 }]
        : [
            { from: "compA", to: "svcA", duration: 550 },
            { from: "compB", to: "svcB", duration: 550 },
          ],
    finalHotZones: (s) =>
      s.variant === "provided-in-root"
        ? ["root", "service"]
        : ["compA", "svcA", "compB", "svcB"],
    explain: (s) =>
      s.variant === "provided-in-root"
        ? "The @Injectable({ providedIn: 'root' }) decorator tells Angular to register this service in the root injector at application startup. One instance, available everywhere."
        : "Each component has providers: [UserService] in its decorator. Angular creates a NEW instance for each component's injector — they don't share state.",
  },
  {
    key: "di-resolve",
    label: "Resolve & Inject",
    when: isQ5,
    phase: "di-resolve",
    processingText: "Walking the injector tree...",
    flow: (s) =>
      s.variant === "provided-in-root"
        ? [
            { from: "service", to: "compA", duration: 500 },
            { from: "service", to: "compB", duration: 500 },
          ]
        : [
            { from: "svcA", to: "childA", duration: 500 },
            { from: "svcB", to: "childB", duration: 500 },
          ],
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "provided-in-root"
        ? ["compA", "compB"]
        : ["childA", "childB"],
    explain: (s) =>
      s.variant === "provided-in-root"
        ? "When ComponentA or ComponentB request UserService, Angular walks up the injector tree → finds it at the root → returns the same singleton to both."
        : "ChildOfA walks up → finds UserService at ComponentA's injector → gets instance #1. ChildOfB walks up → finds it at ComponentB's injector → gets instance #2. Different instances!",
  },
  {
    key: "di-check",
    label: "Check Instances",
    when: isQ5,
    phase: "di-check",
    processingText: "Comparing instances...",
    flow: (s) => getAdapter(s.variant).getFlowBeats(s),
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "provided-in-root"
        ? ["childA", "childB", "result"]
        : ["svcA", "svcB", "result"],
    explain: (s) =>
      s.variant === "provided-in-root"
        ? "✓ Every component in the tree — including nested children — gets the exact same instance. State changes in one are visible in all."
        : "⚠ ComponentA's subtree has instance #1, ComponentB's subtree has instance #2. They don't share state. This is useful for isolated component state (e.g. form services).",
  },
  {
    key: "di-summary",
    label: "Key Takeaway",
    when: isQ5,
    phase: "di-summary",
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "provided-in-root"
        ? ["root", "service", "result"]
        : ["compA", "compB", "result"],
    explain: (s) =>
      s.variant === "provided-in-root"
        ? "🌳 providedIn: 'root' = singleton. Tree-shakable. Use for shared services (auth, HTTP, state). This is the default and recommended approach."
        : "🔀 Component providers = new instance per component subtree. Use for isolated state (form services, dialog data). Children inherit, siblings don't share. Also: lazy-loaded routes create their own EnvironmentInjector.",
  },

  /* ═══ Q9 — Signals vs BehaviorSubject ══════════════ */
  {
    key: "sig-overview",
    label: "Reactivity Overview",
    when: isQ9,
    nextButton: "Begin →",
    action: "resetRun",
    explain: (s) => {
      if (s.variant === "writable-signal")
        return "🟣 Writable Signal — Angular's built-in reactive primitive (v16+). Synchronous, glitch-free, and automatically integrated with change detection. No subscriptions, no async pipe.";
      return "🟠 BehaviorSubject — RxJS observable that holds a current value. Powerful operator ecosystem for async pipelines, but requires manual subscription management and the async pipe.";
    },
  },
  {
    key: "sig-create",
    label: "Create Reactive Value",
    when: isQ9,
    phase: "sig-create",
    processingText: "Creating...",
    flow: (s) =>
      s.variant === "writable-signal"
        ? [{ from: "create", to: "signal", duration: 550 }]
        : [{ from: "create", to: "subject", duration: 550 }],
    finalHotZones: (s) =>
      s.variant === "writable-signal"
        ? ["create", "signal"]
        : ["create", "subject"],
    explain: (s) =>
      s.variant === "writable-signal"
        ? "signal(0) creates a writable signal with initial value 0. Read it by calling count(). It's synchronous — always returns the current value immediately."
        : "new BehaviorSubject(0) creates an observable that holds value 0. Read via .value property or .subscribe(). It's part of the RxJS library.",
  },
  {
    key: "sig-read",
    label: "Derive & Consume",
    when: isQ9,
    phase: "sig-read",
    processingText: "Deriving...",
    flow: (s) =>
      s.variant === "writable-signal"
        ? [
            { from: "signal", to: "computed", duration: 500 },
            { from: "signal", to: "effect", duration: 500 },
          ]
        : [
            { from: "subject", to: "pipe", duration: 500 },
            { from: "subject", to: "subscribe", duration: 500 },
          ],
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "writable-signal"
        ? ["signal", "computed", "effect"]
        : ["subject", "pipe", "subscribe"],
    explain: (s) =>
      s.variant === "writable-signal"
        ? "computed() creates a derived signal that auto-updates when dependencies change. effect() runs side-effects when tracked signals change. Both are auto-tracked — no explicit dependency list needed."
        : ".pipe() chains RxJS operators (map, filter, switchMap) for powerful transformations. .subscribe() listens for new values — but you MUST unsubscribe in ngOnDestroy or use takeUntilDestroyed().",
  },
  {
    key: "sig-update",
    label: "Update & Render",
    when: isQ9,
    phase: "sig-update",
    processingText: "Updating...",
    flow: (s) => {
      const beats =
        s.variant === "writable-signal"
          ? [
              { from: "computed", to: "template", duration: 500 },
              { from: "effect", to: "template", duration: 500 },
            ]
          : [
              { from: "pipe", to: "template", duration: 500 },
              { from: "subscribe", to: "template", duration: 500 },
            ];
      return [...beats, ...getAdapter(s.variant).getFlowBeats(s)];
    },
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "writable-signal"
        ? ["template", "result"]
        : ["template", "result"],
    explain: (s) =>
      s.variant === "writable-signal"
        ? "Call set(newValue) or update(fn). The template reads {{ count() }} — no async pipe needed. Angular's change detection picks it up automatically because it tracks signal reads."
        : "Call .next(newValue) to emit. The template uses {{ data$ | async }} which subscribes and unsubscribes automatically. Manual subscribers must handle cleanup themselves.",
  },
  {
    key: "sig-summary",
    label: "Key Takeaway",
    when: isQ9,
    phase: "sig-summary",
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.variant === "writable-signal"
        ? ["signal", "computed", "template", "result"]
        : ["subject", "pipe", "subscribe", "result"],
    explain: (s) =>
      s.variant === "writable-signal"
        ? "🟣 Signals = synchronous, glitch-free, auto-tracked. Ideal for local/UI state. No subscriptions, no async pipe, no Zone.js needed. The future of Angular reactivity."
        : "🟠 BehaviorSubject = powerful async pipelines with RxJS operators. Ideal for complex streams (HTTP, WebSockets, multi-step transforms). Trade-off: manual subscription management and Zone.js dependency.",
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: AngularState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
