import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setPattern,
  PATTERN_PROFILES,
  PATTERN_KEYS,
  type CommPatternsState,
  type PatternKey,
} from "./commPatternsSlice";

const CommPatternsControls: React.FC = () => {
  const dispatch = useDispatch();
  const { pattern } = useSelector(
    (state: RootState) => state.commPatterns,
  ) as CommPatternsState;

  const handleSwitch = (key: PatternKey) => {
    if (key === pattern) return;
    dispatch(setPattern(key));
    dispatch(resetSimulation());
  };

  return (
    <div className="comm-patterns-controls">
      <span className="comm-patterns-controls__legend">Pattern</span>
      {PATTERN_KEYS.map((key) => {
        const profile = PATTERN_PROFILES[key];
        return (
          <button
            key={key}
            className={`comm-patterns-controls__btn${key === pattern ? " comm-patterns-controls__btn--active" : ""}`}
            style={
              key === pattern
                ? { color: profile.color, borderColor: profile.color }
                : {}
            }
            onClick={() => handleSwitch(key)}
          >
            {profile.shortLabel}
          </button>
        );
      })}
    </div>
  );
};

export default CommPatternsControls;
