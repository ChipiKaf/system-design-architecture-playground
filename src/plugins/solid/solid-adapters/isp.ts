import type { SolidAdapter } from "./types";
import type { SolidState } from "../solidSlice";

/* ═══════════════════════════════════════════════════════════
   ISP — Interface Segregation Principle
   "No client should be forced to depend on methods it does not use."

   Before: fat IWorker interface with eat() + work() + sleep()
   After:  segregated IWorkable, IFeedable interfaces
   ═══════════════════════════════════════════════════════════ */

export const ispAdapter: SolidAdapter = {
  id: "isp",

  profile: {
    label: "Interface Segregation",
    acronym: "ISP",
    description:
      "Clients should not be forced to depend on interfaces they don't use. Split fat interfaces into focused ones.",
  },

  colors: { fill: "#713f12", stroke: "#eab308" },

  computeMetrics(state: SolidState) {
    state.coupling = 7;
    state.flexibility = 3;
    state.classCount = 1;
  },

  expandToken(token: string): string[] | null {
    if (token === "$ifaces") return ["i-workable", "i-feedable"];
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "robot",
        to: "fat-iface",
        duration: 600,
        explain: "Robot forced to implement eat() it can't use.",
      },
    ];
  },

  buildTopology(b, _state: SolidState, { hot, phase }) {
    const isAfter = phase === "refactored" || phase === "summary";

    if (!isAfter) {
      // ── BEFORE: fat interface ──
      b.node("fat-iface")
        .at(340, 140)
        .rect(180, 56, 10)
        .fill(hot("fat-iface") ? "#7f1d1d" : "#1c1917")
        .stroke(hot("fat-iface") ? "#f87171" : "#57534e", 2)
        .label("IWorker", {
          fill: "#fca5a5",
          fontSize: 13,
          fontWeight: "bold",
        });

      b.node("fat-methods")
        .at(270, 200)
        .rect(0, 0, 0)
        .fill("transparent")
        .stroke("transparent", 0)
        .label("work() + eat() + sleep()", { fill: "#94a3b8", fontSize: 10 });

      b.node("human")
        .at(200, 350)
        .rect(120, 44, 10)
        .fill(hot("human") ? "#064e3b" : "#0f172a")
        .stroke(hot("human") ? "#34d399" : "#334155", 2)
        .label("HumanWorker", {
          fill: "#6ee7b7",
          fontSize: 11,
          fontWeight: "bold",
        });

      b.node("robot")
        .at(480, 350)
        .rect(120, 44, 10)
        .fill(hot("robot") ? "#7f1d1d" : "#1c1917")
        .stroke(hot("robot") ? "#f87171" : "#57534e", 2)
        .label("Robot ✗", {
          fill: "#fca5a5",
          fontSize: 11,
          fontWeight: "bold",
        });

      b.node("robot-lbl")
        .at(480, 405)
        .rect(0, 0, 0)
        .fill("transparent")
        .stroke("transparent", 0)
        .label("can't eat()!", { fill: "#f87171", fontSize: 10 });

      b.edge("fat-iface", "human", "e-human").stroke("#475569", 1.5);
      b.edge("fat-iface", "robot", "e-robot").stroke("#f87171", 1.5);
    } else {
      // ── AFTER: segregated interfaces ──
      b.node("i-workable")
        .at(230, 140)
        .rect(140, 50, 10)
        .fill(hot("i-workable") ? "#713f12" : "#0f172a")
        .stroke(hot("i-workable") ? "#eab308" : "#334155", 2)
        .label("«IWorkable»", {
          fill: "#fde68a",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("i-feedable")
        .at(470, 140)
        .rect(140, 50, 10)
        .fill(hot("i-feedable") ? "#713f12" : "#0f172a")
        .stroke(hot("i-feedable") ? "#eab308" : "#334155", 2)
        .label("«IFeedable»", {
          fill: "#fde68a",
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("human")
        .at(200, 350)
        .rect(130, 44, 10)
        .fill(hot("human") ? "#064e3b" : "#0f172a")
        .stroke(hot("human") ? "#34d399" : "#334155", 2)
        .label("HumanWorker", {
          fill: "#6ee7b7",
          fontSize: 11,
          fontWeight: "bold",
        });

      b.node("robot")
        .at(480, 350)
        .rect(130, 44, 10)
        .fill(hot("robot") ? "#064e3b" : "#0f172a")
        .stroke(hot("robot") ? "#34d399" : "#334155", 2)
        .label("RobotWorker ✓", {
          fill: "#6ee7b7",
          fontSize: 11,
          fontWeight: "bold",
        });

      b.edge("i-workable", "human", "e-wh").stroke("#eab308", 1.5);
      b.edge("i-feedable", "human", "e-fh").stroke("#eab308", 1.5);
      b.edge("i-workable", "robot", "e-wr").stroke("#22c55e", 1.5);
      // Robot does NOT implement IFeedable — no edge here
    }
  },

  getStatBadges(state: SolidState) {
    return [
      { label: "Principle", value: "ISP", color: "#eab308" },
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
