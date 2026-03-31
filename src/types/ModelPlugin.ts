import React from "react";
import type { Reducer, Action } from "@reduxjs/toolkit";

export interface DemoPluginComponentProps {
  onAnimationComplete?: () => void;
}

export interface DemoPlugin<
  State = any,
  Actions extends Action = any,
  TRootState = any,
  TDispatch = any,
> {
  id: string;
  name: string;
  description: string;

  // State Management
  initialState: State;
  reducer: Reducer<State, Actions>;

  // Rendering
  Component: React.FC<DemoPluginComponentProps>;
  Controls?: React.FC; // Optional settings panel

  // Customization
  restartConfig?: {
    text?: string;
    color?: string;
  };

  getSteps: (state: State) => (string | DemoStep)[];

  // Lifecycle & Data Access
  init: (dispatch: TDispatch) => void;
  selector: (state: TRootState) => State;
}

export interface DemoStep {
  label: string;
  /**
   * If true, the shell will automatically proceed to the next step
   * after this step's animation/action is complete, without waiting for user input.
   * Default: false (Requires "Next Step" button press)
   */
  autoAdvance?: boolean;

  // Customization for the "Next Step" button
  /** Text to display on the button when waiting for user input. Default: "Next Step" */
  nextButtonText?: string;
  /** Text to display on the button while processing/animating. Default: "Processing..." */
  processingText?: string;
  /** Background color of the button. Can be a CSS color string. Default: Theme blue */
  nextButtonColor?: string;
}
