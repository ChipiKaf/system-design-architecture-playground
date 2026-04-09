import React, { useLayoutEffect, useRef } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  useConceptModal,
  ConceptPills,
  PluginLayout,
  StageHeader,
  StatBadge,
  SidePanel,
  SideCard,
  CanvasStage,
} from "../../components/plugin-kit";
import { concepts, type ConceptKey } from "./concepts";
import { useAngularAnimation, type Signal } from "./useAngularAnimation";
import { getAdapter, TOPICS } from "./adapters";
import type { AngularState, VariantKey } from "./angularSlice";
import type { TopicKey } from "./adapters";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 960;
const H = 620;

/* ── Q1 concept pills ───────────────────────────────── */
const Q1_PILLS: { key: ConceptKey; label: string }[] = [
  { key: "lifecycle", label: "Lifecycle" },
  { key: "constructor", label: "Constructor" },
  { key: "ngoninit", label: "ngOnInit" },
  { key: "dependency-injection", label: "DI" },
];

/* ── Q2 concept pills ───────────────────────────────── */
const Q2_PILLS: { key: ConceptKey; label: string }[] = [
  { key: "view-encapsulation", label: "View Encap" },
  { key: "emulated", label: "Emulated" },
  { key: "encap-none", label: "None" },
  { key: "shadow-dom", label: "Shadow DOM" },
];

/* ── Q3 concept pills ───────────────────────────────── */
const Q3_PILLS: { key: ConceptKey; label: string }[] = [
  { key: "standalone-overview", label: "Overview" },
  { key: "standalone", label: "Standalone" },
  { key: "ngmodule", label: "NgModule" },
  { key: "migration", label: "Migration" },
];

/* ── Q4 concept pills ───────────────────────────────── */
const Q4_PILLS: { key: ConceptKey; label: string }[] = [
  { key: "cd-overview", label: "Change Detection" },
  { key: "cd-default", label: "Default" },
  { key: "cd-onpush", label: "OnPush" },
  { key: "cd-signals", label: "Signals" },
];

/* ── Q5 concept pills ───────────────────────────────── */
const Q5_PILLS: { key: ConceptKey; label: string }[] = [
  { key: "di-hierarchy", label: "Injector Tree" },
  { key: "provided-in-root", label: "providedIn" },
  { key: "component-providers", label: "Component DI" },
  { key: "environment-injector", label: "Lazy Scope" },
];

/* ── Q9 concept pills ───────────────────────────────── */
const Q9_PILLS: { key: ConceptKey; label: string }[] = [
  { key: "sig-overview", label: "Reactivity" },
  { key: "sig-primitive", label: "Primitive" },
  { key: "sig-writable", label: "Signal" },
  { key: "sig-glitch-free", label: "Glitch-free" },
  { key: "sig-behaviorsubject", label: "BehaviorSubject" },
  { key: "sig-when-to-use", label: "When to Use" },
];

/* ── Q12 concept pills ──────────────────────────────── */
const Q12_PILLS: { key: ConceptKey; label: string }[] = [
  { key: "ho-overview", label: "HO Mapping" },
  { key: "ho-switchmap", label: "switchMap" },
  { key: "ho-mergemap", label: "mergeMap" },
  { key: "ho-concatmap", label: "concatMap" },
  { key: "ho-exhaustmap", label: "exhaustMap" },
  { key: "ho-when-to-use", label: "Which When?" },
];

/* ── Interview question per topic ────────────────────── */
const TOPIC_QUESTIONS: Record<TopicKey, string> = {
  "constructor-vs-ngoninit":
    "What is the difference between a component's constructor and the ngOnInit lifecycle hook?",
  "view-encapsulation":
    "Explain Angular view encapsulation options (Emulated, None, and ShadowDom).",
  "standalone-vs-ngmodule":
    "What are standalone components, and when should you prefer them over NgModules?",
  "change-detection":
    "How does Angular change detection work, and what is the OnPush strategy?",
  "hierarchical-di":
    "Explain hierarchical dependency injection and how providers are resolved.",
  "signals-vs-rxjs":
    "What are Angular Signals? How do they differ from BehaviorSubject?",
  "rxjs-ho-operators":
    "Explain the main RxJS higher-order mapping operators (switchMap, mergeMap, concatMap, exhaustMap) and when to use each.",
};

