import type { DatabaseSelectionState } from "./databaseSelectionSlice";
import {
  CAP_PROFILES,
  CAP_PROPERTY_PROFILES,
  FAMILY_NODE_IDS,
  PARTITION_BASELINE,
  PARTITION_STAGE_PROFILES,
  PARTITION_STRATEGY_META,
  SCENARIO_PROFILES,
  VARIANT_PROFILES,
  partitioningIntroFor,
} from "./databaseSelectionSlice";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

export type FlowBeat = GenericFlowBeat<DatabaseSelectionState>;
export type StepDef = GenericStepDef<DatabaseSelectionState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<DatabaseSelectionState>;

const CRITERIA_IDS = [
  "criterion-shape",
  "criterion-access",
  "criterion-consistency",
  "criterion-scale",
] as const;

const POLYGLOT_HOT_ZONES = [
  "poly-service-catalog",
  "poly-db-catalog",
  "poly-service-cart",
  "poly-db-cart",
  "poly-service-ordering",
  "poly-db-ordering",
  "poly-service-analytics",
  "poly-db-analytics",
  "poly-service-recommendations",
  "poly-db-recommendations",
];

const CAP_PROPERTY_NODE_IDS = {
  consistency: "cap-consistency",
  availability: "cap-availability",
  "partition-tolerance": "cap-partition",
} as const;

const CAP_PROFILE_NODE_IDS = {
  ca: "cap-profile-ca",
  cp: "cap-profile-cp",
  ap: "cap-profile-ap",
} as const;

const CAP_CLUSTER_ZONES = [
  "cap-system",
  "cap-client-left",
  "cap-replica-left",
  "cap-replica-right",
  "cap-client-right",
];

const CAP_PROPERTY_ZONES = Object.values(CAP_PROPERTY_NODE_IDS);
const CAP_PROFILE_ZONES = Object.values(CAP_PROFILE_NODE_IDS);

const PARTITION_METRIC_ZONES = [
  "partition-metric-throughput",
  "partition-metric-join",
  "partition-metric-routing",
  "partition-metric-isolation",
];

function uniqueZones(ids: string[]): string[] {
  return [...new Set(ids)];
}

function selectedNodeId(state: DatabaseSelectionState): string {
  return FAMILY_NODE_IDS[state.variant];
}

function recommendedNodeId(state: DatabaseSelectionState): string {
  return FAMILY_NODE_IDS[state.recommendedVariant];
}

function currentScenarioPair(state: DatabaseSelectionState): string[] {
  const key = SCENARIO_PROFILES[state.scenario].polyglotService;
  return [`poly-service-${key}`, `poly-db-${key}`];
}

function activeCapProfileNode(state: DatabaseSelectionState): string {
  return CAP_PROFILE_NODE_IDS[state.capProfile];
}

function activeCapPropertyNodes(state: DatabaseSelectionState): string[] {
  return CAP_PROFILES[state.capProfile].keeps.map(
    (key) => CAP_PROPERTY_NODE_IDS[key],
  );
}

function currentPartitionNodes(state: DatabaseSelectionState): string[] {
  if (state.partitionStrategy === "none" || state.partitionLevel === 0) {
    return [];
  }

  if (state.partitionStrategy === "horizontal") {
    return state.partitionLevel === 1
      ? ["partition-horizontal-1", "partition-horizontal-2"]
      : [
          "partition-horizontal-1",
          "partition-horizontal-2",
          "partition-horizontal-3",
          "partition-horizontal-4",
        ];
  }

  return state.partitionLevel === 1
    ? ["partition-vertical-1", "partition-vertical-2"]
    : ["partition-vertical-1", "partition-vertical-2", "partition-vertical-3"];
}

function currentPartitionProfile(state: DatabaseSelectionState) {
  if (state.partitionStrategy === "none" || state.partitionLevel === 0) {
    return null;
  }

  return (
    PARTITION_STAGE_PROFILES[state.partitionStrategy].find(
      (profile) => profile.level === state.partitionLevel,
    ) ?? null
  );
}

function currentPartitionHotZones(state: DatabaseSelectionState): string[] {
  return uniqueZones([
    "partition-source",
    "partition-key",
    ...currentPartitionNodes(state),
    ...PARTITION_METRIC_ZONES,
  ]);
}

