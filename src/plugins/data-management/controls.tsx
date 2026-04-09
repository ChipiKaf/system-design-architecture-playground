import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  PATTERN_GROUPS,
  setVariant,
  VARIANT_PROFILES,
  type DataManagementState,
  type VariantKey,
} from "./dataManagementSlice";

const DataManagementControls: React.FC = () => {
  const dispatch = useDispatch();
  const { variant } = useSelector(
    (state: RootState) => state.dataManagement,
  ) as DataManagementState;

  const handleSwitch = (key: VariantKey) => {
    if (key === variant) return;
    dispatch(setVariant(key));
    dispatch(resetSimulation());
  };

  return (
    <div className="data-management-controls">
      {PATTERN_GROUPS.map((group) => (
        <div key={group.label} className="data-management-controls__group">
          <span className="data-management-controls__legend">
            {group.label}
          </span>
          <div className="data-management-controls__grid">
            {group.keys.map((key: VariantKey) => {
              const profile = VARIANT_PROFILES[key];
              const isActive = key === variant;
              return (
                <button
                  key={key}
                  className={`data-management-controls__btn${isActive ? " data-management-controls__btn--active" : ""}`}
                  style={
                    isActive
                      ? {
                          borderColor: profile.color,
                          boxShadow: `0 0 0 1px ${profile.color} inset`,
                        }
                      : undefined
                  }
                  onClick={() => handleSwitch(key)}
                  title={profile.description}
                >
                  <span className="data-management-controls__btn-head">
                    <span
                      className="data-management-controls__btn-label"
                      style={isActive ? { color: profile.color } : undefined}
                    >
                      {profile.label}
                    </span>
                    <span
                      className={`data-management-controls__status data-management-controls__status--${profile.status}`}
                    >
                      {profile.status === "implemented"
                        ? "Live"
                        : "Placeholder"}
                    </span>
                  </span>
                  <span className="data-management-controls__btn-sub">
                    {profile.accentText}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DataManagementControls;
