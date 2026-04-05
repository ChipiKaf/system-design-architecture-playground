import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  addClient,
  removeClient,
  addComponent,
  removeComponent,
  addServer,
  removeServer,
  scaleServerUp,
  scaleServerDown,
  type ScalabilityState,
  type ComponentName,
  INSTANCE_ORDER,
} from "./scalabilitySlice";

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
    name: "database",
    label: "Database",
    addLabel: "+ Database",
    removeLabel: "− Database",
    color: "#22c55e",
  },
  {
    name: "loadBalancer",
    label: "Load Balancer",
    addLabel: "+ Load Balancer",
    removeLabel: "− Load Balancer",
    color: "#8b5cf6",
  },
  {
    name: "cache",
    label: "Cache",
    addLabel: "+ Cache",
    removeLabel: "− Cache",
    color: "#f97316",
    requires: ["database"],
  },
];

const ScalabilityControls: React.FC = () => {
  const dispatch = useDispatch();
  const { components, clients, servers } = useSelector(
    (state: RootState) => state.scalability,
  ) as ScalabilityState;

  const handleAdd = (name: ComponentName) => {
    dispatch(addComponent(name));
    dispatch(resetSimulation());
  };

  const handleRemove = (name: ComponentName) => {
    dispatch(removeComponent(name));
    dispatch(resetSimulation());
  };

  return (
    <div className="scalability-controls">
      {/* Client count */}
      <div className="scalability-controls__group">
        <button
          className="scalability-controls__btn"
          onClick={() => dispatch(removeClient())}
          disabled={clients.length <= 1}
        >
          −
        </button>
        <span className="scalability-controls__label">
          {clients.length} client{clients.length !== 1 ? "s" : ""}
        </span>
        <button
          className="scalability-controls__btn"
          onClick={() => dispatch(addClient())}
          disabled={clients.length >= 12}
        >
          +
        </button>
      </div>

      <span className="scalability-controls__sep" />

      {/* Vertical scaling — scale each server up/down */}
      {servers.map((server, i) => {
        const idx = INSTANCE_ORDER.indexOf(server.profile.instanceType);
        const canUp = idx < INSTANCE_ORDER.length - 1;
        const canDown = idx > 0;
        return (
          <div key={server.id} className="scalability-controls__group">
            <button
              className="scalability-controls__btn scalability-controls__btn--remove"
              onClick={() => {
                dispatch(scaleServerDown(server.id));
                dispatch(resetSimulation());
              }}
              disabled={!canDown}
              title="Scale down (vertical)"
            >
              ↓
            </button>
            <span className="scalability-controls__label scalability-controls__label--server">
              {i === 0 ? "Server" : `S${i + 1}`}: {server.profile.instanceType}
            </span>
            <button
              className="scalability-controls__btn scalability-controls__btn--add"
              style={{ borderColor: "#f9731666", color: "#f97316" }}
              onClick={() => {
                dispatch(scaleServerUp(server.id));
                dispatch(resetSimulation());
              }}
              disabled={!canUp}
              title="Scale up (vertical)"
            >
              ↑
            </button>
          </div>
        );
      })}

      <span className="scalability-controls__sep" />

      {/* Horizontal scaling — add/remove servers */}
      <div className="scalability-controls__group">
        {servers.length > 1 && (
          <button
            className="scalability-controls__btn scalability-controls__btn--remove"
            onClick={() => {
              dispatch(removeServer());
              dispatch(resetSimulation());
            }}
          >
            − Server
          </button>
        )}
        {components.loadBalancer && servers.length < 5 && (
          <button
            className="scalability-controls__btn scalability-controls__btn--add"
            style={{ borderColor: "#14b8a666", color: "#14b8a6" }}
            onClick={() => {
              dispatch(addServer());
              dispatch(resetSimulation());
            }}
          >
            + Server
          </button>
        )}
        {servers.length > 1 && (
          <span
            className="scalability-controls__badge"
            style={{ background: "#14b8a6" }}
          >
            ×{servers.length}
          </span>
        )}
      </div>

      <span className="scalability-controls__sep" />

      {/* Infrastructure toggles */}
      {TOGGLES.map((t) => {
        const isActive = !!components[t.name as keyof typeof components];
        const prereqMet =
          !t.requires ||
          t.requires.every((r) =>
            r === "server"
              ? servers.length > 1
              : !!components[r as keyof typeof components],
          );
        const canAdd = !isActive && prereqMet;

        return (
          <div key={t.name} className="scalability-controls__group">
            {isActive && (
              <button
                className="scalability-controls__btn scalability-controls__btn--remove"
                style={{ borderColor: `${t.color}44` }}
                onClick={() => handleRemove(t.name)}
              >
                {t.removeLabel}
              </button>
            )}
            {canAdd && (
              <button
                className="scalability-controls__btn scalability-controls__btn--add"
                style={{ borderColor: `${t.color}66`, color: t.color }}
                onClick={() => handleAdd(t.name)}
              >
                {t.addLabel}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ScalabilityControls;
