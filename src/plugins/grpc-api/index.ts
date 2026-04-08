import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import GrpcApiVisualization from "./main";
import GrpcApiControls from "./controls";
import grpcApiReducer, {
  type GrpcApiState,
  initialState,
  reset,
} from "./grpcApiSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { grpcApi: GrpcApiState };

const GrpcApiPlugin: DemoPlugin<
  GrpcApiState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "grpc-api",
  name: "gRPC API Lab",
  description:
    "Explore unary, server-streaming, client-streaming, and bidirectional gRPC calls. See protobuf contracts, HTTP/2 transport, deadlines, metadata, and why gRPC is a strong fit for internal microservice communication.",
  initialState,
  reducer: grpcApiReducer,
  Component: GrpcApiVisualization,
  Controls: GrpcApiControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: GrpcApiState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.grpcApi,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default GrpcApiPlugin;
