import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setVariant,
  VARIANT_PROFILES,
  type GraphqlApiState,
  type VariantKey,
} from "./graphqlApiSlice";

const variantKeys = Object.keys(VARIANT_PROFILES) as VariantKey[];

const GraphqlApiControls: React.FC = () => {
  const dispatch = useDispatch();
  const { variant } = useSelector(
    (state: RootState) => state.graphqlApi,
  ) as GraphqlApiState;

  const handleSwitch = (key: VariantKey) => {
    if (key === variant) return;
    dispatch(setVariant(key));
    dispatch(resetSimulation());
  };

  return (
    <div className="graphql-api-controls">
      {variantKeys.map((key) => {
        const profile = VARIANT_PROFILES[key];
        return (
          <button
            key={key}
            className={`graphql-api-controls__btn${key === variant ? " graphql-api-controls__btn--active" : ""}`}
            style={
              key === variant
                ? { color: profile.color, borderColor: profile.color }
                : {}
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

export default GraphqlApiControls;
