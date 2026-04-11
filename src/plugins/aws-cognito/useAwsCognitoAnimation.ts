import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import { patchState, reset } from "./awsCognitoSlice";

export type Signal = { id: string } & SignalOverlayParams;

export const useAwsCognitoAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((s: RootState) => s.simulation);
  const runtime = useSelector((s: RootState) => s.awsCognito);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [animPhase, setAnimPhase] = useState<string>("idle");
  const rafRef = useRef<number>(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef = useRef(onAnimationComplete);
  const persistedRef = useRef<Signal[]>([]);

  onCompleteRef.current = onAnimationComplete;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setSignals([...persistedRef.current]);
  }, []);

  const sleep = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, ms);
        timeoutsRef.current.push(id);
      }),
    [],
  );

  const finish = useCallback(() => onCompleteRef.current?.(), []);

  const animateSignal = useCallback(
    (
      from: string,
      to: string,
      duration: number,
      color: string,
      onDone: () => void,
    ) => {
      const sigId = `sig-${Date.now()}`;
      const start = performance.now();
      const persisted = persistedRef.current;
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setSignals([
          ...persisted,
          { id: sigId, from, to, progress: p, color, magnitude: 1.2 },
        ]);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          const resting: Signal = {
            id: `rest-${from}-${to}`,
            from,
            to,
            progress: 1,
            color,
            magnitude: 1,
          };
          persistedRef.current = [...persisted, resting];
          setSignals([...persistedRef.current]);
          onDone();
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [],
  );

  /* ── Step orchestration ─────────────────────────────── */
  useEffect(() => {
    cleanup();

    const run = async () => {
      switch (currentStep) {
        case 0:
          dispatch(reset());
          setAnimPhase("idle");
          persistedRef.current = [];
          setSignals([]);
          await sleep(80);
          finish();
          break;

        case 1:
          dispatch(
            patchState({
              phase: "user-pool-setup",
              explanation:
                "First, you set up a Cognito User Pool. Think of it as a guest book for your app — it stores everyone who signs up (their email, password, etc.). It also acts as the login system — like how Google handles sign-in for YouTube, Gmail, and Maps all in one place. You also register your app with Cognito so it knows which app is asking to log people in.",
              hotZones: ["cognito"],
            }),
          );
          setAnimPhase("user-pool-setup");
          await sleep(1400);
          finish();
          break;

        case 2:
          dispatch(
            patchState({
              phase: "signup",
              explanation:
                "A new user fills out the sign-up form — email, password, maybe a name. Your app sends this to Cognito. Cognito saves the user but marks them as UNCONFIRMED. It's like signing up for a website and seeing: \"Check your email to verify your account.\" The user exists, but can't log in yet.",
              hotZones: ["user", "client-app", "cognito"],
              userStatus: "UNCONFIRMED",
            }),
          );
          setAnimPhase("signup");
          await new Promise<void>((resolve) =>
            animateSignal("user", "client-app", 800, "#60a5fa", resolve),
          );
          await new Promise<void>((resolve) =>
            animateSignal("client-app", "cognito", 1200, "#60a5fa", resolve),
          );
          finish();
          break;

        case 3:
          dispatch(
            patchState({
              phase: "verification",
              explanation:
                "Cognito sends a 6-digit code to the user's email (or phone). The user types the code into your app. If it matches — boom, they're CONFIRMED. This proves they actually own that email address. Now they can log in for real.",
              hotZones: ["cognito", "user"],
              userStatus: "CONFIRMED",
            }),
          );
          setAnimPhase("verification");
          await new Promise<void>((resolve) =>
            animateSignal("cognito", "user", 1400, "#fbbf24", resolve),
          );
          finish();
          break;

        case 4:
          dispatch(
            patchState({
              phase: "signin",
              explanation:
                'The user types their email and password and hits "Sign In." Your app sends these to Cognito. Cognito checks: Does this user exist? Is the password correct? If yes, Cognito prepares to hand out tokens. Your app never stores the password — Cognito handles all of that.',
              hotZones: ["user", "client-app", "cognito"],
            }),
          );
          setAnimPhase("signin");
          await new Promise<void>((resolve) =>
            animateSignal("user", "client-app", 800, "#818cf8", resolve),
          );
          await new Promise<void>((resolve) =>
            animateSignal("client-app", "cognito", 1200, "#818cf8", resolve),
          );
          finish();
          break;

        case 5:
          dispatch(
            patchState({
              phase: "tokens-issued",
              explanation:
                "Login worked! Cognito sends back THREE tokens: (1) ID Token — a card with the user's name, email, and unique ID. (2) Access Token — a pass that says what the user is allowed to do. (3) Refresh Token — a long-lasting ticket to get new tokens later without logging in again. Think of them as: your ID card, your employee badge, and your badge renewal form.",
              hotZones: ["cognito", "client-app"],
              idToken: "eyJ...(identity claims)",
              accessToken: "eyJ...(scopes + groups)",
              refreshToken: "eyJ...(long-lived)",
            }),
          );
          setAnimPhase("tokens-issued");
          await new Promise<void>((resolve) =>
            animateSignal("cognito", "client-app", 1400, "#22d3ee", resolve),
          );
          finish();
          break;

        case 6:
          dispatch(
            patchState({
              phase: "authorizer-config",
              explanation:
                'Now let\'s protect your API. In API Gateway, you set up a "Cognito Authorizer" — a bouncer at the door. You tell it: "Only let people in if they have a valid token from THIS Cognito User Pool." The bouncer knows how to check tokens automatically — no custom code needed.',
              hotZones: ["api-gateway", "cognito"],
            }),
          );
          setAnimPhase("authorizer-config");
          await new Promise<void>((resolve) =>
            animateSignal("api-gateway", "cognito", 1400, "#fb923c", resolve),
          );
          finish();
          break;

        case 7:
          dispatch(
            patchState({
              phase: "api-request",
              explanation:
                'The user wants to fetch some data. Your app makes an API call and attaches the Access Token in the request header — like flashing your employee badge at the security gate. The request says: "Here\'s my badge, let me through."',
              hotZones: ["client-app", "api-gateway"],
            }),
          );
          setAnimPhase("api-request");
          await new Promise<void>((resolve) =>
            animateSignal(
              "client-app",
              "api-gateway",
              1400,
              "#a78bfa",
              resolve,
            ),
          );
          finish();
          break;

        case 8:
          dispatch(
            patchState({
              phase: "token-validation",
              explanation:
                'The bouncer (API Gateway) inspects the badge (token). It checks: Is this badge real? (verify the signature) Has it expired? Was it issued by OUR Cognito User Pool? If anything is wrong, the bouncer says "401 — you\'re not getting in" and the request stops right here. Your backend code never even runs.',
              hotZones: ["api-gateway", "cognito"],
            }),
          );
          setAnimPhase("token-validation");
          await new Promise<void>((resolve) =>
            animateSignal("api-gateway", "cognito", 1000, "#f472b6", resolve),
          );
          await new Promise<void>((resolve) =>
            animateSignal("cognito", "api-gateway", 1000, "#34d399", resolve),
          );
          finish();
          break;

        case 9:
          dispatch(
            patchState({
              phase: "lambda-invoke",
              explanation:
                "The badge checked out! API Gateway lets the request through to your Lambda function (your backend code). It also passes along the user's info from the token — their user ID, email, groups, etc. — so your code knows exactly who's making the request without doing any extra work.",
              hotZones: ["api-gateway", "lambda"],
            }),
          );
          setAnimPhase("lambda-invoke");
          await new Promise<void>((resolve) =>
            animateSignal("api-gateway", "lambda", 1400, "#fb923c", resolve),
          );
          finish();
          break;

        case 10:
          dispatch(
            patchState({
              phase: "response",
              explanation:
                "Your Lambda function does its job — maybe it fetches data from DynamoDB, processes something, or calls another service. Then it sends the result back through API Gateway to your app. The full journey: You → App → API Gateway (checks badge) → Lambda (does the work) → DynamoDB → back to you.",
              hotZones: ["lambda", "dynamo", "api-gateway", "client-app"],
              apiResponse: "200 OK",
            }),
          );
          setAnimPhase("response");
          await new Promise<void>((resolve) =>
            animateSignal("lambda", "dynamo", 800, "#86efac", resolve),
          );
          await new Promise<void>((resolve) =>
            animateSignal("dynamo", "lambda", 800, "#86efac", resolve),
          );
          await new Promise<void>((resolve) =>
            animateSignal("lambda", "api-gateway", 800, "#86efac", resolve),
          );
          await new Promise<void>((resolve) =>
            animateSignal("api-gateway", "client-app", 800, "#86efac", resolve),
          );
          finish();
          break;

        case 11:
          dispatch(
            patchState({
              phase: "summary",
              explanation:
                "That's AWS Cognito in a nutshell! Cognito is your login system — it stores users and hands out tokens. API Gateway is the bouncer — it checks tokens before letting requests through. Lambda is your backend — it only runs for authenticated users. DynamoDB is your database. Your app never handles passwords, never writes auth code, and invalid requests are blocked before they reach your code.",
              hotZones: [],
            }),
          );
          setAnimPhase("idle");
          finish();
          break;

        default:
          finish();
      }
    };

    run();
    return cleanup;
  }, [currentStep]);

  return {
    runtime,
    currentStep,
    signals,
    animPhase,
    phase: runtime.phase,
  };
};
