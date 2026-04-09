import type { SolidAdapter } from "./types";
import type { SolidState } from "../solidSlice";

/* ═══════════════════════════════════════════════════════════
   LSP — Liskov Substitution Principle
   "Subtypes must be substitutable for their base types."

   Before: Square overrides Rectangle.setWidth in a way that breaks expectations
   After:  Shape abstraction with proper contracts
   ═══════════════════════════════════════════════════════════ */

export const lspAdapter: SolidAdapter = {
  id: "lsp",

  profile: {
    label: "Liskov Substitution",
    acronym: "LSP",
    description:
      "Subtypes must be substitutable for their base types without breaking program correctness.",
  },

  colors: { fill: "#4c1d95", stroke: "#a78bfa" },

  computeMetrics(state: SolidState) {
    state.coupling = 6;
    state.flexibility = 4;
    state.classCount = 2;
  },

  expandToken(token: string): string[] | null {
    if (token === "$shapes") return ["rectangle", "circle"];
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "caller",
        to: "base",
        duration: 600,
        explain: "Caller uses the base type reference.",
      },
    ];
  },

  buildTopology(b, _state: SolidState, { hot, phase }) {
    const isAfter = phase === "refactored" || phase === "summary";

    // ── Caller ──
    b.node("caller")
      .at(80, 280)
      .rect(110, 50, 10)
      .fill(hot("caller") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("caller") ? "#60a5fa" : "#334155", 2)
      .label("Client Code", {
        fill: "#cbd5e1",
        fontSize: 12,
        fontWeight: "bold",
      });

    if (!isAfter) {
      // ── BEFORE: Rectangle ← Square violation ──
      b.node("base")
        .at(350, 170)
        .rect(150, 50, 10)
        .fill(hot("base") ? "#4c1d95" : "#0f172a")
        .stroke(hot("base") ? "#a78bfa" : "#334155", 2)
        .label("Rectangle", {
          fill: "#c4b5fd",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("square")
        .at(350, 380)
        .rect(150, 50, 10)
        .fill(hot("square") ? "#7f1d1d" : "#1c1917")
        .stroke(hot("square") ? "#f87171" : "#57534e", 2)
        .label("Square ✗", {
          fill: "#fca5a5",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("bug-lbl")
        .at(520, 400)
        .rect(0, 0, 0)
        .fill("transparent")
        .stroke("transparent", 0)
        .label("setWidth changes height!", { fill: "#f87171", fontSize: 10 });

      b.edge("caller", "base", "e-call")
        .stroke("#475569", 2)
        .animate("flow", { duration: "3s" });
      b.edge("base", "square", "e-inherit").stroke("#f87171", 1.5);
    } else {
      // ── AFTER: Shape interface ──
      b.node("iface")
        .at(330, 170)
        .rect(160, 50, 10)
        .fill(hot("iface") ? "#4c1d95" : "#0f172a")
        .stroke(hot("iface") ? "#a78bfa" : "#334155", 2)
        .label("«Shape»", {
          fill: "#c4b5fd",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("rectangle")
        .at(250, 380)
        .rect(130, 44, 10)
        .fill(hot("rectangle") ? "#064e3b" : "#0f172a")
        .stroke(hot("rectangle") ? "#34d399" : "#334155", 2)
        .label("Rectangle", {
          fill: "#6ee7b7",
          fontSize: 11,
          fontWeight: "bold",
        });

      b.node("circle")
        .at(430, 380)
        .rect(130, 44, 10)
        .fill(hot("circle") ? "#064e3b" : "#0f172a")
        .stroke(hot("circle") ? "#34d399" : "#334155", 2)
        .label("Circle", { fill: "#6ee7b7", fontSize: 11, fontWeight: "bold" });

      b.edge("caller", "iface", "e-call")
        .stroke("#a78bfa", 1.5)
        .animate("flow", { duration: "3s" });
      b.edge("iface", "rectangle", "e-rect").stroke("#22c55e", 1.5);
      b.edge("iface", "circle", "e-circ").stroke("#22c55e", 1.5);
    }
  },

  getStatBadges(state: SolidState) {
    return [
      { label: "Principle", value: "LSP", color: "#a78bfa" },
      { label: "Coupling", value: `${state.coupling}/10`, color: "#f87171" },
      {
        label: "Flexibility",
        value: `${state.flexibility}/10`,
        color: "#22c55e",
      },
    ];
  },

  softReset(state: SolidState) {
    state.coupling = 6;
    state.flexibility = 4;
    state.classCount = 2;
  },
};
