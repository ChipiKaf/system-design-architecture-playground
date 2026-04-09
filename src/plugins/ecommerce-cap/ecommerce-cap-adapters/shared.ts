import type { EcommerceCapState, ServiceType } from "../ecommerceCapSlice";
import type { FlowBeat } from "../flow-engine";
import type {
  EcommerceCapAdapter,
  SceneHelpers,
  ServiceColors,
  ServiceProfile,
  StatBadgeConfig,
} from "./types";

type ServiceMetrics = Pick<
  EcommerceCapState,
  | "capMode"
  | "availabilityBias"
  | "consistencyBias"
  | "staleBudget"
  | "readPolicy"
  | "writePolicy"
  | "partitionPolicy"
  | "businessPriority"
  | "customerImpact"
  | "acceptedRisk"
>;

interface TopologyCopy {
  serviceLabel: string;
  serviceSubtitle: string;
  readLabel: string;
  readSubtitle: string;
  authorityLabel: string;
  authoritySubtitle: string;
  policyLabel: string;
  policySubtitle: string;
  partitionLabel: string;
}

interface ServiceScenario {
  id: ServiceType;
  profile: ServiceProfile;
  colors: ServiceColors;
  metrics: ServiceMetrics;
  topology: TopologyCopy;
  healthyFlows: FlowBeat<EcommerceCapState>[];
  partitionFlows: FlowBeat<EcommerceCapState>[];
  decisionFlows: FlowBeat<EcommerceCapState>[];
  outcomeFlows: FlowBeat<EcommerceCapState>[];
  healthyExplanation: string;
  partitionExplanation: string;
  decisionExplanation: string;
  outcomeExplanation: string;
}

const POSITIONS = {
  shopper: { x: 92, y: 330 },
  edge: { x: 220, y: 330 },
  service: { x: 398, y: 330 },
  readModel: { x: 586, y: 174 },
  authority: { x: 810, y: 228 },
  policy: { x: 586, y: 492 },
};

const SPLIT_PHASES = new Set(["partition", "decision", "outcome", "summary"]);

const modeColor = (mode: EcommerceCapState["capMode"]) => {
  if (mode === "AP") return "#22c55e";
  if (mode === "CP") return "#f97316";
  return "#14b8a6";
};

const drawPanelNode = (
  builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  id: string,
  x: number,
  y: number,
  title: string,
  subtitle: string,
  hot: boolean,
  fill: string,
  stroke: string,
) => {
  builder
    .node(id)
    .at(x, y)
    .rect(154, 74, 14)
    .fill(hot ? fill : "#0f172a")
    .stroke(hot ? stroke : "#334155", 2)
    .label(title, {
      fill: "#e2e8f0",
      fontSize: 13,
      fontWeight: "700",
      dy: -10,
    })
    .label(subtitle, {
      fill: hot ? "#e2e8f0" : "#94a3b8",
      fontSize: 10,
      dy: 14,
    });
};

