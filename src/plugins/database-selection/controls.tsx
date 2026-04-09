import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  CAP_PROFILES,
  CAP_PROFILE_KEYS,
  PARTITION_STAGE_PROFILES,
  PARTITION_STRATEGIES,
  PARTITION_STRATEGY_META,
  SCENARIO_KEYS,
  SCENARIO_PROFILES,
  pressPartitionStrategy,
  VARIANT_KEYS,
  setCapProfile,
  setLessonMode,
  setVariant,
  setScenario,
  VARIANT_PROFILES,
  type DatabaseSelectionState,
  type ScenarioKey,
  type VariantKey,
} from "./databaseSelectionSlice";

function capPairText(key: keyof typeof CAP_PROFILES): string {
  const profile = CAP_PROFILES[key];
  const keeps = profile.keeps
    .map((property) => property[0].toUpperCase())
    .join(" + ");
  const givesUp = profile.givesUp[0].toUpperCase();

  return `Keeps ${keeps}, gives up ${givesUp}`;
}

const DatabaseSelectionControls: React.FC = () => {
  const dispatch = useDispatch();
  const {
    capProfile,
    lessonMode,
    partitionLevel,
    partitionStrategy,
    scenario,
    variant,
    recommendedVariant,
  } = useSelector(
    (state: RootState) => state.databaseSelection,
  ) as DatabaseSelectionState;

  const handleLessonModeSwitch = (
    nextMode: DatabaseSelectionState["lessonMode"],
  ) => {
    if (nextMode === lessonMode) return;
    dispatch(setLessonMode(nextMode));
    dispatch(resetSimulation());
  };

  const handleCapProfileSwitch = (
    key: DatabaseSelectionState["capProfile"],
  ) => {
    if (key === capProfile) return;
    dispatch(setCapProfile(key));
    dispatch(resetSimulation());
  };

  const handlePartitionPress = (
    key: Exclude<DatabaseSelectionState["partitionStrategy"], "none">,
  ) => {
    dispatch(pressPartitionStrategy(key));
    dispatch(resetSimulation());
  };

  const handleVariantSwitch = (key: VariantKey) => {
    if (key === variant) return;
    dispatch(setVariant(key));
    dispatch(resetSimulation());
  };

  const handleScenarioSwitch = (key: ScenarioKey) => {
    if (key === scenario) return;
    dispatch(setScenario(key));
    dispatch(resetSimulation());
  };

  const partitionButtonSubtext = (
    key: Exclude<DatabaseSelectionState["partitionStrategy"], "none">,
  ) => {
    const profiles = PARTITION_STAGE_PROFILES[key];
    const activeProfile =
      partitionStrategy === key && partitionLevel > 0
        ? profiles.find((profile) => profile.level === partitionLevel)
        : null;
    const nextProfile =
      partitionStrategy === key
        ? profiles.find((profile) => profile.level === partitionLevel + 1)
        : profiles[0];

    if (!activeProfile) {
      return `Press to start with ${profiles[0].label}.`;
    }

    if (nextProfile) {
      return `${activeProfile.label} active. Next press: ${nextProfile.label}.`;
    }

    return `${activeProfile.label} active. Max depth reached.`;
  };

  return (
    <div className="database-selection-controls">
      <div className="database-selection-controls__group">
        <span className="database-selection-controls__legend">Lesson</span>
        <div className="database-selection-controls__grid database-selection-controls__grid--modes">
          {[
            {
              key: "selection" as const,
              label: "Selection Flow",
              hint: "Families + workloads",
              color: "#60a5fa",
              description:
                "Match database families to microservice workloads and decision lenses.",
            },
            {
              key: "cap" as const,
              label: "CAP Flow",
              hint: "C, A, P and trade-offs",
              color: "#f472b6",
              description:
                "See what consistency, availability, partition tolerance, and CA/CP/AP mean in practice.",
            },
            {
              key: "partitioning" as const,
              label: "Partitioning Flow",
              hint: "Rows vs columns",
              color: "#38bdf8",
              description:
                "Start with one large database and split it horizontally or vertically to see how scale and complexity change.",
            },
          ].map((option) => {
            const isActive = option.key === lessonMode;
            return (
              <button
                key={option.key}
                type="button"
                className={`database-selection-controls__btn${isActive ? " database-selection-controls__btn--active" : ""}`}
                style={
                  isActive
                    ? {
                        borderColor: option.color,
                        boxShadow: `0 0 0 1px ${option.color} inset`,
                      }
                    : undefined
                }
                title={option.description}
                onClick={() => handleLessonModeSwitch(option.key)}
              >
                <span className="database-selection-controls__btn-head">
                  <span
                    className="database-selection-controls__btn-label"
                    style={isActive ? { color: option.color } : undefined}
                  >
                    {option.label}
                  </span>
                  <span className="database-selection-controls__hint">
                    {option.hint}
                  </span>
                </span>
                <span className="database-selection-controls__btn-sub">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {lessonMode === "selection" && (
        <>
          <div className="database-selection-controls__group">
            <span className="database-selection-controls__legend">
              Microservice workload
            </span>
            <div className="database-selection-controls__grid database-selection-controls__grid--scenarios">
              {SCENARIO_KEYS.map((key) => {
                const profile = SCENARIO_PROFILES[key];
                const isActive = key === scenario;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`database-selection-controls__btn${isActive ? " database-selection-controls__btn--active" : ""}`}
                    style={
                      isActive
                        ? {
                            borderColor: profile.color,
                            boxShadow: `0 0 0 1px ${profile.color} inset`,
                          }
                        : undefined
                    }
                    title={profile.description}
                    onClick={() => handleScenarioSwitch(key)}
                  >
                    <span className="database-selection-controls__btn-head">
                      <span
                        className="database-selection-controls__btn-label"
                        style={isActive ? { color: profile.color } : undefined}
                      >
                        {profile.shortLabel}
                      </span>
                      <span className="database-selection-controls__hint database-selection-controls__hint--scenario">
                        {profile.serviceName}
                      </span>
                    </span>
                    <span className="database-selection-controls__btn-sub">
                      {profile.requirements[1]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="database-selection-controls__group">
            <span className="database-selection-controls__legend">
              Store family
            </span>
            <div className="database-selection-controls__grid">
              {VARIANT_KEYS.map((key) => {
                const profile = VARIANT_PROFILES[key];
                const isActive = key === variant;
                const isRecommended = key === recommendedVariant;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`database-selection-controls__btn${isActive ? " database-selection-controls__btn--active" : ""}`}
                    style={
                      isActive
                        ? {
                            borderColor: profile.color,
                            boxShadow: `0 0 0 1px ${profile.color} inset`,
                          }
                        : isRecommended
                          ? { borderColor: profile.color }
                          : undefined
                    }
                    title={profile.overview}
                    onClick={() => handleVariantSwitch(key)}
                  >
                    <span className="database-selection-controls__btn-head">
                      <span
                        className="database-selection-controls__btn-label"
                        style={isActive ? { color: profile.color } : undefined}
                      >
                        {profile.shortLabel}
                      </span>
                      <span
                        className={`database-selection-controls__hint${isRecommended ? " database-selection-controls__hint--recommended" : ""}`}
                      >
                        {isRecommended ? "best fit" : profile.family}
                      </span>
                    </span>
                    <span className="database-selection-controls__btn-sub">
                      {profile.accentText}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {lessonMode === "cap" && (
        <div className="database-selection-controls__group">
          <span className="database-selection-controls__legend">
            CAP posture
          </span>
          <div className="database-selection-controls__grid database-selection-controls__grid--cap">
            {CAP_PROFILE_KEYS.map((key) => {
              const profile = CAP_PROFILES[key];
              const isActive = key === capProfile;
              return (
                <button
                  key={key}
                  type="button"
                  className={`database-selection-controls__btn${isActive ? " database-selection-controls__btn--active" : ""}`}
                  style={
                    isActive
                      ? {
                          borderColor: profile.color,
                          boxShadow: `0 0 0 1px ${profile.color} inset`,
                        }
                      : undefined
                  }
                  title={profile.summary}
                  onClick={() => handleCapProfileSwitch(key)}
                >
                  <span className="database-selection-controls__btn-head">
                    <span
                      className="database-selection-controls__btn-label"
                      style={isActive ? { color: profile.color } : undefined}
                    >
                      {profile.label}
                    </span>
                    <span className="database-selection-controls__hint">
                      {profile.keeps
                        .map((property) => property[0].toUpperCase())
                        .join(" + ")}
                    </span>
                  </span>
                  <span className="database-selection-controls__btn-sub">
                    {capPairText(key)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {lessonMode === "partitioning" && (
        <div className="database-selection-controls__group">
          <span className="database-selection-controls__legend">
            Partitioning strategy
          </span>
          <div className="database-selection-controls__grid database-selection-controls__grid--modes">
            {PARTITION_STRATEGIES.map((key) => {
              const meta = PARTITION_STRATEGY_META[key];
              const isActive = key === partitionStrategy;
              return (
                <button
                  key={key}
                  type="button"
                  className={`database-selection-controls__btn${isActive ? " database-selection-controls__btn--active" : ""}`}
                  style={
                    isActive
                      ? {
                          borderColor: meta.color,
                          boxShadow: `0 0 0 1px ${meta.color} inset`,
                        }
                      : undefined
                  }
                  title={meta.description}
                  onClick={() => handlePartitionPress(key)}
                >
                  <span className="database-selection-controls__btn-head">
                    <span
                      className="database-selection-controls__btn-label"
                      style={isActive ? { color: meta.color } : undefined}
                    >
                      {meta.label}
                    </span>
                    <span className="database-selection-controls__hint">
                      {isActive && partitionLevel > 0
                        ? `${partitionLevel} / ${PARTITION_STAGE_PROFILES[key].at(-1)?.level ?? 0}`
                        : meta.shortLabel}
                    </span>
                  </span>
                  <span className="database-selection-controls__btn-sub">
                    {partitionButtonSubtext(key)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseSelectionControls;
