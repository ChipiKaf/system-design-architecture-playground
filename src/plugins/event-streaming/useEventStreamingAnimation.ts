import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import {
  publishEvent,
  consumeStoreWorker,
  consumeAllStoreWorkers,
  consumeBroadcast,
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

export interface Signal {
  id: string;
  from: string;
  to: string;
  progress: number;
  /** If set, render as a circle overlay resting inside a node */
  resting?: { nodeId: string; offsetX: number; offsetY: number };
}

export const useEventStreamingAnimation = (
  onAnimationComplete?: () => void,
) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const streaming = useSelector((state: RootState) => state.eventStreaming);
  const [animPhase, setAnimPhase] = useState<AnimPhase>("idle");
  const [signals, setSignals] = useState<Signal[]>([]);
  const rafRef = useRef<number>(undefined!);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined!);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(timerRef.current);
  }, []);

  // Animate a chain of signal hops sequentially: ball goes from→to, then next pair, etc.
  const animateSignalChain = useCallback(
    (
      hops: { from: string; to: string }[],
      durationPerHop: number,
      onDone: () => void,
      options?: { keepFinal?: boolean },
    ) => {
      let hopIndex = 0;

      const runHop = () => {
        if (hopIndex >= hops.length) {
          if (!options?.keepFinal) setSignals([]);
          onDone();
          return;
        }
        const hop = hops[hopIndex];
        const sigId = `sig-${hop.from}-${hop.to}`;
        const start = performance.now();

        const step = (now: number) => {
          const p = Math.min((now - start) / durationPerHop, 1);
          setSignals([{ id: sigId, from: hop.from, to: hop.to, progress: p }]);
          if (p < 1) {
            rafRef.current = requestAnimationFrame(step);
          } else {
            hopIndex++;
            runHop();
          }
        };
        rafRef.current = requestAnimationFrame(step);
      };

      runHop();
    },
    [],
  );

  // Animate parallel signals (multiple balls at once, e.g. broker → all workers)
  const animateSignalsParallel = useCallback(
    (
      pairs: { from: string; to: string }[],
      duration: number,
      onDone: () => void,
      options?: { keepFinal?: boolean },
    ) => {
      const start = performance.now();
      const sigs = pairs.map((pair, i) => ({
        id: `sig-par-${i}`,
        from: pair.from,
        to: pair.to,
        progress: 0,
      }));

      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setSignals(sigs.map((s) => ({ ...s, progress: p })));
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          if (!options?.keepFinal) setSignals([]);
          onDone();
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [],
  );

  useEffect(() => {
    cleanup();

    // Step 0: Overview
    if (currentStep === 0) {
      setAnimPhase("idle");
      setSignals([]);
      setTimeout(() => onAnimationComplete?.(), 0);
      return cleanup;
    }

    // Step 1: Produce — ball travels Producer → Dispatcher → Adapter → Broker
    if (currentStep === 1) {
      setSignals([]);
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
          onAnimationComplete?.();
        },
      );
      return cleanup;
    }

    // Step 2: Partition assignment — ball from broker → target partition, stays there
    if (currentStep === 2) {
      setAnimPhase("partitioning");
      const pId = streaming.lastPublishedEvent?.assignedPartition ?? 0;
      animateSignalChain(
        [{ from: "broker", to: `p-${pId}` }],
        800,
        () => {
          // Keep ball resting at partition (signals stay, keepFinal=true)
          setAnimPhase("idle");
          onAnimationComplete?.();
        },
        { keepFinal: true },
      );
      return cleanup;
    }

    // Step 3: Workers consume — partition→worker, hold at worker, then worker→data-store
    if (currentStep === 3) {
      // Don't clear signals — ball is still sitting at partition from step 2
      setAnimPhase("consuming-workers");
      const pairs = streaming.consumerGroups[0].instances
        .filter((inst) => {
          const pId = inst.assignedPartitions[0];
          return streaming.partitions[pId].events.some(
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
              animateSignalsParallel(storePairs, 800, () => {
                setAnimPhase("idle");
                onAnimationComplete?.();
              });
            }, 600);
          },
          { keepFinal: true },
        );
      } else {
        setSignals([]);
        setAnimPhase("idle");
        onAnimationComplete?.();
      }
      return cleanup;
    }

    // Step 4: Broadcast — balls from broker → each broadcast instance (parallel)
    if (currentStep === 4) {
      setSignals([]);
      dispatch(consumeBroadcast());
      setAnimPhase("consuming-broadcast");
      const pairs = streaming.consumerGroups[1].instances.map((inst) => ({
        from: "broker",
        to: inst.id,
      }));
      animateSignalsParallel(pairs, 1200, () => {
        setAnimPhase("idle");
        onAnimationComplete?.();
      });
      return cleanup;
    }

    // Step 5: Burst — produce 5 events into partitions, then consume all at once
    if (currentStep === 5) {
      setSignals([]);
      setAnimPhase("burst");

      const BURST_COUNT = 5;
      const partitionCount = streaming.partitionCount;

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
          setSignals([...resting]);
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

        let hopIdx = 0;
        const runHop = () => {
          if (hopIdx >= hops.length) {
            // Ball arrived at partition — NOW dispatch so count updates
            dispatch(publishEvent({ key: evt.key }));

            // Add resting ball inside the partition box with random offset
            const count = restCountByPartition[evt.pId] ?? 0;
            restCountByPartition[evt.pId] = count + 1;
            const offsetX = (Math.random() - 0.5) * 30; // spread within 60px width
            const offsetY = (Math.random() - 0.5) * 20; // spread within 44px height
            resting.push({
              id: `burst-rest-${eventIdx}`,
              from: `p-${evt.pId}`,
              to: `p-${evt.pId}`,
              progress: 0,
              resting: { nodeId: `p-${evt.pId}`, offsetX, offsetY },
            });
            setSignals([...resting]);
            eventIdx++;
            // Small pause before next event
            timerRef.current = setTimeout(produceNext, 150);
            return;
          }

          const hop = hops[hopIdx];
          const sigId = `burst-move-${eventIdx}`;
          const start = performance.now();

          const step = (now: number) => {
            const p = Math.min((now - start) / 250, 1);
            // Show resting signals + the moving one
            setSignals([
              ...resting,
              { id: sigId, from: hop.from, to: hop.to, progress: p },
            ]);
            if (p < 1) {
              rafRef.current = requestAnimationFrame(step);
            } else {
              hopIdx++;
              runHop();
            }
          };
          rafRef.current = requestAnimationFrame(step);
        };
        runHop();
      };

      // Phase 2: consume — release one event per partition per round (parallel across partitions)
      // Each round: partition→worker (parallel), hold, worker→data-store (parallel), repeat
      const consumeAll = () => {
        // Build queues: group resting signals by partition
        const queues: Record<string, Signal[]> = {};
        for (const sig of resting) {
          const nodeId = sig.resting!.nodeId;
          if (!queues[nodeId]) queues[nodeId] = [];
          queues[nodeId].push(sig);
        }

        // Map partition node id → worker id
        const partitionToWorker: Record<string, string> = {};
        for (const inst of streaming.consumerGroups[0].instances) {
          partitionToWorker[`p-${inst.assignedPartitions[0]}`] = inst.id;
        }

        const activePartitions = Object.keys(queues).filter(
          (k) => queues[k].length > 0,
        );

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
            setSignals([]);
            setAnimPhase("idle");
            onAnimationComplete?.();
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
              ...remainingResting,
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
                    ...remainingResting,
                    ...storeSigs.map((s) => ({ ...s, progress: p2 })),
                  ]);
                  if (p2 < 1) {
                    rafRef.current = requestAnimationFrame(stepToStore);
                  } else {
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
      setSignals([]);
      setAnimPhase("summary");
      setTimeout(() => onAnimationComplete?.(), 0);
      return cleanup;
    }

    setTimeout(() => onAnimationComplete?.(), 0);
    return cleanup;
  }, [currentStep]);

  return { streaming, currentStep, animPhase, signals };
};
