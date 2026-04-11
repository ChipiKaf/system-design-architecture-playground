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
import { useOauthAnimation, type Signal } from "./useOauthAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 600;

const OauthVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, currentStep, signals, animPhase, phase } =
    useOauthAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const { explanation, hotZones, authCode, accessToken, scopes, tokenExpiry } =
    runtime;
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = useMemo(() => {
    const b = viz().view(W, H);
    const edgeColor = "#475569";

    /* ── Nodes ──────────────────────────────────────────── */

    // User / Browser (top center)
    b.node("user")
      .at(450, 55)
      .rect(130, 50, 12)
      .fill(hot("user") ? "#4c1d95" : "#0f172a")
      .stroke(hot("user") ? "#a78bfa" : "#334155", 2)
      .label("User / Browser", {
        fill: "#e2e8f0",
        fontSize: 11,
        fontWeight: "bold",
      });

    // Client Application (left middle)
    b.node("client-app")
      .at(150, 290)
      .rect(150, 56, 12)
      .fill(hot("client-app") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("client-app") ? "#60a5fa" : "#334155", 2)
      .label("Client App", {
        fill: "#e2e8f0",
        fontSize: 12,
        fontWeight: "bold",
      });

    // IDP / Auth Server (right middle)
    b.node("idp")
      .at(750, 290)
      .rect(160, 56, 12)
      .fill(hot("idp") ? "#7c2d12" : "#0f172a")
      .stroke(hot("idp") ? "#fb923c" : "#334155", 2)
      .label("IDP / Auth Server", {
        fill: "#e2e8f0",
        fontSize: 11,
        fontWeight: "bold",
      });

    // Resource Server (bottom left)
    b.node("resource-server")
      .at(150, 510)
      .rect(150, 50, 12)
      .fill(hot("resource-server") ? "#064e3b" : "#0f172a")
      .stroke(hot("resource-server") ? "#34d399" : "#334155", 2)
      .label("Resource Server", {
        fill: "#e2e8f0",
        fontSize: 11,
        fontWeight: "bold",
      });

    // Client Registry / Azure Repo (bottom right)
    b.node("client-registry")
      .at(750, 510)
      .rect(150, 50, 12)
      .fill(hot("client-registry") ? "#713f12" : "#0f172a")
      .stroke(hot("client-registry") ? "#fbbf24" : "#334155", 2)
      .label("Client Registry", {
        fill: "#e2e8f0",
        fontSize: 11,
        fontWeight: "bold",
      });

    /* ── Edges ──────────────────────────────────────────── */

    // User → Client App
    b.edge("user", "client-app", "e-user-app")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("Login", { fill: "#94a3b8", fontSize: 9 });

    // Client App → IDP (authorize redirect)
    b.edge("client-app", "idp", "e-app-idp")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("/authorize", { fill: "#94a3b8", fontSize: 9 });

    // User → IDP (credentials)
    b.edge("user", "idp", "e-user-idp")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("Credentials", { fill: "#94a3b8", fontSize: 9 });

    // IDP → Client App (auth code callback)
    b.edge("idp", "client-app", "e-idp-app")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed()
      .label("?code=…", { fill: "#64748b", fontSize: 9 });

    // Client App → Resource Server (API call)
    b.edge("client-app", "resource-server", "e-app-api")
      .stroke(edgeColor, 2)
      .arrow(true)
      .label("Bearer token", { fill: "#94a3b8", fontSize: 9 });

    // Resource Server → Client App (response)
    b.edge("resource-server", "client-app", "e-api-app")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed()
      .label("200 OK", { fill: "#64748b", fontSize: 9 });

    // Client Registry → IDP (config deployment)
    b.edge("client-registry", "idp", "e-registry-idp")
      .stroke("#334155", 1.5)
      .arrow(true)
      .dashed()
      .label("Config", { fill: "#64748b", fontSize: 9 });

    /* ── Overlays ───────────────────────────────────────── */
    b.overlay((o) => {
      // Subtitle for Client Registry node
      o.add(
        "text",
        {
          x: 750,
          y: 548,
          text: "(Azure Repo)",
          fill: "#64748b",
          fontSize: 9,
          fontWeight: "normal",
        },
        { key: "registry-sub" },
      );

      // Auth code badge (appears after step 5)
      if (authCode) {
        o.add(
          "rect",
          {
            x: 395,
            y: 228,
            w: 110,
            h: 22,
            rx: 6,
            ry: 6,
            fill: "rgba(52, 211, 153, 0.15)",
            stroke: "#34d399",
            strokeWidth: 1,
            opacity: 1,
          },
          { key: "code-badge-bg" },
        );
        o.add(
          "text",
          {
            x: 450,
            y: 243,
            text: `code=${authCode}`,
            fill: "#34d399",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "code-badge" },
        );
      }

      // Token badge (appears after step 7)
      if (accessToken) {
        o.add(
          "rect",
          {
            x: 340,
            y: 348,
            w: 220,
            h: 42,
            rx: 8,
            ry: 8,
            fill: "rgba(34, 211, 238, 0.1)",
            stroke: "#22d3ee",
            strokeWidth: 1,
            opacity: 1,
          },
          { key: "token-badge-bg" },
        );
        o.add(
          "text",
          {
            x: 450,
            y: 365,
            text: `Bearer ${accessToken.slice(0, 20)}…`,
            fill: "#22d3ee",
            fontSize: 9,
            fontWeight: "bold",
          },
          { key: "token-badge" },
        );
        o.add(
          "text",
          {
            x: 450,
            y: 381,
            text: `Scopes: ${scopes.join(", ")}  ·  TTL: ${tokenExpiry}`,
            fill: "#94a3b8",
            fontSize: 8,
            fontWeight: "normal",
          },
          { key: "token-detail" },
        );
      }

      // Signals
      signals.forEach((sig: Signal) => {
        const { id, ...params } = sig;
        o.add("signal", params as SignalOverlayParams, { key: id });
      });
    });

    return b;
  }, [hotZones, signals, phase, authCode, accessToken, scopes, tokenExpiry]);

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
      key: "oauth",
      label: "OAuth 2.0",
      color: "#c4b5fd",
      borderColor: "#818cf8",
    },
    {
      key: "authorization-code",
      label: "Auth Code Grant",
      color: "#86efac",
      borderColor: "#34d399",
    },
    {
      key: "tokens",
      label: "Tokens",
      color: "#67e8f9",
      borderColor: "#22d3ee",
    },
    {
      key: "scopes",
      label: "Scopes",
      color: "#fde68a",
      borderColor: "#fbbf24",
    },
    { key: "idp", label: "IDP", color: "#f9a8d4", borderColor: "#f472b6" },
    {
      key: "client-secrets",
      label: "Client Secrets",
      color: "#fdba74",
      borderColor: "#fb923c",
    },
    {
      key: "myth-vs-reality",
      label: '"Did OAuth Change?"',
      color: "#fda4af",
      borderColor: "#f43f5e",
    },
  ];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`oauth-root oauth-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="oauth-stage">
            <StageHeader
              title="OAuth 2.0"
              subtitle="How apps access your stuff without your password"
            >
              <StatBadge
                label="Phase"
                value={phase}
                color={phaseColor(phase)}
              />
              {authCode && (
                <StatBadge label="Auth Code" value={authCode} color="#34d399" />
              )}
              {accessToken && (
                <StatBadge label="Token" value="JWT" color="#22d3ee" />
              )}
              {scopes.length > 0 && (
                <StatBadge
                  label="Scopes"
                  value={scopes.join(", ")}
                  color="#fbbf24"
                />
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
            {authCode && (
              <SideCard label="Authorization Code" variant="info">
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "#34d399",
                    fontFamily: "monospace",
                  }}
                >
                  ?code={authCode}&state=xyz
                </p>
                <p
                  style={{
                    fontSize: "0.72rem",
                    color: "#94a3b8",
                    marginTop: 4,
                  }}
                >
                  One-time use, expires in seconds. Must be exchanged
                  server-side.
                </p>
              </SideCard>
            )}
            {accessToken && (
              <SideCard label="Token Details" variant="info">
                <div style={{ fontSize: "0.72rem" }}>
                  <p
                    style={{
                      color: "#22d3ee",
                      fontFamily: "monospace",
                      marginBottom: 4,
                    }}
                  >
                    Bearer {accessToken.slice(0, 24)}…
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                      color: "#cbd5e1",
                    }}
                  >
                    <span>Type:</span>
                    <span style={{ fontWeight: 600 }}>JWT (RS256)</span>
                    <span>Expires:</span>
                    <span style={{ fontWeight: 600, color: "#fbbf24" }}>
                      {tokenExpiry}
                    </span>
                    <span>Scopes:</span>
                    <span style={{ fontWeight: 600, color: "#86efac" }}>
                      {scopes.join(", ")}
                    </span>
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
    registration: "#fbbf24",
    login: "#60a5fa",
    redirect: "#818cf8",
    authenticate: "#f472b6",
    "code-callback": "#34d399",
    "token-exchange": "#fb923c",
    "token-granted": "#22d3ee",
    "api-call": "#a78bfa",
    validation: "#86efac",
    summary: "#fbbf24",
  };
  return map[phase] ?? "#94a3b8";
}

export default OauthVisualization;
