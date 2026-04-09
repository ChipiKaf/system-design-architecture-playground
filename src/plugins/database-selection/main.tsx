import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  useConceptModal,
  ConceptPills,
  PluginLayout,
  StageHeader,
  StatBadge,
  SidePanel,
  SideCard,
  CanvasStage,
} from "../../components/plugin-kit";
import { concepts, type ConceptKey } from "./concepts";
import { buildSteps } from "./flow-engine";
import {
  CAP_PROFILES,
  CAP_PROPERTY_PROFILES,
  FAMILY_NODE_IDS,
  PARTITION_BASELINE,
  PARTITION_STAGE_PROFILES,
  PARTITION_STRATEGY_META,
  POLYGLOT_STACK,
  SCENARIO_PROFILES,
  VARIANT_PROFILES,
  type CapProfileKey,
  type CapPropertyKey,
  type DatabaseSelectionState,
  type PartitionStrategyKey,
  type VariantKey,
} from "./databaseSelectionSlice";
import {
  useDatabaseSelectionAnimation,
  type Signal,
} from "./useDatabaseSelectionAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1120;
const H = 700;

const POS = {
  service: { x: 150, y: 165 },
  "criterion-shape": { x: 430, y: 150 },
  "criterion-access": { x: 430, y: 250 },
  "criterion-consistency": { x: 430, y: 350 },
  "criterion-scale": { x: 430, y: 450 },
  "family-relational": { x: 740, y: 150 },
  "family-document": { x: 965, y: 150 },
  "family-key-value": { x: 740, y: 300 },
  "family-wide-column": { x: 965, y: 300 },
  "family-graph": { x: 852, y: 450 },
  "poly-service-catalog": { x: 118, y: 610 },
  "poly-db-catalog": { x: 118, y: 656 },
  "poly-service-cart": { x: 325, y: 610 },
  "poly-db-cart": { x: 325, y: 656 },
  "poly-service-ordering": { x: 532, y: 610 },
  "poly-db-ordering": { x: 532, y: 656 },
  "poly-service-analytics": { x: 739, y: 610 },
  "poly-db-analytics": { x: 739, y: 656 },
  "poly-service-recommendations": { x: 946, y: 610 },
  "poly-db-recommendations": { x: 946, y: 656 },
} as const;

const CAP_POS = {
  "cap-system": { x: 168, y: 168 },
  "cap-consistency": { x: 455, y: 126 },
  "cap-availability": { x: 350, y: 320 },
  "cap-partition": { x: 560, y: 320 },
  "cap-profile-ca": { x: 898, y: 126 },
  "cap-profile-cp": { x: 898, y: 294 },
  "cap-profile-ap": { x: 898, y: 462 },
  "cap-client-left": { x: 175, y: 596 },
  "cap-replica-left": { x: 396, y: 596 },
  "cap-replica-right": { x: 650, y: 596 },
  "cap-client-right": { x: 870, y: 596 },
} as const;

const PARTITION_POS = {
  "partition-source": { x: 166, y: 262 },
  "partition-hotspot": { x: 166, y: 456 },
  "partition-key": { x: 438, y: 164 },
  "partition-horizontal-1": { x: 724, y: 210 },
  "partition-horizontal-2": { x: 724, y: 384 },
  "partition-horizontal-3": { x: 946, y: 210 },
  "partition-horizontal-4": { x: 946, y: 384 },
  "partition-vertical-1": { x: 836, y: 190 },
  "partition-vertical-2": { x: 836, y: 356 },
  "partition-vertical-3": { x: 836, y: 522 },
  "partition-metric-throughput": { x: 234, y: 622 },
  "partition-metric-join": { x: 470, y: 622 },
  "partition-metric-routing": { x: 706, y: 622 },
  "partition-metric-isolation": { x: 942, y: 622 },
} as const;

type PositionKey = keyof typeof POS;
type CapPositionKey = keyof typeof CAP_POS;
type PartitionPositionKey = keyof typeof PARTITION_POS;
type Builder = ReturnType<typeof viz>;
type HotCheck = (id: string) => boolean;

interface CardOptions {
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  fontSize?: number;
  labelColor?: string;
  labelDy?: number;
  strokeWidth?: number;
}

interface PartitionCardSpec {
  nodeId: PartitionPositionKey;
  title: string;
  subtitle: string;
  lines: string[];
}

const CRITERIA = [
  { key: "shape", nodeId: "criterion-shape", label: "Data Shape" },
  { key: "access", nodeId: "criterion-access", label: "Access Pattern" },
  {
    key: "consistency",
    nodeId: "criterion-consistency",
    label: "Consistency",
  },
  { key: "scale", nodeId: "criterion-scale", label: "Scale" },
] as const;

const CAP_PROPERTIES = [
  {
    key: "consistency" as const,
    nodeId: "cap-consistency" as const,
    label: "Consistency",
    caption: "Latest write or error",
  },
  {
    key: "availability" as const,
    nodeId: "cap-availability" as const,
    label: "Availability",
    caption: "Every request answers",
  },
  {
    key: "partition-tolerance" as const,
    nodeId: "cap-partition" as const,
    label: "Partition Tolerance",
    caption: "Survive network splits",
  },
] as const;

const CAP_PROFILE_NODE_IDS: Record<CapProfileKey, CapPositionKey> = {
  ca: "cap-profile-ca",
  cp: "cap-profile-cp",
  ap: "cap-profile-ap",
};

const PARTITION_SOURCE_LINES = [
  "id | region | name | tier",
  "1 | east | alice | pro",
  "2 | east | bob | basic",
  "3 | west | carrie | pro",
  "4 | west | david | basic",
];

const PARTITION_HORIZONTAL_CARDS: Record<1 | 2, PartitionCardSpec[]> = {
  1: [
    {
      nodeId: "partition-horizontal-1",
      title: "Shard A",
      subtitle: "region = east",
      lines: ["1 | east | alice | pro", "2 | east | bob | basic"],
    },
    {
      nodeId: "partition-horizontal-2",
      title: "Shard B",
      subtitle: "region = west",
      lines: ["3 | west | carrie | pro", "4 | west | david | basic"],
    },
  ],
  2: [
    {
      nodeId: "partition-horizontal-1",
      title: "Shard 0",
      subtitle: "hash(id) = 0",
      lines: ["4 | west | david | basic"],
    },
    {
      nodeId: "partition-horizontal-2",
      title: "Shard 1",
      subtitle: "hash(id) = 1",
      lines: ["1 | east | alice | pro"],
    },
    {
      nodeId: "partition-horizontal-3",
      title: "Shard 2",
      subtitle: "hash(id) = 2",
      lines: ["2 | east | bob | basic"],
    },
    {
      nodeId: "partition-horizontal-4",
      title: "Shard 3",
      subtitle: "hash(id) = 3",
      lines: ["3 | west | carrie | pro"],
    },
  ],
};

const PARTITION_VERTICAL_CARDS: Record<1 | 2, PartitionCardSpec[]> = {
  1: [
    {
      nodeId: "partition-vertical-1",
      title: "Core columns",
      subtitle: "id | region | name",
      lines: ["1 | east | alice", "2 | east | bob", "3 | west | carrie"],
    },
    {
      nodeId: "partition-vertical-2",
      title: "Status columns",
      subtitle: "id | tier | spend",
      lines: ["1 | pro | 4.2k", "2 | basic | 980", "3 | pro | 5.0k"],
    },
  ],
  2: [
    {
      nodeId: "partition-vertical-1",
      title: "Identity",
      subtitle: "id | name",
      lines: ["1 | alice", "2 | bob", "3 | carrie"],
    },
    {
      nodeId: "partition-vertical-2",
      title: "Profile",
      subtitle: "id | region | tier",
      lines: ["1 | east | pro", "2 | east | basic", "3 | west | pro"],
    },
    {
      nodeId: "partition-vertical-3",
      title: "Activity / blob",
      subtitle: "id | spend | note",
      lines: ["1 | 4.2k | ...", "2 | 980 | ...", "3 | 5.0k | ..."],
    },
  ],
};

function fitColor(score: number): string {
  if (score >= 70) return "#4ade80";
  if (score >= 50) return "#fbbf24";
  return "#f87171";
}

function activeLensForPhase(phase: string): string | null {
  switch (phase) {
    case "shape":
      return "shape";
    case "access":
      return "access";
    case "consistency":
      return "consistency";
    case "scale":
      return "scale";
    case "summary":
      return "summary";
    default:
      return null;
  }
}

