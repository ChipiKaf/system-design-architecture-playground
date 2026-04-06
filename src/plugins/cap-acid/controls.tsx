import React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setVariant,
  setIsolationLevel,
  setConsistencyLevel,
  togglePartition,
  VARIANT_PROFILES,
  type CapAcidState,
  type VariantKey,
  type IsolationLevel,
  type ConsistencyLevel,
} from "./capAcidSlice";

const DB_VARIANTS: {
  value: VariantKey;
  label: string;
  color: string;
  cap: string;
}[] = [
  { value: "postgresql", label: "PostgreSQL", color: "#3b82f6", cap: "CA" },
  { value: "mongodb", label: "MongoDB", color: "#22c55e", cap: "CP" },
  { value: "cassandra", label: "Cassandra", color: "#f59e0b", cap: "AP" },
];

const ISOLATION_LEVELS: {
  value: IsolationLevel;
  label: string;
  hint: string;
  color: string;
}[] = [
  {
    value: "read-committed",
    label: "Read Committed",
    hint: "See only committed rows — PG default",
    color: "#22c55e",
  },
  {
    value: "repeatable-read",
    label: "Repeatable Read",
    hint: "Snapshot at tx start — no phantom reads",
    color: "#f59e0b",
  },
  {
    value: "serializable",
    label: "Serializable",
    hint: "Full serial execution — max isolation, max overhead",
    color: "#ef4444",
  },
];

const CONSISTENCY_LEVELS: {
  value: ConsistencyLevel;
  label: string;
  hint: string;
}[] = [
  { value: "strong", label: "Strong", hint: "All nodes must ack" },
  { value: "quorum", label: "Quorum", hint: "Majority must ack" },
  { value: "eventual", label: "Eventual", hint: "Any one node ack" },
];

const CapAcidControls: React.FC = () => {
  const dispatch = useDispatch();
  const st = useSelector((state: RootState) => state.capAcid) as CapAcidState;

  const sync = (cb: () => void) => {
    cb();
    dispatch(resetSimulation());
  };

  return (
    <div className="cap-acid-controls">
      {/* ── DB variant ── */}
      <div className="cap-acid-controls__group">
        <span className="cap-acid-controls__legend">Database</span>
        {DB_VARIANTS.map((d) => (
          <button
            key={d.value}
            className={`cap-acid-controls__btn${st.variant === d.value ? " cap-acid-controls__btn--active" : ""}`}
            style={
              st.variant === d.value
                ? { color: d.color, borderColor: d.color }
                : {}
            }
            onClick={() => sync(() => dispatch(setVariant(d.value)))}
          >
            {d.label}
            <span className="cap-acid-controls__cap-tag">{d.cap}</span>
          </button>
        ))}
      </div>

      <span className="cap-acid-controls__sep" />

      {/* ── Consistency level ── */}
      <div className="cap-acid-controls__group">
        <span className="cap-acid-controls__legend">Consistency</span>
        {CONSISTENCY_LEVELS.map((cl) => (
          <button
            key={cl.value}
            className={`cap-acid-controls__btn${st.consistencyLevel === cl.value ? " cap-acid-controls__btn--active" : ""}`}
            title={cl.hint}
            onClick={() => sync(() => dispatch(setConsistencyLevel(cl.value)))}
          >
            {cl.label}
          </button>
        ))}
      </div>

      <span className="cap-acid-controls__sep" />

      {/* ── Isolation level (PG-specific but shows "N/A" for others) ── */}
      <div className="cap-acid-controls__group">
        <span className="cap-acid-controls__legend">
          Isolation{" "}
          {st.variant !== "postgresql" && (
            <span style={{ color: "#64748b", fontSize: "0.65rem" }}>
              (PG only)
            </span>
          )}
        </span>
        {ISOLATION_LEVELS.map((iso) => (
          <button
            key={iso.value}
            className={`cap-acid-controls__btn${st.isolationLevel === iso.value ? " cap-acid-controls__btn--active" : ""}${st.variant !== "postgresql" ? " cap-acid-controls__btn--disabled" : ""}`}
            style={
              st.isolationLevel === iso.value && st.variant === "postgresql"
                ? { color: iso.color, borderColor: iso.color }
                : {}
            }
            title={iso.hint}
            disabled={st.variant !== "postgresql"}
            onClick={() => sync(() => dispatch(setIsolationLevel(iso.value)))}
          >
            {iso.label}
          </button>
        ))}
      </div>

      <span className="cap-acid-controls__sep" />

      {/* ── Partition toggle ── */}
      <div className="cap-acid-controls__group">
        <button
          className={`cap-acid-controls__btn cap-acid-controls__btn--danger${st.partitioned ? " cap-acid-controls__btn--active" : ""}`}
          onClick={() => sync(() => dispatch(togglePartition()))}
        >
          {st.partitioned ? "✕ Heal Partition" : "⚡ Network Partition"}
        </button>
      </div>
    </div>
  );
};

export default CapAcidControls;
