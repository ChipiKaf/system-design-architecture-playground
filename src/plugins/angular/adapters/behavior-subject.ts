import type { AngularAdapter } from "./types";
import type { AngularState } from "../angularSlice";

/* ── Positions: BehaviorSubject reactive flow ────────── */
const POS = {
  create: { x: 480, y: 55 },
  subject: { x: 480, y: 185 },
  pipe: { x: 200, y: 315 },
  subscribe: { x: 760, y: 315 },
  template: { x: 480, y: 435 },
  result: { x: 480, y: 560 },
};

export const behaviorSubjectAdapter: AngularAdapter = {
  id: "behavior-subject",

  profile: {
    label: "BehaviorSubject",
    description:
      "BehaviorSubject<T> — an RxJS subject that holds a current value. Read via .value or subscribe(). Emit via .next(). Requires manual subscription management or the async pipe.",
  },

  colors: { fill: "#7f1d1d", stroke: "#f87171" },

  computeMetrics(state: AngularState) {
    const p = state.phase;
    const active =
      p === "sig-create" ||
      p === "sig-read" ||
      p === "sig-update" ||
      p === "sig-summary";
    state.reactiveModel = active ? "rxjs" : "none";
    state.subscriptionMgmt = active ? "manual" : "none";
    state.glitchFree = false;
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
        color: "#f87171",
        explain:
          "⚠ Must use async pipe or manual subscribe — and remember to unsubscribe to avoid memory leaks.",
      },
    ];
  },

  buildTopology(builder: any, state: AngularState, helpers) {
    const hot = helpers.hot;
    const active = state.reactiveModel === "rxjs";

    /* ─ create: new BehaviorSubject() ─ */
    builder
      .node("create")
      .at(POS.create.x, POS.create.y)
      .rect(280, 55, 12)
      .fill(hot("create") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("create") ? "#f87171" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("new BehaviorSubject(init)");
          l.newline();
          l.color("Create RxJS subject", "#fca5a5", { fontSize: 9 });
        },
        { fill: "#fecaca", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* ─ subject: The observable value ─ */
    builder
      .node("subject")
      .at(POS.subject.x, POS.subject.y)
      .rect(260, 58, 12)
      .fill(hot("subject") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("subject") ? "#f87171" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("BehaviorSubject<T>");
          l.newline();
          l.code(".value / .next() / .subscribe()");
        },
        { fill: "#fca5a5", fontSize: 10, dy: -4, lineHeight: 1.6 },
      );

    /* ─ pipe: RxJS operators ─ */
    builder
      .node("pipe")
      .at(POS.pipe.x, POS.pipe.y)
      .rect(220, 55, 12)
      .fill(hot("pipe") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("pipe") ? "#3b82f6" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold(".pipe(operators)");
          l.newline();
          l.color(
            active ? "✓ map, filter, switchMap..." : "RxJS operator chain",
            active ? "#93c5fd" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -2, lineHeight: 1.6 },
      );

    /* ─ subscribe: Manual subscription ─ */
    builder
      .node("subscribe")
      .at(POS.subscribe.x, POS.subscribe.y)
      .rect(220, 55, 12)
      .fill(hot("subscribe") ? "#78350f" : "#0f172a")
      .stroke(hot("subscribe") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold(".subscribe()");
          l.newline();
          l.color(
            active ? "⚠ Must unsubscribe!" : "Manual subscription",
            active ? "#fbbf24" : "#94a3b8",
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
          l.bold("{{ data$ | async }}");
          l.newline();
          l.color(
            active
              ? "⚠ Async pipe required"
              : "Must use async pipe in template",
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
      .rect(320, 40, 10)
      .fill("#0f172a")
      .stroke(hot("result") ? "#f87171" : "#1e293b", 1.5)
      .richLabel(
        (l: any) => {
          l.color(
            active
              ? "⚠ Async, manual cleanup, but powerful operator ecosystem"
              : "BehaviorSubject: powerful but requires subscription management",
            active ? "#fca5a5" : "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fca5a5", fontSize: 9, dy: 0 },
      );

    /* ── Edges ── */
    builder
      .edge("create", "subject", "e-create-sub")
      .stroke(hot("subject") ? "#f87171" : "#475569", 2)
      .arrow(true)
      .label("1. Create", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("subject", "pipe", "e-sub-pipe")
      .stroke(hot("pipe") ? "#3b82f6" : "#475569", 2)
      .arrow(true)
      .label("2. Transform", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("subject", "subscribe", "e-sub-subscribe")
      .stroke(hot("subscribe") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("2. Subscribe", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("pipe", "template", "e-pipe-tpl")
      .stroke(hot("template") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .label("3. | async", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("subscribe", "template", "e-sub-tpl")
      .stroke(hot("template") ? "#f59e0b" : "#475569", 2)
      .arrow(true)
      .dashed(true)
      .label("3. Manual bind", { fill: "#94a3b8", fontSize: 9 });

    builder
      .edge("template", "result", "e-tpl-res")
      .stroke("#1e293b", 1)
      .arrow(true);
  },

  getStatBadges(state: AngularState) {
    return [
      { label: "Model", value: "RxJS", color: "#f87171" },
      {
        label: "Subscriptions",
        value: state.subscriptionMgmt === "manual" ? "Manual ⚠" : "—",
        color: state.subscriptionMgmt === "manual" ? "#f59e0b" : "#64748b",
      },
      {
        label: "Glitch-free",
        value: "No",
        color: "#f87171",
      },
      { label: "Zone.js", value: "Required", color: "#f59e0b" },
    ];
  },

  softReset(state: AngularState) {
    state.reactiveModel = "none";
    state.subscriptionMgmt = "none";
    state.glitchFree = false;
  },
};
