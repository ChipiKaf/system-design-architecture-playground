import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setToolType,
  setScenario,
  setPackageCount,
  type CiCdBuildState,
  type ToolType,
  type ScenarioId,
} from "./ciCdBuildSlice";

const TOOLS: { value: ToolType; label: string; color: string }[] = [
  { value: "nx", label: "Nx", color: "#3b82f6" },
  { value: "turborepo", label: "Turborepo", color: "#c084fc" },
];

const SCENARIOS: { value: ScenarioId; label: string }[] = [
  { value: "monorepo-web", label: "Web Apps" },
  { value: "fullstack", label: "Fullstack" },
  { value: "design-system", label: "Design System" },
];

const CiCdBuildControls: React.FC = () => {
  const dispatch = useDispatch();
  const runtime = useSelector(
    (state: RootState) => state.ciCdBuild,
  ) as CiCdBuildState;

  const sync = (cb: () => void) => {
    cb();
    dispatch(resetSimulation());
  };

  return (
    <div className="ci-cd-build-controls">
      <div className="ci-cd-build-controls__group">
        <span className="ci-cd-build-controls__legend">Tool</span>
        {TOOLS.map((t) => (
          <button
            key={t.value}
            className={`ci-cd-build-controls__btn${runtime.toolType === t.value ? " ci-cd-build-controls__btn--active" : ""}`}
            style={
              runtime.toolType === t.value
                ? { borderColor: t.color, color: t.color }
                : undefined
            }
            onClick={() => sync(() => dispatch(setToolType(t.value)))}
          >
            {t.label}
          </button>
        ))}
      </div>

      <span className="ci-cd-build-controls__sep" />

      <div className="ci-cd-build-controls__group">
        <span className="ci-cd-build-controls__legend">Scenario</span>
        {SCENARIOS.map((s) => (
          <button
            key={s.value}
            className={`ci-cd-build-controls__btn${runtime.scenario === s.value ? " ci-cd-build-controls__btn--active" : ""}`}
            onClick={() => sync(() => dispatch(setScenario(s.value)))}
          >
            {s.label}
          </button>
        ))}
      </div>

      <span className="ci-cd-build-controls__sep" />

      <div className="ci-cd-build-controls__group">
        <span className="ci-cd-build-controls__legend">Packages</span>
        <input
          type="range"
          className="ci-cd-build-controls__slider"
          min={3}
          max={6}
          value={runtime.packageCount}
          onChange={(e) =>
            sync(() => dispatch(setPackageCount(Number(e.target.value))))
          }
        />
        <span className="ci-cd-build-controls__legend">
          {runtime.packageCount}
        </span>
      </div>
    </div>
  );
};

export default CiCdBuildControls;
