import type { DistributedTransactionsState } from "../distributedTransactionsSlice";
import type { FlowBeat, StepKey } from "../flow-engine";
import type {
  PatternAdapter,
  PatternColors,
  PatternProfile,
  SceneHelpers,
  StatBadgeConfig,
} from "./types";

type VizBuilder = ReturnType<typeof import("vizcraft").viz>;

type MetricsState = Pick<
  DistributedTransactionsState,
  | "coordinationModel"
  | "atomicBoundary"
  | "deliverySemantics"
  | "failureStrategy"
  | "consistencyStory"
>;

interface TopologyCopy {
  initiatorLabel: string;
  initiatorSubtitle: string;
  boundaryLabel: string;
  boundarySubtitle: string;
  transportLabel: string;
  transportSubtitle: string;
  participantALabel: string;
  participantASubtitle: string;
  participantBLabel: string;
  participantBSubtitle: string;
  recoveryLabel: string;
  recoverySubtitle: string;
  splitLabel: string;
}

interface StepCopy {
  overview: string;
  "local-write": string;
  "capture-intent": string;
  "deliver-change": string;
  "handle-failure": string;
  summary: string;
}

interface PatternScenario {
  id: PatternAdapter["id"];
  profile: PatternProfile;
  colors: PatternColors;
  metrics: MetricsState;
  topology: TopologyCopy;
  copy: StepCopy;
}

const POS = {
  client: { x: 90, y: 340 },
  initiator: { x: 270, y: 340 },
  boundary: { x: 470, y: 200 },
  transport: { x: 470, y: 500 },
  "participant-a": { x: 850, y: 220 },
  "participant-b": { x: 850, y: 460 },
  recovery: { x: 850, y: 340 },
} as const;

const ALL_NODES = [
  "client",
  "initiator",
  "boundary",
  "transport",
  "participant-a",
  "participant-b",
  "recovery",
];

const HOT_ZONES_BY_STEP: Record<StepKey, string[]> = {
  overview: ALL_NODES,
  "local-write": ["client", "initiator", "boundary"],
  "capture-intent": ["boundary", "transport"],
  "deliver-change": ["transport", "participant-a", "participant-b"],
  "handle-failure": [
    "transport",
    "participant-a",
    "participant-b",
    "recovery",
  ],
  summary: ALL_NODES,
};

const FAILURE_PHASES = new Set(["deliver-change", "handle-failure", "summary"]);

const drawFrame = (
  builder: VizBuilder,
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  color: string,
  active: boolean,
) => {
  builder.overlay((overlay) => {
    overlay.add(
      "rect",
      {
        x,
        y,
        w: width,
        h: height,
        rx: 24,
        ry: 24,
        fill: active ? "rgba(15, 23, 42, 0.5)" : "rgba(2, 6, 23, 0.18)",
        stroke: active ? color : "rgba(71, 85, 105, 0.18)",
        strokeWidth: 1.3,
        opacity: 1,
      },
      { key: `${key}-frame` },
    );
    overlay.add(
      "text",
      {
        x: x + 18,
        y: y - 12,
        text: label,
        fill: active ? color : "#64748b",
        fontSize: 10,
        fontWeight: "bold",
      },
      { key: `${key}-label` },
    );
  });
};

const drawNode = (
  builder: VizBuilder,
  id: string,
  title: string,
  subtitle: string,
  hot: boolean,
  fill: string,
  stroke: string,
) => {
  const pos = POS[id as keyof typeof POS];

  builder
    .node(id)
    .at(pos.x, pos.y)
    .rect(170, 72, 18)
    .fill(hot ? fill : "#0f172a")
    .stroke(hot ? stroke : "#334155", 2)
    .label(title, {
      fill: "#e2e8f0",
      fontSize: 12,
      fontWeight: "bold",
      dy: -10,
    })
    .label(subtitle, {
      fill: hot ? "#e2e8f0" : "#94a3b8",
      fontSize: 9,
      dy: 14,
    });
};

