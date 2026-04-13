import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import AuroraPostgresVisualization from "./main";
import AuroraPostgresControls from "./controls";
import auroraPostgresReducer, {
  type AuroraPostgresState,
  initialState,
  reset,
} from "./auroraPostgresSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { auroraPostgres: AuroraPostgresState };

const AuroraPostgresPlugin: DemoPlugin<
  AuroraPostgresState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "aurora-postgres",
  name: "Aurora PostgreSQL for Insurance",
  description:
    "Why PostgreSQL? Why Aurora? How insurance claims and policies map to relational schema.",
  initialState,
  reducer: auroraPostgresReducer,
  Component: AuroraPostgresVisualization,
  Controls: AuroraPostgresControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: AuroraPostgresState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.auroraPostgres,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default AuroraPostgresPlugin;
