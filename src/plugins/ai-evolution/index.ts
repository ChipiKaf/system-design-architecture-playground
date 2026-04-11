import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import AiEvolutionVisualization from "./main";
import aiEvolutionReducer, {
  type AiEvolutionState,
  initialState,
  reset,
} from "./aiEvolutionSlice";

type LocalRootState = { aiEvolution: AiEvolutionState };

const AiEvolutionPlugin: DemoPlugin<
  AiEvolutionState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "ai-evolution",
  name: "AI Architecture Evolution",
  description:
    "From traditional ML feature pipelines to Generative AI — data pre-processing, prompt engineering, foundation models, and deployment.",
  initialState,
  reducer: aiEvolutionReducer,
  Component: AiEvolutionVisualization,
  restartConfig: { text: "Replay", color: "#1e40af" },
  getSteps: (_: AiEvolutionState): DemoStep[] => [
    { label: "Overview", autoAdvance: false, nextButtonText: "Begin" },
    {
      label: "Traditional ML Pipeline",
      autoAdvance: false,
      processingText: "Highlighting…",
    },
    {
      label: "Data Pre-processing",
      autoAdvance: false,
      processingText: "Highlighting…",
    },
    {
      label: "Prompt Engineering / Fine-tuning",
      autoAdvance: false,
      processingText: "Highlighting…",
    },
    {
      label: "Foundation / Fine-tuned LLMs",
      autoAdvance: false,
      processingText: "Highlighting…",
    },
    {
      label: "Deployment & Monitoring",
      autoAdvance: false,
      processingText: "Highlighting…",
    },
    {
      label: "Traditional vs Generative",
      autoAdvance: false,
      processingText: "Comparing…",
    },
    { label: "Summary", autoAdvance: false },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.aiEvolution,
};

export default AiEvolutionPlugin;