export function expandToken(
  token: string,
  state: DatabaseSelectionState,
): string[] {
  switch (token) {
    case "$service":
      return ["service"];
    case "$shape":
      return ["criterion-shape"];
    case "$access":
      return ["criterion-access"];
    case "$consistency":
      return ["criterion-consistency"];
    case "$scale":
      return ["criterion-scale"];
    case "$criteria":
      return [...CRITERIA_IDS];
    case "$selected":
      return [selectedNodeId(state)];
    case "$recommended":
      return [recommendedNodeId(state)];
    case "$cap-system":
      return ["cap-system"];
    case "$cap-c":
      return [CAP_PROPERTY_NODE_IDS.consistency];
    case "$cap-a":
      return [CAP_PROPERTY_NODE_IDS.availability];
    case "$cap-p":
      return [CAP_PROPERTY_NODE_IDS["partition-tolerance"]];
    case "$cap-properties":
      return [...CAP_PROPERTY_ZONES];
    case "$cap-profile":
      return [activeCapProfileNode(state)];
    case "$cap-profiles":
      return [...CAP_PROFILE_ZONES];
    case "$cap-keeps":
      return activeCapPropertyNodes(state);
    case "$partition-source":
      return ["partition-source"];
    case "$partition-key":
      return ["partition-key"];
    case "$partition-groups":
      return currentPartitionNodes(state);
    case "$partition-metrics":
      return [...PARTITION_METRIC_ZONES];
    default:
      return [token];
  }
}

export type StepKey =
  | "overview"
  | "data-shape"
  | "access-pattern"
  | "consistency-needs"
  | "scale-needs"
  | "polyglot-persistence"
  | "summary"
  | "cap-overview"
  | "cap-consistency"
  | "cap-availability"
  | "cap-partition"
  | "cap-impossible-triangle"
  | "cap-tradeoff"
  | "cap-summary"
  | "partition-overview"
  | "partition-split"
  | "partition-routing"
  | "partition-tradeoffs"
  | "partition-summary";

