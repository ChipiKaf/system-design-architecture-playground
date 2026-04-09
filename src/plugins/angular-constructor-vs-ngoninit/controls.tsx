import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setVariant,
  type AngularConstructorVsNgoninitState,
  type VariantKey,
} from "./angularConstructorVsNgoninitSlice";
import { allAdapters } from "./angular-constructor-vs-ngoninit-adapters";

const AngularConstructorVsNgoninitControls: React.FC = () => {
  const dispatch = useDispatch();
  const { variant } = useSelector(
    (state: RootState) => state.angularConstructorVsNgoninit,
  ) as AngularConstructorVsNgoninitState;

  const handleSwitch = (key: VariantKey) => {
    if (key === variant) return;
    dispatch(setVariant(key));
    dispatch(resetSimulation());
  };

  return (
    <div className="angular-constructor-vs-ngoninit-controls">
      {allAdapters.map((adapter) => (
        <button
          key={adapter.id}
          className={`angular-constructor-vs-ngoninit-controls__btn${adapter.id === variant ? " angular-constructor-vs-ngoninit-controls__btn--active" : ""}`}
          style={adapter.id === variant ? { color: adapter.colors.stroke, borderColor: adapter.colors.stroke } : {}}
          onClick={() => handleSwitch(adapter.id)}
        >
          {adapter.profile.label}
        </button>
      ))}
    </div>
  );
};

export default AngularConstructorVsNgoninitControls;