const buildBadges = (
  state: DistributedTransactionsState,
  profile: PatternProfile,
  colors: PatternColors,
): StatBadgeConfig[] => [
  { label: "Pattern", value: profile.shortLabel, color: colors.stroke },
  { label: "Atomic", value: state.atomicBoundary, color: "#7dd3fc" },
  { label: "Delivery", value: state.deliverySemantics, color: "#86efac" },
  { label: "Failure", value: state.failureStrategy, color: "#fdba74" },
];

const tokenMap = (
  token: string,
  state: DistributedTransactionsState,
): string[] | null => {
  if (token === "$client") return ["client"];
  if (token === "$initiator") return ["initiator"];
  if (token === "$boundary") return ["boundary"];
  if (token === "$transport") return ["transport"];
  if (token === "$participant-a") return ["participant-a"];
  if (token === "$participant-b") return ["participant-b"];
  if (token === "$participants") return ["participant-a", "participant-b"];
  if (token === "$recovery") return ["recovery"];
  if (token === "$critical") return state.hotZones;
  return null;
};

const buildTopology = (
  builder: VizBuilder,
  _state: DistributedTransactionsState,
  helpers: SceneHelpers,
  scenario: PatternScenario,
) => {
  const activeLaneColor = scenario.colors.stroke;
  const failureActive = FAILURE_PHASES.has(helpers.phase);

  drawFrame(
    builder,
    "source-lane",
    26,
    270,
    322,
    144,
    "Business action",
    "#60a5fa",
    helpers.phase === "overview" || helpers.phase === "local-write",
  );
  drawFrame(
    builder,
    "boundary-lane",
    368,
    116,
    222,
    468,
    "Atomic boundary and publish intent",
    activeLaneColor,
    helpers.phase !== "overview",
  );
  drawFrame(
    builder,
    "downstream-lane",
    710,
    116,
    306,
    468,
    "Downstream effects and recovery",
    failureActive ? "#f59e0b" : "#22c55e",
    helpers.phase === "deliver-change" || helpers.phase === "handle-failure" || helpers.phase === "summary",
  );

  drawNode(
    builder,
    "client",
    "Client",
    "One business action",
    helpers.hot("client"),
    "rgba(30, 64, 175, 0.86)",
    "#60a5fa",
  );
  drawNode(
    builder,
    "initiator",
    scenario.topology.initiatorLabel,
    scenario.topology.initiatorSubtitle,
    helpers.hot("initiator"),
    scenario.colors.fill,
    scenario.colors.stroke,
  );
  drawNode(
    builder,
    "boundary",
    scenario.topology.boundaryLabel,
    scenario.topology.boundarySubtitle,
    helpers.hot("boundary"),
    "rgba(55, 48, 163, 0.86)",
    "#a78bfa",
  );
  drawNode(
    builder,
    "transport",
    scenario.topology.transportLabel,
    scenario.topology.transportSubtitle,
    helpers.hot("transport"),
    "rgba(22, 101, 52, 0.86)",
    "#22c55e",
  );
  drawNode(
    builder,
    "participant-a",
    scenario.topology.participantALabel,
    scenario.topology.participantASubtitle,
    helpers.hot("participant-a"),
    "rgba(20, 83, 45, 0.86)",
    failureActive ? "#f59e0b" : "#22c55e",
  );
  drawNode(
    builder,
    "participant-b",
    scenario.topology.participantBLabel,
    scenario.topology.participantBSubtitle,
    helpers.hot("participant-b"),
    "rgba(20, 83, 45, 0.86)",
    failureActive ? "#f59e0b" : "#22c55e",
  );
  drawNode(
    builder,
    "recovery",
    scenario.topology.recoveryLabel,
    scenario.topology.recoverySubtitle,
    helpers.hot("recovery"),
    "rgba(120, 53, 15, 0.9)",
    "#f59e0b",
  );

  builder.edge("client", "initiator", "e-client-initiator").stroke("#475569", 1.5).arrow(true);
  builder.edge("initiator", "boundary", "e-initiator-boundary").stroke("#475569", 1.5).arrow(true);
  builder.edge("boundary", "transport", "e-boundary-transport").stroke("#a78bfa", 1.6).arrow(true).dashed();
  builder.edge("transport", "participant-a", "e-transport-a").stroke(failureActive ? "#f59e0b" : "#22c55e", 1.6).arrow(true);
  builder.edge("transport", "participant-b", "e-transport-b").stroke(failureActive ? "#f59e0b" : "#22c55e", 1.6).arrow(true);
  builder.edge("participant-a", "recovery", "e-a-recovery").stroke("#f59e0b", 1.3).arrow(true).dashed();
  builder.edge("participant-b", "recovery", "e-b-recovery").stroke("#f59e0b", 1.3).arrow(true).dashed();
  builder.edge("recovery", "transport", "e-recovery-transport").stroke("#f59e0b", 1.3).arrow(true).dashed();

  builder.overlay((overlay) => {
    overlay.add(
      "text",
      {
        x: 560,
        y: 58,
        text: scenario.profile.context,
        fill: "#cbd5e1",
        fontSize: 12,
        fontWeight: "bold",
        textAnchor: "middle",
      },
      { key: "pattern-context" },
    );

    if (failureActive) {
      overlay.add(
        "text",
        {
          x: 740,
          y: 88,
          text: scenario.topology.splitLabel,
          fill: "#fdba74",
          fontSize: 10,
          fontWeight: "bold",
          textAnchor: "middle",
        },
        { key: "failure-window-note" },
      );
    }
  });
};

