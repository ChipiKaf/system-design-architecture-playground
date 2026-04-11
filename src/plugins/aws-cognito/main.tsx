import React, { useLayoutEffect, useRef, useEffect, useMemo } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  useConceptModal,
  ConceptPills,
  PluginLayout,
  StageHeader,
  StatBadge,
  SidePanel,
  SideCard,
  CanvasStage,
} from "../../components/plugin-kit";
import type { PillDef } from "../../components/plugin-kit/ConceptPills";
import { concepts, type ConceptKey } from "./concepts";
import { useAwsCognitoAnimation, type Signal } from "./useAwsCognitoAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 920;
const H = 600;

const AwsCognitoVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, currentStep, signals, animPhase, phase } =
    useAwsCognitoAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const {
    explanation,
    hotZones,
    idToken,
    accessToken,
    refreshToken,
    userStatus,
    apiResponse,
  } = runtime;
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = useMemo(() => {
    const b = viz().view(W, H);
    const edgeColor = "#475569";

    /* ── Nodes ──────────────────────────────────────────── */

    // User (top-left)
    b.node("user")
      .at(100, 80)
      .rect(120, 48, 12)
      .fill(hot("user") ? "#4c1d95" : "#0f172a")
      .stroke(hot("user") ? "#a78bfa" : "#334155", 2)
      .label("User", {
        fill: "#e2e8f0",
        fontSize: 12,
        fontWeight: "bold",
      });

    // Client App (left center)
    b.node("client-app")
      .at(100, 290)
      .rect(140, 52, 12)
      .fill(hot("client-app") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("client-app") ? "#60a5fa" : "#334155", 2)
      .label("Client App", {
        fill: "#e2e8f0",
        fontSize: 12,
        fontWeight: "bold",
      });

    // Cognito User Pool (top-right)
    b.node("cognito")
      .at(480, 80)
      .rect(170, 52, 12)
      .fill(hot("cognito") ? "#7c2d12" : "#0f172a")
      .stroke(hot("cognito") ? "#ff9900" : "#334155", 2)
      .label("Cognito User Pool", {
        fill: "#e2e8f0",
        fontSize: 11,
        fontWeight: "bold",
      });

    // API Gateway (center)
    b.node("api-gateway")
      .at(480, 290)
      .rect(150, 52, 12)
      .fill(hot("api-gateway") ? "#312e81" : "#0f172a")
      .stroke(hot("api-gateway") ? "#818cf8" : "#334155", 2)
      .label("API Gateway", {
        fill: "#e2e8f0",
        fontSize: 11,
        fontWeight: "bold",
      });

    // Lambda (right center)
    b.node("lambda")
      .at(740, 290)
      .rect(130, 48, 12)
      .fill(hot("lambda") ? "#713f12" : "#0f172a")
      .stroke(hot("lambda") ? "#fb923c" : "#334155", 2)
      .label("Lambda", {
        fill: "#e2e8f0",
        fontSize: 12,
        fontWeight: "bold",
      });

    // DynamoDB (bottom-right)
    b.node("dynamo")
      .at(740, 500)
      .rect(130, 48, 12)
      .fill(hot("dynamo") ? "#064e3b" : "#0f172a")
      .stroke(hot("dynamo") ? "#34d399" : "#334155", 2)
      .label("DynamoDB", {
        fill: "#e2e8f0",
        fontSize: 11,
        fontWeight: "bold",
      });

    /* ── Edges ──────────────────────────────────────────── */

    // User → Client App
    b.edge("user", "client-app", "e-user-app")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("Sign Up / In", { fill: "#94a3b8", fontSize: 9 });

    // Client App → Cognito (auth requests)
    b.edge("client-app", "cognito", "e-app-cognito")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("SignUp / InitiateAuth", { fill: "#94a3b8", fontSize: 9 });

    // Cognito → Client App (tokens)
    b.edge("cognito", "client-app", "e-cognito-app")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed()
      .label("JWT Tokens", { fill: "#64748b", fontSize: 9 });

    // Cognito → User (verification)
    b.edge("cognito", "user", "e-cognito-user")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed()
      .label("Verify Email", { fill: "#64748b", fontSize: 9 });

    // Client App → API Gateway
    b.edge("client-app", "api-gateway", "e-app-gw")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("Bearer token", { fill: "#94a3b8", fontSize: 9 });

    // API Gateway → Cognito (validate JWT)
    b.edge("api-gateway", "cognito", "e-gw-cognito")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed()
      .label("JWKS validate", { fill: "#64748b", fontSize: 9 });

    // Cognito → API Gateway (validation response)
    b.edge("cognito", "api-gateway", "e-cognito-gw")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed()
      .label("Valid ✓", { fill: "#64748b", fontSize: 9 });

    // API Gateway → Lambda
    b.edge("api-gateway", "lambda", "e-gw-lambda")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("Invoke + claims", { fill: "#94a3b8", fontSize: 9 });

    // Lambda → API Gateway (response)
    b.edge("lambda", "api-gateway", "e-lambda-gw")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed()
      .label("Response", { fill: "#64748b", fontSize: 9 });

    // API Gateway → Client App (response)
    b.edge("api-gateway", "client-app", "e-gw-app")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed()
      .label("200 OK", { fill: "#64748b", fontSize: 9 });

    // Lambda → DynamoDB
    b.edge("lambda", "dynamo", "e-lambda-db")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("Read / Write", { fill: "#94a3b8", fontSize: 9 });

    // DynamoDB → Lambda
    b.edge("dynamo", "lambda", "e-db-lambda")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed();

    /* ── Overlays ───────────────────────────────────────── */
    b.overlay((o) => {
      // AWS branding label
      o.add(
        "text",
        {
          x: W / 2,
          y: H - 14,
          text: "AWS Serverless Auth Stack · Cognito + API Gateway + Lambda",
          fill: "#64748b",
          fontSize: 10,
          fontWeight: "normal",
        },
        { key: "stack-label" },
      );

      // Cognito Authorizer label on API Gateway
      o.add(
        "text",
        {
          x: 480,
          y: 328,
          text: "Cognito Authorizer",
          fill: "#fb923c",
          fontSize: 8,
          fontWeight: "bold",
        },
        { key: "authorizer-label" },
      );

      // Token details overlay
      if (accessToken) {
        o.add(
          "rect",
          {
            x: 280,
            y: 170,
            w: 200,
            h: 54,
            rx: 8,
            ry: 8,
            fill: "rgba(34, 211, 238, 0.08)",
            stroke: "#22d3ee",
            strokeWidth: 1,
            opacity: 1,
          },
          { key: "token-box-bg" },
        );
        o.add(
          "text",
          {
            x: 380,
            y: 186,
            text: "ID Token · Access Token · Refresh Token",
            fill: "#22d3ee",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "token-box-title" },
        );
        o.add(
          "text",
          {
            x: 380,
            y: 200,
            text: "Stored in client (httpOnly cookies or secure storage)",
            fill: "#94a3b8",
            fontSize: 8,
            fontWeight: "normal",
          },
          { key: "token-box-sub" },
        );
        o.add(
          "text",
          {
            x: 380,
            y: 214,
            text: `Access: 1 hr · Refresh: 30 days · ID: user claims`,
            fill: "#94a3b8",
            fontSize: 8,
            fontWeight: "normal",
          },
          { key: "token-box-ttl" },
        );
      }

      // Signals
      signals.forEach((sig: Signal) => {
        const { id, ...params } = sig;
        o.add("signal", params as SignalOverlayParams, { key: id });
      });
    });

    return b;
  }, [hotZones, signals, phase, accessToken]);

  /* ── Mount / destroy VizCraft scene ─────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
    const unsub = pzRef.current?.onChange((s) => {
      viewportRef.current = s;
    });
    return () => {
      unsub?.();
    };
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  /* ── Pill definitions ───────────────────────────────── */
  const pills: PillDef[] = [
    {
      key: "cognito",
      label: "Cognito",
      color: "#fdba74",
      borderColor: "#ff9900",
    },
    {
      key: "oauth-oidc",
      label: "OAuth 2.0 / OIDC",
      color: "#c4b5fd",
      borderColor: "#818cf8",
    },
    {
      key: "user-pools",
      label: "User Pools",
      color: "#93c5fd",
      borderColor: "#60a5fa",
    },
    {
      key: "tokens",
      label: "Tokens",
      color: "#67e8f9",
      borderColor: "#22d3ee",
    },
    {
      key: "api-gateway",
      label: "API Gateway",
      color: "#c4b5fd",
      borderColor: "#a78bfa",
    },
    {
      key: "authorizer",
      label: "Authorizer",
      color: "#fdba74",
      borderColor: "#fb923c",
    },
    {
      key: "lambda",
      label: "Lambda",
      color: "#fdba74",
      borderColor: "#fb923c",
    },
  ];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`aws-cognito-root aws-cognito-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="aws-cognito-stage">
            <StageHeader
              title="AWS Cognito + API Gateway"
              subtitle="Amazon's login system protecting your API — no auth code needed"
            >
              <StatBadge
                label="Phase"
                value={phase}
                color={phaseColor(phase)}
              />
              {userStatus && (
                <StatBadge
                  label="User"
                  value={userStatus}
                  color={userStatus === "CONFIRMED" ? "#22c55e" : "#fbbf24"}
                />
              )}
              {accessToken && (
                <StatBadge label="Token" value="JWT" color="#22d3ee" />
              )}
              {apiResponse && (
                <StatBadge label="API" value={apiResponse} color="#86efac" />
              )}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
            {userStatus && (
              <SideCard label="User Status" variant="info">
                <p
                  style={{
                    color: userStatus === "CONFIRMED" ? "#22c55e" : "#fbbf24",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  {userStatus}
                </p>
                <p
                  style={{
                    fontSize: "0.72rem",
                    color: "#94a3b8",
                    marginTop: 4,
                  }}
                >
                  {userStatus === "CONFIRMED"
                    ? "User verified and can authenticate."
                    : "Awaiting email verification code."}
                </p>
              </SideCard>
            )}
            {accessToken && (
              <SideCard label="Cognito Tokens" variant="info">
                <div style={{ fontSize: "0.72rem" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                      color: "#cbd5e1",
                    }}
                  >
                    <span>ID Token:</span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#22d3ee",
                        fontFamily: "monospace",
                        fontSize: "0.65rem",
                      }}
                    >
                      {idToken.slice(0, 18)}…
                    </span>
                    <span>Access Token:</span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#22d3ee",
                        fontFamily: "monospace",
                        fontSize: "0.65rem",
                      }}
                    >
                      {accessToken.slice(0, 18)}…
                    </span>
                    <span>Refresh Token:</span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#fbbf24",
                        fontFamily: "monospace",
                        fontSize: "0.65rem",
                      }}
                    >
                      {refreshToken.slice(0, 18)}…
                    </span>
                    <span>ID TTL:</span>
                    <span style={{ fontWeight: 600 }}>1 hour</span>
                    <span>Access TTL:</span>
                    <span style={{ fontWeight: 600 }}>1 hour</span>
                    <span>Refresh TTL:</span>
                    <span style={{ fontWeight: 600 }}>30 days</span>
                  </div>
                </div>
              </SideCard>
            )}
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

function phaseColor(phase: string): string {
  const map: Record<string, string> = {
    idle: "#94a3b8",
    "user-pool-setup": "#ff9900",
    signup: "#60a5fa",
    verification: "#fbbf24",
    signin: "#818cf8",
    "tokens-issued": "#22d3ee",
    "authorizer-config": "#fb923c",
    "api-request": "#a78bfa",
    "token-validation": "#f472b6",
    "lambda-invoke": "#fb923c",
    response: "#86efac",
    summary: "#ff9900",
  };
  return map[phase] ?? "#94a3b8";
}

export default AwsCognitoVisualization;
