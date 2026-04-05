import React from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  QUERY_CATALOG,
  type QueryId,
  type ShardKey,
  type ShardStrategy,
  type ShardingState,
  type SkewMode,
  addClient,
  removeClient,
  setSelectedQuery,
  setShardCount,
  setShardKey,
  setSkewMode,
  setStrategy,
  toggleColocation,
  toggleDenormalized,
} from "./shardingSlice";

const STRATEGIES: ShardStrategy[] = ["range", "hash"];
const KEYS: ShardKey[] = ["userId", "region", "orderId"];
const SKEWS: SkewMode[] = ["uniform", "hotUser", "hotRegion"];

const ShardingControls: React.FC = () => {
  const dispatch = useDispatch();
  const runtime = useSelector((state: RootState) => state.sharding) as ShardingState;

  const sync = (cb: () => void) => {
    cb();
    dispatch(resetSimulation());
  };

  return (
    <div className="sharding-controls">
      <div className="sharding-controls__group">
        <span className="sharding-controls__legend">Strategy</span>
        {STRATEGIES.map((s) => (
          <button
            key={s}
            className={`sharding-controls__chip ${runtime.strategy === s ? "is-active" : ""}`}
            onClick={() => sync(() => dispatch(setStrategy(s)))}
          >
            {s === "range" ? "Range" : "Hash"}
          </button>
        ))}
      </div>

      <span className="sharding-controls__sep" />

      <div className="sharding-controls__group">
        <span className="sharding-controls__legend">Shard Key</span>
        {KEYS.map((k) => (
          <button
            key={k}
            className={`sharding-controls__chip ${runtime.shardKey === k ? "is-active" : ""}`}
            onClick={() => sync(() => dispatch(setShardKey(k)))}
          >
            {k}
          </button>
        ))}
      </div>

      <span className="sharding-controls__sep" />

      <div className="sharding-controls__group">
        <span className="sharding-controls__legend">Shards</span>
        <button
          className="sharding-controls__chip"
          onClick={() => sync(() => dispatch(setShardCount(runtime.shardCount - 1)))}
          disabled={runtime.shardCount <= 2}
        >
          -
        </button>
        <span className="sharding-controls__value">{runtime.shardCount}</span>
        <button
          className="sharding-controls__chip"
          onClick={() => sync(() => dispatch(setShardCount(runtime.shardCount + 1)))}
          disabled={runtime.shardCount >= 6}
        >
          +
        </button>
      </div>

      <span className="sharding-controls__sep" />

      <div className="sharding-controls__group">
        <span className="sharding-controls__legend">Clients</span>
        <button
          className="sharding-controls__chip"
          onClick={() => sync(() => dispatch(removeClient()))}
          disabled={runtime.clients.length <= 1}
        >
          -
        </button>
        <span className="sharding-controls__value">{runtime.clients.length}</span>
        <button
          className="sharding-controls__chip"
          onClick={() => sync(() => dispatch(addClient()))}
          disabled={runtime.clients.length >= 8}
        >
          +
        </button>
      </div>

      <span className="sharding-controls__sep" />

      <div className="sharding-controls__group sharding-controls__group--query">
        <span className="sharding-controls__legend">Query</span>
        {(Object.keys(QUERY_CATALOG) as QueryId[]).map((q) => (
          <button
            key={q}
            className={`sharding-controls__chip ${runtime.selectedQuery === q ? "is-active" : ""}`}
            onClick={() => sync(() => dispatch(setSelectedQuery(q)))}
          >
            {QUERY_CATALOG[q].label}
          </button>
        ))}
      </div>

      <span className="sharding-controls__sep" />

      <div className="sharding-controls__group">
        <span className="sharding-controls__legend">Skew</span>
        {SKEWS.map((m) => (
          <button
            key={m}
            className={`sharding-controls__chip ${runtime.skewMode === m ? "is-active" : ""}`}
            onClick={() => sync(() => dispatch(setSkewMode(m)))}
          >
            {m}
          </button>
        ))}
      </div>

      <span className="sharding-controls__sep" />

      <div className="sharding-controls__group">
        <button
          className={`sharding-controls__chip ${runtime.denormalized ? "is-active" : ""}`}
          onClick={() => sync(() => dispatch(toggleDenormalized()))}
        >
          Denormalized reads
        </button>
        <button
          className={`sharding-controls__chip ${runtime.colocateOrdersWithUsers ? "is-active" : ""}`}
          onClick={() => sync(() => dispatch(toggleColocation()))}
        >
          Co-locate users + orders
        </button>
      </div>
    </div>
  );
};

export default ShardingControls;