const localWriteFlows = (explanation: string): FlowBeat[] => [
  {
    from: "$client",
    to: "$initiator",
    duration: 460,
    color: "#60a5fa",
    explain: "The business action reaches the initiating service.",
  },
  {
    from: "$initiator",
    to: "$boundary",
    duration: 620,
    color: "#60a5fa",
    explain: explanation,
  },
];

export function createPatternAdapter(scenario: PatternScenario): PatternAdapter {
  return {
    id: scenario.id,
    profile: scenario.profile,
    colors: scenario.colors,

    computeMetrics(state) {
      Object.assign(state, scenario.metrics);
    },

    expandToken(token, state) {
      return tokenMap(token, state);
    },

    getOverviewHotZones() {
      return scenario.profile.criticalNodes;
    },

    getOverviewExplanation() {
      return scenario.copy.overview;
    },

    getStepFlows(step) {
      if (step === "local-write") {
        return localWriteFlows(scenario.copy["local-write"]);
      }

      if (step === "capture-intent") {
        return [
          {
            from: "$boundary",
            to: "$transport",
            duration: 620,
            color: "#a78bfa",
            explain: scenario.copy["capture-intent"],
          },
        ];
      }

      if (step === "deliver-change") {
        return [
          {
            from: "$transport",
            to: "$participants",
            duration: 680,
            color: "#22c55e",
            explain: scenario.copy["deliver-change"],
          },
        ];
      }

      if (step === "handle-failure") {
        return [
          {
            from: "$transport",
            to: "$recovery",
            duration: 620,
            color: "#f59e0b",
            explain: scenario.copy["handle-failure"],
          },
        ];
      }

      return [];
    },

    getStepHotZones(step) {
      return HOT_ZONES_BY_STEP[step];
    },

    getStepExplanation(step) {
      return scenario.copy[step];
    },

    buildTopology(builder, state, helpers) {
      buildTopology(builder, state, helpers, scenario);
    },

    getStatBadges(state) {
      return buildBadges(state, scenario.profile, scenario.colors);
    },

    softReset() {},
  };
}