function capFocusForPhase(
  phase: string,
): CapPropertyKey | "profiles" | "summary" | null {
  switch (phase) {
    case "cap-consistency":
      return "consistency";
    case "cap-availability":
      return "availability";
    case "cap-partition":
      return "partition-tolerance";
    case "cap-impossible":
    case "cap-tradeoff":
      return "profiles";
    case "cap-summary":
      return "summary";
    default:
      return null;
  }
}

function partitionFocusForPhase(
  phase: string,
): "source" | "groups" | "routing" | "metrics" | "summary" | null {
  switch (phase) {
    case "partition-overview":
      return "source";
    case "partition-split":
      return "groups";
    case "partition-routing":
      return "routing";
    case "partition-tradeoffs":
      return "metrics";
    case "partition-summary":
      return "summary";
    default:
      return null;
  }
}

function lensAccent(lens: string): string {
  switch (lens) {
    case "shape":
      return "#60a5fa";
    case "access":
      return "#2dd4bf";
    case "consistency":
      return "#f59e0b";
    case "scale":
      return "#34d399";
    case "summary":
      return "#f472b6";
    default:
      return "#64748b";
  }
}

function criterionCaptionFor(variant: VariantKey, lens: string): string {
  switch (variant) {
    case "relational":
      switch (lens) {
        case "shape":
          return "Structured rows";
        case "access":
          return "Joins and reports";
        case "consistency":
          return "ACID-first";
        case "scale":
          return "Scale up carefully";
        default:
          return "";
      }
    case "document":
      switch (lens) {
        case "shape":
          return "Flexible docs";
        case "access":
          return "Hierarchical reads";
        case "consistency":
          return "Per-doc atomic";
        case "scale":
          return "Elastic reads";
        default:
          return "";
      }
    case "key-value":
      switch (lens) {
        case "shape":
          return "Simple values";
        case "access":
          return "One-hop lookup";
        case "consistency":
          return "Availability-first";
        case "scale":
          return "Low-latency scale";
        default:
          return "";
      }
    case "wide-column":
      switch (lens) {
        case "shape":
          return "Column families";
        case "access":
          return "Column slices";
        case "consistency":
          return "Tunable consistency";
        case "scale":
          return "Massive writes";
        default:
          return "";
      }
    case "graph":
      switch (lens) {
        case "shape":
          return "Nodes and edges";
        case "access":
          return "Traversal queries";
        case "consistency":
          return "Relationship-aware";
        case "scale":
          return "Graph workloads";
        default:
          return "";
      }
  }
}

function drawCard(
  builder: Builder,
  id: PositionKey,
  label: string,
  options: CardOptions = {},
) {
  const position = POS[id];
  builder
    .node(id)
    .at(position.x, position.y)
    .rect(options.width ?? 180, options.height ?? 64, options.radius ?? 16)
    .fill(options.fill ?? "#0f172a")
    .stroke(options.stroke ?? "#334155", options.strokeWidth ?? 2)
    .label(label, {
      fill: options.labelColor ?? "#e2e8f0",
      fontSize: options.fontSize ?? 13,
      fontWeight: "bold",
      dy: options.labelDy ?? -14,
    });
}

function drawCapCard(
  builder: Builder,
  id: CapPositionKey,
  label: string,
  options: CardOptions = {},
) {
  const position = CAP_POS[id];
  builder
    .node(id)
    .at(position.x, position.y)
    .rect(options.width ?? 188, options.height ?? 68, options.radius ?? 18)
    .fill(options.fill ?? "#0f172a")
    .stroke(options.stroke ?? "#334155", options.strokeWidth ?? 2)
    .label(label, {
      fill: options.labelColor ?? "#e2e8f0",
      fontSize: options.fontSize ?? 13,
      fontWeight: "bold",
      dy: options.labelDy ?? -14,
    });
}

function drawPartitionCard(
  builder: Builder,
  id: PartitionPositionKey,
  label: string,
  options: CardOptions = {},
) {
  const position = PARTITION_POS[id];
  builder
    .node(id)
    .at(position.x, position.y)
    .rect(options.width ?? 190, options.height ?? 72, options.radius ?? 18)
    .fill(options.fill ?? "#0f172a")
    .stroke(options.stroke ?? "#334155", options.strokeWidth ?? 2)
    .label(label, {
      fill: options.labelColor ?? "#e2e8f0",
      fontSize: options.fontSize ?? 13,
      fontWeight: "bold",
      dy: options.labelDy ?? -14,
    });
}

function complexityColor(score: number): string {
  if (score <= 25) return "#4ade80";
  if (score <= 55) return "#fbbf24";
  return "#f87171";
}

function throughputColor(score: number): string {
  if (score >= 170) return "#4ade80";
  if (score > 100) return "#fbbf24";
  return "#94a3b8";
}

function partitionProfileFor(
  strategy: PartitionStrategyKey,
  level: DatabaseSelectionState["partitionLevel"],
) {
  if (strategy === "none" || level === 0) return null;
  return (
    PARTITION_STAGE_PROFILES[strategy].find(
      (profile) => profile.level === level,
    ) ?? null
  );
}

function partitionCardsFor(
  strategy: PartitionStrategyKey,
  level: DatabaseSelectionState["partitionLevel"],
): PartitionCardSpec[] {
  if (strategy === "horizontal" && level > 0) {
    return PARTITION_HORIZONTAL_CARDS[level as 1 | 2];
  }
  if (strategy === "vertical" && level > 0) {
    return PARTITION_VERTICAL_CARDS[level as 1 | 2];
  }
  return [];
}

function partitionBanner(
  strategy: PartitionStrategyKey,
  level: DatabaseSelectionState["partitionLevel"],
): string {
  if (strategy === "none" || level === 0) {
    return "One database keeps joins simple, but it also keeps the bottleneck intact.";
  }

  const profile = partitionProfileFor(strategy, level);
  if (!profile) {
    return "Choose a partitioning strategy to inspect the trade-offs.";
  }

  return `${profile.label}: throughput rises, but routing and join complexity rise too.`;
}

function capPairSignature(profileKey: CapProfileKey): string {
  return CAP_PROFILES[profileKey].keeps
    .map((key) => CAP_PROPERTY_PROFILES[key].shortLabel)
    .join(" + ");
}

function capDroppedSignature(profileKey: CapProfileKey): string {
  return CAP_PROPERTY_PROFILES[CAP_PROFILES[profileKey].givesUp].shortLabel;
}

function capReplicaText(
  profileKey: CapProfileKey,
  side: "left" | "right",
): string {
  switch (profileKey) {
    case "ca":
      return side === "left" ? "Healthy path only" : "Split unsupported";
    case "cp":
      return side === "left" ? "Leader / quorum side" : "Retries or rejects";
    case "ap":
      return side === "left" ? "Responds locally" : "Responds locally";
  }
}

function capPartitionBanner(profileKey: CapProfileKey): string {
  switch (profileKey) {
    case "ca":
      return "CA cannot stay CA once the network truly splits.";
    case "cp":
      return "CP protects one correct view and accepts temporary unavailability.";
    case "ap":
      return "AP stays responsive and reconciles divergence later.";
  }
}

function addOverlayBadge(
  builder: Builder,
  key: string,
  x: number,
  y: number,
  text: string,
  fill: string,
  color: string,
) {
  builder.overlay((overlay) => {
    overlay.add(
      "rect",
      {
        x,
        y,
        w: text.length * 6.2 + 16,
        h: 20,
        rx: 10,
        ry: 10,
        fill,
        stroke: color,
        strokeWidth: 1,
        opacity: 0.98,
      },
      { key: `${key}-bg` },
    );
    overlay.add(
      "text",
      {
        x: x + 8,
        y: y + 13,
        text,
        fill: color,
        fontSize: 9,
        fontWeight: "bold",
      },
      { key: `${key}-text` },
    );
  });
}

