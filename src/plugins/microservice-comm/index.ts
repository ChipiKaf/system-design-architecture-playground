import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import MicroserviceCommVisualization from "./main";
import MicroserviceCommControls from "./controls";
import microserviceCommReducer, {
  type MicroserviceCommState,
  initialState,
  reset,
} from "./microserviceCommSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { microserviceComm: MicroserviceCommState };

const MicroserviceCommPlugin: DemoPlugin<
  MicroserviceCommState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "microservice-comm",
  name: "Communication Protocols Lab",
  description:
    "Compare communication protocols — HTTP/REST, gRPC, GraphQL (sync) vs AMQP, MQTT, Kafka (async). See how coupling, latency, AWS services, and flow differ.",
  initialState,
  reducer: microserviceCommReducer,
  Component: MicroserviceCommVisualization,
  Controls: MicroserviceCommControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: MicroserviceCommState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.microserviceComm,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default MicroserviceCommPlugin;
