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
import { concepts, type ConceptKey } from "./concepts";
import { useOidcAnimation, type Signal } from "./useOidcAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 600;

const OidcVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, currentStep, signals, animPhase, phase } =
    useOidcAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const { explanation, hotZones, idToken, accessToken, userName } = runtime;
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = useMemo(() => {
    const b = viz().view(W, H);

    // ── Nodes ────────────────────────────────────────────

    // User / Browser
    b.node("user")
      .at(120, 300)
      .rect(130, 60, 14)
      .fill(hot("user") ? "#7c3aed" : "#0f172a")
      .stroke(hot("user") ? "#a78bfa" : "#334155", 2)
      .label("👤 You", { fill: "#fff", fontSize: 14, fontWeight: "bold" });

    // Your App
    b.node("app")
      .at(420, 300)
      .rect(140, 60, 14)
      .fill(hot("app") ? "#1e40af" : "#0f172a")
      .stroke(hot("app") ? "#60a5fa" : "#334155", 2)
      .label("🖥️ Your App", { fill: "#fff", fontSize: 14, fontWeight: "bold" });

    // Identity Provider (e.g. Google, Azure AD)
    b.node("idp")
      .at(720, 300)
      .rect(160, 60, 14)
      .fill(hot("idp") ? "#065f46" : "#0f172a")
      .stroke(hot("idp") ? "#34d399" : "#334155", 2)
      .label("🔐 Identity Provider", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
      });

    // ── Edges ────────────────────────────────────────────

    b.edge("user", "app", "e-user-app")
      .stroke("#475569", 2)
      .label("clicks login", { fill: "#94a3b8", fontSize: 10 });

    b.edge("app", "idp", "e-app-idp")
      .stroke("#475569", 2)
      .label('scope: "openid"', { fill: "#94a3b8", fontSize: 10 });

    b.edge("idp", "app", "e-idp-app")
      .stroke("#475569", 2)
      .label("ID Token + Access Token", { fill: "#94a3b8", fontSize: 10 });

    b.edge("app", "user", "e-app-user")
      .stroke("#475569", 2)
      .label("Welcome!", { fill: "#94a3b8", fontSize: 10 });

    b.edge("user", "idp", "e-user-idp")
      .stroke("#475569", 2)
      .label("password", { fill: "#94a3b8", fontSize: 10 });

    // ── Overlays ─────────────────────────────────────────

    if (idToken) {
      b.overlay((o) => {
        o.add(
          "badge",
          {
            attachTo: "app",
            position: "top",
            text: "🪪 ID Token",
            fill: "#7c3aed",
            color: "#fff",
          },
          { key: "id-token-badge" },
        );
      });
    }

    if (accessToken) {
      b.overlay((o) => {
        o.add(
          "badge",
          {
            attachTo: "app",
            position: "bottom",
            text: "🔑 Access Token",
            fill: "#1e40af",
            color: "#fff",
          },
          { key: "access-token-badge" },
        );
      });
    }

    if (userName) {
      b.overlay((o) => {
        o.add(
          "badge",
          {
            attachTo: "user",
            position: "top",
            text: `Hi, ${userName}!`,
            fill: "#065f46",
            color: "#fff",
          },
          { key: "user-name-badge" },
        );
      });
    }

    // ── Signals ──────────────────────────────────────────
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig) => {
          const { id, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, { key: id });
        });
      });
    }

    return b;
  }, [hotZones, signals, idToken, accessToken, userName]);

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
  const pills = [
    {
      key: "oidc" as ConceptKey,
      label: "OIDC",
      color: "#a78bfa",
      borderColor: "#7c3aed",
    },
    {
      key: "oauth-vs-oidc" as ConceptKey,
      label: "OAuth vs OIDC",
      color: "#fbbf24",
      borderColor: "#f59e0b",
    },
    {
      key: "id-token" as ConceptKey,
      label: "ID Token",
      color: "#c084fc",
      borderColor: "#a855f7",
    },
    {
      key: "claims" as ConceptKey,
      label: "Claims",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "scopes" as ConceptKey,
      label: "Scopes",
      color: "#6ee7b7",
      borderColor: "#34d399",
    },
    {
      key: "discovery" as ConceptKey,
      label: "Discovery",
      color: "#fca5a5",
      borderColor: "#f87171",
    },
  ];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="oidc-root">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="oidc-stage">
            <StageHeader
              title="OpenID Connect (OIDC)"
              subtitle="The identity layer on top of OAuth 2.0"
            >
              <StatBadge
                label="Phase"
                value={phase}
                className={`oidc-phase oidc-phase--${phase}`}
              />
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default OidcVisualization;
