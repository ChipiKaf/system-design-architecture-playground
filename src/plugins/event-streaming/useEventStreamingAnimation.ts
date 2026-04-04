import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import {
  publishEvent,
  consumeStoreWorker,
  consumeAllStoreWorkers,
  consumeBroadcast,
  catchUpBroadcast,
  type EventStreamingState,
} from "./eventStreamingSlice";

const KEYS = ["user-1", "user-2", "user-3", "order-A", "order-B", "session-X"];
const randomKey = () => KEYS[Math.floor(Math.random() * KEYS.length)];

// Duplicate of slice's hashKey so we can pre-compute partition assignments
const hashKey = (key: string, n: number): number => {
  let h = 0;
  for (let i = 0; i < key.length; i++)
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  return Math.abs(h) % n;
};

export type AnimPhase =
  | "idle"
  | "producing"
  | "partitioning"
  | "consuming-workers"
  | "consuming-broadcast"
  | "burst"
  | "summary";

export type Signal = { id: string } & SignalOverlayParams;

export const useEventStreamingAnimation = (
  onAnimationComplete?: () => void,
) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const streaming = useSelector(
    (state: RootState) => state.eventStreaming,
  ) as EventStreamingState;
  const [animPhase, setAnimPhase] = useState<AnimPhase>("idle");
  const [signals, setSignals] = useState<Signal[]>([]);
  const rafRef = useRef<number>(undefined!);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined!);
  // Balls that should persist visually across step transitions
  const persistedDsRef = useRef<Signal[]>([]);
  // Track previous offline IDs to detect online transitions
  const prevOfflineIdsRef = useRef<string[]>([]);
  const streamingRef = useRef(streaming);
  const onAnimationCompleteRef = useRef(onAnimationComplete);

  streamingRef.current = streaming;
  onAnimationCompleteRef.current = onAnimationComplete;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(timerRef.current);
  }, []);

  // Animate a chain of signal hops sequentially using the vizcraft chain overlay API.
  const animateSignalChain = useCallback(
    (
      hops: { from: string; to: string }[],
      durationPerHop: number,
      onDone: () => void,
      options?: { keepFinal?: boolean; extra?: Signal[] },
    ) => {
      const extra = options?.extra ?? [];
      const totalDuration = hops.length * durationPerHop;
      const sigId = `chain-${hops[0]?.from}-${hops[hops.length - 1]?.to}`;
      const startTime = performance.now();

      const step = (now: number) => {
        const rawP = Math.min((now - startTime) / totalDuration, 1);
        const progress = rawP * hops.length;
        setSignals([
          ...extra,
          { id: sigId, chain: hops, progress, magnitude: 1 },
        ]);
        if (rawP < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          if (options?.keepFinal) {
            const last = hops[hops.length - 1];
            setSignals([
              ...extra,
              {
                id: sigId,
                chain: hops,
                progress: hops.length,
                magnitude: 1,
                resting: true,
                parkAt: last.to,
              },
            ]);
          } else {
            setSignals([...extra]);
          }
          onDone();
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [],
  );

  // Animate parallel signals (multiple balls at once, e.g. broker → all workers)
  const animateSignalsParallel = useCallback(
    (
      pairs: { from: string; to: string }[],
      duration: number,
      onDone: () => void,
      options?: { keepFinal?: boolean; extra?: Signal[] },
    ) => {
      const extra = options?.extra ?? [];
      const start = performance.now();
      const sigs = pairs.map((pair, i) => ({
        id: `sig-par-${i}`,
        from: pair.from,
        to: pair.to,
        progress: 0,
      }));

      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setSignals([...extra, ...sigs.map((s) => ({ ...s, progress: p }))]);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          if (!options?.keepFinal) setSignals([...extra]);
          onDone();
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [],
  );

  // Catch-up animation: fires when a broadcast instance transitions offline → online
  useEffect(() => {
    const prev = prevOfflineIdsRef.current;
    const curr = streaming.offlineBroadcastIds;
    const comingOnline = prev.filter((id) => !curr.includes(id));
    prevOfflineIdsRef.current = [...curr];
    if (comingOnline.length === 0) return;

    for (const instId of comingOnline) {
      const inst = streaming.consumerGroups[1].instances.find(
        (i) => i.id === instId,
      );
      if (!inst || inst.missedCount === 0) {
        dispatch(catchUpBroadcast(instId));
        continue;
      }

      const count = Math.min(inst.missedCount, 3);
      let ball = 0;
      const sigId = `catchup-${instId}`;
      const clientPairs = [0, 1].map((clientIndex) => ({
        from: instId,
        to: `${instId}-client-${clientIndex}`,
      }));

      const animNext = () => {
        if (ball >= count) {
          dispatch(catchUpBroadcast(instId));
          setSignals((prev) => prev.filter((s) => s.id !== sigId));
          return;
        }

        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min((now - start) / 500, 1);
          setSignals((prev) => [
            ...prev.filter((s) => s.id !== sigId),
            {
              id: sigId,
              from: "broker",
              to: instId,
              progress: p,
              magnitude: 1,
            },
          ]);
          if (p < 1) {
            rafRef.current = requestAnimationFrame(step);
          } else {
            animateSignalsParallel(
              clientPairs,
              250,
              () => {
                ball++;
                timerRef.current = setTimeout(animNext, 100);
              },
              { extra: [] },
            );
          }
        };
        rafRef.current = requestAnimationFrame(step);
      };

      animNext();
    }
  }, [
    animateSignalsParallel,
    dispatch,
    streaming.consumerGroups,
    streaming.offlineBroadcastIds,
  ]);

  useEffect(() => {
    cleanup();
    const currentStreaming = streamingRef.current;

    // Step 0: Overview
    if (currentStep === 0) {
      setAnimPhase("idle");
      const allPersisted = [...persistedDsRef.current];
      setSignals(allPersisted);
      setTimeout(() => onAnimationCompleteRef.current?.(), 0);
      return cleanup;
    }

    // Step 1: Produce — ball travels Producer → Dispatcher → Adapter → Broker
    if (currentStep === 1) {
      const carried = [...persistedDsRef.current];
      setSignals(carried);
      dispatch(publishEvent({ key: randomKey() }));
      setAnimPhase("producing");
      animateSignalChain(
        [
          { from: "producer", to: "dispatcher" },
          { from: "dispatcher", to: "adapter" },
          { from: "adapter", to: "broker" },
        ],
        500,
        () => {
          setAnimPhase("idle");
          onAnimationCompleteRef.current?.();
        },
        { extra: carried },
      );
      return cleanup;
    }

    // Step 2: Partition assignment — ball from broker → target partition, stays there
    if (currentStep === 2) {
      const carried = [...persistedDsRef.current];
      setAnimPhase("partitioning");
      const pId = currentStreaming.lastPublishedEvent?.assignedPartition ?? 0;
      animateSignalChain(
        [{ from: "broker", to: `p-${pId}` }],
        800,
        () => {
          setAnimPhase("idle");
          onAnimationCompleteRef.current?.();
        },
        { keepFinal: true, extra: carried },
      );
      return cleanup;
    }

    // Step 3: Workers consume — partition→worker, hold at worker, then worker→data-store
    if (currentStep === 3) {
      // Don't clear signals — ball is still sitting at partition from step 2
      const carried = [...persistedDsRef.current];
      setAnimPhase("consuming-workers");
      const pairs = currentStreaming.consumerGroups[0].instances
        .filter((inst) => {
          const pId = inst.assignedPartitions[0];
          return currentStreaming.partitions[pId].events.some(
            (e) => e.consumedBy === null,
          );
        })
        .map((inst) => ({
          from: `p-${inst.assignedPartitions[0]}`,
          to: inst.id,
        }));
      dispatch(consumeStoreWorker());
      if (pairs.length > 0) {
        // Animate partition → worker, keep ball at worker
        animateSignalsParallel(
          pairs,
          1200,
          () => {
            // Hold at worker for 600ms
            timerRef.current = setTimeout(() => {
              // Animate worker → data-store
              const storePairs = pairs.map((p) => ({
                from: p.to,
                to: "data-store",
              }));
              animateSignalsParallel(
                storePairs,
                800,
                () => {
                  const dsSignals: Signal[] = storePairs.map((p, i) => ({
                    id: `ds-rest-s3-${i}-${Date.now()}`,
                    from: p.from,
                    to: "data-store",
                    progress: 1,
                    resting: true,
                    parkAt: "data-store",
                    parkOffsetX: (i - (storePairs.length - 1) / 2) * 14,
                    parkOffsetY: (Math.random() - 0.5) * 16,
                  }));
                  persistedDsRef.current = [
                    ...carried.filter((s) => s.parkAt === "data-store"),
                    ...dsSignals,
                  ];
                  setSignals([...carried, ...dsSignals]);
                  setAnimPhase("idle");
                  onAnimationCompleteRef.current?.();
                },
                { extra: carried },
              );
            }, 600);
          },
          { keepFinal: true, extra: carried },
        );
      } else {
        setSignals([]);
        setAnimPhase("idle");
        onAnimationCompleteRef.current?.();
      }
      return cleanup;
    }

    // Step 4: Broadcast — balls from broker → each broadcast instance (parallel)
    if (currentStep === 4) {
      const carried = [...persistedDsRef.current];
      dispatch(consumeBroadcast());

      const onlineInstances =
        currentStreaming.consumerGroups[1].instances.filter(
          (inst) => !currentStreaming.offlineBroadcastIds.includes(inst.id),
        );
      const pairs = onlineInstances.map((inst) => ({
        from: "broker",
        to: inst.id,
      }));

      // All instances offline — complete immediately, nothing to animate
      if (pairs.length === 0) {
        setSignals(carried);
        setAnimPhase("idle");
        onAnimationCompleteRef.current?.();
        return cleanup;
      }

      setSignals(carried);
      setAnimPhase("consuming-broadcast");

      animateSignalsParallel(
        pairs,
        900,
        () => {
          const ts = Date.now();
          const instanceHolding: Signal[] = onlineInstances.map((inst, i) => ({
            id: `bcast-pass-${inst.id}-${ts}-${i}`,
            from: "broker",
            to: inst.id,
            progress: 1,
            resting: true,
            parkAt: inst.id,
            parkOffsetX: (Math.random() - 0.5) * 20,
            parkOffsetY: (Math.random() - 0.5) * 12,
          }));
          const atInstances = [...carried, ...instanceHolding];
          setSignals(atInstances);

          animateSignalsParallel(
            onlineInstances.flatMap((inst) =>
              [0, 1].map((clientIndex) => ({
                from: inst.id,
                to: `${inst.id}-client-${clientIndex}`,
              })),
            ),
            450,
            () => {
              setSignals(carried);
              setAnimPhase("idle");
              onAnimationCompleteRef.current?.();
            },
            { extra: atInstances },
          );
        },
        { extra: carried },
      );
      return cleanup;
    }

    // Step 5: Burst — produce 5 events into partitions, then consume all at once
    if (currentStep === 5) {
      // Carry forward previously persisted balls
      const carryDs = persistedDsRef.current;
      const carried = [...carryDs];
      setSignals(carried);
      setAnimPhase("burst");

      const BURST_COUNT = 5;
      const partitionCount = currentStreaming.partitionCount;

      // Pre-generate all events so we know their partition assignments
      const planned = Array.from({ length: BURST_COUNT }, () => {
        const key = randomKey();
        return { key, pId: hashKey(key, partitionCount) };
      });

      // Track how many balls are resting at each partition for spread
      const restCountByPartition: Record<number, number> = {};

      // Resting signals that accumulate at partitions
      const resting: Signal[] = [];
      let eventIdx = 0;

      // Phase 1: produce events one by one, each ball travels to its partition then stays
      const produceNext = () => {
        if (eventIdx >= BURST_COUNT) {
          // All events produced — hold resting signals at partitions briefly
          setSignals([...carried, ...resting]);
          timerRef.current = setTimeout(() => consumeAll(), 600);
          return;
        }

        const evt = planned[eventIdx];
        // Don't dispatch yet — wait until ball arrives at partition

        const hops = [
          { from: "producer", to: "dispatcher" },
          { from: "dispatcher", to: "adapter" },
          { from: "adapter", to: "broker" },
          { from: "broker", to: `p-${evt.pId}` },
        ];

        const sigId = `burst-move-${eventIdx}`;
        const totalDuration = hops.length * 250;
        const burstStart = performance.now();

        const step = (now: number) => {
          const rawP = Math.min((now - burstStart) / totalDuration, 1);
          setSignals([
            ...carried,
            ...resting,
            { id: sigId, chain: hops, progress: rawP * hops.length },
          ]);
          if (rawP < 1) {
            rafRef.current = requestAnimationFrame(step);
          } else {
            // Ball arrived at partition — NOW dispatch so count updates
            dispatch(publishEvent({ key: evt.key }));
            const count = restCountByPartition[evt.pId] ?? 0;
            restCountByPartition[evt.pId] = count + 1;
            const offsetX = (Math.random() - 0.5) * 30;
            const offsetY = (Math.random() - 0.5) * 20;
            resting.push({
              id: `burst-rest-${eventIdx}`,
              from: "broker",
              to: `p-${evt.pId}`,
              progress: 1,
              resting: true,
              parkAt: `p-${evt.pId}`,
              parkOffsetX: offsetX,
              parkOffsetY: offsetY,
            });
            setSignals([...carried, ...resting]);
            eventIdx++;
            timerRef.current = setTimeout(produceNext, 150);
          }
        };
        rafRef.current = requestAnimationFrame(step);
      };

      // Phase 2: consume — release one event per partition per round (parallel across partitions)
      // Each round: partition→worker (parallel), hold, worker→data-store (parallel), repeat
      const consumeAll = () => {
        // Build queues: group resting signals by partition
        const queues: Record<string, Signal[]> = {};
        for (const sig of resting) {
          const nodeId = sig.parkAt!;
          if (!queues[nodeId]) queues[nodeId] = [];
          queues[nodeId].push(sig);
        }

        // Map partition node id → worker id
        const partitionToWorker: Record<string, string> = {};
        for (const inst of currentStreaming.consumerGroups[0].instances) {
          partitionToWorker[`p-${inst.assignedPartitions[0]}`] = inst.id;
        }

        const activePartitions = Object.keys(queues).filter(
          (k) => queues[k].length > 0,
        );

        // Balls that have arrived at data-store — persist across rounds
        const dsResting: Signal[] = [...carryDs];

        const runRound = () => {
          // Pick one from each partition that still has events
          const roundPairs: {
            partId: string;
            workerId: string;
            sig: Signal;
          }[] = [];
          for (const partId of activePartitions) {
            if (queues[partId].length > 0) {
              const sig = queues[partId].shift()!;
              const workerId = partitionToWorker[partId];
              if (workerId) roundPairs.push({ partId, workerId, sig });
            }
          }

          if (roundPairs.length === 0) {
            // All drained — dispatch state update and finish
            dispatch(consumeAllStoreWorkers());
            dispatch(consumeBroadcast());
            persistedDsRef.current = dsResting;
            setSignals([...dsResting]);
            setAnimPhase("idle");
            onAnimationCompleteRef.current?.();
            return;
          }

          // Remove these resting signals from the resting array
          const sigIds = new Set(roundPairs.map((rp) => rp.sig.id));
          const remainingResting = resting.filter((s) => !sigIds.has(s.id));

          // Animate partition → worker (parallel for this round)
          const movingSigs = roundPairs.map((rp, i) => ({
            id: `burst-consume-${rp.partId}-${i}-${Date.now()}`,
            from: rp.partId,
            to: rp.workerId,
            progress: 0,
          }));

          const start = performance.now();
          const stepToWorker = (now: number) => {
            const p = Math.min((now - start) / 600, 1);
            setSignals([
              ...carried,
              ...remainingResting,
              ...dsResting,
              ...movingSigs.map((s) => ({ ...s, progress: p })),
            ]);
            if (p < 1) {
              rafRef.current = requestAnimationFrame(stepToWorker);
            } else {
              // Hold at worker briefly
              timerRef.current = setTimeout(() => {
                // Animate worker → data-store
                const storeSigs = roundPairs.map((rp, i) => ({
                  id: `burst-store-${rp.workerId}-${i}-${Date.now()}`,
                  from: rp.workerId,
                  to: "data-store",
                  progress: 0,
                }));

                const storeStart = performance.now();
                const stepToStore = (now2: number) => {
                  const p2 = Math.min((now2 - storeStart) / 500, 1);
                  setSignals([
                    ...carryDs,
                    ...remainingResting,
                    ...dsResting,
                    ...storeSigs.map((s) => ({ ...s, progress: p2 })),
                  ]);
                  if (p2 < 1) {
                    rafRef.current = requestAnimationFrame(stepToStore);
                  } else {
                    // Add arrived balls to data-store resting (persist across rounds)
                    roundPairs.forEach((rp, i) => {
                      dsResting.push({
                        id: `ds-rest-${rp.workerId}-${Date.now()}-${i}`,
                        from: rp.workerId,
                        to: "data-store",
                        progress: 1,
                        resting: true,
                        parkAt: "data-store",
                        parkOffsetX: (Math.random() - 0.5) * 40,
                        parkOffsetY: (Math.random() - 0.5) * 20,
                      });
                    });
                    // Update resting array to match remaining
                    resting.length = 0;
                    resting.push(...remainingResting);
                    // Next round
                    timerRef.current = setTimeout(runRound, 150);
                  }
                };
                rafRef.current = requestAnimationFrame(stepToStore);
              }, 300);
            }
          };
          rafRef.current = requestAnimationFrame(stepToWorker);
        };

        runRound();
      };

      produceNext();
      return cleanup;
    }

    // Step 6: Summary
    if (currentStep === 6) {
      // Keep persisted balls visible
      const allPersisted = [...persistedDsRef.current];
      setSignals(allPersisted);
      setAnimPhase("summary");
      setTimeout(() => onAnimationCompleteRef.current?.(), 0);
      return cleanup;
    }

    setTimeout(() => onAnimationCompleteRef.current?.(), 0);
    return cleanup;
  }, [
    animateSignalChain,
    animateSignalsParallel,
    cleanup,
    currentStep,
    dispatch,
  ]);

  return { streaming, currentStep, animPhase, signals };
};
