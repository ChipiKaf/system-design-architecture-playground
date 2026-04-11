import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import { patchState, reset, type OidcPhase } from "./oidcSlice";

export type Signal = { id: string } & SignalOverlayParams;

export const useOidcAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((s: RootState) => s.simulation);
  const runtime = useSelector((s: RootState) => s.oidc);
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
        /* Step 0 — Reset */
        case 0:
          dispatch(reset());
          setAnimPhase("idle");
          persistedRef.current = [];
          setSignals([]);
          await sleep(80);
          finish();
          break;

        /* Step 1 — The problem: OAuth only gives ACCESS, not IDENTITY */
        case 1:
          dispatch(
            patchState({
              phase: "problem",
              explanation:
                "Imagine you log into an app with Google. OAuth 2.0 can grant the app permission to read your calendar — but it never actually tells the app WHO you are. The app gets an Access Token (a hall pass), but that pass has no name on it.",
              hotZones: ["user", "app"],
            }),
          );
          setAnimPhase("problem");
          await new Promise<void>((r) =>
            animateSignal("user", "app", 1200, "#f59e0b", r),
          );
          finish();
          break;

        /* Step 2 — Enter OIDC: an identity layer on top of OAuth */
        case 2:
          dispatch(
            patchState({
              phase: "oauth-recap",
              explanation:
                "OpenID Connect (OIDC) solves this. It's a thin identity layer that rides on top of OAuth 2.0. Same redirect dance, same tokens — but OIDC adds one crucial extra: an ID Token that says exactly who the user is.",
              hotZones: ["idp"],
            }),
          );
          setAnimPhase("oauth-recap");
          await sleep(600);
          finish();
          break;

        /* Step 3 — User clicks "Log in" → redirected to IDP */
        case 3:
          dispatch(
            patchState({
              phase: "oidc-layer",
              explanation:
                'The user clicks "Log in." The app redirects to the Identity Provider (like Google or Azure AD). The magic word is scope: "openid". That single scope tells the IDP: "I want OIDC — give me an ID Token."',
              hotZones: ["user", "app", "idp"],
            }),
          );
          setAnimPhase("oidc-layer");
          await new Promise<void>((r) =>
            animateSignal("app", "idp", 1400, "#818cf8", r),
          );
          finish();
          break;

        /* Step 4 — User authenticates with IDP */
        case 4:
          dispatch(
            patchState({
              phase: "login-redirect",
              explanation:
                "The IDP shows a login screen. The user types their email and password (or uses biometrics, passkeys, etc.). The IDP verifies the credentials. Only the IDP ever sees the password — the app never does.",
              hotZones: ["user", "idp"],
            }),
          );
          setAnimPhase("login-redirect");
          await new Promise<void>((r) =>
            animateSignal("user", "idp", 1200, "#34d399", r),
          );
          finish();
          break;

        /* Step 5 — IDP sends back TWO tokens */
        case 5:
          dispatch(
            patchState({
              phase: "authentication",
              explanation:
                "Authentication succeeds! The IDP mints TWO tokens and sends them to the app via redirect: (1) an Access Token — permission to call APIs; (2) an ID Token — a signed card that says who the user is.",
              hotZones: ["idp", "app"],
              accessToken: "eyJhY2Nlc3MiOi...",
              idToken: "eyJpZCI6Impv...",
            }),
          );
          setAnimPhase("authentication");
          await new Promise<void>((r) =>
            animateSignal("idp", "app", 1400, "#60a5fa", r),
          );
          finish();
          break;

        /* Step 6 — What's inside the ID Token? */
        case 6:
          dispatch(
            patchState({
              phase: "tokens-issued",
              explanation:
                'The ID Token is a JWT (JSON Web Token) with three parts separated by dots. Inside the payload: "sub" = unique user ID, "email" = user\'s email, "name" = display name, "iss" = who issued it, "exp" = when it expires. It\'s signed so nobody can tamper with it.',
              hotZones: ["app"],
            }),
          );
          setAnimPhase("tokens-issued");
          await sleep(600);
          finish();
          break;

        /* Step 7 — App decodes the ID Token */
        case 7:
          dispatch(
            patchState({
              phase: "id-token-decoded",
              explanation:
                'The app decodes the ID Token and reads the claims. Now it knows: "This is Jane Doe, jane@example.com." It verifies the signature using the IDP\'s public keys (published at a JWKS endpoint). No database lookup needed — identity is right in the token.',
              hotZones: ["app"],
              userName: "Jane Doe",
            }),
          );
          setAnimPhase("id-token-decoded");
          await sleep(600);
          finish();
          break;

        /* Step 8 — (Optional) App calls the UserInfo endpoint */
        case 8:
          dispatch(
            patchState({
              phase: "userinfo",
              explanation:
                "Want more details? The app can call the UserInfo endpoint on the IDP using the Access Token. This returns extra claims like profile picture, locale, or phone number — whatever the user consented to share via scopes.",
              hotZones: ["app", "idp"],
            }),
          );
          setAnimPhase("userinfo");
          await new Promise<void>((r) =>
            animateSignal("app", "idp", 1200, "#c084fc", r),
          );
          await sleep(300);
          await new Promise<void>((r) =>
            animateSignal("idp", "app", 1200, "#c084fc", r),
          );
          finish();
          break;

        /* Step 9 — App creates a session */
        case 9:
          dispatch(
            patchState({
              phase: "session-created",
              explanation:
                'The app now creates a local session (e.g. a cookie) so the user stays logged in. Every page load, the app checks the session. No need to call the IDP again until the tokens expire. The user sees: "Welcome, Jane!"',
              hotZones: ["app", "user"],
            }),
          );
          setAnimPhase("session-created");
          await new Promise<void>((r) =>
            animateSignal("app", "user", 1200, "#34d399", r),
          );
          finish();
          break;

        /* Step 10 — Summary */
        case 10:
          dispatch(
            patchState({
              phase: "summary",
              explanation:
                "That's OIDC in a nutshell: OAuth 2.0 gives apps permission (Access Token). OIDC adds identity (ID Token). One redirect, two tokens, and now the app knows both WHAT you can do AND WHO you are — without ever seeing your password.",
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
