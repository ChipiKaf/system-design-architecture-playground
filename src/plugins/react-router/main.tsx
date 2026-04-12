import React, { useMemo, useLayoutEffect, useRef, useEffect } from "react";
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
import {
  useReactRouterAnimation,
  type Signal,
} from "./useReactRouterAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1000;
const H = 620;

/* ── Colour palette ──────────────────────────────────── */
const C = {
  bg: "#0f172a",
  dim: "#334155",
  dimEdge: "#1e293b",
  muted: "#64748b",
  text: "#94a3b8",
  blue: "#60a5fa",
  blueFill: "#1e3a5f",
  cyan: "#06b6d4",
  cyanFill: "#083344",
  green: "#34d399",
  greenFill: "#064e3b",
  amber: "#fbbf24",
  amberFill: "#451a03",
  red: "#f87171",
  redFill: "#450a0a",
  violet: "#a78bfa",
  violetFill: "#2e1065",
  pink: "#f472b6",
  pinkFill: "#500724",
  orange: "#fb923c",
  orangeFill: "#431407",
};

const ReactRouterVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, currentStep, signals, phase } =
    useReactRouterAnimation(onAnimationComplete);
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
    showFullReload,
    showSpaSwap,
    showBrowserRouter,
    showRoutes,
    showLink,
    showDynamic,
    showNested,
    showNavigate,
    showSearchParams,
    showCatchAll,
  } = runtime;
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = useMemo(() => {
    const b = viz().view(W, H);

    /* ── Background regions ──────────────────────────────── */
    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 20,
          y: 15,
          w: 240,
          h: 590,
          rx: 16,
          ry: 16,
          fill: "rgba(15, 23, 42, 0.4)",
          stroke: "rgba(51, 65, 85, 0.3)",
          strokeWidth: 1,
          opacity: 1,
        },
        { key: "left-bg" },
      );
      o.add(
        "text",
        {
          x: 55,
          y: 12,
          text: "BROWSER",
          fill: "#475569",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "left-lbl" },
      );
    });

    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 280,
          y: 15,
          w: 420,
          h: 590,
          rx: 16,
          ry: 16,
          fill: "rgba(15, 23, 42, 0.35)",
          stroke: "rgba(51, 65, 85, 0.25)",
          strokeWidth: 1,
          opacity: 1,
        },
        { key: "center-bg" },
      );
      o.add(
        "text",
        {
          x: 365,
          y: 12,
          text: "REACT ROUTER ENGINE",
          fill: "#475569",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "center-lbl" },
      );
    });

    b.overlay((o) => {
      o.add(
        "rect",
        {
          x: 720,
          y: 15,
          w: 260,
          h: 590,
          rx: 16,
          ry: 16,
          fill: "rgba(15, 23, 42, 0.3)",
          stroke: "rgba(51, 65, 85, 0.25)",
          strokeWidth: 1,
          opacity: 1,
        },
        { key: "right-bg" },
      );
      o.add(
        "text",
        {
          x: 760,
          y: 12,
          text: "COMPONENTS",
          fill: "#475569",
          fontSize: 10,
          fontWeight: "bold",
        },
        { key: "right-lbl" },
      );
    });

    /* ── NODES ────────────────────────────────────────── */

    // Browser (URL bar)
    b.node("browser")
      .at(140, 60)
      .rect(150, 36, 10)
      .fill(hot("browser") ? C.blueFill : C.bg)
      .stroke(hot("browser") ? C.blue : C.dim, hot("browser") ? 2 : 1.5)
      .label("🌐 URL Bar", {
        fill: hot("browser") ? "#93c5fd" : "#e2e8f0",
        fontSize: 13,
        fontWeight: "bold",
      });

    // Server (traditional)
    b.node("server")
      .at(140, 180)
      .rect(130, 36, 10)
      .fill(hot("server") ? C.redFill : C.bg)
      .stroke(hot("server") ? C.red : C.dim, hot("server") ? 2 : 1.5)
      .label("🖥️ Server", {
        fill: hot("server") ? "#fca5a5" : C.text,
        fontSize: 12,
        fontWeight: "bold",
      });

    // Old page (full-reload visual)
    if (showFullReload) {
      b.node("old-page")
        .at(140, 310)
        .rect(160, 40, 10)
        .fill(hot("old-page") ? C.redFill : C.bg)
        .stroke(hot("old-page") ? C.red : C.dim, hot("old-page") ? 2 : 1.5)
        .label("💥 Full Page Destroyed", {
          fill: hot("old-page") ? "#fca5a5" : C.muted,
          fontSize: 10,
          fontWeight: "bold",
        });
    }

    // App Shell (SPA wrapper)
    if (showSpaSwap) {
      b.node("app-shell")
        .at(140, 310)
        .rect(160, 40, 10)
        .fill(hot("app-shell") ? C.greenFill : C.bg)
        .stroke(hot("app-shell") ? C.green : C.dim, hot("app-shell") ? 2 : 1.5)
        .label("🏠 App Shell (stays)", {
          fill: hot("app-shell") ? "#6ee7b7" : C.text,
          fontSize: 11,
          fontWeight: "bold",
        });
    }

    // BrowserRouter
    if (showBrowserRouter) {
      b.node("browser-router")
        .at(490, 60)
        .rect(170, 40, 12)
        .fill(hot("browser-router") ? C.amberFill : C.bg)
        .stroke(
          hot("browser-router") ? C.amber : C.dim,
          hot("browser-router") ? 2.5 : 1.5,
        )
        .label("📡 <BrowserRouter>", {
          fill: hot("browser-router") ? "#fde68a" : "#e2e8f0",
          fontSize: 12,
          fontWeight: "bold",
        });
    }

    // Routes config
    if (showRoutes) {
      b.node("routes")
        .at(490, 170)
        .rect(160, 40, 12)
        .fill(hot("routes") ? C.cyanFill : C.bg)
        .stroke(hot("routes") ? C.cyan : C.dim, hot("routes") ? 2.5 : 1.5)
        .label("🗂️ <Routes>", {
          fill: hot("routes") ? "#67e8f9" : "#e2e8f0",
          fontSize: 12,
          fontWeight: "bold",
        });

      // Individual route entries
      b.node("route-home")
        .at(380, 240)
        .rect(100, 26, 6)
        .fill(hot("route-home") ? C.cyanFill : C.bg)
        .stroke(hot("route-home") ? C.cyan : C.dim, 1.5)
        .label("/ → Home", {
          fill: hot("route-home") ? "#67e8f9" : C.muted,
          fontSize: 9,
          fontWeight: "bold",
        });

      b.node("route-about")
        .at(500, 240)
        .rect(110, 26, 6)
        .fill(hot("route-about") ? C.cyanFill : C.bg)
        .stroke(hot("route-about") ? C.cyan : C.dim, 1.5)
        .label("/about → About", {
          fill: hot("route-about") ? "#67e8f9" : C.muted,
          fontSize: 9,
          fontWeight: "bold",
        });

      b.node("route-contact")
        .at(630, 240)
        .rect(120, 26, 6)
        .fill(hot("route-contact") ? C.cyanFill : C.bg)
        .stroke(hot("route-contact") ? C.cyan : C.dim, 1.5)
        .label("/contact → Contact", {
          fill: hot("route-contact") ? "#67e8f9" : C.muted,
          fontSize: 9,
          fontWeight: "bold",
        });
    }

    // Link component
    if (showLink) {
      b.node("link")
        .at(140, 450)
        .rect(150, 36, 10)
        .fill(hot("link") ? C.greenFill : C.bg)
        .stroke(hot("link") ? C.green : C.dim, hot("link") ? 2 : 1.5)
        .label("🔗 <Link to='…'>", {
          fill: hot("link") ? "#6ee7b7" : C.text,
          fontSize: 11,
          fontWeight: "bold",
        });
    }

    // Dynamic segment route
    if (showDynamic) {
      b.node("dynamic-route")
        .at(490, 340)
        .rect(160, 34, 10)
        .fill(hot("dynamic-route") ? C.violetFill : C.bg)
        .stroke(
          hot("dynamic-route") ? C.violet : C.dim,
          hot("dynamic-route") ? 2 : 1.5,
        )
        .label("/users/:id → Profile", {
          fill: hot("dynamic-route") ? "#c4b5fd" : C.text,
          fontSize: 10,
          fontWeight: "bold",
        });

      b.node("use-params")
        .at(490, 400)
        .rect(130, 28, 8)
        .fill(hot("use-params") ? C.violetFill : C.bg)
        .stroke(hot("use-params") ? C.violet : C.dim, 1.5)
        .label("useParams() → id", {
          fill: hot("use-params") ? "#c4b5fd" : C.muted,
          fontSize: 9,
          fontWeight: "bold",
        });
    }

    // Nested routes: layout + outlet
    if (showNested) {
      b.node("layout")
        .at(790, 160)
        .rect(140, 36, 10)
        .fill(hot("layout") ? C.pinkFill : C.bg)
        .stroke(hot("layout") ? C.pink : C.dim, hot("layout") ? 2 : 1.5)
        .label("🎨 Layout (stays)", {
          fill: hot("layout") ? "#f9a8d4" : C.text,
          fontSize: 11,
          fontWeight: "bold",
        });

      b.node("outlet")
        .at(790, 240)
        .rect(130, 34, 10)
        .fill(hot("outlet") ? C.pinkFill : C.bg)
        .stroke(hot("outlet") ? C.pink : C.dim, hot("outlet") ? 2 : 1.5)
        .label("📦 <Outlet />", {
          fill: hot("outlet") ? "#f9a8d4" : C.text,
          fontSize: 11,
          fontWeight: "bold",
        });

      b.node("child-page")
        .at(790, 320)
        .rect(140, 30, 8)
        .fill(hot("child-page") ? C.pinkFill : C.bg)
        .stroke(hot("child-page") ? C.pink : C.dim, 1.5)
        .label("Child Page (swaps)", {
          fill: hot("child-page") ? "#f9a8d4" : C.muted,
          fontSize: 10,
          fontWeight: "bold",
        });
    }

    // useNavigate hook
    if (showNavigate) {
      b.node("use-navigate-hook")
        .at(490, 480)
        .rect(160, 34, 10)
        .fill(hot("use-navigate-hook") ? C.orangeFill : C.bg)
        .stroke(
          hot("use-navigate-hook") ? C.orange : C.dim,
          hot("use-navigate-hook") ? 2 : 1.5,
        )
        .label("⚡ useNavigate()", {
          fill: hot("use-navigate-hook") ? "#fdba74" : C.text,
          fontSize: 11,
          fontWeight: "bold",
        });
    }

    // Search params
    if (showSearchParams) {
      b.node("search-params-node")
        .at(490, 540)
        .rect(170, 30, 8)
        .fill(hot("search-params-node") ? C.cyanFill : C.bg)
        .stroke(
          hot("search-params-node") ? C.cyan : C.dim,
          hot("search-params-node") ? 2 : 1.5,
        )
        .label("🔍 ?sort=price&page=2", {
          fill: hot("search-params-node") ? "#67e8f9" : C.muted,
          fontSize: 10,
          fontWeight: "bold",
        });
    }

    // Catch-all route
    if (showCatchAll) {
      b.node("catch-all-route")
        .at(790, 400)
        .rect(150, 34, 10)
        .fill(hot("catch-all-route") ? C.redFill : C.bg)
        .stroke(
          hot("catch-all-route") ? C.red : C.dim,
          hot("catch-all-route") ? 2 : 1.5,
        )
        .label("🚫 path='*' → 404", {
          fill: hot("catch-all-route") ? "#fca5a5" : C.text,
          fontSize: 11,
          fontWeight: "bold",
        });
    }

    // Page components (always visible right side)
    b.node("page-home")
      .at(790, 60)
      .rect(110, 28, 8)
      .fill(C.bg)
      .stroke(C.dim, 1.5)
      .label("<Home />", {
        fill: C.muted,
        fontSize: 10,
        fontWeight: "bold",
      });

    b.node("page-about")
      .at(790, 100)
      .rect(110, 28, 8)
      .fill(C.bg)
      .stroke(C.dim, 1.5)
      .label("<About />", {
        fill: C.muted,
        fontSize: 10,
        fontWeight: "bold",
      });

    /* ── EDGES ────────────────────────────────────────── */

    // Browser → Server (traditional)
    if (showFullReload) {
      b.edge("browser", "server", "e-br-srv")
        .stroke(hot("server") ? C.red : C.dimEdge, 1.5)
        .arrow(true);
      b.edge("server", "old-page", "e-srv-old")
        .stroke(hot("old-page") ? C.red : C.dimEdge, 1.5)
        .arrow(true);
    }

    // Browser → App Shell (SPA)
    if (showSpaSwap && !showFullReload) {
      b.edge("browser", "app-shell", "e-br-shell")
        .stroke(hot("app-shell") ? C.green : C.dimEdge, 1.5)
        .arrow(true);
    }

    // App Shell → BrowserRouter
    if (showBrowserRouter && showSpaSwap) {
      b.edge("app-shell", "browser-router", "e-shell-br")
        .stroke(hot("browser-router") ? C.amber : C.dimEdge, 1.5)
        .arrow(true);
    }

    // BrowserRouter → Routes
    if (showBrowserRouter && showRoutes) {
      b.edge("browser-router", "routes", "e-br-routes")
        .stroke(hot("routes") ? C.cyan : C.dimEdge, 1.5)
        .arrow(true);
    }

    // Routes → individual routes
    if (showRoutes) {
      b.edge("routes", "route-home", "e-r-home")
        .stroke(C.dimEdge, 1)
        .arrow(true);
      b.edge("routes", "route-about", "e-r-about")
        .stroke(C.dimEdge, 1)
        .arrow(true);
      b.edge("routes", "route-contact", "e-r-contact")
        .stroke(C.dimEdge, 1)
        .arrow(true);
    }

    // Link → BrowserRouter
    if (showLink && showBrowserRouter) {
      b.edge("link", "browser-router", "e-link-br")
        .stroke(hot("link") ? C.green : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Dynamic route → useParams
    if (showDynamic) {
      b.edge("dynamic-route", "use-params", "e-dyn-params")
        .stroke(hot("use-params") ? C.violet : C.dimEdge, 1.5)
        .arrow(true);
    }

    // Routes → dynamic route
    if (showDynamic && showRoutes) {
      b.edge("routes", "dynamic-route", "e-r-dyn")
        .stroke(hot("dynamic-route") ? C.violet : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Routes → layout (nested)
    if (showNested && showRoutes) {
      b.edge("routes", "layout", "e-r-layout")
        .stroke(hot("layout") ? C.pink : C.dimEdge, 1.5)
        .arrow(true);
    }

    // Layout → Outlet → Child page
    if (showNested) {
      b.edge("layout", "outlet", "e-lay-out")
        .stroke(hot("outlet") ? C.pink : C.dimEdge, 1.5)
        .arrow(true);
      b.edge("outlet", "child-page", "e-out-child")
        .stroke(hot("child-page") ? C.pink : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // useNavigate → BrowserRouter
    if (showNavigate && showBrowserRouter) {
      b.edge("use-navigate-hook", "browser-router", "e-nav-br")
        .stroke(hot("use-navigate-hook") ? C.orange : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Search params → Routes
    if (showSearchParams && showRoutes) {
      b.edge("search-params-node", "routes", "e-sp-routes")
        .stroke(hot("search-params-node") ? C.cyan : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    // Routes → catch-all
    if (showCatchAll && showRoutes) {
      b.edge("routes", "catch-all-route", "e-r-catch")
        .stroke(hot("catch-all-route") ? C.red : C.dimEdge, 1.5)
        .arrow(true)
        .dashed();
    }

    /* ── Overlays ─────────────────────────────────────── */
    b.overlay((o) => {
      // Full-reload warning
      if (showFullReload) {
        o.add(
          "rect",
          {
            x: 50,
            y: 420,
            w: 180,
            h: 50,
            rx: 10,
            ry: 10,
            fill: "rgba(239, 68, 68, 0.08)",
            stroke: "rgba(239, 68, 68, 0.3)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "reload-box" },
        );
        o.add(
          "text",
          {
            x: 140,
            y: 440,
            text: "⚠️ Full Reload",
            fill: "#fca5a5",
            fontSize: 12,
            fontWeight: "bold",
          },
          { key: "reload-lbl" },
        );
        o.add(
          "text",
          {
            x: 140,
            y: 458,
            text: "HTML + CSS + JS re-downloaded",
            fill: "#ef4444",
            fontSize: 9,
            fontWeight: "normal",
          },
          { key: "reload-sub" },
        );
      }

      // SPA swap badge
      if (showSpaSwap && !showFullReload) {
        o.add(
          "rect",
          {
            x: 50,
            y: 420,
            w: 180,
            h: 50,
            rx: 10,
            ry: 10,
            fill: "rgba(52, 211, 153, 0.08)",
            stroke: "rgba(52, 211, 153, 0.3)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "spa-box" },
        );
        o.add(
          "text",
          {
            x: 140,
            y: 440,
            text: "✅ SPA — No Reload",
            fill: "#6ee7b7",
            fontSize: 12,
            fontWeight: "bold",
          },
          { key: "spa-lbl" },
        );
        o.add(
          "text",
          {
            x: 140,
            y: 458,
            text: "JS swaps component only",
            fill: "#34d399",
            fontSize: 9,
            fontWeight: "normal",
          },
          { key: "spa-sub" },
        );
      }

      // Signals
      if (signals.length > 0) {
        signals.forEach((sig) => {
          const { id, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, { key: id });
        });
      }
    });

    return b;
  }, [
    hotZones,
    showFullReload,
    showSpaSwap,
    showBrowserRouter,
    showRoutes,
    showLink,
    showDynamic,
    showNested,
    showNavigate,
    showSearchParams,
    showCatchAll,
    signals,
  ]);

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
      key: "dynamic-routing",
      label: "Dynamic Routing",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    { key: "spa", label: "SPA", color: "#93c5fd", borderColor: "#3b82f6" },
    {
      key: "browser-router",
      label: "BrowserRouter",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "route-matching",
      label: "Route Matching",
      color: "#67e8f9",
      borderColor: "#06b6d4",
    },
    {
      key: "link-component",
      label: "<Link>",
      color: "#6ee7b7",
      borderColor: "#10b981",
    },
    {
      key: "dynamic-segments",
      label: "Dynamic Segments",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    {
      key: "nested-routes",
      label: "Nested Routes",
      color: "#f9a8d4",
      borderColor: "#ec4899",
    },
    {
      key: "use-navigate",
      label: "useNavigate",
      color: "#fdba74",
      borderColor: "#f97316",
    },
    {
      key: "url-search-params",
      label: "Search Params",
      color: "#67e8f9",
      borderColor: "#06b6d4",
    },
    {
      key: "catch-all",
      label: "Catch-All 404",
      color: "#fca5a5",
      borderColor: "#ef4444",
    },
  ];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="react-router-root">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="react-router-stage">
            <StageHeader
              title="React Router"
              subtitle="Your app reads the URL → shows the right page → no reload"
            >
              <StatBadge
                label="Phase"
                value={phase}
                className={`react-router-phase react-router-phase--${phase}`}
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

export default ReactRouterVisualization;
