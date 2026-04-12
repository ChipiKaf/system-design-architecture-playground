import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import { patchState, reset } from "./stepFunctionsSlice";

export type Signal = { id: string } & SignalOverlayParams;

/* ──────────────────────────────────────────────────────────
   Step Functions — Insurance Claims Processing Workflow
   ONE signal animation per step.

    0  Architecture Overview (static)
    1  React App → GraphQL Mutation         (customer sends mutation)
    2  GraphQL Mutation → ClaimService      (resolver delegates to service)
    3  ClaimService → SDK Client            (service publishes event)
    4  SDK Client → Event Bus              (putEvents crosses to EventBridge)
    5  Event Bus → Rule Engine             (pattern matching evaluates)
    6  Rule Engine → Target                (rule routes to SFN target)
    7  Target → Validate Claim             (StartExecution fires)
    8  Validate Claim → Lambda             (task state calls Lambda)
    9  Validate Claim → Choice             (Lambda returns, transition to choice)
   10  Choice → Assess Claim               (claim valid — Yes path)
   11  Assess Claim → Lambda               (task calls Lambda for assessment)
   12  Assess Claim → Wait for Approval    (assessment done, enter approval)
   13  Wait for Approval → Admin Dashboard (sends task token for review)
   14  Admin Dashboard → Wait for Approval (sendTaskSuccess callback)
   15  Wait for Approval → Store Documents (approved, workflow resumes)
   16  Store Documents → S3                (task uploads claim docs)
   17  Store Documents → Notify Customer   (docs stored, next state)
   18  Notify Customer → SNS              (task sends notification)
   19  Notify Customer → Success           (workflow complete!)
   20  Choice → Reject Claim               (show the No path)
   21  Reject Claim → Fail                 (invalid claim fails)
   22  Summary (static)
   ────────────────────────────────────────────────────────── */

