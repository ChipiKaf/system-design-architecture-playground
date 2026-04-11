import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import { patchState, reset } from "./oauthSlice";

export type Signal = { id: string } & SignalOverlayParams;

export const useOauthAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((s: RootState) => s.simulation);
  const runtime = useSelector((s: RootState) => s.oauth);
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
    // Keep persisted signals visible, don't clear them
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
          // Keep signal at destination
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
              phase: "registration",
              explanation:
                "Before your app can use OAuth, it needs to introduce itself to the login system (the Identity Provider, or IDP). Think of it like registering for a loyalty card at a store — you give your name and address, and they give you a card number. Here, a config file is sent to the IDP with the app's name, a secret password, and a list of things the app is allowed to ask for.",
              hotZones: ["client-registry", "idp"],
            }),
          );
          setAnimPhase("registration");
          await new Promise<void>((resolve) =>
            animateSignal("client-registry", "idp", 1400, "#fbbf24", resolve),
          );
          finish();
          break;

        case 2:
          dispatch(
            patchState({
              phase: "login",
              explanation:
                "You open the app and click \"Log in.\" Here's the key idea: the app itself does NOT handle your password. It doesn't want to — that's a huge security risk. Instead, it says: \"I'll send you to the official login system, and they'll vouch for you.\"",
              hotZones: ["user", "client-app"],
            }),
          );
          setAnimPhase("login");
          await new Promise<void>((resolve) =>
            animateSignal("user", "client-app", 1200, "#60a5fa", resolve),
          );
          finish();
          break;

        case 3:
          dispatch(
            patchState({
              phase: "redirect",
              explanation:
                "The app bounces your browser over to the IDP's login page. In the URL, it slips in a few things: \"Here's my app ID, here's where to send the user back after login, and here's what I need permission to do.\" It also includes a random code to prevent trickery (called a 'state' parameter).",
              hotZones: ["client-app", "idp"],
            }),
          );
          setAnimPhase("redirect");
          await new Promise<void>((resolve) =>
            animateSignal("client-app", "idp", 1400, "#818cf8", resolve),
          );
          finish();
          break;

        case 4:
          dispatch(
            patchState({
              phase: "authenticate",
              explanation:
                "Now you're on the IDP's login page (like a Google or Microsoft sign-in screen). You type your username and password. Only the IDP sees your password — the app never does. This is the whole point of OAuth: your password stays with the trusted login system.",
              hotZones: ["user", "idp"],
            }),
          );
          setAnimPhase("authenticate");
          await new Promise<void>((resolve) =>
            animateSignal("user", "idp", 1400, "#f472b6", resolve),
          );
          finish();
          break;

        case 5:
          dispatch(
            patchState({
              phase: "code-callback",
              explanation:
                'Login worked! But the IDP doesn\'t hand out the real key yet. Instead, it gives the app a short-lived "claim ticket" (called an authorization code). Think of it like a coat check ticket — it proves you checked in, but you still need to redeem it to get your coat.',
              hotZones: ["idp", "client-app"],
              authCode: "abc123",
            }),
          );
          setAnimPhase("code-callback");
          await new Promise<void>((resolve) =>
            animateSignal("idp", "client-app", 1400, "#34d399", resolve),
          );
          finish();
          break;

        case 6:
          dispatch(
            patchState({
              phase: "token-exchange",
              explanation:
                "Now the app's server (not your browser) goes directly to the IDP behind the scenes. It says: \"Here's that claim ticket, plus my secret password that proves I'm the real app.\" This happens server-to-server — you never see it. The secret password ensures nobody else can use a stolen ticket.",
              hotZones: ["client-app", "idp"],
            }),
          );
          setAnimPhase("token-exchange");
          await new Promise<void>((resolve) =>
            animateSignal("client-app", "idp", 1400, "#fb923c", resolve),
          );
          finish();
          break;

        case 7:
          dispatch(
            patchState({
              phase: "token-granted",
              explanation:
                "The IDP checks the ticket and the secret — everything looks good! It hands back an Access Token (a digital pass that expires in ~15 minutes) and a Refresh Token (a longer-lasting pass to get new access tokens without logging in again). The Access Token is like a wristband at a concert — it proves you're allowed in.",
              hotZones: ["idp", "client-app"],
              accessToken: "eyJhbGciOiJSUzI1NiIs...",
              scopes: ["openid", "profile", "api.read"],
              tokenExpiry: "15 min",
            }),
          );
          setAnimPhase("token-granted");
          await new Promise<void>((resolve) =>
            animateSignal("idp", "client-app", 1400, "#22d3ee", resolve),
          );
          finish();
          break;

        case 8:
          dispatch(
            patchState({
              phase: "api-call",
              explanation:
                "Time to actually do something! The app calls the API (the Resource Server) and attaches the Access Token in the request header. It's like showing your wristband to the bouncer at each door. No need to log in again — the wristband is all you need.",
              hotZones: ["client-app", "resource-server"],
            }),
          );
          setAnimPhase("api-call");
          await new Promise<void>((resolve) =>
            animateSignal(
              "client-app",
              "resource-server",
              1400,
              "#a78bfa",
              resolve,
            ),
          );
          finish();
          break;

        case 9:
          dispatch(
            patchState({
              phase: "validation",
              explanation:
                'The API checks the wristband: Is it real? (verify the signature) Has it expired? Does it allow what the app is trying to do? (check the scopes). If the app tries something it wasn\'t given permission for, the API says "No" (403 Forbidden). This is how OAuth enforces: "You can only do what you asked for."',
              hotZones: ["resource-server", "client-app"],
            }),
          );
          setAnimPhase("validation");
          await new Promise<void>((resolve) =>
            animateSignal(
              "resource-server",
              "client-app",
              1400,
              "#86efac",
              resolve,
            ),
          );
          finish();
          break;

        case 10:
          dispatch(
            patchState({
              phase: "summary",
              explanation:
                "That's OAuth in a nutshell! Your password never left the login system. The app proved who it was with a secret. It got a time-limited pass (Access Token) that only works for specific things (scopes). The API checks that pass on every request. Nobody over-shares, nobody stores passwords. That's why OAuth is the standard.",
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
