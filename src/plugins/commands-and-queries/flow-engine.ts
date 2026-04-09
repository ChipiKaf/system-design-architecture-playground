import type { CommandsQueriesState } from "./commandsQueriesSlice";
import { getAdapter } from "./pattern-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

export type FlowBeat = GenericFlowBeat<CommandsQueriesState>;
export type StepDef = GenericStepDef<CommandsQueriesState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<CommandsQueriesState>;

export function expandToken(
  token: string,
  state: CommandsQueriesState,
): string[] {
  const result = getAdapter(state.pattern).expandToken(token, state);
  if (result !== null) return result;
  return [token];
}

export type StepKey =
  | "overview"
  | "client-command"
  | "route-command"
  | "commit-write"
  | "publish-event"
  | "project-consume"
  | "refresh-view"
  | "replay-events"
  | "client-query"
  | "route-query"
  | "query-read"
  | "return-response"
  | "summary";

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Send Command",
    action: "resetRun",
    phase: "overview",
    finalHotZones: (state) =>
      getAdapter(state.pattern).getOverviewHotZones(state),
    explain: (state) => getAdapter(state.pattern).getOverviewExplanation(state),
  },
  {
    key: "client-command",
    label: "Client Sends Command",
    processingText: "Submitting command...",
    nextButton: "Route Command",
    nextButtonColor: "#38bdf8",
    phase: "command-ingress",
    flow: (state) =>
      getAdapter(state.pattern).getStepFlows("client-command", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("client-command", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("client-command", state),
  },
  {
    key: "route-command",
    label: "Gateway Routes Command",
    processingText: "Routing command...",
    nextButton: "Commit Write",
    nextButtonColor: "#38bdf8",
    phase: "command-route",
    flow: (state) =>
      getAdapter(state.pattern).getStepFlows("route-command", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("route-command", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("route-command", state),
  },
  {
    key: "commit-write",
    label: "Write Model Commits",
    processingText: "Committing write...",
    nextButton: "Publish Event",
    nextButtonColor: "#38bdf8",
    phase: "command-write",
    flow: (state) =>
      getAdapter(state.pattern).getStepFlows("commit-write", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("commit-write", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("commit-write", state),
  },
  {
    key: "publish-event",
    label: "Write Model Publishes Event",
    processingText: "Publishing event...",
    nextButton: "Projector Consumes Event",
    nextButtonColor: "#f59e0b",
    phase: "event-publish",
    flow: (state) =>
      getAdapter(state.pattern).getStepFlows("publish-event", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("publish-event", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("publish-event", state),
  },
  {
    key: "project-consume",
    label: "Projector Consumes Event",
    processingText: "Projecting update...",
    nextButton: "Refresh View",
    nextButtonColor: "#f59e0b",
    phase: "projection-consume",
    flow: (state) =>
      getAdapter(state.pattern).getStepFlows("project-consume", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("project-consume", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("project-consume", state),
  },
  {
    key: "refresh-view",
    label: "Materialized View Refreshes",
    processingText: "Refreshing view...",
    nextButton: (state) =>
      state.pattern === "event-sourcing" ? "Replay Events" : "Send Query",
    nextButtonColor: "#f59e0b",
    phase: "projection-refresh",
    flow: (state) =>
      getAdapter(state.pattern).getStepFlows("refresh-view", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("refresh-view", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("refresh-view", state),
  },
  {
    key: "replay-events",
    label: "Replay Events to Rebuild View",
    processingText: "Replaying events...",
    nextButton: "Send Query",
    nextButtonColor: "#94a3b8",
    phase: "replay",
    when: (state) => state.pattern === "event-sourcing",
    flow: (state) =>
      getAdapter(state.pattern).getStepFlows("replay-events", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("replay-events", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("replay-events", state),
  },
  {
    key: "client-query",
    label: "Client Sends Query",
    processingText: "Submitting query...",
    nextButton: "Route Query",
    nextButtonColor: "#22c55e",
    phase: "query-ingress",
    flow: (state) =>
      getAdapter(state.pattern).getStepFlows("client-query", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("client-query", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("client-query", state),
  },
  {
    key: "route-query",
    label: "Gateway Routes Query",
    processingText: "Routing query...",
    nextButton: "Read Local View",
    nextButtonColor: "#22c55e",
    phase: "query-route",
    flow: (state) =>
      getAdapter(state.pattern).getStepFlows("route-query", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("route-query", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("route-query", state),
  },
  {
    key: "query-read",
    label: "Query Reads Local View",
    processingText: "Reading materialized view...",
    nextButton: "Return Response",
    nextButtonColor: "#22c55e",
    phase: "query-read",
    flow: (state) =>
      getAdapter(state.pattern).getStepFlows("query-read", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("query-read", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("query-read", state),
  },
  {
    key: "return-response",
    label: "Return Denormalized Response",
    processingText: "Returning response...",
    nextButton: "Takeaway",
    nextButtonColor: "#22c55e",
    phase: "query-response",
    flow: (state) =>
      getAdapter(state.pattern).getStepFlows("return-response", state),
    finalHotZones: (state) =>
      getAdapter(state.pattern).getStepHotZones("return-response", state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("return-response", state),
  },
  {
    key: "summary",
    label: "Takeaway",
    phase: "summary",
    finalHotZones: (state) =>
      getAdapter(state.pattern).getOverviewHotZones(state),
    explain: (state) =>
      getAdapter(state.pattern).getStepExplanation("summary", state),
  },
];

export function buildSteps(state: CommandsQueriesState): TaggedStep[] {
  return genericBuildSteps(STEPS, state, {
    reorder: (steps, currentState) =>
      getAdapter(currentState.pattern).reorderSteps(steps, currentState),
    relabel: (step, currentState) =>
      getAdapter(currentState.pattern).relabelStep(step, currentState),
  });
}

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
