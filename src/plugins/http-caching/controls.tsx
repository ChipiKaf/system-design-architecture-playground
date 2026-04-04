import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  addClient,
  removeClient,
  addComponent,
  removeComponent,
  setCachePolicy,
  setTtl,
  type HttpCachingState,
  type ComponentName,
  type CachePolicy,
} from "./httpCachingSlice";

/* ── Component toggle descriptor ─────────────────────── */
interface Toggle {
  name: ComponentName;
  label: string;
  addLabel: string;
  removeLabel: string;
  color: string;
  requires?: ComponentName[];
}

const TOGGLES: Toggle[] = [
  {
    name: "browserCache",
    label: "Browser Cache",
    addLabel: "+ Browser Cache",
    removeLabel: "− Browser Cache",
    color: "#22c55e",
  },
  {
    name: "cdn",
    label: "CDN",
    addLabel: "+ CDN",
    removeLabel: "− CDN",
    color: "#8b5cf6",
  },
];

const POLICIES: { value: CachePolicy; label: string; color: string }[] = [
  { value: "max-age", label: "max-age", color: "#22c55e" },
  { value: "no-cache", label: "no-cache", color: "#f59e0b" },
  { value: "no-store", label: "no-store", color: "#ef4444" },
];

const TTL_PRESETS: { value: number; label: string }[] = [
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 60, label: "1min" },
  { value: 120, label: "2min" },
];

const HttpCachingControls: React.FC = () => {
  const dispatch = useDispatch();
  const { components, clients, cachePolicy, cacheTtlSeconds } = useSelector(
    (state: RootState) => state.httpCaching,
  ) as HttpCachingState;

  const handleAdd = (name: ComponentName) => {
    dispatch(addComponent(name));
    dispatch(resetSimulation());
  };

  const handleRemove = (name: ComponentName) => {
    dispatch(removeComponent(name));
    dispatch(resetSimulation());
  };

  const handlePolicy = (policy: CachePolicy) => {
    dispatch(setCachePolicy(policy));
    dispatch(resetSimulation());
  };

  return (
    <div className="http-caching-controls">
      {/* Client count */}
      <div className="http-caching-controls__group">
        <button
          className="http-caching-controls__btn"
          onClick={() => dispatch(removeClient())}
          disabled={clients.length <= 1}
        >
          −
        </button>
        <span className="http-caching-controls__label">
          {clients.length} client{clients.length !== 1 ? "s" : ""}
        </span>
        <button
          className="http-caching-controls__btn"
          onClick={() => dispatch(addClient())}
          disabled={clients.length >= 12}
        >
          +
        </button>
      </div>

      <span className="http-caching-controls__sep" />

      {/* Infrastructure toggles */}
      {TOGGLES.map((t) => {
        const isActive = !!components[t.name];
        const prereqMet =
          !t.requires || t.requires.every((r) => !!components[r]);
        const canAdd = !isActive && prereqMet;

        return (
          <div key={t.name} className="http-caching-controls__group">
            {isActive && (
              <button
                className="http-caching-controls__btn http-caching-controls__btn--remove"
                style={{ borderColor: `${t.color}44` }}
                onClick={() => handleRemove(t.name)}
              >
                {t.removeLabel}
              </button>
            )}
            {canAdd && (
              <button
                className="http-caching-controls__btn http-caching-controls__btn--add"
                style={{ borderColor: `${t.color}66`, color: t.color }}
                onClick={() => handleAdd(t.name)}
              >
                {t.addLabel}
              </button>
            )}
          </div>
        );
      })}

      <span className="http-caching-controls__sep" />

      {/* Cache policy selector */}
      <div className="http-caching-controls__group">
        <span className="http-caching-controls__label">Cache-Control:</span>
        {POLICIES.map((p) => (
          <button
            key={p.value}
            className={`http-caching-controls__btn http-caching-controls__btn--policy ${
              cachePolicy === p.value
                ? "http-caching-controls__btn--active"
                : ""
            }`}
            style={{
              borderColor: cachePolicy === p.value ? p.color : `${p.color}44`,
              color: cachePolicy === p.value ? p.color : undefined,
            }}
            onClick={() => handlePolicy(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* max-age TTL presets */}
      {cachePolicy === "max-age" && (
        <>
          <span className="http-caching-controls__sep" />
          <div className="http-caching-controls__group">
            <span className="http-caching-controls__label">max-age:</span>
            {TTL_PRESETS.map((t) => (
              <button
                key={t.value}
                className={`http-caching-controls__btn http-caching-controls__btn--policy ${
                  cacheTtlSeconds === t.value
                    ? "http-caching-controls__btn--active http-caching-controls__btn--ttl-active"
                    : ""
                }`}
                onClick={() => {
                  dispatch(setTtl(t.value));
                  dispatch(resetSimulation());
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HttpCachingControls;
