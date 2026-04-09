import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setPattern,
  type DistributedTransactionsState,
  type PatternKey,
} from "./distributedTransactionsSlice";
import { allAdapters } from "./distributed-transactions-adapters";

const DistributedTransactionsControls: React.FC = () => {
  const dispatch = useDispatch();
  const { pattern } = useSelector(
    (state: RootState) => state.distributedTransactions,
  ) as DistributedTransactionsState;

  const handleSwitch = (key: PatternKey) => {
    if (key === pattern) return;
    dispatch(setPattern(key));
    dispatch(resetSimulation());
  };

  return (
    <div className="distributed-transactions-controls">
      {allAdapters.map((adapter) => (
        <button
          key={adapter.id}
          className={`distributed-transactions-controls__btn${adapter.id === pattern ? " distributed-transactions-controls__btn--active" : ""}`}
          style={
            adapter.id === pattern
              ? { color: adapter.colors.stroke, borderColor: adapter.colors.stroke }
              : undefined
          }
          title={adapter.profile.context}
          onClick={() => handleSwitch(adapter.id)}
        >
          {adapter.profile.shortLabel}
        </button>
      ))}
    </div>
  );
};

export default DistributedTransactionsControls;
