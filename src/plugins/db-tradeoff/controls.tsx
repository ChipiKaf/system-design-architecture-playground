import React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  OPERATION_CATALOG,
  type ConsistencyLevel,
  type DbTradeoffState,
  type DbType,
  type JoinMode,
  type OperationId,
  type ReadPreference,
  type WorkloadId,
  type WriteConcern,
  setConsistencyLevel,
  setDbType,
  setJoinMode,
  setNodeCount,
  setReadPreference,
  setReplicationFactor,
  setSelectedOp,
  setWorkload,
  setWriteConcern,
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

const WRITE_CONCERNS: { value: WriteConcern; label: string; hint: string }[] = [
  { value: "w1", label: "w:1 Fast", hint: "RPO > 0" },
  { value: "wmajority", label: "w:maj Safe", hint: "RPO ≈ 0" },
];

const READ_PREFS: { value: ReadPreference; label: string; hint: string }[] = [
  { value: "primary", label: "Primary", hint: "Always read latest" },
  { value: "secondary", label: "Secondary", hint: "May be stale" },
  { value: "majority", label: "Majority", hint: "Only majority-committed" },
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

      {runtime.dbType !== "mongodb" && (
        <>
          <div className="db-tradeoff-controls__group">
            <span className="db-tradeoff-controls__legend">
              {runtime.dbType === "cassandra" ? "CL" : "Consistency"}
            </span>
            {CONSISTENCY_LEVELS.map((cl) => {
              const cassLabel =
                cl.value === "strong"
                  ? "ALL"
                  : cl.value === "quorum"
                    ? "QUORUM"
                    : "ONE";
              return (
                <button
                  key={cl.value}
                  className={`db-tradeoff-controls__chip ${runtime.consistencyLevel === cl.value ? "is-active" : ""}`}
                  style={
                    runtime.dbType === "cassandra" &&
                    runtime.consistencyLevel === cl.value
                      ? {
                          borderColor:
                            cl.value === "strong"
                              ? "#22c55e"
                              : cl.value === "quorum"
                                ? "#f59e0b"
                                : "#ef4444",
                          color:
                            cl.value === "strong"
                              ? "#22c55e"
                              : cl.value === "quorum"
                                ? "#f59e0b"
                                : "#ef4444",
                        }
                      : undefined
                  }
                  onClick={() =>
                    sync(() => dispatch(setConsistencyLevel(cl.value)))
                  }
                >
                  {runtime.dbType === "cassandra" ? cassLabel : cl.label}
                </button>
              );
            })}
          </div>
          <span className="db-tradeoff-controls__sep" />
        </>
      )}

      {runtime.dbType === "mongodb" && (
        <>
          <div className="db-tradeoff-controls__group">
            <span className="db-tradeoff-controls__legend">Write Concern</span>
            {WRITE_CONCERNS.map((wc) => (
              <button
                key={wc.value}
                className={`db-tradeoff-controls__chip ${runtime.writeConcern === wc.value ? "is-active" : ""}`}
                style={
                  runtime.writeConcern === wc.value
                    ? {
                        borderColor: wc.value === "w1" ? "#ef4444" : "#22c55e",
                        color: wc.value === "w1" ? "#ef4444" : "#22c55e",
                      }
                    : undefined
                }
                title={wc.hint}
                onClick={() => sync(() => dispatch(setWriteConcern(wc.value)))}
              >
                {wc.label}
              </button>
            ))}
          </div>
          <div className="db-tradeoff-controls__group">
            <span className="db-tradeoff-controls__legend">Read Mode</span>
            {READ_PREFS.map((rp) => (
              <button
                key={rp.value}
                className={`db-tradeoff-controls__chip ${runtime.readPreference === rp.value ? "is-active" : ""}`}
                style={
                  runtime.readPreference === rp.value
                    ? {
                        borderColor:
                          rp.value === "secondary"
                            ? "#f59e0b"
                            : rp.value === "majority"
                              ? "#22c55e"
                              : "#3b82f6",
                        color:
                          rp.value === "secondary"
                            ? "#f59e0b"
                            : rp.value === "majority"
                              ? "#22c55e"
                              : "#3b82f6",
                      }
                    : undefined
                }
                title={rp.hint}
                onClick={() =>
                  sync(() => dispatch(setReadPreference(rp.value)))
                }
              >
                {rp.label}
              </button>
            ))}
          </div>
          <span className="db-tradeoff-controls__sep" />
        </>
      )}

      {runtime.dbType === "mongodb" && runtime.selectedOp === "join-query" && (
        <>
          <div className="db-tradeoff-controls__group">
            <span className="db-tradeoff-controls__legend">Join Method</span>
            {(
              [
                {
                  value: "app-join" as JoinMode,
                  label: "App-side",
                  hint: "2 round trips in application code",
                  color: "#f59e0b",
                },
                {
                  value: "lookup" as JoinMode,
                  label: "$lookup",
                  hint: "Aggregation pipeline (cross-shard)",
                  color: "#8b5cf6",
                },
                {
                  value: "denormalized" as JoinMode,
                  label: "Embedded",
                  hint: "Data pre-embedded in one document",
                  color: "#22c55e",
                },
              ] as const
            ).map((jm) => (
              <button
                key={jm.value}
                className={`db-tradeoff-controls__chip ${runtime.joinMode === jm.value ? "is-active" : ""}`}
                style={
                  runtime.joinMode === jm.value
                    ? { borderColor: jm.color, color: jm.color }
                    : undefined
                }
                title={jm.hint}
                onClick={() => sync(() => dispatch(setJoinMode(jm.value)))}
              >
                {jm.label}
              </button>
            ))}
          </div>
          <span className="db-tradeoff-controls__sep" />
        </>
      )}

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

      {runtime.dbType === "cassandra" && (
        <div className="db-tradeoff-controls__group">
          <span className="db-tradeoff-controls__legend">
            RF: {Math.min(runtime.replicationFactor, runtime.nodeCount)}
          </span>
          <input
            type="range"
            min={1}
            max={runtime.nodeCount}
            value={Math.min(runtime.replicationFactor, runtime.nodeCount)}
            onChange={(e) =>
              sync(() => dispatch(setReplicationFactor(Number(e.target.value))))
            }
            className="db-tradeoff-controls__slider"
          />
        </div>
      )}

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