const SELECTION_STEPS: StepDef[] = [
  {
    key: "overview",
    when: (state) => state.lessonMode === "selection",
    label: "Service Scenario",
    nextButton: "Check Data Shape",
    action: "resetRun",
    phase: "overview",
    finalHotZones: (state) =>
      uniqueZones([
        "service",
        selectedNodeId(state),
        recommendedNodeId(state),
        ...currentScenarioPair(state),
      ]),
    explain: (state) => {
      const scenario = SCENARIO_PROFILES[state.scenario];
      const selected = VARIANT_PROFILES[state.variant];
      const recommended = VARIANT_PROFILES[state.recommendedVariant];

      if (state.variant === state.recommendedVariant) {
        return `${scenario.serviceName} is a strong fit for ${selected.label}. Use the next steps to confirm the decision through data shape, access pattern, consistency, and scale.`;
      }

      return `${scenario.serviceName} is currently comparing ${selected.label} against ${recommended.label}, which is the strongest match for this workload.`;
    },
  },
  {
    key: "data-shape",
    when: (state) => state.lessonMode === "selection",
    label: "Check Data Shape",
    processingText: "Inspecting schema...",
    nextButton: "Review Access Pattern",
    nextButtonColor: "#2563eb",
    phase: "shape",
    flow: [
      {
        from: "$service",
        to: "$shape",
        duration: 550,
        color: "#38bdf8",
        explain:
          "Start with the shape of the data before arguing about brand names or databases.",
      },
    ],
    finalHotZones: (state) => [
      "service",
      "criterion-shape",
      selectedNodeId(state),
    ],
    explain: (state) => {
      const scenario = SCENARIO_PROFILES[state.scenario];
      const selected = VARIANT_PROFILES[state.variant];
      return `${scenario.dataShapeNeed} ${selected.shapeNote} ${selected.label} is currently a ${state.recommendationLevel} at ${state.fitScore}/100 for this workload.`;
    },
  },
  {
    key: "access-pattern",
    when: (state) => state.lessonMode === "selection",
    label: "Review Access Pattern",
    processingText: "Matching query shape...",
    nextButton: "Review Consistency Needs",
    nextButtonColor: "#2563eb",
    phase: "access",
    flow: [
      {
        from: "$service",
        to: "$access",
        duration: 550,
        color: "#14b8a6",
        explain:
          "The query shape matters: joins, document reads, key lookups, column slices, or graph traversals each favor different stores.",
      },
    ],
    finalHotZones: (state) => [
      "service",
      "criterion-access",
      selectedNodeId(state),
    ],
    explain: (state) => {
      const scenario = SCENARIO_PROFILES[state.scenario];
      const selected = VARIANT_PROFILES[state.variant];
      return `${scenario.accessNeed} ${selected.accessNote} Query fit for ${selected.label} is ${state.queryFit}/100 in this scenario.`;
    },
  },
  {
    key: "consistency-needs",
    when: (state) => state.lessonMode === "selection",
    label: "Review Consistency Needs",
    processingText: "Weighing ACID vs availability...",
    nextButton: "Review Scale Needs",
    nextButtonColor: "#2563eb",
    phase: "consistency",
    flow: [
      {
        from: "$service",
        to: "$consistency",
        duration: 550,
        color: "#f59e0b",
        explain:
          "Relational and NoSQL choices usually differ most clearly around consistency, availability, and transaction boundaries.",
      },
    ],
    finalHotZones: (state) => [
      "service",
      "criterion-consistency",
      selectedNodeId(state),
    ],
    explain: (state) => {
      const scenario = SCENARIO_PROFILES[state.scenario];
      const selected = VARIANT_PROFILES[state.variant];
      return `${scenario.consistencyNeed} ${selected.consistencyNote} Consistency fit for ${selected.label} is ${state.consistencyFit}/100.`;
    },
  },
  {
    key: "scale-needs",
    when: (state) => state.lessonMode === "selection",
    label: "Review Scale Needs",
    processingText: "Checking scale model...",
    nextButton: "See Polyglot Persistence",
    nextButtonColor: "#2563eb",
    phase: "scale",
    flow: [
      {
        from: "$service",
        to: "$scale",
        duration: 550,
        color: "#22c55e",
        explain:
          "Only after data shape, access pattern, and consistency do we ask how the workload should scale.",
      },
    ],
    finalHotZones: (state) => [
      "service",
      "criterion-scale",
      selectedNodeId(state),
    ],
    explain: (state) => {
      const scenario = SCENARIO_PROFILES[state.scenario];
      const selected = VARIANT_PROFILES[state.variant];
      return `${scenario.scaleNeed} ${selected.scaleNote} Scale fit for ${selected.label} is ${state.scaleFit}/100.`;
    },
  },
  {
    key: "polyglot-persistence",
    when: (state) => state.lessonMode === "selection",
    label: "See Polyglot Persistence",
    nextButton: "Selection Summary",
    delay: 300,
    phase: "polyglot",
    finalHotZones: (state) =>
      uniqueZones([...POLYGLOT_HOT_ZONES, ...currentScenarioPair(state)]),
    explain: () =>
      "Best practice in microservices is not to force one database on every service. Use the right tool for the right job: Catalog can use Document, Cart can use Key-Value, Ordering can use Relational, Analytics can use Wide Column, and Recommendations can use Graph.",
  },
  {
    key: "summary",
    when: (state) => state.lessonMode === "selection",
    label: "Selection Summary",
    phase: "summary",
    flow: (state) => [
      {
        from: "$criteria",
        to: "$selected",
        duration: 600,
        color: VARIANT_PROFILES[state.variant].color,
        explain:
          "Bring the decision lenses back together and commit to the family that best matches the service workload.",
      },
    ],
    finalHotZones: (state) =>
      uniqueZones([
        "service",
        selectedNodeId(state),
        recommendedNodeId(state),
        ...CRITERIA_IDS,
        ...currentScenarioPair(state),
      ]),
    explain: (state) => {
      const scenario = SCENARIO_PROFILES[state.scenario];
      const selected = VARIANT_PROFILES[state.variant];
      const recommended = VARIANT_PROFILES[state.recommendedVariant];

      if (state.variant === state.recommendedVariant) {
        return `${selected.label} is the best default for ${scenario.serviceName} because ${scenario.summaryNeed}. Keep the broader rule in mind: use the right tool for the right job and let different services choose different stores when the workload changes.`;
      }

      return `${recommended.label} is the stronger default for ${scenario.serviceName} because ${scenario.summaryNeed}. ${selected.label} is still a ${state.recommendationLevel} at ${state.fitScore}/100, but it carries trade-offs you should accept deliberately.`;
    },
  },
];

