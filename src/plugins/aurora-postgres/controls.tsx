import React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setVariant,
  setTopic,
  type AuroraPostgresState,
  type VariantKey,
} from "./auroraPostgresSlice";
import { TOPICS, getAdapter, type TopicKey } from "./aurora-postgres-adapters";

const AuroraPostgresControls: React.FC = () => {
  const dispatch = useDispatch();
  const st = useSelector((state: RootState) => state.auroraPostgres) as AuroraPostgresState;

  const sync = (cb: () => void) => {
    cb();
    dispatch(resetSimulation());
  };

  const activeTopic = TOPICS.find((t) => t.id === st.topic)!;

  return (
    <div className="aurora-postgres-controls">
      {/* ── Topic dropdown ── */}
      <div className="aurora-postgres-controls__group">
        <select
          className="aurora-postgres-controls__select"
          value={st.topic}
          onChange={(e) =>
            sync(() => dispatch(setTopic(e.target.value as TopicKey)))
          }
        >
          {TOPICS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <span className="aurora-postgres-controls__sep" />

      {/* ── Variant buttons for active topic ── */}
      <div className="aurora-postgres-controls__group">
        {activeTopic.variants.map((vk: VariantKey) => {
          const adapter = getAdapter(vk);
          return (
            <button
              key={vk}
              className={`aurora-postgres-controls__btn${st.variant === vk ? " aurora-postgres-controls__btn--active" : ""}`}
              style={
                st.variant === vk
                  ? {
                      color: adapter.colors.stroke,
                      borderColor: adapter.colors.stroke,
                    }
                  : {}
              }
              onClick={() => sync(() => dispatch(setVariant(vk)))}
            >
              {adapter.profile.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AuroraPostgresControls;
