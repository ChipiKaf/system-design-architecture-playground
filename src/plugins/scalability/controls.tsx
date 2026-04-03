import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  addClient,
  removeClient,
  addComponent,
  removeComponent,
  type ScalabilityState,
  type ComponentName,
} from "./scalabilitySlice";

/* ── Component toggle descriptor ─────────────────────── */
interface Toggle {
  name: ComponentName;
  label: string;
  addLabel: string;
  removeLabel: string;
  color: string;
  /** Prerequisites that must be active before this can be added. */
  requires?: ComponentName[];
  /** True when extra-servers — supports count > 1. */
  multi?: boolean;
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
    name: "extraServers",
    label: "Servers",
    addLabel: "+ Server",
    removeLabel: "− Server",
    color: "#14b8a6",
    requires: ["loadBalancer"],
    multi: true,
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
  const { components, clients } = useSelector(
    (state: RootState) => state.scalability,
  ) as ScalabilityState;

  const handleAdd = (name: ComponentName) => {
    dispatch(addComponent(name));
    dispatch(resetSimulation()); // reset step index — story changes
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

      {/* Infrastructure toggles */}
      {TOGGLES.map((t) => {
        const isActive =
          t.name === "extraServers"
            ? components.extraServers > 0
            : !!components[t.name];
        const prereqMet =
          !t.requires || t.requires.every((r) => !!components[r]);
        const canAdd =
          t.name === "extraServers"
            ? components.extraServers < 4 && prereqMet
            : !isActive && prereqMet;

        return (
          <div key={t.name} className="scalability-controls__group">
            {/* Remove */}
            {isActive && (
              <button
                className="scalability-controls__btn scalability-controls__btn--remove"
                style={{ borderColor: `${t.color}44` }}
                onClick={() => handleRemove(t.name)}
              >
                {t.removeLabel}
              </button>
            )}

            {/* Add */}
            {canAdd && (
              <button
                className="scalability-controls__btn scalability-controls__btn--add"
                style={{ borderColor: `${t.color}66`, color: t.color }}
                onClick={() => handleAdd(t.name)}
                title={
                  !prereqMet ? `Requires: ${t.requires?.join(", ")}` : undefined
                }
              >
                {t.addLabel}
              </button>
            )}

            {/* Extra-server count badge */}
            {t.multi && components.extraServers > 0 && (
              <span
                className="scalability-controls__badge"
                style={{ background: t.color }}
              >
                ×{components.extraServers}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ScalabilityControls;