const CAP_STEPS: StepDef[] = [
  {
    key: "cap-overview",
    when: (state) => state.lessonMode === "cap",
    label: "CAP Overview",
    nextButton: "Define Consistency",
    action: "resetRun",
    phase: "cap-overview",
    flow: [
      {
        from: "$cap-system",
        to: "$cap-properties",
        duration: 580,
        color: "#60a5fa",
        explain:
          "CAP starts with three properties: consistency, availability, and partition tolerance.",
      },
    ],
    finalHotZones: ["cap-system", ...CAP_PROPERTY_ZONES],
    explain: () =>
      "Consistency means one current view of the data. Availability means every request gets a response. Partition tolerance means the system keeps operating when replicas cannot communicate.",
  },
  {
    key: "cap-consistency",
    when: (state) => state.lessonMode === "cap",
    label: "Define Consistency",
    processingText: "Tracing latest-write guarantees...",
    nextButton: "Define Availability",
    nextButtonColor: "#2563eb",
    phase: "cap-consistency",
    flow: [
      {
        from: "$cap-system",
        to: "$cap-c",
        duration: 520,
        color: "#60a5fa",
        explain:
          "C means reads see the latest acknowledged value, not just a best effort guess.",
      },
    ],
    finalHotZones: (state) => [
      "cap-system",
      CAP_PROPERTY_NODE_IDS.consistency,
      ...activeCapPropertyNodes(state),
    ],
    explain: (state) => {
      const profile = CAP_PROFILES[state.capProfile];
      const keepsConsistency = profile.keeps.includes("consistency");

      if (keepsConsistency) {
        return `${profile.label} protects consistency. It would rather coordinate, elect a leader, or reject a request than return a stale value.`;
      }

      return `${profile.label} does not guarantee strict consistency during partition. The system may answer quickly, but different replicas can disagree for a while.`;
    },
  },
  {
    key: "cap-availability",
    when: (state) => state.lessonMode === "cap",
    label: "Define Availability",
    processingText: "Tracing always-respond behavior...",
    nextButton: "Define Partition Tolerance",
    nextButtonColor: "#059669",
    phase: "cap-availability",
    flow: [
      {
        from: "$cap-system",
        to: "$cap-a",
        duration: 520,
        color: "#34d399",
        explain:
          "A means every request still gets some answer, even if the newest write has not reached every replica yet.",
      },
    ],
    finalHotZones: (state) => [
      "cap-system",
      CAP_PROPERTY_NODE_IDS.availability,
      ...activeCapPropertyNodes(state),
    ],
    explain: (state) => {
      const profile = CAP_PROFILES[state.capProfile];
      const keepsAvailability = profile.keeps.includes("availability");

      if (keepsAvailability) {
        return `${profile.label} protects availability. It keeps answering requests on both sides of trouble, even if consistency has to become eventual.`;
      }

      return `${profile.label} gives up availability during a partition. Some reads or writes must pause, fail, or retry so correctness can win.`;
    },
  },
  {
    key: "cap-partition",
    when: (state) => state.lessonMode === "cap",
    label: "Define Partition Tolerance",
    processingText: "Breaking the network...",
    nextButton: "Show The Impossible Triangle",
    nextButtonColor: "#d97706",
    phase: "cap-partition",
    flow: [
      {
        from: "$cap-system",
        to: "$cap-p",
        duration: 520,
        color: "#f59e0b",
        explain:
          "P matters only once replicas can be separated by the network and still need to serve clients.",
      },
      {
        from: "cap-replica-left",
        to: "cap-replica-right",
        duration: 520,
        color: "#f59e0b",
        explain:
          "A partition means the left and right sides cannot coordinate reliably, so the system must choose what to preserve.",
      },
    ],
    finalHotZones: [
      CAP_PROPERTY_NODE_IDS["partition-tolerance"],
      ...CAP_CLUSTER_ZONES,
    ],
    explain: () =>
      "In distributed systems, partitions are not hypothetical. Once the link between replicas breaks, you cannot preserve every desirable property at the same time.",
  },
  {
    key: "cap-impossible-triangle",
    when: (state) => state.lessonMode === "cap",
    label: "Show The Impossible Triangle",
    processingText: "Comparing CA, CP, and AP...",
    nextButton: "Inspect Current Profile",
    nextButtonColor: "#7c3aed",
    phase: "cap-impossible",
    flow: [
      {
        from: "$cap-properties",
        to: "$cap-profiles",
        duration: 620,
        color: "#a78bfa",
        explain:
          "Once partition tolerance matters, the system does not get all three. It chooses which pair to preserve.",
      },
    ],
    finalHotZones: [
      ...CAP_PROPERTY_ZONES,
      ...CAP_PROFILE_ZONES,
      ...CAP_CLUSTER_ZONES,
    ],
    explain: () =>
      "CA means consistency plus availability while the network is assumed healthy. CP means consistency plus partition tolerance. AP means availability plus partition tolerance.",
  },
  {
    key: "cap-tradeoff",
    when: (state) => state.lessonMode === "cap",
    label: "Inspect Current Profile",
    processingText: "Following the partition response...",
    nextButton: "CAP Summary",
    nextButtonColor: "#ec4899",
    phase: "cap-tradeoff",
    flow: (state) => [
      {
        from: "$cap-keeps",
        to: "$cap-profile",
        duration: 560,
        color: CAP_PROFILES[state.capProfile].color,
        explain:
          "The chosen profile is simply the pair of properties the system promises to keep under failure.",
      },
    ],
    finalHotZones: (state) => [
      ...activeCapPropertyNodes(state),
      activeCapProfileNode(state),
      ...CAP_CLUSTER_ZONES,
    ],
    explain: (state) => {
      const profile = CAP_PROFILES[state.capProfile];
      const dropped = CAP_PROPERTY_PROFILES[profile.givesUp];

      return `${profile.label} keeps ${profile.keeps
        .map((key) => CAP_PROPERTY_PROFILES[key].shortLabel)
        .join(
          " + ",
        )} and gives up ${dropped.shortLabel}. ${profile.partitionBehavior}`;
    },
  },
  {
    key: "cap-summary",
    when: (state) => state.lessonMode === "cap",
    label: "CAP Summary",
    phase: "cap-summary",
    flow: (state) => [
      {
        from: "$cap-profile",
        to: "$cap-system",
        duration: 560,
        color: CAP_PROFILES[state.capProfile].color,
        explain:
          "Bring the decision back to the system posture you actually want during failure.",
      },
    ],
    finalHotZones: (state) => [
      "cap-system",
      activeCapProfileNode(state),
      ...CAP_PROPERTY_ZONES,
      ...CAP_CLUSTER_ZONES,
    ],
    explain: (state) => {
      const profile = CAP_PROFILES[state.capProfile];
      return `${profile.label} is the right mental model when ${profile.chooseWhen} ${profile.risk}`;
    },
  },
];