const buildCommonTopology = (
  builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  state: EcommerceCapState,
  helpers: SceneHelpers,
  scenario: ServiceScenario,
) => {
  const splitActive = SPLIT_PHASES.has(helpers.phase);

  builder
    .node("shopper")
    .at(POSITIONS.shopper.x, POSITIONS.shopper.y)
    .circle(24)
    .fill(helpers.hot("shopper") ? "#1d4ed8" : "#1e293b")
    .stroke(helpers.hot("shopper") ? "#7dd3fc" : "#475569", 2)
    .label("User", {
      fill: "#e2e8f0",
      fontSize: 11,
      fontWeight: "700",
    });

  drawPanelNode(
    builder,
    "edge",
    POSITIONS.edge.x,
    POSITIONS.edge.y,
    "Regional Edge",
    "Front-door routing",
    helpers.hot("edge"),
    "#082f49",
    "#38bdf8",
  );

  drawPanelNode(
    builder,
    "service",
    POSITIONS.service.x,
    POSITIONS.service.y,
    scenario.topology.serviceLabel,
    scenario.topology.serviceSubtitle,
    helpers.hot("service"),
    scenario.colors.fill,
    scenario.colors.stroke,
  );

  drawPanelNode(
    builder,
    "read-model",
    POSITIONS.readModel.x,
    POSITIONS.readModel.y,
    scenario.topology.readLabel,
    scenario.topology.readSubtitle,
    helpers.hot("read-model"),
    "#0f3d38",
    "#2dd4bf",
  );

  drawPanelNode(
    builder,
    "authority",
    POSITIONS.authority.x,
    POSITIONS.authority.y,
    scenario.topology.authorityLabel,
    scenario.topology.authoritySubtitle,
    helpers.hot("authority"),
    "#45210f",
    "#fb7185",
  );

  drawPanelNode(
    builder,
    "policy",
    POSITIONS.policy.x,
    POSITIONS.policy.y,
    scenario.topology.policyLabel,
    scenario.topology.policySubtitle,
    helpers.hot("policy"),
    "#312e81",
    "#c084fc",
  );

  builder
    .edge("shopper", "edge", "e-shopper-edge")
    .stroke("#475569", 1.5)
    .arrow(true);
  builder
    .edge("edge", "service", "e-edge-service")
    .stroke("#475569", 1.5)
    .arrow(true);
  builder
    .edge("service", "read-model", "e-service-read")
    .stroke("#2dd4bf", 1.5)
    .arrow(true)
    .dashed();
  builder
    .edge("read-model", "edge", "e-read-edge")
    .stroke("#14b8a6", 1.4)
    .arrow(true)
    .dashed();
  builder
    .edge("service", "policy", "e-service-policy")
    .stroke("#a78bfa", 1.5)
    .arrow(true)
    .dashed();
  builder
    .edge("policy", "edge", "e-policy-edge")
    .stroke("#c084fc", 1.4)
    .arrow(true)
    .dashed();

  const serviceAuthorityEdge = builder
    .edge("service", "authority", "e-service-authority")
    .stroke(splitActive ? "#ef4444" : "#f59e0b", splitActive ? 2.2 : 1.6)
    .arrow(true);
  if (splitActive) serviceAuthorityEdge.dashed();

  const policyAuthorityEdge = builder
    .edge("policy", "authority", "e-policy-authority")
    .stroke(splitActive ? "#ef4444" : "#f59e0b", splitActive ? 2 : 1.5)
    .arrow(true);
  if (splitActive) policyAuthorityEdge.dashed();

  builder
    .edge("authority", "read-model", "e-authority-read")
    .stroke("#f59e0b", 1.3)
    .arrow(true)
    .dashed();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.overlay((overlay: any) => {
    overlay.text({
      x: 490,
      y: 66,
      text: state.businessPriority,
      fill: "#cbd5e1",
      fontSize: 12,
      fontWeight: "bold",
      textAnchor: "middle",
    });

    if (splitActive) {
      overlay.text({
        x: 730,
        y: 108,
        text: scenario.topology.partitionLabel,
        fill: "#fca5a5",
        fontSize: 10,
        fontWeight: "bold",
        textAnchor: "middle",
      });
    }
  });
};

const expandStaticToken = (token: string, state: EcommerceCapState) => {
  if (token === "$client") return ["shopper"];
  if (token === "$edge") return ["edge"];
  if (token === "$service") return ["service"];
  if (token === "$read") return ["read-model"];
  if (token === "$authority") return ["authority"];
  if (token === "$policy") return ["policy"];
  if (token === "$critical") return state.hotZones;
  return null;
};

const buildBadges = (
  state: EcommerceCapState,
  profile: ServiceProfile,
  colors: ServiceColors,
): StatBadgeConfig[] => [
  { label: "CAP", value: profile.capMode, color: modeColor(profile.capMode) },
  {
    label: "Availability",
    value: `${state.availabilityBias}/100`,
    color: "#38bdf8",
  },
  {
    label: "Consistency",
    value: `${state.consistencyBias}/100`,
    color: "#f59e0b",
  },
  { label: "Stale Budget", value: state.staleBudget, color: colors.stroke },
];

export function createServiceAdapter(
  scenario: ServiceScenario,
): EcommerceCapAdapter {
  return {
    id: scenario.id,
    profile: scenario.profile,
    colors: scenario.colors,

    computeMetrics(state) {
      Object.assign(state, scenario.metrics);
    },

    expandToken(token, state) {
      return expandStaticToken(token, state);
    },

    getHealthyFlows() {
      return scenario.healthyFlows;
    },

    getPartitionFlows() {
      return scenario.partitionFlows;
    },

    getDecisionFlows() {
      return scenario.decisionFlows;
    },

    getOutcomeFlows() {
      return scenario.outcomeFlows;
    },

    getHealthyExplanation() {
      return scenario.healthyExplanation;
    },

    getPartitionExplanation() {
      return scenario.partitionExplanation;
    },

    getDecisionExplanation() {
      return scenario.decisionExplanation;
    },

    getOutcomeExplanation() {
      return scenario.outcomeExplanation;
    },

    buildTopology(builder, state, helpers) {
      buildCommonTopology(builder, state, helpers, scenario);
    },

    getStatBadges(state) {
      return buildBadges(state, scenario.profile, scenario.colors);
    },

    softReset() {},
  };
}
