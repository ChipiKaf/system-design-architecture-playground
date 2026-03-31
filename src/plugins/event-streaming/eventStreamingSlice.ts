import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface Partition {
  id: number;
  events: EventMessage[];
}

export interface EventMessage {
  id: string;
  key: string;
  assignedPartition: number;
  consumedBy: string | null;
}

export interface ConsumerInstance {
  id: string;
  groupId: string;
  assignedPartitions: number[];
  processedCount: number;
  missedCount: number;
}

export interface ConsumerGroup {
  id: string;
  label: string;
  pattern: "load-balanced" | "fan-out";
  instances: ConsumerInstance[];
}

export interface EventStreamingState {
  partitionCount: number;
  partitions: Partition[];
  publishedEvents: EventMessage[];
  consumerGroups: ConsumerGroup[];
  adapterType: "default" | "production";
  streamingEnabled: boolean;
  lastPublishedEvent: EventMessage | null;
  offlineBroadcastIds: string[];
}

const PARTITION_COUNT = 3;

const makePartitions = (n: number): Partition[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, events: [] }));

const hashKey = (key: string, n: number): number => {
  let h = 0;
  for (let i = 0; i < key.length; i++)
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  return Math.abs(h) % n;
};

export const initialState: EventStreamingState = {
  partitionCount: PARTITION_COUNT,
  partitions: makePartitions(PARTITION_COUNT),
  publishedEvents: [],
  consumerGroups: [
    {
      id: "store-workers",
      label: "Store Workers",
      pattern: "load-balanced",
      instances: [
        {
          id: "worker-0",
          groupId: "store-workers",
          assignedPartitions: [0],
          processedCount: 0,
          missedCount: 0,
        },
        {
          id: "worker-1",
          groupId: "store-workers",
          assignedPartitions: [1],
          processedCount: 0,
          missedCount: 0,
        },
        {
          id: "worker-2",
          groupId: "store-workers",
          assignedPartitions: [2],
          processedCount: 0,
          missedCount: 0,
        },
      ],
    },
    {
      id: "broadcast",
      label: "Broadcast",
      pattern: "fan-out",
      instances: [
        {
          id: "broadcast-0",
          groupId: "broadcast",
          assignedPartitions: [0, 1, 2],
          processedCount: 0,
          missedCount: 0,
        },
        {
          id: "broadcast-1",
          groupId: "broadcast",
          assignedPartitions: [0, 1, 2],
          processedCount: 0,
          missedCount: 0,
        },
      ],
    },
  ],
  adapterType: "default",
  streamingEnabled: true,
  lastPublishedEvent: null,
  offlineBroadcastIds: [],
};

const eventStreamingSlice = createSlice({
  name: "eventStreaming",
  initialState,
  reducers: {
    publishEvent(state, action: PayloadAction<{ key: string }>) {
      const pId = hashKey(action.payload.key, state.partitionCount);
      const evt: EventMessage = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        key: action.payload.key,
        assignedPartition: pId,
        consumedBy: null,
      };
      state.partitions[pId].events.push(evt);
      state.publishedEvents.push(evt);
      state.lastPublishedEvent = evt;
    },
    consumeStoreWorker(state) {
      const group = state.consumerGroups.find((g) => g.id === "store-workers");
      if (!group) return;
      for (const inst of group.instances) {
        for (const pId of inst.assignedPartitions) {
          const unconsumed = state.partitions[pId].events.find(
            (e) => e.consumedBy === null,
          );
          if (unconsumed) {
            unconsumed.consumedBy = inst.id;
            inst.processedCount += 1;
            // Remove consumed event from partition so count decreases
            const idx = state.partitions[pId].events.indexOf(unconsumed);
            if (idx !== -1) state.partitions[pId].events.splice(idx, 1);
          }
        }
      }
    },
    // Consume ALL unconsumed events from every partition (used by burst)
    consumeAllStoreWorkers(state) {
      const group = state.consumerGroups.find((g) => g.id === "store-workers");
      if (!group) return;
      for (const inst of group.instances) {
        for (const pId of inst.assignedPartitions) {
          let unconsumed = state.partitions[pId].events.find(
            (e) => e.consumedBy === null,
          );
          while (unconsumed) {
            unconsumed.consumedBy = inst.id;
            inst.processedCount += 1;
            const idx = state.partitions[pId].events.indexOf(unconsumed);
            if (idx !== -1) state.partitions[pId].events.splice(idx, 1);
            unconsumed = state.partitions[pId].events.find(
              (e) => e.consumedBy === null,
            );
          }
        }
      }
    },
    consumeBroadcast(state) {
      const group = state.consumerGroups.find((g) => g.id === "broadcast");
      if (!group || !state.lastPublishedEvent) return;
      for (const inst of group.instances) {
        if (state.offlineBroadcastIds.includes(inst.id)) {
          inst.missedCount += 1;
        } else {
          inst.processedCount += 1;
        }
      }
    },
    toggleBroadcastOffline(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.offlineBroadcastIds.indexOf(id);
      if (idx >= 0) {
        state.offlineBroadcastIds.splice(idx, 1);
      } else {
        state.offlineBroadcastIds.push(id);
      }
    },
    catchUpBroadcast(state, action: PayloadAction<string>) {
      const group = state.consumerGroups.find((g) => g.id === "broadcast");
      if (!group) return;
      const inst = group.instances.find((i) => i.id === action.payload);
      if (!inst) return;
      inst.processedCount += inst.missedCount;
      inst.missedCount = 0;
    },
    setAdapterType(state, action: PayloadAction<"default" | "production">) {
      state.adapterType = action.payload;
    },
    toggleStreaming(state) {
      state.streamingEnabled = !state.streamingEnabled;
    },
    reset() {
      return initialState;
    },
  },
});

export const {
  publishEvent,
  consumeStoreWorker,
  consumeAllStoreWorkers,
  consumeBroadcast,
  toggleBroadcastOffline,
  catchUpBroadcast,
  setAdapterType,
  toggleStreaming,
  reset,
} = eventStreamingSlice.actions;
export default eventStreamingSlice.reducer;
