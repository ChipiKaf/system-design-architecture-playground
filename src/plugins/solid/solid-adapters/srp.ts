import type { SolidAdapter } from "./types";
import type { SolidState } from "../solidSlice";

/* ═══════════════════════════════════════════════════════════
   SRP — Single Responsibility Principle
   "A class should have only one reason to change."

   Before: monolith UserManager (handles auth + email + persistence)
   After:  three focused classes each with one job
   ═══════════════════════════════════════════════════════════ */

export const srpAdapter: SolidAdapter = {
  id: "srp",

  profile: {
    label: "Single Responsibility",
    acronym: "SRP",
    description:
      "A class should have only one reason to change. Split bloated classes into focused units.",
  },

  colors: { fill: "#1e3a5f", stroke: "#3b82f6" },

  /* ── Metrics ───────────────────────────────────────── */

  computeMetrics(state: SolidState) {
    state.coupling = 8;
    state.flexibility = 3;
    state.classCount = 1;
  },

  /* ── Token expansion ───────────────────────────────── */

  expandToken(token: string): string[] | null {
    if (token === "$focused") return ["auth-svc", "email-svc", "user-repo"];
    return null;
  },

  /* ── Flow engine ───────────────────────────────────── */

  getFlowBeats() {
    return [
      {
        from: "caller",
        to: "user-mgr",
        duration: 600,
        explain: "All requests funnel into one bloated class.",
      },
    ];
  },

  /* ── Scene ─────────────────────────────────────────── */

  buildTopology(b, _state: SolidState, { hot, phase }) {
    const isAfter = phase === "refactored" || phase === "summary";

    // ── Caller ──
    b.node("caller")
      .at(100, 280)
      .rect(120, 50, 10)
      .fill(hot("caller") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("caller") ? "#60a5fa" : "#334155", 2)
      .label("Client Code", {
        fill: "#cbd5e1",
        fontSize: 12,
        fontWeight: "bold",
      });

    if (!isAfter) {
      // ── BEFORE: monolith ──
      b.node("user-mgr")
        .at(420, 280)
        .rect(200, 70, 12)
        .fill(hot("user-mgr") ? "#7f1d1d" : "#1c1917")
        .stroke(hot("user-mgr") ? "#f87171" : "#57534e", 2)
        .label("UserManager", {
          fill: "#fca5a5",
          fontSize: 13,
          fontWeight: "bold",
        });

      b.node("auth-lbl")
        .at(370, 360)
        .rect(0, 0, 0)
        .fill("transparent")
        .stroke("transparent", 0)
        .label("auth + email + persist", { fill: "#94a3b8", fontSize: 10 });

      b.edge("caller", "user-mgr", "e-call")
        .stroke("#475569", 2)
        .animate("flow", { duration: "3s" });
    } else {
      // ── AFTER: split classes ──
      b.node("auth-svc")
        .at(380, 140)
        .rect(140, 50, 10)
        .fill(hot("auth-svc") ? "#1e3a5f" : "#0f172a")
        .stroke(hot("auth-svc") ? "#60a5fa" : "#334155", 2)
        .label("AuthService", {
          fill: "#93c5fd",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("email-svc")
        .at(380, 280)
        .rect(140, 50, 10)
        .fill(hot("email-svc") ? "#064e3b" : "#0f172a")
        .stroke(hot("email-svc") ? "#34d399" : "#334155", 2)
        .label("EmailService", {
          fill: "#6ee7b7",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("user-repo")
        .at(380, 420)
        .rect(140, 50, 10)
        .fill(hot("user-repo") ? "#4c1d95" : "#0f172a")
        .stroke(hot("user-repo") ? "#a78bfa" : "#334155", 2)
        .label("UserRepo", {
          fill: "#c4b5fd",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.edge("caller", "auth-svc", "e-auth")
        .stroke("#3b82f6", 1.5)
        .animate("flow", { duration: "3s" });
      b.edge("caller", "email-svc", "e-email")
        .stroke("#22c55e", 1.5)
        .animate("flow", { duration: "3s" });
      b.edge("caller", "user-repo", "e-repo")
        .stroke("#8b5cf6", 1.5)
        .animate("flow", { duration: "3s" });
    }
  },

  getStatBadges(state: SolidState) {
    return [
      { label: "Principle", value: "SRP", color: "#3b82f6" },
      { label: "Coupling", value: `${state.coupling}/10`, color: "#f87171" },
      {
        label: "Flexibility",
        value: `${state.flexibility}/10`,
        color: "#22c55e",
      },
    ];
  },

  softReset(state: SolidState) {
    state.coupling = 8;
    state.flexibility = 3;
    state.classCount = 1;
  },
};
