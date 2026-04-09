import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: Writable Signal reactive flow ────────── */
const POS = {
  create: { x: 480, y: 55 },
  signal: { x: 480, y: 185 },
  computed: { x: 200, y: 315 },
  effect: { x: 760, y: 315 },
  template: { x: 480, y: 435 },
  result: { x: 480, y: 560 },
};

export const writableSignalAdapter: AngularAdapter = {
  id: "writable-signal",

  profile: {
    label: "Writable Signal",
    description:
      "signal(value) — a synchronous, glitch-free reactive primitive. Read by calling count(), update with set()/update(). Automatically triggers change detection without Zone.js or async pipe.",
  },

  colors: { fill: "#312e81", stroke: "#a78bfa" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "sig-create" ||
      p === "sig-derive" ||
      p === "sig-consume" ||
      p === "sig-update" ||
      p === "sig-summary";
    state.reactiveModel = active ? "signal" : "none";
    state.subscriptionMgmt = active ? "auto" : "none";
    state.glitchFree = active;
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "template",
        to: "result",
        duration: 600,
        color: "#a78bfa",
        explain:
          "✓ Template updated automatically — no async pipe, no subscribe, no cleanup needed.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const active = state.reactiveModel === "signal";

    /* ─ create: signal() call ─ */
    builder
      .node("create")
      .at(POS.create.x, POS.create.y)
      .rect(240, 55, 12)
      .fill(hot("create") ? "#312e81" : "#0f172a")
      .stroke(hot("create") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("signal(initialValue)");
          l.newline();
          l.color("Create writable signal", "#c4b5fd", { fontSize: 9 });
        },
        { fill: "#e0d4ff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ─ signal: The reactive value ─ */
    builder
      .node("signal")
      .at(POS.signal.x, POS.signal.y)
      .rect(260, 58, 12)
      .fill(hot("signal") ? "#312e81" : "#0f172a")
      .stroke(hot("signal") ? "#a78bfa" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("WritableSignal<T>");
          l.newline();
          l.code("count() / set() / update()");
        },
        { fill: "#c4b5fd", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    /* ─ computed: Derived value ─ */
    builder
      .node("computed")
      .at(POS.computed.x, POS.computed.y)
      .rect(220, 55, 12)
      .fill(hot("computed") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("computed") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("computed()");
          l.newline();
          l.color(
            active ? "✓ Auto-derived, cached" : "Derived reactive value",
            active ? "#93c5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ effect: Side-effect ─ */
    builder
      .node("effect")
      .at(POS.effect.x, POS.effect.y)
      .rect(220, 55, 12)
      .fill(hot("effect") ? "#064e3b" : "#0f172a")
      .stroke(hot("effect") ? "#22c55e" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("effect()");
          l.newline();
          l.color(
            active ? "✓ Auto-tracked side effect" : "Reactive side effect",
            active ? "#86efac" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ template: Angular template ─ */
    builder
      .node("template")
      .at(POS.template.x, POS.template.y)
      .rect(240, 55, 12)
      .fill(hot("template") ? "#78350f" : "#0f172a")
      .stroke(hot("template") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("{{ count() }}");
          l.newline();
          l.color(
            active ? "✓ No async pipe needed" : "Call signal in template",
            active ? "#fbbf24" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fde68a", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ result ─ */
    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(300, 40, 10)
      .fill("#0f172a")
      .stroke(hot("result") ? "#a78bfa" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color(
            active
              ? "✓ Synchronous, glitch-free, auto-tracked — no subscriptions"
              : "Signals: synchronous reactivity without RxJS overhead",
            active ? "#c4b5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#c4b5fd", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("create", "signal", "e-create-sig")
      .stroke(hot("signal") ? "#a78bfa" : "#475569", 2)
      .arrow(true)
      .label("1. Create", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("signal", "computed", "e-sig-computed")
      .stroke(hot("computed") ? "#3b82f6" : "#475569", 2)
      .arrow(true)
      .label("2. Derive", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("signal", "effect", "e-sig-effect")
      .stroke(hot("effect") ? "#22c55e" : "#475569", 2)
      .arrow(true)
      .label("2. Track", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("computed", "template", "e-computed-tpl")
      .stroke(hot("template") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("3. Bind {{ }}", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("effect", "template", "e-effect-tpl")
      .stroke(hot("template") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("3. React", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("template", "result", "e-tpl-res")
      .stroke("#1e293b", 1)
      .arrow(true);
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Model", value: "Signal", color: "#a78bfa" },
      {
        label: "Subscriptions",
        value: state.subscriptionMgmt === "auto" ? "Auto" : "—",
        color: state.subscriptionMgmt === "auto" ? "#22c55e" : "#64748b",
      },
      {
        label: "Glitch-free",
        value: state.glitchFree ? "✓" : "—",
        color: state.glitchFree ? "#22c55e" : "#64748b",
      },
      { label: "Zone.js", value: "Not needed", color: "#22c55e" },
    ];
  },

  softReset(state: AngularState) {
    state.reactiveModel = "none";
    state.subscriptionMgmt = "none";
    state.glitchFree = false;
  },
};
