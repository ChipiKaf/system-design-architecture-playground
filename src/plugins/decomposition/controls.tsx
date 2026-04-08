import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setVariant,
  VARIANT_PROFILES,
  type DecompositionState,
  type VariantKey,
} from "./decompositionSlice";

const variantKeys = Object.keys(VARIANT_PROFILES) as VariantKey[];

const DecompositionControls: React.FC = () => {
  const dispatch = useDispatch();
  const { variant } = useSelector(
    (state: RootState) => state.decomposition,
  ) as DecompositionState;

  const handleSwitch = (key: VariantKey) => {
    if (key === variant) return;
    dispatch(setVariant(key));
    dispatch(resetSimulation());
  };

  return (
    <div className="decomposition-controls">
      <span className="decomposition-controls__label">Strategy</span>
      {variantKeys.map((key) => {
        const profile = VARIANT_PROFILES[key];
        const active = key === variant;
        return (
          <button
            key={key}
            className={`decomposition-controls__btn${active ? " decomposition-controls__btn--active" : ""}`}
            style={
              active
                ? {
                    color: profile.color,
                    borderColor: profile.color,
                    background: `${profile.color}18`,
                  }
                : {}
            }
            onClick={() => handleSwitch(key)}
            title={profile.tagline}
          >
            <span className="decomposition-controls__name">
              {profile.label}
            </span>
            <span className="decomposition-controls__tagline">
              {profile.tagline}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default DecompositionControls;
