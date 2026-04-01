import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { type RootState } from "../store/store";
import {
  nextStep,
  incrementPass,
  resetSimulation,
} from "../store/slices/simulationSlice";
import type { DemoPlugin, DemoStep } from "../types/ModelPlugin";
import type { PluginCategory } from "../registry";
import StepIndicator from "./StepIndicator/StepIndicator";

interface ShellProps {
  plugin: DemoPlugin;
  category: PluginCategory;
}

// Helper to normalize steps to objects
const normalizeSteps = (steps: (string | DemoStep)[]): DemoStep[] => {
  return steps.map((s) =>
    typeof s === "string" ? { label: s, autoAdvance: false } : s,
  );
};

const Shell: React.FC<ShellProps> = ({ plugin, category }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const simulationState = useSelector((state: RootState) => state.simulation);

  // Use the plugin's selector to get its specific state
  const modelState = useSelector(plugin.selector);

  React.useEffect(() => {
    // Reset shared simulation state (step 0, pass 0)
    dispatch(resetSimulation());
    // Initialize the plugin on mount
    plugin.init(dispatch);
  }, [dispatch, plugin]);

  const rawSteps = plugin.getSteps(modelState);
  const steps = normalizeSteps(rawSteps);
  const { currentStep, passCount } = simulationState;

  // Track if the current step is actively processing (animating)
  // Default to true when entering a step, release when animation completes
  const [isProcessing, setIsProcessing] = React.useState(true);

  // Reset processing state when step changes
  React.useEffect(() => {
    setIsProcessing(true);
  }, [currentStep]);

  const handleAnimationComplete = () => {
    const currentConfig = steps[currentStep];

    // If autoAdvance is true, proceed automatically.
    // Otherwise, unlock the "Next" button (isProcessing = false).
    if (currentConfig?.autoAdvance) {
      dispatch(nextStep(steps.length));
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__nav">
          <button
            className="app-header__back"
            onClick={() => navigate("/")}
            title="Back to topics"
          >
            ←
          </button>

          <div className="app-header__text">
            <div className="app-header__breadcrumb">
              <span
                className="app-header__category"
                style={{ color: category.accent }}
              >
                {category.name}
              </span>
              {category.plugins.length > 1 && (
                <>
                  <span className="app-header__sep">/</span>
                  <select
                    className="app-header__select"
                    value={plugin.id}
                    onChange={(e) =>
                      navigate(`/${category.id}/${e.target.value}`)
                    }
                  >
                    {category.plugins.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {category.plugins.length <= 1 && (
                <>
                  <span className="app-header__sep">/</span>
                  <span className="app-header__plugin-name">{plugin.name}</span>
                </>
              )}
            </div>
            <p>{plugin.description}</p>
          </div>
        </div>
      </header>

      <div className="main-content">
        <StepIndicator
          steps={steps.map((s) => s.label)}
          currentStep={currentStep}
          onNextStep={() => dispatch(nextStep(steps.length))}
          onReset={() => {
            dispatch(resetSimulation());
            dispatch(incrementPass());
          }}
          passCount={passCount}
          // Button is disabled if processing (waiting for anim)
          isProcessing={isProcessing}
          nextButtonConfig={{
            text: steps[currentStep]?.nextButtonText,
            processingText: steps[currentStep]?.processingText,
            color: steps[currentStep]?.nextButtonColor,
          }}
          restartButtonConfig={plugin.restartConfig}
        />

        <div className="visualization-container">
          <plugin.Component onAnimationComplete={handleAnimationComplete} />
        </div>
      </div>
    </div>
  );
};

export default Shell;
