
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState } from '../store/store';
import { nextStep, incrementPass, resetSimulation, selectNeuron } from '../store/slices/simulationSlice';
import type { ModelPlugin, ModelStep } from '../types/ModelPlugin';
import StepIndicator from './StepIndicator/StepIndicator';
import NeuronDetail from './NeuronDetail';

interface ShellProps {
  plugin: ModelPlugin;
}

// Helper to normalize steps to objects
const normalizeSteps = (steps: (string | ModelStep)[]): ModelStep[] => {
    return steps.map(s => typeof s === 'string' ? { label: s, autoAdvance: false } : s);
};

const Shell: React.FC<ShellProps> = ({ plugin }) => {
  const dispatch = useDispatch();
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
        <h1>{plugin.name}</h1>
        <p>{plugin.description}</p>
      </header>

      <div className="main-content">
        <StepIndicator
          steps={steps.map(s => s.label)}
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
              color: steps[currentStep]?.nextButtonColor
          }}
          restartButtonConfig={plugin.restartConfig}
        />
        
        <div className="visualization-container">
           <plugin.Component 
             onAnimationComplete={handleAnimationComplete}
           />
        </div>
      </div>

      {simulationState.selectedNeuron && (
        <NeuronDetail
          data={simulationState.selectedNeuron}
          onClose={() => dispatch(selectNeuron(null))}
        />
      )}
    </div>
  );
};

export default Shell;
