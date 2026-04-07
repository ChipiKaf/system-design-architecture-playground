import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type DistributionStrategy =
  | "round-robin"
  | "least-connections"
  | "random"
  | "ip-hash"
  | "weighted-round-robin";

export interface ServerNode {
  id: string;
  label: string;
  connections: number;
  isActive: boolean;
  weight: number;
}

export interface ClientNode {
  id: string;
  label: string;
  ip: string;
  color: string;
}

export interface Request {
  id: string;
  clientId: string;
  clientLabel: string;
  clientIp: string;
  assignedServer: string | null;
  reusedSession: boolean;
  routingReason: string;
  sequence: number;
}

export interface SessionAssignment {
  sessionId: string;
  serverId: string;
}

export interface LoadBalancerState {
  strategy: DistributionStrategy;
  stickySessions: boolean;
  servers: ServerNode[];
  clients: ClientNode[];
  requests: Request[];
  sessionMap: Record<string, SessionAssignment>;
  nextServerIndex: number;
  nextWeightedIndex: number;
  requestCounter: number;
}

const hashString = (input: string) => {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
};

const buildWeightedSchedule = (servers: ServerNode[]) => {
  const maxWeight = Math.max(...servers.map((server) => server.weight));
  const schedule: ServerNode[] = [];

  for (let round = 0; round < maxWeight; round += 1) {
    for (const server of servers) {
      if (server.weight > round) {
        schedule.push(server);
      }
    }
  }

  return schedule;
};

const defaultClients: ClientNode[] = [
  { id: "client-a", label: "Client A", ip: "10.0.0.21", color: "#0ea5e9" },
  { id: "client-b", label: "Client B", ip: "10.0.0.44", color: "#8b5cf6" },
  { id: "client-c", label: "Client C", ip: "10.0.0.78", color: "#f59e0b" },
  { id: "client-d", label: "Client D", ip: "10.0.0.115", color: "#10b981" },
];

export const initialState: LoadBalancerState = {
  strategy: "round-robin",
  stickySessions: false,
  servers: [
    {
      id: "server-1",
      label: "Server 1",
      connections: 0,
      isActive: true,
      weight: 5,
    },
    {
      id: "server-2",
      label: "Server 2",
      connections: 0,
      isActive: true,
      weight: 3,
    },
    {
      id: "server-3",
      label: "Server 3",
      connections: 0,
      isActive: true,
      weight: 1,
    },
  ],
  clients: defaultClients,
  requests: [],
  sessionMap: {},
  nextServerIndex: 0,
  nextWeightedIndex: 0,
  requestCounter: 0,
};

const removeSessionsForServer = (
  state: LoadBalancerState,
  serverId: string,
) => {
  Object.entries(state.sessionMap).forEach(([clientId, session]) => {
    if (session.serverId === serverId) {
      delete state.sessionMap[clientId];
    }
  });
};

const sessionIdForClient = (clientId: string) => {
  const suffix = clientId.startsWith("client-")
    ? clientId.slice("client-".length)
    : clientId;

  return `sess-${suffix}`;
};