const PARTITION_STEPS: StepDef[] = [
  {
    key: "partition-overview",
    when: (state) => state.lessonMode === "partitioning",
    label: "One Big Database",
    nextButton: "Inspect The Split",
    action: "resetRun",
    phase: "partition-overview",
    finalHotZones: (state) =>
      state.partitionStrategy === "none"
        ? ["partition-source", "partition-hotspot"]
        : uniqueZones(["partition-source", ...currentPartitionNodes(state)]),
    explain: (state) => partitioningIntroFor(state),
  },
  {
    key: "partition-split",
    when: (state) => state.lessonMode === "partitioning",
    label: "Inspect The Split",
    processingText: "Cutting the database...",
    nextButton: "Route Requests",
    nextButtonColor: "#2563eb",
    phase: "partition-split",
    flow: (state) => {
      if (state.partitionStrategy === "none") return [];
      return [
        {
          from: "$partition-source",
          to: "$partition-groups",
          duration: 600,
          color: PARTITION_STRATEGY_META[state.partitionStrategy].color,
          explain:
            state.partitionStrategy === "horizontal"
              ? "Horizontal partitioning cuts rows into shards so each partition owns a subset of the dataset."
              : "Vertical partitioning cuts columns into separate partitions so each access path only touches the columns it needs.",
        },
      ];
    },
    finalHotZones: (state) =>
      state.partitionStrategy === "none"
        ? ["partition-source", "partition-hotspot"]
        : uniqueZones(["partition-source", ...currentPartitionNodes(state)]),
    explain: (state) => {
      const profile = currentPartitionProfile(state);
      if (!profile || state.partitionStrategy === "none") {
        return `${PARTITION_BASELINE.changeSummary} Press Horizontal or Vertical to create the first split.`;
      }

      return `${profile.changeSummary} ${profile.benefit}`;
    },
  },
  {
    key: "partition-routing",
    when: (state) => state.lessonMode === "partitioning",
    label: "Route Requests",
    processingText: "Tracing partition routing...",
    nextButton: "Observe Trade-offs",
    nextButtonColor: "#7c3aed",
    phase: "partition-routing",
    flow: (state) => {
      if (state.partitionStrategy === "none") return [];
      return [
        {
          from: "$partition-key",
          to: "$partition-groups",
          duration: 560,
          color: PARTITION_STRATEGY_META[state.partitionStrategy].color,
          explain:
            state.partitionStrategy === "horizontal"
              ? "A shard key tells the app which shard owns the row before the query is sent."
              : "Access patterns tell the app which column partition to read so wide rows do not always travel together.",
        },
      ];
    },
    finalHotZones: (state) =>
      state.partitionStrategy === "none"
        ? ["partition-source", "partition-key"]
        : uniqueZones(["partition-key", ...currentPartitionNodes(state)]),
    explain: (state) => {
      const profile = currentPartitionProfile(state);
      if (!profile || state.partitionStrategy === "none") {
        return "Without partitioning, there is nothing to route. Every request lands on the same database server.";
      }

      return `${profile.keyLabel}. ${profile.keyNote}`;
    },
  },
  {
    key: "partition-tradeoffs",
    when: (state) => state.lessonMode === "partitioning",
    label: "Observe Trade-offs",
    processingText: "Updating throughput and complexity...",
    nextButton: "Partitioning Summary",
    nextButtonColor: "#ec4899",
    phase: "partition-tradeoffs",
    flow: (state) => {
      if (state.partitionStrategy === "none") return [];
      return [
        {
          from: "$partition-groups",
          to: "$partition-metrics",
          duration: 580,
          color: PARTITION_STRATEGY_META[state.partitionStrategy].color,
          explain:
            "Partitioning helps throughput and fault isolation, but it also increases routing and join complexity.",
        },
      ];
    },
    finalHotZones: (state) =>
      state.partitionStrategy === "none"
        ? ["partition-hotspot", ...PARTITION_METRIC_ZONES]
        : uniqueZones([
            ...currentPartitionNodes(state),
            ...PARTITION_METRIC_ZONES,
          ]),
    explain: (state) => {
      const profile = currentPartitionProfile(state);
      if (!profile || state.partitionStrategy === "none") {
        return `${PARTITION_BASELINE.tradeoff} Throughput is ${state.partitionThroughput}, routing complexity is ${state.partitionRoutingCost}, and join complexity is ${state.partitionJoinCost}.`;
      }

      return `${profile.benefit} ${profile.tradeoff} Throughput is now ${state.partitionThroughput}, routing complexity is ${state.partitionRoutingCost}, and join complexity is ${state.partitionJoinCost}.`;
    },
  },
  {
    key: "partition-summary",
    when: (state) => state.lessonMode === "partitioning",
    label: "Partitioning Summary",
    phase: "partition-summary",
    flow: (state) => {
      if (state.partitionStrategy === "none") return [];
      return [
        {
          from: "$partition-metrics",
          to: "$partition-groups",
          duration: 560,
          color: PARTITION_STRATEGY_META[state.partitionStrategy].color,
          explain:
            "The final choice is not whether partitioning is good in the abstract, but whether the extra distribution complexity is worth the gains for this workload.",
        },
      ];
    },
    finalHotZones: (state) =>
      state.partitionStrategy === "none"
        ? ["partition-source", "partition-hotspot", ...PARTITION_METRIC_ZONES]
        : currentPartitionHotZones(state),
    explain: (state) => {
      const profile = currentPartitionProfile(state);
      if (!profile || state.partitionStrategy === "none") {
        return "A single database keeps joins simple, but it eventually becomes the performance and manageability bottleneck. Partitioning only starts paying off once the workload is big enough to justify the extra complexity.";
      }

      return `${PARTITION_STRATEGY_META[state.partitionStrategy].label} at ${profile.label} gives you ${profile.benefit.toLowerCase()} But you are accepting ${profile.tradeoff.toLowerCase()}`;
    },
  },
];

export const STEPS: StepDef[] = [
  ...SELECTION_STEPS,
  ...CAP_STEPS,
  ...PARTITION_STEPS,
];

export function buildSteps(state: DatabaseSelectionState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
