import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type DistributionStrategy =
  | "round-robin"
  | "least-connections"
  | "random";

export interface ServerNode {
  id: string;
  label: string;
  connections: number;
  isActive: boolean;
}

export interface Request {
  id: string;
  assignedServer: string | null;
}

export interface LoadBalancerState {
  strategy: DistributionStrategy;
  servers: ServerNode[];
  requests: Request[];
  nextServerIndex: number;
}

export const initialState: LoadBalancerState = {
  strategy: "round-robin",
  servers: [
    { id: "server-1", label: "Server 1", connections: 0, isActive: true },
    { id: "server-2", label: "Server 2", connections: 0, isActive: true },
    { id: "server-3", label: "Server 3", connections: 0, isActive: true },
  ],
  requests: [],
  nextServerIndex: 0,
};

const loadBalancerSlice = createSlice({
  name: "loadBalancer",
  initialState,
  reducers: {
    setStrategy(state, action: PayloadAction<DistributionStrategy>) {
      state.strategy = action.payload;
    },
    dispatchRequest(state) {
      const activeServers = state.servers.filter((s) => s.isActive);
      if (activeServers.length === 0) return;

      let target: ServerNode;

      if (state.strategy === "round-robin") {
        target = activeServers[state.nextServerIndex % activeServers.length];
        state.nextServerIndex =
          (state.nextServerIndex + 1) % activeServers.length;
      } else if (state.strategy === "least-connections") {
        target = activeServers.reduce(
          (min, s) => (s.connections < min.connections ? s : min),
          activeServers[0],
        );
      } else {
        target =
          activeServers[Math.floor(Math.random() * activeServers.length)];
      }

      const req: Request = {
        id: `req-${Date.now()}`,
        assignedServer: target.id,
      };
      state.requests.push(req);

      const server = state.servers.find((s) => s.id === target.id);
      if (server) server.connections += 1;
    },
    releaseConnections(state) {
      state.servers.forEach((s) => {
        s.connections = 0;
      });
      state.requests = [];
      state.nextServerIndex = 0;
    },
    toggleServer(state, action: PayloadAction<string>) {
      const server = state.servers.find((s) => s.id === action.payload);
      if (server) server.isActive = !server.isActive;
    },
    reset() {
      return initialState;
    },
  },
});

export const {
  setStrategy,
  dispatchRequest,
  releaseConnections,
  toggleServer,
  reset,
} = loadBalancerSlice.actions;
export default loadBalancerSlice.reducer;
