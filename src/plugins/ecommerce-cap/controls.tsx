import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { resetSimulation } from "../../store/slices/simulationSlice";
import { type RootState } from "../../store/store";
import { allAdapters } from "./ecommerce-cap-adapters";
import {
  setServiceType,
  type EcommerceCapState,
  type ServiceType,
} from "./ecommerceCapSlice";

const EcommerceCapControls: React.FC = () => {
  const dispatch = useDispatch();
  const { serviceType } = useSelector(
    (state: RootState) => state.ecommerceCap,
  ) as EcommerceCapState;

  const handleSwitch = (next: ServiceType) => {
    if (next === serviceType) return;
    dispatch(setServiceType(next));
    dispatch(resetSimulation());
  };

  return (
    <div className="ecommerce-cap-controls">
      <span className="ecommerce-cap-controls__legend">Service</span>
      {allAdapters.map((adapter) => (
        <button
          key={adapter.id}
          className={`ecommerce-cap-controls__btn${adapter.id === serviceType ? " ecommerce-cap-controls__btn--active" : ""}`}
          style={
            adapter.id === serviceType
              ? {
                  color: adapter.colors.stroke,
                  borderColor: adapter.colors.stroke,
                }
              : undefined
          }
          onClick={() => handleSwitch(adapter.id)}
        >
          <span className="ecommerce-cap-controls__title">
            {adapter.profile.shortLabel}
          </span>
          <span className="ecommerce-cap-controls__mode">
            {adapter.profile.capMode}
          </span>
        </button>
      ))}
    </div>
  );
};

export default EcommerceCapControls;
