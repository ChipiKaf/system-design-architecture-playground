import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setVariant,
  VARIANT_PROFILES,
  type ServiceEvolutionState,
  type VariantKey,
} from "./serviceEvolutionSlice";

const VARIANT_ORDER: VariantKey[] = [
  "monolith",
  "modular-monolith",
  "microservices",
  "serverless",
];

const ServiceEvolutionControls: React.FC = () => {
  const dispatch = useDispatch();
  const { variant } = useSelector(
    (state: RootState) => state.serviceEvolution,
  ) as ServiceEvolutionState;

  const handleSwitch = (key: VariantKey) => {
    if (key === variant) return;
    dispatch(setVariant(key));
    dispatch(resetSimulation());
  };

  return (
    <div className="service-evolution-controls">
      <span className="service-evolution-controls__label">Architecture</span>
      <div className="service-evolution-controls__spectrum">
        {VARIANT_ORDER.map((key, idx) => {
          const profile = VARIANT_PROFILES[key];
          const isActive = key === variant;
          return (
            <React.Fragment key={key}>
              {idx > 0 && (
                <span className="service-evolution-controls__arrow">→</span>
              )}
              <button
                className={`service-evolution-controls__btn${isActive ? " service-evolution-controls__btn--active" : ""}`}
                style={
                  isActive
                    ? { color: profile.color, borderColor: profile.color }
                    : {}
                }
                onClick={() => handleSwitch(key)}
                title={profile.description}
              >
                <span className="service-evolution-controls__btn-label">
                  {profile.label}
                </span>
                <span
                  className="service-evolution-controls__btn-sub"
                  style={isActive ? { color: profile.color } : {}}
                >
                  {profile.accentText}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ServiceEvolutionControls;
