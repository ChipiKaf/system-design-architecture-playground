import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setVariant,
  VARIANT_PROFILES,
  SYNC_PROTOCOLS,
  ASYNC_PROTOCOLS,
  type MicroserviceCommState,
} from "./microserviceCommSlice";

const MicroserviceCommControls: React.FC = () => {
  const dispatch = useDispatch();
  const { variant } = useSelector(
    (state: RootState) => state.microserviceComm,
  ) as MicroserviceCommState;

  const sync = (cb: () => void) => {
    cb();
    dispatch(resetSimulation());
  };

  return (
    <div className="microservice-comm-controls">
      {/* ── Sync protocols ─────────────────────────── */}
      <div className="microservice-comm-controls__group">
        <span className="microservice-comm-controls__legend">Sync</span>
        {SYNC_PROTOCOLS.map((key) => {
          const p = VARIANT_PROFILES[key];
          return (
            <button
              key={key}
              className={`microservice-comm-controls__chip${variant === key ? " is-active" : ""}`}
              style={
                variant === key
                  ? { borderColor: p.color, color: p.color }
                  : undefined
              }
              onClick={() => sync(() => dispatch(setVariant(key)))}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <span className="microservice-comm-controls__sep" />

      {/* ── Async protocols ────────────────────────── */}
      <div className="microservice-comm-controls__group">
        <span className="microservice-comm-controls__legend">Async</span>
        {ASYNC_PROTOCOLS.map((key) => {
          const p = VARIANT_PROFILES[key];
          return (
            <button
              key={key}
              className={`microservice-comm-controls__chip${variant === key ? " is-active" : ""}`}
              style={
                variant === key
                  ? { borderColor: p.color, color: p.color }
                  : undefined
              }
              onClick={() => sync(() => dispatch(setVariant(key)))}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MicroserviceCommControls;
