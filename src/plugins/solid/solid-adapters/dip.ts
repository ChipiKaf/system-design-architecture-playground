import type { SolidAdapter } from "./types";
import type { SolidState } from "../solidSlice";

/* ═══════════════════════════════════════════════════════════
   DIP — Dependency Inversion Principle
   "Depend on abstractions, not concretions."

   Before: OrderService directly imports MySQLDatabase
   After:  OrderService depends on IRepository abstraction
   ═══════════════════════════════════════════════════════════ */

export const dipAdapter: SolidAdapter = {
  id: "dip",

  profile: {
    label: "Dependency Inversion",
    acronym: "DIP",
    description:
      "High-level modules should not depend on low-level modules. Both should depend on abstractions.",
  },

  colors: { fill: "#881337", stroke: "#f43f5e" },

  computeMetrics(state: SolidState) {
    state.coupling = 9;
    state.flexibility = 2;
    state.classCount = 2;
  },

  expandToken(token: string): string[] | null {
    if (token === "$impls") return ["mysql-repo", "mongo-repo"];
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "order-svc",
        to: "mysql-db",
        duration: 600,
        explain: "High-level module directly calls low-level database.",
      },
    ];
  },

  buildTopology(b, _state: SolidState, { hot, phase }) {
    const isAfter = phase === "refactored" || phase === "summary";

    if (!isAfter) {
      // ── BEFORE: direct dependency on concrete DB ──
      b.node("order-svc")
        .at(150, 190)
        .rect(160, 54, 10)
        .fill(hot("order-svc") ? "#1e3a5f" : "#0f172a")
        .stroke(hot("order-svc") ? "#60a5fa" : "#334155", 2)
        .label("OrderService", {
          fill: "#93c5fd",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("high-lbl")
        .at(110, 140)
        .rect(0, 0, 0)
        .fill("transparent")
        .stroke("transparent", 0)
        .label("HIGH-LEVEL", { fill: "#64748b", fontSize: 9 });

      b.node("mysql-db")
        .at(150, 390)
        .rect(160, 54, 10)
        .fill(hot("mysql-db") ? "#7f1d1d" : "#1c1917")
        .stroke(hot("mysql-db") ? "#f87171" : "#57534e", 2)
        .label("MySQLDatabase", {
          fill: "#fca5a5",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("low-lbl")
        .at(110, 340)
        .rect(0, 0, 0)
        .fill("transparent")
        .stroke("transparent", 0)
        .label("LOW-LEVEL", { fill: "#64748b", fontSize: 9 });

      b.node("arrow-lbl")
        .at(340, 290)
        .rect(0, 0, 0)
        .fill("transparent")
        .stroke("transparent", 0)
        .label("direct import ✗", { fill: "#f87171", fontSize: 10 });

      b.edge("order-svc", "mysql-db", "e-direct")
        .stroke("#f87171", 2)
        .animate("flow", { duration: "3s" });
    } else {
      // ── AFTER: depend on abstraction ──
      b.node("order-svc")
        .at(130, 140)
        .rect(160, 50, 10)
        .fill(hot("order-svc") ? "#1e3a5f" : "#0f172a")
        .stroke(hot("order-svc") ? "#60a5fa" : "#334155", 2)
        .label("OrderService", {
          fill: "#93c5fd",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("i-repo")
        .at(350, 280)
        .rect(150, 50, 10)
        .fill(hot("i-repo") ? "#881337" : "#0f172a")
        .stroke(hot("i-repo") ? "#f43f5e" : "#334155", 2)
        .label("«IRepository»", {
          fill: "#fda4af",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("mysql-repo")
        .at(230, 430)
        .rect(130, 44, 10)
        .fill(hot("mysql-repo") ? "#064e3b" : "#0f172a")
        .stroke(hot("mysql-repo") ? "#34d399" : "#334155", 2)
        .label("MySQLRepo", {
          fill: "#6ee7b7",
          fontSize: 11,
          fontWeight: "bold",
        });

      b.node("mongo-repo")
        .at(470, 430)
        .rect(130, 44, 10)
        .fill(hot("mongo-repo") ? "#064e3b" : "#0f172a")
        .stroke(hot("mongo-repo") ? "#34d399" : "#334155", 2)
        .label("MongoRepo", {
          fill: "#6ee7b7",
          fontSize: 11,
          fontWeight: "bold",
        });

      b.edge("order-svc", "i-repo", "e-abs")
        .stroke("#f43f5e", 1.5)
        .animate("flow", { duration: "3s" });
      b.edge("i-repo", "mysql-repo", "e-mysql").stroke("#22c55e", 1.5);
      b.edge("i-repo", "mongo-repo", "e-mongo").stroke("#22c55e", 1.5);
    }
  },

  getStatBadges(state: SolidState) {
    return [
      { label: "Principle", value: "DIP", color: "#f43f5e" },
      { label: "Coupling", value: `${state.coupling}/10`, color: "#f87171" },
      {
        label: "Flexibility",
        value: `${state.flexibility}/10`,
        color: "#22c55e",
      },
    ];
  },

  softReset(state: SolidState) {
    state.coupling = 9;
    state.flexibility = 2;
    state.classCount = 2;
  },
};
