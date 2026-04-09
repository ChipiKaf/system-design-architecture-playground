import React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setPattern,
  setProjectionState,
  type CommandsQueriesState,
  type ProjectionState,
} from "./commandsQueriesSlice";
import { allAdapters } from "./pattern-adapters";

const PROJECTION_OPTIONS: Array<{
  value: ProjectionState;
  label: string;
  hint: string;
  color: string;
}> = [
  {
    value: "caught-up",
    label: "Caught Up",
    hint: "Fresh enough for the next query",
    color: "#22c55e",
  },
  {
    value: "lagging",
    label: "Lagging",
    hint: "Fast read, stale snapshot risk",
    color: "#f59e0b",
  },
];

const CommandsQueriesControls: React.FC = () => {
  const dispatch = useDispatch();
  const { pattern, projectionState } = useSelector(
    (state: RootState) => state.commandsAndQueries,
  ) as CommandsQueriesState;

  const sync = (apply: () => void) => {
    apply();
    dispatch(resetSimulation());
  };

  return (
    <div className="commands-queries-controls">
      <div className="commands-queries-controls__group">
        <span className="commands-queries-controls__legend">Pattern</span>
        <div className="commands-queries-controls__inline">
          {allAdapters.map((adapter) => {
            const isActive = adapter.id === pattern;
            return (
              <button
                key={adapter.id}
                type="button"
                className={`commands-queries-controls__btn${isActive ? " commands-queries-controls__btn--active" : ""}`}
                style={
                  isActive
                    ? {
                        borderColor: adapter.profile.color,
                        color: adapter.profile.color,
                      }
                    : undefined
                }
                title={`${adapter.profile.label}: ${adapter.profile.bestFor}`}
                onClick={() => sync(() => dispatch(setPattern(adapter.id)))}
              >
                {adapter.profile.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <span className="commands-queries-controls__sep" />

      <div className="commands-queries-controls__group">
        <span className="commands-queries-controls__legend">Projection</span>
        <div className="commands-queries-controls__inline">
          {PROJECTION_OPTIONS.map((option) => {
            const isActive = option.value === projectionState;
            return (
              <button
                key={option.value}
                type="button"
                className={`commands-queries-controls__btn${isActive ? " commands-queries-controls__btn--active" : ""}`}
                style={
                  isActive
                    ? {
                        borderColor: option.color,
                        color: option.color,
                      }
                    : undefined
                }
                title={option.hint}
                onClick={() =>
                  sync(() => dispatch(setProjectionState(option.value)))
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CommandsQueriesControls;
