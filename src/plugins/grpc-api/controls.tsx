import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setVariant,
  VARIANT_KEYS,
  VARIANT_PROFILES,
  type GrpcApiState,
  type VariantKey,
} from "./grpcApiSlice";

const GrpcApiControls: React.FC = () => {
  const dispatch = useDispatch();
  const { variant } = useSelector(
    (state: RootState) => state.grpcApi,
  ) as GrpcApiState;

  const handleSwitch = (key: VariantKey) => {
    if (key === variant) return;
    dispatch(setVariant(key));
    dispatch(resetSimulation());
  };

  return (
    <div className="grpc-api-controls">
      <span className="grpc-api-controls__legend">RPC Shape</span>
      {VARIANT_KEYS.map((key) => {
        const profile = VARIANT_PROFILES[key];
        return (
          <button
            key={key}
            className={`grpc-api-controls__chip${key === variant ? " is-active" : ""}`}
            style={
              key === variant
                ? { color: profile.color, borderColor: profile.color }
                : undefined
            }
            onClick={() => handleSwitch(key)}
            title={profile.description}
          >
            {profile.label}
          </button>
        );
      })}
    </div>
  );
};

export default GrpcApiControls;