const loadBalancerSlice = createSlice({
  name: "loadBalancer",
  initialState,
  reducers: {
    setStrategy(state, action: PayloadAction<DistributionStrategy>) {
      state.strategy = action.payload;
      state.nextServerIndex = 0;
      state.nextWeightedIndex = 0;
    },
    setStickySessions(state, action: PayloadAction<boolean>) {
      state.stickySessions = action.payload;

      if (!action.payload) {
        state.sessionMap = {};
      }
    },
    dispatchRequest(
      state,
      action: PayloadAction<{ clientId?: string } | undefined>,
    ) {
      const activeServers = state.servers.filter((s) => s.isActive);
      if (activeServers.length === 0) {
        return;
      }

      const fallbackClient =
        state.clients[state.requestCounter % state.clients.length];
      const targetClient = action.payload?.clientId
        ? state.clients.find((client) => client.id === action.payload?.clientId)
        : undefined;
      const client = targetClient ?? fallbackClient;

      let target: ServerNode | undefined;
      let reusedSession = false;
      let routingReason = "";

      if (state.stickySessions) {
        const session = state.sessionMap[client.id];
        const pinnedServer = session
          ? activeServers.find((server) => server.id === session.serverId)
          : undefined;

        if (session && pinnedServer) {
          target = pinnedServer;
          reusedSession = true;
          routingReason = `Sticky session ${session.sessionId} keeps ${client.label} on ${pinnedServer.label}.`;
        } else if (session) {
          delete state.sessionMap[client.id];
        }
      }

      if (!target) {
        if (state.strategy === "round-robin") {
          target = activeServers[state.nextServerIndex % activeServers.length];
          state.nextServerIndex =
            (state.nextServerIndex + 1) % activeServers.length;
          routingReason = `Round robin picks ${target.label} next in the rotation.`;
        } else if (state.strategy === "least-connections") {
          target = activeServers.reduce(
            (min, server) =>
              server.connections < min.connections ? server : min,
            activeServers[0],
          );
          routingReason = `${target.label} has the fewest active connections (${target.connections}).`;
        } else if (state.strategy === "ip-hash") {
          const hashValue = hashString(client.ip);
          const targetIndex = hashValue % activeServers.length;

          target = activeServers[targetIndex];
          routingReason = `IP hash routes ${client.ip}: ${hashValue} mod ${activeServers.length} -> ${target.label}.`;
        } else if (state.strategy === "weighted-round-robin") {
          const schedule = buildWeightedSchedule(activeServers);
          const totalWeight = activeServers.reduce(
            (sum, server) => sum + server.weight,
            0,
          );

          target = schedule[state.nextWeightedIndex % schedule.length];
          state.nextWeightedIndex =
            (state.nextWeightedIndex + 1) % schedule.length;
          routingReason = `Weighted round robin favors ${target.label} because it owns ${target.weight} of ${totalWeight} capacity slots.`;
        } else {
          target =
            activeServers[Math.floor(Math.random() * activeServers.length)];
          routingReason = `Random routing sends this request to ${target.label}.`;
        }
      }

      if (!target) {
        return;
      }

      if (state.stickySessions && !reusedSession) {
        const sessionId = sessionIdForClient(client.id);

        state.sessionMap[client.id] = {
          sessionId,
          serverId: target.id,
        };
        routingReason = `${routingReason} Created ${sessionId} for ${client.label}.`;
      }

      const req: Request = {
        id: `req-${state.requestCounter + 1}`,
        clientId: client.id,
        clientLabel: client.label,
        clientIp: client.ip,
        assignedServer: target.id,
        reusedSession,
        routingReason,
        sequence: state.requestCounter + 1,
      };
      state.requests.push(req);
      state.requestCounter += 1;

      const server = state.servers.find((s) => s.id === target.id);
      if (server) {
        server.connections += 1;
      }
    },
    releaseConnections(state) {
      state.servers.forEach((server) => {
        server.connections = 0;
      });
      state.requests = [];
      state.sessionMap = {};
      state.nextServerIndex = 0;
      state.nextWeightedIndex = 0;
      state.requestCounter = 0;
    },
    toggleServer(state, action: PayloadAction<string>) {
      const server = state.servers.find((s) => s.id === action.payload);
      if (!server) {
        return;
      }

      server.isActive = !server.isActive;

      if (!server.isActive) {
        server.connections = 0;
        removeSessionsForServer(state, server.id);
      }

      state.nextServerIndex = 0;
      state.nextWeightedIndex = 0;
    },
  },
});

export const {
  setStrategy,
  setStickySessions,
  dispatchRequest,
  releaseConnections,
  toggleServer,
} = loadBalancerSlice.actions;
export default loadBalancerSlice.reducer;
