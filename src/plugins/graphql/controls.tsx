import React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setVariant,
  setTopic,
  type GraphqlState,
  type VariantKey,
} from "./graphqlSlice";
import { TOPICS, getAdapter, type TopicKey } from "./graphql-adapters";

const GraphqlControls: React.FC = () => {
  const dispatch = useDispatch();
  const st = useSelector((state: RootState) => state.graphql) as GraphqlState;

  const sync = (cb: () => void) => {
    cb();
    dispatch(resetSimulation());
  };

  const activeTopic = TOPICS.find((t) => t.id === st.topic)!;

  return (
    <div className="graphql-controls">
      {/* ── Topic dropdown ── */}
      <div className="graphql-controls__group">
        <select
          className="graphql-controls__select"
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

      <span className="graphql-controls__sep" />

      {/* ── Variant buttons for active topic ── */}
      <div className="graphql-controls__group">
        {activeTopic.variants.map((vk: VariantKey) => {
          const adapter = getAdapter(vk);
          return (
            <button
              key={vk}
              className={`graphql-controls__btn${st.variant === vk ? " graphql-controls__btn--active" : ""}`}
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

export default GraphqlControls;
