import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setStrategy,
  setSystemProfile,
  setSelectedOp,
  toggleAutoFailover,
  type FailoverState,
  type FailoverStrategy,
  type OperationType,
  type SystemProfileKey,
  STRATEGY_PROFILES,
  STRATEGY_ORDER,
  SYSTEM_PROFILES,
  SYSTEM_PROFILE_ORDER,
} from "./failoverSlice";

const STRATEGY_COLORS: Record<FailoverStrategy, string> = {
  cold: "#94a3b8",
  warm: "#fbbf24",
  hot: "#ef4444",
  multiPrimary: "#a855f7",
};

const PROFILE_COLORS: Record<SystemProfileKey, string> = {
  none: "#475569",
  ecommerce: "#38bdf8",
  banking: "#22c55e",
  gaming: "#f97316",
  fintech: "#a855f7",
  "api-gateway": "#06b6d4",
};

const FailoverControls: React.FC = () => {
  const dispatch = useDispatch();
  const { strategy, autoFailover, systemProfile, selectedOp } = useSelector(
    (state: RootState) => state.failover,
  ) as FailoverState;

  const handleStrategy = (s: FailoverStrategy) => {
    dispatch(setStrategy(s));
    dispatch(resetSimulation());
  };

  const handleProfile = (p: SystemProfileKey) => {
    dispatch(setSystemProfile(p));
    dispatch(resetSimulation());
  };

  return (
    <div className="failover-controls">
      {/* System profile picker */}
      <div className="failover-controls__group">
        <span className="failover-controls__label failover-controls__label--dim">
          System:
        </span>
        {SYSTEM_PROFILE_ORDER.map((p) => {
          const prof = SYSTEM_PROFILES[p];
          const active = systemProfile === p;
          return (
            <button
              key={p}
              className={`failover-controls__btn failover-controls__btn--profile ${
                active ? "failover-controls__btn--active" : ""
              }`}
              style={{
                borderColor: PROFILE_COLORS[p],
                ...(active ? { background: PROFILE_COLORS[p] + "22" } : {}),
              }}
              onClick={() => handleProfile(p)}
              title={p !== "none" ? prof.tagline : "Manual configuration"}
            >
              {prof.icon} {p === "none" ? "Custom" : prof.label}
            </button>
          );
        })}
      </div>

      <span className="failover-controls__sep" />

      {/* Strategy selector */}
      <div className="failover-controls__group">
        <span className="failover-controls__label failover-controls__label--dim">
          Strategy:
        </span>
        {STRATEGY_ORDER.map((s) => (
          <button
            key={s}
            className={`failover-controls__btn failover-controls__btn--strategy ${
              strategy === s ? "failover-controls__btn--active" : ""
            }`}
            style={{
              borderColor: STRATEGY_COLORS[s],
              ...(strategy === s
                ? { background: STRATEGY_COLORS[s] + "22" }
                : {}),
            }}
            onClick={() => handleStrategy(s)}
          >
            {STRATEGY_PROFILES[s].label}
          </button>
        ))}
      </div>

      <span className="failover-controls__sep" />

      {/* Operation type */}
      <div className="failover-controls__group">
        <span className="failover-controls__label failover-controls__label--dim">
          Op:
        </span>
        {(["write", "read"] as OperationType[]).map((op) => (
          <button
            key={op}
            className={`failover-controls__btn ${selectedOp === op ? "failover-controls__btn--active" : ""}`}
            style={{
              borderColor: op === "write" ? "#f97316" : "#38bdf8",
              ...(selectedOp === op
                ? {
                    background: (op === "write" ? "#f97316" : "#38bdf8") + "22",
                  }
                : {}),
            }}
            onClick={() => {
              dispatch(setSelectedOp(op));
              dispatch(resetSimulation());
            }}
          >
            {op === "write" ? "✏ Write" : "🔍 Read"}
          </button>
        ))}
      </div>

      <span className="failover-controls__sep" />

      {/* Auto-failover toggle */}
      <div className="failover-controls__group">
        <button
          className={`failover-controls__btn ${
            autoFailover ? "failover-controls__btn--active" : ""
          }`}
          style={{
            borderColor: autoFailover ? "#22c55e" : "#475569",
            background: autoFailover ? "#22c55e22" : undefined,
          }}
          onClick={() => {
            dispatch(toggleAutoFailover());
            dispatch(resetSimulation());
          }}
        >
          {autoFailover ? "✓ Auto-Failover" : "Auto-Failover"}
        </button>
      </div>
    </div>
  );
};

export default FailoverControls;
