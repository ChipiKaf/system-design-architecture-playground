import type { SolidAdapter } from "./types";
import type { SolidState } from "../solidSlice";

/* ═══════════════════════════════════════════════════════════
   OCP — Open/Closed Principle
   "Open for extension, closed for modification."

   Before: switch/case in PaymentProcessor for each new method
   After:  PaymentStrategy interface — add new methods without touching core
   ═══════════════════════════════════════════════════════════ */

export const ocpAdapter: SolidAdapter = {
  id: "ocp",

  profile: {
    label: "Open / Closed",
    acronym: "OCP",
    description:
      "Software entities should be open for extension but closed for modification. Use abstractions to add behavior without changing existing code.",
  },

  colors: { fill: "#064e3b", stroke: "#22c55e" },

  computeMetrics(state: SolidState) {
    state.coupling = 7;
    state.flexibility = 3;
    state.classCount = 1;
  },

  expandToken(token: string): string[] | null {
    if (token === "$strategies") return ["credit-card", "paypal", "crypto"];
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "client",
        to: "processor",
        duration: 600,
        explain: "Client sends a payment request.",
      },
    ];
  },

  buildTopology(b, _state: SolidState, { hot, phase }) {
    const isAfter = phase === "refactored" || phase === "summary";

    // ── Client ──
    b.node("client")
      .at(80, 280)
      .rect(110, 50, 10)
      .fill(hot("client") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("client") ? "#60a5fa" : "#334155", 2)
      .label("Client", { fill: "#cbd5e1", fontSize: 12, fontWeight: "bold" });

    if (!isAfter) {
      // ── BEFORE: big switch ──
      b.node("processor")
        .at(380, 280)
        .rect(200, 80, 12)
        .fill(hot("processor") ? "#7f1d1d" : "#1c1917")
        .stroke(hot("processor") ? "#f87171" : "#57534e", 2)
        .label("PaymentProcessor", {
          fill: "#fca5a5",
          fontSize: 13,
          fontWeight: "bold",
        });

      b.node("switch-lbl")
        .at(330, 370)
        .rect(0, 0, 0)
        .fill("transparent")
        .stroke("transparent", 0)
        .label("switch(type) { case… }", { fill: "#94a3b8", fontSize: 10 });

      b.edge("client", "processor", "e-pay")
        .stroke("#475569", 2)
        .animate("flow", { duration: "3s" });
    } else {
      // ── AFTER: strategy pattern ──
      b.node("iface")
        .at(330, 280)
        .rect(160, 50, 10)
        .fill(hot("iface") ? "#064e3b" : "#0f172a")
        .stroke(hot("iface") ? "#34d399" : "#334155", 2)
        .label("«PayStrategy»", {
          fill: "#6ee7b7",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("credit-card")
        .at(560, 140)
        .rect(130, 44, 10)
        .fill(hot("credit-card") ? "#1e3a5f" : "#0f172a")
        .stroke(hot("credit-card") ? "#60a5fa" : "#334155", 2)
        .label("CreditCard", {
          fill: "#93c5fd",
          fontSize: 11,
          fontWeight: "bold",
        });

      b.node("paypal")
        .at(560, 280)
        .rect(130, 44, 10)
        .fill(hot("paypal") ? "#4c1d95" : "#0f172a")
        .stroke(hot("paypal") ? "#a78bfa" : "#334155", 2)
        .label("PayPal", { fill: "#c4b5fd", fontSize: 11, fontWeight: "bold" });

      b.node("crypto")
        .at(560, 420)
        .rect(130, 44, 10)
        .fill(hot("crypto") ? "#713f12" : "#0f172a")
        .stroke(hot("crypto") ? "#fbbf24" : "#334155", 2)
        .label("Crypto", { fill: "#fde68a", fontSize: 11, fontWeight: "bold" });

      b.edge("client", "iface", "e-req")
        .stroke("#22c55e", 1.5)
        .animate("flow", { duration: "3s" });
      b.edge("iface", "credit-card", "e-cc").stroke("#3b82f6", 1.5);
      b.edge("iface", "paypal", "e-pp").stroke("#8b5cf6", 1.5);
      b.edge("iface", "crypto", "e-cr").stroke("#eab308", 1.5);
    }
  },

  getStatBadges(state: SolidState) {
    return [
      { label: "Principle", value: "OCP", color: "#22c55e" },
      { label: "Coupling", value: `${state.coupling}/10`, color: "#f87171" },
      {
        label: "Flexibility",
        value: `${state.flexibility}/10`,
        color: "#22c55e",
      },
    ];
  },

  softReset(state: SolidState) {
    state.coupling = 7;
    state.flexibility = 3;
    state.classCount = 1;
  },
};
