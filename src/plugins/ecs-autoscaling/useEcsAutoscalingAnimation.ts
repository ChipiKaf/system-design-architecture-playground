import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import {
  patchState,
  reset,
  type EcsAutoscalingState,
} from "./ecsAutoscalingSlice";

export type Signal = { id: string } & SignalOverlayParams;

/* ──────────────────────────────────────────────────────────
   Granular steps — ONE signal animation per step.
   Client count is controlled by the user via +/− buttons,
   not baked into step logic.

    0  Overview
    1  Clients → ALB
    2  ALB → Task 1
    3  ALB → Task 2
    4  Task 1 → Database
    5  Task 1 → CloudWatch (metrics)
    6  Task 2 → CloudWatch (alarm evaluation)
    7  CloudWatch → Scaling Policy (alarm)
    8  Scaling Policy → ECS Service (desired count)
    9  ECR → Task 3 (image pull)
   10  ECR → Task 4 (image pull)
   11  ALB → new tasks (registered)
   12  System balanced (static)
   13  Scale-in: drain tasks
   14  Summary
   ────────────────────────────────────────────────────────── */

export const useEcsAutoscalingAnimation = (
  onAnimationComplete?: () => void,
) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector(
    (state: RootState) => state.ecsAutoscaling,
  ) as EcsAutoscalingState;
  const [signals, setSignals] = useState<Signal[]>([]);
  const rafRef = useRef<number>(0);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const onCompleteRef = useRef(onAnimationComplete);
  const runtimeRef = useRef(runtime);

  onCompleteRef.current = onAnimationComplete;
  runtimeRef.current = runtime;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
    setSignals([]);
  }, []);

  const animateSignal = useCallback(
    (from: string, to: string, duration: number) => {
      return new Promise<void>((resolve) => {
        const id = `sig-${from}-${to}-${Date.now()}`;
        const start = performance.now();

        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          setSignals((prev) => {
            const others = prev.filter((s) => s.id !== id);
            return [...others, { id, from, to, progress, magnitude: 1.05 }];
          });

          if (progress < 1) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }

          // Keep the ball resting at the target; cleanup() clears it on next step
          resolve();
        };

        rafRef.current = requestAnimationFrame(tick);
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    cleanup();

    const finish = () => {
      if (!cancelled) setTimeout(() => onCompleteRef.current?.(), 0);
    };

    const run = async () => {
      /* ── 0: Overview ──────────────────────────────────── */
      if (currentStep === 0) {
        dispatch(reset());
        finish();
        return;
      }

      /* ── 1: Clients → ALB ─────────────────────────────── */
      if (currentStep === 1) {
        dispatch(
          patchState({
            phase: "normal",
            hotZones: ["clients", "alb"],
            explanation:
              "Clients send HTTP requests. All traffic first hits the Application Load Balancer.",
          }),
        );
        await animateSignal("clients", "alb", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              "The ALB received the request. It will now decide which ECS task should handle it.",
          }),
        );
        finish();
        return;
      }

      /* ── 2: ALB → Task 1 ──────────────────────────────── */
      if (currentStep === 2) {
        dispatch(
          patchState({
            hotZones: ["alb", "task-1"],
            explanation:
              "The ALB routes this request to Task 1 — it picks the target with the fewest active connections.",
          }),
        );
        await animateSignal("alb", "task-1", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              "Task 1 is processing the request inside its Docker container.",
          }),
        );
        finish();
        return;
      }

      /* ── 3: ALB → Task 2 ──────────────────────────────── */
      if (currentStep === 3) {
        dispatch(
          patchState({
            hotZones: ["alb", "task-2"],
            explanation:
              "The next request goes to Task 2. The ALB balances load across all healthy targets.",
          }),
        );
        await animateSignal("alb", "task-2", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            hotZones: ["task-1", "task-2"],
            explanation:
              "Both tasks are handling traffic. Each is a Docker container running your Node.js app.",
          }),
        );
        finish();
        return;
      }

      /* ── 4: Task 1 → Database ─────────────────────────── */
      if (currentStep === 4) {
        dispatch(
          patchState({
            hotZones: ["task-1", "database"],
            explanation:
              "Task 1 queries the database to fulfill the request. Database choice affects response time.",
          }),
        );
        await animateSignal("task-1", "database", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              "Data returned. Use the +/− buttons to add clients and watch how metrics change.",
          }),
        );
        finish();
        return;
      }

      /* ── 5: Task 1 → CloudWatch ───────────────────────── */
      if (currentStep === 5) {
        dispatch(
          patchState({
            phase: "load-rising",
            hotZones: ["task-1", "cloudwatch"],
            explanation:
              "Every task emits CPU and memory metrics to CloudWatch every 60 seconds.",
          }),
        );
        await animateSignal("task-1", "cloudwatch", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              "CloudWatch recorded Task 1's CPU. It collects from all tasks to compute the average.",
          }),
        );
        finish();
        return;
      }

      /* ── 6: Task 2 → CloudWatch (alarm eval) ─────────── */
      if (currentStep === 6) {
        dispatch(
          patchState({
            hotZones: ["task-2", "cloudwatch"],
            explanation:
              "Task 2 also reports its metrics. CloudWatch now evaluates the alarm threshold.",
          }),
        );
        await animateSignal("task-2", "cloudwatch", 700);
        if (cancelled) return;
        const rt = runtimeRef.current;
        const isAlarming = rt.avgCpu > rt.targetCpu;
        dispatch(
          patchState({
            phase: isAlarming ? "alarm" : "load-rising",
            alarmFiring: isAlarming,
            scalingPath: isAlarming ? "scale-out" : "no-scaling",
            hotZones: ["cloudwatch"],
            explanation: isAlarming
              ? `Avg CPU is ${rt.avgCpu}% — above the ${rt.targetCpu}% target! Alarm → ALARM.`
              : `Avg CPU is ${rt.avgCpu}% — below the ${rt.targetCpu}% target. Alarm stays OK. Add more clients with + and Replay to trigger scaling.`,
          }),
        );
        finish();
        return;
      }

      /* ── 7: Scaling path branch ───────────────────────── */
      if (currentStep === 7) {
        const rt = runtimeRef.current;

        /* ── no-scaling: alarm didn't fire ──────────────── */
        if (rt.scalingPath === "no-scaling") {
          dispatch(
            patchState({
              phase: "summary",
              hotZones: [],
              explanation:
                `CPU is ${rt.avgCpu}% — within the ${rt.targetCpu}% target. CloudWatch alarm stays in OK state. ` +
                `No scaling action is taken — ECS keeps running ${rt.tasks.length} tasks.\n\n` +
                `In real AWS, the alarm must breach the threshold for a sustained evaluation period before scaling triggers. ` +
                `Try adding more clients with + and click Replay to see autoscaling in action!`,
            }),
          );
          finish();
          return;
        }

        /* ── scale-out: alarm fired ─────────────────────── */
        dispatch(
          patchState({
            phase: "alarm",
            alarmFiring: true,
            hotZones: ["cloudwatch", "scaling-policy"],
            explanation:
              "The CloudWatch alarm notifies the Auto Scaling policy.",
          }),
        );
        await animateSignal("cloudwatch", "scaling-policy", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              "The scaling policy calculates that 2 more tasks are needed to bring CPU below the target.",
          }),
        );
        finish();
        return;
      }

      /* ── 8: Scaling Policy → ECS Service ──────────────── */
      if (currentStep === 8) {
        dispatch(
          patchState({
            phase: "scaling-out",
            desiredCount: 4,
            hotZones: ["scaling-policy", "ecs-service"],
            explanation:
              "The scaling policy tells ECS: 'set desired count to 4'. ECS needs to launch 2 new tasks.",
          }),
        );
        await animateSignal("scaling-policy", "ecs-service", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              "ECS acknowledged. It will pull the Docker image from ECR to start new containers.",
          }),
        );
        finish();
        return;
      }

      /* ── 9: ECR → Task 3 ──────────────────────────────── */
      if (currentStep === 9) {
        const existing = runtimeRef.current.tasks.filter(
          (t) => t.id !== "task-3" && t.id !== "task-4",
        );
        dispatch(
          patchState({
            phase: "provisioning",
            hotZones: ["ecr", "task-3"],
            tasks: [
              ...existing,
              { id: "task-3", cpuPercent: 0, status: "provisioning" },
            ],
            explanation:
              "ECS pulls the Docker image from ECR for Task 3. The image has your Node.js app and all dependencies.",
          }),
        );
        await animateSignal("ecr", "task-3", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              "Task 3 is booting — the container starts, then health checks run.",
          }),
        );
        finish();
        return;
      }

      /* ── 10: ECR → Task 4 ─────────────────────────────── */
      if (currentStep === 10) {
        const existing = runtimeRef.current.tasks.filter(
          (t) => t.id !== "task-4",
        );
        dispatch(
          patchState({
            hotZones: ["ecr", "task-4"],
            tasks: [
              ...existing,
              { id: "task-4", cpuPercent: 0, status: "provisioning" },
            ],
            explanation:
              "Task 4 also pulls the image. Both new containers are provisioning in parallel.",
          }),
        );
        await animateSignal("ecr", "task-4", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              "Both new tasks are starting up. Once they pass health checks, the ALB will route to them.",
          }),
        );
        finish();
        return;
      }

      /* ── 11: ALB registers new tasks ──────────────────── */
      if (currentStep === 11) {
        const rt = runtimeRef.current;
        /* Recalculate CPU based on actual client load across 4 tasks
           Same formula as adjustClients: baseCpu = (rps / (taskCount * 50)) * 100 */
        const rps = rt.clientCount * 10;
        const newAvg = Math.min(95, Math.round((rps / (4 * 50)) * 100));
        dispatch(
          patchState({
            phase: "balanced",
            alarmFiring: newAvg > rt.targetCpu,
            avgCpu: newAvg,
            responseTimeMs: Math.round(20 + (newAvg / 100) * 400),
            hotZones: ["alb", "task-3", "task-4"],
            tasks: rt.tasks.map((t) =>
              t.status === "provisioning"
                ? { ...t, cpuPercent: newAvg - 1, status: "running" as const }
                : { ...t, cpuPercent: newAvg + (t.id === "task-1" ? 3 : -2) },
            ),
            explanation: `New tasks pass health checks! The ALB registers them. Traffic now spreads across 4 tasks. Avg CPU: ${newAvg}%.`,
          }),
        );
        await animateSignal("alb", "task-3", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              newAvg > rt.targetCpu
                ? `CPU is still ${newAvg}% — above target even with 4 tasks. Load is very high.`
                : `CPU dropped to ${newAvg}%. The alarm goes back to OK. The system self-healed.`,
          }),
        );
        finish();
        return;
      }

      /* ── 12: Balanced — evaluate scale-in ─────────────── */
      if (currentStep === 12) {
        const rt = runtimeRef.current;
        /* Scale-in threshold: below 30% avg CPU across 4 tasks means
           we're over-provisioned — same tasks could handle the load.
           Real AWS uses a low-threshold alarm or target-tracking cooldown. */
        const scaleInThreshold = 30;
        const shouldScaleIn = rt.avgCpu < scaleInThreshold;
        dispatch(
          patchState({
            phase: "balanced",
            scaleInPath: shouldScaleIn ? "scale-in" : "no-scale-in",
            hotZones: ["task-1", "task-2", "task-3", "task-4"],
            explanation: shouldScaleIn
              ? `System balanced with 4 tasks. Avg CPU at ${rt.avgCpu}% — well below ${scaleInThreshold}%. ` +
                `After the cooldown period, the scaling policy will scale in to save resources.`
              : `System balanced with 4 tasks. Avg CPU at ${rt.avgCpu}% — above the ${scaleInThreshold}% scale-in threshold. ` +
                `No scale-in triggered. All 4 tasks are still needed for this load. ` +
                `Try removing clients with − and Replay to see scale-in.`,
          }),
        );
        finish();
        return;
      }

      /* ── 13: Scale-in path branch ─────────────────────── */
      if (currentStep === 13) {
        const rt = runtimeRef.current;

        /* ── no-scale-in: load still warrants 4 tasks ────── */
        if (rt.scaleInPath === "no-scale-in") {
          dispatch(
            patchState({
              phase: "summary",
              hotZones: [],
              explanation:
                `CPU is ${rt.avgCpu}% across 4 tasks — load still warrants the extra capacity. ` +
                `In real AWS, the scaling policy's cooldown period prevents premature scale-in. ` +
                `The system stays at 4 tasks until load drops sufficiently.\n\n` +
                `Try removing clients with − and click Replay to see the scale-in flow!`,
            }),
          );
          finish();
          return;
        }

        /* ── scale-in: drain excess tasks ──────────────── */
        dispatch(
          patchState({
            phase: "scale-in",
            scalingCooldown: true,
            desiredCount: 2,
            hotZones: ["cloudwatch", "scaling-policy"],
            explanation:
              "After the cooldown period, CloudWatch sees low CPU. The policy reduces desired count to 2.",
          }),
        );
        await animateSignal("cloudwatch", "scaling-policy", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            tasks: runtimeRef.current.tasks.map((t) =>
              t.id === "task-3" || t.id === "task-4"
                ? { ...t, status: "draining" as const, cpuPercent: 0 }
                : t,
            ),
            hotZones: ["task-3", "task-4"],
            explanation:
              "Tasks 3 & 4 drain — ALB stops sending new requests. Active connections finish gracefully.",
          }),
        );
        finish();
        return;
      }

      /* ── 14: Summary ──────────────────────────────────── */
      if (currentStep === 14) {
        dispatch(
          patchState({
            phase: "summary",
            scalingCooldown: false,
            tasks: runtimeRef.current.tasks.filter(
              (t) => t.id === "task-1" || t.id === "task-2",
            ),
            hotZones: [],
            explanation:
              "The autoscaling loop: CloudWatch monitors → alarm fires → scaling policy adjusts desired count → ECS provisions/drains tasks → ALB routes traffic. It scales both ways.",
          }),
        );
        finish();
        return;
      }
    };

    run();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [animateSignal, cleanup, currentStep, dispatch]);

  return {
    runtime,
    currentStep,
    signals,
    phase: runtime.phase,
  };
};
