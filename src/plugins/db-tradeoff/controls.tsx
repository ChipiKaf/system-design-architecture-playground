import React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  OPERATION_CATALOG,
  type ConsistencyLevel,
  type DbTradeoffState,
  type DbType,
  type OperationId,
  type WorkloadId,
  setConsistencyLevel,
  setDbType,
  setNodeCount,
  setSelectedOp,
  setWorkload,
  toggleNodeFailure,
} from "./dbTradeoffSlice";

const DB_TYPES: { value: DbType; label: string; color: string }[] = [
  { value: "relational", label: "PostgreSQL", color: "#3b82f6" },
  { value: "mongodb", label: "MongoDB", color: "#22c55e" },
  { value: "cassandra", label: "Cassandra", color: "#f59e0b" },
];

const WORKLOADS: { value: WorkloadId; label: string }[] = [
  { value: "banking", label: "Banking" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "chat", label: "Chat" },
];

const CONSISTENCY_LEVELS: { value: ConsistencyLevel; label: string }[] = [
  { value: "strong", label: "Strong" },
  { value: "quorum", label: "Quorum" },
  { value: "eventual", label: "Eventual" },
];

const OPS: OperationId[] = [
  "write",
  "point-read",
  "join-query",
  "aggregate",
  "burst-write",
  "read-after-write",
];

const DbTradeoffControls: React.FC = () => {
  const dispatch = useDispatch();
  const runtime = useSelector(
    (state: RootState) => state.dbTradeoff,
  ) as DbTradeoffState;

  const sync = (cb: () => void) => {
    cb();
    dispatch(resetSimulation());
  };

  return (
    <div className="db-tradeoff-controls">
      <div className="db-tradeoff-controls__group">
        <span className="db-tradeoff-controls__legend">DB</span>
        {DB_TYPES.map((d) => (
          <button
            key={d.value}
            className={`db-tradeoff-controls__chip ${runtime.dbType === d.value ? "is-active" : ""}`}
            style={
              runtime.dbType === d.value
                ? { borderColor: d.color, color: d.color }
                : undefined
            }
            onClick={() => sync(() => dispatch(setDbType(d.value)))}
          >
            {d.label}
          </button>
        ))}
      </div>

      <span className="db-tradeoff-controls__sep" />

      <div className="db-tradeoff-controls__group">
        <span className="db-tradeoff-controls__legend">Workload</span>
        {WORKLOADS.map((w) => (
          <button
            key={w.value}
            className={`db-tradeoff-controls__chip ${runtime.workload === w.value ? "is-active" : ""}`}
            onClick={() => sync(() => dispatch(setWorkload(w.value)))}
          >
            {w.label}
          </button>
        ))}
      </div>

      <span className="db-tradeoff-controls__sep" />

      <div className="db-tradeoff-controls__group">
        <span className="db-tradeoff-controls__legend">Op</span>
        {OPS.map((op) => (
          <button
            key={op}
            className={`db-tradeoff-controls__chip ${runtime.selectedOp === op ? "is-active" : ""}`}
            onClick={() => sync(() => dispatch(setSelectedOp(op)))}
          >
            {OPERATION_CATALOG[op].label}
          </button>
        ))}
      </div>

      <span className="db-tradeoff-controls__sep" />

      <div className="db-tradeoff-controls__group">
        <span className="db-tradeoff-controls__legend">Consistency</span>
        {CONSISTENCY_LEVELS.map((cl) => (
          <button
            key={cl.value}
            className={`db-tradeoff-controls__chip ${runtime.consistencyLevel === cl.value ? "is-active" : ""}`}
            onClick={() => sync(() => dispatch(setConsistencyLevel(cl.value)))}
          >
            {cl.label}
          </button>
        ))}
      </div>

      <span className="db-tradeoff-controls__sep" />

      <div className="db-tradeoff-controls__group">
        <span className="db-tradeoff-controls__legend">
          {runtime.dbType === "mongodb" ? "Shards" : "Nodes"}:{" "}
          {runtime.nodeCount}
        </span>
        <input
          type="range"
          min={1}
          max={runtime.dbType === "mongodb" ? 3 : 5}
          value={runtime.nodeCount}
          onChange={(e) =>
            sync(() => dispatch(setNodeCount(Number(e.target.value))))
          }
          className="db-tradeoff-controls__slider"
        />
      </div>

      <div className="db-tradeoff-controls__group">
        <button
          className={`db-tradeoff-controls__chip db-tradeoff-controls__chip--danger ${runtime.failedNodeIndex !== null ? "is-active" : ""}`}
          onClick={() => sync(() => dispatch(toggleNodeFailure()))}
        >
          {runtime.failedNodeIndex !== null ? "✕ Recover" : "⚡ Kill Node"}
        </button>
      </div>
    </div>
  );
};

export default DbTradeoffControls;