export const useStepFunctionsAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector((state: RootState) => state.stepFunctions);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [animPhase, setAnimPhase] = useState<string>("idle");
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

  const animateSignal = useCallback(
    (from: string, to: string, duration: number, color?: string) => {
      return new Promise<void>((resolve) => {
        const id = `sig-${from}-${to}-${Date.now()}`;
        const start = performance.now();

        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          setSignals((prev) => {
            const others = prev.filter((s) => s.id !== id);
            return [
              ...others,
              { id, from, to, progress, magnitude: 1.05, color },
            ];
          });

          if (progress < 1) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
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
      /* ── 0: Architecture Overview ─────────────────────── */
      if (currentStep === 0) {
        dispatch(reset());
        setAnimPhase("idle");
        finish();
        return;
      }

      /* ── 1: React App → GraphQL Mutation ────────────────── */
      if (currentStep === 1) {
        dispatch(
          patchState({
            phase: "triggering",
            workflowStatus: "running",
            currentStateName: "",
            hotZones: ["client-app", "be-mutation"],
            explanation:
              'A customer opens the React / Next.js app on their phone and taps "Submit Claim". ' +
              "The app sends a GraphQL mutation — submitClaim — to the backend API running on ECS. " +
              "This is a normal HTTP request into your Node.js app; nothing AWS-specific has happened yet.",
          }),
        );
        setAnimPhase("triggering");
        await animateSignal("client-app", "be-mutation", 800, "#06b6d4");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 2: GraphQL Mutation → ClaimService ─────────────── */
      if (currentStep === 2) {
        dispatch(
          patchState({
            hotZones: ["be-mutation", "be-service"],
            explanation:
              "The resolver calls ctx.services.claimService.submitClaim(input). " +
              "That is just your code calling your code: ctx is the GraphQL request context, services is your app object graph, " +
              "and claimService is a class instance you created when the server started.",
          }),
        );
        setAnimPhase("triggering");
        await animateSignal("be-mutation", "be-service", 600, "#e879f9");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 3: ClaimService → SDK Client ───────────────────── */
      if (currentStep === 3) {
        dispatch(
          patchState({
            hotZones: ["be-service", "be-sdk"],
            explanation:
              "After saving the claim, ClaimService publishes a ClaimSubmitted domain event. " +
              "Without EventBridge, this service might directly call Step Functions, fraud checks, analytics, and whatever gets added next. " +
              "Instead, it emits one business fact and leaves downstream reactions out of the service layer.",
          }),
        );
        setAnimPhase("triggering");
        await animateSignal("be-service", "be-sdk", 600, "#d946ef");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 4: SDK Client → Event Bus ──────────────────────── */
      if (currentStep === 4) {
        dispatch(
          patchState({
            hotZones: ["be-sdk", "eb-bus"],
            explanation:
              "The SDK client calls PutEventsCommand — this is where the event crosses " +
              "from your application code into AWS infrastructure. The event leaves the ECS container " +
              "and enters the EventBridge Event Bus over HTTPS. Everything before this step was local code in one process. We use EventBridge here because " +
              "this system needs routing and fan-out, not producer-side orchestration, a polled work queue, or a replayable stream.",
          }),
        );
        setAnimPhase("triggering");
        await animateSignal("be-sdk", "eb-bus", 800, "#a855f7");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 5: Event Bus → Rule Engine ───────────────────── */
      if (currentStep === 5) {
        dispatch(
          patchState({
            hotZones: ["eb-bus", "eb-rules"],
            explanation:
              "The rule engine evaluates EVERY incoming event against all active rules — in parallel, " +
              "at millisecond latency. Your rule pattern is:\n\n" +
              '  source: ["claims-api"]\n' +
              '  detail-type: ["ClaimSubmitted"]\n\n' +
              "If the event matches, the rule fires. One event can match multiple rules — " +
              "that's how fan-out works without teaching the backend about every downstream consumer.",
          }),
        );
        setAnimPhase("triggering");
        await animateSignal("eb-bus", "eb-rules", 600, "#a855f7");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 6: Rule Engine → Target ──────────────────────── */
      if (currentStep === 6) {
        dispatch(
          patchState({
            hotZones: ["eb-rules", "eb-target"],
            explanation:
              "The rule routes the event to its target: Step Functions. " +
              "A target is just a configuration — which AWS service to call and how to transform the event. " +
              "EventBridge has built-in integrations for 20+ AWS services, so no Lambda glue needed.",
          }),
        );
        setAnimPhase("triggering");
        await animateSignal("eb-rules", "eb-target", 600, "#8b5cf6");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 7: Target → Validate Claim ───────────────────── */
      if (currentStep === 7) {
        dispatch(
          patchState({
            currentStateName: "Validate Claim",
            hotZones: ["eb-target", "validate"],
            explanation:
              "The target fires! It calls Step Functions' StartExecution API, passing the claim data " +
              'as the workflow input. The state machine begins at its first state: "Validate Claim". ' +
              "Step Functions itself can't listen for events — something else always calls StartExecution. " +
              "That 'something' is EventBridge's target.",
          }),
        );
        setAnimPhase("triggering");
        await animateSignal("eb-target", "validate", 800, "#7c3aed");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 8: Validate Claim → Lambda ───────────────────── */
      if (currentStep === 8) {
        dispatch(
          patchState({
            phase: "validating",
            hotZones: ["validate", "lambda-1"],
            explanation:
              "The Validate Claim state is a Task state. It calls a Lambda function that checks: " +
              "Does this customer have an active insurance policy? Is the claim within the coverage dates? " +
              "Is this type of damage covered? Step Functions waits for Lambda to finish before moving on.",
          }),
        );
        setAnimPhase("validating");
        await animateSignal("validate", "lambda-1", 700, "#f97316");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 9: Validate Claim → Choice State ─────────────── */
      if (currentStep === 9) {
        dispatch(
          patchState({
            phase: "choosing",
            currentStateName: "Is Claim Valid?",
            hotZones: ["validate", "choice"],
            explanation:
              "Lambda finished! It returned the validation result. Step Functions automatically passes this result " +
              'to the next state in the workflow — the Choice state "Is Claim Valid?"',
          }),
        );
        setAnimPhase("choosing");
        await animateSignal("validate", "choice", 700, "#f59e0b");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 10: Choice → Assess Claim (Yes path) ─────────── */
      if (currentStep === 10) {
        dispatch(
          patchState({
            phase: "assessing",
            currentStateName: "Assess Claim",
            choicePath: "yes",
            hotZones: ["choice", "assess"],
            explanation:
              'The claim IS valid! The Choice state evaluates the condition and follows the "Yes" path. ' +
              "Step Functions moves to the Assess Claim state. " +
              "Notice: you didn't write any code to connect these states — Step Functions handles all the wiring.",
          }),
        );
        setAnimPhase("assessing");
        await animateSignal("choice", "assess", 700, "#22c55e");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 11: Assess Claim → Lambda ────────────────────── */
      if (currentStep === 11) {
        dispatch(
          patchState({
            hotZones: ["assess", "lambda-2"],
            explanation:
              "The Assess Claim state calls a Lambda function. This Lambda runs the assessment logic — " +
              "it looks up the customer's plan from PostgreSQL, checks the deductible, and calculates how much " +
              "to pay out. Step Functions waits patiently for the result.",
          }),
        );
        setAnimPhase("assessing");
        await animateSignal("assess", "lambda-2", 700, "#f97316");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 12: Assess Claim → Wait for Approval ────────────── */
      if (currentStep === 12) {
        dispatch(
          patchState({
            phase: "approving",
            currentStateName: "Wait for Approval",
            hotZones: ["assess", "approval-wait"],
            explanation:
              "Assessment succeeded! But this claim needs human approval before proceeding. " +
              "Step Functions transitions to a waitForTaskToken state — it generates a unique task token, " +
              "sends it to an external system (the admin dashboard), and then pauses. " +
              "No compute is running while it waits. Standard workflows can pause for up to one year.",
          }),
        );
        setAnimPhase("approving");
        await animateSignal("assess", "approval-wait", 700, "#fbbf24");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 13: Wait for Approval → Admin Dashboard ────────── */
      if (currentStep === 13) {
        dispatch(
          patchState({
            hotZones: ["approval-wait", "approval-svc"],
            explanation:
              "The task token reaches the Admin Dashboard. A Lambda function (or direct SQS/SNS integration) " +
              "delivered the token along with the claim details to the approval system. " +
              "The dashboard stores the token in a pending_approvals table in PostgreSQL, " +
              "and the claims adjuster sees a new item in their review queue.",
          }),
        );
        setAnimPhase("approving");
        await animateSignal("approval-wait", "approval-svc", 700, "#fbbf24");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 14: Admin Dashboard → Wait for Approval ────────── */
      if (currentStep === 14) {
        dispatch(
          patchState({
            hotZones: ["approval-svc", "approval-wait"],
            explanation:
              'The claims adjuster clicks "Approve". The dashboard\'s backend looks up the stored taskToken ' +
              "for this claim and calls the Step Functions API: SendTaskSuccess(taskToken, { approved: true, adjusterNotes: '...' }). " +
              "This is the callback that wakes up the paused workflow.",
          }),
        );
        setAnimPhase("approving");
        await animateSignal("approval-svc", "approval-wait", 700, "#22c55e");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 15: Wait for Approval → Store Documents ────────── */
      if (currentStep === 15) {
        dispatch(
          patchState({
            phase: "uploading",
            currentStateName: "Store Documents",
            hotZones: ["approval-wait", "store-docs"],
            explanation:
              "Claim approved! Step Functions transitions to Store Documents. " +
              "All the data from previous states — claim details, assessment result, and the adjuster's approval — " +
              "flows automatically to this state. The workflow continues as normal now.",
          }),
        );
        setAnimPhase("uploading");
        await animateSignal("approval-wait", "store-docs", 700, "#22c55e");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 16: Store Documents → S3 ─────────────────────── */
      if (currentStep === 16) {
        dispatch(
          patchState({
            hotZones: ["store-docs", "s3-svc"],
            explanation:
              "The Store Documents state uses a direct service integration to upload to S3. " +
              "It sends the customer's photos and receipts to the claim-docs bucket — no Lambda function needed! " +
              "This is cheaper, faster, and less code to maintain.",
          }),
        );
        setAnimPhase("uploading");
        await animateSignal("store-docs", "s3-svc", 700, "#2563eb");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 17: Store Documents → Notify Customer ────────── */
      if (currentStep === 17) {
        dispatch(
          patchState({
            phase: "notifying",
            currentStateName: "Notify Customer",
            hotZones: ["store-docs", "notify"],
            explanation:
              "Documents are safely stored in S3. Step Functions transitions to the Notify Customer state. " +
              "This state will tell the customer that their claim has been approved and a payout is on the way.",
          }),
        );
        setAnimPhase("notifying");
        await animateSignal("store-docs", "notify", 700, "#818cf8");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 18: Notify Customer → SNS ───────────────────── */
      if (currentStep === 18) {
        dispatch(
          patchState({
            hotZones: ["notify", "sns-svc"],
            explanation:
              "Notify Customer publishes a message to an SNS topic. " +
              "Every subscriber to that topic — email addresses, the mobile app, other services — " +
              "receives the notification instantly. Again, no Lambda needed — Step Functions calls SNS directly!",
          }),
        );
        setAnimPhase("notifying");
        await animateSignal("notify", "sns-svc", 700, "#e11d48");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 19: Notify Customer → Success ───────────────── */
      if (currentStep === 19) {
        dispatch(
          patchState({
            phase: "complete",
            currentStateName: "Claim Approved",
            workflowStatus: "succeeded",
            hotZones: ["notify", "success"],
            explanation:
              "The workflow reaches its Succeed state — Claim Approved! " +
              "The entire claim was validated, assessed, documents were stored, and the customer was notified. " +
              "Step Functions handled every transition between states automatically.",
          }),
        );
        setAnimPhase("complete");
        await animateSignal("notify", "success", 700, "#22c55e");
        if (cancelled) return;
        dispatch(
          patchState({
            hotZones: ["success"],
          }),
        );
        finish();
        return;
      }

      /* ── 20: Choice → Reject Claim (No path) ────────── */
      if (currentStep === 20) {
        dispatch(
          patchState({
            phase: "rejecting",
            currentStateName: "Reject Claim",
            choicePath: "no",
            workflowStatus: "running",
            hotZones: ["choice", "reject"],
            explanation:
              "Let's rewind to the Choice state. What if the validation Lambda found a problem? " +
              "Maybe the policy expired, the damage type isn't covered, or the claim was already filed. " +
              'The Choice state follows the "No" path to the Reject Claim state.',
          }),
        );
        setAnimPhase("rejecting");
        await animateSignal("choice", "reject", 700, "#ef4444");
        if (cancelled) return;
        finish();
        return;
      }

      /* ── 21: Reject Claim → Fail ────────────────────── */
      if (currentStep === 21) {
        dispatch(
          patchState({
            phase: "failed",
            currentStateName: "Claim Denied",
            workflowStatus: "failed",
            hotZones: ["reject", "fail"],
            explanation:
              "The workflow reaches the Fail state. In the AWS console, this execution would show as red (failed). " +
              "Step Functions records the error cause and message, making it easy to find what went wrong. " +
              "You can set up CloudWatch alarms to alert the claims team when workflows fail.",
          }),
        );
        setAnimPhase("failed");
        await animateSignal("reject", "fail", 700, "#ef4444");
        if (cancelled) return;
        dispatch(
          patchState({
            hotZones: ["fail"],
          }),
        );
        finish();
        return;
      }

      /* ── 22: Summary ────────────────────────────────── */
      if (currentStep === 22) {
        dispatch(
          patchState({
            phase: "summary",
            currentStateName: "",
            hotZones: [],
            explanation:
              "That's AWS Step Functions for insurance claims! Here's the big picture:\n\n" +
              "• A state machine defines your workflow as a series of states (steps)\n" +
              "• Task states do work by calling AWS services (Lambda, S3, SNS, etc.)\n" +
              "• Choice states make decisions based on data\n" +
              "• Succeed and Fail states end the workflow\n" +
              "• Step Functions handles all the wiring: data passing, retries, error handling, and logging\n\n" +
              "Your team writes the business logic (validate, assess, notify). Step Functions handles the plumbing.",
          }),
        );
        setAnimPhase("idle");
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
    animPhase,
    phase: runtime.phase,
  };
};
