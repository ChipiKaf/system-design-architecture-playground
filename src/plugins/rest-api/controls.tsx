import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setVariant,
  VARIANT_PROFILES,
  VARIANT_KEYS,
  type RestApiState,
  type VariantKey,
} from "./restApiSlice";

const RestApiControls: React.FC = () => {
  const dispatch = useDispatch();
  const { variant } = useSelector(
    (state: RootState) => state.restApi,
  ) as RestApiState;

  const handleSwitch = (key: VariantKey) => {
    if (key === variant) return;
    dispatch(setVariant(key));
    dispatch(resetSimulation());
  };

  return (
    <div className="rest-api-controls">
      <span className="rest-api-controls__legend">Pattern</span>
      {VARIANT_KEYS.map((key) => {
        const profile = VARIANT_PROFILES[key];
        return (
          <button
            key={key}
            className={`rest-api-controls__chip${key === variant ? " is-active" : ""}`}
            style={
              key === variant
                ? { color: profile.color, borderColor: profile.color }
                : undefined
            }
            onClick={() => handleSwitch(key)}
          >
            {profile.label}
          </button>
        );
      })}
    </div>
  );
};

export default RestApiControls;
