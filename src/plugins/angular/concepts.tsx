import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  /* Q1 — Constructor vs ngOnInit */
  | "lifecycle"
  | "constructor"
  | "ngoninit"
  | "dependency-injection"
  /* Q2 — View Encapsulation */
  | "view-encapsulation"
  | "emulated"
  | "encap-none"
  | "shadow-dom"
  /* Q3 — Standalone vs NgModule */
  | "standalone-overview"
  | "standalone"
  | "ngmodule"
  | "migration"
  /* Q4 — Change Detection */
  | "cd-overview"
  | "cd-default"
  | "cd-onpush"
  | "cd-signals"
  /* Q5 — Hierarchical DI */
  | "di-hierarchy"
  | "provided-in-root"
  | "component-providers"
  | "environment-injector"
  /* Q9 — Signals vs BehaviorSubject */
  | "sig-overview"
  | "sig-writable"
  | "sig-glitch-free"
  | "sig-behaviorsubject"
  | "sig-when-to-use";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  /* ═══ Q1 Concepts ══════════════════════════════════════ */
  lifecycle: {
    title: "Angular Lifecycle",
    subtitle: "Hook order from creation to destruction",
    accentColor: "#dd0031",
    sections: [
      {
        title: "The Sequence",
        accent: "#dd0031",
        content: (
          <>
            <p>
              <strong>1. constructor()</strong> — plain TypeScript. DI injection
              only.
            </p>
            <p>
              <strong>2. ngOnChanges()</strong> — whenever an @Input changes (or
              is first set).
            </p>
            <p>
              <strong>3. ngOnInit()</strong> — called once after the first
              ngOnChanges. Safe for initialisation logic.
            </p>
            <p>
              <strong>4. ngDoCheck()</strong> →{" "}
              <strong>ngAfterContentInit()</strong> →{" "}
              <strong>ngAfterViewInit()</strong> →{" "}
              <strong>ngOnDestroy()</strong>.
            </p>
          </>
        ),
      },
    ],
  },
  constructor: {
    title: "Constructor",
    subtitle: "TypeScript class constructor — NOT an Angular hook",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What Happens Here",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              The constructor is a <strong>TypeScript class feature</strong>,
              not an Angular lifecycle hook. It runs when the class is
              instantiated — before Angular has done anything.
            </p>
            <p>
              <strong>Safe:</strong> Inject services via constructor parameters.
            </p>
            <p>
              <strong>Unsafe:</strong> Access @Input() values, make HTTP calls
              that depend on inputs, or manipulate the DOM.
            </p>
          </>
        ),
      },
    ],
  },
  ngoninit: {
    title: "ngOnInit",
    subtitle: "The correct place for initialisation logic",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Why ngOnInit?",
        accent: "#22c55e",
        content: (
          <>
            <p>
              By the time <code>ngOnInit()</code> fires, Angular has already:
            </p>
            <p>• Injected all dependencies via the constructor.</p>
            <p>• Bound all @Input() properties for the first time.</p>
            <p>• Called ngOnChanges() at least once.</p>
            <p>
              This is the <strong>earliest safe point</strong> to use input
              values, call HTTP services, or run initialisation logic.
            </p>
          </>
        ),
      },
    ],
  },
  "dependency-injection": {
    title: "Dependency Injection",
    subtitle: "Angular's DI container at work",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "How It Works",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              Angular's hierarchical injector resolves constructor parameters
              marked with <code>@Injectable()</code> tokens.
            </p>
            <p>
              The injector runs <strong>during</strong> the constructor call —
              so injected services are available immediately inside the
              constructor body.
            </p>
            <p>
              This is why the constructor is the right place for DI, but NOT for
              logic that needs @Input() values.
            </p>
          </>
        ),
      },
    ],
  },

  /* ═══ Q2 Concepts ══════════════════════════════════════ */
  "view-encapsulation": {
    title: "View Encapsulation",
    subtitle: "If I write CSS inside this component… who does it affect?",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "The Core Question",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              View encapsulation controls{" "}
              <strong>
                whether your component's CSS is local, global, or completely
                isolated
              </strong>
              .
            </p>
            <p>
              Think of each component as a <strong>house</strong>. CSS is the
              decoration (paint, furniture). The question is: does your
              decoration stay inside your house… or spill into your neighbor's
              house?
            </p>
          </>
        ),
      },
      {
        title: "The 3 Modes",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              <strong>Emulated</strong> (default) — 🏠 "Private-ish room".
              Angular fakes isolation with <code>_ngcontent</code> attributes.
              Use 99% of the time.
            </p>
            <p>
              <strong>None</strong> — 🌍 "Global chaos mode". Your CSS becomes
              global and affects everything in the app. Only for intentional
              global theming.
            </p>
            <p>
              <strong>ShadowDom</strong> — 🔒 "Locked room". Real browser-level
              isolation. Nothing leaks in or out. For strict isolation (design
              systems, web components).
            </p>
          </>
        ),
      },
      {
        title: "The Interview Insight",
        accent: "#ef4444",
        content: (
          <>
            <p>
              Angular isn't doing magic CSS — it's controlling{" "}
              <strong>scope of styles</strong>:
            </p>
            <p>
              • <strong>Emulated</strong> → fake scoping (attributes)
            </p>
            <p>
              • <strong>None</strong> → no scoping at all
            </p>
            <p>
              • <strong>ShadowDom</strong> → real browser scoping
            </p>
          </>
        ),
      },
    ],
  },
  emulated: {
    title: "Emulated — 🏠 Private-ish Room",
    subtitle: "Angular fakes isolation — and it works great",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "How It Works",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              Angular adds unique attributes like <code>_ngcontent-abc</code> to
              your component's elements, then rewrites your CSS to only match
              those attributes.
            </p>
            <p>
              You write:{" "}
              <code>
                button {"{"} color: red {"}"}
              </code>
            </p>
            <p>
              Angular compiles to:{" "}
              <code>
                button[_ngcontent-abc] {"{"} color: red {"}"}
              </code>
            </p>
            <p>
              → Only buttons <strong>inside this component</strong> turn red.
              Other buttons in the app are untouched.
            </p>
          </>
        ),
      },
      {
        title: "What Angular Generates in the DOM",
        accent: "#22c55e",
        content: (
          <>
            <p>Your template:</p>
            <pre style={{ color: "#86efac", fontSize: "0.8rem" }}>
              {'<h2 class="title">Hello</h2>'}
            </pre>
            <p>Actual DOM output:</p>
            <pre style={{ color: "#93c5fd", fontSize: "0.8rem" }}>
              {'<h2 _ngcontent-abc class="title">Hello</h2>'}
            </pre>
            <p>CSS output:</p>
            <pre style={{ color: "#fde68a", fontSize: "0.8rem" }}>
              {".title[_ngcontent-abc] { color: red }"}
            </pre>
          </>
        ),
      },
    ],
  },
  "encap-none": {
    title: "None — 🌍 Global Chaos Mode",
    subtitle: "No protection at all — your CSS becomes global",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What Happens",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              You write:{" "}
              <code>
                button {"{"} color: red {"}"}
              </code>
            </p>
            <p>
              Angular emits it as-is into a global <code>&lt;style&gt;</code>{" "}
              block. <strong>ALL buttons everywhere turn red.</strong>
            </p>
            <p>
              ⚠ Dangerous if used carelessly. Only use for intentional global
              theming or CSS resets.
            </p>
          </>
        ),
      },
      {
        title: "What Angular Generates in the DOM",
        accent: "#ef4444",
        content: (
          <>
            <p>Your template:</p>
            <pre style={{ color: "#86efac", fontSize: "0.8rem" }}>
              {'<h2 class="title">Hello</h2>'}
            </pre>
            <p>Actual DOM output (no scoping attribute!):</p>
            <pre style={{ color: "#fca5a5", fontSize: "0.8rem" }}>
              {'<h2 class="title">Hello</h2>'}
            </pre>
            <p>CSS output (global!):</p>
            <pre style={{ color: "#fca5a5", fontSize: "0.8rem" }}>
              {".title { color: red }  ← affects EVERY .title"}
            </pre>
          </>
        ),
      },
    ],
  },
  "shadow-dom": {
    title: "Shadow DOM — 🔒 Locked Room",
    subtitle: "Real browser-level isolation — nothing leaks in or out",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "How It Works",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              Angular creates a native <code>#shadow-root</code> for the
              component. Your CSS <strong>cannot affect outside</strong>, and
              outside CSS <strong>cannot affect inside</strong>.
            </p>
            <p>
              This is the <em>sealed box</em> — the strongest isolation
              available, but it comes with trade-offs:
            </p>
            <p>
              • Global CSS (Bootstrap, Tailwind) won't pierce the shadow
              boundary
            </p>
            <p>
              • CSS custom properties (variables) still work across the boundary
            </p>
            <p>• Requires modern browsers (no IE11)</p>
          </>
        ),
      },
      {
        title: "What Angular Generates in the DOM",
        accent: "#22c55e",
        content: (
          <>
            <p>Actual DOM output:</p>
            <pre style={{ color: "#5eead4", fontSize: "0.8rem" }}>
              {`<app-card>
  #shadow-root (open)
    <style>.title { color: red }</style>
    <h2 class="title">Hello</h2>`}
            </pre>
            <p>
              The <code>#shadow-root</code> boundary means this{" "}
              <code>.title</code> rule is completely invisible to the rest of
              the page.
            </p>
          </>
        ),
      },
    ],
  },

  /* ═══ Q3 Concepts ══════════════════════════════════════ */
  "standalone-overview": {
    title: "Standalone vs NgModule",
    subtitle: "How should you organise Angular components?",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "The Core Question",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              Should your component be <strong>self-contained</strong>{" "}
              (standalone) or <strong>belong to a module</strong> (NgModule)?
            </p>
            <p>
              Think of it like a toolbox: standalone components carry their own
              tools, while NgModule components share a communal workshop.
            </p>
          </>
        ),
      },
      {
        title: "The Two Approaches",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              <strong>Standalone</strong> (v14+) — 📦 Self-contained.{" "}
              <code>standalone: true</code> + direct imports. Recommended
              default since v17.
            </p>
            <p>
              <strong>NgModule</strong> — 📋 Traditional. Group components in
              modules. Still needed for legacy libraries and some advanced
              patterns.
            </p>
          </>
        ),
      },
      {
        title: "The Interview Insight",
        accent: "#ef4444",
        content: (
          <>
            <p>
              "For new projects, always use standalone components. Use NgModules
              only when integrating legacy libraries that require them."
            </p>
            <p>
              The Angular team is gradually making NgModules optional —
              standalone is the future.
            </p>
          </>
        ),
      },
    ],
  },
  standalone: {
    title: "Standalone Components — 📦 Self-Contained",
    subtitle: "No module needed — the component IS the unit",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "How It Works",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              Add <code>standalone: true</code> to your <code>@Component</code>{" "}
              decorator and list dependencies directly in <code>imports</code>.
            </p>
            <p>
              The component becomes a self-contained unit — no{" "}
              <code>@NgModule</code> file needed.
            </p>
          </>
        ),
      },
      {
        title: "Benefits",
        accent: "#22c55e",
        content: (
          <>
            <p>
              • <strong>Less boilerplate</strong> — no module file to create or
              maintain.
            </p>
            <p>
              • <strong>Better tree-shaking</strong> — bundler knows exact
              dependencies per component.
            </p>
            <p>
              • <strong>Direct lazy-loading</strong> —{" "}
              <code>loadComponent</code> instead of <code>loadChildren</code>.
            </p>
            <p>
              • <strong>Simpler composition</strong> — import standalone
              components directly into other standalone components.
            </p>
          </>
        ),
      },
      {
        title: "Example",
        accent: "#a78bfa",
        content: (
          <>
            <pre style={{ color: "#5eead4", fontSize: "0.8rem" }}>
              {`@Component({
  standalone: true,
  selector: 'app-card',
  imports: [CommonModule, RouterLink],
  template: \`<a routerLink="/detail">...</a>\`
})`}
            </pre>
          </>
        ),
      },
    ],
  },
  ngmodule: {
    title: "NgModules — 📋 Traditional Approach",
    subtitle: "Group declarations, imports, providers, and exports",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "How It Works",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Components are grouped inside <code>@NgModule</code> classes. Each
              module has <code>declarations</code>, <code>imports</code>,{" "}
              <code>providers</code>, and <code>exports</code> arrays.
            </p>
            <p>
              A component must be declared in exactly one module to be usable.
            </p>
          </>
        ),
      },
      {
        title: "When You Still Need NgModules",
        accent: "#ef4444",
        content: (
          <>
            <p>
              • <strong>Legacy libraries</strong> — some Angular libraries only
              export NgModules.
            </p>
            <p>
              • <strong>Module-level providers</strong> — <code>forRoot()</code>
              /<code>forChild()</code> patterns.
            </p>
            <p>
              • <strong>Existing large apps</strong> — gradual migration is
              fine; mixing standalone and modules works.
            </p>
          </>
        ),
      },
      {
        title: "Example",
        accent: "#a78bfa",
        content: (
          <>
            <pre style={{ color: "#fcd34d", fontSize: "0.8rem" }}>
              {`@NgModule({
  declarations: [CardComponent, ListComponent],
  imports: [CommonModule, FormsModule],
  exports: [CardComponent]
})
export class FeatureModule {}`}
            </pre>
          </>
        ),
      },
    ],
  },
  migration: {
    title: "Migration Strategy",
    subtitle: "Moving from NgModules to standalone",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Angular's Migration Schematic",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              Angular provides an automatic migration:{" "}
              <code>ng generate @angular/core:standalone</code>
            </p>
            <p>
              It converts components to standalone and removes empty modules in
              three passes.
            </p>
          </>
        ),
      },
      {
        title: "Gradual Migration",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              • Standalone and NgModule components <strong>can coexist</strong>{" "}
              in the same app.
            </p>
            <p>• Start by making new components standalone.</p>
            <p>
              • Migrate leaf components first, then work up to shared modules.
            </p>
            <p>
              • The <code>importProvidersFrom()</code> helper bridges
              module-level providers into standalone bootstrapping.
            </p>
          </>
        ),
      },
    ],
  },
  /* ── Q4 — Change Detection ──────────────────────────────── */

  "cd-overview": {
    title: "Change Detection",
    subtitle: "How Angular knows when to update the DOM",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "The Core Problem",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              Angular needs to keep the DOM in sync with your component data.
              Whenever a value changes, the corresponding template binding must
              be updated.
            </p>
            <p>
              <strong>Change detection</strong> is the mechanism that compares
              current values with previous values and patches the DOM when
              differences are found.
            </p>
          </>
        ),
      },
      {
        title: "Zone.js — The Trigger",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              Angular uses <strong>Zone.js</strong> to monkey-patch every async
              API: <code>setTimeout</code>, <code>Promise</code>,
              <code>addEventListener</code>, <code>XMLHttpRequest</code>, etc.
            </p>
            <p>
              After any async callback completes, Zone.js notifies Angular,
              which calls <code>ApplicationRef.tick()</code> to start a
              change-detection cycle.
            </p>
          </>
        ),
      },
    ],
  },

  "cd-default": {
    title: "Default Strategy",
    subtitle: "Check every component on every event",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "How It Works",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              With the default strategy, Angular walks the{" "}
              <strong>entire component tree</strong> top-down on every tick.
              Every component's template bindings are compared to their previous
              values.
            </p>
            <p>
              This is simple and reliable — you never miss an update. But in
              large apps with hundreds of components, checking every binding on
              every click or timer can become a performance bottleneck.
            </p>
          </>
        ),
      },
      {
        title: "When It's Fine",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              For small-to-medium apps, default change detection works great.
              Angular's dirty checking is fast — it only compares values, not
              the DOM.
            </p>
            <p>
              Problems appear in <strong>deep trees</strong> with many bindings,
              or when expensive getters/pipes run during every check cycle.
            </p>
          </>
        ),
      },
    ],
  },

  "cd-onpush": {
    title: "OnPush Strategy",
    subtitle: "Only check when inputs change",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Opt-In Performance",
        accent: "#22c55e",
        content: (
          <>
            <p>
              With <code>changeDetection: ChangeDetectionStrategy.OnPush</code>,
              Angular <strong>skips</strong> checking a component unless:
            </p>
            <p>
              1. An <code>@Input()</code> reference changes (not mutation!).
            </p>
            <p>
              2. An Observable emits via the <code>async</code> pipe.
            </p>
            <p>
              3. <code>markForCheck()</code> or <code>detectChanges()</code> is
              called manually.
            </p>
            <p>4. A DOM event fires inside the component's template.</p>
          </>
        ),
      },
      {
        title: "Immutability Matters",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              OnPush compares <code>@Input()</code> by{" "}
              <strong>reference</strong>, not deep equality. Mutating an object
              won't trigger a check — you must create a{" "}
              <strong>new reference</strong>:
            </p>
            <p>
              <code>this.items = [...this.items, newItem]</code> ✓
            </p>
            <p>
              <code>this.items.push(newItem)</code> ✗ (same reference)
            </p>
          </>
        ),
      },
    ],
  },

  "cd-signals": {
    title: "Angular Signals (Future)",
    subtitle: "Fine-grained reactivity without Zone.js",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "Beyond Zone.js",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              Angular 16+ introduced <strong>Signals</strong> — a fine-grained
              reactivity primitive. When a signal's value changes, Angular knows
              exactly which component needs updating.
            </p>
            <p>
              This eliminates the need for Zone.js to trigger full-tree checks.
              Only the affected template bindings are refreshed.
            </p>
          </>
        ),
      },
      {
        title: "Zoneless Angular",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              With signals and the experimental{" "}
              <code>provideExperimentalZonelessChangeDetection()</code>, Angular
              can run without Zone.js entirely.
            </p>
            <p>
              This yields the smallest bundles and most predictable change
              detection — the framework's long-term direction.
            </p>
          </>
        ),
      },
    ],
  },
  /* ── Q5 — Hierarchical Dependency Injection ─────────────── */

  "di-hierarchy": {
    title: "Hierarchical Injector Tree",
    subtitle: "How Angular resolves providers up the tree",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "The Injector Tree",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              Angular maintains a <strong>tree of injectors</strong> that
              mirrors the component tree. Every component has an associated
              injector.
            </p>
            <p>
              When a component requests a dependency, Angular walks{" "}
              <strong>up</strong> the injector tree — from the component's own
              injector to its parent, then grandparent, all the way to the{" "}
              <strong>root injector</strong>.
            </p>
          </>
        ),
      },
      {
        title: "Resolution Order",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              1. <strong>Element injector</strong> — providers on the component
              itself.
            </p>
            <p>
              2. <strong>Parent element injectors</strong> — walk up through
              ancestors.
            </p>
            <p>
              3. <strong>Module / Environment injector</strong> — the NgModule
              or <code>EnvironmentInjector</code> that owns the component.
            </p>
            <p>
              4. <strong>Root injector</strong> — where{" "}
              <code>providedIn: 'root'</code> services live.
            </p>
            <p>
              5. <strong>Platform injector</strong> — shared across multiple
              Angular apps on the same page.
            </p>
          </>
        ),
      },
    ],
  },

  "provided-in-root": {
    title: "providedIn: 'root'",
    subtitle: "Singleton services and tree-shaking",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "The Recommended Pattern",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              Using{" "}
              <code>
                @Injectable({"{"} providedIn: 'root' {"}"})
              </code>{" "}
              registers the service in the <strong>root injector</strong>. Every
              component in the app receives the{" "}
              <strong>same singleton instance</strong>.
            </p>
            <p>
              This is Angular's recommended approach for most services — it's
              simple and enables <strong>tree-shaking</strong>: if no component
              injects the service, the bundler removes it entirely.
            </p>
          </>
        ),
      },
      {
        title: "Why Tree-Shakable?",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              With <code>providedIn: 'root'</code>, the{" "}
              <strong>service references the injector</strong> (not the other
              way around). The build tool can determine at compile time whether
              anyone actually imports and injects the service.
            </p>
            <p>
              In contrast, adding a service to a module's <code>providers</code>{" "}
              array means the module references the service — it will always be
              bundled.
            </p>
          </>
        ),
      },
    ],
  },

  "component-providers": {
    title: "Component-Level Providers",
    subtitle: "Per-component instances and isolation",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Overriding at the Component",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Adding a service to a component's <code>providers</code> array
              creates a <strong>new instance scoped to that component</strong>{" "}
              and its children. This <strong>shadows</strong> any parent-level
              provider of the same token.
            </p>
            <p>
              Each component that declares its own provider gets an{" "}
              <strong>independent instance</strong> — great for isolated state
              like form handlers or local caches.
            </p>
          </>
        ),
      },
      {
        title: "Lifecycle & Cleanup",
        accent: "#f87171",
        content: (
          <>
            <p>
              Component-scoped services are <strong>destroyed</strong> when the
              component is destroyed. This pairs naturally with{" "}
              <code>OnDestroy</code> for cleanup (subscriptions, timers, etc.).
            </p>
            <p>
              <strong>Trade-off:</strong> you lose tree-shaking (the module
              always references the service), and different subtrees hold
              different instances — be careful about shared state assumptions.
            </p>
          </>
        ),
      },
    ],
  },

  "environment-injector": {
    title: "EnvironmentInjector & Lazy Routes",
    subtitle: "Lazy-loaded modules get their own injector scope",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "Lazy-Loaded Injector Scope",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              When you lazy-load a route, Angular creates a child{" "}
              <strong>EnvironmentInjector</strong>. Any service provided in that
              lazy module (or route's <code>providers</code>) is scoped to the
              lazy-loaded subtree.
            </p>
            <p>
              This means lazy-loaded components get their{" "}
              <strong>own instance</strong> of the service — different from the
              root singleton. Eagerly loaded modules share the root injector.
            </p>
          </>
        ),
      },
      {
        title: "Standalone Route Providers",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              In standalone apps, use{" "}
              <code>loadChildren: () =&gt; import('./routes')</code> with a{" "}
              <code>providers</code> array in the <code>Route</code> config to
              create the same scoped injector behavior.
            </p>
            <p>
              This replaces the old pattern of using a lazy-loaded NgModule with{" "}
              <code>forChild()</code> providers. The{" "}
              <code>EnvironmentInjector</code> is created automatically when the
              route is activated.
            </p>
          </>
        ),
      },
    ],
  },

  /* ── Q9 — Signals vs BehaviorSubject ───────────────── */

  "sig-overview": {
    title: "Angular Reactivity",
    subtitle: "Signals and RxJS — two reactive models",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "The Two Models",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              Angular now has <strong>two reactive primitives</strong>:
              Signals (built-in since v16) and RxJS Observables (used since
              Angular 2).
            </p>
            <p>
              They solve different problems. Signals are{" "}
              <strong>synchronous and pull-based</strong> — you read the value
              when you need it. Observables are{" "}
              <strong>asynchronous and push-based</strong> — values arrive
              over time.
            </p>
          </>
        ),
      },
      {
        title: "Glitch-Free Execution",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              Signals guarantee <strong>glitch-free</strong> reads: when
              multiple signals update, derived values (<code>computed()</code>)
              are recalculated only once per change-detection cycle, never
              showing an inconsistent intermediate state.
            </p>
            <p>
              Observables can emit intermediate values between operators,
              which may briefly cause inconsistent UI states in complex
              pipelines.
            </p>
          </>
        ),
      },
    ],
  },

  "sig-writable": {
    title: "Writable Signal",
    subtitle: "signal(), computed(), effect()",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Creating & Reading",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              <code>const count = signal(0);</code> creates a writable signal.
              Read it by calling <code>count()</code> — no <code>.value</code>{" "}
              property, no subscription.
            </p>
            <p>
              Update with <code>count.set(5)</code> or{" "}
              <code>count.update(n =&gt; n + 1)</code>. All dependents are
              notified synchronously.
            </p>
          </>
        ),
      },
      {
        title: "Derived & Effects",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              <code>computed(() =&gt; count() * 2)</code> creates a read-only
              signal that auto-updates. It’s <strong>lazy and cached</strong> —
              only recalculates when a dependency changes.
            </p>
            <p>
              <code>effect(() =&gt; console.log(count()))</code> runs a
              side-effect whenever tracked signals change. It auto-tracks
              which signals are read — no explicit dependency list.
            </p>
          </>
        ),
      },
    ],
  },

  "sig-glitch-free": {
    title: "Glitch-Free Updates",
    subtitle: "No inconsistent intermediate states during updates",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Without Glitch-Free",
        accent: "#f87171",
        content: (
          <>
            <p>
              If <code>double</code> depends on <code>count</code>, a reactive
              system without glitch-free guarantees can briefly expose a
              mismatched state while updates are propagating.
            </p>
            <pre style={{ color: "#fca5a5", fontSize: "0.8rem" }}>{`count = 2
double = 2   ← stale! should be 4`}</pre>
            <p>
              The UI can momentarily show <strong>partial updates</strong>:
              one value has changed, but the derived value has not caught up
              yet.
            </p>
          </>
        ),
      },
      {
        title: "With Glitch-Free Signals",
        accent: "#22c55e",
        content: (
          <>
            <p>
              Signals batch dependency recomputation so derived values stay
              consistent. You never observe the system halfway through an
              update.
            </p>
            <pre style={{ color: "#86efac", fontSize: "0.8rem" }}>{`count = 2
double = 4   ✓ always consistent`}</pre>
            <p>
              All dependent values update <strong>atomically</strong>, so the
              UI always sees a coherent snapshot.
            </p>
          </>
        ),
      },
      {
        title: "One-Liner",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              Glitch-free means <strong>you never observe partial updates</strong>
              — everything stays consistent at all times.
            </p>
          </>
        ),
      },
    ],
  },
  "sig-behaviorsubject": {
    title: "BehaviorSubject",
    subtitle: "RxJS observable with current value",
    accentColor: "#f87171",
    sections: [
      {
        title: "Creating & Reading",
        accent: "#f87171",
        content: (
          <>
            <p>
              <code>new BehaviorSubject&lt;number&gt;(0)</code> creates a
              subject that always holds a current value. Read it via{" "}
              <code>.value</code> or <code>.getValue()</code>.
            </p>
            <p>
              Emit a new value with <code>.next(5)</code>. Consumers receive
              updates via <code>.subscribe()</code> or the{" "}
              <code>async</code> pipe in templates.
            </p>
          </>
        ),
      },
      {
        title: "Subscription Management",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Every <code>.subscribe()</code> creates a subscription that{" "}
              <strong>must be cleaned up</strong> to avoid memory leaks. Common
              patterns:
            </p>
            <p>
              • <code>takeUntilDestroyed()</code> (Angular 16+)
            </p>
            <p>
              • Store subscription and call <code>.unsubscribe()</code> in{" "}
              <code>ngOnDestroy</code>
            </p>
            <p>
              • Use the <code>async</code> pipe which auto-unsubscribes
            </p>
          </>
        ),
      },
    ],
  },

  "sig-when-to-use": {
    title: "When to Use Which",
    subtitle: "Signals vs RxJS decision guide",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "Use Signals For",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              • <strong>Local component state</strong> (counters, toggles,
              form state)
            </p>
            <p>
              • <strong>Derived / computed values</strong> in templates
            </p>
            <p>
              • <strong>Simple parent→child data flow</strong> via input
              signals
            </p>
            <p>
              • When you want <strong>no subscription management</strong> and
              zoneless change detection
            </p>
          </>
        ),
      },
      {
        title: "Use BehaviorSubject / RxJS For",
        accent: "#f87171",
        content: (
          <>
            <p>
              • <strong>Complex async pipelines</strong> (HTTP, WebSockets,
              debounce, retry)
            </p>
            <p>
              • <strong>Multi-step transformations</strong> with operators
              (switchMap, combineLatest, merge)
            </p>
            <p>
              • <strong>Interop with existing RxJS code</strong> — use{" "}
              <code>toSignal()</code> and <code>toObservable()</code> to bridge
            </p>
            <p>
              • When you need <strong>backpressure</strong> or{" "}
              <strong>cancellation</strong> semantics
            </p>
          </>
        ),
      },
    ],
  },
};