function DatabaseSelectionVisualization({ onAnimationComplete }: Props) {
  const { runtime, signals } =
    useDatabaseSelectionAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);
  const stageScrollRef = useRef<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const shellScrollRef = useRef<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const state = runtime as DatabaseSelectionState;
  const {
    capProfile,
    explanation,
    fitScore,
    queryFit,
    consistencyFit,
    scaleFit,
    hotZones,
    lessonMode,
    partitionCount,
    partitionIsolation,
    partitionJoinCost,
    partitionLevel,
    partitionRoutingCost,
    partitionStrategy,
    partitionThroughput,
    phase,
    recommendationLevel,
    recommendedVariant,
    scenario,
    variant,
  } = state;
  const scenarioProfile = SCENARIO_PROFILES[scenario];
  const selectedProfile = VARIANT_PROFILES[variant];
  const recommendedProfile = VARIANT_PROFILES[recommendedVariant];
  const capProfileData = CAP_PROFILES[capProfile];
  const capDroppedProperty = CAP_PROPERTY_PROFILES[capProfileData.givesUp];
  const partitionMeta =
    partitionStrategy === "none"
      ? null
      : PARTITION_STRATEGY_META[partitionStrategy];
  const partitionProfile = partitionProfileFor(
    partitionStrategy,
    partitionLevel,
  );
  const partitionCards = partitionCardsFor(partitionStrategy, partitionLevel);
  const walkthroughSteps = buildSteps(state);
  const activeLens = activeLensForPhase(phase);
  const capFocus = capFocusForPhase(phase);
  const partitionFocus = partitionFocusForPhase(phase);
  const fitTone = fitColor(fitScore);
  const currentPolyglot = scenarioProfile.polyglotService;
  const isBestFit = variant === recommendedVariant;
  const partitionAccent = partitionMeta?.color ?? "#64748b";

  const selectionScene = useMemo(() => {
    const builder = viz().view(W, H);
    const hot: HotCheck = (id) => hotZones.includes(id);

    drawCard(builder, "service", scenarioProfile.serviceName, {
      width: 220,
      height: 90,
      radius: 22,
      fill: hot("service")
        ? "rgba(15, 118, 110, 0.28)"
        : "rgba(15, 23, 42, 0.94)",
      stroke: hot("service") ? scenarioProfile.color : "#334155",
      labelDy: -22,
      fontSize: 15,
    });

    CRITERIA.forEach((criterion) => {
      const criterionLens = criterion.key;
      const isActive = activeLens === criterionLens || activeLens === "summary";
      drawCard(builder, criterion.nodeId, criterion.label, {
        width: 210,
        height: 62,
        radius: 18,
        fill: isActive ? "rgba(15, 23, 42, 0.98)" : "rgba(11, 18, 32, 0.88)",
        stroke: isActive ? lensAccent(criterionLens) : "#334155",
        labelDy: -12,
        fontSize: 12,
      });

      builder
        .edge("service", criterion.nodeId, `edge-${criterion.nodeId}`)
        .stroke(
          isActive ? lensAccent(criterionLens) : "rgba(100, 116, 139, 0.22)",
          1.2,
        )
        .arrow(true)
        .dashed();
    });

    (Object.keys(FAMILY_NODE_IDS) as VariantKey[]).forEach((key) => {
      const profile = VARIANT_PROFILES[key];
      const nodeId = FAMILY_NODE_IDS[key] as PositionKey;
      const isSelected = key === variant;
      const isRecommended = key === recommendedVariant;
      const isFamilyHot = hot(nodeId);

      drawCard(builder, nodeId, profile.label, {
        width: 180,
        height: 96,
        radius: 20,
        fill:
          isSelected || isFamilyHot
            ? "rgba(15, 23, 42, 0.98)"
            : isRecommended
              ? "rgba(17, 24, 39, 0.92)"
              : "rgba(11, 18, 32, 0.88)",
        stroke:
          isSelected || isFamilyHot
            ? profile.color
            : isRecommended
              ? scenarioProfile.color
              : "#334155",
        labelDy: -28,
        fontSize: 13,
        strokeWidth: isSelected ? 2.8 : 2,
      });
    });

    POLYGLOT_STACK.forEach((entry) => {
      const serviceId = `poly-service-${entry.key}` as PositionKey;
      const dbId = `poly-db-${entry.key}` as PositionKey;
      const isScenarioPair = entry.key === currentPolyglot;
      const polyColor = VARIANT_PROFILES[entry.variant].color;
      const hotPair = hot(serviceId) || hot(dbId);

      drawCard(builder, serviceId, entry.service, {
        width: 118,
        height: 34,
        radius: 12,
        fill: hotPair ? "rgba(15, 23, 42, 0.98)" : "rgba(11, 18, 32, 0.8)",
        stroke: hotPair
          ? polyColor
          : isScenarioPair
            ? scenarioProfile.color
            : "#334155",
        labelDy: -4,
        fontSize: 10,
      });

      drawCard(builder, dbId, entry.storeLabel, {
        width: 118,
        height: 28,
        radius: 12,
        fill: hotPair ? "rgba(15, 23, 42, 0.98)" : "rgba(11, 18, 32, 0.8)",
        stroke: hotPair
          ? polyColor
          : isScenarioPair
            ? scenarioProfile.color
            : "#334155",
        labelDy: -3,
        fontSize: 9,
      });

      builder
        .edge(serviceId, dbId, `edge-${entry.key}`)
        .stroke(hotPair ? polyColor : "rgba(100, 116, 139, 0.22)", 1.2)
        .arrow(true);
    });

    builder.overlay((overlay) => {
      overlay.add(
        "text",
        {
          x: 52,
          y: 70,
          text: "Service workload",
          fill: scenarioProfile.color,
          fontSize: 12,
          fontWeight: "bold",
        },
        { key: "section-workload" },
      );
      overlay.add(
        "text",
        {
          x: 332,
          y: 70,
          text: "Decision lenses",
          fill: "#93c5fd",
          fontSize: 12,
          fontWeight: "bold",
        },
        { key: "section-lenses" },
      );
      overlay.add(
        "text",
        {
          x: 704,
          y: 70,
          text: "Database families",
          fill: "#cbd5e1",
          fontSize: 12,
          fontWeight: "bold",
        },
        { key: "section-families" },
      );

      overlay.add(
        "text",
        {
          x: POS.service.x,
          y: POS.service.y + 2,
          text: scenarioProfile.shortLabel,
          fill: scenarioProfile.color,
          fontSize: 11,
          fontWeight: "bold",
          textAnchor: "middle",
        },
        { key: "service-short" },
      );
      overlay.add(
        "text",
        {
          x: POS.service.x,
          y: POS.service.y + 20,
          text: scenarioProfile.description,
          fill: "#cbd5e1",
          fontSize: 9,
          fontWeight: 500,
          textAnchor: "middle",
        },
        { key: "service-description" },
      );

      scenarioProfile.requirements.forEach((requirement, index) => {
        const lens = CRITERIA[index].key;
        const isActiveRequirement =
          activeLens === lens || activeLens === "summary";
        const x = 44;
        const y = 248 + index * 30;
        overlay.add(
          "rect",
          {
            x,
            y,
            w: 212,
            h: 24,
            rx: 12,
            ry: 12,
            fill: isActiveRequirement
              ? "rgba(15, 23, 42, 0.98)"
              : "rgba(11, 18, 32, 0.82)",
            stroke: isActiveRequirement
              ? lensAccent(lens)
              : "rgba(148, 163, 184, 0.18)",
            strokeWidth: 1,
            opacity: 0.98,
          },
          { key: `requirement-${lens}` },
        );
        overlay.add(
          "text",
          {
            x: x + 12,
            y: y + 15,
            text: requirement,
            fill: isActiveRequirement ? "#f8fafc" : "#cbd5e1",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: `requirement-text-${lens}` },
        );
      });

      CRITERIA.forEach((criterion) => {
        const caption = criterionCaptionFor(variant, criterion.key);
        const position = POS[criterion.nodeId as PositionKey];
        const isActiveCriterion =
          activeLens === criterion.key || activeLens === "summary";
        overlay.add(
          "text",
          {
            x: position.x,
            y: position.y + 14,
            text: caption,
            fill: isActiveCriterion ? lensAccent(criterion.key) : "#94a3b8",
            fontSize: 10,
            fontWeight: "bold",
            textAnchor: "middle",
          },
          { key: `criterion-caption-${criterion.key}` },
        );
      });

      overlay.add(
        "text",
        {
          x: POS["family-relational"].x,
          y: 96,
          text: "Relational",
          fill: "#93c5fd",
          fontSize: 11,
          fontWeight: "bold",
          textAnchor: "middle",
        },
        { key: "family-group-relational" },
      );
      overlay.add(
        "text",
        {
          x: POS["family-relational"].x,
          y: 112,
          text: "SQL + ACID",
          fill: "#94a3b8",
          fontSize: 9,
          fontWeight: 600,
          textAnchor: "middle",
        },
        { key: "family-group-relational-sub" },
      );
      overlay.add(
        "text",
        {
          x: 907,
          y: 96,
          text: "NoSQL",
          fill: "#86efac",
          fontSize: 11,
          fontWeight: "bold",
          textAnchor: "middle",
        },
        { key: "family-group-nosql" },
      );
      overlay.add(
        "text",
        {
          x: 907,
          y: 112,
          text: "Document, key-value, column, graph",
          fill: "#94a3b8",
          fontSize: 9,
          fontWeight: 600,
          textAnchor: "middle",
        },
        { key: "family-group-nosql-sub" },
      );

      (Object.keys(FAMILY_NODE_IDS) as VariantKey[]).forEach((key) => {
        const profile = VARIANT_PROFILES[key];
        const nodeId = FAMILY_NODE_IDS[key] as PositionKey;
        const position = POS[nodeId];
        const isSelected = key === variant;
        const isRecommended = key === recommendedVariant;
        const emphasis = isSelected || hot(nodeId);

        profile.visibleTags.forEach((tag, index) => {
          overlay.add(
            "text",
            {
              x: position.x,
              y: position.y - 4 + index * 16,
              text: tag,
              fill: emphasis ? "#f8fafc" : "#cbd5e1",
              fontSize: 9,
              fontWeight: index === 0 ? "bold" : 600,
              textAnchor: "middle",
            },
            { key: `${nodeId}-tag-${index}` },
          );
        });

        overlay.add(
          "text",
          {
            x: position.x,
            y: position.y + 46,
            text: profile.examples.slice(0, 2).join(" / "),
            fill: emphasis ? profile.color : "#94a3b8",
            fontSize: 8,
            fontWeight: 700,
            textAnchor: "middle",
          },
          { key: `${nodeId}-example` },
        );

        if (isRecommended) {
          overlay.add(
            "rect",
            {
              x: position.x + 34,
              y: position.y - 44,
              w: 64,
              h: 20,
              rx: 10,
              ry: 10,
              fill: "rgba(134, 239, 172, 0.18)",
              stroke: "#4ade80",
              strokeWidth: 1,
              opacity: 0.98,
            },
            { key: `${nodeId}-best-fit-badge` },
          );
          overlay.add(
            "text",
            {
              x: position.x + 66,
              y: position.y - 31,
              text: "Best fit",
              fill: "#86efac",
              fontSize: 9,
              fontWeight: "bold",
              textAnchor: "middle",
            },
            { key: `${nodeId}-best-fit-text` },
          );
        }
      });

      overlay.add(
        "text",
        {
          x: W / 2,
          y: 534,
          text: "Polyglot persistence",
          fill:
            phase === "polyglot" || phase === "summary" ? "#86efac" : "#64748b",
          fontSize: 11,
          fontWeight: "bold",
          textAnchor: "middle",
        },
        { key: "polyglot-title" },
      );
      overlay.add(
        "text",
        {
          x: W / 2,
          y: 550,
          text: "Do not default to one database family for every microservice.",
          fill:
            phase === "polyglot" || phase === "summary" ? "#cbd5e1" : "#64748b",
          fontSize: 9,
          fontWeight: 600,
          textAnchor: "middle",
        },
        { key: "polyglot-subtitle" },
      );

      POLYGLOT_STACK.forEach((entry) => {
        const dbId = `poly-db-${entry.key}` as PositionKey;
        const dbPosition = POS[dbId];
        const isScenarioPair = entry.key === currentPolyglot;
        const showReason =
          phase === "polyglot" || phase === "summary" || isScenarioPair;

        if (!showReason) return;

        overlay.add(
          "text",
          {
            x: dbPosition.x,
            y: dbPosition.y + 32,
            text: entry.reason,
            fill: isScenarioPair ? scenarioProfile.color : "#94a3b8",
            fontSize: 8,
            fontWeight: 700,
            textAnchor: "middle",
          },
          { key: `polyglot-reason-${entry.key}` },
        );
      });

      if (!isBestFit) {
        addOverlayBadge(
          builder,
          "compare-note",
          706,
          522,
          `Recommended: ${recommendedProfile.shortLabel}`,
          "rgba(96, 165, 250, 0.12)",
          recommendedProfile.color,
        );
      } else {
        addOverlayBadge(
          builder,
          "compare-note",
          706,
          522,
          `Current choice is the best fit`,
          "rgba(74, 222, 128, 0.12)",
          "#4ade80",
        );
      }

      if (signals.length > 0) {
        signals.forEach((signal: Signal) => {
          const { id, colorClass, ...params } = signal;
          overlay.add("signal", params as SignalOverlayParams, {
            key: id,
            className: colorClass,
          });
        });
      }
    });

    return builder;
  }, [
    activeLens,
    currentPolyglot,
    hotZones,
    isBestFit,
    phase,
    recommendedProfile.color,
    recommendedProfile.shortLabel,
    recommendedVariant,
    scenarioProfile.color,
    scenarioProfile.description,
    scenarioProfile.requirements,
    scenarioProfile.serviceName,
    scenarioProfile.shortLabel,
    signals,
    variant,
  ]);

  const capScene = useMemo(() => {
    const builder = viz().view(W, H);
    const hot: HotCheck = (id) => hotZones.includes(id);
    const partitionActive =
      phase === "cap-partition" ||
      phase === "cap-impossible" ||
      phase === "cap-tradeoff" ||
      phase === "cap-summary";

    drawCapCard(builder, "cap-system", "Distributed Data Store", {
      width: 230,
      height: 90,
      radius: 22,
      fill: hot("cap-system")
        ? "rgba(30, 41, 59, 0.98)"
        : "rgba(15, 23, 42, 0.94)",
      stroke: hot("cap-system") ? capProfileData.color : "#334155",
      labelDy: -22,
      fontSize: 15,
    });

    CAP_PROPERTIES.forEach((property) => {
      const detail = CAP_PROPERTY_PROFILES[property.key];
      const isActive = capFocus === property.key || capFocus === "summary";

      drawCapCard(builder, property.nodeId, property.label, {
        width: 214,
        height: 76,
        radius: 18,
        fill: isActive ? "rgba(15, 23, 42, 0.98)" : "rgba(11, 18, 32, 0.88)",
        stroke: isActive ? detail.color : "#334155",
        labelDy: -18,
        fontSize: 12,
      });

      builder
        .edge("cap-system", property.nodeId, `edge-${property.nodeId}`)
        .stroke(isActive ? detail.color : "rgba(100, 116, 139, 0.22)", 1.2)
        .arrow(true)
        .dashed();
    });

    (Object.keys(CAP_PROFILE_NODE_IDS) as CapProfileKey[]).forEach((key) => {
      const profile = CAP_PROFILES[key];
      const nodeId = CAP_PROFILE_NODE_IDS[key];
      const isSelected = key === capProfile;
      const isHot = hot(nodeId);
      const emphasis = isSelected || isHot || capFocus === "summary";

      drawCapCard(builder, nodeId, profile.label, {
        width: 188,
        height: 104,
        radius: 20,
        fill: emphasis ? "rgba(15, 23, 42, 0.98)" : "rgba(11, 18, 32, 0.88)",
        stroke: emphasis ? profile.color : "#334155",
        labelDy: -30,
        fontSize: 16,
        strokeWidth: isSelected ? 2.8 : 2,
      });

      profile.keeps.forEach((propertyKey) => {
        const from = CAP_PROPERTIES.find((entry) => entry.key === propertyKey);
        if (!from) return;

        builder
          .edge(from.nodeId, nodeId, `edge-${from.nodeId}-${nodeId}`)
          .stroke(isSelected ? profile.color : "rgba(100, 116, 139, 0.18)", 1.2)
          .arrow(true)
          .dashed();
      });
    });

    drawCapCard(builder, "cap-client-left", "Client A", {
      width: 120,
      height: 36,
      radius: 12,
      fill: "rgba(11, 18, 32, 0.82)",
      stroke: hot("cap-client-left") ? "#60a5fa" : "#334155",
      labelDy: -4,
      fontSize: 10,
    });
    drawCapCard(builder, "cap-client-right", "Client B", {
      width: 120,
      height: 36,
      radius: 12,
      fill: "rgba(11, 18, 32, 0.82)",
      stroke: hot("cap-client-right") ? "#60a5fa" : "#334155",
      labelDy: -4,
      fontSize: 10,
    });
    drawCapCard(builder, "cap-replica-left", "Replica Left", {
      width: 182,
      height: 48,
      radius: 14,
      fill: "rgba(15, 23, 42, 0.94)",
      stroke: hot("cap-replica-left") ? capProfileData.color : "#334155",
      labelDy: -9,
      fontSize: 11,
    });
    drawCapCard(builder, "cap-replica-right", "Replica Right", {
      width: 182,
      height: 48,
      radius: 14,
      fill: "rgba(15, 23, 42, 0.94)",
      stroke: hot("cap-replica-right") ? capProfileData.color : "#334155",
      labelDy: -9,
      fontSize: 11,
    });

    builder
      .edge("cap-client-left", "cap-replica-left", "edge-cap-client-left")
      .stroke("rgba(148, 163, 184, 0.28)", 1.2)
      .arrow(true);
    builder
      .edge("cap-client-right", "cap-replica-right", "edge-cap-client-right")
      .stroke("rgba(148, 163, 184, 0.28)", 1.2)
      .arrow(true);
    builder
      .edge("cap-replica-left", "cap-replica-right", "edge-cap-replicas")
      .stroke(
        partitionActive
          ? "rgba(239, 68, 68, 0.9)"
          : "rgba(148, 163, 184, 0.28)",
        partitionActive ? 2 : 1.2,
      )
      .dashed();

    builder.overlay((overlay) => {
      overlay.add(
        "text",
        {
          x: 58,
          y: 74,
          text: "Distributed system",
          fill: capProfileData.color,
          fontSize: 12,
          fontWeight: "bold",
        },
        { key: "cap-section-system" },
      );
      overlay.add(
        "text",
        {
          x: 355,
          y: 74,
          text: "CAP properties",
          fill: "#cbd5e1",
          fontSize: 12,
          fontWeight: "bold",
        },
        { key: "cap-section-properties" },
      );
      overlay.add(
        "text",
        {
          x: 828,
          y: 74,
          text: "Trade-off choices",
          fill: "#f9a8d4",
          fontSize: 12,
          fontWeight: "bold",
        },
        { key: "cap-section-profiles" },
      );

      overlay.add(
        "text",
        {
          x: CAP_POS["cap-system"].x,
          y: CAP_POS["cap-system"].y + 6,
          text: "What survives when the network splits?",
          fill: "#cbd5e1",
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
        },
        { key: "cap-system-subtitle" },
      );

      CAP_PROPERTIES.forEach((property) => {
        const detail = CAP_PROPERTY_PROFILES[property.key];
        const position = CAP_POS[property.nodeId];
        const isActive = capFocus === property.key || capFocus === "summary";

        overlay.add(
          "text",
          {
            x: position.x,
            y: position.y + 14,
            text: property.caption,
            fill: isActive ? detail.color : "#94a3b8",
            fontSize: 10,
            fontWeight: "bold",
            textAnchor: "middle",
          },
          { key: `${property.nodeId}-caption` },
        );
      });

      (Object.keys(CAP_PROFILE_NODE_IDS) as CapProfileKey[]).forEach((key) => {
        const profile = CAP_PROFILES[key];
        const nodeId = CAP_PROFILE_NODE_IDS[key];
        const position = CAP_POS[nodeId];
        const emphasis = key === capProfile || hot(nodeId);

        overlay.add(
          "text",
          {
            x: position.x,
            y: position.y - 4,
            text: `Keeps ${capPairSignature(key)}`,
            fill: emphasis ? "#f8fafc" : "#cbd5e1",
            fontSize: 10,
            fontWeight: "bold",
            textAnchor: "middle",
          },
          { key: `${nodeId}-keeps` },
        );
        overlay.add(
          "text",
          {
            x: position.x,
            y: position.y + 14,
            text: `Gives up ${capDroppedSignature(key)}`,
            fill: emphasis ? profile.color : "#94a3b8",
            fontSize: 9,
            fontWeight: 700,
            textAnchor: "middle",
          },
          { key: `${nodeId}-gives-up` },
        );
        overlay.add(
          "text",
          {
            x: position.x,
            y: position.y + 32,
            text: profile.examples.slice(0, 2).join(" / "),
            fill: emphasis ? "#cbd5e1" : "#64748b",
            fontSize: 8,
            fontWeight: 600,
            textAnchor: "middle",
          },
          { key: `${nodeId}-examples` },
        );
      });

      overlay.add(
        "text",
        {
          x: W / 2,
          y: 520,
          text: "Partition simulation",
          fill: partitionActive ? "#fca5a5" : "#94a3b8",
          fontSize: 11,
          fontWeight: "bold",
          textAnchor: "middle",
        },
        { key: "cap-sim-title" },
      );
      overlay.add(
        "line",
        {
          x1: 523,
          y1: 548,
          x2: 523,
          y2: 650,
          stroke: partitionActive ? "#ef4444" : "rgba(100, 116, 139, 0.32)",
          strokeWidth: partitionActive ? 3 : 2,
        },
        { key: "cap-partition-line" },
      );
      overlay.add(
        "text",
        {
          x: 523,
          y: 542,
          text: "network split",
          fill: partitionActive ? "#fca5a5" : "#64748b",
          fontSize: 9,
          fontWeight: 700,
          textAnchor: "middle",
        },
        { key: "cap-partition-label" },
      );

      overlay.add(
        "text",
        {
          x: CAP_POS["cap-replica-left"].x,
          y: CAP_POS["cap-replica-left"].y + 18,
          text: capReplicaText(capProfile, "left"),
          fill: capProfileData.color,
          fontSize: 9,
          fontWeight: 700,
          textAnchor: "middle",
        },
        { key: "cap-replica-left-note" },
      );
      overlay.add(
        "text",
        {
          x: CAP_POS["cap-replica-right"].x,
          y: CAP_POS["cap-replica-right"].y + 18,
          text: capReplicaText(capProfile, "right"),
          fill: capProfileData.color,
          fontSize: 9,
          fontWeight: 700,
          textAnchor: "middle",
        },
        { key: "cap-replica-right-note" },
      );

      addOverlayBadge(
        builder,
        "cap-banner",
        332,
        650,
        capPartitionBanner(capProfile),
        "rgba(15, 23, 42, 0.82)",
        capProfileData.color,
      );

      if (signals.length > 0) {
        signals.forEach((signal: Signal) => {
          const { id, colorClass, ...params } = signal;
          overlay.add("signal", params as SignalOverlayParams, {
            key: id,
            className: colorClass,
          });
        });
      }
    });

    return builder;
  }, [capFocus, capProfile, capProfileData.color, phase, hotZones, signals]);

  const partitionScene = useMemo(() => {
    const builder = viz().view(W, H);
    const hot: HotCheck = (id) => hotZones.includes(id);
    const sourceActive =
      partitionFocus === "source" || partitionFocus === "summary";
    const metricsActive =
      partitionFocus === "metrics" || partitionFocus === "summary";
    const routingActive =
      partitionFocus === "routing" || partitionFocus === "summary";
    const groupsActive =
      partitionFocus === "groups" || partitionFocus === "summary";

    drawPartitionCard(builder, "partition-source", "Large Customer Table", {
      width: 236,
      height: 166,
      radius: 22,
      fill: sourceActive ? "rgba(15, 23, 42, 0.98)" : "rgba(11, 18, 32, 0.88)",
      stroke: sourceActive ? "#60a5fa" : "#334155",
      labelDy: -58,
      fontSize: 15,
    });

    drawPartitionCard(builder, "partition-hotspot", "Single-Server Squeeze", {
      width: 236,
      height: 92,
      radius: 20,
      fill:
        partitionStrategy === "none"
          ? "rgba(69, 10, 10, 0.5)"
          : "rgba(15, 23, 42, 0.82)",
      stroke:
        partitionStrategy === "none" || hot("partition-hotspot")
          ? "#ef4444"
          : "#334155",
      labelDy: -20,
      fontSize: 13,
    });

    drawPartitionCard(
      builder,
      "partition-key",
      partitionStrategy === "horizontal"
        ? "Shard Key"
        : partitionStrategy === "vertical"
          ? "Access Pattern Split"
          : "Choose A Split",
      {
        width: 224,
        height: 78,
        radius: 18,
        fill: routingActive
          ? "rgba(15, 23, 42, 0.98)"
          : "rgba(11, 18, 32, 0.88)",
        stroke: routingActive ? partitionAccent : "#334155",
        labelDy: -18,
        fontSize: 13,
      },
    );

    if (partitionStrategy !== "none") {
      builder
        .edge("partition-source", "partition-key", "edge-partition-key")
        .stroke(partitionAccent, 1.4)
        .arrow(true)
        .dashed();
    }

    partitionCards.forEach((card) => {
      drawPartitionCard(builder, card.nodeId, card.title, {
        width: partitionStrategy === "vertical" ? 246 : 188,
        height: partitionStrategy === "vertical" ? 118 : 108,
        radius: 20,
        fill:
          groupsActive || hot(card.nodeId)
            ? "rgba(15, 23, 42, 0.98)"
            : "rgba(11, 18, 32, 0.88)",
        stroke: groupsActive || hot(card.nodeId) ? partitionAccent : "#334155",
        labelDy: partitionStrategy === "vertical" ? -34 : -28,
        fontSize: 12,
      });

      builder
        .edge("partition-source", card.nodeId, `edge-${card.nodeId}`)
        .stroke(
          groupsActive ? partitionAccent : "rgba(100, 116, 139, 0.18)",
          1.2,
        )
        .arrow(true)
        .dashed();

      if (partitionStrategy !== "none") {
        builder
          .edge("partition-key", card.nodeId, `edge-key-${card.nodeId}`)
          .stroke(
            routingActive ? partitionAccent : "rgba(100, 116, 139, 0.16)",
            1.1,
          )
          .arrow(true);
      }
    });

    [
      {
        id: "partition-metric-throughput" as const,
        label: "Throughput",
        value: `${partitionThroughput}`,
        color: throughputColor(partitionThroughput),
      },
      {
        id: "partition-metric-join" as const,
        label: "Join Cost",
        value: `${partitionJoinCost}`,
        color: complexityColor(partitionJoinCost),
      },
      {
        id: "partition-metric-routing" as const,
        label: "Routing",
        value: `${partitionRoutingCost}`,
        color: complexityColor(partitionRoutingCost),
      },
      {
        id: "partition-metric-isolation" as const,
        label: "Fault Isolation",
        value: `${partitionIsolation}`,
        color: throughputColor(partitionIsolation),
      },
    ].forEach((metric) => {
      drawPartitionCard(builder, metric.id, metric.label, {
        width: 182,
        height: 62,
        radius: 16,
        fill: metricsActive
          ? "rgba(15, 23, 42, 0.98)"
          : "rgba(11, 18, 32, 0.88)",
        stroke: metricsActive ? metric.color : "#334155",
        labelDy: -10,
        fontSize: 11,
      });
    });

    builder.overlay((overlay) => {
      overlay.add(
        "text",
        {
          x: 52,
          y: 70,
          text: "Baseline database",
          fill: "#93c5fd",
          fontSize: 12,
          fontWeight: "bold",
        },
        { key: "partition-section-source" },
      );
      overlay.add(
        "text",
        {
          x: 358,
          y: 70,
          text: "Routing rule",
          fill: partitionAccent,
          fontSize: 12,
          fontWeight: "bold",
        },
        { key: "partition-section-key" },
      );
      overlay.add(
        "text",
        {
          x: 716,
          y: 70,
          text:
            partitionStrategy === "vertical"
              ? "Column partitions"
              : partitionStrategy === "horizontal"
                ? "Row partitions"
                : "Potential partitions",
          fill: partitionAccent,
          fontSize: 12,
          fontWeight: "bold",
        },
        { key: "partition-section-groups" },
      );

      PARTITION_SOURCE_LINES.forEach((line, index) => {
        overlay.add(
          "text",
          {
            x: PARTITION_POS["partition-source"].x,
            y: PARTITION_POS["partition-source"].y - 6 + index * 18,
            text: line,
            fill: index === 0 ? "#93c5fd" : "#dbeafe",
            fontSize: index === 0 ? 9 : 8,
            fontWeight: index === 0 ? "bold" : 600,
            textAnchor: "middle",
          },
          { key: `partition-source-line-${index}` },
        );
      });

      [
        "One box owns all reads and writes",
        "Throughput ceiling stays local",
        "Maintenance and failures hit one tier",
      ].forEach((line, index) => {
        overlay.add(
          "text",
          {
            x: PARTITION_POS["partition-hotspot"].x,
            y: PARTITION_POS["partition-hotspot"].y - 2 + index * 18,
            text: line,
            fill: "#fecaca",
            fontSize: 9,
            fontWeight: 700,
            textAnchor: "middle",
          },
          { key: `partition-hotspot-line-${index}` },
        );
      });

      overlay.add(
        "text",
        {
          x: PARTITION_POS["partition-key"].x,
          y: PARTITION_POS["partition-key"].y + 2,
          text:
            partitionProfile?.keyLabel ??
            "Press Horizontal or Vertical to begin the split",
          fill: partitionAccent,
          fontSize: 9,
          fontWeight: "bold",
          textAnchor: "middle",
        },
        { key: "partition-key-line" },
      );
      overlay.add(
        "text",
        {
          x: PARTITION_POS["partition-key"].x,
          y: PARTITION_POS["partition-key"].y + 20,
          text:
            partitionProfile?.keyNote ??
            "The first press chooses whether to split rows or split columns.",
          fill: "#cbd5e1",
          fontSize: 8,
          fontWeight: 600,
          textAnchor: "middle",
        },
        { key: "partition-key-note" },
      );

      if (partitionCards.length === 0) {
        overlay.add(
          "text",
          {
            x: 818,
            y: 278,
            text: "No partitions yet",
            fill: "#64748b",
            fontSize: 18,
            fontWeight: "bold",
            textAnchor: "middle",
          },
          { key: "partition-empty-title" },
        );
        overlay.add(
          "text",
          {
            x: 818,
            y: 302,
            text: "Press one of the two strategy buttons to split the database.",
            fill: "#94a3b8",
            fontSize: 10,
            fontWeight: 600,
            textAnchor: "middle",
          },
          { key: "partition-empty-subtitle" },
        );
      }

      partitionCards.forEach((card) => {
        const position = PARTITION_POS[card.nodeId];
        overlay.add(
          "text",
          {
            x: position.x,
            y: position.y + (partitionStrategy === "vertical" ? -10 : -4),
            text: card.subtitle,
            fill: partitionAccent,
            fontSize: 8,
            fontWeight: 700,
            textAnchor: "middle",
          },
          { key: `${card.nodeId}-subtitle` },
        );

        card.lines.forEach((line, index) => {
          overlay.add(
            "text",
            {
              x: position.x,
              y:
                position.y +
                (partitionStrategy === "vertical" ? 10 : 16) +
                index * 15,
              text: line,
              fill: "#dbeafe",
              fontSize: 8,
              fontWeight: 600,
              textAnchor: "middle",
            },
            { key: `${card.nodeId}-line-${index}` },
          );
        });
      });

      [
        {
          id: "partition-metric-throughput",
          value: `${partitionThroughput}`,
          color: throughputColor(partitionThroughput),
        },
        {
          id: "partition-metric-join",
          value: `${partitionJoinCost}`,
          color: complexityColor(partitionJoinCost),
        },
        {
          id: "partition-metric-routing",
          value: `${partitionRoutingCost}`,
          color: complexityColor(partitionRoutingCost),
        },
        {
          id: "partition-metric-isolation",
          value: `${partitionIsolation}`,
          color: throughputColor(partitionIsolation),
        },
      ].forEach((metric) => {
        const position = PARTITION_POS[metric.id as PartitionPositionKey];
        overlay.add(
          "text",
          {
            x: position.x,
            y: position.y + 14,
            text: metric.value,
            fill: metric.color,
            fontSize: 18,
            fontWeight: "bold",
            textAnchor: "middle",
          },
          { key: `${metric.id}-value` },
        );
      });

      addOverlayBadge(
        builder,
        "partition-banner",
        288,
        548,
        partitionBanner(partitionStrategy, partitionLevel),
        "rgba(15, 23, 42, 0.82)",
        partitionAccent,
      );

      if (partitionProfile) {
        addOverlayBadge(
          builder,
          "partition-stage",
          730,
          548,
          `${partitionProfile.label} live`,
          "rgba(56, 189, 248, 0.12)",
          partitionAccent,
        );
      }

      if (signals.length > 0) {
        signals.forEach((signal: Signal) => {
          const { id, colorClass, ...params } = signal;
          overlay.add("signal", params as SignalOverlayParams, {
            key: id,
            className: colorClass,
          });
        });
      }
    });

    return builder;
  }, [
    hotZones,
    partitionAccent,
    partitionCards,
    partitionFocus,
    partitionJoinCost,
    partitionIsolation,
    partitionLevel,
    partitionProfile,
    partitionRoutingCost,
    partitionStrategy,
    partitionThroughput,
    signals,
  ]);

  const scene =
    lessonMode === "cap"
      ? capScene
      : lessonMode === "partitioning"
        ? partitionScene
        : selectionScene;

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const currentStageEl = containerRef.current.parentElement;
    const currentShellScrollEl = containerRef.current.closest(
      ".visualization-container",
    );
    const saved = pzRef.current?.getState() ?? viewportRef.current;
    stageScrollRef.current = {
      top: currentStageEl?.scrollTop ?? stageScrollRef.current.top,
      left: currentStageEl?.scrollLeft ?? stageScrollRef.current.left,
    };
    shellScrollRef.current = {
      top: currentShellScrollEl?.scrollTop ?? shellScrollRef.current.top,
      left: currentShellScrollEl?.scrollLeft ?? shellScrollRef.current.left,
    };

    if (!builderRef.current) {
      builderRef.current = scene;
      pzRef.current =
        scene.mount(containerRef.current, {
          autoplay: true,
          panZoom: true,
          initialZoom: saved?.zoom ?? 1,
          initialPan: saved?.pan ?? { x: 0, y: 0 },
        }) ?? null;
    } else {
      scene.commit(containerRef.current);
      if (saved) {
        pzRef.current?.setZoom(saved.zoom);
        pzRef.current?.setPan(saved.pan);
      }
    }

    const restoreScroll = () => {
      const stageEl = containerRef.current?.parentElement;
      const shellScrollEl = containerRef.current?.closest(
        ".visualization-container",
      );

      if (stageEl) {
        stageEl.scrollTop = stageScrollRef.current.top;
        stageEl.scrollLeft = stageScrollRef.current.left;
      }

      if (shellScrollEl) {
        shellScrollEl.scrollTop = shellScrollRef.current.top;
        shellScrollEl.scrollLeft = shellScrollRef.current.left;
      }
    };

    requestAnimationFrame(() => {
      restoreScroll();
      requestAnimationFrame(restoreScroll);
    });

    let unsub: (() => void) | undefined;
    if (!viewportRef.current) {
      unsub = pzRef.current?.onChange((s) => {
        viewportRef.current = s;
      });
    }
    return () => {
      unsub?.();
    };
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  const selectionPills = [
    {
      key: "relational",
      label: "Relational",
      color: "#93c5fd",
      borderColor: "#60a5fa",
    },
    {
      key: "document",
      label: "Document",
      color: "#86efac",
      borderColor: "#34d399",
    },
    {
      key: "key-value",
      label: "Key-Value",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "wide-column",
      label: "Wide Column",
      color: "#d8b4fe",
      borderColor: "#a78bfa",
    },
    {
      key: "graph",
      label: "Graph",
      color: "#f9a8d4",
      borderColor: "#f472b6",
    },
    {
      key: "acid-vs-base",
      label: "ACID vs BASE",
      color: "#fdba74",
      borderColor: "#f59e0b",
    },
    {
      key: "polyglot-persistence",
      label: "Polyglot",
      color: "#86efac",
      borderColor: "#22c55e",
    },
    {
      key: "selection-principles",
      label: "Selection Rules",
      color: "#93c5fd",
      borderColor: "#38bdf8",
    },
  ];

  const capPills = [
    {
      key: "cap-theorem",
      label: "CAP Theorem",
      color: "#f9a8d4",
      borderColor: "#f472b6",
    },
    {
      key: "consistency-cap",
      label: "C",
      color: "#bfdbfe",
      borderColor: "#60a5fa",
    },
    {
      key: "availability-cap",
      label: "A",
      color: "#bbf7d0",
      borderColor: "#34d399",
    },
    {
      key: "partition-tolerance",
      label: "P",
      color: "#fdba74",
      borderColor: "#f59e0b",
    },
    {
      key: "ca-systems",
      label: "CA",
      color: "#bfdbfe",
      borderColor: "#60a5fa",
    },
    {
      key: "cp-systems",
      label: "CP",
      color: "#f9a8d4",
      borderColor: "#f472b6",
    },
    {
      key: "ap-systems",
      label: "AP",
      color: "#bbf7d0",
      borderColor: "#34d399",
    },
  ];

  const partitionPills = [
    {
      key: "partitioning-basics",
      label: "Partitioning",
      color: "#bae6fd",
      borderColor: "#38bdf8",
    },
    {
      key: "horizontal-partitioning",
      label: "Horizontal",
      color: "#bfdbfe",
      borderColor: "#60a5fa",
    },
    {
      key: "vertical-partitioning",
      label: "Vertical",
      color: "#ddd6fe",
      borderColor: "#a78bfa",
    },
    {
      key: "shard-keys",
      label: "Shard Keys",
      color: "#fdba74",
      borderColor: "#f59e0b",
    },
    {
      key: "functional-partitioning",
      label: "Functional",
      color: "#bbf7d0",
      borderColor: "#34d399",
    },
  ];

  return (
    <div
      className={`database-selection-root database-selection-mode--${lessonMode} database-selection-phase--${phase}`}
    >
      <PluginLayout
        toolbar={
          <ConceptPills
            pills={
              lessonMode === "cap"
                ? capPills
                : lessonMode === "partitioning"
                  ? partitionPills
                  : selectionPills
            }
            onOpen={openConcept}
          />
        }
        canvas={
          <div className="database-selection-stage">
            {lessonMode === "cap" ? (
              <StageHeader
                title="CAP Theorem Flow"
                subtitle={`${capProfileData.label} systems under failure | understand what C, A, and P actually mean`}
              >
                <StatBadge
                  label="Profile"
                  value={capProfileData.label}
                  color={capProfileData.color}
                />
                <StatBadge
                  label="Keeps"
                  value={capPairSignature(capProfile)}
                  color={capProfileData.color}
                />
                <StatBadge
                  label="Gives Up"
                  value={capDroppedProperty.shortLabel}
                  color={capDroppedProperty.color}
                />
                <StatBadge
                  label="Failure Lens"
                  value="Network split"
                  color="#ef4444"
                />
              </StageHeader>
            ) : lessonMode === "partitioning" ? (
              <StageHeader
                title="Data Partitioning Flow"
                subtitle={
                  partitionMeta
                    ? `${partitionMeta.label} | ${partitionProfile?.label ?? PARTITION_BASELINE.label}`
                    : "Start with one large database, then press Horizontal or Vertical to split it."
                }
              >
                <StatBadge
                  label="Strategy"
                  value={partitionMeta?.shortLabel ?? "Single DB"}
                  color={partitionAccent}
                />
                <StatBadge
                  label="Partitions"
                  value={`${partitionCount}`}
                  color={partitionAccent}
                />
                <StatBadge
                  label="Throughput"
                  value={`${partitionThroughput}`}
                  color={throughputColor(partitionThroughput)}
                />
                <StatBadge
                  label="Join Cost"
                  value={`${partitionJoinCost}`}
                  color={complexityColor(partitionJoinCost)}
                />
              </StageHeader>
            ) : (
              <StageHeader
                title="Database Selection Lab"
                subtitle={`${scenarioProfile.serviceName} | compare the database families against the workload`}
              >
                <StatBadge
                  label="Scenario"
                  value={scenarioProfile.shortLabel}
                  color={scenarioProfile.color}
                />
                <StatBadge
                  label="Selected"
                  value={selectedProfile.shortLabel}
                  color={selectedProfile.color}
                />
                <StatBadge
                  label="Fit"
                  value={`${fitScore}/100`}
                  color={fitTone}
                />
                <StatBadge
                  label="Recommended"
                  value={recommendedProfile.shortLabel}
                  color={recommendedProfile.color}
                />
              </StageHeader>
            )}
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>

            {lessonMode === "cap" ? (
              <>
                <SideCard label="CAP Properties" variant="info">
                  <div className="database-selection-cap-grid">
                    {CAP_PROPERTIES.map((property) => {
                      const detail = CAP_PROPERTY_PROFILES[property.key];
                      const isHighlighted =
                        capFocus === property.key ||
                        capFocus === "summary" ||
                        capProfileData.keeps.includes(property.key);

                      return (
                        <div
                          key={property.key}
                          className="database-selection-cap-card"
                          style={
                            isHighlighted
                              ? {
                                  borderColor: detail.color,
                                  boxShadow: `0 0 0 1px ${detail.color} inset`,
                                }
                              : undefined
                          }
                        >
                          <div className="database-selection-cap-card__head">
                            <strong style={{ color: detail.color }}>
                              {detail.shortLabel}
                            </strong>
                            <span>{detail.label}</span>
                          </div>
                          <p>{detail.promise}</p>
                        </div>
                      );
                    })}
                  </div>
                </SideCard>

                <SideCard
                  label={`${capProfileData.label} Profile`}
                  variant="info"
                >
                  <p className="database-selection-notice">
                    {capProfileData.summary}
                  </p>
                  <div className="database-selection-detail-grid">
                    <div className="database-selection-detail-item">
                      <span>Keeps</span>
                      <strong>{capPairSignature(capProfile)}</strong>
                    </div>
                    <div className="database-selection-detail-item">
                      <span>Gives up</span>
                      <strong>{capDroppedProperty.label}</strong>
                    </div>
                    <div className="database-selection-detail-item">
                      <span>Normal behavior</span>
                      <strong>{capProfileData.normalBehavior}</strong>
                    </div>
                    <div className="database-selection-detail-item">
                      <span>During partition</span>
                      <strong>{capProfileData.partitionBehavior}</strong>
                    </div>
                  </div>
                </SideCard>

                <SideCard label="Typical Systems" variant="info">
                  <ul className="database-selection-list">
                    {capProfileData.examples.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p
                    className="database-selection-notice"
                    style={{ marginTop: 12 }}
                  >
                    {capProfileData.familyFit}
                  </p>
                </SideCard>

                <SideCard label="Why pick it?" variant="info">
                  <div className="database-selection-detail-grid">
                    <div className="database-selection-detail-item">
                      <span>Choose when</span>
                      <strong>{capProfileData.chooseWhen}</strong>
                    </div>
                    <div className="database-selection-detail-item">
                      <span>Trade-off</span>
                      <strong>{capProfileData.risk}</strong>
                    </div>
                  </div>
                </SideCard>
              </>
            ) : lessonMode === "partitioning" ? (
              <>
                <SideCard label="Current Structure" variant="info">
                  <div className="database-selection-family-head">
                    <strong style={{ color: partitionAccent }}>
                      {partitionMeta?.label ?? "Single database"}
                    </strong>
                    <span>
                      {partitionProfile?.label ?? PARTITION_BASELINE.label}
                    </span>
                  </div>
                  <p style={{ marginTop: 0 }}>
                    {partitionProfile?.changeSummary ??
                      PARTITION_BASELINE.changeSummary}
                  </p>
                  <div className="database-selection-detail-grid">
                    <div className="database-selection-detail-item">
                      <span>Routing rule</span>
                      <strong>
                        {partitionProfile?.keyLabel ??
                          PARTITION_BASELINE.keyLabel}
                      </strong>
                    </div>
                    <div className="database-selection-detail-item">
                      <span>Partitions</span>
                      <strong>{partitionCount}</strong>
                    </div>
                  </div>
                </SideCard>

                <SideCard label="Metric Shift" variant="info">
                  <div className="database-selection-metric-grid">
                    <div className="database-selection-metric-row">
                      <span>Throughput</span>
                      <strong
                        style={{ color: throughputColor(partitionThroughput) }}
                      >
                        {partitionThroughput}
                      </strong>
                    </div>
                    <div className="database-selection-metric-row">
                      <span>Join complexity</span>
                      <strong
                        style={{ color: complexityColor(partitionJoinCost) }}
                      >
                        {partitionJoinCost}
                      </strong>
                    </div>
                    <div className="database-selection-metric-row">
                      <span>Routing complexity</span>
                      <strong
                        style={{ color: complexityColor(partitionRoutingCost) }}
                      >
                        {partitionRoutingCost}
                      </strong>
                    </div>
                    <div className="database-selection-metric-row">
                      <span>Fault isolation</span>
                      <strong
                        style={{ color: throughputColor(partitionIsolation) }}
                      >
                        {partitionIsolation}
                      </strong>
                    </div>
                  </div>
                </SideCard>

                <SideCard label="What Changes" variant="info">
                  <p className="database-selection-notice">
                    {partitionProfile?.benefit ?? PARTITION_BASELINE.benefit}
                  </p>
                  <div
                    className="database-selection-detail-grid"
                    style={{ marginTop: 12 }}
                  >
                    <div className="database-selection-detail-item">
                      <span>Why it helps</span>
                      <strong>
                        {partitionProfile?.benefit ??
                          PARTITION_BASELINE.benefit}
                      </strong>
                    </div>
                    <div className="database-selection-detail-item">
                      <span>What gets harder</span>
                      <strong>
                        {partitionProfile?.tradeoff ??
                          PARTITION_BASELINE.tradeoff}
                      </strong>
                    </div>
                    <div className="database-selection-detail-item">
                      <span>Routing note</span>
                      <strong>
                        {partitionProfile?.keyNote ??
                          PARTITION_BASELINE.keyNote}
                      </strong>
                    </div>
                  </div>
                </SideCard>

                <SideCard label="Patterns To Remember" variant="info">
                  <ul className="database-selection-list">
                    <li>Horizontal partitioning spreads rows across shards.</li>
                    <li>
                      Vertical partitioning splits columns by access pattern.
                    </li>
                    <li>
                      Every extra split improves scale but increases
                      coordination cost.
                    </li>
                    <li>
                      Functional partitioning often belongs at the service
                      boundary.
                    </li>
                    <li>A bad shard key can erase the benefits of sharding.</li>
                  </ul>
                </SideCard>
              </>
            ) : (
              <>
                <SideCard label="Service Workload" variant="info">
                  <div className="database-selection-family-head">
                    <strong style={{ color: scenarioProfile.color }}>
                      {scenarioProfile.serviceName}
                    </strong>
                    <span>{scenarioProfile.shortLabel}</span>
                  </div>
                  <p style={{ marginTop: 0 }}>{scenarioProfile.description}</p>
                  <ul className="database-selection-list">
                    {scenarioProfile.requirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </SideCard>

                <SideCard label="Selection Snapshot" variant="info">
                  <div className="database-selection-metric-grid">
                    <div className="database-selection-metric-row">
                      <span>Overall fit</span>
                      <strong style={{ color: fitTone }}>{fitScore}/100</strong>
                    </div>
                    <div className="database-selection-metric-row">
                      <span>Query fit</span>
                      <strong style={{ color: fitColor(queryFit) }}>
                        {queryFit}/100
                      </strong>
                    </div>
                    <div className="database-selection-metric-row">
                      <span>Consistency fit</span>
                      <strong style={{ color: fitColor(consistencyFit) }}>
                        {consistencyFit}/100
                      </strong>
                    </div>
                    <div className="database-selection-metric-row">
                      <span>Scale fit</span>
                      <strong style={{ color: fitColor(scaleFit) }}>
                        {scaleFit}/100
                      </strong>
                    </div>
                    <div className="database-selection-metric-row">
                      <span>Current recommendation</span>
                      <strong style={{ color: recommendedProfile.color }}>
                        {recommendedProfile.label}
                      </strong>
                    </div>
                  </div>
                </SideCard>

                <SideCard label="Selected Family" variant="info">
                  <div className="database-selection-family-head">
                    <strong style={{ color: selectedProfile.color }}>
                      {selectedProfile.label}
                    </strong>
                    <span>{selectedProfile.family}</span>
                  </div>
                  <p style={{ marginTop: 0 }}>{selectedProfile.overview}</p>
                  <div className="database-selection-detail-grid">
                    <div className="database-selection-detail-item">
                      <span>Data model</span>
                      <strong>{selectedProfile.dataModel}</strong>
                    </div>
                    <div className="database-selection-detail-item">
                      <span>Consistency</span>
                      <strong>{selectedProfile.consistencyModel}</strong>
                    </div>
                    <div className="database-selection-detail-item">
                      <span>Query sweet spot</span>
                      <strong>{selectedProfile.queryModel}</strong>
                    </div>
                    <div className="database-selection-detail-item">
                      <span>Scale model</span>
                      <strong>{selectedProfile.scaleModel}</strong>
                    </div>
                  </div>
                </SideCard>

                <SideCard label="Decision Notes" variant="info">
                  <p className="database-selection-notice">
                    {isBestFit
                      ? `${selectedProfile.label} is the best fit for this workload because ${scenarioProfile.summaryNeed}.`
                      : `${selectedProfile.label} is currently a ${recommendationLevel} for this workload. ${recommendedProfile.label} is the stronger default because ${scenarioProfile.summaryNeed}.`}
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <span
                      style={{
                        color: "#86efac",
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      Strengths
                    </span>
                    <ul className="database-selection-list">
                      {selectedProfile.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <span
                      style={{
                        color: "#fca5a5",
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      Watch-outs
                    </span>
                    <ul className="database-selection-list">
                      {selectedProfile.tradeoffs.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </SideCard>

                <SideCard label="Best Practice" variant="info">
                  <ul className="database-selection-list">
                    <li>Use the right tool for the right job.</li>
                    <li>
                      Embrace polyglot persistence when service workloads
                      differ.
                    </li>
                    <li>
                      Match the database to the data type and access pattern.
                    </li>
                    <li>
                      Consider consistency versus availability trade-offs
                      explicitly.
                    </li>
                    <li>
                      Align the choice with transactional boundaries and team
                      skill.
                    </li>
                  </ul>
                </SideCard>
              </>
            )}

            <SideCard label="Walkthrough">
              <ol className="database-selection-walkthrough">
                {walkthroughSteps.map((step, index) => (
                  <li key={step.key}>
                    <span className="database-selection-walkthrough__index">
                      {index + 1}
                    </span>
                    <span>{step.label}</span>
                  </li>
                ))}
              </ol>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
}

export default DatabaseSelectionVisualization;