/* ── Code examples per variant ───────────────────────── */
const CODE_EXAMPLES: Record<VariantKey, { label: string; code: string }> = {
  constructor: {
    label: "constructor() — ⚠ Bad pattern",
    code: `@Component({ selector: 'app-user' })
export class UserComponent {
  @Input() userId!: string;

  constructor(private http: HttpClient) {
    // ⚠ BAD: @Input() is undefined here!
    this.http.get(\`/api/users/\${this.userId}\`)
      .subscribe(data => this.user = data);
  }
}`,
  },
  ngoninit: {
    label: "ngOnInit() — ✓ Correct pattern",
    code: `@Component({ selector: 'app-user' })
export class UserComponent implements OnInit {
  @Input() userId!: string;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // ✓ SAFE: @Input() is bound
    this.http.get(\`/api/users/\${this.userId}\`)
      .subscribe(data => this.user = data);
  }
}`,
  },
  emulated: {
    label: "🏠 Emulated (default)",
    code: `// component setup (default — can omit):
@Component({
  selector: 'app-card',
  encapsulation: ViewEncapsulation.Emulated,
  styles: [\`button { color: red; }\`]
})
export class CardComponent {}

// Angular compiles your CSS to:
button[_ngcontent-abc] { color: red; }

// DOM output:
<button _ngcontent-abc>Click</button>

// → Only THIS component's buttons turn red
// → Other components? Untouched ✓`,
  },
  none: {
    label: "🌍 None — global styles",
    code: `// component setup:
@Component({
  selector: 'app-card',
  encapsulation: ViewEncapsulation.None,
  styles: [\`button { color: red; }\`]
})
export class CardComponent {}

// Angular emits AS-IS (no scoping!):
button { color: red; }

// DOM output (no special attributes):
<button>Click</button>

// → ALL buttons everywhere turn red!
// → ⚠ Your styles leaked to the entire app`,
  },
  "shadow-dom": {
    label: "🔒 ShadowDom — sealed box",
    code: `// component setup:
@Component({
  selector: 'app-card',
  encapsulation: ViewEncapsulation.ShadowDom,
  styles: [\`button { color: red; }\`]
})
export class CardComponent {}

// Angular creates a native shadow root:
<app-card>
  #shadow-root (open)
    <style>button { color: red }</style>
    <button>Click</button>

// → Styles can't get out
// → Outside styles can't get in
// → Sealed box ✓ (modern browsers only)`,
  },
  standalone: {
    label: "📦 Standalone — self-contained",
    code: `// standalone component (Angular 14+):
@Component({
  standalone: true,
  selector: 'app-card',
  imports: [CommonModule, RouterLink],
  template: \`
    <div class="card">
      <a routerLink="/detail">View</a>
    </div>
  \`
})
export class CardComponent {}

// Lazy-load directly in routes:
{
  path: 'card',
  loadComponent: () =>
    import('./card.component')
      .then(m => m.CardComponent)
}

// → No NgModule needed ✓
// → Better tree-shaking ✓`,
  },
  ngmodule: {
    label: "📋 NgModule — traditional",
    code: `// 1. Create a module file:
@NgModule({
  declarations: [CardComponent, ListComponent],
  imports: [CommonModule, FormsModule],
  exports: [CardComponent]
})
export class FeatureModule {}

// 2. Component is declared in module:
@Component({
  selector: 'app-card',
  template: \`<div class="card">...</div>\`
})
export class CardComponent {}

// 3. Lazy-load via module wrapper:
{
  path: 'feature',
  loadChildren: () =>
    import('./feature.module')
      .then(m => m.FeatureModule)
}

// → Extra boilerplate ⚠
// → Coarser tree-shaking ⚠`,
  },
  "provided-in-root": {
    label: "🌳 providedIn: 'root' — singleton",
    code: `// service — registered at root automatically:
@Injectable({ providedIn: 'root' })
export class UserService {
  private users$ = new BehaviorSubject<User[]>([]);

  constructor(private http: HttpClient) {}

  loadUsers() {
    return this.http.get<User[]>('/api/users')
      .pipe(tap(u => this.users$.next(u)));
  }
}

// component — just inject, no providers needed:
@Component({ selector: 'app-dashboard' })
export class DashboardComponent {
  constructor(private userSvc: UserService) {}
}

// → Same instance everywhere ✓
// → Tree-shakable: removed if unused ✓`,
  },
  "component-provider": {
    label: "🔧 Component providers — per-instance",
    code: `// service — no providedIn (plain class):
@Injectable()
export class FormStateService {
  dirty = false;
  values: Record<string, unknown> = {};

  reset() {
    this.dirty = false;
    this.values = {};
  }
}

// component — provides its OWN instance:
@Component({
  selector: 'app-editor',
  providers: [FormStateService],
  template: \`<form>...</form>\`
})
export class EditorComponent implements OnDestroy {
  constructor(private formState: FormStateService) {}

  ngOnDestroy() {
    this.formState.reset(); // cleaned up!
  }
}

// → Each <app-editor> gets its own instance ✓
// → Destroyed with the component ✓
// → NOT tree-shakable (always bundled) ⚠`,
  },
  "default-cd": {
    label: "🔄 Default — check everything",
    code: `// Default strategy (no decorator needed):
@Component({
  selector: 'app-dashboard',
  template: \`
    <h1>{{ title }}</h1>
    <app-widget *ngFor="let w of widgets"
      [data]="w" />
  \`
})
export class DashboardComponent {
  title = 'Dashboard';
  widgets = [...];

  onClick() {
    // ANY async event triggers a full CD cycle:
    // → Zone.js intercepts the click
    // → ApplicationRef.tick() runs
    // → ALL components are checked
    this.title = 'Updated';
  }
}

// → Simple and reliable ✓
// → Checks every component on every event ⚠
// → Can be slow in deep trees ⚠`,
  },
  "onpush-cd": {
    label: "⚡ OnPush — check only on change",
    code: `@Component({
  selector: 'app-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <div>{{ data.name }}</div>
    <span>{{ count$ | async }}</span>
  \`
})
export class WidgetComponent {
  // ✓ Triggers check (new reference):
  @Input() data!: WidgetData;

  // ✓ Triggers check (async pipe):
  count$ = this.store.select(selectCount);

  constructor(
    private store: Store,
    private cdr: ChangeDetectorRef
  ) {}

  manualUpdate() {
    // ✓ Triggers check (explicit):
    this.cdr.markForCheck();
  }
}

// → Only checked when inputs change ✓
// → Skipped if nothing changed ✓
// → Requires immutable patterns ⚠`,
  },
  "writable-signal": {
    label: "🟣 signal() — synchronous reactivity",
    code: `// Create a writable signal:
const count = signal(0);

// Read (call as function):
const current = count();  // 0

// Update:
count.set(5);
count.update(n => n + 1); // 6

// Derived (auto-tracked, cached):
const double = computed(() => count() * 2);

// Side-effect (auto-tracked):
effect(() => {
  console.log('Count is:', count());
});

// Template (no async pipe!):
@Component({
  template: \`
    <p>{{ count() }}</p>
    <p>{{ double() }}</p>
  \`
})
export class CounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2);

  increment() {
    this.count.update(n => n + 1);
  }
}

// → No subscriptions ✓
// → No async pipe ✓
// → Glitch-free ✓`,
  },
  "behavior-subject": {
    label: "🟠 BehaviorSubject — RxJS observable",
    code: `// Create a BehaviorSubject:
private count$ = new BehaviorSubject<number>(0);

// Read current value:
const current = this.count$.value;  // 0

// Emit a new value:
this.count$.next(5);

// Transform with operators:
const double$ = this.count$.pipe(
  map(n => n * 2)
);

// Subscribe (must clean up!):
const sub = this.count$.subscribe(v => {
  console.log('Count is:', v);
});
sub.unsubscribe(); // ⚠ Don't forget!

// Template (async pipe required):
@Component({
  template: \`
    <p>{{ count$ | async }}</p>
    <p>{{ double$ | async }}</p>
  \`
})
export class CounterComponent
  implements OnDestroy {
  count$ = new BehaviorSubject(0);
  double$ = this.count$.pipe(
    map(n => n * 2)
  );

  increment() {
    this.count$.next(
      this.count$.value + 1
    );
  }

  ngOnDestroy() {
    this.count$.complete(); // cleanup
  }
}

// → Manual subscriptions ⚠
// → Async pipe required ⚠
// → Powerful operators ✓`,
  },
  "ho-switchmap": {
    label: "🔄 switchMap — cancel previous",
    code: `// Search autocomplete — only latest result:
this.searchInput.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term =>
    this.http.get(\`/api/search?q=\${term}\`)
  )
).subscribe(results => {
  this.results = results;
});

// Route params — reload on navigation:
this.route.params.pipe(
  switchMap(params =>
    this.http.get(\`/api/users/\${params['id']}\`)
  )
).subscribe(user => this.user = user);

// → Cancels in-flight request ✓
// → No stale results ✓
// → 1 inner at a time ✓`,
  },
  "ho-mergemap": {
    label: "🔀 mergeMap — parallel execution",
    code: `// Upload multiple files in parallel:
from(this.selectedFiles).pipe(
  mergeMap(file =>
    this.uploadService.upload(file)
  )
).subscribe(response => {
  this.uploaded.push(response);
});

// With concurrency limit:
from(urls).pipe(
  mergeMap(
    url => this.http.get(url),
    3  // max 3 concurrent requests
  )
).subscribe(data => {
  this.results.push(data);
});

// → All run simultaneously ✓
// → Results arrive in any order ⚠
// → No cancellation ⚠`,
  },
  "ho-concatmap": {
    label: "📥 concatMap — sequential queue",
    code: `// Ordered API calls:
this.actions$.pipe(
  concatMap(action =>
    this.http.post('/api/process', action)
  )
).subscribe(result => {
  this.processedResults.push(result);
});

// Sequential writes:
from(updates).pipe(
  concatMap(update =>
    this.http.put(
      \`/api/items/\${update.id}\`,
      update
    )
  )
).subscribe(saved => {
  console.log('Saved:', saved.id);
});

// → Strict order guaranteed ✓
// → Waits for each to complete ✓
// → Slower than mergeMap ⚠`,
  },
  "ho-exhaustmap": {
    label: "🛡 exhaustMap — ignore while busy",
    code: `// Prevent double form submission:
this.submitBtn.click$.pipe(
  exhaustMap(() =>
    this.http.post('/api/submit', this.form)
  )
).subscribe(response => {
  this.router.navigate(['/success']);
});

// Ignore rapid refresh clicks:
this.refreshBtn.click$.pipe(
  exhaustMap(() =>
    this.http.get('/api/data')
  )
).subscribe(data => {
  this.data = data;
});

// → No double-submit ✓
// → No extra flags needed ✓
// → Dropped emissions are silent ⚠`,
  },
};

const AngularVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useAngularAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as AngularState;
  const { explanation, hotZones, phase, variant, topic } = st;
  const adapter = getAdapter(variant);
  const hot = (zone: string) => hotZones.includes(zone);
  const topicDef = TOPICS.find((t) => t.id === topic)!;
  const pills =
    topic === "constructor-vs-ngoninit"
      ? Q1_PILLS
      : topic === "view-encapsulation"
        ? Q2_PILLS
        : topic === "change-detection"
          ? Q4_PILLS
          : topic === "hierarchical-di"
            ? Q5_PILLS
            : topic === "signals-vs-rxjs"
              ? Q9_PILLS
              : topic === "rxjs-ho-operators"
                ? Q12_PILLS
                : Q3_PILLS;

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);
    adapter.buildTopology(b, st, { hot, phase });

    /* Inject signal overlays into the scene */
    if (signals.length > 0) {
      b.overlay((o: any) => {
        signals.forEach((sig) => {
          o.add(
            "signal",
            {
              from: sig.from,
              to: sig.to,
              progress: sig.progress,
              magnitude: sig.magnitude,
              ...(sig.color ? { color: sig.color } : {}),
              ...(sig.glowColor ? { glowColor: sig.glowColor } : {}),
            },
            {
              key: sig.id,
              ...(sig.colorClass ? { className: sig.colorClass } : {}),
            },
          );
        });
      });
    }

    return b;
  })();

  /* ── Stat badges ──────────────────────────────────────── */
  const badges = adapter.getStatBadges(st);

  /* ── Mount VizCraft canvas ────────────────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
    const unsub = pzRef.current?.onChange(
      (s: { zoom: number; pan: { x: number; y: number } }) => {
        viewportRef.current = s;
      },
    );
    return () => {
      unsub?.();
    };
  }, [scene]);

  /* ── Dynamic title ──────────────────────────────────── */
  const title = topicDef.label;

  return (
    <div className={`angular-root angular-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="angular-stage">
            <StageHeader title={title} subtitle={adapter.profile.label}>
              {badges.map((b) => (
                <StatBadge
                  key={b.label}
                  label={b.label}
                  value={b.value}
                  color={b.color}
                />
              ))}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="Interview Question" variant="explanation">
              <p>
                <em>{TOPIC_QUESTIONS[topic]}</em>
              </p>
            </SideCard>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
            <SideCard label={CODE_EXAMPLES[variant].label} variant="code">
              <pre className="angular-code">{CODE_EXAMPLES[variant].code}</pre>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default AngularVisualization;
