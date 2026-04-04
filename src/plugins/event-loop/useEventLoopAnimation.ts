import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import {
  patchState,
  pushConsoleOutput,
  reset,
  type EventLoopPhase,
  type EventLoopState,
} from "./eventLoopSlice";

export type Signal = { id: string } & SignalOverlayParams;

/* ──────────────────────────────────────────────────────────
   One animation per step.  Each step:
   1. Dispatches the "before" state (highlights, explanation)
   2. Runs exactly one signal animation (or none for static steps)
   3. Dispatches the "after" state
   4. Calls finish() so Shell unlocks the Next button
   ────────────────────────────────────────────────────────── */

export const useEventLoopAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector(
    (state: RootState) => state.eventLoop,
  ) as EventLoopState;
  const [signals, setSignals] = useState<Signal[]>([]);
  const rafRef = useRef<number>(0);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const onCompleteRef = useRef(onAnimationComplete);

  onCompleteRef.current = onAnimationComplete;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
    setSignals([]);
  }, []);

  const sleep = useCallback((ms: number) => {
    return new Promise<void>((resolve) => {
      const id = setTimeout(() => resolve(), ms);
      timeoutsRef.current.push(id);
    });
  }, []);

  const animateSignal = useCallback(
    (from: string, to: string, duration: number) => {
      return new Promise<void>((resolve) => {
        const id = `sig-${from}-${to}-${Date.now()}`;
        const start = performance.now();

        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          setSignals([{ id, from, to, progress, magnitude: 1.05 }]);

          if (progress < 1) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }

          setSignals([]);
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
      // ── Step 0: Overview ────────────────────────────
      if (currentStep === 0) {
        dispatch(reset());
        finish();
        return;
      }

      // ── Step 1: Script enters Call Stack ────────────
      if (currentStep === 1) {
        dispatch(reset());
        dispatch(
          patchState({
            phase: "sync",
            hotZones: ["script", "stack"],
            callStack: [{ id: "global", label: "Global Script" }],
            explanation:
              "The file starts running. It enters the call stack as one synchronous task.",
            currentLine: 1,
          }),
        );
        await animateSignal("script", "stack", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              "Global script is now on the stack. Every line runs top-to-bottom until the stack empties.",
          }),
        );
        finish();
        return;
      }

      // ── Step 2: Log "A" ────────────────────────────
      if (currentStep === 2) {
        dispatch(
          patchState({
            hotZones: ["stack", "console"],
            explanation: 'Line 1: console.log("A") — logs immediately.',
            currentLine: 1,
          }),
        );
        await animateSignal("stack", "console", 600);
        if (cancelled) return;
        dispatch(pushConsoleOutput("A"));
        dispatch(
          patchState({
            explanation: '"A" appears in the console. The stack keeps running.',
          }),
        );
        finish();
        return;
      }

      // ── Step 3: Register setTimeout ─────────────────
      if (currentStep === 3) {
        dispatch(
          patchState({
            hotZones: ["stack", "web-apis"],
            webApis: [
              {
                id: "timer",
                label: "Timer (0 ms)",
                detail: "registered with host",
              },
            ],
            explanation:
              "Line 2: setTimeout hands the callback to the browser. It does NOT go on the stack.",
            currentLine: 2,
          }),
        );
        await animateSignal("stack", "web-apis", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              "The timer is now waiting in Web APIs, outside of JavaScript.",
          }),
        );
        finish();
        return;
      }

      // ── Step 4: Timer fires, callback → Task Queue ──
      if (currentStep === 4) {
        dispatch(
          patchState({
            hotZones: ["web-apis", "task"],
            webApis: [],
            taskQueue: [
              {
                id: "timeout-callback",
                label: "setTimeout cb",
                detail: "ready task",
              },
            ],
            explanation:
              "The 0 ms timer fires. Its callback moves to the task queue — but it still cannot run yet.",
            currentLine: 2,
          }),
        );
        await animateSignal("web-apis", "task", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              "The callback is queued as a task. It must wait until the stack is empty AND microtasks are drained.",
          }),
        );
        finish();
        return;
      }

      // ── Step 5: Queue Promise.then as microtask ─────
      if (currentStep === 5) {
        dispatch(
          patchState({
            hotZones: ["stack", "microtask"],
            microtaskQueue: [
              {
                id: "promise-callback",
                label: "Promise.then cb",
                detail: "ready microtask",
              },
            ],
            explanation:
              "Line 3: Promise.resolve().then() queues a microtask. Microtasks have higher priority than tasks.",
            currentLine: 3,
          }),
        );
        await animateSignal("stack", "microtask", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            explanation:
              "The Promise callback sits in the microtask queue. It will run before the timer callback.",
          }),
        );
        finish();
        return;
      }

      // ── Step 6: Log "B" ────────────────────────────
      if (currentStep === 6) {
        dispatch(
          patchState({
            hotZones: ["stack", "console"],
            explanation:
              'Line 7: console.log("B") — still part of the sync script, so it runs now.',
            currentLine: 7,
          }),
        );
        await animateSignal("stack", "console", 600);
        if (cancelled) return;
        dispatch(pushConsoleOutput("B"));
        dispatch(
          patchState({
            explanation:
              '"B" logged. The sync script is done. Now the stack empties.',
          }),
        );
        finish();
        return;
      }

      // ── Step 7: Stack empty — show both queues ──────
      if (currentStep === 7) {
        dispatch(
          patchState({
            phase: "sync",
            hotZones: ["microtask", "task"],
            callStack: [],
            currentLine: null,
            explanation:
              "Stack is empty. Both queues have work. The event loop always drains microtasks first.",
          }),
        );
        finish();
        return;
      }

      // ── Step 8: Promise callback → Call Stack ───────
      if (currentStep === 8) {
        dispatch(
          patchState({
            phase: "microtasks",
            hotZones: ["microtask", "stack"],
            explanation:
              "The event loop picks the Promise.then callback from the microtask queue.",
            currentLine: 4,
          }),
        );
        await animateSignal("microtask", "stack", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            microtaskQueue: [],
            callStack: [
              {
                id: "promise-callback",
                label: "Promise.then cb",
                detail: "running",
              },
            ],
            explanation: "The Promise callback is now running on the stack.",
          }),
        );
        finish();
        return;
      }

      // ── Step 9: Log "promise" ───────────────────────
      if (currentStep === 9) {
        dispatch(
          patchState({
            hotZones: ["stack", "console"],
            explanation: 'Inside the callback: console.log("promise").',
            currentLine: 4,
          }),
        );
        await animateSignal("stack", "console", 600);
        if (cancelled) return;
        dispatch(pushConsoleOutput("promise"));
        dispatch(
          patchState({
            explanation:
              '"promise" logged. But this callback also queues another microtask...',
          }),
        );
        finish();
        return;
      }

      // ── Step 10: Queue nested microtask ─────────────
      if (currentStep === 10) {
        dispatch(
          patchState({
            hotZones: ["stack", "microtask"],
            microtaskQueue: [
              {
                id: "nested-microtask",
                label: "queueMicrotask cb",
                detail: "nested",
              },
            ],
            explanation:
              "Line 5: queueMicrotask() creates another microtask. The queue must drain completely before any task runs.",
            currentLine: 5,
          }),
        );
        await animateSignal("stack", "microtask", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            callStack: [],
            explanation:
              "First microtask finished. But the queue is not empty — the nested one must run too.",
          }),
        );
        finish();
        return;
      }

      // ── Step 11: Nested microtask → Call Stack ──────
      if (currentStep === 11) {
        dispatch(
          patchState({
            hotZones: ["microtask", "stack"],
            explanation:
              "The nested microtask enters the stack. The timer task is still waiting.",
            currentLine: 5,
          }),
        );
        await animateSignal("microtask", "stack", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            microtaskQueue: [],
            callStack: [
              {
                id: "nested-microtask",
                label: "queueMicrotask cb",
                detail: "running",
              },
            ],
            explanation:
              "The nested microtask is running. Microtasks always jump the queue ahead of tasks.",
          }),
        );
        finish();
        return;
      }

      // ── Step 12: Log "microtask" ────────────────────
      if (currentStep === 12) {
        dispatch(
          patchState({
            hotZones: ["stack", "console"],
            explanation: 'Inside: console.log("microtask").',
            currentLine: 5,
          }),
        );
        await animateSignal("stack", "console", 600);
        if (cancelled) return;
        dispatch(pushConsoleOutput("microtask"));
        dispatch(
          patchState({
            callStack: [],
            currentLine: null,
            hotZones: ["task"],
            explanation:
              '"microtask" logged. Microtask queue is now empty. Only the timer task remains.',
          }),
        );
        finish();
        return;
      }

      // ── Step 13: Render opportunity ─────────────────
      if (currentStep === 13) {
        dispatch(
          patchState({
            phase: "render",
            hotZones: ["render", "task"],
            renderCount: 1,
            explanation:
              "Stack empty, microtasks drained — the browser may paint before the next task.",
          }),
        );
        finish();
        return;
      }

      // ── Step 14: Timer callback → Call Stack ────────
      if (currentStep === 14) {
        dispatch(
          patchState({
            phase: "tasks",
            hotZones: ["task", "stack"],
            explanation: "The event loop picks one task from the task queue.",
            currentLine: 2,
          }),
        );
        await animateSignal("task", "stack", 700);
        if (cancelled) return;
        dispatch(
          patchState({
            taskQueue: [],
            callStack: [
              {
                id: "timeout-callback",
                label: "setTimeout cb",
                detail: "running",
              },
            ],
            explanation:
              "The setTimeout callback is finally running — after all microtasks finished.",
          }),
        );
        finish();
        return;
      }

      // ── Step 15: Log "timeout" ──────────────────────
      if (currentStep === 15) {
        dispatch(
          patchState({
            hotZones: ["stack", "console"],
            explanation: 'The timer callback logs "timeout".',
            currentLine: 2,
          }),
        );
        await animateSignal("stack", "console", 600);
        if (cancelled) return;
        dispatch(pushConsoleOutput("timeout"));
        dispatch(
          patchState({
            phase: "summary",
            callStack: [],
            hotZones: ["console"],
            currentLine: null,
            explanation:
              "Done! Final order: A, B, promise, microtask, timeout.",
          }),
        );
        finish();
        return;
      }

      // ── Step 16: Summary ────────────────────────────
      if (currentStep === 16) {
        dispatch(
          patchState({
            phase: "summary",
            hotZones: ["console"],
            callStack: [],
            taskQueue: [],
            microtaskQueue: [],
            currentLine: null,
            renderCount: 1,
            explanation:
              "The rule: finish the stack, drain ALL microtasks, allow render, then run ONE task. Repeat.",
          }),
        );
        finish();
      }
    };

    run();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [animateSignal, cleanup, currentStep, dispatch, sleep]);

  return {
    runtime,
    currentStep,
    signals,
    phase: runtime.phase as EventLoopPhase,
  };
};
