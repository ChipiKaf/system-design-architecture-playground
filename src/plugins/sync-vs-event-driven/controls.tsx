import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setArchitecture,
  ARCHITECTURE_KEYS,
  ARCHITECTURE_PROFILES,
  type SyncVsEventDrivenState,
  type ArchitectureKey,
} from "./syncVsEventDrivenSlice";

const SyncVsEventDrivenControls: React.FC = () => {
  const dispatch = useDispatch();
  const { architecture } = useSelector(
    (state: RootState) => state.syncVsEventDriven,
  ) as SyncVsEventDrivenState;

  const handleSwitch = (key: ArchitectureKey) => {
    const profile = ARCHITECTURE_PROFILES[key];
    if (profile.availability === "coming-soon" || key === architecture) return;

    dispatch(setArchitecture(key));
    dispatch(resetSimulation());
  };

  return (
    <div className="sync-vs-event-driven-controls">
      <span className="sync-vs-event-driven-controls__legend">
        Scenario
      </span>
      {ARCHITECTURE_KEYS.map((key) => {
        const profile = ARCHITECTURE_PROFILES[key];
        const isDisabled = profile.availability === "coming-soon";
        return (
          <button
            key={key}
            type="button"
            disabled={isDisabled}
            className={`sync-vs-event-driven-controls__btn${key === architecture ? " sync-vs-event-driven-controls__btn--active" : ""}${isDisabled ? " sync-vs-event-driven-controls__btn--disabled" : ""}`}
            style={
              key === architecture
                ? { color: profile.color, borderColor: profile.color }
                : {}
            }
            title={profile.label}
            onClick={() => handleSwitch(key)}
          >
            {profile.shortLabel}
            {isDisabled ? " (soon)" : ""}
          </button>
        );
      })}
    </div>
  );
};

export default SyncVsEventDrivenControls;
