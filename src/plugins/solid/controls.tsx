import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import { setVariant, type SolidState, type VariantKey } from "./solidSlice";
import { allAdapters } from "./solid-adapters";

const SolidControls: React.FC = () => {
  const dispatch = useDispatch();
  const { variant } = useSelector(
    (state: RootState) => state.solid,
  ) as SolidState;

  const handleSwitch = (key: VariantKey) => {
    if (key === variant) return;
    dispatch(setVariant(key));
    dispatch(resetSimulation());
  };

  return (
    <div className="solid-controls">
      <span className="solid-controls__label">Principle</span>
      {allAdapters.map((adapter) => (
        <button
          key={adapter.id}
          className={`solid-controls__btn${adapter.id === variant ? " solid-controls__btn--active" : ""}`}
          style={
            adapter.id === variant
              ? {
                  color: adapter.colors.stroke,
                  borderColor: adapter.colors.stroke,
                }
              : {}
          }
          onClick={() => handleSwitch(adapter.id)}
          title={adapter.profile.label}
        >
          {adapter.profile.acronym}
        </button>
      ))}
    </div>
  );
};

export default SolidControls;
