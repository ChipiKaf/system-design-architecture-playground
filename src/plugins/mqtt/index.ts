import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import MqttVisualization from "./main";
import MqttControls from "./controls";
import mqttReducer, { type MqttState, initialState, reset } from "./mqttSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { mqtt: MqttState };

const MqttPlugin: DemoPlugin<
  MqttState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "mqtt",
  name: "MQTT",
  description:
    "Explore how MQTT routes messages from publishers to subscribers using topic hierarchies, wildcards (+/#), and QoS levels.",
  initialState,
  reducer: mqttReducer,
  Component: MqttVisualization,
  Controls: MqttControls,
  restartConfig: { text: "Replay", color: "#7c3aed" },
  getSteps: (state: MqttState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.mqtt,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default MqttPlugin;
